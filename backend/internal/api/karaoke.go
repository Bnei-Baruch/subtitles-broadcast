package api

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"unicode"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

const (
	KaraokeSlideType = "karaoke"

	drawingMLNS      = "http://schemas.openxmlformats.org/drawingml/2006/main"
	wordprocessingNS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
)

// KaraokeGroups are the built-in defaults always offered in the UI. Groups are
// otherwise free-form: any name is created on first use and auto-removed when
// its last song leaves (see GetKaraokeGroups).
var KaraokeGroups = []string{"songbook", "shabat", "origin", "general"}

// normalizeKaraokeGroup trims and collapses whitespace so " shabat " and
// "shabat" don't become distinct groups. Case is preserved for display.
func normalizeKaraokeGroup(s string) string {
	return strings.Join(strings.Fields(s), " ")
}

// GetKaraokeGroups returns the distinct karaoke group names currently in use,
// unioned with the built-in defaults so the UI always has a baseline set.
// A group is "in use" only while it has a visible song — delete soft-hides the
// song's file (the SourcePath row lingers), so we join files and filter on
// hidden to match the library list's visibility. show_hidden=true includes
// groups whose only songs are hidden.
func (h *Handler) GetKaraokeGroups(ctx *gin.Context) {
	filesJoin := "INNER JOIN " + DBTableFiles + " f ON f.file_uid = sp.source_uid"
	if ctx.Query("show_hidden") != "true" {
		filesJoin += " AND f.hidden = FALSE"
	}
	force_master := forceMaster(ctx)
	// GROUP BY (not DISTINCT) so force_master's random() can live in the SELECT
	// list, matching how the primary is forced elsewhere.
	var rows []struct{ SourceGroup string }
	if err := h.Database.WithContext(ctx).Table(DBTableSourcePaths+" sp").
		Select(force_master + "sp.source_group AS source_group").
		Joins(filesJoin).
		Where("sp.source_type = ? AND sp.source_group <> ''", KaraokeSlideType).
		Group("sp.source_group").
		Scan(&rows).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Failed to load karaoke groups"))
		return
	}
	used := make([]string, len(rows))
	for i, r := range rows {
		used[i] = r.SourceGroup
	}
	set := map[string]bool{}
	for _, g := range KaraokeGroups {
		set[g] = true
	}
	for _, g := range used {
		set[g] = true
	}
	groups := make([]string, 0, len(set))
	for g := range set {
		groups = append(groups, g)
	}
	sort.Strings(groups)
	ctx.JSON(http.StatusOK, getResponse(true, groups, "", ""))
}

type parsedSlide struct {
	text      string
	slideType string
}

func isSeparatorText(text string) bool {
	for _, r := range text {
		if !unicode.IsSpace(r) && r != '-' && r != '_' && r != '—' && r != '–' && r != '|' && r != '/' && r != '\\' {
			return false
		}
	}
	return true
}

func parsePPTX(data []byte) ([]parsedSlide, error) {
	r, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("open zip: %w", err)
	}

	type slideFile struct {
		index int
		f     *zip.File
	}

	slideRe := regexp.MustCompile(`ppt/slides/slide(\d+)\.xml$`)
	var slides []slideFile
	for _, f := range r.File {
		m := slideRe.FindStringSubmatch(f.Name)
		if m == nil {
			continue
		}
		idx, _ := strconv.Atoi(m[1])
		slides = append(slides, slideFile{index: idx, f: f})
	}
	sort.Slice(slides, func(i, j int) bool {
		return slides[i].index < slides[j].index
	})

	result := make([]parsedSlide, 0, len(slides))
	for _, s := range slides {
		text, err := extractSlideText(s.f)
		if err != nil {
			log.Warnf("karaoke: skipping slide %d: %v", s.index, err)
			continue
		}
		text = strings.TrimSpace(text)
		if isSeparatorText(text) {
			text = ""
		}
		result = append(result, parsedSlide{text: text, slideType: KaraokeSlideType})
	}
	return result, nil
}

func extractSlideText(f *zip.File) (string, error) {
	rc, err := f.Open()
	if err != nil {
		return "", err
	}
	defer rc.Close()

	raw, err := io.ReadAll(rc)
	if err != nil {
		return "", err
	}

	dec := xml.NewDecoder(bytes.NewReader(raw))
	var paragraphs []string
	var currentPara strings.Builder
	inT := false

	for {
		tok, err := dec.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", err
		}
		switch t := tok.(type) {
		case xml.StartElement:
			if t.Name.Space == drawingMLNS {
				switch t.Name.Local {
				case "t":
					inT = true
				case "p":
					currentPara.Reset()
				}
			}
		case xml.EndElement:
			if t.Name.Space == drawingMLNS {
				switch t.Name.Local {
				case "t":
					inT = false
				case "p":
					if para := strings.TrimSpace(currentPara.String()); para != "" {
						paragraphs = append(paragraphs, para)
					}
				}
			}
		case xml.CharData:
			if inT {
				currentPara.Write(t)
			}
		}
	}

	return strings.Join(paragraphs, "\n"), nil
}

// parseDocx extracts paragraphs from word/document.xml and groups them into slides.
// Rules:
//   - Consecutive non-empty paragraphs → one slide (lines joined with \n, max 2)
//   - 1 blank paragraph between groups → slide boundary
//   - 2+ consecutive blank paragraphs → empty karaoke slide (clears screen when broadcast)
func parseDocx(data []byte) ([]parsedSlide, error) {
	r, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("open zip: %w", err)
	}

	var docFile *zip.File
	for _, f := range r.File {
		if f.Name == "word/document.xml" {
			docFile = f
			break
		}
	}
	if docFile == nil {
		return nil, fmt.Errorf("word/document.xml not found in DOCX")
	}

	rc, err := docFile.Open()
	if err != nil {
		return nil, err
	}
	defer rc.Close()

	raw, err := io.ReadAll(rc)
	if err != nil {
		return nil, err
	}

	paragraphs := extractDocxParagraphs(raw)
	return groupDocxParagraphs(paragraphs), nil
}

func extractDocxParagraphs(data []byte) []string {
	dec := xml.NewDecoder(bytes.NewReader(data))
	var paragraphs []string
	var currentPara strings.Builder
	inT := false

	for {
		tok, err := dec.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			break
		}
		switch t := tok.(type) {
		case xml.StartElement:
			if t.Name.Space == wordprocessingNS {
				switch t.Name.Local {
				case "p":
					currentPara.Reset()
				case "t":
					inT = true
				case "br":
					// explicit line break within a paragraph
					currentPara.WriteRune('\n')
				}
			}
		case xml.EndElement:
			if t.Name.Space == wordprocessingNS {
				switch t.Name.Local {
				case "t":
					inT = false
				case "p":
					paragraphs = append(paragraphs, strings.TrimSpace(currentPara.String()))
				}
			}
		case xml.CharData:
			if inT {
				currentPara.Write(t)
			}
		}
	}
	return paragraphs
}

// groupDocxParagraphs converts a flat paragraph list into slides using blank-line rules.
// Each slide holds at most 2 lines. A single blank line marks a slide boundary.
// Two or more consecutive blank lines insert an empty slide (broadcasts a screen clear).
func groupDocxParagraphs(paragraphs []string) []parsedSlide {
	var slides []parsedSlide
	var currentLines []string
	blankCount := 0

	flushSlide := func() {
		if len(currentLines) == 0 {
			return
		}
		text := strings.TrimSpace(strings.Join(currentLines, "\n"))
		currentLines = nil
		if isSeparatorText(text) {
			text = ""
		}
		slides = append(slides, parsedSlide{text: text, slideType: KaraokeSlideType})
	}

	for _, para := range paragraphs {
		if para == "" {
			blankCount++
			if blankCount == 1 {
				flushSlide()
			} else if blankCount == 2 {
				slides = append(slides, parsedSlide{text: "", slideType: KaraokeSlideType})
			}
		} else {
			blankCount = 0
			currentLines = append(currentLines, para)
			if len(currentLines) == 2 {
				flushSlide()
			}
		}
	}
	flushSlide()
	return slides
}

// ParseKaraokeFile accepts a multipart PPTX/DOCX upload and returns the parsed
// slides without writing to the DB. The caller persists them via POST /custom_slide
// with slide_type "karaoke", reusing the shared slide-creation path.
func (h *Handler) ParseKaraokeFile(ctx *gin.Context) {
	file, header, err := ctx.Request.FormFile("file")
	if err != nil {
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Reading uploaded file has failed"))
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Reading file content has failed"))
		return
	}

	var slides []parsedSlide
	ext := strings.ToLower(filepath.Ext(header.Filename))
	switch ext {
	case ".pptx":
		slides, err = parsePPTX(data)
	case ".docx":
		slides, err = parseDocx(data)
	default:
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, "unsupported file type: "+ext, "Only .pptx and .docx files are supported"))
		return
	}
	if err != nil {
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Parsing file has failed"))
		return
	}
	if len(slides) == 0 {
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, "no slides found", "File contains no readable content"))
		return
	}

	title := ctx.PostForm("title")
	if title == "" {
		title = header.Filename
	}

	group := normalizeKaraokeGroup(ctx.PostForm("group"))
	if group == "" {
		group = "general"
	}

	out := make([]gin.H, len(slides))
	for i, s := range slides {
		out[i] = gin.H{"slide": s.text, "slide_type": s.slideType}
	}
	ctx.JSON(http.StatusOK, getResponse(true, gin.H{
		"slides": out,
		"title":  title,
		"group":  group,
	}, "", "Karaoke file parsed successfully"))
}


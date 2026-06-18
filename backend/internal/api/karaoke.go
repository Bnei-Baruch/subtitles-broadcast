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

var KaraokeGroups = []string{"songbook", "shabat", "origin", "general"}

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

	group := ctx.PostForm("group")
	validGroup := false
	for _, g := range KaraokeGroups {
		if g == group {
			validGroup = true
			break
		}
	}
	if !validGroup {
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


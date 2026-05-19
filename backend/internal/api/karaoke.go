package api

import (
	"archive/zip"
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	log "github.com/sirupsen/logrus"
)

const (
	KaraokeFileType  = "karaoke"
	KaraokeSlideType = "karaoke"

	drawingMLNS      = "http://schemas.openxmlformats.org/drawingml/2006/main"
	wordprocessingNS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
)

var KaraokeGroups = []string{"songbook", "shabat", "origin", "general"}

type parsedSlide struct {
	text      string
	slideType string
}

func generateKaraokeUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
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

// ImportKaraokeFile accepts a multipart PPTX upload, parses each slide as text,
// and stores it as a karaoke file + slides in the DB.
func (h *Handler) ImportKaraokeFile(ctx *gin.Context) {
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
		if err != nil {
			ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Parsing PPTX has failed"))
			return
		}
	case ".docx":
		slides, err = parseDocx(data)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, getResponse(false, nil, err.Error(), "Parsing DOCX has failed"))
			return
		}
	default:
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, "unsupported file type: "+ext, "Only .pptx and .docx files are supported"))
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

	userId, _ := ctx.Get("user_id")
	userIdStr, _ := userId.(string)
	fileUID := generateKaraokeUID()
	now := time.Now()

	tx := h.Database.WithContext(ctx).Begin()
	if tx.Error != nil {
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, tx.Error.Error(), "Creating transaction has failed"))
		return
	}

	fileData := &File{
		Type:      KaraokeFileType,
		Filename:  title,
		FileUid:   fileUID,
		SourceUid: fileUID,
		CreatedBy: userIdStr,
		UpdatedBy: userIdStr,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err = tx.Table(DBTableFiles).Create(fileData).Error; err != nil {
		tx.Rollback()
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Saving file record has failed"))
		return
	}

	for i, s := range slides {
		slideData := &Slide{
			FileUid:     fileUID,
			Slide:       s.text,
			OrderNumber: i,
			SlideType:   s.slideType,
			Renderer:    "default",
			LeftToRight: true,
			CreatedBy:   userIdStr,
			UpdatedBy:   userIdStr,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		if err = tx.Table(DBTableSlides).Create(slideData).Error; err != nil {
			tx.Rollback()
			ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Saving slide has failed"))
			return
		}
	}

	sourcePathData := &SourcePath{
		Languages:  pq.StringArray{},
		SourceUid:  fileUID,
		Path:       title,
		SourceType: group,
		CreatedBy:  userIdStr,
		UpdatedBy:  userIdStr,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	if err = tx.Table(DBTableSourcePaths).Create(sourcePathData).Error; err != nil {
		tx.Rollback()
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Saving source path has failed"))
		return
	}

	if err = tx.Commit().Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, err.Error(), "Committing transaction has failed"))
		return
	}

	ctx.JSON(http.StatusOK, getResponse(true, gin.H{
		"file_uid":    fileUID,
		"title":       title,
		"slide_count": len(slides),
		"group":       group,
	}, "", "Karaoke file imported successfully"))
}

func (h *Handler) GetKaraokeSlides(ctx *gin.Context) {
	fileUID := ctx.Query("file_uid")
	if fileUID == "" {
		ctx.JSON(http.StatusBadRequest, getResponse(false, nil, "file_uid is required", ""))
		return
	}

	var slides []Slide
	result := h.Database.WithContext(ctx).
		Table(DBTableSlides).
		Where("file_uid = ? AND slide_type = ? AND hidden = FALSE", fileUID, KaraokeSlideType).
		Order("order_number ASC").
		Find(&slides)

	if result.Error != nil {
		ctx.JSON(http.StatusInternalServerError, getResponse(false, nil, result.Error.Error(), "Fetching slides has failed"))
		return
	}
	if slides == nil {
		slides = []Slide{}
	}
	ctx.JSON(http.StatusOK, getResponse(true, slides, "", ""))
}


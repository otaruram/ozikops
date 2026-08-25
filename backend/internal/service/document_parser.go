package service

import (
	"bytes"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/dslipak/pdf"
)

// ChunkMetadata holds per-chunk metadata for the petrochemical knowledge hub.
type ChunkMetadata struct {
	EquipmentTag string `json:"equipment_tag"`
	DocumentType string `json:"document_type"` // OPL, Datasheet, Maintenance Log
	SafetyRisk   string `json:"safety_risk"`   // HIGH_RISK, MEDIUM_RISK, COMPLIANT
	Content      string `json:"content"`
	PageNumber   int    `json:"page_number"`
	ChunkIndex   int    `json:"chunk_index"`
}

type DocumentParserService interface {
	ParseCustomRange(input string, totalPages int) []int
	ExtractTargetPages(filePath string, pageMode string, customRange string) (string, []int, error)
	ExtractEquipmentTag(text string) string
	DetectDocumentType(text string) string
	DetectSafetyRisk(text string) string
	ChunkDocument(text string, equipmentTag string, documentType string) []ChunkMetadata
}

type documentParserService struct{}

func NewDocumentParserService() DocumentParserService {
	return &documentParserService{}
}

// equipmentTagRegex matches petrochemical equipment tags like GA-1201A, FA-8901, PA-3301B
var equipmentTagRegex = regexp.MustCompile(`\b([A-Z]{2}-\d{3,5}[A-Z]?)\b`)

// ExtractEquipmentTag scans text and returns the first matched equipment tag.
func (s *documentParserService) ExtractEquipmentTag(text string) string {
	matches := equipmentTagRegex.FindAllString(text, -1)
	if len(matches) == 0 {
		return ""
	}
	// Return the most frequently occurring tag
	freq := make(map[string]int)
	for _, m := range matches {
		freq[m]++
	}
	bestTag := ""
	bestCount := 0
	for tag, count := range freq {
		if count > bestCount {
			bestTag = tag
			bestCount = count
		}
	}
	return bestTag
}

// DetectDocumentType classifies document content into OPL, Datasheet, or Maintenance Log.
func (s *documentParserService) DetectDocumentType(text string) string {
	lower := strings.ToLower(text)

	// OPL detection
	oplKeywords := []string{"one point lesson", "opl-", "opl ", "point lesson", "lesson learned"}
	for _, kw := range oplKeywords {
		if strings.Contains(lower, kw) {
			return "OPL"
		}
	}

	// Datasheet detection
	datasheetKeywords := []string{"datasheet", "data sheet", "rated capacity", "design pressure",
		"operating temperature", "material of construction", "impeller", "casing material",
		"driver type", "motor rating", "npsh"}
	datasheetHits := 0
	for _, kw := range datasheetKeywords {
		if strings.Contains(lower, kw) {
			datasheetHits++
		}
	}
	if datasheetHits >= 2 {
		return "Datasheet"
	}

	// Maintenance Log detection
	maintKeywords := []string{"maintenance log", "work order", "corrective maintenance",
		"preventive maintenance", "breakdown", "repair history", "downtime",
		"failure mode", "root cause", "mtbf", "mttr"}
	maintHits := 0
	for _, kw := range maintKeywords {
		if strings.Contains(lower, kw) {
			maintHits++
		}
	}
	if maintHits >= 2 {
		return "Maintenance Log"
	}

	return "General"
}

// DetectSafetyRisk scans for hazard keywords and classifies risk level.
func (s *documentParserService) DetectSafetyRisk(text string) string {
	lower := strings.ToLower(text)

	highRiskKeywords := []string{"flammable", "explosive", "toxic", "h2s", "hydrogen sulfide",
		"hexane", "benzene", "confined space", "loto", "lockout tagout",
		"hot work", "permit to work", "high pressure", "high temperature",
		"fire hazard", "chemical burn", "asphyxiation", "flash point"}
	for _, kw := range highRiskKeywords {
		if strings.Contains(lower, kw) {
			return "HIGH_RISK"
		}
	}

	mediumRiskKeywords := []string{"ppe required", "safety glasses", "hearing protection",
		"vibration", "misalignment", "leak", "seal failure", "cavitation",
		"overheat", "bearing failure", "abnormal noise"}
	for _, kw := range mediumRiskKeywords {
		if strings.Contains(lower, kw) {
			return "MEDIUM_RISK"
		}
	}

	return "COMPLIANT"
}

// ChunkDocument splits document text into semantic chunks with metadata.
// Chunks are split by logical section boundaries depending on document type.
func (s *documentParserService) ChunkDocument(text string, equipmentTag string, documentType string) []ChunkMetadata {
	var chunks []ChunkMetadata

	// Split strategy depends on document type
	var rawChunks []string

	switch documentType {
	case "OPL":
		// OPL: split by step numbers (Step 1, Step 2, etc.) or numbered lists
		rawChunks = splitByPattern(text, `(?i)(step\s*\d+|langkah\s*\d+|\d+\.\s+[A-Z])`)
	case "Maintenance Log":
		// Maintenance Log: split by date entries or work order boundaries
		rawChunks = splitByPattern(text, `(?i)(\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4}|work order|wo\s*#|wo\s*:)`)
	case "Datasheet":
		// Datasheet: split by sections/headers
		rawChunks = splitByPattern(text, `(?i)(general data|design condition|operating condition|material|driver|performance|construction|impeller)`)
	default:
		// Generic: split by page markers or paragraph breaks
		rawChunks = splitByParagraph(text, 500)
	}

	if len(rawChunks) == 0 {
		rawChunks = splitByParagraph(text, 500)
	}

	for i, chunk := range rawChunks {
		chunk = strings.TrimSpace(chunk)
		if len(chunk) < 20 {
			continue
		}

		safetyRisk := s.DetectSafetyRisk(chunk)

		chunks = append(chunks, ChunkMetadata{
			EquipmentTag: equipmentTag,
			DocumentType: documentType,
			SafetyRisk:   safetyRisk,
			Content:      chunk,
			PageNumber:   (i / 6) + 1,
			ChunkIndex:   i + 1,
		})
	}

	return chunks
}

// splitByPattern splits text using a regex delimiter, keeping the delimiter with the chunk.
func splitByPattern(text string, pattern string) []string {
	re := regexp.MustCompile(pattern)
	indices := re.FindAllStringIndex(text, -1)

	if len(indices) == 0 {
		return nil // fallback to paragraph splitting
	}

	var chunks []string
	for i, idx := range indices {
		start := idx[0]
		var end int
		if i+1 < len(indices) {
			end = indices[i+1][0]
		} else {
			end = len(text)
		}
		chunk := strings.TrimSpace(text[start:end])
		if len(chunk) > 20 {
			chunks = append(chunks, chunk)
		}
	}

	// Capture text before first match as a preamble chunk
	if len(indices) > 0 && indices[0][0] > 50 {
		preamble := strings.TrimSpace(text[:indices[0][0]])
		if len(preamble) > 20 {
			chunks = append([]string{preamble}, chunks...)
		}
	}

	return chunks
}

// splitByParagraph splits text into chunks of roughly maxChars characters at paragraph boundaries.
func splitByParagraph(text string, maxChars int) []string {
	paragraphs := strings.Split(text, "\n")
	var chunks []string
	var current strings.Builder

	for _, p := range paragraphs {
		p = strings.TrimSpace(p)
		if len(p) == 0 {
			continue
		}

		if current.Len()+len(p) > maxChars && current.Len() > 0 {
			chunks = append(chunks, current.String())
			current.Reset()
		}
		if current.Len() > 0 {
			current.WriteString("\n")
		}
		current.WriteString(p)
	}

	if current.Len() > 0 {
		chunks = append(chunks, current.String())
	}

	return chunks
}

// ParseCustomRange parses a string like "1-3, 5, 8" into an array of page numbers [1, 2, 3, 5, 8]
func (s *documentParserService) ParseCustomRange(input string, totalPages int) []int {
	input = strings.ReplaceAll(input, " ", "")
	if input == "" {
		return []int{}
	}

	pageSet := make(map[int]bool)
	parts := strings.Split(input, ",")

	for _, part := range parts {
		if strings.Contains(part, "-") {
			rangeParts := strings.Split(part, "-")
			if len(rangeParts) == 2 {
				start, err1 := strconv.Atoi(rangeParts[0])
				end, err2 := strconv.Atoi(rangeParts[1])
				if err1 == nil && err2 == nil && start <= end {
					for i := start; i <= end; i++ {
						if i > 0 && i <= totalPages {
							pageSet[i] = true
						}
					}
				}
			}
		} else {
			val, err := strconv.Atoi(part)
			if err == nil && val > 0 && val <= totalPages {
				pageSet[val] = true
			}
		}
	}

	var pages []int
	for page := range pageSet {
		pages = append(pages, page)
	}
	sort.Ints(pages)
	return pages
}

func (s *documentParserService) ExtractTargetPages(filePath string, pageMode string, customRange string) (string, []int, error) {
	r, err := pdf.Open(filePath)
	if err != nil {
		return "", nil, err
	}

	totalPages := r.NumPage()
	if totalPages == 0 {
		return "", nil, fmt.Errorf("no pages found in PDF")
	}

	var targetPages []int
	if pageMode == "teaser" {
		maxTeaser := 3
		if totalPages < 3 {
			maxTeaser = totalPages
		}
		for i := 1; i <= maxTeaser; i++ {
			targetPages = append(targetPages, i)
		}
	} else if pageMode == "custom" {
		targetPages = s.ParseCustomRange(customRange, totalPages)
	} else {
		// "full" or empty
		for i := 1; i <= totalPages; i++ {
			targetPages = append(targetPages, i)
		}
	}

	if len(targetPages) == 0 {
		return "", nil, fmt.Errorf("no valid pages selected")
	}

	var extractedText strings.Builder
	for _, pageNum := range targetPages {
		p := r.Page(pageNum)
		if p.V.IsNull() {
			continue
		}

		content, err := p.GetPlainText(nil)
		if err == nil {
			extractedText.WriteString(fmt.Sprintf("\n--- PAGE %d ---\n", pageNum))
			extractedText.WriteString(content)
		}
	}

	if extractedText.Len() == 0 {
		// Fallback to reading the entire document
		var buf bytes.Buffer
		b, err := r.GetPlainText()
		if err == nil {
			buf.ReadFrom(b)
			return buf.String(), targetPages, nil
		}
	}

	return extractedText.String(), targetPages, nil
}


package handler

import (
	"fmt"
	"ozikcarbon-backend/domain"
	"ozikcarbon-backend/internal/service"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type FreeAuditHandler struct {
	piiMasker     service.PIIMaskerService
	pasalID       service.PasalIdService
	llmFactory    service.LLMFactoryService
	scoringEngine service.ScoringEngineService
	auditService  service.AuditService
}

func NewFreeAuditHandler(
	piiMasker service.PIIMaskerService,
	pasalID service.PasalIdService,
	llmFactory service.LLMFactoryService,
	scoringEngine service.ScoringEngineService,
) *FreeAuditHandler {
	return &FreeAuditHandler{
		piiMasker:     piiMasker,
		pasalID:       pasalID,
		llmFactory:    llmFactory,
		scoringEngine: scoringEngine,
	}
}

// SetAuditService sets the audit service for processing guest teasers through the real pipeline
func (h *FreeAuditHandler) SetAuditService(svc service.AuditService) {
	h.auditService = svc
}

// GuestTeaser handles POST /api/v1/audit/guest-teaser (Public)
func (h *FreeAuditHandler) GuestTeaser(c *fiber.Ctx) error {
	fileHeader, err := c.FormFile("document")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.ErrorResponse{
			Error:   "MISSING_DOCUMENT",
			Message: "Harap unggah dokumen PDF/DOCX/TXT.",
		})
	}

	// Open file in memory
	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.ErrorResponse{
			Error: "FILE_READ_ERROR",
		})
	}
	defer file.Close()

	// Check if it's a PDF and try to extract text
	var text string
	if strings.HasSuffix(strings.ToLower(fileHeader.Filename), ".pdf") {
		c.SaveFile(fileHeader, "./temp_teaser.pdf")
		docParser := service.NewDocumentParserService()
		extractedText, _, err := docParser.ExtractTargetPages("./temp_teaser.pdf", "teaser", "")
		if err == nil && len(extractedText) > 10 {
			text = extractedText
		}
	}

	// Fallback: read raw bytes
	if text == "" {
		buf := make([]byte, fileHeader.Size)
		_, _ = file.Read(buf)
		text = string(buf)
	}

	if len(text) < 10 {
		text = "DOKUMEN_TIDAK_TERBACA\n\nSistem gagal mengekstrak teks dari dokumen Anda."
	}

	// Use the real audit service pipeline if available
	if h.auditService != nil {
		req := &domain.GuestTeaserRequest{
			PDDText:  text,
			FileType: "pdf",
		}
		res, err := h.auditService.ProcessGuestTeaser(c.Context(), req)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(domain.ErrorResponse{
				Error:   "PROCESSING_ERROR",
				Message: err.Error(),
			})
		}
		return c.Status(fiber.StatusOK).JSON(res)
	}

	// Fallback: manual pipeline (same as ProcessGuestTeaser but inline)
	// Truncate to 3 pages
	truncatedText := text
	if len(truncatedText) > 1500 {
		truncatedText = truncatedText[:1500]
	}

	maskedText := h.piiMasker.Mask(truncatedText)
	laws, _ := h.pasalID.SearchRegulations(c.Context(), "lingkungan kehutanan", "UU")
	var lawCtx []string
	for _, l := range laws {
		lawCtx = append(lawCtx, l.Title+" - "+l.Snippet)
	}

	prompt := "Analyze this PDD text (freemium teaser, first 3 pages):\n\n" + maskedText
	llmResult, _ := h.llmFactory.AnalyzeClause(c.Context(), prompt, lawCtx, []int{1, 2, 3})
	if llmResult == nil {
		llmResult = &service.LLMAnalysisResult{}
	}

	score, _ := h.scoringEngine.CalculateFeasibility(
		llmResult.ScoreLegal, llmResult.ScoreTechnical,
		llmResult.ScoreSocial, llmResult.ScoreTransparency,
	)

	// Build clauses from text
	paragraphs := strings.Split(truncatedText, "\n")
	var clauses []domain.AuditClause
	idx := 0
	for _, p := range paragraphs {
		p = strings.TrimSpace(p)
		if len(p) <= 20 {
			continue
		}
		idx++
		clauses = append(clauses, domain.AuditClause{
			ID:     idx,
			Clause: fmt.Sprintf("Klausul %d.%d", (idx/5)+1, (idx%5)+1),
			Text:   p,
			Status: "compliant",
		})
	}

	var topViolation *domain.AuditIssue
	if len(llmResult.Issues) > 0 {
		topViolation = &domain.AuditIssue{
			ClauseText:      llmResult.Issues[0].ClauseText,
			MatchedSop:      llmResult.Issues[0].MatchedSop,
			OriginalSopText: llmResult.Issues[0].OriginalSopText,
		}
	}

	return c.Status(fiber.StatusOK).JSON(domain.GuestTeaserResponse{
		IsFreemiumTeaser:  true,
		FeasibilityScore:  score,
		ScoreLegal:        llmResult.ScoreLegal,
		ScoreTechnical:    llmResult.ScoreTechnical,
		ScoreSocial:       llmResult.ScoreSocial,
		ScoreTransparency: llmResult.ScoreTransparency,
		SpatialSummary:    fmt.Sprintf("Analisis dokumen mendeteksi %d klausul. Skor kelayakan: %.0f/100.", len(clauses), score),
		TopViolation:      topViolation,
		Clauses:           clauses,
	})
}

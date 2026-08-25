package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"ozikcarbon-backend/domain"
	"ozikcarbon-backend/internal/repository"
	"strings"
	"time"

	"github.com/google/uuid"
)

type AuditService interface {
	ProcessAudit(ctx context.Context, req *domain.ProcessAuditRequest) (*domain.ProcessAuditResponse, error)
	ProcessGuestTeaser(ctx context.Context, req *domain.GuestTeaserRequest) (*domain.GuestTeaserResponse, error)
}

type auditService struct {
	auditRepo     repository.AuditRepository
	userRepo      repository.UserRepository
	piiMasker     PIIMaskerService
	pasalID       PasalIdService
	llmFactory    LLMFactoryService
	scoringEngine ScoringEngineService
	ragService    RAGService
}

func NewAuditService(
	auditRepo repository.AuditRepository,
	userRepo repository.UserRepository,
	piiMasker PIIMaskerService,
	pasalID PasalIdService,
	llmFactory LLMFactoryService,
	scoringEngine ScoringEngineService,
	ragService RAGService,
) AuditService {
	return &auditService{
		auditRepo:     auditRepo,
		userRepo:      userRepo,
		piiMasker:     piiMasker,
		pasalID:       pasalID,
		llmFactory:    llmFactory,
		scoringEngine: scoringEngine,
		ragService:    ragService,
	}
}

// extractKeywords extracts search keywords from document text for SOP/OPL lookup
func extractKeywords(text string) []string {
	lower := strings.ToLower(text)
	keywordMap := map[string]string{
		"pump":        "centrifugal pump maintenance SOP",
		"seal":        "mechanical seal API plan flush",
		"vibration":   "vibration monitoring alignment",
		"bearing":     "bearing lubrication temperature",
		"alignment":   "pump motor alignment laser",
		"cavitation":  "cavitation NPSH minimum flow",
		"hexane":      "hexane flammable material handling",
		"startup":     "pump startup priming procedure",
		"valve":       "valve operation maintenance",
		"pressure":    "pressure test hydraulic",
		"temperature": "bearing temperature monitoring",
		"leak":        "seal leak hydrocarbon containment",
		"loto":        "lockout tagout isolation",
		"interlock":   "interlock logic safety system",
	}

	seen := make(map[string]bool)
	var queries []string
	for kw, query := range keywordMap {
		if strings.Contains(lower, kw) && !seen[query] {
			seen[query] = true
			queries = append(queries, query)
		}
	}

	if len(queries) == 0 {
		queries = []string{"equipment maintenance petrochemical SOP"}
	}

	// Limit to 3 queries
	if len(queries) > 3 {
		queries = queries[:3]
	}

	return queries
}

func (s *auditService) ProcessGuestTeaser(ctx context.Context, req *domain.GuestTeaserRequest) (*domain.GuestTeaserResponse, error) {
	// 1. Truncate to first 3 pages (~1500 chars)
	text := req.PDDText
	if len(text) > 1500 {
		text = text[:1500]
	}

	// 2. PII Auto-Masking
	maskedText := s.piiMasker.Mask(text)

	// 3. Extract keywords and search Pasal.id
	keywords := extractKeywords(text)
	var allLaws []PasalIdLawResult
	for _, q := range keywords {
		laws, _ := s.pasalID.SearchRegulations(ctx, q, "UU")
		allLaws = append(allLaws, laws...)
	}

	// Build law context for LLM
	var lawContext []string
	for _, l := range allLaws {
		lawContext = append(lawContext, fmt.Sprintf("[%s]: %s", l.Title, l.Snippet))
	}

	// 4. Call LLM for analysis
	prompt := fmt.Sprintf("Analyze this PDD text (first 3 pages only, freemium teaser):\n\n%s", maskedText)
	llmResult, err := s.llmFactory.AnalyzeClause(ctx, prompt, lawContext, []int{1, 2, 3})
	if err != nil {
		log.Printf("❌ LLM analysis failed for teaser: %v", err)
		// Continue with zero scores if LLM fails
		llmResult = &LLMAnalysisResult{}
	}

	// 5. Build clauses from LLM issues + document text
	paragraphs := strings.Split(text, "\n")
	var validParagraphs []string
	for _, p := range paragraphs {
		p = strings.TrimSpace(p)
		if len(p) > 20 {
			validParagraphs = append(validParagraphs, p)
		}
	}
	if len(validParagraphs) == 0 {
		validParagraphs = []string{text}
	}

	var clauses []domain.AuditClause
	for i, p := range validParagraphs {
		clauseStatus := "compliant"
		var issue *domain.AuditIssue

		// Check if any LLM issue matches this paragraph
		for _, llmIssue := range llmResult.Issues {
			if strings.Contains(strings.ToLower(p), strings.ToLower(llmIssue.ClauseText[:minInt(len(llmIssue.ClauseText), 30)])) ||
				(llmIssue.Severity == "HIGH_RISK" && i < 3) {
				clauseStatus = "high"
				if llmIssue.Severity == "MEDIUM_RISK" {
					clauseStatus = "medium"
				}
				issue = &domain.AuditIssue{
					Severity:          domain.RiskSeverity(llmIssue.Severity),
					ClauseText:        llmIssue.ClauseText,
					MatchedSop:        llmIssue.MatchedSop,
					OriginalSopText:   llmIssue.OriginalSopText,
					SuggestedRevision: llmIssue.SuggestedRevision,
				}
				break
			}
		}

		clauses = append(clauses, domain.AuditClause{
			ID:     i + 1,
			Clause: fmt.Sprintf("Klausul %d.%d", (i/5)+1, (i%5)+1),
			Text:   p,
			Status: clauseStatus,
			Issue:  issue,
		})
	}

	// Get top violation
	var topViolation *domain.AuditIssue
	if len(llmResult.Issues) > 0 {
		topViolation = &domain.AuditIssue{
			ClauseText:      llmResult.Issues[0].ClauseText,
			MatchedSop:      llmResult.Issues[0].MatchedSop,
			OriginalSopText: llmResult.Issues[0].OriginalSopText,
		}
	}

	score, _ := s.scoringEngine.CalculateFeasibility(
		llmResult.ScoreLegal, llmResult.ScoreTechnical,
		llmResult.ScoreSocial, llmResult.ScoreTransparency,
	)

	return &domain.GuestTeaserResponse{
		IsFreemiumTeaser:  true,
		FeasibilityScore:  score,
		ScoreLegal:        llmResult.ScoreLegal,
		ScoreTechnical:    llmResult.ScoreTechnical,
		ScoreSocial:       llmResult.ScoreSocial,
		ScoreTransparency: llmResult.ScoreTransparency,
		SpatialSummary:    fmt.Sprintf("Analisis dokumen mendeteksi %d klausul. Skor kelayakan: %.0f/100.", len(validParagraphs), score),
		TopViolation:      topViolation,
		Clauses:           clauses,
	}, nil
}

func (s *auditService) ProcessAudit(ctx context.Context, req *domain.ProcessAuditRequest) (*domain.ProcessAuditResponse, error) {
	// Validate userID
	if req.UserID == "" {
		return nil, fmt.Errorf("userID is required for full audit")
	}

	// 1. Full text
	text := req.PDDText

	// 2. PII Auto-Masking
	maskedText := s.piiMasker.Mask(text)

	// 3. RAG Semantic Search using pgvector
	lawContextLines, err := s.ragService.QueryPasalDatabase(ctx, text)
	if err != nil || len(lawContextLines) == 0 {
		log.Printf("⚠️ RAG pgvector failed or empty: %v. Falling back to Keyword Pasal.id", err)
		keywords := extractKeywords(text)
		var allLaws []PasalIdLawResult
		for _, q := range keywords {
			laws, _ := s.pasalID.SearchRegulations(ctx, q, "UU")
			allLaws = append(allLaws, laws...)
		}

		seen := make(map[string]bool)
		for _, l := range allLaws {
			if !seen[l.ID] {
				seen[l.ID] = true
				lawContextLines = append(lawContextLines, fmt.Sprintf("[%s] (%s): %s", l.Title, l.URL, l.Snippet))
			}
		}
	}

	log.Printf("📚 RAG Context: %d laws retrieved for LLM injection", len(lawContextLines))

	// 4. Send to LLM with injected RAG context
	prompt := fmt.Sprintf("Analyze this PDD text for compliance:\n\n%s", maskedText)
	llmResp, err := s.llmFactory.AnalyzeClause(ctx, prompt, lawContextLines, req.TargetPages)
	if err != nil {
		return nil, fmt.Errorf("LLM analysis failed: %w", err)
	}

	// 5. Calculate feasibility score
	score, status := s.scoringEngine.CalculateFeasibility(
		llmResp.ScoreLegal, llmResp.ScoreTechnical,
		llmResp.ScoreSocial, llmResp.ScoreTransparency,
	)

	// 6. Generate HMAC-SHA256 Badge
	auditID := uuid.New().String()
	hash := ""
	if score >= 80 {
		hash = s.scoringEngine.GenerateHMACBadge(auditID, score)
	}

	// 7. Build clauses from document text + LLM issues
	paragraphs := strings.Split(text, "\n")
	var validParagraphs []string
	for _, p := range paragraphs {
		p = strings.TrimSpace(p)
		if len(p) > 20 {
			validParagraphs = append(validParagraphs, p)
		}
	}
	if len(validParagraphs) == 0 {
		validParagraphs = []string{text}
	}

	var clauses []domain.AuditClause
	var auditIssues []domain.AuditIssue
	totalSentences := 0
	totalWords := 0

	type PageData struct {
		PageNumber int                  `json:"page_number"`
		Chunks     []domain.AuditClause `json:"chunks"`
	}
	var pages []PageData

	chunksPerPage := 6

	// Keep track of matched issues
	matchedLLMIssues := make(map[int]bool)

	// Map LLM issues to clauses
	for i, p := range validParagraphs {
		totalSentences += strings.Count(p, ".") + strings.Count(p, "?") + strings.Count(p, "!")
		totalWords += len(strings.Fields(p))

		clauseStatus := "COMPLIANT"
		var issue *domain.AuditIssue

		// Check if any LLM issue maps to this paragraph
		for idx, llmIssue := range llmResp.Issues {
			if matchedLLMIssues[idx] {
				continue
			}
			clauseTextLower := strings.ToLower(llmIssue.ClauseText)
			paragraphLower := strings.ToLower(p)

			// Match by content overlap
			matchLen := minInt(len(clauseTextLower), 20)
			if matchLen > 0 && (strings.Contains(paragraphLower, clauseTextLower[:matchLen]) || strings.Contains(clauseTextLower, paragraphLower[:minInt(len(paragraphLower), 20)])) {
				clauseStatus = string(llmIssue.Severity)
				issue = &domain.AuditIssue{
					Severity:          domain.RiskSeverity(llmIssue.Severity),
					ClauseText:        p,
					MatchedSop:        llmIssue.MatchedSop,
					OriginalSopText:   llmIssue.OriginalSopText,
					SuggestedRevision: llmIssue.SuggestedRevision,
					PageNumber:        (i / chunksPerPage) + 1,
					ChunkIndex:        i + 1,
				}
				auditIssues = append(auditIssues, *issue)
				matchedLLMIssues[idx] = true
				break
			}
		}



		clause := domain.AuditClause{
			ID:     i + 1,
			Clause: fmt.Sprintf("Klausul %d.%d", (i/5)+1, (i%5)+1),
			Text:   p,
			Status: clauseStatus,
			Issue:  issue,
		}
		clauses = append(clauses, clause)

		pageNum := (i / chunksPerPage) + 1
		if len(pages) < pageNum {
			pages = append(pages, PageData{PageNumber: pageNum, Chunks: []domain.AuditClause{}})
		}
		pages[pageNum-1].Chunks = append(pages[pageNum-1].Chunks, clause)
	}

	// Append any unmatched LLM issues to the first chunk
	for idx, llmIssue := range llmResp.Issues {
		if !matchedLLMIssues[idx] {
			issue := &domain.AuditIssue{
				Severity:          domain.RiskSeverity(llmIssue.Severity),
				ClauseText:        llmIssue.ClauseText,
				MatchedSop:        llmIssue.MatchedSop,
				OriginalSopText:   llmIssue.OriginalSopText,
				SuggestedRevision: llmIssue.SuggestedRevision,
				PageNumber:        1,
				ChunkIndex:        1,
			}
			auditIssues = append(auditIssues, *issue)
			
			// Also update the first chunk in the JSON
			if len(pages) > 0 && len(pages[0].Chunks) > 0 && pages[0].Chunks[0].Status == "COMPLIANT" {
				pages[0].Chunks[0].Status = string(llmIssue.Severity)
				pages[0].Chunks[0].Issue = issue
			}
		}
	}

	totalPages := len(pages)
	if totalSentences == 0 {
		totalSentences = len(validParagraphs)
	}

	docData := map[string]interface{}{"pages": pages}
	parsedJsonBytes, _ := json.Marshal(docData)
	parsedDocumentJson := string(parsedJsonBytes)

	badgeStatus := domain.BadgeInvalid
	hash = s.scoringEngine.GenerateHMACBadge(auditID, score)

	audit := &domain.ProjectAudit{
		ID:                 auditID,
		UserID:             req.UserID,
		EquipmentName:        req.EquipmentName,
		TotalPages:         totalPages,
		TotalWords:         totalWords,
		TotalSentences:     totalSentences,
		ParsedDocumentJson: parsedDocumentJson,
		FeasibilityScore:   score,
		ScoreLegal:         llmResp.ScoreLegal,
		ScoreTechnical:     llmResp.ScoreTechnical,
		ScoreSocial:        llmResp.ScoreSocial,
		ScoreTransparency:  llmResp.ScoreTransparency,
		Status:             badgeStatus,
		SHA256Hash:         hash,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
		Issues:             auditIssues,
		ReviewStatus:       domain.ReviewStatusPending,
	}

	_, err = s.auditRepo.CreateAudit(ctx, audit)
	if err != nil {
		return nil, err
	}

	// Deduct credit after successful audit save
	err = s.userRepo.DeductCredit(ctx, req.UserID)
	if err != nil {
		log.Printf("⚠️ Failed to deduct credit for user %s: %v", req.UserID, err)
		// We still return success for the audit since it completed, but we logged the billing failure
	}

	log.Printf("✅ Audit %s saved. Score=%.0f Status=%s Issues=%d", auditID, score, status, len(auditIssues))

	return &domain.ProcessAuditResponse{
		AuditID:            auditID,
		Status:             status,
		FeasibilityScore:   score,
		ScoreLegal:         llmResp.ScoreLegal,
		ScoreTechnical:     llmResp.ScoreTechnical,
		ScoreSocial:        llmResp.ScoreSocial,
		ScoreTransparency:  llmResp.ScoreTransparency,
		SHA256Hash:         hash,
		Clauses:            clauses,
		Issues:             auditIssues,
		ParsedDocumentJson: parsedDocumentJson,
		TotalPages:         totalPages,
		TotalWords:         totalWords,
		TotalSentences:     totalSentences,
	}, nil
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

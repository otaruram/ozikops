package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"ozikcarbon-backend/internal/repository"
	"ozikcarbon-backend/prisma/db"
)

type RegulasiSearchResult struct {
	ID           string  `json:"id"`
	RegName      string  `json:"regName"`
	Article      string  `json:"article"`
	Content      string  `json:"content"`
	RiskCategory string  `json:"riskCategory"`
	Similarity   float64 `json:"similarity"`
	EquipmentTag *string `json:"equipmentTag"`
	DocumentType *string `json:"documentType"`
	SafetyRisk   *string `json:"safetyRisk"`
}

type RegulasiSearchResponse struct {
	AiSummary string                 `json:"aiSummary"`
	Results   []RegulasiSearchResult `json:"results"`
}

type RegulasiService interface {
	Search(ctx context.Context, query string) (*RegulasiSearchResponse, error)
	GetRecommendations(ctx context.Context, userID string) ([]RegulasiSearchResult, error)
	AddSOP(ctx context.Context, title, risk, driveLink, content string) error
	GetSOPs(ctx context.Context) ([]RegulasiSearchResult, error)
	DeleteSOP(ctx context.Context, id string) error
}

type regulasiService struct {
	dbClient   *db.PrismaClient
	auditRepo  repository.AuditRepository
	sumopodURL string
	sumopodKey string
	httpClient *http.Client

	cacheMutex  sync.RWMutex
	searchCache map[string]*RegulasiSearchResponse
}

func NewRegulasiService(dbClient *db.PrismaClient, auditRepo repository.AuditRepository, sumopodURL, sumopodKey string) RegulasiService {
	return &regulasiService{
		dbClient:    dbClient,
		auditRepo:   auditRepo,
		sumopodURL:  sumopodURL,
		sumopodKey:  sumopodKey,
		httpClient:  &http.Client{Timeout: 60 * time.Second},
		searchCache: make(map[string]*RegulasiSearchResponse),
	}
}

func (s *regulasiService) getEmbedding(ctx context.Context, text string) ([]float64, error) {
	if s.sumopodURL == "" || s.sumopodKey == "" {
		return nil, fmt.Errorf("SUMOPOD_URL or SUMOPOD_API_KEY is missing")
	}

	sumopodURL := strings.TrimSuffix(s.sumopodURL, "/")
	var endpoint string
	if strings.HasSuffix(sumopodURL, "/v1") {
		endpoint = sumopodURL + "/embeddings"
	} else {
		endpoint = sumopodURL + "/v1/embeddings"
	}

	reqBody, _ := json.Marshal(map[string]interface{}{
		"model": "text-embedding-3-small",
		"input": text,
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.sumopodKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("embedding API failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result struct {
		Data []struct {
			Embedding []float64 `json:"embedding"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	if len(result.Data) == 0 {
		return nil, fmt.Errorf("no embedding returned")
	}

	return result.Data[0].Embedding, nil
}

func (s *regulasiService) generateAISynthesis(ctx context.Context, query string, chunks []RegulasiSearchResult) string {
	if s.sumopodURL == "" || s.sumopodKey == "" {
		return "AI Synthesis not available."
	}

	sumopodURL := strings.TrimSuffix(s.sumopodURL, "/")
	var endpoint string
	if strings.HasSuffix(sumopodURL, "/v1") {
		endpoint = sumopodURL + "/chat/completions"
	} else {
		endpoint = sumopodURL + "/v1/chat/completions"
	}

	var contextText string
	for i, chunk := range chunks {
		tag := ""
		if chunk.EquipmentTag != nil {
			tag = fmt.Sprintf(" [%s]", *chunk.EquipmentTag)
		}
		docType := ""
		if chunk.DocumentType != nil {
			docType = fmt.Sprintf(" (%s)", *chunk.DocumentType)
		}
		contextText += fmt.Sprintf("[%d]%s%s %s (%s): %s\n", i+1, tag, docType, chunk.RegName, chunk.Article, chunk.Content)
	}

	prompt := fmt.Sprintf(`You are OzikOps AI, a Senior Petrochemical Reliability Assistant.
Your task is to answer the technician's query using ONLY the retrieved SOP/OPL/Datasheet context below.
Provide step-by-step troubleshooting guidance. Identify the Equipment Tag, Risk Level, and required PPE.
If context is insufficient, state "Escalate to Senior Engineer."

Query: %s

Retrieved Context:
%s`, query, contextText)

	reqBody, _ := json.Marshal(map[string]interface{}{
		"model": "gemini/gemini-3.1-flash-lite",
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
		"temperature": 0.3,
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewBuffer(reqBody))
	if err != nil {
		return "Failed to generate AI summary."
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.sumopodKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "Failed to fetch AI summary."
	}
	defer resp.Body.Close()

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil || len(result.Choices) == 0 {
		return "Could not parse AI response."
	}

	return result.Choices[0].Message.Content
}

func (s *regulasiService) Search(ctx context.Context, query string) (*RegulasiSearchResponse, error) {
	// Check cache first
	s.cacheMutex.RLock()
	if cached, ok := s.searchCache[query]; ok {
		s.cacheMutex.RUnlock()
		return cached, nil
	}
	s.cacheMutex.RUnlock()

	var results []RegulasiSearchResult
	var useKeywordFallback bool

	emb, err := s.getEmbedding(ctx, query)
	if err != nil {
		log.Printf("⚠️ Embedding failed, falling back to keyword search: %v", err)
		useKeywordFallback = true
	}

	if !useKeywordFallback {
		embStrBytes, _ := json.Marshal(emb)
		embStr := string(embStrBytes)

		rawQuery := fmt.Sprintf(`
			SELECT id, "regName", article, content, "riskCategory", 
			1 - (embedding <=> '%s'::vector) AS similarity,
			equipment_tag AS "equipmentTag", document_type AS "documentType", safety_risk AS "safetyRisk"
			FROM plant_sops_and_pids 
			ORDER BY embedding <=> '%s'::vector 
			LIMIT 5;
		`, embStr, embStr)

		err = s.dbClient.Prisma.QueryRaw(rawQuery).Exec(ctx, &results)
		if err != nil {
			log.Printf("⚠️ Vector search failed, falling back to keyword search: %v", err)
			useKeywordFallback = true
		}
	}

	// Keyword fallback: simple ILIKE search
	if useKeywordFallback {
		keywords := strings.Fields(query)
		var conditions []string
		for _, kw := range keywords {
			escaped := strings.ReplaceAll(kw, "'", "''")
			conditions = append(conditions, fmt.Sprintf(`(content ILIKE '%%%s%%' OR "regName" ILIKE '%%%s%%' OR article ILIKE '%%%s%%')`, escaped, escaped, escaped))
		}
		whereClause := "TRUE"
		if len(conditions) > 0 {
			whereClause = strings.Join(conditions, " OR ")
		}

		kwQuery := fmt.Sprintf(`
			SELECT id, "regName", article, content, "riskCategory", 0.5 AS similarity,
			equipment_tag AS "equipmentTag", document_type AS "documentType", safety_risk AS "safetyRisk"
			FROM plant_sops_and_pids
			WHERE %s
			LIMIT 5;
		`, whereClause)

		err = s.dbClient.Prisma.QueryRaw(kwQuery).Exec(ctx, &results)
		if err != nil {
			log.Printf("❌ Keyword search also failed: %v", err)
			// Return empty results instead of error so the page still loads
			results = []RegulasiSearchResult{}
		}
	}

	aiSummary := s.generateAISynthesis(ctx, query, results)

	response := &RegulasiSearchResponse{
		AiSummary: aiSummary,
		Results:   results,
	}

	// Save to cache
	s.cacheMutex.Lock()
	s.searchCache[query] = response
	s.cacheMutex.Unlock()

	return response, nil
}

func (s *regulasiService) GetRecommendations(ctx context.Context, userID string) ([]RegulasiSearchResult, error) {
	// Fetch user's recent audits
	audits, err := s.auditRepo.GetAuditsByUserID(ctx, userID)
	if err != nil {
		log.Printf("Failed to fetch audits for recommendations: %v", err)
	}

	searchQuery := "Equipment maintenance SOP, OPL troubleshooting, pump reliability, petrochemical operations."
	if len(audits) > 0 {
		// Compile a prompt to generate a tailored search query
		auditTitles := ""
		for i, a := range audits {
			if i >= 5 {
				break
			}
			auditTitles += "- " + a.EquipmentName + "\n"
		}

		sumopodURL := strings.TrimSuffix(s.sumopodURL, "/")
		var endpoint string
		if strings.HasSuffix(sumopodURL, "/v1") {
			endpoint = sumopodURL + "/chat/completions"
		} else {
			endpoint = sumopodURL + "/v1/chat/completions"
		}

		prompt := fmt.Sprintf(`The user frequently analyzes these equipment/tickets:
%s
Generate a single search query (max 10 words) to find relevant SOPs, OPLs, or maintenance procedures for this equipment. Output only the query, no quotes or explanation.`, auditTitles)

		reqBody, _ := json.Marshal(map[string]interface{}{
			"model": "gemini/gemini-3.1-flash-lite",
			"messages": []map[string]string{
				{"role": "user", "content": prompt},
			},
			"temperature": 0.5,
		})

		req, reqErr := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewBuffer(reqBody))
		if reqErr == nil {
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+s.sumopodKey)

			resp, doErr := s.httpClient.Do(req)
			if doErr == nil {
				defer resp.Body.Close()
				var result struct {
					Choices []struct {
						Message struct {
							Content string `json:"content"`
						} `json:"message"`
					} `json:"choices"`
				}
				if json.NewDecoder(resp.Body).Decode(&result) == nil && len(result.Choices) > 0 {
					searchQuery = strings.TrimSpace(result.Choices[0].Message.Content)
					log.Printf("Generated tailored recommendation query: %s", searchQuery)
				}
			}
		}
	}

	// Now run the vector search using the tailored query
	emb, err := s.getEmbedding(ctx, searchQuery)
	if err != nil {
		return nil, err
	}

	embStrBytes, _ := json.Marshal(emb)
	embStr := string(embStrBytes)

	var results []RegulasiSearchResult
	rawQuery := fmt.Sprintf(`
		SELECT id, "regName", article, content, "riskCategory", 
		1 - (embedding <=> '%s'::vector) AS similarity,
		equipment_tag AS "equipmentTag", document_type AS "documentType", safety_risk AS "safetyRisk"
		FROM plant_sops_and_pids 
		ORDER BY embedding <=> '%s'::vector 
		LIMIT 4;
	`, embStr, embStr)

	err = s.dbClient.Prisma.QueryRaw(rawQuery).Exec(ctx, &results)
	if err != nil {
		return nil, err
	}

	return results, nil
}

func (s *regulasiService) AddSOP(ctx context.Context, title, risk, driveLink, content string) error {
	emb, err := s.getEmbedding(ctx, content)
	if err != nil {
		log.Printf("Warning: failed to get embedding for SOP: %v", err)
	}

	var severity db.AuditSeverity
	switch risk {
	case "HIGH_RISK":
		severity = db.AuditSeverityHighRisk
	case "MEDIUM_RISK":
		severity = db.AuditSeverityMediumRisk
	default:
		severity = db.AuditSeverityCompliant
	}

	created, err := s.dbClient.RegulasiKnowledgeBase.CreateOne(
		db.RegulasiKnowledgeBase.RegName.Set(title),
		db.RegulasiKnowledgeBase.Article.Set(driveLink),
		db.RegulasiKnowledgeBase.Content.Set(content),
		db.RegulasiKnowledgeBase.RiskCategory.Set(severity),
	).Exec(ctx)
	if err != nil {
		return err
	}

	if len(emb) > 0 {
		embStrBytes, _ := json.Marshal(emb)
		rawQuery := fmt.Sprintf(`UPDATE plant_sops_and_pids SET embedding = '%s'::vector WHERE id = '%s'`, string(embStrBytes), created.ID)
		var dummy []map[string]interface{}
		s.dbClient.Prisma.QueryRaw(rawQuery).Exec(ctx, &dummy)
	}

	return nil
}

func (s *regulasiService) GetSOPs(ctx context.Context) ([]RegulasiSearchResult, error) {
	records, err := s.dbClient.RegulasiKnowledgeBase.FindMany().OrderBy(
		db.RegulasiKnowledgeBase.CreatedAt.Order(db.SortOrderDesc),
	).Exec(ctx)

	if err != nil {
		return nil, err
	}

	var results []RegulasiSearchResult
	for _, rec := range records {
		results = append(results, RegulasiSearchResult{
			ID:           rec.ID,
			RegName:      rec.RegName,
			Article:      rec.Article,
			Content:      rec.Content,
			RiskCategory: string(rec.RiskCategory),
		})
	}
	return results, nil
}

func (s *regulasiService) DeleteSOP(ctx context.Context, id string) error {
	_, err := s.dbClient.RegulasiKnowledgeBase.FindUnique(
		db.RegulasiKnowledgeBase.ID.Equals(id),
	).Delete().Exec(ctx)
	return err
}

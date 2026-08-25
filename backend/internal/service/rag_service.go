package service

import (
	"context"
	"fmt"
	"log"
	"strings"

	"ozikcarbon-backend/prisma/db"
)

type RAGService interface {
	QueryPasalDatabase(ctx context.Context, clause string) ([]string, error)
	QueryByEquipmentTag(ctx context.Context, clause string, equipmentTag string) ([]string, error)
}

type ragService struct {
	client       *db.PrismaClient
	embeddingSvc EmbeddingService
}

func NewRAGService(client *db.PrismaClient, embeddingSvc EmbeddingService) RAGService {
	return &ragService{
		client:       client,
		embeddingSvc: embeddingSvc,
	}
}

type RAGResult struct {
	RegName      string  `json:"regName"`
	Article      string  `json:"article"`
	Content      string  `json:"content"`
	EquipmentTag *string `json:"equipment_tag"`
	DocumentType *string `json:"document_type"`
	SafetyRisk   *string `json:"safety_risk"`
}

// QueryByEquipmentTag performs hybrid search: exact metadata match on equipment_tag FIRST,
// then semantic vector similarity within the filtered set.
func (s *ragService) QueryByEquipmentTag(ctx context.Context, clause string, equipmentTag string) ([]string, error) {
	// Generate Embedding for the query clause
	vec, err := s.embeddingSvc.GenerateEmbedding(ctx, clause)
	if err != nil {
		log.Printf("⚠️ Failed to generate embedding for RAG query: %v", err)
		return nil, err
	}

	// Convert []float32 to string format "[1.2, 3.4, ...]" for pgvector query
	var strVec []string
	for _, v := range vec {
		strVec = append(strVec, fmt.Sprintf("%f", v))
	}
	pgvectorStr := "[" + strings.Join(strVec, ",") + "]"

	// HYBRID SEARCH: Metadata filter (exact equipment_tag match) + vector similarity
	rawQuery := `
		SELECT "regName", article, content, equipment_tag, document_type, safety_risk
		FROM plant_sops_and_pids 
		WHERE equipment_tag = $1
		ORDER BY embedding <=> $2::vector 
		LIMIT 5
	`

	var results []RAGResult
	err = s.client.Prisma.QueryRaw(rawQuery, equipmentTag, pgvectorStr).Exec(ctx, &results)
	if err != nil {
		log.Printf("⚠️ Hybrid search (equipment_tag=%s) failed: %v. Falling back to global search.", equipmentTag, err)
		return s.QueryPasalDatabase(ctx, clause)
	}

	if len(results) == 0 {
		log.Printf("⚠️ No results for equipment_tag=%s. Falling back to global search.", equipmentTag)
		return s.QueryPasalDatabase(ctx, clause)
	}

	var contextLines []string
	for _, r := range results {
		docType := "General"
		if r.DocumentType != nil {
			docType = *r.DocumentType
		}
		risk := ""
		if r.SafetyRisk != nil {
			risk = fmt.Sprintf(" [%s]", *r.SafetyRisk)
		}
		tag := ""
		if r.EquipmentTag != nil {
			tag = *r.EquipmentTag
		}
		contextLines = append(contextLines, fmt.Sprintf("[%s | %s | %s%s]: %s", tag, docType, r.Article, risk, r.Content))
	}

	return contextLines, nil
}

// QueryPasalDatabase performs global semantic search (no metadata filter).
// This is the fallback when no equipment_tag is provided or the filtered search returns no results.
func (s *ragService) QueryPasalDatabase(ctx context.Context, clause string) ([]string, error) {
	// Generate Embedding for the query clause
	vec, err := s.embeddingSvc.GenerateEmbedding(ctx, clause)
	if err != nil {
		log.Printf("⚠️ Failed to generate embedding for RAG query: %v", err)
		return nil, err
	}

	// Convert []float32 to string format "[1.2, 3.4, ...]" for pgvector query
	var strVec []string
	for _, v := range vec {
		strVec = append(strVec, fmt.Sprintf("%f", v))
	}
	pgvectorStr := "[" + strings.Join(strVec, ",") + "]"

	// Global vector similarity search (no metadata filter)
	rawQuery := `
		SELECT "regName", article, content, equipment_tag, document_type, safety_risk
		FROM plant_sops_and_pids 
		ORDER BY embedding <=> $1::vector 
		LIMIT 5
	`

	var results []RAGResult
	err = s.client.Prisma.QueryRaw(rawQuery, pgvectorStr).Exec(ctx, &results)
	if err != nil {
		log.Printf("❌ Failed to query pgvector: %v", err)
		return nil, err
	}

	var contextLines []string
	for _, r := range results {
		docType := "General"
		if r.DocumentType != nil {
			docType = *r.DocumentType
		}
		risk := ""
		if r.SafetyRisk != nil {
			risk = fmt.Sprintf(" [%s]", *r.SafetyRisk)
		}
		tag := ""
		if r.EquipmentTag != nil {
			tag = *r.EquipmentTag + " | "
		}
		contextLines = append(contextLines, fmt.Sprintf("[%s%s | %s%s]: %s", tag, docType, r.Article, risk, r.Content))
	}

	return contextLines, nil
}

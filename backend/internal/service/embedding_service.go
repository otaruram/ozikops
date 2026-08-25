package service

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"io"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"time"
)

type EmbeddingService interface {
	GenerateEmbedding(ctx context.Context, text string) ([]float32, error)
}

type embeddingService struct {
	sumopodURL string
	apiKey     string
	client     *http.Client
}

func NewEmbeddingService(sumopodURL, apiKey string) EmbeddingService {
	return &embeddingService{
		sumopodURL: sumopodURL,
		apiKey:     apiKey,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (s *embeddingService) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
	if s.apiKey == "" || s.apiKey == "mock-key" {
		log.Println("⚠️  No API Key for Embeddings, using deterministic fallback vector.")
		return s.deterministicFallback(text), nil
	}

	endpoint := strings.TrimSuffix(s.sumopodURL, "/") + "/embeddings"
	
	// Open-AI compatible payload
	payload := map[string]interface{}{
		"model": "text-embedding-3-small", // Standard embedding model
		"input": text,
	}

	jsonBody, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(jsonBody))
	if err != nil {
		return s.deterministicFallback(text), err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.apiKey)

	resp, err := s.client.Do(req)
	if err != nil {
		log.Printf("⚠️ Embedding API request failed: %v, falling back.", err)
		return s.deterministicFallback(text), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("⚠️ Embedding API failed (status %d), falling back to deterministic vector.", resp.StatusCode)
		return s.deterministicFallback(text), nil
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return s.deterministicFallback(text), nil
	}

	var res struct {
		Data []struct {
			Embedding []float32 `json:"embedding"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &res); err != nil || len(res.Data) == 0 {
		return s.deterministicFallback(text), nil
	}

	return res.Data[0].Embedding, nil
}

// deterministicFallback creates a pseudo-random 1536-dimensional vector based on text hash
func (s *embeddingService) deterministicFallback(text string) []float32 {
	hash := sha256.Sum256([]byte(text))
	seed := int64(hash[0])<<24 | int64(hash[1])<<16 | int64(hash[2])<<8 | int64(hash[3])
	
	rng := rand.New(rand.NewSource(seed))
	vec := make([]float32, 1536) 
	for i := 0; i < 1536; i++ {
		vec[i] = rng.Float32()*2 - 1.0
	}
	return vec
}

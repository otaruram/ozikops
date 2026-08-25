package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"ozikcarbon-backend/prisma/db"
)

func main() {
	godotenv.Load(".env")
	sumopodURL := os.Getenv("SUMOPOD_URL")
	sumopodKey := os.Getenv("SUMOPOD_API_KEY")

	if sumopodURL == "" || sumopodKey == "" {
		log.Fatal("SUMOPOD_URL or SUMOPOD_API_KEY is not set")
	}

	client := db.NewClient()
	if err := client.Prisma.Connect(); err != nil {
		log.Fatal(err)
	}
	defer client.Prisma.Disconnect()

	ctx := context.Background()

	// Get all laws
	laws, err := client.RegulasiKnowledgeBase.FindMany().Exec(ctx)
	if err != nil {
		log.Fatal(err)
	}

	httpClient := &http.Client{}

	endpoint := strings.TrimSuffix(sumopodURL, "/")
	if strings.HasSuffix(endpoint, "/v1") {
		endpoint = endpoint + "/embeddings"
	} else {
		endpoint = endpoint + "/v1/embeddings"
	}

	for _, law := range laws {
		text := law.RegName + " " + law.Article + " " + law.Content

		reqBody, _ := json.Marshal(map[string]interface{}{
			"model": "text-embedding-3-small",
			"input": text,
		})

		req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewBuffer(reqBody))
		if err != nil {
			log.Printf("Failed to create req for %s: %v", law.ID, err)
			continue
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+sumopodKey)

		resp, err := httpClient.Do(req)
		if err != nil {
			log.Printf("Failed to do req for %s: %v", law.ID, err)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			log.Printf("Embedding failed %s: %s", law.ID, string(body))
			resp.Body.Close()
			continue
		}

		var result struct {
			Data []struct {
				Embedding []float64 `json:"embedding"`
			} `json:"data"`
		}

		json.NewDecoder(resp.Body).Decode(&result)
		resp.Body.Close()

		if len(result.Data) == 0 {
			continue
		}

		embStrBytes, _ := json.Marshal(result.Data[0].Embedding)
		embStr := string(embStrBytes)

		// Update vector using raw query
		rawQuery := fmt.Sprintf(`UPDATE regulasi_knowledge_base SET embedding = '%s'::vector WHERE id = '%s';`, embStr, law.ID)
		err = client.Prisma.QueryRaw(rawQuery).Exec(ctx, &[]map[string]interface{}{})
		if err != nil {
			log.Printf("Failed to update db for %s: %v", law.ID, err)
			continue
		}
		log.Printf("✅ Updated embedding for %s", law.RegName)
	}
}

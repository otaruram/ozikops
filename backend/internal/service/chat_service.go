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
)

// ChatResponse represents the structured AI response for Q&A
type ChatResponse struct {
	Answer     string       `json:"answer"`
	Sources    []ChatSource `json:"sources"`
	RiskLevel  string       `json:"riskLevel"`
	Confidence float64      `json:"confidence"`
}

type ChatSource struct {
	Document     string `json:"document"`
	EquipmentTag string `json:"equipmentTag"`
	DocumentType string `json:"documentType"`
	Excerpt      string `json:"excerpt"`
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatService interface {
	AskQuestion(ctx context.Context, messages []ChatMessage, equipmentTag string) (*ChatResponse, error)
}

type chatService struct {
	ragService RAGService
	sumopodURL string
	apiKey     string
}

func NewChatService(ragService RAGService, sumopodURL, apiKey string) ChatService {
	return &chatService{
		ragService: ragService,
		sumopodURL: sumopodURL,
		apiKey:     apiKey,
	}
}

func (s *chatService) AskQuestion(ctx context.Context, messages []ChatMessage, equipmentTag string) (*ChatResponse, error) {
	if len(messages) == 0 {
		return nil, fmt.Errorf("no messages provided")
	}

	question := messages[len(messages)-1].Content
	// 1. RAG Retrieval — get relevant context from vector database
	var contextLines []string
	var err error

	if equipmentTag != "" {
		contextLines, err = s.ragService.QueryByEquipmentTag(ctx, question, equipmentTag)
	} else {
		contextLines, err = s.ragService.QueryPasalDatabase(ctx, question)
	}

	if err != nil {
		log.Printf("⚠️ RAG retrieval failed for chat: %v", err)
		contextLines = []string{}
	}

	ragContext := "No relevant documents found in the knowledge base."
	if len(contextLines) > 0 {
		ragContext = strings.Join(contextLines, "\n")
	}

	// 2. Build system prompt for Q&A mode
	systemPrompt := fmt.Sprintf(`You are OzikOps AI, a Senior Petrochemical Reliability Assistant at Chandra Asri.
You help field technicians and engineers find trusted technical information instantly.

RETRIEVED KNOWLEDGE BASE CONTEXT:
%s

STRICT RULES:
1. Answer ONLY based on the retrieved context above. If insufficient, say "Insufficient data in knowledge base. Please escalate to Senior Engineer."
2. NEVER fabricate procedures, torque values, pressure ratings, or chemical data.
3. ALWAYS identify the Equipment Tag (e.g., GA-1201A) if mentioned in context.
4. Classify Risk Level: HIGH_RISK (flammable/toxic/confined space/LOTO), MEDIUM_RISK (PPE/vibration/leak), COMPLIANT (routine).
5. Cite the specific OPL or SOP source for each piece of information.

You MUST output ONLY a valid JSON object (no markdown, no explanation):
{
  "answer": "<clear, step-by-step answer to the question>",
  "sources": [
    {
      "document": "<source document name, e.g., OPL-GA-1201A-01>",
      "equipmentTag": "<equipment tag, e.g., GA-1201A>",
      "documentType": "<OPL|Datasheet|Maintenance Log|P&ID>",
      "excerpt": "<relevant excerpt from the source>"
    }
  ],
  "riskLevel": "HIGH_RISK" | "MEDIUM_RISK" | "COMPLIANT",
  "confidence": <number 0.0 to 1.0 based on context relevance>
}`, ragContext)

	// 3. Call LLM directly
	return s.callDirectChat(ctx, systemPrompt, messages, question, contextLines)
}

func (s *chatService) callDirectChat(ctx context.Context, systemPrompt string, history []ChatMessage, question string, contextLines []string) (*ChatResponse, error) {
	if s.apiKey == "" || s.apiKey == "mock-key" {
		return s.fallbackResponse(question, contextLines), nil
	}

	endpoint := strings.TrimSuffix(s.sumopodURL, "/") + "/chat/completions"

	var llmMessages []map[string]string
	llmMessages = append(llmMessages, map[string]string{"role": "system", "content": systemPrompt})
	
	// Add history
	for _, msg := range history {
		llmMessages = append(llmMessages, map[string]string{"role": msg.Role, "content": msg.Content})
	}

	payload := map[string]interface{}{
		"model":       "claude-haiku-4-5",
		"messages":    llmMessages,
		"temperature": 0.1,
		"max_tokens":  4096,
	}

	jsonBody, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return s.fallbackResponse(question, contextLines), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("Sumopod Error %d: %s", resp.StatusCode, string(bodyBytes))
		return s.fallbackResponse(question, contextLines), nil
	}

	var sumopodResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&sumopodResp); err != nil {
		return s.fallbackResponse(question, contextLines), nil
	}

	if len(sumopodResp.Choices) == 0 {
		return s.fallbackResponse(question, contextLines), nil
	}

	rawContent := sumopodResp.Choices[0].Message.Content

	// Parse the JSON block from content
	startIdx := strings.Index(rawContent, "{")
	endIdx := strings.LastIndex(rawContent, "}")
	
	if startIdx != -1 && endIdx != -1 && endIdx > startIdx {
		jsonStr := rawContent[startIdx : endIdx+1]
		var chatResp ChatResponse
		if err := json.Unmarshal([]byte(jsonStr), &chatResp); err == nil {
			if chatResp.Confidence == 0 {
				chatResp.Confidence = 0.85
			}
			return &chatResp, nil
		}
	}

	// Fallback parsing if JSON is broken
	return &ChatResponse{
		Answer: rawContent,
		RiskLevel: "COMPLIANT",
		Confidence: 0.7,
	}, nil
}

func (s *chatService) fallbackResponse(question string, contextLines []string) *ChatResponse {
	answer := "Based on available knowledge base context:\n\n"
	var sources []ChatSource

	if len(contextLines) > 0 {
		for i, line := range contextLines {
			answer += fmt.Sprintf("%d. %s\n\n", i+1, line)
			sources = append(sources, ChatSource{
				Document:     fmt.Sprintf("RAG Result #%d", i+1),
				DocumentType: "Knowledge Base",
				Excerpt:      line,
			})
		}
	} else {
		answer = "Insufficient data in the knowledge base for this query. Please escalate to Senior Engineer for manual verification."
	}

	return &ChatResponse{
		Answer:     answer,
		Sources:    sources,
		RiskLevel:  "COMPLIANT",
		Confidence: 0.5,
	}
}

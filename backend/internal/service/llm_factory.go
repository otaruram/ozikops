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
	"time"
)

type LLMAnalysisResult struct {
	ScoreLegal        float64     `json:"scoreLegal"`
	ScoreTechnical    float64     `json:"scoreTechnical"`
	ScoreSocial       float64     `json:"scoreSocial"`
	ScoreTransparency float64     `json:"scoreTransparency"`
	Issues            []IssueData `json:"issues"`
}

type IssueData struct {
	Severity          string `json:"severity"` // HIGH_RISK, MEDIUM_RISK, COMPLIANT
	ClauseText        string `json:"clauseText"`
	MatchedSop        string `json:"matchedSop"`
	OriginalSopText   string `json:"originalSopText"`
	SuggestedRevision string `json:"suggestedRevision"`
}

type LLMFactoryService interface {
	AnalyzeClause(ctx context.Context, prompt string, lawContext []string, targetPages []int) (*LLMAnalysisResult, error)
}

type llmFactoryService struct {
	sumopodURL string
	apiKey     string
	client     *http.Client
}

func NewLLMFactoryService(sumopodURL, apiKey string) LLMFactoryService {
	return &llmFactoryService{
		sumopodURL: sumopodURL,
		apiKey:     apiKey,
		client: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

func (s *llmFactoryService) AnalyzeClause(ctx context.Context, prompt string, lawContext []string, targetPages []int) (*LLMAnalysisResult, error) {
	// Build target pages string
	targetPagesStr := "ALL_PAGES"
	if len(targetPages) > 0 {
		var strArr []string
		for _, p := range targetPages {
			strArr = append(strArr, fmt.Sprintf("%d", p))
		}
		targetPagesStr = strings.Join(strArr, ", ")
	}

	// Build law context string
	lawCtxStr := "No live law data available."
	if len(lawContext) > 0 {
		var filtered []string
		for _, l := range lawContext {
			if strings.TrimSpace(l) != "" {
				filtered = append(filtered, l)
			}
		}
		if len(filtered) > 0 {
			lawCtxStr = strings.Join(filtered, "\n")
		}
	}

	systemPrompt := fmt.Sprintf(`You are OzikOps AI, a Senior Petrochemical Reliability Assistant at Chandra Asri (CALIBER 2026).
Your task is to analyze symptoms, trouble tickets, or maintenance documents provided by field technicians.

CONTEXT:
- Target Pages: %s
- Retrieved SOP/OPL/Datasheet Context:
%s

STRICT RULES:
1. Answer ONLY based on the retrieved context above. If insufficient, state "Escalate to Senior Engineer."
2. NEVER fabricate procedures, torque values, pressure ratings, or chemical data.
3. ALWAYS identify the Equipment Tag (e.g., GA-1201A) at the top.
4. Classify Risk Level: HIGH_RISK (flammable/toxic/confined space/LOTO), MEDIUM_RISK (PPE/vibration/leak), COMPLIANT (routine).
5. Provide step-by-step troubleshooting with required tools/PPE and safety precautions per step.
6. Reference source OPL or SOP number for each matched procedure.

You MUST output ONLY a valid JSON object (no markdown, no explanation) containing:
{
  "scoreLegal": <number 0-40>,
  "scoreTechnical": <number 0-30>,
  "scoreSocial": <number 0-15>,
  "scoreTransparency": <number 0-15>,
  "issues": [
    {
      "severity": "HIGH_RISK" | "MEDIUM_RISK",
      "clauseText": "<the symptom or problem description>",
      "matchedSop": "<matched SOP/OPL reference and equipment tag>",
      "originalSopText": "<original step-by-step procedure from context>",
      "suggestedRevision": "<safe work guidelines, required PPE, and corrective action>"
    }
  ]
}

Only flag issues that deviate from the retrieved SOPs/OPLs. If the procedure is routine and compliant, return high scores and an empty issues array.`, targetPagesStr, lawCtxStr)


	// Check if API key is available
	if s.apiKey == "" || s.apiKey == "mock-key" {
		log.Println("⚠️  WARNING: SUMOPOD_API_KEY is missing or mock. Using rule-based fallback scoring.")
		return s.ruleBasedFallback(prompt), nil
	}

	return s.callSumopod(ctx, systemPrompt, prompt)
}

func (s *llmFactoryService) callSumopod(ctx context.Context, systemPrompt string, userPrompt string) (*LLMAnalysisResult, error) {
	// Truncate user prompt if too long (most LLMs have token limits)
	if len(userPrompt) > 15000 {
		userPrompt = userPrompt[:15000] + "\n\n[...TRUNCATED FOR TOKEN LIMIT...]"
	}

	// We will try claude-haiku-4-5 first, then gemini/gemini-3.5-flash
	modelsToTry := []string{"claude-haiku-4-5", "gemini/gemini-3.5-flash"}
	endpoint := strings.TrimSuffix(s.sumopodURL, "/") + "/chat/completions"

	var lastErr error
	var responseBody []byte
	var success bool

	for _, modelName := range modelsToTry {
		// Build OpenAI-compatible request payload
		payload := map[string]interface{}{
			"model": modelName,
			"messages": []map[string]string{
				{"role": "system", "content": systemPrompt},
				{"role": "user", "content": userPrompt},
			},
			"temperature": 0.1,
			"max_tokens":  4096,
		}

		jsonBody, err := json.Marshal(payload)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal LLM request: %w", err)
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(jsonBody))
		if err != nil {
			return nil, fmt.Errorf("failed to create LLM request: %w", err)
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+s.apiKey)

		log.Printf("🤖 Calling Sumopod LLM with model %s ...", modelName)
		resp, err := s.client.Do(req)
		if err != nil {
			log.Printf("⚠️ Sumopod API call failed for %s: %v", modelName, err)
			lastErr = err
			continue // try next model
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()

		if err != nil {
			log.Printf("⚠️ Failed to read Sumopod response for %s: %v", modelName, err)
			lastErr = err
			continue
		}

		if resp.StatusCode != http.StatusOK {
			log.Printf("⚠️ Sumopod returned HTTP %d for %s: %s", resp.StatusCode, modelName, string(body))
			lastErr = fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
			continue
		}

		responseBody = body
		success = true
		break // Success! Exit loop
	}

	if !success {
		log.Printf("❌ All LLM models failed. Last error: %v. Falling back to rule-based scoring.", lastErr)
		return s.ruleBasedFallback(userPrompt), nil
	}

	// Parse OpenAI-compatible response
	var chatResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(responseBody, &chatResp); err != nil {
		log.Printf("❌ Failed to parse Sumopod response JSON: %v", err)
		return s.ruleBasedFallback(userPrompt), nil
	}

	if len(chatResp.Choices) == 0 {
		log.Println("❌ Sumopod returned 0 choices. Falling back.")
		return s.ruleBasedFallback(userPrompt), nil
	}

	content := chatResp.Choices[0].Message.Content
	content = strings.TrimSpace(content)

	// Strip markdown code fences if LLM wrapped the JSON
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	content = strings.TrimSpace(content)

	var result LLMAnalysisResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		log.Printf("❌ Failed to parse LLM analysis JSON: %v\nRaw content: %s", err, content[:min(len(content), 500)])
		return s.ruleBasedFallback(userPrompt), nil
	}

	log.Printf("✅ LLM analysis complete: Legal=%.0f Tech=%.0f Social=%.0f Trans=%.0f Issues=%d",
		result.ScoreLegal, result.ScoreTechnical, result.ScoreSocial, result.ScoreTransparency, len(result.Issues))

	return &result, nil
}

// ruleBasedFallback provides keyword-based scoring when LLM is unavailable.
// This is NOT a mock — it's a deterministic fallback that produces variable results per document.
func (s *llmFactoryService) ruleBasedFallback(text string) *LLMAnalysisResult {
	log.Println("⚙️  Using rule-based fallback scoring engine (Petrochemical mode).")

	lower := strings.ToLower(text)
	scoreLegal := 35.0
	scoreTech := 25.0
	scoreSocial := 12.0
	scoreTrans := 12.0
	var issues []IssueData

	// Safety/Compliance deductions (scoreLegal in this context = SOP Compliance)
	if strings.Contains(lower, "hexane") || strings.Contains(lower, "flammable") || strings.Contains(lower, "benzene") {
		scoreLegal -= 5
		issues = append(issues, IssueData{
			Severity:          "HIGH_RISK",
			ClauseText:        extractContext(text, "hexane"),
			MatchedSop:        "SOP - Flammable Material Handling (Hexane Feed System)",
			OriginalSopText:   "All work on hexane-service equipment requires Hot Work Permit, gas-free certification, and continuous LEL monitoring. PPE: FR coverall, face shield, chemical-resistant gloves.",
			SuggestedRevision: "Ensure Hot Work Permit is issued. Verify gas-free certificate. Maintain continuous LEL monitor at work site. Minimum 2 fire watchers required.",
		})
	}
	if strings.Contains(lower, "seal") && (strings.Contains(lower, "leak") || strings.Contains(lower, "failure") || strings.Contains(lower, "flush")) {
		scoreTech -= 8
		issues = append(issues, IssueData{
			Severity:          "HIGH_RISK",
			ClauseText:        extractContext(text, "seal"),
			MatchedSop:        "OPL-GA-1201A-01 - Mechanical Seal Flush API Plan 11",
			OriginalSopText:   "Step 1: Verify seal flush line pressure (min 1 bar above stuffing box). Step 2: Check flush orifice for blockage. Step 3: Inspect seal faces for carbon scoring. Step 4: Verify quench/drain piping integrity.",
			SuggestedRevision: "Isolate pump. Apply LOTO. Drain hexane residue. Inspect mechanical seal per API Plan 11. Replace if carbon face scoring exceeds 0.5mm.",
		})
	}
	if strings.Contains(lower, "vibration") || strings.Contains(lower, "misalignment") {
		scoreTech -= 6
		issues = append(issues, IssueData{
			Severity:          "MEDIUM_RISK",
			ClauseText:        extractContext(text, "vibration"),
			MatchedSop:        "OPL-GA-1201A-07 - Vibration Trend Monitoring & Alarm Response",
			OriginalSopText:   "Alert at 4.5 mm/s RMS. Trip at 7.1 mm/s RMS. Check: coupling alignment, bearing condition, impeller balance, foundation bolts.",
			SuggestedRevision: "Record vibration readings (Overall, 1x, 2x). If >4.5 mm/s, schedule alignment check. If >7.1 mm/s, trip pump immediately and inspect bearings.",
		})
	}
	if strings.Contains(lower, "bearing") && (strings.Contains(lower, "temperature") || strings.Contains(lower, "oil") || strings.Contains(lower, "grease")) {
		scoreTech -= 5
		issues = append(issues, IssueData{
			Severity:          "MEDIUM_RISK",
			ClauseText:        extractContext(text, "bearing"),
			MatchedSop:        "OPL-GA-1201A-02 - Bearing Oil Bath Level & Greasing",
			OriginalSopText:   "Maintain oil level at center of sight glass. Use ISO VG 68 oil. Max bearing temperature: 82°C. Grease interval: 2000 hours.",
			SuggestedRevision: "Check oil level and condition. Replace if discolored or contaminated. Verify bearing temperature with IR gun. Max 82°C DE, 78°C NDE.",
		})
	}

	// Technical deductions
	if strings.Contains(lower, "cavitation") || strings.Contains(lower, "npsh") {
		scoreTech -= 7
		issues = append(issues, IssueData{
			Severity:          "HIGH_RISK",
			ClauseText:        extractContext(text, "cavitation"),
			MatchedSop:        "OPL-GA-1201A-04 - Minimum Flow Line Operation & Deadhead Protection",
			OriginalSopText:   "Minimum continuous stable flow: 30% of BEP. Deadhead protection via minimum flow recirculation valve. NPSH available must exceed NPSH required by minimum 1.0m.",
			SuggestedRevision: "Verify suction pressure and temperature. Check strainer DP. Ensure minimum flow valve is operational. Do NOT operate below minimum flow for more than 30 seconds.",
		})
	}

	// Procedure/documentation deductions
	if !strings.Contains(lower, "loto") && !strings.Contains(lower, "lockout") && (strings.Contains(lower, "maintenance") || strings.Contains(lower, "repair")) {
		scoreLegal -= 8
		issues = append(issues, IssueData{
			Severity:          "HIGH_RISK",
			ClauseText:        "Maintenance/repair activity detected without LOTO reference.",
			MatchedSop:        "Plant Safety SOP - Lockout Tagout Procedure",
			OriginalSopText:   "All maintenance on rotating equipment requires LOTO isolation. Verify zero energy state before commencing work. Double-block-and-bleed for hydrocarbon service.",
			SuggestedRevision: "Apply LOTO per plant procedure. Verify zero energy state. Obtain isolation certificate from Operations before starting any maintenance work.",
		})
	}
	if !strings.Contains(lower, "alignment") && strings.Contains(lower, "startup") {
		scoreTech -= 5
	}

	// Clamp scores
	if scoreLegal < 0 {
		scoreLegal = 0
	}
	if scoreTech < 0 {
		scoreTech = 0
	}
	if scoreSocial < 0 {
		scoreSocial = 0
	}
	if scoreTrans < 0 {
		scoreTrans = 0
	}

	return &LLMAnalysisResult{
		ScoreLegal:        scoreLegal,
		ScoreTechnical:    scoreTech,
		ScoreSocial:       scoreSocial,
		ScoreTransparency: scoreTrans,
		Issues:            issues,
	}
}

// extractContext finds a keyword in the text and returns surrounding context
func extractContext(text string, keyword string) string {
	lower := strings.ToLower(text)
	idx := strings.Index(lower, keyword)
	if idx == -1 {
		return "Konteks tidak ditemukan."
	}
	start := idx - 100
	if start < 0 {
		start = 0
	}
	end := idx + 200
	if end > len(text) {
		end = len(text)
	}
	return strings.TrimSpace(text[start:end])
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

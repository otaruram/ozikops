package service

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

type ScoringEngineService interface {
	CalculateFeasibility(legal float64, tech float64, social float64, trans float64) (float64, string)
	GenerateHMACBadge(auditID string, score float64) string
}

type scoringEngineService struct {
	hmacSecret string
}

func NewScoringEngineService() ScoringEngineService {
	return &scoringEngineService{
		hmacSecret: "oziksustain_super_secret_salt",
	}
}

func (s *scoringEngineService) CalculateFeasibility(legal float64, tech float64, social float64, trans float64) (float64, string) {
	if legal > 40 {
		legal = 40
	}
	if tech > 30 {
		tech = 30
	}
	if social > 15 {
		social = 15
	}
	if trans > 15 {
		trans = 15
	}

	total := legal + tech + social + trans
	if total > 100 {
		total = 100
	}
	if total < 0 {
		total = 0
	}

	status := "COMPLIANT"
	if total < 80 && total >= 60 {
		status = "MEDIUM_RISK"
	} else if total < 60 {
		status = "HIGH_RISK"
	}

	return total, status
}

func (s *scoringEngineService) GenerateHMACBadge(auditID string, score float64) string {
	payload := fmt.Sprintf("%s:%f", auditID, score)
	mac := hmac.New(sha256.New, []byte(s.hmacSecret))
	mac.Write([]byte(payload))
	return hex.EncodeToString(mac.Sum(nil))
}

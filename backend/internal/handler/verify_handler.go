package handler

import (
	"ozikcarbon-backend/domain"
	"ozikcarbon-backend/internal/repository"
	"ozikcarbon-backend/internal/service"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type VerifyHandler struct {
	auditRepo     repository.AuditRepository
	scoringEngine service.ScoringEngineService
}

func NewVerifyHandler(auditRepo repository.AuditRepository, scoringEngine service.ScoringEngineService) *VerifyHandler {
	return &VerifyHandler{auditRepo: auditRepo, scoringEngine: scoringEngine}
}

// GetVerification handles GET /api/v1/verify/:hash_or_id
// Public endpoint for QR Badge scanning and cryptographic verification
func (h *VerifyHandler) GetVerification(c *fiber.Ctx) error {
	idOrHash := c.Params("hash_or_id")
	if idOrHash == "" {
		return c.Status(fiber.StatusBadRequest).JSON(domain.ErrorResponse{
			Error: "Missing ID or Hash",
		})
	}

	audit, err := h.auditRepo.GetAuditByIDOrHash(c.Context(), idOrHash)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(domain.ErrorResponse{
			Error:   "BADGE_NOT_FOUND",
			Message: "Lencana verifikasi tidak ditemukan atau tidak valid.",
		})
	}

	// 1. INTEGRITY CHECK
	// Recalculate score and hash using EXACT logic/salt
	totalScore, _ := h.scoringEngine.CalculateFeasibility(audit.ScoreLegal, audit.ScoreTechnical, audit.ScoreSocial, audit.ScoreTransparency)
	recalculatedHash := h.scoringEngine.GenerateHMACBadge(audit.ID, totalScore)

	// 2. Compare hashes
	if audit.SHA256Hash != recalculatedHash && !strings.HasPrefix(audit.SHA256Hash, "no_badge_") {
		// DATA TAMPERED! Revoke instantly.
		h.auditRepo.UpdateAuditStatus(c.Context(), audit.ID, "INVALID")

		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"valid":   false,
			"error":   "DATA_TAMPERED",
			"message": "Data audit ini telah dimanipulasi. Verifikasi dicabut secara permanen.",
		})
	}

	return c.Status(fiber.StatusOK).JSON(domain.PublicVerifyResponse{
		EquipmentName:       audit.EquipmentName,
		FeasibilityScore:  audit.FeasibilityScore,
		ScoreLegal:        audit.ScoreLegal,
		ScoreTechnical:    audit.ScoreTechnical,
		ScoreSocial:       audit.ScoreSocial,
		ScoreTransparency: audit.ScoreTransparency,
		Status:            audit.Status,
		AuthorName:        audit.AuthorName,
		AuthorEmail:       audit.AuthorEmail,
		AuditDate:         audit.CreatedAt,
		SHA256Hash:        audit.SHA256Hash,
		IntegrityHash:     "SHA256:" + audit.SHA256Hash,
	})
}

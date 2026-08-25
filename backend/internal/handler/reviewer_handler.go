package handler

import (
	"ozikcarbon-backend/internal/repository"
	"ozikcarbon-backend/prisma/db"

	"github.com/gofiber/fiber/v2"
)

type ReviewerHandler struct {
	auditRepo repository.AuditRepository
}

func NewReviewerHandler(auditRepo repository.AuditRepository) *ReviewerHandler {
	return &ReviewerHandler{
		auditRepo: auditRepo,
	}
}

func (h *ReviewerHandler) GetQueue(c *fiber.Ctx) error {
	audits, err := h.auditRepo.GetPendingAudits(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch review queue",
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"audits": audits,
	})
}

func (h *ReviewerHandler) SubmitReview(c *fiber.Ctx) error {
	auditID := c.Params("id")
	userID := c.Locals("userId").(string)

	type Req struct {
		Verdict  string `json:"verdict"` // APPROVED, REJECTED, NEEDS_REVISION
		Feedback string `json:"feedback"`
	}

	var body Req
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid body"})
	}

	var dbStatus db.ReviewStatus
	switch body.Verdict {
	case "APPROVED":
		dbStatus = db.ReviewStatusApproved
	case "REJECTED":
		dbStatus = db.ReviewStatusRejected
	case "NEEDS_REVISION":
		dbStatus = db.ReviewStatusNeedsRevision
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid verdict"})
	}

	err := h.auditRepo.UpdateReviewStatus(c.Context(), auditID, userID, dbStatus, body.Feedback)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update review status"})
	}

	// Update badge status if approved or rejected
	if dbStatus == db.ReviewStatusApproved {
		_ = h.auditRepo.UpdateAuditStatus(c.Context(), auditID, string(db.BadgeStatusActive))
	} else if dbStatus == db.ReviewStatusRejected {
		_ = h.auditRepo.UpdateAuditStatus(c.Context(), auditID, string(db.BadgeStatusInvalid))
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Review submitted successfully"})
}

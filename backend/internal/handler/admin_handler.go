package handler

import (
	"github.com/gofiber/fiber/v2"
	"ozikcarbon-backend/internal/repository"
)

type AdminHandler struct {
	userRepo  repository.UserRepository
	auditRepo repository.AuditRepository
}

func NewAdminHandler(userRepo repository.UserRepository, auditRepo repository.AuditRepository) *AdminHandler {
	return &AdminHandler{
		userRepo:  userRepo,
		auditRepo: auditRepo,
	}
}

func (h *AdminHandler) GetAllUsers(c *fiber.Ctx) error {
	users, err := h.userRepo.GetAllUsers(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch users",
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"users": users,
	})
}

func (h *AdminHandler) UpdateUserCredits(c *fiber.Ctx) error {
	id := c.Params("id")
	type Req struct {
		Credits int `json:"credits"`
	}
	var body Req
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid body"})
	}

	user, err := h.userRepo.GetByID(c.Context(), id)
	if err != nil || user == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	err = h.userRepo.UpdateUserStatus(c.Context(), id, body.Credits, user.IsBanned, user.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update credits"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Credits updated successfully"})
}

func (h *AdminHandler) ToggleBanUser(c *fiber.Ctx) error {
	id := c.Params("id")
	type Req struct {
		IsBanned bool `json:"isBanned"`
	}
	var body Req
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid body"})
	}

	user, err := h.userRepo.GetByID(c.Context(), id)
	if err != nil || user == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	err = h.userRepo.UpdateUserStatus(c.Context(), id, user.CreditsBalance, body.IsBanned, user.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update ban status"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Ban status updated successfully"})
}

func (h *AdminHandler) UpdateUserRole(c *fiber.Ctx) error {
	id := c.Params("id")
	type Req struct {
		Role string `json:"role"`
	}
	var body Req
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid body"})
	}

	user, err := h.userRepo.GetByID(c.Context(), id)
	if err != nil || user == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	err = h.userRepo.UpdateUserStatus(c.Context(), id, user.CreditsBalance, user.IsBanned, body.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update role"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Role updated successfully"})
}

func (h *AdminHandler) GetUserHistory(c *fiber.Ctx) error {
	id := c.Params("id")
	audits, err := h.auditRepo.GetAuditsByUserID(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch user history",
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"history": audits,
	})
}

func (h *AdminHandler) MicroApprove(c *fiber.Ctx) error {
	id := c.Params("id")
	
	// Simply update the review status to APPROVED and add a dummy mock sha256
	mockSha256 := "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
	err := h.auditRepo.UpdateMicroApprove(c.Context(), id, mockSha256)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to micro-approve audit"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Micro-Approve successful",
		"sha256Hash": mockSha256,
	})
}


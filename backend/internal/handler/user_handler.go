package handler

import (
	"crypto/rand"
	"encoding/hex"
	"ozikcarbon-backend/config"
	"ozikcarbon-backend/domain"
	"ozikcarbon-backend/internal/repository"

	"github.com/gofiber/fiber/v2"
)

type UserHandler struct {
	userRepo repository.UserRepository
	cfg      *config.Config
}

func NewUserHandler(userRepo repository.UserRepository, cfg *config.Config) *UserHandler {
	return &UserHandler{userRepo: userRepo, cfg: cfg}
}

// GetMe returns the authenticated user's profile
// GET /api/v1/user/me
func (h *UserHandler) GetMe(c *fiber.Ctx) error {
	userID := c.Locals("userId")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.ErrorResponse{
			Error: "UNAUTHORIZED",
		})
	}

	uid := userID.(string)
	user, err := h.userRepo.GetByID(c.Context(), uid)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(domain.ErrorResponse{
			Error:   "USER_NOT_FOUND",
			Message: "Akun pengguna tidak ditemukan.",
		})
	}

	credits := user.CreditsBalance

	// Check Admin Bypass for unlimited credits
	if userEmail := c.Locals("userEmail"); userEmail != nil {
		emailStr := userEmail.(string)
		for _, admin := range h.cfg.AdminEmails {
			if admin != "" && emailStr == admin {
				credits = 999999 // Unlimited credits for UI
				break
			}
		}
	}

	return c.Status(fiber.StatusOK).JSON(domain.UserMeResponse{
		ID:               user.ID,
		Email:            user.Email,
		Name:             user.Name,
		AvatarURL:        user.AvatarURL,
		Company:          user.Company,
		Provider:         user.Provider,
		CreditsBalance:   credits,
		APIKey:           user.APIKey,
		NotifyReportDone: user.NotifyReportDone,
		NotifyRegulation: user.NotifyRegulation,
	})
}

// UpdateMe updates the authenticated user's profile
// PUT /api/v1/user/me
func (h *UserHandler) UpdateMe(c *fiber.Ctx) error {
	userID := c.Locals("userId")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.ErrorResponse{
			Error: "UNAUTHORIZED",
		})
	}

	uid := userID.(string)

	var req domain.UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.ErrorResponse{
			Error: "Invalid request payload",
		})
	}

	updated, err := h.userRepo.UpdateProfile(c.Context(), uid, &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.ErrorResponse{
			Error: "UPDATE_FAILED",
		})
	}

	return c.Status(fiber.StatusOK).JSON(updated)
}

// RegenerateAPIKey POST /api/v1/user/api-key/regenerate
func (h *UserHandler) RegenerateAPIKey(c *fiber.Ctx) error {
	userID := c.Locals("userId")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.ErrorResponse{
			Error: "UNAUTHORIZED",
		})
	}
	uid := userID.(string)

	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.ErrorResponse{
			Error: "GENERATION_FAILED",
		})
	}

	newKey := "ozik_live_" + hex.EncodeToString(bytes)

	err := h.userRepo.UpdateAPIKey(c.Context(), uid, newKey)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.ErrorResponse{
			Error: "UPDATE_FAILED",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"apiKey": newKey,
	})
}

// UpdateNotifications PUT /api/v1/user/me/notifications
func (h *UserHandler) UpdateNotifications(c *fiber.Ctx) error {
	userID := c.Locals("userId")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.ErrorResponse{
			Error: "UNAUTHORIZED",
		})
	}
	uid := userID.(string)

	var req domain.UpdateNotificationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.ErrorResponse{
			Error: "Invalid request payload",
		})
	}

	err := h.userRepo.UpdateNotifications(c.Context(), uid, &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.ErrorResponse{
			Error: "UPDATE_FAILED",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Preferensi notifikasi berhasil diperbarui",
	})
}


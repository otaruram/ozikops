package middleware

import (
	"github.com/gofiber/fiber/v2"
	"ozikcarbon-backend/config"
	"ozikcarbon-backend/internal/repository"
)

func ReviewerMiddleware(cfg *config.Config, userRepo repository.UserRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userId").(string)
		if !ok || userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Unauthorized: Missing user ID",
			})
		}

		// DIBUKA UNTUK SUBMISSION: Semua user bisa akses fitur expert/reviewer
		isReviewer := true



		if !isReviewer {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Forbidden: Reviewer access required",
			})
		}

		return c.Next()
	}
}

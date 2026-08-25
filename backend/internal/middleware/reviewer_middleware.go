package middleware

import (
	"strings"

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

		userEmail, ok := c.Locals("userEmail").(string)
		if !ok {
			userEmail = ""
		}

		// Bootstrap admin check: If email is in ADMIN_EMAILS, they are also a reviewer
		isReviewer := false
		if len(cfg.AdminEmails) > 0 {
			for _, email := range cfg.AdminEmails {
				if strings.TrimSpace(email) == userEmail {
					isReviewer = true
					break
				}
			}
		}

		if !isReviewer {
			user, err := userRepo.GetByID(c.Context(), userID)
			if err == nil && user != nil {
				if user.Role == "ADMIN" || user.Role == "senior_engineer" {
					isReviewer = true
				}
			}
		}



		if !isReviewer {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Forbidden: Reviewer access required",
			})
		}

		return c.Next()
	}
}

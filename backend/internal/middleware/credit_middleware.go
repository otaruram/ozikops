package middleware

import (
	"ozikcarbon-backend/config"
	"ozikcarbon-backend/domain"
	"ozikcarbon-backend/internal/repository"

	"github.com/gofiber/fiber/v2"
)

// CreditMiddleware checks if user has sufficient credits before processing full audit.
// Returns HTTP 402 Payment Required if credits are exhausted.
func CreditMiddleware(userRepo repository.UserRepository, cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("userId")
		if userID == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(domain.ErrorResponse{
				Error:   "UNAUTHORIZED",
				Message: "Sesi tidak valid. Silakan login ulang.",
			})
		}

		uid, ok := userID.(string)
		if !ok || uid == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(domain.ErrorResponse{
				Error: "INVALID_SESSION",
			})
		}

		// Check Admin Bypass
		if userEmail := c.Locals("userEmail"); userEmail != nil {
			emailStr := userEmail.(string)
			for _, admin := range cfg.AdminEmails {
				if admin != "" && emailStr == admin {
					return c.Next() // Admin unlimited credits
				}
			}
		}

		balance, err := userRepo.GetCreditsBalance(c.Context(), uid)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(domain.ErrorResponse{
				Error: "DB_ERROR",
			})
		}

		if balance <= 0 {
			return c.Status(fiber.StatusPaymentRequired).JSON(domain.ErrorResponse{
				Error:   "INSUFFICIENT_CREDITS",
				Message: "Kredit audit Anda habis. Silakan top up atau upgrade ke B2B Eco-Basic.",
			})
		}

		// Credits available — proceed to handler
		return c.Next()
	}
}

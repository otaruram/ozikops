package handler

import (
	"ozikcarbon-backend/prisma/db"
	"time"

	"github.com/gofiber/fiber/v2"
)

// HealthHandler handles health-check and keep-alive endpoints.
type HealthHandler struct {
	client *db.PrismaClient
}

// NewHealthHandler creates a new HealthHandler with Prisma client dependency.
func NewHealthHandler(client *db.PrismaClient) *HealthHandler {
	return &HealthHandler{client: client}
}

// KeepAlive handles GET /api/keep-alive
// It runs a lightweight query against Supabase (PostgreSQL)
// to prevent the database from pausing due to inactivity,
// and simultaneously keeps the Render service awake.
func (h *HealthHandler) KeepAlive(c *fiber.Ctx) error {
	start := time.Now()

	// Run the lightest possible query to trigger DB activity
	// Uses FindFirst on User model since Prisma Client Go v0.47
	// does not expose a top-level QueryRaw method.
	_, err := h.client.User.FindFirst().Exec(c.Context())
	if err != nil && err != db.ErrNotFound {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"status":  "error",
			"message": "Database ping failed",
			"error":   err.Error(),
		})
	}

	elapsed := time.Since(start)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":    "alive",
		"service":   "OzikOps API",
		"db_ping":   "ok",
		"latency":   elapsed.String(),
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

package handler

import (
	"ozikcarbon-backend/internal/service"

	"github.com/gofiber/fiber/v2"
)

type RegulasiHandler struct {
	regulasiService service.RegulasiService
}

func NewRegulasiHandler(regulasiService service.RegulasiService) *RegulasiHandler {
	return &RegulasiHandler{
		regulasiService: regulasiService,
	}
}

func (h *RegulasiHandler) SearchRegulasi(c *fiber.Ctx) error {
	query := c.Query("q")
	if query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Query parameter 'q' is required"})
	}

	results, err := h.regulasiService.Search(c.Context(), query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to search regulasi: " + err.Error()})
	}

	return c.JSON(results)
}

func (h *RegulasiHandler) GetRecommendations(c *fiber.Ctx) error {
	userID := c.Locals("userID")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	userIDStr := userID.(string)

	results, err := h.regulasiService.GetRecommendations(c.Context(), userIDStr)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get recommendations: " + err.Error()})
	}

	return c.JSON(results)
}

func (h *RegulasiHandler) AddSOP(c *fiber.Ctx) error {
	var body struct {
		Title     string `json:"title"`
		Risk      string `json:"risk"`
		DriveLink string `json:"driveLink"`
		Content   string `json:"content"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid body"})
	}

	err := h.regulasiService.AddSOP(c.Context(), body.Title, body.Risk, body.DriveLink, body.Content)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to add SOP: " + err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "SOP added successfully"})
}

func (h *RegulasiHandler) GetSOPs(c *fiber.Ctx) error {
	results, err := h.regulasiService.GetSOPs(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get SOPs: " + err.Error()})
	}
	return c.JSON(fiber.Map{"sops": results})
}

func (h *RegulasiHandler) DeleteSOP(c *fiber.Ctx) error {
	id := c.Params("id")
	err := h.regulasiService.DeleteSOP(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete SOP: " + err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "SOP deleted successfully"})
}

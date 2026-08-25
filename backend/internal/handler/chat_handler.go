package handler

import (
	"ozikcarbon-backend/internal/service"

	"github.com/gofiber/fiber/v2"
)

type ChatHandler struct {
	chatService service.ChatService
}

func NewChatHandler(chatService service.ChatService) *ChatHandler {
	return &ChatHandler{
		chatService: chatService,
	}
}

type ChatRequest struct {
	Messages     []service.ChatMessage `json:"messages"`
	EquipmentTag string                `json:"equipmentTag"`
}

// HandleChat handles POST /api/v1/chat (Protected)
func (h *ChatHandler) HandleChat(c *fiber.Ctx) error {
	var req ChatRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "INVALID_REQUEST",
			"message": "Please provide a valid question.",
		})
	}

	if len(req.Messages) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "EMPTY_QUESTION",
			"message": "Question cannot be empty.",
		})
	}

	result, err := h.chatService.AskQuestion(c.Context(), req.Messages, req.EquipmentTag)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "CHAT_FAILED",
			"message": "Failed to process your question. Please try again.",
		})
	}

	return c.Status(fiber.StatusOK).JSON(result)
}

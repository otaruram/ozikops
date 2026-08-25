package handler

import (
	"ozikcarbon-backend/domain"
	"ozikcarbon-backend/internal/repository"
	"ozikcarbon-backend/internal/service"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type AuditHandler struct {
	auditService   service.AuditService
	auditRepo      repository.AuditRepository
	userRepo       repository.UserRepository
	documentParser service.DocumentParserService
	emailService   service.EmailService
}

func NewAuditHandler(
	auditService service.AuditService,
	auditRepo repository.AuditRepository,
	userRepo repository.UserRepository,
	documentParser service.DocumentParserService,
	emailService service.EmailService,
) *AuditHandler {
	return &AuditHandler{
		auditService:   auditService,
		auditRepo:      auditRepo,
		userRepo:       userRepo,
		documentParser: documentParser,
		emailService:   emailService,
	}
}

// ProcessAudit handles POST /api/v1/audit/full-process (Protected, Credit-gated)
func (h *AuditHandler) ProcessAudit(c *fiber.Ctx) error {
	fileHeader, err := c.FormFile("document")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(domain.ErrorResponse{
			Error:   "MISSING_DOCUMENT",
			Message: "Please upload a PDF/DOCX/TXT document.",
		})
	}

	projectName := c.FormValue("projectName")
	if projectName == "" {
		projectName = fileHeader.Filename
	}

	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.ErrorResponse{
			Error: "FILE_READ_ERROR",
		})
	}
	defer file.Close()

	pageMode := c.FormValue("page_mode")
	customRange := c.FormValue("custom_range")

	var text string
	var targetPages []int
	if strings.HasSuffix(strings.ToLower(fileHeader.Filename), ".pdf") {
		// Save temporarily
		c.SaveFile(fileHeader, "./temp.pdf")

		extractedText, parsedPages, err := h.documentParser.ExtractTargetPages("./temp.pdf", pageMode, customRange)
		if err == nil {
			text = extractedText
			targetPages = parsedPages
		} else {
			// Fallback
			text = "DOCUMENT_UNREADABLE\n\nThe system failed to extract text from your document. This usually happens when the PDF is a scanned image or is locked. Please ensure your document contains selectable text for OzikOps AI to perform analysis."
		}
	} else {
		buf := make([]byte, fileHeader.Size)
		_, _ = file.Read(buf)
		text = string(buf)
	}

	if len(text) < 10 {
		text = "DOCUMENT_UNREADABLE\n\nThe system failed to extract text from your document. This usually happens when the PDF is a scanned image or is locked. Please ensure your document contains selectable text for OzikOps AI to perform analysis."
	}

	req := domain.ProcessAuditRequest{
		EquipmentName: projectName,
		PDDText:     text,
		TargetPages: targetPages,
	}

	userID := c.Locals("userId")
	if userID != nil {
		req.UserID = userID.(string)
	}

	res, err := h.auditService.ProcessAudit(c.Context(), &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.ErrorResponse{
			Error: err.Error(),
		})
	}

	if userID != nil {
		uid := userID.(string)
		err = h.userRepo.DeductCredit(c.Context(), uid)
		if err != nil {
			// Even if deduction fails, we might still want to return the result, but log it
			// Or fail it. We will just proceed since generation succeeded.
		}

		// Trigger Email if preferences allow
		user, errUser := h.userRepo.GetByID(c.Context(), uid)
		if errUser == nil && user.NotifyReportDone && h.emailService != nil {
			go h.emailService.SendReportDoneEmail(user.Email, user.Name, req.EquipmentName, res.Status)
		}
	}

	return c.Status(fiber.StatusOK).JSON(res)
}

// GetHistory handles GET /api/v1/audit/history (Protected)
func (h *AuditHandler) GetHistory(c *fiber.Ctx) error {
	userID := c.Locals("userId")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.ErrorResponse{
			Error: "UNAUTHORIZED",
		})
	}

	uid := userID.(string)
	audits, err := h.auditRepo.GetAuditsByUserID(c.Context(), uid)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.ErrorResponse{
			Error: "FETCH_ERROR",
		})
	}

	return c.Status(fiber.StatusOK).JSON(domain.AuditHistoryResponse{
		Audits:     audits,
		TotalCount: len(audits),
	})
}

// GetAuditDetail handles GET /api/v1/audit/:id (Protected)
func (h *AuditHandler) GetAuditDetail(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(domain.ErrorResponse{
			Error: "Missing audit ID",
		})
	}

	audit, err := h.auditRepo.GetAuditByID(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(domain.ErrorResponse{
			Error:   "AUDIT_NOT_FOUND",
			Message: "Assessment data not found.",
		})
	}

	return c.Status(fiber.StatusOK).JSON(audit)
}

// DeleteAudit handles DELETE /api/v1/audit/:id (Protected)
func (h *AuditHandler) DeleteAudit(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(domain.ErrorResponse{
			Error: "Missing audit ID",
		})
	}

	userID := c.Locals("userId")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(domain.ErrorResponse{
			Error: "UNAUTHORIZED",
		})
	}
	uid := userID.(string)

	err := h.auditRepo.DeleteAudit(c.Context(), id, uid)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(domain.ErrorResponse{
			Error: "DELETE_FAILED",
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

package main

import (
	"log"
	"ozikcarbon-backend/config"
	"ozikcarbon-backend/internal/handler"
	"ozikcarbon-backend/internal/middleware"
	"ozikcarbon-backend/internal/repository"
	"ozikcarbon-backend/internal/service"
	"ozikcarbon-backend/prisma/db"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
	// 1. Load Config
	cfg := config.LoadConfig()

	// 1.5 Prisma DB Client
	client := db.NewClient()
	if err := client.Prisma.Connect(); err != nil {
		log.Fatalf("Prisma DB Connection failed: %v", err)
	}
	defer func() {
		if err := client.Prisma.Disconnect(); err != nil {
			panic(err)
		}
	}()

	// 2. Repositories (DI)
	auditRepo := repository.NewAuditRepository(client)
	userRepo := repository.NewUserRepository(client)

	// 3. Services (DI)
	emailService := service.NewEmailService(cfg)
	piiMasker := service.NewPIIMaskerService()
	pasalID := service.NewPasalIdService()
	llmFactory := service.NewLLMFactoryService(cfg.SumopodURL, cfg.SumopodKey)
	scoringEngine := service.NewScoringEngineService()
	documentParser := service.NewDocumentParserService()
	regulasiService := service.NewRegulasiService(client, auditRepo, cfg.SumopodURL, cfg.SumopodKey)
	
	// pgvector RAG Dependencies
	embeddingService := service.NewEmbeddingService(cfg.SumopodURL, cfg.SumopodKey)
	ragService := service.NewRAGService(client, embeddingService)

	auditService := service.NewAuditService(auditRepo, userRepo, piiMasker, pasalID, llmFactory, scoringEngine, ragService)
	chatService := service.NewChatService(ragService, cfg.SumopodURL, cfg.SumopodKey)

	// 4. Handlers (DI)
	auditHandler := handler.NewAuditHandler(auditService, auditRepo, userRepo, documentParser, emailService)
	verifyHandler := handler.NewVerifyHandler(auditRepo, scoringEngine)
	adminHandler := handler.NewAdminHandler(userRepo, auditRepo)
	userHandler := handler.NewUserHandler(userRepo, cfg)
	regulasiHandler := handler.NewRegulasiHandler(regulasiService)
	freeAuditHandler := handler.NewFreeAuditHandler(piiMasker, pasalID, llmFactory, scoringEngine)
	freeAuditHandler.SetAuditService(auditService)
	reviewerHandler := handler.NewReviewerHandler(auditRepo)
	chatHandler := handler.NewChatHandler(chatService)

	// 5. Fiber App Init
	app := fiber.New(fiber.Config{
		AppName: "OzikOps API v1.0",
	})

	// 6. Global Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "http://localhost:8081, http://localhost:3000, http://localhost:3003, https://ozikops.vercel.app, https://ozikops.biz.id, https://www.ozikops.biz.id",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
	}))

	// 7. Routes
	v1 := app.Group("/api/v1")

	// === Public Routes (No Auth) ===
	v1.Post("/audit/guest-teaser", freeAuditHandler.GuestTeaser)
	v1.Get("/verify/:hash_or_id", verifyHandler.GetVerification)
	v1.Get("/regulasi/search", regulasiHandler.SearchRegulasi)

	// === Protected Routes (Supabase JWT) ===
	protected := v1.Group("", middleware.SupabaseAuthMiddleware(cfg, userRepo, emailService))

	// Regulasi Personalization
	protected.Get("/regulasi/recommendations", regulasiHandler.GetRecommendations)
	protected.Post("/sop", regulasiHandler.AddSOP)
	protected.Get("/sop", regulasiHandler.GetSOPs)
	protected.Delete("/sop/:id", regulasiHandler.DeleteSOP)

	// User Profile
	protected.Get("/user/me", userHandler.GetMe)
	protected.Put("/user/me", userHandler.UpdateMe)
	protected.Put("/user/me/notifications", userHandler.UpdateNotifications)
	protected.Post("/user/api-key/regenerate", userHandler.RegenerateAPIKey)

	// AI Chat (Q&A Assistant)
	protected.Post("/chat", chatHandler.HandleChat)


	// Audit (Credit-gated for full process)
	protected.Post("/audit/full-process", middleware.CreditMiddleware(userRepo, cfg), auditHandler.ProcessAudit)

	// Audit History & Detail (Protected, no credit needed)
	protected.Get("/audit/history", auditHandler.GetHistory)
	protected.Get("/audit/:id", auditHandler.GetAuditDetail)
	protected.Delete("/audit/:id", auditHandler.DeleteAudit)

	// Admin Routes
	admin := v1.Group("/admin", middleware.SupabaseAuthMiddleware(cfg, userRepo, emailService), middleware.AdminMiddleware(cfg, userRepo))
	admin.Get("/users", adminHandler.GetAllUsers)
	admin.Put("/users/:id/credits", adminHandler.UpdateUserCredits)
	admin.Put("/users/:id/ban", adminHandler.ToggleBanUser)
	admin.Put("/users/:id/role", adminHandler.UpdateUserRole)
	admin.Get("/users/:id/history", adminHandler.GetUserHistory)

	// Reviewer Routes
	reviewer := v1.Group("/reviewer", middleware.SupabaseAuthMiddleware(cfg, userRepo, emailService), middleware.ReviewerMiddleware(cfg, userRepo))
	reviewer.Get("/queue", reviewerHandler.GetQueue)
	reviewer.Put("/audit/:id/review", reviewerHandler.SubmitReview)

	// 8. Health Check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "OzikOps API"})
	})

	// 9. Start Server
	log.Printf("🚀 OzikOps API starting on port %s", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}

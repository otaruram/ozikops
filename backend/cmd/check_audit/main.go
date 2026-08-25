package main

import (
	"context"
	"fmt"
	"github.com/joho/godotenv"
	"ozikcarbon-backend/prisma/db"
)

func main() {
	godotenv.Load(".env")
	client := db.NewClient()
	if err := client.Prisma.Connect(); err != nil {
		panic(err)
	}
	defer client.Prisma.Disconnect()

	audit, err := client.ProjectAudit.FindUnique(
		db.ProjectAudit.ID.Equals("OZK-4B3DA32F"),
	).Exec(context.Background())
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Printf("ID: %s\n", audit.ID)
	fmt.Printf("FeasibilityScore: %f\n", audit.FeasibilityScore)
	fmt.Printf("ScoreLegal: %f\n", audit.ScoreLegal)
	fmt.Printf("ScoreTechnical: %f\n", audit.ScoreTechnical)
	fmt.Printf("ScoreSocial: %f\n", audit.ScoreSocial)
	fmt.Printf("ScoreTransparency: %f\n", audit.ScoreTransparency)
	fmt.Printf("SHA256Hash: %s\n", audit.Sha256Hash)
}

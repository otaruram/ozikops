package main

import (
	"context"
	"log"
	"ozikcarbon-backend/prisma/db"
)

func main() {
	log.Println("🚨 Initiating HARD RESET: Deleting all users...")
	
	client := db.NewClient()
	if err := client.Prisma.Connect(); err != nil {
		log.Fatalf("❌ DB Connect failed: %v", err)
	}
	defer client.Prisma.Disconnect()

	// Delete all users. Cascade will delete audits and issues.
	deleted, err := client.User.FindMany().Delete().Exec(context.Background())
	if err != nil {
		log.Fatalf("❌ Failed to delete users: %v", err)
	}

	log.Printf("✅ Hard reset complete. Deleted %d users and all their associated data.", deleted.Count)
}

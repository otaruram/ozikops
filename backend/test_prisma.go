package main
import (
	"context"
	"fmt"
	"log"
	"ozikcarbon-backend/prisma/db"
)
func main() {
	client := db.NewClient()
	if err := client.Prisma.Connect(); err != nil {
		log.Fatalf("failed: %v", err)
	}
	defer client.Prisma.Disconnect()
	audits, _ := client.ProjectAudit.FindMany().Exec(context.Background())
	for _, a := range audits {
		fmt.Printf("ID: %s\n", a.ID)
	}
}

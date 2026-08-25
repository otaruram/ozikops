//go:build ignore

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
		log.Fatal(err)
	}
	defer client.Prisma.Disconnect()

	var results []map[string]interface{}
	err := client.Prisma.QueryRaw(`
		SELECT id, "regName", article, content, "riskCategory"
		FROM regulasi_knowledge_base 
		LIMIT 1;
	`).Exec(context.Background(), &results)
	if err != nil {
		log.Fatal("Query failed:", err)
	}
	fmt.Printf("Results: %+v\n", results)
}

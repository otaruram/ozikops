package keepalive

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"ozikcarbon-backend/prisma/db"
	"time"
)

const (
	pingInterval = 10 * time.Minute
	httpTimeout  = 15 * time.Second
)

// Start launches a background goroutine that automatically:
//  1. Pings Supabase with "SELECT 1" every 10 minutes to prevent database freeze.
//  2. Self-pings the Render external URL to prevent the service from sleeping.
//
// It runs for the lifetime of the application and stops when ctx is cancelled.
// Call this once from main() after the Prisma client is connected.
func Start(ctx context.Context, client *db.PrismaClient, port string) {
	externalURL := os.Getenv("RENDER_EXTERNAL_URL")

	log.Println("🔄 [KeepAlive] Background worker started")
	log.Printf("   ├─ DB ping    : every %v", pingInterval)
	if externalURL != "" {
		log.Printf("   ├─ Self-ping  : %s/health", externalURL)
	} else {
		log.Printf("   ├─ Self-ping  : http://localhost:%s/health (local mode)", port)
	}
	log.Println("   └─ Status     : running")

	ticker := time.NewTicker(pingInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("🔄 [KeepAlive] Background worker stopped")
			return
		case t := <-ticker.C:
			ts := t.UTC().Format("15:04:05")

			// 1. Ping Supabase database
			pingDB(ctx, client, ts)

			// 2. Self-ping to keep Render awake
			selfPing(externalURL, port, ts)
		}
	}
}

// pingDB runs the lightest possible query to keep Supabase active.
func pingDB(ctx context.Context, client *db.PrismaClient, ts string) {
	var result []struct {
		OK int `json:"ok"`
	}

	queryCtx, cancel := context.WithTimeout(ctx, httpTimeout)
	defer cancel()

	err := client.Prisma.QueryRaw("SELECT 1 AS ok").Exec(queryCtx, &result)
	if err != nil {
		log.Printf("🔄 [KeepAlive][%s] ❌ DB ping failed: %v", ts, err)
		return
	}
	log.Printf("🔄 [KeepAlive][%s] ✅ DB ping OK", ts)
}

// selfPing hits the server's own /health endpoint to generate incoming traffic,
// preventing Render from putting the service to sleep.
func selfPing(externalURL, port, ts string) {
	target := fmt.Sprintf("http://localhost:%s/health", port)
	if externalURL != "" {
		target = externalURL + "/health"
	}

	httpClient := &http.Client{Timeout: httpTimeout}
	resp, err := httpClient.Get(target)
	if err != nil {
		log.Printf("🔄 [KeepAlive][%s] ⚠️  Self-ping failed: %v", ts, err)
		return
	}
	resp.Body.Close()
	log.Printf("🔄 [KeepAlive][%s] ✅ Self-ping OK (%d)", ts, resp.StatusCode)
}

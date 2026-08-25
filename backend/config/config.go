package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port              string
	SumopodURL        string
	SumopodKey        string
	SupabaseURL       string
	SupabaseAnonKey   string
	SupabaseJWTSecret string
	AdminEmails       []string
	SMTPHost          string
	SMTPPort          string
	SMTPUser          string
	SMTPPass          string
	SMTPSSL           string
	SMTPFromEmail     string
}

func LoadConfig() *Config {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using default environment variables")
	}

	return &Config{
		Port:              getEnv("PORT", "3000"),
		SumopodURL:        getEnvMulti([]string{"GEMINI_BASE_URL", "SUMOPOD_URL"}, "https://ai.sumopod.com"),
		SumopodKey:        getEnvMulti([]string{"GEMINI_API_KEY", "SUMOPOD_API_KEY"}, ""),
		SupabaseURL:       getEnv("SUPABASE_URL", "https://mock.supabase.co"),
		SupabaseAnonKey:   getEnv("SUPABASE_ANON_KEY", "mock-anon-key"),
		SupabaseJWTSecret: getEnv("SUPABASE_JWT_SECRET", "mock-jwt-secret"),
		AdminEmails:       strings.Split(getEnv("ADMIN_EMAIL", ""), ","),
		SMTPHost:          getEnv("SMTP_HOST", ""),
		SMTPPort:          getEnv("SMTP_PORT", ""),
		SMTPUser:          getEnv("SMTP_USER", ""),
		SMTPPass:          getEnv("SMTP_PASS", ""),
		SMTPSSL:           getEnv("SMTP_SSL", "False"),
		SMTPFromEmail:     getEnv("SMTP_FROM_EMAIL", ""),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func getEnvMulti(keys []string, fallback string) string {
	for _, key := range keys {
		if value, exists := os.LookupEnv(key); exists && value != "" {
			return value
		}
	}
	return fallback
}

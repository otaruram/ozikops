package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/google/uuid"
	"ozikcarbon-backend/internal/service"
	"ozikcarbon-backend/prisma/db"
)

func main() {
	log.Println("🌱 Seeding Regulasi Knowledge Base...")

	client := db.NewClient()
	if err := client.Prisma.Connect(); err != nil {
		log.Fatalf("❌ DB Connect failed: %v", err)
	}
	defer client.Prisma.Disconnect()

	laws := []struct {
		RegName      string
		Article      string
		Content      string
		RiskCategory string
	}{
		{
			RegName:      "Undang-Undang No. 32 Tahun 2009 tentang Perlindungan dan Pengelolaan Lingkungan Hidup",
			Article:      "Pasal 22",
			Content:      "Setiap usaha dan/atau kegiatan yang berdampak penting terhadap lingkungan hidup wajib memiliki amdal. Analisis mengenai dampak lingkungan hidup (Amdal) merupakan instrumen pencegahan pencemaran dan kerusakan lingkungan.",
			RiskCategory: "HIGH_RISK",
		},
		{
			RegName:      "Peraturan Presiden No. 98 Tahun 2021 tentang Penyelenggaraan Nilai Ekonomi Karbon",
			Article:      "Pasal 47",
			Content:      "Pelaku usaha wajib melakukan pencatatan dan pelaporan atas pelaksanaan mitigasi perubahan iklim dan/atau aksi adaptasi perubahan iklim melalui Sistem Registri Nasional Pengendalian Perubahan Iklim (SRN PPI).",
			RiskCategory: "MEDIUM_RISK",
		},
		{
			RegName:      "Peraturan Menteri LHK No. 21 Tahun 2022 tentang Tata Laksana Penerapan Nilai Ekonomi Karbon",
			Article:      "Pasal 5",
			Content:      "Penyelenggaraan Nilai Ekonomi Karbon mencakup perdagangan karbon, pembayaran berbasis kinerja, pungutan atas karbon, dan mekanisme lain sesuai dengan perkembangan ilmu pengetahuan dan teknologi.",
			RiskCategory: "COMPLIANT",
		},
		{
			RegName:      "Peraturan Menteri ESDM No. 2 Tahun 2024 tentang PLTS Atap",
			Article:      "Pasal 10",
			Content:      "Kapasitas sistem PLTS Atap yang dapat dipasang oleh Pelanggan PLTS Atap disesuaikan dengan ketersediaan kuota pengembangan sistem PLTS Atap pada sistem tenaga listrik Pemegang Izin Usaha Penyediaan Tenaga Listrik untuk Kepentingan Umum.",
			RiskCategory: "MEDIUM_RISK",
		},
		{
			RegName:      "Undang-Undang No. 4 Tahun 2023 tentang Pengembangan dan Penguatan Sektor Keuangan",
			Article:      "Pasal 23",
			Content:      "Bursa Karbon adalah sistem yang mengatur mengenai perdagangan karbon, pendaftaran, dan/atau kliring atas efek berbasis karbon. Penyelenggaraan bursa karbon wajib memperoleh izin dari Otoritas Jasa Keuangan.",
			RiskCategory: "HIGH_RISK",
		},
	}

	sumopodURL := os.Getenv("SUMOPOD_URL")
	sumopodKey := os.Getenv("SUMOPOD_API_KEY")
	
	embeddingSvc := service.NewEmbeddingService(sumopodURL, sumopodKey)

	ctx := context.Background()
	insertedCount := 0

	for _, law := range laws {
		// Generate Embedding
		vec, err := embeddingSvc.GenerateEmbedding(ctx, law.Content)
		if err != nil {
			log.Printf("⚠️ Failed to generate embedding for %s: %v\n", law.RegName, err)
			continue
		}

		// Convert []float32 to string format "[1.2, 3.4, ...]" for pgvector insert
		var strVec []string
		for _, v := range vec {
			strVec = append(strVec, fmt.Sprintf("%f", v))
		}
		pgvectorStr := "[" + strings.Join(strVec, ",") + "]"

		id := uuid.New().String()

		// Use Raw Query to insert pgvector
		rawQuery := `INSERT INTO regulasi_knowledge_base (id, "regName", article, content, embedding, "riskCategory", "createdAt") VALUES ($1, $2, $3, $4, $5::vector, $6, NOW())`
		_, err = client.Prisma.ExecuteRaw(
			rawQuery, 
			id, 
			law.RegName, 
			law.Article, 
			law.Content, 
			pgvectorStr, 
			law.RiskCategory,
		).Exec(ctx)

		if err != nil {
			log.Printf("❌ Failed to insert %s: %v\n", law.RegName, err)
			continue
		}
		insertedCount++
	}

	log.Printf("✅ Seeding complete. Inserted %d laws with pgvector embeddings.\n", insertedCount)
}

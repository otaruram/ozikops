import re

with open('fe/src/routes/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    "Smart Greentech & Legaltech Aggregator": "AI-Powered Green Supply Chain Compliance",
    "Validasi Proyek Energi": "Verify Vendor ESG Compliance",
    "Dalam Hitungan Detik": "In Seconds",
    "OzikSustain mengautomasi audit Project Design Document (PDD) Anda. Deteksi risiko lingkungan, pastikan kepatuhan regulasi secara deterministik, dan dapatkan sertifikasi tanpa greenwashing.": "OzikSustain automates the audit of your vendors' environmental documents. Detect compliance risks, ensure alignment with green regulations, and secure your supply chain without greenwashing.",
    "Buka Dashboard": "Open Dashboard",
    "Login untuk Audit": "Login to Audit",
    "Dokumentasi API": "API Documentation",
    
    "Tata Kelola Pengadaan & Kepatuhan ESG": "Sustainable Procurement & ESG Governance",
    "OzikSustain adalah platform B2B Software-as-a-Service (SaaS) penunjang tata kelola pengadaan (procurement) dan kepatuhan ESG korporat. Kombinasi kecepatan AI, kontrol pakar manusia, dan keamanan Web3 ini secara signifikan memangkas biaya operasional, mempercepat verifikasi mitra, serta memitigasi risiko hukum perusahaan.": "OzikSustain is an Enterprise B2B SaaS platform that strengthens sustainable procurement and ESG compliance. By combining AI speed, expert human control, and cryptographic security, we significantly cut operational costs, accelerate vendor verification, and mitigate legal risks in your supply chain.",
    "Mengotomatisasi tahap awal audit dokumen vendor menggunakan AI untuk mengidentifikasi risiko lingkungan dan regulasi secara cepat.": "Automate the initial document audit of vendors using AI to quickly identify environmental and regulatory risks.",
    "Menjamin akuntabilitas tingkat enterprise dengan memberikan kontrol penuh bagi auditor internal perusahaan untuk meninjau dan memvalidasi anotasi AI.": "Ensure enterprise-grade accountability by giving your internal auditors full control to review and validate AI annotations.",
    "Web3 Cryptographic Seal": "Cryptographic Verification Seal",
    "Setelah disahkan oleh pakar, hasil evaluasi disegel secara kriptografis menggunakan blockchain (Ethereum Attestation Service) agar anti-manipulasi (tamper-proof).": "After expert validation, the evaluation results are cryptographically sealed to ensure they are tamper-proof and authentic.",
    
    "Verifikasi Spasial Lingkungan": "Spatial Environmental Verification",
    "Integrasi mendalam untuk memvalidasi koordinat dan area proyek dari risiko deforestasi atau tumpang tindih lahan.": "Deep integration to validate project coordinates and land areas against deforestation risks.",
    "Kepatuhan Regulasi Pasal.id": "Automated Regulatory Compliance",
    "Menyisir dokumen menggunakan AI deterministik untuk memastikan kepatuhan penuh terhadap UU & PP di Indonesia.": "Comb through vendor documents using deterministic AI to ensure full compliance with national environmental laws.",
    "Hasilkan lencana QR interaktif yang bisa disematkan pada laporan keberlanjutan Anda untuk transparansi publik.": "Generate interactive QR badges that can be embedded in your sustainability reports for public transparency.",
    "Scoring Engine Terpadu": "Unified ESG Scoring Engine",
    "Sistem penilaian gabungan dari aspek kelayakan energi, lingkungan, dan legalitas yang bebas interpretasi bias.": "A combined scoring system for energy feasibility, environmental impact, and legality, free from human bias.",
    "Keunggulan OzikSustain": "Why OzikSustain?",
    "Kami menggabungkan kekuatan AI dan basis data hukum untuk mencegah klaim keliru.": "We combine the power of AI and legal databases to prevent false environmental claims in your supply chain.",
    
    "Verifikasi Sertifikat": "Verify Vendor Certificate",
    "Masukkan ID Audit atau SHA-256 Hash dari dokumen untuk memverifikasi keaslian Green Badge OzikSustain.": "Enter the Audit ID or document SHA-256 Hash to verify the authenticity of the vendor's Green Badge.",
    "Contoh: 123e4567-e89b-12d3-a456-426614174000": "Example: 123e4567-e89b-12d3-a456-426614174000",
    "Cari Dokumen": "Search Document",
    
    "Cara Kerja Kami": "How It Works",
    "Proses otomatis tanpa intervensi manusia.": "Automated vendor verification process.",
    "Unggah PDD": "Upload Documents",
    "Berikan file proposal / dokumen desain proyek hijau Anda.": "Vendors submit their environmental permits and ESG reports.",
    "AI Menganalisis": "AI Analysis",
    "Kami mengekstrak klaim energi, cek regulasi, dan verifikasi lokasi.": "We extract claims, check regulations, and verify spatial data instantly.",
    "Terima Sertifikat": "Receive Badge",
    "Dapatkan Green Badge, skor kelayakan, dan kode QR unik.": "Get a verified Green Badge, compliance score, and a unique cryptographic QR.",
    
    "Skema API Fleksibel": "Flexible API Plans",
    "Pilih paket sesuai dengan jumlah audit dan skala proyek Anda.": "Choose a plan based on your supply chain scale and audit volume.",
    "Eceran": "Retail",
    "Single Audit": "Single Audit",
    "Rp 99rb": "$9",
    "/ 1x Audit Penuh": "/ 1 Full Audit",
    "Laporan PDF Komprehensif": "Comprehensive PDF Report",
    "Akses Pasal.id Terbatas": "Limited Law Database Access",
    "Beli Kredit": "Buy Credits",
    "UMKM & B2B": "SME & B2B",
    "B2B Eco-Basic": "B2B Eco-Basic",
    "Rp 499rb": "$49",
    "/ bulan": "/ month",
    "10 Kredit Audit per Bulan": "10 Audit Credits per Month",
    "Verified Green Badge Premium": "Premium Verified Green Badge",
    "Akses API Terbuka": "Open API Access",
    "Mulai Percobaan": "Start Trial",
    "Korporat": "Corporate",
    "Kustom": "Custom",
    "/ Skema API Tinggi": "/ High Volume API",
    "Hubungi Penjualan": "Contact Sales",
    "PALING POPULER": "MOST POPULAR",
    
    "Amankan Reputasi ESG Anda": "Secure Your ESG Reputation",
    "OzikSustain telah digunakan oleh puluhan UMKM dan korporat untuk mempercepat audit berkelanjutan dan mencegah greenwashing.": "OzikSustain is trusted by enterprises to accelerate sustainable audits and prevent greenwashing in their supply chains.",
    "Mulai Gratis Sekarang": "Start for Free Now",
    
    "Platform agregator kepatuhan hukum dan kelayakan energi hijau terdepan.": "The leading AI aggregator for sustainable supply chain compliance and green energy laws.",
    "Audit PDD": "Vendor Audit"
}

for k, v in replacements.items():
    content = content.replace(k, v)

with open('fe/src/routes/index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Landing page translated successfully!")

package service

import (
	"regexp"
)

type PIIMaskerService interface {
	Mask(text string) string
}

type piiMaskerService struct {
	nikRegex     *regexp.Regexp
	emailRegex   *regexp.Regexp
	phoneRegex   *regexp.Regexp
	nominalRegex *regexp.Regexp
	npwpRegex    *regexp.Regexp
	nibRegex     *regexp.Regexp
	ccRegex      *regexp.Regexp
}

func NewPIIMaskerService() PIIMaskerService {
	return &piiMaskerService{
		nikRegex:     regexp.MustCompile(`\b\d{16}\b`),
		emailRegex:   regexp.MustCompile(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`),
		phoneRegex:   regexp.MustCompile(`\+?62\d{9,13}|\b08\d{8,11}\b`),
		nominalRegex: regexp.MustCompile(`(?i)(rp|rupiah)\s*\.?\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?`),
		npwpRegex:    regexp.MustCompile(`\b\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}\b`), // Format: 99.999.999.9-999.999
		nibRegex:     regexp.MustCompile(`\b\d{13}\b`), // NIB biasanya 13 digit
		ccRegex:      regexp.MustCompile(`\b(?:\d[ -]*?){13,16}\b`), // Kartu Kredit
	}
}

func (s *piiMaskerService) Mask(text string) string {
	text = s.nikRegex.ReplaceAllString(text, "[NIK_MASKED]")
	text = s.npwpRegex.ReplaceAllString(text, "[NPWP_MASKED]")
	text = s.nibRegex.ReplaceAllString(text, "[NIB_MASKED]")
	text = s.ccRegex.ReplaceAllString(text, "[CREDIT_CARD_MASKED]")
	text = s.emailRegex.ReplaceAllString(text, "[KONTAK_MASKED]")
	text = s.phoneRegex.ReplaceAllString(text, "[KONTAK_MASKED]")
	text = s.nominalRegex.ReplaceAllString(text, "[NOMINAL_MASKED]")
	// Catatan MVP: Name masking tingkat lanjut idealnya menggunakan model NLP NER (Named Entity Recognition).
	return text
}

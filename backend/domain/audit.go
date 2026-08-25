package domain

import "time"

// --- Enums ---

type RiskSeverity string

const (
	HighRisk   RiskSeverity = "HIGH_RISK"
	MediumRisk RiskSeverity = "MEDIUM_RISK"
	Compliant  RiskSeverity = "COMPLIANT"
)

type BadgeStatus string

const (
	BadgeActive  BadgeStatus = "ACTIVE"
	BadgeInvalid BadgeStatus = "INVALID"
	BadgeRevoked BadgeStatus = "REVOKED"
)

type AuditStatus string

const (
	StatusExcellent     AuditStatus = "EXCELLENT"
	StatusGood          AuditStatus = "GOOD"
	StatusNeedsRevision AuditStatus = "NEEDS_REVISION"
)

// --- Domain Models ---

type ReviewStatus string

const (
	ReviewStatusPending  ReviewStatus = "PENDING_REVIEW"
	ReviewStatusApproved ReviewStatus = "APPROVED"
	ReviewStatusRejected ReviewStatus = "REJECTED"
	ReviewStatusRevision ReviewStatus = "NEEDS_REVISION"
)

type ProjectAudit struct {
	ID                 string       `json:"id"`
	UserID             string       `json:"userId"`
	EquipmentName      string       `json:"projectName"`
	PDDFileType        string       `json:"pddFileType"`
	TotalPages         int          `json:"totalPages"`
	TotalWords         int          `json:"totalWords"`
	TotalSentences     int          `json:"totalSentences"`
	ParsedDocumentJson string       `json:"parsedDocumentJson,omitempty"`
	FeasibilityScore   float64      `json:"feasibilityScore"`
	ScoreLegal         float64      `json:"scoreLegal"`
	ScoreTechnical     float64      `json:"scoreTechnical"`
	ScoreSocial        float64      `json:"scoreSocial"`
	ScoreTransparency  float64      `json:"scoreTransparency"`
	SHA256Hash         string       `json:"sha256Hash"`
	Status             BadgeStatus  `json:"status"`
	AuthorName         string       `json:"authorName,omitempty"`
	AuthorEmail        string       `json:"authorEmail,omitempty"`
	CreatedAt          time.Time    `json:"createdAt"`
	UpdatedAt          time.Time    `json:"updatedAt"`
	Issues             []AuditIssue `json:"issues,omitempty"`
	ReviewStatus       ReviewStatus `json:"reviewStatus"`
	ReviewerID         *string      `json:"reviewerId,omitempty"`
	ReviewFeedback     *string      `json:"reviewFeedback,omitempty"`
}

type AuditIssue struct {
	ID                string       `json:"id"`
	AuditID           string       `json:"auditId"`
	Severity          RiskSeverity `json:"severity"`
	PageNumber        int          `json:"pageNumber"`
	ChunkIndex        int          `json:"chunkIndex"`
	ClauseText        string       `json:"clauseText"`
	MatchedSop        string       `json:"matchedSop"`
	OriginalSopText   string       `json:"originalSopText"`
	SuggestedRevision string       `json:"suggestedRevision"`
	CreatedAt         time.Time    `json:"createdAt"`
}

type BadgeVerification struct {
	ID              string      `json:"id"`
	AuditID         string      `json:"auditId"`
	SignedPayload   string      `json:"signedPayload"`
	SHA256Signature string      `json:"sha256Signature"`
	Status          BadgeStatus `json:"status"`
	VerifiedAt      time.Time   `json:"verifiedAt"`
}

// --- Request DTOs ---

type ProcessAuditRequest struct {
	UserID      string `json:"userId"`
	EquipmentName string `json:"projectName"`
	PDDText     string `json:"pddText"`
	FileType    string `json:"fileType"`
	TargetPages []int  `json:"targetPages,omitempty"`
}

type GuestTeaserRequest struct {
	EquipmentName string `json:"projectName,omitempty"`
	PDDText     string `json:"pddText"`
	FileType    string `json:"fileType"`
	TargetPages []int  `json:"targetPages,omitempty"`
}

// --- Response DTOs ---

type AuditClause struct {
	ID     int         `json:"id"`
	Clause string      `json:"clause"`
	Text   string      `json:"text"`
	Status string      `json:"status"` // compliant, medium, high
	Issue  *AuditIssue `json:"issue,omitempty"`
}

type ProcessAuditResponse struct {
	AuditID            string        `json:"auditId"`
	Status             string        `json:"status"`
	FeasibilityScore   float64       `json:"feasibilityScore"`
	ScoreLegal         float64       `json:"scoreLegal"`
	ScoreTechnical     float64       `json:"scoreTechnical"`
	ScoreSocial        float64       `json:"scoreSocial"`
	ScoreTransparency  float64       `json:"scoreTransparency"`
	SHA256Hash         string        `json:"sha256Hash"`
	Issues             []AuditIssue  `json:"issues"`
	Clauses            []AuditClause `json:"clauses"`
	ParsedDocumentJson string        `json:"parsedDocumentJson,omitempty"`
	TotalPages         int           `json:"totalPages"`
	TotalWords         int           `json:"totalWords"`
	TotalSentences     int           `json:"totalSentences"`
	ReviewStatus       string        `json:"reviewStatus,omitempty"`
	ReviewFeedback     *string       `json:"reviewFeedback,omitempty"`
}

type GuestTeaserResponse struct {
	IsFreemiumTeaser  bool          `json:"is_freemium_teaser"`
	FeasibilityScore  float64       `json:"feasibilityScore"`
	ScoreLegal        float64       `json:"scoreLegal"`
	ScoreTechnical    float64       `json:"scoreTechnical"`
	ScoreSocial       float64       `json:"scoreSocial"`
	ScoreTransparency float64       `json:"scoreTransparency"`
	SpatialSummary    string        `json:"spatialSummary"`
	TopViolation      *AuditIssue   `json:"topViolation"`
	Clauses           []AuditClause `json:"clauses"`
	LockedFields      []string      `json:"lockedFields"`
	UpgradeMessage    string        `json:"upgradeMessage"`
}

type PublicVerifyResponse struct {
	EquipmentName       string      `json:"projectName"`
	FeasibilityScore  float64     `json:"feasibilityScore"`
	ScoreLegal        float64     `json:"scoreLegal"`
	ScoreTechnical    float64     `json:"scoreTechnical"`
	ScoreSocial       float64     `json:"scoreSocial"`
	ScoreTransparency float64     `json:"scoreTransparency"`
	Status            BadgeStatus `json:"status"`
	AuthorName        string      `json:"authorName,omitempty"`
	AuthorEmail       string      `json:"authorEmail,omitempty"`
	AuditDate         time.Time   `json:"auditDate"`
	SHA256Hash        string      `json:"sha256Hash"`
	IntegrityHash     string      `json:"integrityHash"`
}

type AuditHistoryResponse struct {
	Audits     []ProjectAudit `json:"audits"`
	TotalCount int            `json:"totalCount"`
}

// --- Error Response ---

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

package repository

import (
	"context"
	"ozikcarbon-backend/domain"
	"ozikcarbon-backend/prisma/db"
	"strings"
)

type AuditRepository interface {
	CreateAudit(ctx context.Context, audit *domain.ProjectAudit) (*domain.ProjectAudit, error)
	GetAuditByID(ctx context.Context, id string) (*domain.ProjectAudit, error)
	GetAuditByIDOrHash(ctx context.Context, idOrHash string) (*domain.ProjectAudit, error)
	GetAuditsByUserID(ctx context.Context, userID string) ([]domain.ProjectAudit, error)
	GetAuditBySHA256Hash(ctx context.Context, hash string) (*domain.ProjectAudit, error)
	UpdateAuditStatus(ctx context.Context, id string, status string) error
	DeleteAudit(ctx context.Context, id string, userID string) error
	GetPendingAudits(ctx context.Context) ([]domain.ProjectAudit, error)
	UpdateReviewStatus(ctx context.Context, auditID string, reviewerID string, status db.ReviewStatus, feedback string) error
	UpdateMicroApprove(ctx context.Context, auditID string, sha256Hash string) error
}

type auditRepository struct {
	client *db.PrismaClient
}

func NewAuditRepository(client *db.PrismaClient) AuditRepository {
	return &auditRepository{client: client}
}

func (r *auditRepository) CreateAudit(ctx context.Context, audit *domain.ProjectAudit) (*domain.ProjectAudit, error) {

	fileType := audit.PDDFileType
	if fileType == "" {
		fileType = "pdf"
	}

	created, err := r.client.ProjectAudit.CreateOne(
		db.ProjectAudit.User.Link(db.User.ID.Equals(audit.UserID)),
		db.ProjectAudit.EquipmentName.Set(audit.EquipmentName),
		db.ProjectAudit.PddFileType.Set(fileType),
		db.ProjectAudit.FeasibilityScore.Set(audit.FeasibilityScore),
		db.ProjectAudit.Sha256Hash.Set(audit.SHA256Hash),
		// Optional fields below
		db.ProjectAudit.TotalPages.Set(audit.TotalPages),
		db.ProjectAudit.TotalWords.Set(audit.TotalWords),
		db.ProjectAudit.TotalSentences.Set(audit.TotalSentences),
		db.ProjectAudit.ScoreLegal.Set(audit.ScoreLegal),
		db.ProjectAudit.ScoreTechnical.Set(audit.ScoreTechnical),
		db.ProjectAudit.ScoreSocial.Set(audit.ScoreSocial),
		db.ProjectAudit.ScoreTransparency.Set(audit.ScoreTransparency),
		db.ProjectAudit.ParsedDocumentJSON.Set([]byte(audit.ParsedDocumentJson)),
		db.ProjectAudit.ID.Set(audit.ID),
		db.ProjectAudit.Status.Set(db.BadgeStatus(audit.Status)),
	).Exec(ctx)

	if err != nil {
		return nil, err
	}

	for _, issue := range audit.Issues {
		var prismaSeverity db.AuditSeverity
		switch issue.Severity {
		case "HIGH_RISK":
			prismaSeverity = db.AuditSeverityHighRisk
		case "MEDIUM_RISK":
			prismaSeverity = db.AuditSeverityMediumRisk
		default:
			prismaSeverity = db.AuditSeverityCompliant
		}

		_, err := r.client.AuditIssue.CreateOne(
			db.AuditIssue.Audit.Link(db.ProjectAudit.ID.Equals(created.ID)),
			db.AuditIssue.Severity.Set(prismaSeverity),
			db.AuditIssue.ClauseText.Set(issue.ClauseText),
			db.AuditIssue.MatchedSop.Set(issue.MatchedSop),
			db.AuditIssue.OriginalSopText.Set(issue.OriginalSopText),
			db.AuditIssue.SuggestedRevision.Set(issue.SuggestedRevision),
			db.AuditIssue.PageNumber.Set(issue.PageNumber),
			db.AuditIssue.ChunkIndex.Set(issue.ChunkIndex),
		).Exec(ctx)
		if err != nil {
			return nil, err
		}
	}

	return audit, nil
}

func (r *auditRepository) DeleteAudit(ctx context.Context, id string, userID string) error {
	// First check if it exists and belongs to the user
	record, err := r.client.ProjectAudit.FindUnique(
		db.ProjectAudit.ID.Equals(id),
	).Exec(ctx)
	if err != nil {
		return err
	}
	if record.UserID != userID {
		return context.Canceled // Or any error to denote unauthorized
	}

	_, err = r.client.ProjectAudit.FindUnique(
		db.ProjectAudit.ID.Equals(id),
	).Delete().Exec(ctx)

	return err
}

func (r *auditRepository) GetAuditByID(ctx context.Context, id string) (*domain.ProjectAudit, error) {
	record, err := r.client.ProjectAudit.FindUnique(
		db.ProjectAudit.ID.Equals(id),
	).With(
		db.ProjectAudit.Issues.Fetch(),
		db.ProjectAudit.User.Fetch(),
	).Exec(ctx)
	if err != nil {
		return nil, err
	}

	issues := make([]domain.AuditIssue, len(record.Issues()))
	for i, iss := range record.Issues() {
		issues[i] = domain.AuditIssue{
			ID:                iss.ID,
			AuditID:           iss.AuditID,
			Severity:          domain.RiskSeverity(iss.Severity),
			ClauseText:        iss.ClauseText,
			MatchedSop:        iss.MatchedSop,
			OriginalSopText:   iss.OriginalSopText,
			SuggestedRevision: iss.SuggestedRevision,
			CreatedAt:         iss.CreatedAt,
		}
	}

	auditResp := &domain.ProjectAudit{
		ID:                record.ID,
		UserID:            record.UserID,
		EquipmentName:       record.EquipmentName,
		TotalPages:        record.TotalPages,
		TotalWords:        record.TotalWords,
		TotalSentences:    record.TotalSentences,
		FeasibilityScore:  record.FeasibilityScore,
		ScoreLegal:        record.ScoreLegal,
		ScoreTechnical:    record.ScoreTechnical,
		ScoreSocial:       record.ScoreSocial,
		ScoreTransparency: record.ScoreTransparency,
		SHA256Hash:        record.Sha256Hash,
		Status:            domain.BadgeStatus(record.Status),
		ReviewStatus:      domain.ReviewStatus(record.ReviewStatus),
		AuthorName:        record.User().Name,
		AuthorEmail:       record.User().Email,
		CreatedAt:         record.CreatedAt,
		Issues:            issues,
	}

	if reviewerID, ok := record.ReviewerID(); ok {
		auditResp.ReviewerID = &reviewerID
	}
	if feedback, ok := record.ReviewFeedback(); ok {
		auditResp.ReviewFeedback = &feedback
	}

	if parsedJson, ok := record.ParsedDocumentJSON(); ok {
		auditResp.ParsedDocumentJson = string(parsedJson)
	}

	return auditResp, nil
}

func (r *auditRepository) GetAuditsByUserID(ctx context.Context, userID string) ([]domain.ProjectAudit, error) {
	records, err := r.client.ProjectAudit.FindMany(
		db.ProjectAudit.UserID.Equals(userID),
	).OrderBy(
		db.ProjectAudit.CreatedAt.Order(db.SortOrderDesc),
	).Exec(ctx)
	if err != nil {
		return nil, err
	}

	var audits []domain.ProjectAudit
	for _, rec := range records {
		audits = append(audits, domain.ProjectAudit{
			ID:                rec.ID,
			UserID:            rec.UserID,
			EquipmentName:       rec.EquipmentName,
			TotalPages:        rec.TotalPages,
			TotalWords:        rec.TotalWords,
			TotalSentences:    rec.TotalSentences,
			FeasibilityScore:  rec.FeasibilityScore,
			ScoreLegal:        rec.ScoreLegal,
			ScoreTechnical:    rec.ScoreTechnical,
			ScoreSocial:       rec.ScoreSocial,
			ScoreTransparency: rec.ScoreTransparency,
			SHA256Hash:        rec.Sha256Hash,
			Status:            domain.BadgeStatus(rec.Status),
			ReviewStatus:      domain.ReviewStatus(rec.ReviewStatus),
			CreatedAt:         rec.CreatedAt,
		})
	}
	return audits, nil
}

func (r *auditRepository) GetAuditByIDOrHash(ctx context.Context, idOrHash string) (*domain.ProjectAudit, error) {
	var record *db.ProjectAuditModel

	// Try exact match first
	exactRecord, err := r.client.ProjectAudit.FindFirst(
		db.ProjectAudit.Or(
			db.ProjectAudit.ID.Equals(idOrHash),
			db.ProjectAudit.Sha256Hash.Equals(idOrHash),
		),
	).With(
		db.ProjectAudit.Issues.Fetch(),
		db.ProjectAudit.User.Fetch(),
	).Exec(ctx)

	if err == nil {
		record = exactRecord
	} else {
		// Fallback for Short Codes (e.g. OZK-9703BF35)
		// Prisma's .StartsWith fails on Postgres UUID columns, so we do it in-memory
		searchStr := strings.ToLower(strings.TrimPrefix(idOrHash, "OZK-"))
		searchStr = strings.TrimPrefix(searchStr, "cc-")
		
		allRecords, err2 := r.client.ProjectAudit.FindMany().With(
			db.ProjectAudit.Issues.Fetch(),
			db.ProjectAudit.User.Fetch(),
		).Exec(ctx)
		
		if err2 != nil {
			return nil, err2
		}
		
		found := false
		for _, r := range allRecords {
			if strings.HasPrefix(r.ID, searchStr) {
				// We need a copy of the value, not the loop variable reference
				copyOfR := r
				record = &copyOfR
				found = true
				break
			}
		}
		
		if !found {
			return nil, db.ErrNotFound
		}
	}

	issues := make([]domain.AuditIssue, len(record.Issues()))
	for i, iss := range record.Issues() {
		issues[i] = domain.AuditIssue{
			ID:                iss.ID,
			AuditID:           iss.AuditID,
			Severity:          domain.RiskSeverity(iss.Severity),
			ClauseText:        iss.ClauseText,
			MatchedSop:        iss.MatchedSop,
			OriginalSopText:   iss.OriginalSopText,
			SuggestedRevision: iss.SuggestedRevision,
			CreatedAt:         iss.CreatedAt,
		}
	}

	parsedDocJSON, _ := record.ParsedDocumentJSON()

	auditResp := &domain.ProjectAudit{
		ID:                 record.ID,
		UserID:             record.UserID,
		EquipmentName:        record.EquipmentName,
		FeasibilityScore:   record.FeasibilityScore,
		ScoreLegal:         record.ScoreLegal,
		ScoreTechnical:     record.ScoreTechnical,
		ScoreSocial:        record.ScoreSocial,
		ScoreTransparency:  record.ScoreTransparency,
		Status:             domain.BadgeStatus(record.Status),
		ReviewStatus:       domain.ReviewStatus(record.ReviewStatus),
		AuthorName:         record.User().Name,
		AuthorEmail:        record.User().Email,
		CreatedAt:          record.CreatedAt,
		UpdatedAt:          record.UpdatedAt,
		SHA256Hash:         record.Sha256Hash,
		Issues:             issues,
		PDDFileType:        record.PddFileType,
		ParsedDocumentJson: string(parsedDocJSON),
		TotalPages:         record.TotalPages,
		TotalWords:         record.TotalWords,
		TotalSentences:     record.TotalSentences,
	}

	if reviewerID, ok := record.ReviewerID(); ok {
		auditResp.ReviewerID = &reviewerID
	}
	if feedback, ok := record.ReviewFeedback(); ok {
		auditResp.ReviewFeedback = &feedback
	}

	return auditResp, nil
}

func (r *auditRepository) UpdateAuditStatus(ctx context.Context, id string, status string) error {
	_, err := r.client.ProjectAudit.FindUnique(
		db.ProjectAudit.ID.Equals(id),
	).Update(
		db.ProjectAudit.Status.Set(db.BadgeStatus(status)),
	).Exec(ctx)
	return err
}

func (r *auditRepository) GetAuditBySHA256Hash(ctx context.Context, hash string) (*domain.ProjectAudit, error) {
	record, err := r.client.ProjectAudit.FindUnique(
		db.ProjectAudit.Sha256Hash.Equals(hash),
	).With(
		db.ProjectAudit.User.Fetch(),
	).Exec(ctx)
	if err != nil {
		return nil, err
	}

	return &domain.ProjectAudit{
		ID:                record.ID,
		UserID:            record.UserID,
		EquipmentName:       record.EquipmentName,
		FeasibilityScore:  record.FeasibilityScore,
		ScoreLegal:        record.ScoreLegal,
		ScoreTechnical:    record.ScoreTechnical,
		ScoreSocial:       record.ScoreSocial,
		ScoreTransparency: record.ScoreTransparency,
		SHA256Hash:        record.Sha256Hash,
		Status:            domain.BadgeStatus(record.Status),
		ReviewStatus:      domain.ReviewStatus(record.ReviewStatus),
		AuthorName:        record.User().Name,
		AuthorEmail:       record.User().Email,
		CreatedAt:         record.CreatedAt,
	}, nil
}

func (r *auditRepository) GetPendingAudits(ctx context.Context) ([]domain.ProjectAudit, error) {
	records, err := r.client.ProjectAudit.FindMany(
		// db.ProjectAudit.ReviewStatus.Equals(db.ReviewStatusPendingReview),
	).With(
		db.ProjectAudit.User.Fetch(),
	).OrderBy(
		db.ProjectAudit.CreatedAt.Order(db.SortOrderAsc),
	).Exec(ctx)
	if err != nil {
		return nil, err
	}

	var audits []domain.ProjectAudit
	for _, rec := range records {
		audits = append(audits, domain.ProjectAudit{
			ID:                rec.ID,
			UserID:            rec.UserID,
			EquipmentName:       rec.EquipmentName,
			TotalPages:        rec.TotalPages,
			TotalWords:        rec.TotalWords,
			TotalSentences:    rec.TotalSentences,
			FeasibilityScore:  rec.FeasibilityScore,
			ScoreLegal:        rec.ScoreLegal,
			ScoreTechnical:    rec.ScoreTechnical,
			ScoreSocial:       rec.ScoreSocial,
			ScoreTransparency: rec.ScoreTransparency,
			SHA256Hash:        rec.Sha256Hash,
			Status:            domain.BadgeStatus(rec.Status),
			ReviewStatus:      domain.ReviewStatus(rec.ReviewStatus),
			AuthorName:        rec.User().Name,
			AuthorEmail:       rec.User().Email,
			CreatedAt:         rec.CreatedAt,
		})
	}
	return audits, nil
}

func (r *auditRepository) UpdateReviewStatus(ctx context.Context, auditID string, reviewerID string, status db.ReviewStatus, feedback string) error {
	_, err := r.client.ProjectAudit.FindUnique(
		db.ProjectAudit.ID.Equals(auditID),
	).Update(
		db.ProjectAudit.ReviewStatus.Set(status),
		db.ProjectAudit.ReviewerID.Set(reviewerID),
		db.ProjectAudit.ReviewFeedback.Set(feedback),
	).Exec(ctx)
	return err
}

func (r *auditRepository) UpdateMicroApprove(ctx context.Context, auditID string, sha256Hash string) error {
	_, err := r.client.ProjectAudit.FindUnique(
		db.ProjectAudit.ID.Equals(auditID),
	).Update(
		db.ProjectAudit.ReviewStatus.Set(db.ReviewStatusApproved),
		db.ProjectAudit.Sha256Hash.Set(sha256Hash),
		db.ProjectAudit.ReviewFeedback.Set("Approved via Biometric Micro-Approve"),
	).Exec(ctx)
	return err
}

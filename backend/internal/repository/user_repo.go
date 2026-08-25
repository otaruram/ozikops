package repository

import (
	"context"
	"ozikcarbon-backend/domain"
	"ozikcarbon-backend/prisma/db"
)

type UserRepository interface {
	GetByID(ctx context.Context, id string) (*domain.User, error)
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
	UpsertFromGoogle(ctx context.Context, user *domain.User) (*domain.User, bool, error)
	UpdateProfile(ctx context.Context, id string, req *domain.UpdateProfileRequest) (*domain.User, error)
	DeductCredit(ctx context.Context, id string) error
	GetCreditsBalance(ctx context.Context, id string) (int, error)
	FindByAPIKey(ctx context.Context, apiKey string) (*domain.User, error)
	UpdateAPIKey(ctx context.Context, id string, apiKey string) error
	UpdateNotifications(ctx context.Context, id string, req *domain.UpdateNotificationRequest) error
	GetAllUsers(ctx context.Context) ([]domain.User, error)
	UpdateUserStatus(ctx context.Context, id string, credits int, isBanned bool, role string) error
}

type userRepository struct {
	client *db.PrismaClient
}

func NewUserRepository(client *db.PrismaClient) UserRepository {
	return &userRepository{client: client}
}

func (r *userRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	record, err := r.client.User.FindUnique(
		db.User.ID.Equals(id),
	).Exec(ctx)
	if err != nil {
		return nil, err
	}

	var compPtr *string
	if v, ok := record.Company(); ok {
		compPtr = &v
	}

	var apiKeyPtr *string
	if v, ok := record.APIKey(); ok {
		apiKeyPtr = &v
	}

	return &domain.User{
		ID:               record.ID,
		Email:            record.Email,
		Name:             record.Name,
		Company:          compPtr,
		Provider:         record.Provider,
		CreditsBalance:   record.CreditsBalance,
		APIKey:           apiKeyPtr,
		NotifyReportDone: record.NotifyReportDone,
		NotifyRegulation: record.NotifyRegulation,
		Role:             record.Role,
		IsBanned:         record.IsBanned,
	}, nil
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	record, err := r.client.User.FindUnique(
		db.User.Email.Equals(email),
	).Exec(ctx)
	if err != nil {
		return nil, err
	}

	var compPtr *string
	if v, ok := record.Company(); ok {
		compPtr = &v
	}

	var apiKeyPtr *string
	if v, ok := record.APIKey(); ok {
		apiKeyPtr = &v
	}

	return &domain.User{
		ID:               record.ID,
		Email:            record.Email,
		Name:             record.Name,
		Company:          compPtr,
		Provider:         record.Provider,
		CreditsBalance:   record.CreditsBalance,
		APIKey:           apiKeyPtr,
		NotifyReportDone: record.NotifyReportDone,
		NotifyRegulation: record.NotifyRegulation,
		Role:             record.Role,
		IsBanned:         record.IsBanned,
	}, nil
}

func (r *userRepository) UpsertFromGoogle(ctx context.Context, user *domain.User) (*domain.User, bool, error) {
	_, errFind := r.client.User.FindUnique(db.User.Email.Equals(user.Email)).Exec(ctx)
	isNew := errFind != nil

	record, err := r.client.User.UpsertOne(
		db.User.Email.Equals(user.Email),
	).Create(
		db.User.ID.Set(user.ID),
		db.User.Email.Set(user.Email),
		db.User.Name.Set(user.Name),
		db.User.Provider.Set(user.Provider),
	).Update(
		db.User.Name.Set(user.Name),
		db.User.Provider.Set(user.Provider),
	).Exec(ctx)
	if err != nil {
		return nil, false, err
	}

	user.ID = record.ID
	user.CreditsBalance = record.CreditsBalance
	user.NotifyReportDone = record.NotifyReportDone
	user.NotifyRegulation = record.NotifyRegulation
	user.Role = record.Role
	user.IsBanned = record.IsBanned
	return user, isNew, nil
}

func (r *userRepository) UpdateProfile(ctx context.Context, id string, req *domain.UpdateProfileRequest) (*domain.User, error) {
	var company string
	if req.Company != nil {
		company = *req.Company
	}
	record, err := r.client.User.FindUnique(
		db.User.ID.Equals(id),
	).Update(
		db.User.Name.Set(req.Name),
		db.User.Company.Set(company),
	).Exec(ctx)
	if err != nil {
		return nil, err
	}

	var compPtr *string
	if v, ok := record.Company(); ok {
		compPtr = &v
	}

	return &domain.User{
		ID:      record.ID,
		Name:    record.Name,
		Email:   record.Email,
		Company: compPtr,
	}, nil
}

func (r *userRepository) DeductCredit(ctx context.Context, id string) error {
	_, err := r.client.User.FindUnique(
		db.User.ID.Equals(id),
	).Update(
		db.User.CreditsBalance.Decrement(1),
	).Exec(ctx)
	return err
}

func (r *userRepository) GetCreditsBalance(ctx context.Context, id string) (int, error) {
	record, err := r.client.User.FindUnique(
		db.User.ID.Equals(id),
	).Exec(ctx)
	if err != nil {
		return 0, err
	}
	return record.CreditsBalance, nil
}

func (r *userRepository) FindByAPIKey(ctx context.Context, apiKey string) (*domain.User, error) {
	record, err := r.client.User.FindUnique(
		db.User.APIKey.Equals(apiKey),
	).Exec(ctx)
	if err != nil {
		return nil, err
	}

	var apik *string
	v, ok := record.APIKey()
	if ok {
		apik = &v
	}

	return &domain.User{
		ID:               record.ID,
		Email:            record.Email,
		Name:             record.Name,
		Provider:         record.Provider,
		CreditsBalance:   record.CreditsBalance,
		APIKey:           apik,
		NotifyReportDone: record.NotifyReportDone,
		NotifyRegulation: record.NotifyRegulation,
		Role:             record.Role,
		IsBanned:         record.IsBanned,
	}, nil
}

func (r *userRepository) UpdateAPIKey(ctx context.Context, id string, apiKey string) error {
	_, err := r.client.User.FindUnique(
		db.User.ID.Equals(id),
	).Update(
		db.User.APIKey.Set(apiKey),
	).Exec(ctx)
	return err
}

func (r *userRepository) UpdateNotifications(ctx context.Context, id string, req *domain.UpdateNotificationRequest) error {
	_, err := r.client.User.FindUnique(
		db.User.ID.Equals(id),
	).Update(
		db.User.NotifyReportDone.Set(req.NotifyReportDone),
		db.User.NotifyRegulation.Set(req.NotifyRegulation),
	).Exec(ctx)
	return err
}

func (r *userRepository) GetAllUsers(ctx context.Context) ([]domain.User, error) {
	records, err := r.client.User.FindMany().Exec(ctx)
	if err != nil {
		return nil, err
	}
	var users []domain.User
	for _, rec := range records {
		users = append(users, domain.User{
			ID:               rec.ID,
			Email:            rec.Email,
			Name:             rec.Name,
			Provider:         rec.Provider,
			CreditsBalance:   rec.CreditsBalance,
			NotifyReportDone: rec.NotifyReportDone,
			NotifyRegulation: rec.NotifyRegulation,
			Role:             rec.Role,
			IsBanned:         rec.IsBanned,
			CreatedAt:        rec.CreatedAt,
			UpdatedAt:        rec.UpdatedAt,
		})
	}
	return users, nil
}

func (r *userRepository) UpdateUserStatus(ctx context.Context, id string, credits int, isBanned bool, role string) error {
	_, err := r.client.User.FindUnique(
		db.User.ID.Equals(id),
	).Update(
		db.User.CreditsBalance.Set(credits),
		db.User.IsBanned.Set(isBanned),
		db.User.Role.Set(role),
	).Exec(ctx)
	return err
}


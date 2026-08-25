FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download all dependencies
RUN go mod download

# Copy the source code
COPY . .

# Generate Prisma Client
RUN rm -rf prisma/db/*_gen.go || true && go run github.com/steebchen/prisma-client-go generate

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/api

# Final stage
FROM alpine:latest
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/main .

EXPOSE 10000

CMD ["./main"]

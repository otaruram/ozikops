@echo off
set PATH=%CD%\..\go_dist\go\bin;%CD%\.go\bin;%PATH%
set GOROOT=%CD%\..\go_dist\go
set GOPATH=%CD%\.go
set GOCACHE=%CD%\.go\cache
set PRISMA_CLIENT_GO_PREFER_SYSTEM_BINARIES=0

echo Installing Prisma Engine Global...
go install github.com/steebchen/prisma-client-go@latest

echo Generating Prisma Client...
call npx prisma generate

echo Downloading Go Modules...
go mod download github.com/gofiber/fiber/v2
go get github.com/joho/godotenv
go get github.com/steebchen/prisma-client-go
go get ozikcarbon-backend/config
go get github.com/dslipak/pdf
go mod tidy

echo Starting Server...
go run cmd\api\main.go

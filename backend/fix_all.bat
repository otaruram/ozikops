@echo off
echo Setting Go Variables...
set PATH=%CD%\..\go_dist\go\bin;%PATH%
set GOPATH=%CD%\.go
set GOCACHE=%CD%\.go\cache
mkdir %CD%\.go 2>nul
mkdir %CD%\.go\cache 2>nul

echo Generating Prisma Client...
call npx prisma generate

echo Downloading Go Modules...
go mod download github.com/gofiber/fiber/v2
go get ozikcarbon-backend/config
go mod tidy

echo Starting Server...
go run cmd\api\main.go

@echo off
set PATH=%CD%\..\go_dist\go\bin;%CD%\.go\bin;%PATH%
set GOROOT=%CD%\..\go_dist\go
set GOPATH=%CD%\.go
set GOCACHE=%CD%\.go\cache

echo Pushing Schema to Supabase...
call npx prisma db push

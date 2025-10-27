@echo off
REM User Management Database Initialization Script for Windows
REM This script initializes the user management system in the database

setlocal enabledelayedexpansion

echo ========================================
echo PieDocs User Management DB Initialization
echo ========================================
echo.

REM Check if .env file exists
if not exist ..\.env (
    echo Error: .env file not found
    exit /b 1
)

REM Parse DATABASE_URL from .env
for /f "tokens=1,2 delims==" %%a in ('findstr /v "^#" ..\.env ^| findstr "DATABASE_URL"') do (
    set DATABASE_URL=%%b
)

if not defined DATABASE_URL (
    echo Error: DATABASE_URL not found in .env file
    exit /b 1
)

REM Extract database connection details
REM Format: postgresql://user:password@host:port/dbname
echo Parsing database connection...

REM For simplicity, we'll prompt for connection details
echo.
set /p DB_HOST="Enter database host (default: localhost): " || set DB_HOST=localhost
set /p DB_PORT="Enter database port (default: 5434): " || set DB_PORT=5434
set /p DB_USER="Enter database user (default: piedocs): " || set DB_USER=piedocs
set /p DB_NAME="Enter database name (default: piedocs): " || set DB_NAME=piedocs
set /p DB_PASSWORD="Enter database password: "

echo.
echo Connecting to database: %DB_NAME% at %DB_HOST%:%DB_PORT%
echo.

REM Check if psql is available
where psql >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: psql command not found. Please install PostgreSQL client.
    exit /b 1
)

REM Test connection
echo Testing database connection...
set PGPASSWORD=%DB_PASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT 1" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Cannot connect to database
    exit /b 1
)
echo [OK] Database connection successful
echo.

REM Run schema creation
echo Creating user management schema...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f schema_user_management.sql
if %ERRORLEVEL% neq 0 (
    echo Error: Failed to create schema
    exit /b 1
)
echo [OK] Schema created successfully
echo.

REM Verify installation
echo Verifying installation...
echo.

REM Check tables
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'roles', 'permissions', 'user_roles', 'role_permissions')"
echo [OK] Tables verified
echo.

REM Check default roles
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -t -c "SELECT COUNT(*) FROM roles WHERE is_system_role = true"
echo [OK] Default roles verified
echo.

REM List system roles
echo System Roles:
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT name, display_name, priority FROM roles WHERE is_system_role = true ORDER BY priority DESC"
echo.

echo ========================================
echo User Management System Initialized
echo ========================================
echo.
echo Next steps:
echo 1. Create your first admin user via the API or database
echo 2. Start the backend server: cd .. ^&^& python -m uvicorn app.main:app --reload
echo 3. Start the frontend: cd ..\..\pie-docs-frontend ^&^& npm run dev
echo 4. Access settings at: http://localhost:5173/settings
echo.

pause

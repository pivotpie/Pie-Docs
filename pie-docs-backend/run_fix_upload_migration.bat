@echo off
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -U piedocs -d piedocs -f "database\migrations\21-fix-upload-workflow-tables.sql"
pause

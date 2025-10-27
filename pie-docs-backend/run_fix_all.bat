@echo off
echo ================================================
echo Fixing ALL capacity counters and barcode IDs...
echo ================================================
echo.
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -U piedocs -d piedocs -f "database\migrations\24-fix-all-counters-and-ids.sql"
echo.
echo ================================================
echo All fixes completed!
echo ================================================
pause

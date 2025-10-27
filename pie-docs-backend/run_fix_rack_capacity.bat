@echo off
echo Fixing rack capacity counters...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -U piedocs -d piedocs -f "database\migrations\22-fix-rack-capacity-counters.sql"
echo.
echo Done!
pause

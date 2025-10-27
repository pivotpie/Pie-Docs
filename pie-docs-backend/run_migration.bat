@echo off
echo Running physical_documents schema migration...
echo.

"C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -U piedocs -d piedocs -f "C:\Users\Book 3\Desktop\Pivot Pie Projects\Pie-Docs\pie-docs-backend\migrations\update_physical_documents_schema.sql"

echo.
echo Migration complete!
pause

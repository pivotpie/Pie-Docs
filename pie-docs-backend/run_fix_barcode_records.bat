@echo off
echo Backfilling barcode_records.document_id from barcodes table...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -U piedocs -d piedocs -f "database\migrations\23-backfill-barcode-records-document-id.sql"
echo.
echo Done!
pause

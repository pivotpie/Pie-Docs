-- ============================================
-- Migration 10: OCR Processing Enhancements
-- Adds processing settings and confidence breakdown
-- Critical: Blocks API development
-- ============================================

-- Add processing settings to ocr_jobs
ALTER TABLE ocr_jobs
    ADD COLUMN IF NOT EXISTS processing_settings JSONB DEFAULT '{
        "language": "eng",
        "dpi": 300,
        "preprocessing": {
            "deskew": true,
            "denoise": true,
            "contrast_enhancement": true
        },
        "engine": "tesseract",
        "engine_mode": 3
    }'::jsonb;

-- Add confidence breakdown columns to ocr_results
ALTER TABLE ocr_results
    ADD COLUMN IF NOT EXISTS confidence_character NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS confidence_word NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS confidence_line NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS confidence_paragraph NUMERIC(5,2);

-- Create indexes for confidence filtering
CREATE INDEX IF NOT EXISTS idx_ocr_results_confidence_word ON ocr_results(confidence_word);
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_processing_settings ON ocr_jobs USING gin(processing_settings);

-- Migrate existing overall_confidence to detailed breakdown
UPDATE ocr_results
SET
    confidence_character = overall_confidence,
    confidence_word = overall_confidence,
    confidence_line = overall_confidence,
    confidence_paragraph = overall_confidence
WHERE overall_confidence IS NOT NULL
  AND (confidence_character IS NULL OR confidence_word IS NULL);

-- Verify migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 10 completed:';
    RAISE NOTICE '  - Added processing_settings to ocr_jobs';
    RAISE NOTICE '  - Added confidence breakdown to ocr_results';
    RAISE NOTICE '  - Migrated % OCR results', (SELECT COUNT(*) FROM ocr_results WHERE confidence_word IS NOT NULL);
END $$;

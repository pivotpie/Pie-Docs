-- ============================================
-- AI FEATURES FOR PIEDOCS
-- Document Insights, Summaries, Key Terms, Multimodal Analysis
-- ============================================

-- ============================================
-- DOCUMENT INSIGHTS
-- ============================================

CREATE TABLE IF NOT EXISTS document_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Insight details
    insight_type VARCHAR(50) NOT NULL, -- clause, pii, financial, reference, date, risk
    category VARCHAR(100) NOT NULL, -- e.g., "Payment Terms", "Confidentiality", "Personal Data"
    content TEXT NOT NULL, -- The actual insight text or data
    context TEXT, -- Surrounding context from document

    -- Location in document
    page_number INTEGER,
    position_start INTEGER,
    position_end INTEGER,
    bounding_box JSONB, -- {x, y, width, height} for visual highlighting

    -- AI metadata
    confidence DECIMAL(5, 4), -- 0.0000 to 1.0000
    severity VARCHAR(20), -- low, medium, high, critical (for risks)
    model_version VARCHAR(50), -- e.g., "gpt-5-preview"

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Indexes for fast queries
    CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX idx_insights_document_id ON document_insights(document_id);
CREATE INDEX idx_insights_type ON document_insights(insight_type);
CREATE INDEX idx_insights_category ON document_insights(category);
CREATE INDEX idx_insights_severity ON document_insights(severity);

-- ============================================
-- DOCUMENT SUMMARIES
-- ============================================

CREATE TABLE IF NOT EXISTS document_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Summary content
    summary_text TEXT NOT NULL,
    key_points JSONB, -- Array of key points: ["point 1", "point 2", ...]

    -- Metadata
    word_count INTEGER,
    summary_type VARCHAR(20) DEFAULT 'default', -- default, short, medium, long
    language VARCHAR(10) DEFAULT 'en',

    -- AI metadata
    model_version VARCHAR(50),
    generation_time_ms INTEGER, -- Time taken to generate
    token_usage JSONB, -- {input: 1000, output: 200, total: 1200}

    -- Timestamps
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Only one default summary per document
    CONSTRAINT unique_default_summary UNIQUE (document_id, summary_type)
);

CREATE INDEX idx_summaries_document_id ON document_summaries(document_id);
CREATE INDEX idx_summaries_type ON document_summaries(summary_type);

-- ============================================
-- DOCUMENT KEY TERMS
-- ============================================

CREATE TABLE IF NOT EXISTS document_key_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Term details
    term VARCHAR(255) NOT NULL,
    definition TEXT,
    context TEXT, -- Where it appears in document

    -- Classification
    category VARCHAR(50), -- legal, financial, technical, date, party, other
    importance VARCHAR(20), -- critical, important, reference

    -- Location references
    page_references INTEGER[], -- Array of page numbers where term appears
    frequency INTEGER DEFAULT 1, -- How many times term appears

    -- AI metadata
    confidence DECIMAL(5, 4),
    model_version VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_term_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX idx_key_terms_document_id ON document_key_terms(document_id);
CREATE INDEX idx_key_terms_category ON document_key_terms(category);
CREATE INDEX idx_key_terms_importance ON document_key_terms(importance);
CREATE INDEX idx_key_terms_term ON document_key_terms(term);

-- ============================================
-- MULTIMODAL ANALYSIS
-- ============================================

CREATE TABLE IF NOT EXISTS document_multimodal_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Analysis type
    analysis_type VARCHAR(50) NOT NULL, -- image, table, chart, signature, logo, embedded_audio, embedded_video

    -- Content details
    page_number INTEGER,
    content_description TEXT, -- AI-generated description
    extracted_data JSONB, -- Structured data extracted (e.g., table data, chart data)

    -- Location
    bounding_box JSONB, -- {x, y, width, height}

    -- File references (for embedded media)
    media_url VARCHAR(1000), -- URL to extracted media file
    media_type VARCHAR(50), -- image/png, audio/mp3, etc.

    -- Transcription (for audio/video)
    transcription TEXT,
    transcription_language VARCHAR(10),

    -- AI metadata
    confidence DECIMAL(5, 4),
    model_version VARCHAR(50),
    processing_time_ms INTEGER,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_multimodal_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX idx_multimodal_document_id ON document_multimodal_analysis(document_id);
CREATE INDEX idx_multimodal_type ON document_multimodal_analysis(analysis_type);
CREATE INDEX idx_multimodal_page ON document_multimodal_analysis(page_number);

-- ============================================
-- GENERATED DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS generated_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Source documents
    source_document_ids UUID[], -- Array of document IDs used as sources

    -- Generation details
    document_type VARCHAR(100), -- "Contract Amendment", "Summary Report", etc.
    prompt TEXT NOT NULL, -- User's original prompt/request
    content TEXT NOT NULL, -- Generated document content (markdown)

    -- Metadata
    title VARCHAR(500),
    word_count INTEGER,
    language VARCHAR(10) DEFAULT 'en',

    -- AI metadata
    model_version VARCHAR(50),
    generation_time_ms INTEGER,
    token_usage JSONB, -- {input: 10000, output: 2000, total: 12000}

    -- User info
    created_by UUID REFERENCES users(id),

    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- draft, finalized, exported

    -- Export info
    exported_at TIMESTAMP WITH TIME ZONE,
    export_format VARCHAR(20), -- pdf, docx, markdown
    export_url VARCHAR(1000),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_generated_docs_created_by ON generated_documents(created_by);
CREATE INDEX idx_generated_docs_created_at ON generated_documents(created_at);
CREATE INDEX idx_generated_docs_status ON generated_documents(status);

-- ============================================
-- DYNAMIC AI ACTIONS CACHE
-- (For storing on-demand AI action results temporarily)
-- ============================================

CREATE TABLE IF NOT EXISTS ai_action_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Action details
    action_type VARCHAR(50) NOT NULL, -- amendment, risk-analysis, compliance-check, etc.
    request_params JSONB, -- Parameters sent with the request

    -- Result
    result_data JSONB NOT NULL, -- Structured JSON response from GPT-5

    -- Metadata
    model_version VARCHAR(50),
    generation_time_ms INTEGER,
    token_usage JSONB,

    -- Cache management
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'), -- Cache for 24 hours
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_ai_cache_document_action ON ai_action_cache(document_id, action_type);
CREATE INDEX idx_ai_cache_expires ON ai_action_cache(expires_at);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE document_insights IS 'AI-extracted insights from documents (clauses, PII, financial terms, risks, etc.)';
COMMENT ON TABLE document_summaries IS 'AI-generated document summaries (cached from upload-time processing)';
COMMENT ON TABLE document_key_terms IS 'AI-extracted key terms with definitions and importance levels';
COMMENT ON TABLE document_multimodal_analysis IS 'AI analysis of images, tables, charts, signatures, and embedded media';
COMMENT ON TABLE generated_documents IS 'User-generated documents created using AI from source documents';
COMMENT ON TABLE ai_action_cache IS 'Temporary cache for on-demand AI actions (24-hour TTL)';

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_document_insights_updated_at BEFORE UPDATE ON document_insights
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_generated_documents_updated_at BEFORE UPDATE ON generated_documents
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ============================================
-- CLEANUP JOB FOR EXPIRED CACHE
-- ============================================

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_ai_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM ai_action_cache WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Note: Schedule this function to run periodically (e.g., daily via cron or pg_cron extension)
-- Example with pg_cron: SELECT cron.schedule('cleanup-ai-cache', '0 2 * * *', 'SELECT cleanup_expired_ai_cache();');

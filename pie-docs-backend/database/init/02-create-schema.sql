-- ============================================
-- Documents Table - Main document storage
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Document metadata
    title VARCHAR(500) NOT NULL,
    content TEXT,
    document_type VARCHAR(100),
    file_path VARCHAR(1000),
    mime_type VARCHAR(100),
    file_size BIGINT,

    -- Author and timestamps
    author VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Flexible metadata and tags
    metadata JSONB DEFAULT '{}'::jsonb,
    tags TEXT[],

    -- OCR extracted data
    ocr_text TEXT,
    ocr_confidence FLOAT,

    -- URLs for file access
    thumbnail_url VARCHAR(1000),
    preview_url VARCHAR(1000),
    download_url VARCHAR(1000),

    -- Vector embeddings for semantic search
    -- Using 1536 dimensions (OpenAI text-embedding-ada-002)
    -- Can be adjusted based on embedding model used
    embedding vector(1536),

    -- Full-text search vector (auto-generated)
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(content, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(ocr_text, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(author, '')), 'D')
    ) STORED
);

-- ============================================
-- Document Chunks Table - For RAG chunking
-- ============================================
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Chunk information
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,

    -- Chunk metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Vector embedding for this chunk
    embedding vector(1536),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure unique chunks per document
    UNIQUE(document_id, chunk_index)
);

-- ============================================
-- Search History Table - Track searches
-- ============================================
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query TEXT NOT NULL,
    search_type VARCHAR(50),  -- 'semantic', 'keyword', 'hybrid'
    results_count INTEGER,
    filters JSONB,
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Performance Indexes
-- ============================================

-- Vector similarity search indexes (IVFFlat for fast approximate search)
CREATE INDEX IF NOT EXISTS idx_documents_embedding
ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_chunks_embedding
ON document_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_documents_search_vector
ON documents USING gin(search_vector);

-- Standard indexes for filtering and sorting
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_modified_at ON documents(modified_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_author ON documents(author);

-- Array and JSONB indexes
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING gin(metadata);

-- Chunk indexes
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_created_at ON document_chunks(created_at DESC);

-- Search history indexes
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);

-- ============================================
-- Helper Functions
-- ============================================

-- Update modified_at timestamp automatically
CREATE OR REPLACE FUNCTION update_modified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_modtime
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_timestamp();

-- ============================================
-- Semantic Search Function (Documents)
-- ============================================
CREATE OR REPLACE FUNCTION search_documents_semantic(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    content TEXT,
    document_type VARCHAR,
    author VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    tags TEXT[],
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.title,
        d.content,
        d.document_type,
        d.author,
        d.created_at,
        d.metadata,
        d.tags,
        1 - (d.embedding <=> query_embedding) as similarity
    FROM documents d
    WHERE d.embedding IS NOT NULL
        AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- Semantic Search Function (Chunks)
-- ============================================
CREATE OR REPLACE FUNCTION search_chunks_semantic(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 20
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    content TEXT,
    chunk_index INTEGER,
    similarity float,
    metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id as chunk_id,
        c.document_id,
        c.content,
        c.chunk_index,
        1 - (c.embedding <=> query_embedding) as similarity,
        c.metadata
    FROM document_chunks c
    WHERE c.embedding IS NOT NULL
        AND 1 - (c.embedding <=> query_embedding) > match_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- Hybrid Search Function (Semantic + Keyword)
-- ============================================
CREATE OR REPLACE FUNCTION search_documents_hybrid(
    query_text TEXT,
    query_embedding vector(1536),
    semantic_weight float DEFAULT 0.7,
    keyword_weight float DEFAULT 0.3,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    content TEXT,
    document_type VARCHAR,
    author VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    tags TEXT[],
    similarity float,
    keyword_rank float,
    combined_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.title,
        d.content,
        d.document_type,
        d.author,
        d.created_at,
        d.metadata,
        d.tags,
        1 - (d.embedding <=> query_embedding) as similarity,
        ts_rank(d.search_vector, plainto_tsquery('english', query_text)) as keyword_rank,
        (semantic_weight * (1 - (d.embedding <=> query_embedding))) +
        (keyword_weight * ts_rank(d.search_vector, plainto_tsquery('english', query_text))) as combined_score
    FROM documents d
    WHERE d.embedding IS NOT NULL
        AND (
            d.search_vector @@ plainto_tsquery('english', query_text)
            OR (1 - (d.embedding <=> query_embedding)) > 0.5
        )
    ORDER BY combined_score DESC
    LIMIT match_count;
END;
$$;

COMMENT ON TABLE documents IS 'Main document storage with vector embeddings for semantic search';
COMMENT ON TABLE document_chunks IS 'Document chunks for Retrieval-Augmented Generation (RAG)';
COMMENT ON TABLE search_history IS 'Search query history for analytics and recommendations';

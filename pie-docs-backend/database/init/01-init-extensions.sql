-- Enable required extensions for RAG and semantic search
CREATE EXTENSION IF NOT EXISTS vector;           -- pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS pg_trgm;          -- Trigram matching for fuzzy text search
CREATE EXTENSION IF NOT EXISTS btree_gin;        -- Better indexing for JSONB
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation

-- Verify extensions
SELECT extname, extversion FROM pg_extension WHERE extname IN ('vector', 'pg_trgm', 'btree_gin', 'uuid-ossp');

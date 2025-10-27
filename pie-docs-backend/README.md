# PieDocs Backend - RAG & Semantic Search

Backend API for PieDocs with PostgreSQL + pgvector for Retrieval-Augmented Generation (RAG) and semantic search.

## Database Setup

### Prerequisites
- Docker Desktop installed and running

### Start Database

```bash
cd pie-docs-backend
docker-compose up -d
```

This will:
- Start PostgreSQL 16 with pgvector extension
- Create `piedocs` database
- Run initialization scripts to create schema
- Insert sample documents for testing
- Expose on port **5434** (to avoid conflicts)

### Database Connection Details

```
Host: localhost
Port: 5434
Database: piedocs
Username: piedocs
Password: piedocs123
```

### Verify Installation

```bash
# Check if container is running
docker ps | grep piedocs-postgres

# Check database health
docker-compose exec db pg_isready -U piedocs

# Connect to database
docker-compose exec db psql -U piedocs -d piedocs

# Inside psql, verify extensions:
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

# Check sample documents:
SELECT title, document_type FROM documents;

# Exit psql
\q
```

### Database Schema

#### Tables

**documents** - Main document storage
- `id` (UUID) - Primary key
- `title` - Document title
- `content` - Full text content
- `document_type` - Type of document (Invoice, Report, etc.)
- `embedding` - Vector embedding (1536 dimensions)
- `search_vector` - Full-text search vector (auto-generated)
- `metadata` - JSONB for flexible attributes
- `tags` - Array of tags
- OCR fields, URLs, timestamps, etc.

**document_chunks** - RAG chunks
- `id` (UUID) - Primary key
- `document_id` - Foreign key to documents
- `chunk_index` - Order of chunk in document
- `content` - Chunk text
- `embedding` - Vector embedding for chunk
- `metadata` - Chunk-specific metadata

**search_history** - Search analytics
- Query tracking
- Search type (semantic/keyword/hybrid)
- User and session tracking

#### Functions

**search_documents_semantic(embedding, threshold, count)**
- Semantic search using vector similarity
- Returns documents with similarity scores

**search_chunks_semantic(embedding, threshold, count)**
- Semantic search on document chunks
- Returns relevant chunks with context

**search_documents_hybrid(query, embedding, weights, count)**
- Combines semantic and keyword search
- Configurable weighting between approaches

### Stop Database

```bash
docker-compose down
```

To remove all data:
```bash
docker-compose down -v
```

## Next Steps

1. ✅ Database with pgvector running
2. [ ] Create Python FastAPI backend
3. [ ] Implement embedding generation
4. [ ] Create RAG endpoints
5. [ ] Connect frontend to backend

## Environment Variables

See `.env.example` for backend configuration.

## Technology Stack

- **Database**: PostgreSQL 16
- **Vector Search**: pgvector (0.8.0)
- **Extensions**: pg_trgm, btree_gin, uuid-ossp
- **Container**: Docker + Docker Compose

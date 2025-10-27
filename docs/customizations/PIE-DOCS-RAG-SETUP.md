# PieDocs RAG & Semantic Search - POC Setup Complete

## ✅ What's Been Installed & Configured

### 1. Database - PostgreSQL 16 + pgvector
- **Container**: `piedocs-postgres` (Docker)
- **Port**: 5434
- **Database**: `piedocs`
- **User/Password**: `piedocs`/`piedocs123`
- **Extensions Installed**:
  - `pgvector` v0.8.1 - Vector similarity search
  - `pg_trgm` - Trigram text search
  - `btree_gin` - JSONB indexing
  - `uuid-ossp` - UUID generation

### 2. Database Schema

**Tables Created**:
- `documents` - Main document storage with vector embeddings (1536 dimensions)
- `document_chunks` - Document chunks for RAG
- `search_history` - Search analytics

**Functions Created**:
- `search_documents_semantic()` - Semantic search using vector similarity
- `search_chunks_semantic()` - RAG chunk search
- `search_documents_hybrid()` - Combined semantic + keyword search

**Sample Data**: 3 documents with embeddings loaded

### 3. Backend API - Python FastAPI
- **Location**: `pie-docs-backend/`
- **Port**: 8001
- **Status**: ✅ Running
- **URL**: http://localhost:8001

**Technology Stack**:
- FastAPI - Web framework
- Sentence Transformers - Embeddings (all-MiniLM-L6-v2 model)
- psycopg2 - PostgreSQL driver
- pgvector integration

**API Endpoints**:
```
GET  /                                    - API info
GET  /health                              - Health check
GET  /api/v1/documents                    - List documents
POST /api/v1/documents                    - Create document
GET  /api/v1/documents/{id}               - Get document
POST /api/v1/search                       - Semantic/hybrid search
POST /api/v1/rag/query                    - RAG query with context
GET  /api/v1/rag/suggestions              - Get suggested queries
POST /api/v1/admin/regenerate-embeddings/{id}   - Regenerate document embeddings
POST /api/v1/admin/regenerate-all-embeddings    - Regenerate all embeddings
```

### 4. Frontend Configuration
- **RAG API URL**: Added to `.env.local`
- **Variable**: `VITE_RAG_API_URL=http://localhost:8001/api/v1`

---

## 🚀 How to Start Everything

### Start Database
```bash
cd pie-docs-backend
docker-compose up -d
```

### Start Backend API
```bash
cd pie-docs-backend
python -c "import sys; sys.path.insert(0, '.'); from app.main import app; import uvicorn; uvicorn.run(app, host='0.0.0.0', port=8001)"
```

### Start Frontend
```bash
cd pie-docs-frontend
npm run dev
```

---

## 📊 Testing the RAG System

### 1. Check Health
```bash
curl http://localhost:8001/health
```

### 2. Semantic Search
```bash
curl -X POST http://localhost:8001/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{"query": "invoice", "search_type": "semantic"}'
```

### 3. RAG Query
```bash
curl -X POST http://localhost:8001/api/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the Document Problem?"}'
```

### 4. List Documents
```bash
curl http://localhost:8001/api/v1/documents
```

### 5. Interactive API Docs
Open in browser: http://localhost:8001/docs

---

## 🗄️ Database Access

### Connect to Database
```bash
docker exec -it piedocs-postgres psql -U piedocs -d piedocs
```

### Useful SQL Queries
```sql
-- Check documents with embeddings
SELECT id, title, embedding IS NOT NULL as has_embedding FROM documents;

-- Check chunks
SELECT COUNT(*) FROM document_chunks;

-- View search history
SELECT * FROM search_history ORDER BY created_at DESC LIMIT 10;

-- Test semantic search (example)
SELECT id, title, 1 - (embedding <=> '[0.1, 0.2, ...]'::vector) as similarity
FROM documents
ORDER BY similarity DESC
LIMIT 5;
```

---

## 📁 Project Structure

```
pie-docs-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application
│   ├── config.py               # Configuration management
│   ├── database.py             # Database connection
│   ├── embedding_service.py    # Embedding generation
│   └── rag_service.py          # RAG implementation
├── database/
│   └── init/
│       ├── 01-init-extensions.sql
│       ├── 02-create-schema.sql
│       └── 03-sample-data.sql
├── docker-compose.yml
├── requirements.txt
├── .env
└── README.md
```

---

## 🔧 Configuration Files

### Backend `.env`
```bash
DATABASE_URL=postgresql://piedocs:piedocs123@localhost:5434/piedocs
EMBEDDING_MODEL=sentence-transformers
SENTENCE_TRANSFORMER_MODEL=all-MiniLM-L6-v2
API_PORT=8001
CHUNK_SIZE=500
SIMILARITY_THRESHOLD=0.7
TOP_K_RESULTS=5
```

### Frontend `.env.local`
```bash
VITE_RAG_API_URL=http://localhost:8001/api/v1
```

---

## 🎯 Next Steps for POC

### 1. Frontend Integration
Update `documentRAGService.ts` to use the real backend:
```typescript
const RAG_API_URL = import.meta.env.VITE_RAG_API_URL;

async function queryRAG(query: string) {
  const response = await fetch(`${RAG_API_URL}/rag/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return response.json();
}
```

### 2. Document Upload Integration
When users upload documents, send to RAG backend:
```typescript
async function indexDocument(document) {
  await fetch(`${RAG_API_URL}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: document.title,
      content: document.content,
      document_type: document.type,
      author: document.author,
      tags: document.tags,
      metadata: document.metadata
    })
  });
}
```

### 3. Search Enhancement
Replace mock semantic search with real vector search from backend

### 4. Tune Performance
- Adjust `SIMILARITY_THRESHOLD` in `.env` (currently 0.7)
- Modify `CHUNK_SIZE` for better context
- Consider using OpenAI embeddings for higher quality (requires API key)

---

## 🐛 Troubleshooting

### Backend Not Starting
```bash
# Check if port 8001 is available
netstat -ano | findstr :8001

# View backend logs
cd pie-docs-backend
python app/main.py
```

### Database Connection Issues
```bash
# Check if container is running
docker ps | grep piedocs

# View database logs
docker logs piedocs-postgres

# Restart database
docker-compose restart
```

### No Search Results
The similarity threshold might be too high. Lower it in `.env`:
```bash
SIMILARITY_THRESHOLD=0.5  # or even 0.3 for testing
```

---

## 📝 Sample Documents in Database

1. **Mannlowe Information Services Invoice** - DOM-23-24-00088
   - Amount: ₹1,06,200.00
   - Service: ERPNext Implementation

2. **Freshworks Software License Invoice** - FS245576
   - Amount: $1,649.99 USD
   - Product: Freshservice Enterprise

3. **The Decisive Enterprise White Paper**
   - Topic: Modern Intelligence Stack
   - Keywords: Document Problem, IDP, Automation

---

## 🔑 Key Features Implemented

✅ Vector embeddings using Sentence Transformers
✅ Semantic search with cosine similarity
✅ RAG (Retrieval-Augmented Generation)
✅ Document chunking for context
✅ Hybrid search (semantic + keyword)
✅ Full-text search with PostgreSQL
✅ API documentation (FastAPI Swagger)
✅ Docker containerization
✅ Connection pooling
✅ Search history tracking

---

## 🎨 POC Demo Scenarios

### Scenario 1: Smart Invoice Search
"Find all invoices from December 2023" → Returns Mannlowe invoice

### Scenario 2: Concept Questions
"What is the Document Problem?" → RAG returns explanation from white paper

### Scenario 3: Vendor Search
"Show me Freshworks related documents" → Returns software license

### Scenario 4: Semantic Understanding
"automation challenges" → Finds white paper discussing intelligence gap

---

**Status**: ✅ **Ready for POC Demonstration**

Backend running at: http://localhost:8001
Database running at: localhost:5434
API Docs: http://localhost:8001/docs

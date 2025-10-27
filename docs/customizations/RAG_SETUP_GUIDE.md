# RAG System Setup Guide for Pie-Docs

## Overview

Pie-Docs now includes a fully functional **Retrieval-Augmented Generation (RAG)** system that allows intelligent question-answering over your document database using semantic search and LLM-powered responses.

### Architecture

```
┌─────────────────┐
│   Frontend      │
│  (React/TS)     │
│                 │
│ documentRAG     │
│ Service         │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│   Backend       │
│  (FastAPI/Py)   │
│                 │
│ ┌─────────────┐ │
│ │ RAG Service │ │
│ └──────┬──────┘ │
│        │        │
│   ┌────┴────┐   │
│   │         │   │
│ ┌─▼──┐  ┌──▼─┐ │
│ │LLM │  │Emb.│ │
│ │Svc │  │Svc │ │
│ └────┘  └────┘ │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL     │
│  + pgvector     │
│                 │
│ • documents     │
│ • chunks        │
│ • embeddings    │
└─────────────────┘
```

---

## Current Status

### ✅ What's Working

1. **Vector Database (100%)**
   - PostgreSQL with pgvector extension
   - Document and chunk tables with 1536D embeddings
   - IVFFlat indexes for fast similarity search
   - Semantic search functions

2. **Embedding Service (100%)**
   - Local sentence-transformers (all-MiniLM-L6-v2)
   - Fast, free, no API costs
   - Single and batch embedding generation
   - Auto-padding to 1536 dimensions

3. **RAG Pipeline (100%)**
   - Text chunking with overlap
   - Semantic search on documents/chunks
   - Hybrid search (semantic + keyword)
   - Context building for LLM

4. **API Endpoints (100%)**
   - `/api/v1/rag/query` - Ask questions
   - `/api/v1/search` - Semantic/hybrid search
   - `/api/v1/rag/suggestions` - Query suggestions
   - `/api/v1/admin/regenerate-embeddings` - Reindex

5. **Frontend Integration (100%)**
   - documentRAGService connected to backend
   - Auto-fallback to mock data if backend unavailable
   - Chat interface in AIChatPage.tsx

### ⚠️ What Needs Configuration

**LLM for Response Generation (Optional but Recommended)**

Currently using template-based responses. For production-quality AI responses, configure one of:
- **OpenAI** (easiest, paid)
- **Anthropic Claude** (paid)
- **Ollama** (free, local)

---

## Quick Start (5 Minutes)

### 1. Verify Backend is Running

```bash
cd pie-docs-backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Check health:
```bash
curl http://localhost:8001/health
```

### 2. Verify Frontend is Running

```bash
cd pie-docs-frontend
npm run dev
```

### 3. Test RAG System

Navigate to AI Chat page in the frontend and try:
- "What documents do we have?"
- "Show me invoice information"
- "Explain intelligent document processing"

---

## LLM Setup (Production-Quality Responses)

### Option 1: OpenAI (Recommended for Production)

**Cost:** ~$20-50/month for moderate usage

1. Get API key from https://platform.openai.com/api-keys

2. Update `.env`:
```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini  # Cost-effective
```

3. Install dependency:
```bash
pip install openai
```

4. Restart backend - Done!

**Expected Response Quality:**
- Natural, conversational answers
- Accurate source attribution
- Handles complex queries
- Cites specific documents

---

### Option 2: Anthropic Claude (Alternative)

**Cost:** Similar to OpenAI

1. Get API key from https://console.anthropic.com/

2. Update `.env`:
```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-3-haiku-20240307
```

3. Install dependency:
```bash
pip install anthropic
```

4. Restart backend

---

### Option 3: Ollama (Free, Local)

**Cost:** $0 (but requires GPU or slow CPU)

1. Install Ollama:
```bash
# Windows/Mac/Linux
curl https://ollama.ai/install.sh | sh

# Or download from https://ollama.com/download
```

2. Pull a model:
```bash
ollama pull llama3.2  # ~4GB
# or
ollama pull mistral   # ~4GB
```

3. Start Ollama server:
```bash
ollama serve
```

4. Update `.env`:
```bash
LLM_PROVIDER=ollama
OLLAMA_MODEL=llama3.2
```

5. Restart backend

**Trade-offs:**
- ✅ Free, private, no API costs
- ⚠️ Slower responses (5-10 seconds)
- ⚠️ Requires ~8GB RAM
- ⚠️ Lower quality than GPT-4

---

## Adding Documents to RAG

### Method 1: Via API (Automatic Embeddings)

```bash
curl -X POST http://localhost:8001/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Project Requirements",
    "content": "The system must support semantic search...",
    "document_type": "Requirements",
    "author": "John Doe",
    "tags": ["requirements", "search"],
    "metadata": {"priority": "high"}
  }'
```

Embeddings are generated automatically!

### Method 2: Bulk Reindexing

If you have existing documents without embeddings:

```bash
curl -X POST http://localhost:8001/api/v1/admin/regenerate-all-embeddings
```

### Method 3: Via Frontend Upload

Documents uploaded through the frontend will automatically:
1. Store in database
2. Generate embeddings
3. Create chunks
4. Index for search

---

## Testing RAG Queries

### Via API

```bash
curl -X POST http://localhost:8001/api/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the main requirements for the search feature?",
    "top_k": 5
  }'
```

**Response:**
```json
{
  "answer": "Based on the Project Requirements document, the main requirements are...",
  "relevant_chunks": [
    {
      "content": "The system must support semantic search...",
      "document_title": "Project Requirements",
      "similarity": 0.89
    }
  ],
  "confidence": 0.89,
  "sources": [
    {
      "title": "Project Requirements",
      "document_type": "Requirements",
      "chunks": [...]
    }
  ]
}
```

### Via Frontend

1. Navigate to `/chat` or AI Chat page
2. Type your question
3. Get AI-powered response with source attribution

---

## Configuration Reference

### Environment Variables (.env)

```bash
# Database
DATABASE_URL=postgresql://piedocs:piedocs123@localhost:5434/piedocs

# Embeddings (Local, Free)
EMBEDDING_MODEL=sentence-transformers
SENTENCE_TRANSFORMER_MODEL=all-MiniLM-L6-v2

# LLM Provider (choose one)
LLM_PROVIDER=none  # Change to: openai, anthropic, or ollama

# OpenAI (if using)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Anthropic (if using)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-haiku-20240307

# Ollama (if using)
OLLAMA_MODEL=llama3.2

# RAG Parameters
CHUNK_SIZE=500              # Words per chunk
CHUNK_OVERLAP=50            # Overlap between chunks
SIMILARITY_THRESHOLD=0.7    # Minimum similarity score
TOP_K_RESULTS=5             # Number of results to return
```

---

## Performance Tuning

### Chunk Size

- **Small (200-300):** Better for precise answers, more chunks
- **Medium (500):** Balanced (default)
- **Large (1000):** Better for context, fewer chunks

```bash
CHUNK_SIZE=500
CHUNK_OVERLAP=50
```

### Similarity Threshold

- **0.5:** More permissive, returns more results
- **0.7:** Balanced (default)
- **0.9:** Very strict, only highly relevant results

```bash
SIMILARITY_THRESHOLD=0.7
```

### Index Optimization

For large document collections (>10K documents):

```sql
-- Increase IVFFlat lists for better performance
DROP INDEX IF EXISTS idx_documents_embedding;
CREATE INDEX idx_documents_embedding
ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 1000);  -- Default is 100
```

---

## Monitoring & Logging

### Check LLM Status

```bash
curl http://localhost:8001/api/v1/status
```

Response shows:
- LLM provider configured
- Model being used
- Database connection status
- Number of indexed documents

### Backend Logs

```bash
# In pie-docs-backend directory
tail -f logs/app.log  # If logging to file

# Or watch uvicorn output
# Shows:
# - "Generated LLM response using openai"
# - "Using template-based response (no LLM configured)"
```

### Search Analytics

Track queries:
```sql
SELECT
  query,
  search_type,
  results_count,
  created_at
FROM search_history
ORDER BY created_at DESC
LIMIT 20;
```

---

## Cost Estimates

### Embedding Costs (FREE)
- Using local sentence-transformers
- No API costs
- **$0/month**

### LLM Costs (If Using Cloud)

#### OpenAI GPT-4o-mini
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens
- Average query: ~500 input + 200 output tokens
- **~$20-50/month** for 1000-2000 queries/month

#### Anthropic Claude Haiku
- Input: $0.25 / 1M tokens
- Output: $1.25 / 1M tokens
- Similar costs to OpenAI

#### Ollama (Local)
- **$0/month**
- Hardware: 8GB+ RAM recommended

---

## Troubleshooting

### "RAG Backend unavailable" in Frontend

**Problem:** Frontend can't connect to backend

**Solutions:**
1. Check backend is running on port 8001
2. Check CORS settings in .env
3. Verify `VITE_API_BASE_URL` in frontend .env

```bash
# pie-docs-frontend/.env
VITE_API_BASE_URL=http://localhost:8001
```

### "No relevant chunks found"

**Problem:** Database has no documents or embeddings

**Solutions:**
1. Add documents via API
2. Regenerate embeddings:
```bash
curl -X POST http://localhost:8001/api/v1/admin/regenerate-all-embeddings
```

### "LLM service not available"

**Problem:** LLM_PROVIDER set but package not installed

**Solutions:**
```bash
# For OpenAI
pip install openai

# For Anthropic
pip install anthropic

# For Ollama
# Start ollama server
ollama serve
```

### Slow Responses

**Causes:**
- Large chunk sizes
- Too many results (high TOP_K)
- Ollama on CPU
- No IVFFlat indexes

**Solutions:**
1. Reduce chunk size:
```bash
CHUNK_SIZE=300
TOP_K_RESULTS=3
```

2. Verify indexes exist:
```sql
SELECT indexname FROM pg_indexes
WHERE tablename IN ('documents', 'document_chunks');
```

---

## Production Checklist

Before deploying RAG to production:

- [ ] Configure LLM provider (OpenAI/Anthropic recommended)
- [ ] Set appropriate chunk size and overlap
- [ ] Test with representative queries
- [ ] Monitor API response times (<2s ideal)
- [ ] Set up search analytics
- [ ] Configure rate limiting for expensive LLM calls
- [ ] Add API authentication for admin endpoints
- [ ] Test with large document sets (>1000 docs)
- [ ] Verify embedding generation on document upload
- [ ] Set up error tracking (Sentry, etc.)

---

## Next Steps

1. **Add More Documents**
   - Upload via frontend
   - Bulk import via API
   - Connect to existing document store

2. **Improve Responses**
   - Configure OpenAI/Anthropic
   - Fine-tune prompts in `llm_service.py`
   - Adjust chunk sizes

3. **Advanced Features**
   - Conversational history
   - Multi-turn conversations
   - Source citations in UI
   - Relevance feedback

4. **Scale**
   - Add Redis caching for embeddings
   - Implement query result caching
   - Set up async processing for large uploads

---

## Support

For issues or questions:
- Backend: Check `app/rag_service.py` and `app/llm_service.py`
- Frontend: Check `services/documentRAGService.ts`
- Database: Check `database/init/02-create-schema.sql`

**RAG Status Dashboard:** Visit `/api/v1/status` for system health

**Test Endpoint:** `/api/v1/rag/suggestions` for sample queries

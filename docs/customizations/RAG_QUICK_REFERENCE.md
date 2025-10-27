# RAG Quick Reference Card

## 🚀 Quick Start Commands

```bash
# Start Backend
cd pie-docs-backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# Start Frontend
cd pie-docs-frontend
npm run dev

# Test RAG Endpoint
curl -X POST http://localhost:8001/api/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What documents do we have?", "top_k": 5}'
```

---

## 📋 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/rag/query` | POST | Ask questions about documents |
| `/api/v1/search` | POST | Semantic/hybrid search |
| `/api/v1/rag/suggestions` | GET | Get suggested queries |
| `/api/v1/documents` | GET/POST | List or create documents |
| `/api/v1/status` | GET | System health & LLM status |
| `/api/v1/admin/regenerate-embeddings/{id}` | POST | Reindex single document |
| `/api/v1/admin/regenerate-all-embeddings` | POST | Reindex all documents |

---

## ⚙️ LLM Setup (One Command Each)

### OpenAI (Easiest)
```bash
pip install openai
# Add to .env:
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
```

### Anthropic
```bash
pip install anthropic
# Add to .env:
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Ollama (Free/Local)
```bash
curl https://ollama.ai/install.sh | sh
ollama pull llama3.2
ollama serve
# Add to .env:
LLM_PROVIDER=ollama
```

---

## 🔍 Example Queries

```bash
# Basic Query
curl -X POST http://localhost:8001/api/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the system requirements?"}'

# Search with More Results
curl -X POST http://localhost:8001/api/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Find all invoices", "top_k": 10}'

# Semantic Search
curl -X POST http://localhost:8001/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{"query": "automation", "search_type": "semantic", "top_k": 5}'

# Add Document (Auto-generates embeddings)
curl -X POST http://localhost:8001/api/v1/documents \
  -H "Content-Type": application/json" \
  -d '{
    "title": "New Document",
    "content": "Document content here...",
    "document_type": "Report",
    "author": "User",
    "tags": ["tag1", "tag2"]
  }'
```

---

## 📊 Response Format

```json
{
  "answer": "AI-generated answer based on documents...",
  "relevant_chunks": [
    {
      "content": "Relevant document excerpt...",
      "document_title": "Source Document",
      "similarity": 0.89
    }
  ],
  "confidence": 0.85,
  "sources": [
    {
      "title": "Source Document",
      "document_type": "PDF",
      "chunks": [...]
    }
  ]
}
```

---

## 🛠️ Configuration (.env)

```bash
# Core Settings
DATABASE_URL=postgresql://user:pass@host:port/dbname
EMBEDDING_MODEL=sentence-transformers
SENTENCE_TRANSFORMER_MODEL=all-MiniLM-L6-v2

# LLM Provider (choose one)
LLM_PROVIDER=none  # or: openai, anthropic, ollama
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# RAG Parameters
CHUNK_SIZE=500
CHUNK_OVERLAP=50
SIMILARITY_THRESHOLD=0.7
TOP_K_RESULTS=5
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Backend unavailable" | Check backend is running on port 8001 |
| "No relevant chunks" | Add documents or regenerate embeddings |
| "LLM not available" | Install LLM package: `pip install openai` |
| Slow responses | Reduce CHUNK_SIZE or TOP_K_RESULTS |
| No embeddings | POST to `/api/v1/admin/regenerate-all-embeddings` |

---

## 📈 Current Status

✅ **Working Now:**
- Vector database with pgvector
- Sentence transformer embeddings (local, free)
- Semantic & hybrid search
- API endpoints functional
- Frontend connected to backend
- Auto-embedding on document upload

⚠️ **Optional Setup:**
- LLM for AI-powered responses (OpenAI/Anthropic/Ollama)
  - Without LLM: Template-based responses ✅
  - With LLM: Natural language responses 🎯

---

## 💰 Cost Summary

| Component | Cost |
|-----------|------|
| Embeddings (sentence-transformers) | **$0/month** |
| Vector DB (PostgreSQL + pgvector) | **$0/month** |
| LLM - None (template responses) | **$0/month** |
| LLM - OpenAI GPT-4o-mini | **~$20-50/month** |
| LLM - Anthropic Claude Haiku | **~$20-50/month** |
| LLM - Ollama (local) | **$0/month** |

**Recommended:** Start with no LLM (free), add OpenAI later if needed.

---

## 📚 Key Files

| File | Purpose |
|------|---------|
| `app/rag_service.py` | RAG pipeline & search logic |
| `app/llm_service.py` | LLM provider integration |
| `app/embedding_service.py` | Embedding generation |
| `services/documentRAGService.ts` | Frontend RAG client |
| `database/init/02-create-schema.sql` | Vector DB schema |
| `.env` | Configuration |

---

## 🎯 Performance Targets

- **Query Response Time:** <2s (without LLM), <5s (with LLM)
- **Embedding Generation:** <1s per document
- **Chunk Generation:** <0.5s per document
- **Search Latency:** <500ms

---

## ✅ Production Checklist

- [ ] Backend running and healthy
- [ ] Frontend connected
- [ ] Documents indexed with embeddings
- [ ] LLM provider configured (optional)
- [ ] Test queries working
- [ ] Monitor response times
- [ ] Set up logging/analytics

---

**Full Documentation:** See `RAG_SETUP_GUIDE.md`

**Status Check:** `GET /api/v1/status`

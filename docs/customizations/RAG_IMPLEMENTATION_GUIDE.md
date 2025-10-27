# 🚀 RAG Implementation Guide for Pie-Docs Search

## Overview

This guide covers the **complete RAG (Retrieval-Augmented Generation)** implementation for the Pie-Docs search page. The system now supports advanced semantic search, chunk-level retrieval, and AI-powered Q&A with source attribution.

---

## 🎯 What Was Implemented

### **Backend Enhancements** (Python/FastAPI)

#### **New API Endpoints**

1. **`POST /api/v1/search/rag`**
   - RAG Q&A with AI-generated answers
   - Returns: answer, confidence score, relevant chunks, source documents
   - Example:
     ```json
     {
       "query": "What are the main financial highlights?",
       "top_k": 5
     }
     ```

2. **`POST /api/v1/search/chunks`**
   - Direct chunk-level semantic search
   - Returns: document chunks with similarity scores
   - Example:
     ```json
     {
       "query": "security protocols",
       "top_k": 10
     }
     ```

3. **`GET /api/v1/search/similar/{document_id}`**
   - Find semantically similar documents
   - Uses vector similarity (cosine distance)
   - Returns: similar documents with similarity scores

#### **Existing Services Enhanced**

- ✅ `rag_service.py` - Chunking, embedding generation, RAG response
- ✅ `embedding_service.py` - Sentence-transformers (384-dim → 1536-dim)
- ✅ Database functions: `search_chunks_semantic()`, `search_documents_hybrid()`

---

### **Frontend Components** (React/TypeScript)

#### **New Components Created**

1. **`RAGSearchResults.tsx`**
   - Displays AI-generated answers with source attribution
   - Shows confidence scores and relevant chunks
   - Visual similarity indicators

2. **`RAGQueryInterface.tsx`**
   - Natural language query input
   - Example questions
   - Loading states

3. **`ChunkSearchResults.tsx`**
   - Displays document chunks grouped by document
   - Similarity scores with visual progress bars
   - Expandable chunks for full content

#### **Enhanced Services**

- ✅ `searchService.ts` - Added `ragQuery()`, `searchChunks()`, `findSimilarDocuments()`
- ✅ `SearchPage.tsx` - Integrated RAG components in semantic search tab

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USER QUERY                          │
│              "What are the financial highlights?"           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  RAGQueryInterface → searchService.ragQuery()        │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP POST /api/v1/search/rag
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Generate query embedding (sentence-transformers) │  │
│  │  2. Search document chunks (vector similarity)       │  │
│  │  3. Retrieve top-k relevant chunks                   │  │
│  │  4. Generate RAG response (LLM or template)          │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE (PostgreSQL + pgvector)           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Tables:                                             │  │
│  │  • documents (embedding vector(1536))                │  │
│  │  • document_chunks (embedding vector(1536))          │  │
│  │                                                       │  │
│  │  Functions:                                          │  │
│  │  • search_chunks_semantic(query_embedding, ...)     │  │
│  │  • search_documents_hybrid(query_text, ...)         │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      RESPONSE                               │
│  {                                                          │
│    "answer": "The financial highlights include...",        │
│    "confidence": 0.87,                                      │
│    "relevant_chunks": [...],                                │
│    "sources": [...]                                         │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema (RAG-Related)

### **Core Tables**

#### `documents`
```sql
- id: UUID
- title: VARCHAR(500)
- content: TEXT
- embedding: vector(1536)  ← Semantic embedding
- search_vector: tsvector   ← Full-text search
- ocr_text: TEXT
- metadata: JSONB
- tags: TEXT[]
```

#### `document_chunks`
```sql
- id: UUID
- document_id: UUID (FK → documents)
- chunk_index: INTEGER
- content: TEXT
- embedding: vector(1536)  ← Chunk-level embedding
- token_count: INTEGER
- metadata: JSONB
```

### **Key Functions**

```sql
-- Semantic search on chunks
search_chunks_semantic(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)

-- Hybrid search (semantic + keyword)
search_documents_hybrid(
  query_text TEXT,
  query_embedding vector(1536),
  semantic_weight float,
  keyword_weight float,
  match_count int
)
```

---

## 🔧 Configuration

### **Backend Settings** (`config.py` or `.env`)

```python
# Embedding Configuration
SENTENCE_TRANSFORMER_MODEL = "all-MiniLM-L6-v2"  # 384-dim, padded to 1536

# RAG Configuration
CHUNK_SIZE = 200  # words per chunk
CHUNK_OVERLAP = 50  # overlapping words
TOP_K_RESULTS = 10  # default number of results
SIMILARITY_THRESHOLD = 0.1  # minimum similarity score

# Database
DATABASE_URL = "postgresql://piedocs:password@localhost:5432/piedocs"
```

### **Frontend Configuration**

```typescript
// searchService.ts
const baseUrl = 'http://localhost:8001/api/v1';
```

---

## 🧪 Testing the RAG Implementation

### **Step 1: Verify Backend API**

```bash
# Test RAG endpoint
curl -X POST "http://localhost:8001/api/v1/search/rag" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the main topics in financial reports?",
    "top_k": 5
  }'

# Test chunk search
curl -X POST "http://localhost:8001/api/v1/search/chunks" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "security protocols",
    "top_k": 10
  }'

# Test similar documents
curl -X GET "http://localhost:8001/api/v1/search/similar/{document-id}?limit=5"
```

### **Step 2: Test Frontend Interface**

1. **Navigate to Search Page**
   - Go to `/search?tab=semantic`

2. **RAG Query Interface**
   - Type: "What are the main financial highlights?"
   - Click example questions
   - Observe AI-generated answer with sources

3. **Chunk Search**
   - Use the "Search by Chunks" section
   - Enter: "security protocols"
   - Verify chunk results with similarity scores

### **Step 3: Verify Embeddings**

```sql
-- Check documents with embeddings
SELECT
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as docs_with_embeddings,
  COUNT(*) as total_documents
FROM documents;

-- Check chunks with embeddings
SELECT
  COUNT(*) as total_chunks,
  AVG(LENGTH(content)) as avg_chunk_length
FROM document_chunks
WHERE embedding IS NOT NULL;
```

---

## 🎨 UI Features

### **RAG Search Results**

- **AI Answer Card**
  - Gradient background (blue → purple)
  - Confidence indicator (High/Medium/Low)
  - Response time display

- **Source Attribution**
  - Document title + type
  - Number of relevant sections
  - Preview of first chunk
  - Similarity percentage

- **Relevant Chunks**
  - Chunk content with context
  - Visual similarity bar (0-100%)
  - Document source label

### **Chunk Search Results**

- **Grouped by Document**
  - Document header with metadata
  - All chunks from that document
  - "View Document" link

- **Chunk Cards**
  - Chunk index number
  - Similarity score bar
  - Expandable content (show more/less)
  - Quality labels (Excellent/Good/Fair/Weak)

---

## 📈 Performance Metrics

### **Expected Response Times**

- **Semantic Search**: 100-300ms
- **RAG Query**: 200-500ms (without LLM), 1-3s (with LLM)
- **Chunk Search**: 150-400ms

### **Similarity Score Guidelines**

- **90-100%**: Excellent match (almost identical content)
- **80-90%**: Very good match (highly relevant)
- **70-80%**: Good match (relevant with some context)
- **60-70%**: Fair match (partially relevant)
- **Below 60%**: Weak match (consider filtering out)

---

## 🔄 Data Flow

### **Document Indexing Flow**

```
1. Document Upload
   ↓
2. OCR Processing (if needed)
   ↓
3. Text Extraction
   ↓
4. Document Chunking (200 words, 50 overlap)
   ↓
5. Embedding Generation
   - Document-level embedding
   - Chunk-level embeddings
   ↓
6. Store in PostgreSQL
   - documents table (with embedding)
   - document_chunks table (with embeddings)
```

### **RAG Query Flow**

```
1. User Query
   ↓
2. Generate Query Embedding
   ↓
3. Vector Similarity Search
   - Search document_chunks table
   - Use cosine distance
   ↓
4. Retrieve Top-K Chunks
   ↓
5. Generate Response
   - LLM-based (if configured)
   - Template-based (fallback)
   ↓
6. Return with Sources
```

---

## 🛠️ Troubleshooting

### **No Results Returned**

1. **Check if documents have embeddings**
   ```sql
   SELECT COUNT(*) FROM documents WHERE embedding IS NOT NULL;
   ```

2. **Verify pgvector extension**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```

3. **Check embedding service**
   ```python
   from app.embedding_service import embedding_service
   embedding = embedding_service.generate_embedding("test")
   print(len(embedding))  # Should be 1536
   ```

### **Low Similarity Scores**

- **Lower the threshold** in `rag_service.py`:
  ```python
  self.similarity_threshold = 0.1  # Try 0.05 or lower
  ```

- **Check chunk size**: Smaller chunks = more specific matches
- **Verify OCR quality**: Poor OCR = poor embeddings

### **Frontend Not Connecting to Backend**

1. **Check CORS settings** in backend
2. **Verify backend is running**: `http://localhost:8001/docs`
3. **Check browser console** for API errors
4. **Verify auth token** (if enabled)

---

## 🚀 Next Steps

### **Enhancements to Consider**

1. **LLM Integration**
   - Configure OpenAI/Anthropic/Ollama for better RAG responses
   - Set `OPENAI_API_KEY` in environment

2. **Re-ranking**
   - Add cross-encoder for better chunk ranking
   - Implement hybrid scoring (semantic + BM25)

3. **Caching**
   - Cache frequent queries
   - Store embedding results

4. **Analytics**
   - Track query performance
   - Monitor similarity score distributions
   - User feedback on RAG answers

5. **Advanced Features**
   - Multi-document summarization
   - Conversation history
   - Follow-up questions
   - Export RAG results

---

## 📚 Additional Resources

- **pgvector Documentation**: https://github.com/pgvector/pgvector
- **Sentence Transformers**: https://www.sbert.net/
- **FastAPI**: https://fastapi.tiangolo.com/
- **React TypeScript**: https://react-typescript-cheatsheet.netlify.app/

---

## ✅ Implementation Checklist

- [x] Backend RAG API endpoints
- [x] Frontend RAG UI components
- [x] Chunk search functionality
- [x] Source attribution display
- [x] Similarity score visualization
- [x] Database schema verification
- [x] API integration
- [x] Error handling
- [ ] LLM integration (optional)
- [ ] Performance optimization
- [ ] User acceptance testing

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Contributors**: Claude Code Implementation Team

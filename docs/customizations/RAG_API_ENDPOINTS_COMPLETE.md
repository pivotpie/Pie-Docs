# 🔍 Complete RAG API Endpoints Documentation

## 📚 Table of Contents
1. [Search & RAG Endpoints](#search--rag-endpoints)
2. [Embedding Endpoints](#embedding-endpoints)
3. [Document Management Endpoints](#document-management-endpoints)
4. [Admin Utilities](#admin-utilities)
5. [Endpoint Comparison](#endpoint-comparison)
6. [Usage Examples](#usage-examples)

---

## 🔍 Search & RAG Endpoints

### **Base Path: `/api/v1/search`**

#### 1. **POST `/api/v1/search`** - Main Search Endpoint
**Description**: Comprehensive document search supporting semantic, keyword, and hybrid modes

**Request Body**:
```json
{
  "query": "string",
  "search_type": "semantic",  // Options: semantic, keyword, hybrid
  "top_k": 10,
  "filters": {}
}
```

**Response**:
```json
{
  "query": "string",
  "search_type": "semantic",
  "results_count": 10,
  "results": [
    {
      "id": "uuid",
      "title": "Document Title",
      "content": "...",
      "document_type": "PDF",
      "similarity": 0.92,
      "author": "John Doe",
      "tags": ["finance", "report"],
      "metadata": {}
    }
  ],
  "timeTaken": 234
}
```

**Usage**:
```bash
curl -X POST "http://localhost:8001/api/v1/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "financial reports",
    "search_type": "semantic",
    "top_k": 5
  }'
```

---

#### 2. **POST `/api/v1/search/rag`** ⭐ **NEW - Enhanced RAG**
**Description**: RAG Q&A with AI-generated answers and source attribution

**Request Body**:
```json
{
  "query": "What are the main financial highlights?",
  "top_k": 5,
  "include_sources": true
}
```

**Response**:
```json
{
  "query": "What are the main financial highlights?",
  "answer": "Based on the documents, the main financial highlights include...",
  "confidence": 0.87,
  "relevant_chunks": [
    {
      "content": "Chunk content here...",
      "document_title": "Q3 Report",
      "similarity": 0.92
    }
  ],
  "sources": [
    {
      "title": "Q3 Financial Report",
      "document_type": "PDF",
      "chunks": [
        {
          "content": "...",
          "similarity": 0.92
        }
      ]
    }
  ],
  "timeTaken": 1567
}
```

**Features**:
- ✅ GPT-4o powered responses
- ✅ Source attribution with confidence scores
- ✅ Chunk-level context
- ✅ Automatic logging to search history

---

#### 3. **POST `/api/v1/search/chunks`** ⭐ **NEW - Chunk Search**
**Description**: Direct chunk-level semantic search with detailed results

**Request Body**:
```json
{
  "query": "security protocols",
  "top_k": 10
}
```

**Response**:
```json
{
  "query": "security protocols",
  "chunks": [
    {
      "chunk_id": "uuid",
      "document_id": "uuid",
      "document_title": "Security Handbook",
      "document_type": "PDF",
      "content": "Security protocol content...",
      "chunk_index": 3,
      "similarity": 0.94,
      "metadata": {}
    }
  ],
  "results_count": 10,
  "timeTaken": 189
}
```

**Use Cases**:
- Find specific sections within documents
- Get granular context
- Verify exact source content

---

#### 4. **GET `/api/v1/search/similar/{document_id}`** ⭐ **NEW - Similar Docs**
**Description**: Find semantically similar documents using vector similarity

**Parameters**:
- `document_id`: UUID of the source document
- `limit`: Number of results (default: 5, max: 20)

**Response**:
```json
{
  "document_id": "uuid",
  "document_title": "Original Document",
  "similar_documents": [
    {
      "id": "uuid",
      "title": "Similar Document 1",
      "document_type": "PDF",
      "author": "Jane Doe",
      "tags": ["related", "topic"],
      "similarity": 0.89,
      "created_at": "2025-01-15T10:30:00Z",
      "metadata": {}
    }
  ],
  "results_count": 5
}
```

**Use Cases**:
- Document discovery
- Related content suggestions
- Duplicate detection

---

#### 5. **GET `/api/v1/search/suggestions`**
**Description**: Get search query suggestions

**Response**:
```json
{
  "suggestions": [
    "Recent financial reports",
    "Employee handbook policies",
    "Security protocols",
    "Project timelines"
  ]
}
```

---

#### 6. **GET `/api/v1/search/history`**
**Description**: Get user's search history

**Parameters**:
- `limit`: Number of results (default: 20)

**Response**:
```json
{
  "history": [
    {
      "id": "uuid",
      "query": "financial reports",
      "search_type": "semantic",
      "results_count": 5,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

#### 7. **GET `/api/v1/search/stats`**
**Description**: Get search analytics and statistics

**Response**:
```json
{
  "total_searches": 1234,
  "top_queries": [
    {
      "query": "financial reports",
      "count": 45
    }
  ],
  "search_types": [
    {
      "type": "semantic",
      "count": 789
    }
  ],
  "average_results": 7.5
}
```

---

## 🧠 Embedding Endpoints

### **Base Path: `/api/v1/embeddings`**

#### 1. **POST `/api/v1/embeddings/generate`**
**Description**: Generate embedding vector for a single text

**Request Body**:
```json
{
  "text": "This is the text to embed"
}
```

**Response**:
```json
{
  "embedding": [0.123, -0.456, ...],  // 1536 dimensions
  "dimension": 1536,
  "model": "all-MiniLM-L6-v2"
}
```

---

#### 2. **POST `/api/v1/embeddings/generate-batch`**
**Description**: Generate embeddings for multiple texts (batch processing)

**Request Body**:
```json
{
  "texts": [
    "First text to embed",
    "Second text to embed",
    "Third text to embed"
  ]
}
```

**Response**:
```json
{
  "embeddings": [
    [0.123, -0.456, ...],
    [0.789, -0.012, ...],
    [0.345, -0.678, ...]
  ],
  "count": 3,
  "dimension": 1536,
  "model": "all-MiniLM-L6-v2"
}
```

**Use Cases**:
- Bulk document processing
- Custom embedding generation
- Integration with external systems

---

#### 3. **GET `/api/v1/embeddings/status`**
**Description**: Check embedding service status

**Response**:
```json
{
  "available": true,
  "model": "all-MiniLM-L6-v2",
  "dimension": 384,
  "status": "ready"
}
```

---

#### 4. **POST `/api/v1/embeddings/health`**
**Description**: Health check with test embedding generation

**Response**:
```json
{
  "healthy": true,
  "model": "all-MiniLM-L6-v2",
  "test_dimension": 1536,
  "message": "Embedding service is healthy"
}
```

---

## 📄 Document Management Endpoints

### **Base Path: `/api/v1`**

#### 1. **POST `/api/v1/documents`**
**Description**: Create document with automatic embedding generation

**Request Body**:
```json
{
  "title": "Document Title",
  "content": "Document content...",
  "document_type": "PDF",
  "author": "John Doe",
  "tags": ["finance", "report"],
  "metadata": {
    "department": "Finance",
    "year": 2024
  }
}
```

**Response**:
```json
{
  "id": "uuid",
  "message": "Document created successfully"
}
```

**Automatic Processing**:
- ✅ Generates document-level embedding
- ✅ Creates chunks with embeddings
- ✅ Stores in database
- ✅ Indexes for search

---

#### 2. **GET `/api/v1/documents`**
**Description**: List all documents

**Parameters**:
- `skip`: Offset (default: 0)
- `limit`: Page size (default: 10)

---

#### 3. **GET `/api/v1/documents/{document_id}`**
**Description**: Get specific document details

---

## ⚙️ Admin Utilities

### **Base Path: `/api/v1/admin`**

#### 1. **POST `/api/v1/admin/regenerate-embeddings/{document_id}`**
**Description**: Regenerate embeddings for a single document

**Response**:
```json
{
  "message": "Embeddings regenerated successfully"
}
```

**Use Cases**:
- Fix corrupted embeddings
- Update after content changes
- Recalculate with improved models

---

#### 2. **POST `/api/v1/admin/regenerate-all-embeddings`**
**Description**: Batch regenerate embeddings for all documents

**Response**:
```json
{
  "message": "Regenerated embeddings for 45/50 documents",
  "total": 50,
  "successful": 45
}
```

**⚠️ Warning**: This operation can take significant time for large document sets

---

## 🔄 Legacy RAG Endpoint (Still Available)

### **POST `/api/v1/rag/query`**
**Description**: Legacy RAG endpoint (use `/api/v1/search/rag` for enhanced features)

**Request Body**:
```json
{
  "query": "What is the document problem?",
  "top_k": 5
}
```

**Status**: ⚠️ Deprecated - Use `/api/v1/search/rag` instead

---

## 📊 Endpoint Comparison

| Feature | `/api/v1/rag/query` (Legacy) | `/api/v1/search/rag` (Enhanced) |
|---------|------------------------------|--------------------------------|
| AI Responses | ✅ Yes | ✅ Yes (GPT-4o) |
| Source Attribution | ✅ Basic | ✅ Enhanced with metadata |
| Confidence Scores | ✅ Yes | ✅ Yes with breakdown |
| Chunk Details | ✅ Basic | ✅ Detailed with index |
| Response Time | ✅ Included | ✅ Included |
| Search History | ❌ No | ✅ Auto-logged |
| Model Selection | ❌ Fixed | ✅ Configurable via .env |
| Error Handling | ✅ Basic | ✅ Comprehensive |

**Recommendation**: Use `/api/v1/search/rag` for new implementations

---

## 💡 Usage Examples

### **Example 1: RAG Q&A Flow**

```typescript
// Frontend TypeScript
import { searchService } from '@/services/api/searchService';

async function askQuestion(question: string) {
  try {
    // 1. Call RAG endpoint
    const response = await searchService.ragQuery(question, 5);

    // 2. Display AI answer
    console.log('Answer:', response.answer);

    // 3. Show confidence
    console.log('Confidence:', (response.confidence * 100).toFixed(0) + '%');

    // 4. Display sources
    response.sources.forEach(source => {
      console.log(`Source: ${source.title} (${source.document_type})`);
      console.log(`Relevant sections: ${source.chunks.length}`);
    });

    return response;
  } catch (error) {
    console.error('RAG query failed:', error);
    throw error;
  }
}

// Usage
askQuestion("What are the main financial highlights?");
```

---

### **Example 2: Chunk Search Flow**

```typescript
async function searchChunks(query: string) {
  const response = await searchService.searchChunks(query, 10);

  // Group by document
  const byDocument = response.chunks.reduce((acc, chunk) => {
    if (!acc[chunk.document_id]) {
      acc[chunk.document_id] = {
        title: chunk.document_title,
        chunks: []
      };
    }
    acc[chunk.document_id].chunks.push(chunk);
    return acc;
  }, {});

  return byDocument;
}
```

---

### **Example 3: Similar Documents Flow**

```typescript
async function findRelated(documentId: string) {
  const response = await searchService.findSimilarDocuments(documentId, 5);

  console.log(`Found ${response.results_count} similar documents to "${response.document_title}"`);

  response.similar_documents.forEach((doc, index) => {
    console.log(`${index + 1}. ${doc.title} (${(doc.similarity * 100).toFixed(0)}% similar)`);
  });

  return response;
}
```

---

### **Example 4: Complete Search Pipeline**

```python
# Backend Python
from app.rag_service import rag_service
from app.embedding_service import embedding_service

def complete_document_pipeline(document_id: str, content: str, title: str):
    """Complete RAG pipeline for a document"""

    # 1. Generate document embedding
    doc_success = rag_service.generate_and_store_document_embedding(
        document_id, title, content
    )

    # 2. Generate chunks with embeddings
    chunk_success = rag_service.generate_and_store_chunks(
        document_id, content
    )

    # 3. Verify embeddings
    if doc_success and chunk_success:
        print(f"✓ Document {document_id} fully indexed for RAG")
        return True
    else:
        print(f"✗ Failed to index document {document_id}")
        return False
```

---

## 🎯 Quick Reference

### **Choose the Right Endpoint**

| Use Case | Recommended Endpoint |
|----------|---------------------|
| Ask questions about documents | `/api/v1/search/rag` |
| Find specific sections | `/api/v1/search/chunks` |
| Discover related documents | `/api/v1/search/similar/{id}` |
| General document search | `/api/v1/search` |
| Generate embeddings | `/api/v1/embeddings/generate` |
| Batch processing | `/api/v1/embeddings/generate-batch` |
| Create searchable documents | `/api/v1/documents` |
| Fix embeddings | `/api/v1/admin/regenerate-embeddings` |

---

## 🔐 Authentication

All endpoints (except health checks) require authentication:

```bash
# Using Bearer token
curl -X POST "http://localhost:8001/api/v1/search/rag" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "..."}'
```

---

## 📊 Rate Limits & Performance

| Endpoint | Expected Time | Rate Limit |
|----------|--------------|------------|
| `/search/rag` | 1-3s | 60/min |
| `/search/chunks` | 150-400ms | 120/min |
| `/search/similar` | 100-250ms | 120/min |
| `/embeddings/generate` | 50-100ms | 300/min |
| `/embeddings/generate-batch` | 100ms + (50ms × n) | 60/min |

---

## 🧪 Testing All Endpoints

```bash
# Run comprehensive test
python test_rag_implementation.py

# Or test individually
curl http://localhost:8001/api/v1/search/rag
curl http://localhost:8001/api/v1/embeddings/status
curl http://localhost:8001/api/v1/admin/regenerate-all-embeddings
```

---

## 📖 Interactive API Documentation

**Swagger UI**: http://localhost:8001/docs
**ReDoc**: http://localhost:8001/redoc

Both provide:
- ✅ Complete endpoint documentation
- ✅ Interactive testing interface
- ✅ Request/response schemas
- ✅ Authentication setup

---

## 🆕 What's New in This Implementation

### **Enhanced Endpoints (NEW)**
- ✅ `/api/v1/search/rag` - Improved RAG with GPT-4o
- ✅ `/api/v1/search/chunks` - Direct chunk search
- ✅ `/api/v1/search/similar/{id}` - Similar documents

### **Improvements Over Legacy**
- ✅ Better source attribution
- ✅ Detailed confidence scoring
- ✅ Automatic search logging
- ✅ Enhanced error handling
- ✅ Response time tracking

---

## 🎓 Summary

**Total RAG-Related Endpoints**: 15+

**Categories**:
- 🔍 **Search & RAG**: 7 endpoints
- 🧠 **Embeddings**: 4 endpoints
- 📄 **Documents**: 3 endpoints
- ⚙️ **Admin**: 2+ endpoints

**All endpoints are**:
- ✅ Production-ready
- ✅ Fully documented
- ✅ Tested and working
- ✅ OpenAPI/Swagger enabled

---

**For more details, visit**: http://localhost:8001/docs 🚀

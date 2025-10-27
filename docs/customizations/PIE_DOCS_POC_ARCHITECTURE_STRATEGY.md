# PIE DOCS POC ARCHITECTURE STRATEGY
## Bridging Mayan EDMS with Modern Frontend for Complete POC Journey

---

## EXECUTIVE SUMMARY

**Goal**: Create a working POC that utilizes Mayan EDMS APIs in conjunction with the Pie-Docs React frontend to demonstrate the complete enterprise document management journey outlined in the POC requirements.

**Strategy**: **Hybrid Database Architecture** - Use Mayan's existing database for core document management + Add a separate PostgreSQL database for frontend-specific features (OCR quality metrics, RAG integration, analytics).

**Result**: Achieve 100% POC requirements with minimal custom development, leveraging 338 existing Mayan APIs while adding modern features the frontend needs.

---

## 1. MAYAN FILE STORAGE - COMPLETE ANALYSIS

### 1.1 Where Mayan Saves Files

**Storage Architecture**:
```
MEDIA_ROOT (default: /var/lib/mayan/)
  ├── document_file_storage/          ← Original uploaded documents
  │   ├── document-file-{uuid}
  │   └── document-file-{uuid}
  │
  ├── document_file_page_image_cache/ ← Generated page images (500MB cache)
  │   └── cached page images
  │
  ├── document_version_page_image_cache/ ← Version page images (500MB cache)
  │   └── version page images
  │
  ├── db.sqlite3 (if using SQLite)
  ├── static/                          ← Static assets
  └── <other app storage>/
```

**Storage Configuration** (`mayan/apps/documents/literals.py:26-29`):
```python
DEFAULT_DOCUMENTS_FILE_STORAGE_BACKEND = 'django.core.files.storage.FileSystemStorage'
DEFAULT_DOCUMENTS_FILE_STORAGE_BACKEND_ARGUMENTS = {
    'location': os.path.join(settings.MEDIA_ROOT, 'document_file_storage')
}
```

**Docker Environment** (`docker/.env:64-66`):
```bash
# To use block storage (S3, MinIO, etc.)
MAYAN_DOCUMENTS_STORAGE_BACKEND="storages.backends.s3boto3.S3Boto3Storage"
MAYAN_DOCUMENTS_STORAGE_BACKEND_ARGUMENTS="{'bucket_name':'mayan',...}"
```

---

### 1.2 Can You Access Files Directly?

**✅ YES - But with Important Caveats**

**File Naming**: Mayan uses UUIDs, NOT original filenames
```
Original: "Invoice_2024_ABC.pdf"
Stored as: "document-file-a7f3c8d9e4b2f1a6..."
```

**Direct Access Options**:

**Option 1: Via File System** (Local Storage)
```bash
# Files are physically accessible
ls /var/lib/mayan/document_file_storage/
# BUT: You get UUIDs, not meaningful names
```

**Option 2: Via Mayan API** (RECOMMENDED)
```javascript
// Get document file with original metadata
GET /api/v4/documents/{id}/files/{file_id}/
// Returns: {id, filename, mimetype, encoding, checksum, size, ...}

// Download actual file
GET /api/v4/documents/{id}/files/{file_id}/download/
// Returns: Binary file stream with original filename
```

**Option 3: Via Database Query + File System**
```sql
-- Get file location from database
SELECT
    d.label as document_name,
    df.file as storage_path
FROM documents_document d
JOIN documents_documentfile df ON df.document_id = d.id
WHERE d.id = 123;

-- Result: document-file-{uuid}
-- Then access filesystem: /var/lib/mayan/document_file_storage/{uuid}
```

**⚠️ CRITICAL WARNING**:
- **DON'T** modify files directly in storage
- **DON'T** rely on direct file access for production
- **DO** use Mayan APIs for file operations
- **REASON**: Mayan maintains checksums, versions, cache invalidation

**Best Practice for POC**:
```javascript
// Frontend accesses files via Mayan API
const fileUrl = `/api/v4/documents/${docId}/files/${fileId}/download/`;
// Mayan handles permissions, versions, caching, logging
```

---

## 2. DATABASE ARCHITECTURE - TWO-DATABASE STRATEGY

### 2.1 Why Separate PostgreSQL Database for Frontend?

**Problem**: Mayan database schema is complex and not designed for frontend-specific features.

**Solution**: **Dual Database Architecture**

```
┌─────────────────────────────────────────────────┐
│                PIE DOCS SYSTEM                  │
└─────────────────────────────────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        │                            │
┌───────▼─────────┐          ┌───────▼─────────┐
│  MAYAN DATABASE │          │ PIEDOCS DATABASE│
│  (PostgreSQL)   │          │  (PostgreSQL)   │
├─────────────────┤          ├─────────────────┤
│ • Documents     │          │ • OCR Quality   │
│ • Files         │          │ • RAG Vectors   │
│ • Versions      │          │ • AI Results    │
│ • Users         │          │ • Analytics     │
│ • Permissions   │          │ • User Prefs    │
│ • Workflows     │          │ • Search Cache  │
│ • Metadata      │          │ • Mobile Sync   │
│ • Cabinets      │          │ • Notifications │
│ • Tags          │          │ • Barcode Links │
└─────────────────┘          └─────────────────┘
       ↑                              ↑
       │                              │
  Mayan APIs (338)          Custom APIs (Frontend)
```

---

### 2.2 What Goes in Each Database?

**MAYAN DATABASE (READ via APIs, WRITE via APIs)**:
- ✅ Document metadata (title, description, type)
- ✅ File storage references
- ✅ OCR text content (basic)
- ✅ User accounts and permissions
- ✅ Cabinets/folders organization
- ✅ Tags and classifications
- ✅ Workflow states
- ✅ Audit logs

**PIE-DOCS DATABASE (Direct Read/Write)**:
- ✅ OCR quality metrics (confidence scores, quality levels)
- ✅ RAG vector embeddings for semantic search
- ✅ AI processing jobs and results
- ✅ User preferences (dashboard layout, favorites)
- ✅ Analytics and usage statistics
- ✅ Mobile sync queue
- ✅ Real-time notifications
- ✅ Physical location mapping (barcode → document ID)
- ✅ Search result caching

---

### 2.3 Database Schema for PIE-DOCS Database

```sql
-- OCR Enhancement Table
CREATE TABLE ocr_quality_metrics (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL,  -- Foreign key to Mayan document
    page_number INTEGER NOT NULL,
    confidence_overall DECIMAL(5,2),
    confidence_character DECIMAL(5,2),
    confidence_word DECIMAL(5,2),
    confidence_line DECIMAL(5,2),
    text_coverage DECIMAL(5,2),
    quality_level VARCHAR(20),  -- low, medium, high, excellent
    recommendations JSONB,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(document_id, page_number)
);

-- RAG Vector Embeddings
CREATE TABLE document_embeddings (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT,
    embedding VECTOR(1536),  -- Using pgvector extension
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX ON document_embeddings USING ivfflat (embedding vector_cosine_ops);

-- AI Processing Jobs
CREATE TABLE ai_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id INTEGER NOT NULL,
    job_type VARCHAR(50),  -- ocr, classification, extraction
    status VARCHAR(20),    -- pending, processing, completed, failed
    progress INTEGER DEFAULT 0,
    settings JSONB,
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Physical Location Mapping (SPAN Integration)
CREATE TABLE physical_locations (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL UNIQUE,
    barcode VARCHAR(255) UNIQUE,
    location_path TEXT,  -- Building>Floor>Room>Cabinet>Shelf
    checkout_status VARCHAR(20),
    checked_out_by INTEGER,
    checked_out_at TIMESTAMP,
    due_date TIMESTAMP,
    last_scanned_at TIMESTAMP
);

-- User Preferences
CREATE TABLE user_preferences (
    user_id INTEGER PRIMARY KEY,  -- Foreign key to Mayan user
    dashboard_layout JSONB,
    language VARCHAR(10),
    theme VARCHAR(20),
    notification_settings JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics Cache
CREATE TABLE analytics_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    metric_data JSONB,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Search Result Cache
CREATE TABLE search_cache (
    query_hash VARCHAR(64) PRIMARY KEY,
    query_text TEXT,
    filters JSONB,
    result_ids INTEGER[],
    total_count INTEGER,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3. POC ARCHITECTURE - COMPLETE INTEGRATION STRATEGY

### 3.1 System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                      PIE DOCS FRONTEND                         │
│                   (React 18 + TypeScript)                      │
└────────────┬──────────────────────────────┬────────────────────┘
             │                              │
             │ Mayan APIs                   │ Custom APIs
             │ (338 endpoints)              │ (Frontend-specific)
             │                              │
┌────────────▼──────────┐      ┌────────────▼────────────┐
│   MAYAN EDMS BACKEND  │      │   ADAPTER SERVICE       │
│   (Django REST API)   │      │   (Node.js/Python)      │
└────────────┬──────────┘      └────────────┬────────────┘
             │                              │
┌────────────▼──────────┐      ┌────────────▼────────────┐
│   MAYAN DATABASE      │      │   PIEDOCS DATABASE      │
│   (PostgreSQL)        │      │   (PostgreSQL)          │
│                       │      │                         │
│ • Core Document Data  │      │ • OCR Quality Metrics   │
│ • File References     │      │ • RAG Embeddings        │
│ • Users & Permissions │      │ • AI Results            │
│ • Workflows           │      │ • Analytics             │
└────────────┬──────────┘      └─────────────────────────┘
             │
┌────────────▼──────────┐
│   FILE STORAGE        │
│   (MEDIA_ROOT)        │
│ /var/lib/mayan/       │
│   document_file_      │
│   storage/            │
└───────────────────────┘
```

---

### 3.2 Adapter Service - The Bridge Layer

**Purpose**: Translate between Mayan APIs and frontend requirements

**Technology**: Node.js/Express or Python/FastAPI

**Endpoints**:

```javascript
// OCR with Quality Metrics
POST /api/ocr/start
  → Calls Mayan: POST /api/v4/documents/{id}/submit-for-ocr/
  → Creates job in PieDocs DB
  → Returns: {jobId, estimatedTime, status}

GET /api/ocr/status/{jobId}
  → Queries Mayan OCR status
  → Calculates quality metrics from OCR result
  → Stores in ocr_quality_metrics table
  → Returns: {status, progress, qualityMetrics}

// RAG-based Queries
POST /api/rag/query
  → Fetches documents from Mayan via search API
  → Retrieves embeddings from PieDocs DB
  → Calls external AI service for answer
  → Returns: {answer, sourceDocuments, confidence}

// Physical Location Tracking
POST /api/barcode/scan
  → Validates barcode
  → Queries physical_locations table
  → Returns document from Mayan API
  → Returns: {document, location, status}

// Analytics
GET /api/analytics/dashboard
  → Aggregates data from both databases
  → Caches in analytics_cache table
  → Returns: {metrics, charts, trends}
```

---

### 3.3 Data Flow Examples

**Example 1: Document Upload with OCR**

```
1. User uploads PDF → Frontend
2. Frontend → Mayan API: POST /api/v4/documents/
3. Mayan saves file → MEDIA_ROOT/document_file_storage/
4. Mayan saves metadata → Mayan DB
5. Mayan triggers OCR → Celery task
6. Adapter polls Mayan OCR status
7. When complete, adapter:
   - Fetches OCR text from Mayan
   - Calculates quality metrics
   - Stores metrics in PieDocs DB → ocr_quality_metrics
   - Generates embeddings
   - Stores embeddings in PieDocs DB → document_embeddings
8. Frontend polls adapter: GET /api/ocr/status/{jobId}
9. Frontend displays: Document + OCR text + Quality indicators
```

**Example 2: RAG-based Query**

```
1. User asks: "Show invoices over $10,000 from last quarter"
2. Frontend → Adapter: POST /api/rag/query
3. Adapter:
   - Generates query embedding
   - Searches document_embeddings (semantic search)
   - Gets top 10 document IDs
   - Fetches documents from Mayan API
   - Calls AI service with context
   - Returns answer + source documents
4. Frontend displays: Answer + Linked documents
```

**Example 3: Barcode Scanning**

```
1. User scans barcode → Mobile app
2. Frontend → Adapter: POST /api/barcode/scan
3. Adapter:
   - Validates barcode format
   - Queries physical_locations table
   - Gets document_id
   - Fetches document from Mayan API: GET /api/v4/documents/{id}/
   - Returns document + physical location
4. Frontend displays: Document details + Location map
```

---

## 4. POC IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)

**Mayan Setup**:
- ✅ Deploy Mayan EDMS via Docker Compose
- ✅ Configure PostgreSQL for Mayan
- ✅ Test basic document upload/retrieval via API

**PieDocs Database**:
- ✅ Create second PostgreSQL database
- ✅ Run schema migrations
- ✅ Test database connectivity

**Frontend**:
- ✅ Build authentication (using Mayan `/api/v4/auth/token/obtain/`)
- ✅ Build document upload UI (calling Mayan API)
- ✅ Build document viewer (fetching from Mayan)

**APIs Used**:
```javascript
POST /api/v4/auth/token/obtain/
GET  /api/v4/documents/
POST /api/v4/documents/
GET  /api/v4/documents/{id}/
GET  /api/v4/documents/{id}/files/{file_id}/pages/{page_id}/image/
```

---

### Phase 2: OCR Integration (Week 3-4)

**Adapter Service**:
- ✅ Build OCR adapter endpoints
- ✅ Implement quality metric calculation
- ✅ Store results in PieDocs DB

**Frontend**:
- ✅ Build OCR processor component
- ✅ Display quality indicators
- ✅ Implement retry with settings

**Mayan APIs**:
```javascript
POST /api/v4/documents/{id}/submit-for-ocr/
GET  /api/v4/documents/{id}/versions/{ver_id}/pages/{page_id}/ocr_content/
```

**PieDocs DB Tables**:
- `ocr_quality_metrics`
- `ai_processing_jobs`

---

### Phase 3: Search & RAG (Week 5-6)

**External Integration**:
- ✅ Integrate OpenAI/Anthropic for embeddings
- ✅ Build RAG query service
- ✅ Implement semantic search

**PieDocs DB**:
- ✅ Install pgvector extension
- ✅ Store embeddings
- ✅ Create vector indexes

**Frontend**:
- ✅ Build RAG query interface
- ✅ Display AI-generated answers
- ✅ Link to source documents

**Mayan APIs**:
```javascript
GET /api/v4/search/
GET /api/v4/search/advanced/
```

---

### Phase 4: Physical Integration (Week 7-8)

**SPAN Integration** (or Mock for POC):
- ✅ Build barcode management
- ✅ Implement location tracking
- ✅ Create checkout system

**PieDocs DB Tables**:
- `physical_locations`

**Frontend**:
- ✅ Barcode scanner component
- ✅ Location picker
- ✅ Checkout interface

---

### Phase 5: Advanced Features (Week 9-12)

**Workflows**:
- ✅ Visual workflow designer
- ✅ Approval processes

**Analytics**:
- ✅ Dashboard with metrics
- ✅ Usage statistics
- ✅ ROI calculator

**Mayan APIs**:
```javascript
GET  /api/v4/workflow_templates/
POST /api/v4/workflow_templates/
GET  /api/v4/events/
```

---

## 5. DIRECT ANSWERS TO YOUR QUESTIONS

### Q1: Where does Mayan save files? Can you access them?

**Answer**:
- **Location**: `MEDIA_ROOT/document_file_storage/` (default: `/var/lib/mayan/`)
- **Naming**: UUID-based (e.g., `document-file-{uuid}`)
- **Direct Access**: ✅ YES (filesystem), but **NOT RECOMMENDED**
- **Best Practice**: Access via Mayan API:
  ```javascript
  GET /api/v4/documents/{id}/files/{file_id}/download/
  ```

---

### Q2: Can a separate PostgreSQL database for frontend bridge the gaps?

**Answer**: ✅ **YES - This is the RECOMMENDED strategy**

**Gaps Bridged**:
1. **OCR Quality Metrics** → Store in PieDocs DB
2. **RAG Embeddings** → Store in PieDocs DB (with pgvector)
3. **AI Processing Jobs** → Track in PieDocs DB
4. **Analytics** → Cache in PieDocs DB
5. **Physical Location** → Map in PieDocs DB
6. **User Preferences** → Store in PieDocs DB

**Benefits**:
- ✅ Don't modify Mayan database schema
- ✅ Keep Mayan upgradable
- ✅ Add features Mayan doesn't support
- ✅ Faster queries (optimized for frontend needs)
- ✅ Easier to scale independently

---

### Q3: Working architecture to utilize Mayan APIs for POC?

**Answer**: Use **Adapter Service Pattern**

```
Frontend (React)
    ↓ Call custom endpoints
Adapter Service (Node.js/Python)
    ↓ Translate & enhance
    ├→ Mayan APIs (core document management)
    └→ PieDocs DB (enhanced features)
```

**Implementation**:

```javascript
// Adapter Service (Node.js/Express)
const express = require('express');
const axios = require('axios');
const { Pool } = require('pg');

const app = express();
const mayanAPI = axios.create({
  baseURL: 'http://mayan:8000/api/v4',
  headers: {'Authorization': 'Token YOUR_TOKEN'}
});
const piedocsDB = new Pool({connectionString: 'postgresql://piedocs_db'});

// Enhanced document upload
app.post('/api/documents/upload', async (req, res) => {
  // 1. Upload to Mayan
  const mayanDoc = await mayanAPI.post('/documents/', formData);

  // 2. Trigger OCR
  await mayanAPI.post(`/documents/${mayanDoc.data.id}/submit-for-ocr/`);

  // 3. Create job tracking in PieDocs DB
  await piedocsDB.query(
    'INSERT INTO ai_processing_jobs (document_id, job_type, status) VALUES ($1, $2, $3)',
    [mayanDoc.data.id, 'ocr', 'pending']
  );

  res.json({
    documentId: mayanDoc.data.id,
    status: 'processing',
    mayanUrl: mayanDoc.data.url
  });
});

// OCR status with quality metrics
app.get('/api/ocr/status/:docId', async (req, res) => {
  // 1. Get OCR content from Mayan
  const ocrData = await mayanAPI.get(
    `/documents/${req.params.docId}/versions/latest/pages/1/ocr_content/`
  );

  // 2. Calculate quality metrics
  const quality = calculateQuality(ocrData.data.content);

  // 3. Store in PieDocs DB
  await piedocsDB.query(
    'INSERT INTO ocr_quality_metrics (...) VALUES (...) ON CONFLICT UPDATE',
    [req.params.docId, quality.overall, quality.character, ...]
  );

  res.json({
    text: ocrData.data.content,
    quality: quality,
    status: 'completed'
  });
});
```

---

## 6. POC SUCCESS CRITERIA

### Technical Success:
- ✅ Document upload via Mayan API
- ✅ OCR processing with quality metrics
- ✅ RAG-based queries working
- ✅ Barcode scanning functional
- ✅ All 20 POC features implemented

### Business Success:
- ✅ Complete user journey demo (15 minutes)
- ✅ Executive demo (5 minutes)
- ✅ Technical demo (10 minutes)
- ✅ ROI calculator functional

### Performance Success:
- ✅ OCR < 30 seconds
- ✅ Search < 1 second
- ✅ Page load < 2 seconds
- ✅ Mobile responsive

---

## 7. COST & COMPLEXITY ANALYSIS

| Approach | Development Time | Infrastructure Cost | Maintainability | Recommended |
|----------|-----------------|---------------------|-----------------|-------------|
| **Mayan Only** | 2-3 weeks | Low ($50/mo) | High (limited features) | ❌ No |
| **Custom Backend** | 12+ weeks | High ($500/mo) | Low (full control) | ❌ No |
| **Hybrid (Recommended)** | 8-10 weeks | Medium ($150/mo) | High (best of both) | ✅ **YES** |

**Hybrid Approach Breakdown**:
- Mayan EDMS: $0 (open source) + $50/mo (hosting)
- PieDocs DB: $20/mo (managed PostgreSQL)
- Adapter Service: $30/mo (small server)
- AI Service: $50/mo (OpenAI/Anthropic credits)
- **Total**: ~$150/month

---

## 8. NEXT STEPS

### Immediate (This Week):
1. ✅ Deploy Mayan EDMS in Docker
2. ✅ Create PieDocs PostgreSQL database
3. ✅ Test Mayan API authentication
4. ✅ Build simple frontend that calls Mayan API

### Week 2:
1. ✅ Build adapter service skeleton
2. ✅ Implement document upload flow
3. ✅ Create OCR quality metric calculation
4. ✅ Test end-to-end document flow

### Week 3-4:
1. ✅ Implement RAG integration
2. ✅ Build semantic search
3. ✅ Create analytics dashboard
4. ✅ Add barcode management

---

## CONCLUSION

**Yes, you can build the complete POC by**:

1. ✅ Using Mayan APIs for core document management (338 endpoints ready)
2. ✅ Adding separate PieDocs PostgreSQL database for enhanced features
3. ✅ Building lightweight adapter service to bridge the gap
4. ✅ Accessing files via Mayan API (not direct filesystem)
5. ✅ Delivering all POC requirements in 8-10 weeks

**This approach**:
- Leverages existing Mayan infrastructure (proven, scalable)
- Adds modern features frontend needs (RAG, quality metrics, analytics)
- Keeps Mayan upgradable (no schema modifications)
- Minimizes custom development
- Achieves POC goals efficiently

**Start here**: Deploy Mayan + Test document upload via API + Create PieDocs DB schema.

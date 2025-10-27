# 📋 DOCUMENTS ECOSYSTEM - COMPLETE IMPLEMENTATION PLAN
## Ground Zero Analysis & Implementation Roadmap

**Project:** Pie-Docs
**Date Started:** 2025-10-06
**Last Updated:** 2025-10-06
**Status:** 🚧 IN PROGRESS - Sprint 1, Week 1
**Current State:** Core upload infrastructure complete, ready for testing
**Overall Progress:** 15% Complete (3/20 major features)

---

## 📊 IMPLEMENTATION PROGRESS TRACKER

### Overall Status
```
[██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 15% Complete

✅ Completed: 3/20 features
🚧 In Progress: 1/20 features (Testing)
⏳ Pending: 16/20 features
```

### Sprint Progress
- **Current Sprint:** Sprint 1 - Core Infrastructure (Week 1/2)
- **Sprint Goal:** Document upload, storage, and basic preview
- **Sprint Progress:** 73% (11/15 tasks completed)
- **Blockers:** None
- **Next Review:** End of Week 1

---

## ✅ DETAILED TASK CHECKLIST

### 🎯 SPRINT 1: CORE INFRASTRUCTURE (Weeks 1-2) - P0

#### Week 1: Upload & Storage Foundation
**Goal:** Get documents uploading to internal system (not Mayan)

##### Database Tasks
- [x] **TASK-DB-001:** Create document file storage enhancements migration
  - Status: ✅ COMPLETED
  - Priority: P0 - CRITICAL
  - Estimate: 2 hours
  - Dependencies: None
  - Files: `database/migrations/15-document-storage-enhancements.sql`

- [x] **TASK-DB-002:** Create document relationships table
  - Status: ✅ COMPLETED
  - Priority: P0
  - Estimate: 1 hour
  - Dependencies: TASK-DB-001
  - Files: `database/migrations/16-document-relationships.sql`

- [x] **TASK-DB-003:** Create OCR results table enhancements
  - Status: ✅ COMPLETED
  - Priority: P0
  - Estimate: 1.5 hours
  - Dependencies: TASK-DB-001
  - Files: `database/migrations/17-ocr-enhancements-v2.sql`

- [x] **TASK-DB-004:** Run all database migrations
  - Status: ✅ COMPLETED
  - Priority: P0 - CRITICAL
  - Estimate: 30 mins
  - Dependencies: TASK-DB-001, TASK-DB-002, TASK-DB-003
  - Files: All migration files
  - Notes: Successfully executed all 3 migrations on port 5434

##### Backend Tasks - File Storage
- [x] **TASK-BE-001:** Create file storage service
  - Status: ✅ COMPLETED
  - Priority: P0 - CRITICAL
  - Estimate: 3 hours
  - Dependencies: None
  - Files: `app/services/file_storage_service.py` (NEW)
  - Deliverables: Local file storage with directory structure
  - Notes: Organized structure uploads/{type}/{year}/{month}/, supports move/copy/delete

- [x] **TASK-BE-002:** Create thumbnail generation service
  - Status: ✅ COMPLETED
  - Priority: P0
  - Estimate: 2 hours
  - Dependencies: TASK-BE-001
  - Files: `app/services/thumbnail_service.py` (NEW)
  - Deliverables: Generate thumbnails for PDFs and images
  - Notes: 300x400 thumbnails, PyMuPDF for PDFs, Pillow for images

- [x] **TASK-BE-003:** Create checksum calculation utility
  - Status: ✅ COMPLETED
  - Priority: P0
  - Estimate: 1 hour
  - Dependencies: None
  - Files: `app/utils/file_utils.py` (NEW)
  - Deliverables: MD5 and SHA256 checksum functions
  - Notes: Efficient streaming for large files, MIME type detection, filename sanitization

##### Backend Tasks - Upload API
- [x] **TASK-BE-004:** Implement document upload endpoint
  - Status: ✅ COMPLETED
  - Priority: P0 - CRITICAL
  - Estimate: 4 hours
  - Dependencies: TASK-BE-001, TASK-BE-002, TASK-BE-003, TASK-DB-004
  - Files: `app/routers/documents.py` (ENHANCE)
  - Deliverables: POST /api/v1/documents/upload
  - Notes: Supports auto_ocr, auto_classify, checksum calculation, thumbnail generation

- [x] **TASK-BE-005:** Implement document download endpoint
  - Status: ✅ COMPLETED
  - Priority: P0
  - Estimate: 1 hour
  - Dependencies: TASK-BE-001, TASK-DB-004
  - Files: `app/routers/documents.py` (ENHANCE)
  - Deliverables: GET /api/v1/documents/{id}/download
  - Notes: FileResponse with proper headers, attachment disposition

- [x] **TASK-BE-006:** Implement document preview endpoint
  - Status: ✅ COMPLETED
  - Priority: P0
  - Estimate: 1.5 hours
  - Dependencies: TASK-BE-001, TASK-DB-004
  - Files: `app/routers/documents.py` (ENHANCE)
  - Deliverables: GET /api/v1/documents/{id}/preview
  - Notes: Inline disposition for browser viewing, fallback to original if no preview

- [x] **TASK-BE-007:** Implement thumbnail endpoint
  - Status: ✅ COMPLETED
  - Priority: P0
  - Estimate: 1 hour
  - Dependencies: TASK-BE-002, TASK-DB-004
  - Files: `app/routers/documents.py` (ENHANCE)
  - Deliverables: GET /api/v1/documents/{id}/thumbnail
  - Notes: JPEG response with 24-hour cache headers

##### Frontend Tasks - Upload
- [x] **TASK-FE-001:** Update documentsService with internal upload
  - Status: ✅ COMPLETED
  - Priority: P0 - CRITICAL
  - Estimate: 2 hours
  - Dependencies: TASK-BE-004
  - Files: `services/api/documentsService.ts` (ENHANCE)
  - Deliverables: uploadDocument() method using internal API
  - Notes: Updated uploadFile() to use internal API, added autoOcr/autoClassify support

- [x] **TASK-FE-002:** Fix EnhancedUploadInterface to use internal API
  - Status: ✅ COMPLETED
  - Priority: P0 - CRITICAL
  - Estimate: 3 hours
  - Dependencies: TASK-FE-001
  - Files: `components/documents/upload/EnhancedUploadInterface.tsx` (FIX)
  - Deliverables: Remove Mayan API calls, use documentsService
  - Notes: Updated to pass title, tags, author, auto_ocr flag; Updated .env.local

- [ ] **TASK-FE-003:** Add upload progress tracking
  - Status: ✅ COMPLETED (Already working via XMLHttpRequest)
  - Priority: P1
  - Estimate: 1 hour
  - Dependencies: TASK-FE-002
  - Files: `components/documents/upload/EnhancedUploadInterface.tsx` (ENHANCE)
  - Deliverables: Real-time progress bar during upload
  - Notes: Progress tracking already implemented in documentsService.ts lines 777-792

- [x] **TASK-FE-004:** Test upload workflow end-to-end
  - Status: ✅ COMPLETED
  - Priority: P0 - CRITICAL
  - Estimate: 1 hour
  - Dependencies: TASK-FE-002
  - Files: N/A (Testing)
  - Deliverables: Successful file upload with DB record
  - Notes: Tested via cURL, files uploading/downloading successfully

**Week 1 Total Tasks:** 15
**Week 1 Completed:** 13/15 (87%)**
**Remaining:** TASK-FE-003 (already works), Minor fixes

---

#### Week 2: Preview & OCR Foundation
**Goal:** Document preview working with OCR processing

##### Backend Tasks - Preview
- [ ] **TASK-BE-008:** Create PDF preview generation service
  - Status: ⏳ Not Started
  - Priority: P0
  - Estimate: 3 hours
  - Dependencies: TASK-BE-001
  - Files: `app/services/preview_service.py` (NEW)
  - Deliverables: Generate preview images for PDFs

- [ ] **TASK-BE-009:** Implement document details endpoint
  - Status: ⏳ Not Started
  - Priority: P0
  - Estimate: 1 hour
  - Dependencies: TASK-DB-004
  - Files: `app/routers/documents.py` (ENHANCE)
  - Deliverables: GET /api/v1/documents/{id}

##### Backend Tasks - OCR
- [ ] **TASK-BE-010:** Create OCR processing service (Tesseract)
  - Status: ⏳ Not Started
  - Priority: P0
  - Estimate: 4 hours
  - Dependencies: TASK-DB-003
  - Files: `app/services/ocr_service.py` (NEW)
  - Deliverables: Process documents with Tesseract OCR

- [ ] **TASK-BE-011:** Create OCR background job queue
  - Status: ⏳ Not Started
  - Priority: P0
  - Estimate: 2 hours
  - Dependencies: TASK-BE-010
  - Files: `app/services/ocr_queue.py` (NEW)
  - Deliverables: Async OCR processing with Celery

- [ ] **TASK-BE-012:** Implement OCR start endpoint
  - Status: ⏳ Not Started
  - Priority: P0
  - Estimate: 1 hour
  - Dependencies: TASK-BE-010
  - Files: `app/routers/ocr.py` (ENHANCE)
  - Deliverables: POST /api/v1/ocr/documents/{id}/ocr/start

- [ ] **TASK-BE-013:** Implement OCR status endpoint
  - Status: ⏳ Not Started
  - Priority: P0
  - Estimate: 1 hour
  - Dependencies: TASK-BE-010
  - Files: `app/routers/ocr.py` (ENHANCE)
  - Deliverables: GET /api/v1/ocr/documents/{id}/ocr/status

- [ ] **TASK-BE-014:** Implement OCR result endpoint
  - Status: ⏳ Not Started
  - Priority: P0
  - Estimate: 1 hour
  - Dependencies: TASK-BE-010
  - Files: `app/routers/ocr.py` (ENHANCE)
  - Deliverables: GET /api/v1/ocr/documents/{id}/ocr/result

##### Frontend Tasks - Preview
- [ ] **TASK-FE-005:** Create ocrService for API calls
  - Status: ⏳ Not Started
  - Priority: P0
  - Estimate: 2 hours
  - Dependencies: TASK-BE-012, TASK-BE-013, TASK-BE-014
  - Files: `services/api/ocrService.ts` (NEW)
  - Deliverables: Complete OCR API client

- [ ] **TASK-FE-006:** Fix DocumentPreviewPanel to load real previews
  - Status: ⏳ Not Started
  - Priority: P0
  - Estimate: 3 hours
  - Dependencies: TASK-BE-006, TASK-BE-009
  - Files: `components/documents/preview/DocumentPreviewPanel.tsx` (FIX)
  - Deliverables: Load and display real document previews

- [ ] **TASK-FE-007:** Fix OCR preview tab with real data
  - Status: ⏳ Not Started
  - Priority: P0
  - Estimate: 2 hours
  - Dependencies: TASK-FE-005
  - Files: `components/documents/preview/DocumentPreviewPanel.tsx` (FIX)
  - Deliverables: Display real OCR results with confidence scores

- [ ] **TASK-FE-008:** Add OCR processing trigger button
  - Status: ⏳ Not Started
  - Priority: P0
  - Estimate: 1 hour
  - Dependencies: TASK-FE-005
  - Files: `components/documents/preview/DocumentPreviewPanel.tsx` (ENHANCE)
  - Deliverables: Start OCR button with status polling

- [ ] **TASK-FE-009:** Test preview workflow end-to-end
  - Status: ⏳ Not Started
  - Priority: P0
  - Estimate: 1 hour
  - Dependencies: TASK-FE-006, TASK-FE-007
  - Files: N/A (Testing)
  - Deliverables: Preview and OCR working for uploaded docs

**Week 2 Total Tasks:** 12
**Week 2 Completed:** 0/12 (0%)

**Sprint 1 Total Tasks:** 27
**Sprint 1 Completed:** 0/27 (0%)

---

### 🎯 SPRINT 2: DOCUMENT MANAGEMENT (Weeks 3-5) - P1

#### Week 3: Folders & Document Types
- [ ] **TASK-DB-005:** Enhance folders table with sharing features
- [ ] **TASK-DB-006:** Enhance document_types table with AI fields
- [ ] **TASK-BE-015:** Implement folder CRUD endpoints
- [ ] **TASK-BE-016:** Implement smart folder execution
- [ ] **TASK-BE-017:** Implement document types endpoints
- [ ] **TASK-FE-010:** Create foldersService API client
- [ ] **TASK-FE-011:** Fix FolderManager component
- [ ] **TASK-FE-012:** Fix DocTypeManager component
- [ ] **TASK-FE-013:** Test folder creation and navigation

**Week 3 Total Tasks:** 9
**Week 3 Completed:** 0/9 (0%)

---

#### Week 4: Tags & Metadata
- [ ] **TASK-DB-007:** Create metadata schemas table
- [ ] **TASK-DB-008:** Create document_metadata_values table
- [ ] **TASK-BE-018:** Implement tags endpoints
- [ ] **TASK-BE-019:** Implement metadata schemas endpoints
- [ ] **TASK-BE-020:** Implement metadata CRUD endpoints
- [ ] **TASK-FE-014:** Create tagsService API client
- [ ] **TASK-FE-015:** Create metadataService API client
- [ ] **TASK-FE-016:** Fix TagManager component
- [ ] **TASK-FE-017:** Fix MetadataManager component
- [ ] **TASK-FE-018:** Test tag and metadata workflows

**Week 4 Total Tasks:** 10
**Week 4 Completed:** 0/10 (0%)

---

#### Week 5: Check-In/Out System
- [ ] **TASK-DB-009:** Enhance checkinout table
- [ ] **TASK-DB-010:** Create checkout_history table
- [ ] **TASK-BE-021:** Implement checkout endpoints
- [ ] **TASK-BE-022:** Implement checkin endpoints
- [ ] **TASK-BE-023:** Add checkout notifications
- [ ] **TASK-FE-019:** Create checkInOutService API client
- [ ] **TASK-FE-020:** Fix CheckInOutManager component
- [ ] **TASK-FE-021:** Add checkout status indicators
- [ ] **TASK-FE-022:** Test check-in/out workflow

**Week 5 Total Tasks:** 9
**Week 5 Completed:** 0/9 (0%)

**Sprint 2 Total Tasks:** 28
**Sprint 2 Completed:** 0/28 (0%)

---

### 🎯 SPRINT 3: SEARCH & INTELLIGENCE (Weeks 6-7) - P1-P2

#### Week 6: Semantic Search
- [ ] **TASK-DB-011:** Add pgvector extension
- [ ] **TASK-DB-012:** Create document_embeddings table
- [ ] **TASK-DB-013:** Add full-text search enhancements
- [ ] **TASK-BE-024:** Create embedding generation service
- [ ] **TASK-BE-025:** Implement semantic search endpoint
- [ ] **TASK-BE-026:** Implement advanced search endpoint
- [ ] **TASK-BE-027:** Implement saved searches
- [ ] **TASK-FE-023:** Create searchService API client
- [ ] **TASK-FE-024:** Fix DocumentSearchPanel for semantic search
- [ ] **TASK-FE-025:** Add search suggestions
- [ ] **TASK-FE-026:** Test search workflows

**Week 6 Total Tasks:** 11
**Week 6 Completed:** 0/11 (0%)

---

#### Week 7: AI Intelligence
- [ ] **TASK-DB-014:** Create document_ai_intelligence table
- [ ] **TASK-BE-028:** Create AI classification service
- [ ] **TASK-BE-029:** Create entity extraction service
- [ ] **TASK-BE-030:** Implement AI analysis endpoints
- [ ] **TASK-BE-031:** Implement suggestions endpoints
- [ ] **TASK-FE-027:** Create aiIntelligenceService API client
- [ ] **TASK-FE-028:** Fix DocumentIntelligencePanel with real data
- [ ] **TASK-FE-029:** Fix DocumentAIFeaturesPanel with real data
- [ ] **TASK-FE-030:** Add AI suggestion acceptance workflow
- [ ] **TASK-FE-031:** Test AI features end-to-end

**Week 7 Total Tasks:** 10
**Week 7 Completed:** 0/10 (0%)

**Sprint 3 Total Tasks:** 21
**Sprint 3 Completed:** 0/21 (0%)

---

### 🎯 SPRINT 4: RELATIONSHIPS & ANALYTICS (Week 8) - P2

#### Week 8: Document Relationships & Analytics
- [ ] **TASK-DB-015:** Create document_analytics table
- [ ] **TASK-DB-016:** Create document_annotations table
- [ ] **TASK-BE-032:** Implement relationship detection service
- [ ] **TASK-BE-033:** Implement relationships endpoints
- [ ] **TASK-BE-034:** Implement analytics tracking
- [ ] **TASK-BE-035:** Implement analytics endpoints
- [ ] **TASK-FE-032:** Create relationshipsService API client
- [ ] **TASK-FE-033:** Create DocumentRelationshipMap component
- [ ] **TASK-FE-034:** Integrate relationship map visualization
- [ ] **TASK-FE-035:** Add analytics dashboard
- [ ] **TASK-FE-036:** Test relationships and analytics

**Week 8 Total Tasks:** 11
**Week 8 Completed:** 0/11 (0%)

**Sprint 4 Total Tasks:** 11
**Sprint 4 Completed:** 0/11 (0%)

---

### 🎯 SPRINT 5: POLISH & TESTING (Week 9) - P2

#### Week 9: Final Integration & Testing
- [ ] **TASK-QA-001:** End-to-end testing - Upload workflow
- [ ] **TASK-QA-002:** End-to-end testing - Preview & OCR
- [ ] **TASK-QA-003:** End-to-end testing - Folder management
- [ ] **TASK-QA-004:** End-to-end testing - Search
- [ ] **TASK-QA-005:** End-to-end testing - Metadata
- [ ] **TASK-QA-006:** Performance testing - Upload
- [ ] **TASK-QA-007:** Performance testing - Search
- [ ] **TASK-QA-008:** Security testing - File uploads
- [ ] **TASK-QA-009:** Security testing - Access controls
- [ ] **TASK-DOC-001:** API documentation completion
- [ ] **TASK-DOC-002:** User guide documentation
- [ ] **TASK-FIX-001:** Bug fixes from testing
- [ ] **TASK-FIX-002:** Performance optimizations
- [ ] **TASK-DEPLOY-001:** Production deployment preparation

**Week 9 Total Tasks:** 14
**Week 9 Completed:** 0/14 (0%)

**Sprint 5 Total Tasks:** 14
**Sprint 5 Completed:** 0/14 (0%)

---

## 📈 PROGRESS SUMMARY

### By Sprint
| Sprint | Week | Tasks | Completed | Progress | Status |
|--------|------|-------|-----------|----------|--------|
| Sprint 1 | 1-2 | 27 | 0 | 0% | ⏳ Not Started |
| Sprint 2 | 3-5 | 28 | 0 | 0% | ⏳ Not Started |
| Sprint 3 | 6-7 | 21 | 0 | 0% | ⏳ Not Started |
| Sprint 4 | 8 | 11 | 0 | 0% | ⏳ Not Started |
| Sprint 5 | 9 | 14 | 0 | 0% | ⏳ Not Started |
| **TOTAL** | **9 weeks** | **101** | **0** | **0%** | **⏳ Not Started** |

### By Category
| Category | Tasks | Completed | Progress |
|----------|-------|-----------|----------|
| Database | 16 | 0 | 0% |
| Backend | 35 | 0 | 0% |
| Frontend | 36 | 0 | 0% |
| Testing | 9 | 0 | 0% |
| Documentation | 2 | 0 | 0% |
| Deployment | 1 | 0 | 0% |
| **TOTAL** | **101** | **0** | **0%** |

### By Priority
| Priority | Tasks | Completed | Progress |
|----------|-------|-----------|----------|
| P0 (Critical) | 42 | 0 | 0% |
| P1 (High) | 38 | 0 | 0% |
| P2 (Medium) | 21 | 0 | 0% |
| **TOTAL** | **101** | **0** | **0%** |

---

## 🚦 STATUS INDICATORS

### Task Status Legend
- ✅ **Completed** - Task finished and verified
- 🚧 **In Progress** - Currently being worked on
- ⏳ **Not Started** - Queued for future work
- 🔒 **Blocked** - Waiting on dependencies
- ❌ **Failed** - Attempted but needs rework
- ⏭️ **Skipped** - Deprioritized or not needed

### Feature Status Legend
- 🟢 **Fully Functional** - 100% working with real data
- 🟡 **Partially Working** - Some features working
- 🔴 **Not Working** - Completely broken or mock data
- ⚪ **Not Implemented** - Doesn't exist yet

---

## 🔍 EXECUTIVE SUMMARY

### Current State Analysis
- ✅ **Working:** Basic document listing from API
- ❌ **Broken:** All other features (95% of functionality)
- ⚠️ **Critical Issue:** Currently using Mayan EDMS for uploads (needs migration to internal system)
- 🎯 **Goal:** Build complete, self-contained document management system

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    DOCUMENTS ECOSYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (React + TypeScript)                              │
│  ├── AdvancedDocumentLibraryV3.tsx (Main Page)             │
│  ├── 7 Tab Pages (Upload, Folders, Types, Tags, etc.)      │
│  ├── Preview System (Document + OCR)                        │
│  ├── Intelligence & AI Features                             │
│  └── 18+ Document Tools                                     │
│                          ↕                                   │
│  Backend (FastAPI + Python)                                 │
│  ├── 15+ API Routers                                        │
│  ├── File Storage System                                    │
│  ├── OCR Processing Pipeline                                │
│  └── AI/ML Services                                         │
│                          ↕                                   │
│  Database (PostgreSQL)                                      │
│  ├── 30+ Tables                                             │
│  ├── Full-text search (pg_trgm)                            │
│  └── Vector embeddings (pgvector)                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 COMPONENT STATUS MATRIX (Updated: Oct 6, 2025)

| Component | Status | Database | API | Frontend | Priority | Notes |
|-----------|--------|----------|-----|----------|----------|-------|
| **Document Library Page** | ✅ Working | ✅ | ✅ | ✅ | P0 | List view functional with real API |
| **Document Upload** | ✅ Working | ✅ | ✅ | ✅ | P0 | Internal upload complete (not Mayan) |
| **Document Download** | ✅ Working | ✅ | ✅ | 🟡 | P0 | API works, frontend needs integration |
| **Document Preview** | 🟡 Partial | ✅ | ✅ | 🟡 | P0 | API ready, frontend uses mock URLs |
| **Thumbnails** | ✅ Working | ✅ | ✅ | 🟡 | P0 | Generation works, frontend needs URLs |
| **OCR Preview** | ❌ Missing | ✅ | ❌ | 🟡 | P0 | Table ready, no OCR service/API |
| **Folder Manager** | ❌ Missing | ❌ | ❌ | ✅ | P1 | No folders table, UI ready |
| **Document Types** | ❌ Missing | ❌ | ❌ | ✅ | P1 | No types table, UI ready |
| **Tag Manager** | ❌ Missing | ❌ | ❌ | ✅ | P1 | Tags are TEXT[], no management |
| **Check In/Out** | ❌ Missing | ❌ | ❌ | ✅ | P1 | No checkout table/logic, UI ready |
| **Metadata Manager** | 🟡 Partial | 🟡 | 🟡 | ✅ | P1 | Basic JSONB, no field definitions |
| **Document Intelligence** | ❌ Missing | ❌ | ❌ | ✅ | P2 | No AI extraction, UI renders mock |
| **AI Features Panel** | ❌ Missing | ❌ | ❌ | ✅ | P2 | No AI services, UI ready |
| **Semantic Search** | ❌ Missing | 🟡 | ❌ | ✅ | P1 | pgvector ready, no embeddings |
| **Relationship Map** | 🟡 Partial | ✅ | ❌ | ✅ | P2 | Table ready, no API/visualization |
| **Document Tools (18+)** | ❌ Missing | 🟡 | 🟡 | ✅ | P2 | Some endpoints exist, not connected |
| **Versions** | ❌ Missing | ❌ | 🟡 | ✅ | P2 | No versions table, endpoints exist |
| **Permissions** | ❌ Missing | ❌ | 🟡 | ✅ | P2 | No perm tables, endpoints exist |
| **Sharing** | ❌ Missing | ❌ | 🟡 | ✅ | P2 | No share tables, endpoints exist |
| **Comments** | ❌ Missing | ❌ | 🟡 | ❌ | P2 | No comments table/UI integration |

**Legend:** ✅ Complete | 🟡 Partial | ❌ Missing | P0=Critical | P1=High | P2=Medium

**Key Finding:** Frontend is 60% complete with UI components. Backend is 30% complete with basic endpoints. Database is 40% complete. Main bottleneck is backend services and missing database tables.

---

## 🗄️ DATABASE IMPLEMENTATION

### Phase 1: Core Document Tables (P0)

#### 1.1 Document File Storage Enhancement
```sql
-- Add missing columns to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS file_original_name VARCHAR(500),
ADD COLUMN IF NOT EXISTS file_storage_path TEXT,
ADD COLUMN IF NOT EXISTS file_storage_type VARCHAR(50) DEFAULT 'local', -- local, s3, azure
ADD COLUMN IF NOT EXISTS thumbnail_path TEXT,
ADD COLUMN IF NOT EXISTS preview_path TEXT,
ADD COLUMN IF NOT EXISTS page_count INTEGER,
ADD COLUMN IF NOT EXISTS is_ocr_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ocr_language VARCHAR(10),
ADD COLUMN IF NOT EXISTS checksum_md5 VARCHAR(32),
ADD COLUMN IF NOT EXISTS checksum_sha256 VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_documents_file_path ON documents(file_path);
CREATE INDEX IF NOT EXISTS idx_documents_checksum ON documents(checksum_sha256);
CREATE INDEX IF NOT EXISTS idx_documents_ocr_processed ON documents(is_ocr_processed);
```

#### 1.2 Document Relationships Table
```sql
CREATE TABLE IF NOT EXISTS document_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    target_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL, -- parent, child, reference, duplicate, version
    relationship_metadata JSONB DEFAULT '{}'::jsonb,
    confidence_score DECIMAL(5,2), -- For AI-detected relationships

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(source_document_id, target_document_id, relationship_type)
);

CREATE INDEX idx_doc_rel_source ON document_relationships(source_document_id);
CREATE INDEX idx_doc_rel_target ON document_relationships(target_document_id);
CREATE INDEX idx_doc_rel_type ON document_relationships(relationship_type);
```

#### 1.3 Enhanced OCR Results Table
```sql
CREATE TABLE IF NOT EXISTS document_ocr_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,

    -- OCR Processing
    job_id VARCHAR(100) UNIQUE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    engine VARCHAR(50) DEFAULT 'tesseract', -- tesseract, azure_cv, aws_textract
    language VARCHAR(10) DEFAULT 'auto',

    -- Results
    extracted_text TEXT,
    structured_data JSONB, -- For forms, tables, etc.

    -- Quality Metrics
    overall_confidence DECIMAL(5,2),
    page_confidences JSONB, -- [{page: 1, confidence: 95.5}, ...]

    -- Processing Details
    processing_time_seconds DECIMAL(10,2),
    page_count INTEGER,
    error_message TEXT,

    -- Settings used
    ocr_settings JSONB DEFAULT '{
        "dpi": 300,
        "denoise": true,
        "deskew": true,
        "language": "auto",
        "output_format": "text"
    }'::jsonb,

    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(document_id)
);

CREATE INDEX idx_ocr_document ON document_ocr_results(document_id);
CREATE INDEX idx_ocr_status ON document_ocr_results(status);
CREATE INDEX idx_ocr_job ON document_ocr_results(job_id);
```

#### 1.4 Document AI Intelligence Table
```sql
CREATE TABLE IF NOT EXISTS document_ai_intelligence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,

    -- Classification
    detected_type VARCHAR(100), -- invoice, contract, receipt, etc.
    type_confidence DECIMAL(5,2),
    detected_category VARCHAR(100),
    category_confidence DECIMAL(5,2),

    -- Extracted Entities
    entities JSONB DEFAULT '[]'::jsonb, -- [{type: "person", value: "John Doe", confidence: 0.95}, ...]
    key_phrases JSONB DEFAULT '[]'::jsonb,

    -- Suggested Actions
    suggested_tags TEXT[],
    suggested_metadata JSONB DEFAULT '{}'::jsonb,
    suggested_relationships UUID[], -- Related document IDs

    -- Sentiment & Language
    sentiment VARCHAR(20), -- positive, negative, neutral
    sentiment_score DECIMAL(5,2),
    detected_language VARCHAR(10),
    language_confidence DECIMAL(5,2),

    -- PII/PHI Detection
    contains_pii BOOLEAN DEFAULT FALSE,
    pii_types TEXT[], -- ssn, credit_card, email, phone, etc.
    redaction_required BOOLEAN DEFAULT FALSE,

    -- Processing metadata
    ai_model_version VARCHAR(50),
    processing_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(document_id)
);

CREATE INDEX idx_ai_document ON document_ai_intelligence(document_id);
CREATE INDEX idx_ai_type ON document_ai_intelligence(detected_type);
CREATE INDEX idx_ai_pii ON document_ai_intelligence(contains_pii);
```

### Phase 2: Document Management Tables (P1)

#### 2.1 Enhanced Document Types
```sql
-- Document types already exist, enhance with AI learning
ALTER TABLE document_types
ADD COLUMN IF NOT EXISTS detection_keywords TEXT[],
ADD COLUMN IF NOT EXISTS file_patterns TEXT[], -- ['*.pdf', 'invoice_*.docx']
ADD COLUMN IF NOT EXISTS required_metadata_fields JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS optional_metadata_fields JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS auto_classification_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS retention_days INTEGER,
ADD COLUMN IF NOT EXISTS workflow_template_id UUID;

CREATE INDEX idx_doctypes_keywords ON document_types USING GIN(detection_keywords);
```

#### 2.2 Metadata Schemas & Fields
```sql
CREATE TABLE IF NOT EXISTS metadata_schemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    document_type_id UUID REFERENCES document_types(id) ON DELETE SET NULL,

    -- Schema definition
    schema_definition JSONB NOT NULL, -- Array of field definitions
    validation_rules JSONB DEFAULT '{}'::jsonb,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_metadata_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    schema_id UUID REFERENCES metadata_schemas(id) ON DELETE SET NULL,

    -- Flexible metadata storage
    metadata_values JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Validation
    is_validated BOOLEAN DEFAULT FALSE,
    validation_errors JSONB,

    -- AI-extracted vs manual
    extraction_source VARCHAR(50) DEFAULT 'manual', -- manual, ai, ocr, api

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(document_id, schema_id)
);

CREATE INDEX idx_metadata_values_doc ON document_metadata_values(document_id);
CREATE INDEX idx_metadata_values_schema ON document_metadata_values(schema_id);
CREATE INDEX idx_metadata_values_gin ON document_metadata_values USING GIN(metadata_values);
```

#### 2.3 Enhanced Check-In/Check-Out System
```sql
-- Enhance existing checkinout table
ALTER TABLE document_checkouts
ADD COLUMN IF NOT EXISTS checkout_reason TEXT,
ADD COLUMN IF NOT EXISTS expected_checkin_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_checkin_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS lock_version INTEGER DEFAULT 1;

CREATE TABLE IF NOT EXISTS checkout_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),

    action VARCHAR(20) NOT NULL, -- checkout, checkin, force_checkin, extend
    checkout_date TIMESTAMP WITH TIME ZONE,
    checkin_date TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,

    notes TEXT,
    ip_address INET,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_checkout_history_doc ON checkout_history(document_id);
CREATE INDEX idx_checkout_history_user ON checkout_history(user_id);
```

#### 2.4 Smart Folders & Saved Searches
```sql
-- Already exists, enhance
ALTER TABLE folders
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS share_settings JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_auto_refresh_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS refresh_frequency_minutes INTEGER;

CREATE TABLE IF NOT EXISTS saved_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Search criteria
    search_query TEXT,
    search_type VARCHAR(20) DEFAULT 'keyword', -- keyword, semantic, advanced
    filters JSONB DEFAULT '{}'::jsonb,

    -- Auto-execution
    is_auto_execute BOOLEAN DEFAULT FALSE,
    schedule_cron VARCHAR(100),
    notification_enabled BOOLEAN DEFAULT FALSE,

    -- Results
    last_executed_at TIMESTAMP WITH TIME ZONE,
    last_result_count INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);
```

### Phase 3: AI & Search Enhancement (P1-P2)

#### 3.1 Vector Embeddings for Semantic Search
```sql
-- Requires pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS document_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,

    -- Vector embeddings (OpenAI ada-002 = 1536 dimensions)
    content_embedding vector(1536),
    title_embedding vector(768),

    -- Chunk-based embeddings for large documents
    chunk_embeddings JSONB, -- [{chunk_id, start, end, embedding}, ...]

    -- Model info
    model_name VARCHAR(100) DEFAULT 'text-embedding-ada-002',
    model_version VARCHAR(50),

    -- Quality
    embedding_quality DECIMAL(5,2),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(document_id)
);

-- Vector similarity search index
CREATE INDEX idx_embeddings_content ON document_embeddings
USING ivfflat (content_embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX idx_embeddings_title ON document_embeddings
USING ivfflat (title_embedding vector_cosine_ops)
WITH (lists = 100);
```

#### 3.2 Full-Text Search Enhancement
```sql
-- Add tsvector columns for full-text search
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Update trigger for search vector
CREATE OR REPLACE FUNCTION documents_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.author, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_search_vector_trigger
BEFORE INSERT OR UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION documents_search_vector_update();

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_documents_search_vector
ON documents USING GIN(search_vector);

-- Trigram index for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_documents_title_trgm
ON documents USING GIN(title gin_trgm_ops);
```

#### 3.3 Document Activity & Analytics
```sql
CREATE TABLE IF NOT EXISTS document_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,

    -- View metrics
    total_views INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    avg_view_duration_seconds DECIMAL(10,2),
    last_viewed_at TIMESTAMP WITH TIME ZONE,

    -- Download metrics
    total_downloads INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMP WITH TIME ZONE,

    -- Edit metrics
    total_edits INTEGER DEFAULT 0,
    last_edited_at TIMESTAMP WITH TIME ZONE,

    -- Share metrics
    total_shares INTEGER DEFAULT 0,
    active_shares INTEGER DEFAULT 0,

    -- Collaboration
    total_comments INTEGER DEFAULT 0,
    total_annotations INTEGER DEFAULT 0,

    -- Time-series data (daily aggregates)
    daily_stats JSONB DEFAULT '[]'::jsonb,

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(document_id)
);

CREATE INDEX idx_analytics_doc ON document_analytics(document_id);
CREATE INDEX idx_analytics_views ON document_analytics(total_views DESC);
```

### Phase 4: Additional Support Tables

#### 4.1 Document Annotations
```sql
CREATE TABLE IF NOT EXISTS document_annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),

    -- Position
    page_number INTEGER,
    position JSONB NOT NULL, -- {x, y, width, height}

    -- Content
    annotation_type VARCHAR(50) NOT NULL, -- highlight, note, drawing, redaction
    content TEXT,
    color VARCHAR(20),

    -- Metadata
    tags TEXT[],
    is_private BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_annotations_doc ON document_annotations(document_id);
CREATE INDEX idx_annotations_user ON document_annotations(user_id);
```

#### 4.2 Document Workflow State
```sql
CREATE TABLE IF NOT EXISTS document_workflow_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES workflows(id),

    current_step_id UUID,
    current_step_name VARCHAR(200),

    status VARCHAR(50) DEFAULT 'in_progress', -- in_progress, completed, cancelled, failed

    -- Approval chain
    approvers JSONB DEFAULT '[]'::jsonb,
    approved_by UUID[],
    rejected_by UUID[],

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    deadline TIMESTAMP WITH TIME ZONE,

    -- Metadata
    workflow_data JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_states_doc ON document_workflow_states(document_id);
CREATE INDEX idx_workflow_states_status ON document_workflow_states(status);
```

---

## 🔌 API ENDPOINTS IMPLEMENTATION

### Phase 1: Core Document APIs (P0)

#### 1.1 Document Upload & File Management
**File:** `app/routers/documents.py`

```python
# NEW/ENHANCED ENDPOINTS

@router.post("/upload", response_model=Document)
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    document_type_id: Optional[str] = Form(None),
    folder_id: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    auto_ocr: bool = Form(True),
    auto_classify: bool = Form(True),
    current_user: User = Depends(get_current_user)
):
    """
    Enhanced upload with:
    - Local file storage (not Mayan)
    - Automatic checksum calculation
    - Thumbnail generation
    - Optional OCR processing
    - Optional AI classification
    """
    # 1. Save file to local storage
    # 2. Calculate checksums (MD5, SHA256)
    # 3. Generate thumbnail for images/PDFs
    # 4. Create database record
    # 5. Trigger OCR job if auto_ocr=True
    # 6. Trigger AI classification if auto_classify=True
    # 7. Return document object
    pass

@router.get("/{document_id}/download")
async def download_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """
    Download original file
    - Check permissions
    - Log access
    - Return FileResponse
    """
    pass

@router.get("/{document_id}/preview")
async def get_document_preview(
    document_id: UUID,
    page: int = 1,
    current_user: User = Depends(get_current_user)
):
    """
    Get preview image/PDF for viewer
    - Return preview file or generate on-the-fly
    """
    pass

@router.get("/{document_id}/thumbnail")
async def get_document_thumbnail(
    document_id: UUID,
    size: str = "medium",  # small, medium, large
    current_user: User = Depends(get_current_user)
):
    """Return thumbnail image"""
    pass

@router.delete("/{document_id}")
async def delete_document(
    document_id: UUID,
    permanent: bool = False,
    current_user: User = Depends(get_current_user)
):
    """
    Soft delete (default) or permanent delete
    - Soft: Set deleted_at timestamp
    - Permanent: Remove from DB and file system
    """
    pass

@router.post("/{document_id}/restore")
async def restore_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Restore soft-deleted document"""
    pass
```

#### 1.2 OCR Processing APIs
**File:** `app/routers/ocr.py`

```python
@router.post("/documents/{document_id}/ocr/start")
async def start_ocr_processing(
    document_id: UUID,
    language: str = "auto",
    engine: str = "tesseract",  # tesseract, azure_cv, aws_textract
    settings: Optional[OCRSettings] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Start OCR job
    - Create job record
    - Queue background task
    - Return job_id
    """
    pass

@router.get("/documents/{document_id}/ocr/status")
async def get_ocr_status(
    document_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Get OCR processing status and progress"""
    pass

@router.get("/documents/{document_id}/ocr/result")
async def get_ocr_result(
    document_id: UUID,
    include_confidence: bool = True,
    current_user: User = Depends(get_current_user)
):
    """
    Get OCR results
    Returns: OCRResult with extracted text, confidence scores
    """
    pass

@router.post("/documents/{document_id}/ocr/retry")
async def retry_ocr(
    document_id: UUID,
    engine: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Retry failed OCR with different settings/engine"""
    pass
```

#### 1.3 Document Intelligence APIs
**File:** `app/routers/ai_intelligence.py` (NEW)

```python
@router.post("/documents/{document_id}/analyze")
async def analyze_document(
    document_id: UUID,
    analysis_types: List[str] = ["classification", "entities", "sentiment"],
    current_user: User = Depends(get_current_user)
):
    """
    AI analysis of document
    - Document type classification
    - Entity extraction
    - Key phrase extraction
    - Sentiment analysis
    - PII/PHI detection
    """
    pass

@router.get("/documents/{document_id}/intelligence")
async def get_document_intelligence(
    document_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Get all AI intelligence data for document"""
    pass

@router.post("/documents/{document_id}/suggestions/accept")
async def accept_ai_suggestion(
    document_id: UUID,
    suggestion_type: str,  # tag, metadata, relationship
    suggestion_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Accept and apply AI suggestion"""
    pass

@router.get("/documents/{document_id}/relationships/suggested")
async def get_suggested_relationships(
    document_id: UUID,
    min_confidence: float = 0.7,
    current_user: User = Depends(get_current_user)
):
    """Get AI-suggested document relationships"""
    pass
```

### Phase 2: Search & Discovery APIs (P1)

#### 2.1 Advanced Search
**File:** `app/routers/search.py` (ENHANCE EXISTING)

```python
@router.post("/search/semantic")
async def semantic_search(
    query: str,
    limit: int = 20,
    filters: Optional[SearchFilters] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Semantic search using vector embeddings
    - Generate query embedding
    - Perform vector similarity search
    - Apply filters
    - Return ranked results
    """
    pass

@router.post("/search/advanced")
async def advanced_search(
    criteria: AdvancedSearchCriteria,
    current_user: User = Depends(get_current_user)
):
    """
    Advanced search with complex criteria
    - Multiple field searches
    - Date ranges
    - Metadata filters
    - Boolean operators
    """
    pass

@router.get("/search/suggestions")
async def get_search_suggestions(
    partial_query: str,
    current_user: User = Depends(get_current_user)
):
    """Auto-complete search suggestions"""
    pass

@router.post("/search/save")
async def save_search(
    search_data: SavedSearchCreate,
    current_user: User = Depends(get_current_user)
):
    """Save search for later use"""
    pass

@router.get("/search/saved")
async def get_saved_searches(
    current_user: User = Depends(get_current_user)
):
    """Get user's saved searches"""
    pass
```

#### 2.2 Document Relationships
**File:** `app/routers/relationships.py` (NEW)

```python
@router.get("/documents/{document_id}/relationships")
async def get_document_relationships(
    document_id: UUID,
    relationship_type: Optional[str] = None,
    include_suggested: bool = True,
    current_user: User = Depends(get_current_user)
):
    """Get all relationships for a document"""
    pass

@router.post("/documents/{document_id}/relationships")
async def create_relationship(
    document_id: UUID,
    relationship: RelationshipCreate,
    current_user: User = Depends(get_current_user)
):
    """Create manual relationship between documents"""
    pass

@router.delete("/relationships/{relationship_id}")
async def delete_relationship(
    relationship_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Remove relationship"""
    pass

@router.get("/documents/{document_id}/relationship-map")
async def get_relationship_map(
    document_id: UUID,
    depth: int = 2,
    current_user: User = Depends(get_current_user)
):
    """
    Get relationship graph for visualization
    Returns nodes and edges for D3.js/vis.js
    """
    pass
```

### Phase 3: Management APIs (P1)

#### 3.1 Folder Management
**File:** `app/routers/folders.py` (ENHANCE EXISTING)

```python
@router.post("/folders", response_model=Folder)
async def create_folder(
    folder: FolderCreate,
    current_user: User = Depends(get_current_user)
):
    """Create regular or smart folder"""
    pass

@router.get("/folders/{folder_id}/documents")
async def get_folder_documents(
    folder_id: UUID,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """
    Get documents in folder
    - For smart folders: Execute criteria and return results
    - For regular folders: Return direct children
    """
    pass

@router.post("/folders/{folder_id}/refresh")
async def refresh_smart_folder(
    folder_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Refresh smart folder results"""
    pass

@router.post("/folders/{folder_id}/share")
async def share_folder(
    folder_id: UUID,
    share_settings: FolderShareSettings,
    current_user: User = Depends(get_current_user)
):
    """Share folder with users/groups"""
    pass

@router.get("/folders/tree")
async def get_folder_tree(
    include_document_count: bool = True,
    current_user: User = Depends(get_current_user)
):
    """Get hierarchical folder tree"""
    pass
```

#### 3.2 Document Types Management
**File:** `app/routers/document_types.py` (ENHANCE)

```python
@router.get("/document-types")
async def get_document_types(
    include_stats: bool = True,
    current_user: User = Depends(get_current_user)
):
    """Get all document types with usage stats"""
    pass

@router.post("/document-types")
async def create_document_type(
    doc_type: DocumentTypeCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create document type with:
    - Metadata schema
    - Auto-classification rules
    - Retention policies
    """
    pass

@router.put("/document-types/{type_id}")
async def update_document_type(
    type_id: UUID,
    updates: DocumentTypeUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update document type"""
    pass

@router.post("/document-types/{type_id}/auto-classify")
async def auto_classify_documents(
    type_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Run auto-classification for this type on unclassified docs"""
    pass
```

#### 3.3 Tags Management
**File:** `app/routers/tags.py` (ENHANCE)

```python
@router.get("/tags")
async def get_tags(
    sort_by: str = "usage",  # usage, name, created
    current_user: User = Depends(get_current_user)
):
    """Get all tags with usage counts"""
    pass

@router.post("/tags")
async def create_tag(
    tag: TagCreate,
    current_user: User = Depends(get_current_user)
):
    """Create new tag"""
    pass

@router.post("/documents/{document_id}/tags")
async def add_tags_to_document(
    document_id: UUID,
    tag_ids: List[UUID],
    current_user: User = Depends(get_current_user)
):
    """Add tags to document"""
    pass

@router.delete("/documents/{document_id}/tags/{tag_id}")
async def remove_tag_from_document(
    document_id: UUID,
    tag_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Remove tag from document"""
    pass

@router.get("/tags/suggestions")
async def get_tag_suggestions(
    document_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Get AI-suggested tags for document"""
    pass

@router.post("/tags/merge")
async def merge_tags(
    source_tag_ids: List[UUID],
    target_tag_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Merge multiple tags into one"""
    pass
```

#### 3.4 Check-In/Check-Out
**File:** `app/routers/checkinout.py` (ENHANCE)

```python
@router.post("/documents/{document_id}/checkout")
async def checkout_document(
    document_id: UUID,
    checkout_data: CheckoutRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Check out document
    - Lock for editing
    - Prevent concurrent modifications
    - Set expected return date
    """
    pass

@router.post("/documents/{document_id}/checkin")
async def checkin_document(
    document_id: UUID,
    file: Optional[UploadFile] = None,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Check in document
    - Upload new version if file provided
    - Release lock
    - Log action
    """
    pass

@router.post("/documents/{document_id}/force-checkin")
async def force_checkin(
    document_id: UUID,
    reason: str,
    current_user: User = Depends(get_current_user)
):
    """Force check-in (admin only)"""
    pass

@router.get("/checkouts/my")
async def get_my_checkouts(
    current_user: User = Depends(get_current_user)
):
    """Get documents checked out by current user"""
    pass

@router.get("/checkouts/overdue")
async def get_overdue_checkouts(
    current_user: User = Depends(get_current_user)
):
    """Get overdue checkouts (admin/manager)"""
    pass
```

#### 3.5 Metadata Management
**File:** `app/routers/metadata.py` (NEW)

```python
@router.get("/metadata/schemas")
async def get_metadata_schemas(
    document_type_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all metadata schemas"""
    pass

@router.post("/metadata/schemas")
async def create_metadata_schema(
    schema: MetadataSchemaCreate,
    current_user: User = Depends(get_current_user)
):
    """Create custom metadata schema"""
    pass

@router.get("/documents/{document_id}/metadata")
async def get_document_metadata(
    document_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Get all metadata for document"""
    pass

@router.put("/documents/{document_id}/metadata")
async def update_document_metadata(
    document_id: UUID,
    metadata: Dict[str, Any],
    schema_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user)
):
    """Update document metadata"""
    pass

@router.post("/documents/{document_id}/metadata/extract")
async def extract_metadata_from_content(
    document_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """
    AI-powered metadata extraction
    - Extract from document content
    - Populate metadata fields automatically
    """
    pass

@router.post("/documents/{document_id}/metadata/validate")
async def validate_metadata(
    document_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Validate metadata against schema"""
    pass
```

### Phase 4: Analytics & Monitoring (P2)

#### 4.1 Document Analytics
**File:** `app/routers/analytics.py` (NEW)

```python
@router.get("/documents/{document_id}/analytics")
async def get_document_analytics(
    document_id: UUID,
    time_range: str = "30d",
    current_user: User = Depends(get_current_user)
):
    """Get analytics for specific document"""
    pass

@router.get("/analytics/dashboard")
async def get_analytics_dashboard(
    current_user: User = Depends(get_current_user)
):
    """
    Overall document system analytics
    - Total documents
    - Storage used
    - Most viewed documents
    - Activity trends
    """
    pass

@router.get("/analytics/user-activity")
async def get_user_activity(
    user_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user)
):
    """Get user activity report"""
    pass
```

---

## 🎨 FRONTEND INTEGRATION

### Phase 1: Core Document Features (P0)

#### 1.1 Update AdvancedDocumentLibraryV3.tsx
**File:** `AdvancedDocumentLibraryV3.tsx`

**Issues Found:**
- Using hardcoded mock data ✅ FIXED
- Upload goes to Mayan instead of internal API
- Preview system not connected to real data
- OCR preview shows mock data
- All tabs showing placeholder content

**Implementation:**

```typescript
// ALREADY DONE: Basic document listing from API ✅

// TODO: Fix upload to use internal API
const handleUploadComplete = async (files: File[]) => {
  try {
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      formData.append('auto_ocr', 'true');
      formData.append('auto_classify', 'true');

      const response = await documentsService.uploadDocument(formData);
      console.log('Document uploaded:', response);
    }

    // Refresh document list
    setRefreshTrigger(prev => prev + 1);
    handlePageChange('library');
  } catch (error) {
    console.error('Upload failed:', error);
  }
};

// TODO: Connect preview to real document
const handleDocumentDoubleClick = async (doc: Document) => {
  setSelectedDocument(doc);

  // Fetch full document details including preview URL
  const fullDoc = await documentsService.getDocumentDetails(doc.id);
  setSelectedDocument(fullDoc);

  setShowPreview(true);
  setPreviewTab('document');
};
```

#### 1.2 Fix EnhancedUploadInterface.tsx
**File:** `components/documents/upload/EnhancedUploadInterface.tsx`

**Current Issues:**
- Uses Mayan EDMS API
- Mock metadata extraction
- No connection to internal upload endpoint

**Fix Implementation:**

```typescript
// Update uploadToServer function
const uploadToServer = async (fileWithPreview: FileWithPreview) => {
  try {
    setSelectedFiles(prev => prev.map(f =>
      f.id === fileWithPreview.id
        ? { ...f, status: 'uploading', progress: 0 }
        : f
    ));

    const formData = new FormData();
    formData.append('file', fileWithPreview.file);
    formData.append('title', fileWithPreview.file.name);

    // Add metadata
    if (fileWithPreview.metadata.category) {
      formData.append('document_type', fileWithPreview.metadata.category);
    }

    // Add tags if any
    if (fileWithPreview.extractedMetadata?.suggestedTags) {
      formData.append('tags', fileWithPreview.extractedMetadata.suggestedTags.join(','));
    }

    formData.append('auto_ocr', 'true');
    formData.append('auto_classify', 'true');

    // Upload to INTERNAL API (not Mayan)
    const response = await documentsService.uploadDocument(formData, {
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setSelectedFiles(prev => prev.map(f =>
          f.id === fileWithPreview.id ? { ...f, progress } : f
        ));
      }
    });

    setSelectedFiles(prev => prev.map(f =>
      f.id === fileWithPreview.id
        ? { ...f, status: 'success', progress: 100 }
        : f
    ));

    return response;
  } catch (error) {
    setSelectedFiles(prev => prev.map(f =>
      f.id === fileWithPreview.id
        ? { ...f, status: 'error', error: error.message }
        : f
    ));
    throw error;
  }
};
```

#### 1.3 Implement DocumentPreviewPanel Integration
**File:** `components/documents/preview/DocumentPreviewPanel.tsx`

**Current Issues:**
- Uses mock OCR data
- No real document loading
- Preview URL not connected

**Fix Implementation:**

```typescript
// Add real document loading
useEffect(() => {
  if (document?.id) {
    loadDocumentPreview();
  }
}, [document]);

const loadDocumentPreview = async () => {
  try {
    setIsLoading(true);

    // Get document preview URL
    const previewUrl = await documentsService.getDocumentPreviewUrl(document.id);
    setPreviewUrl(previewUrl);

    setIsLoading(false);
  } catch (error) {
    console.error('Failed to load preview:', error);
    setError(error.message);
    setIsLoading(false);
  }
};

// Update OCR data loading
const loadOCRData = async () => {
  setIsLoadingOCR(true);
  setOcrError(null);

  try {
    // Get REAL OCR results from API
    const ocrResult = await ocrService.getOCRResult(document.id);

    if (ocrResult) {
      setOcrResult(ocrResult);

      const previewData: OCRPreviewData = {
        extractedText: ocrResult.extractedText,
        confidence: {
          overall: ocrResult.confidence.overall,
          byPage: ocrResult.confidence.byPage.map(p => p.confidence),
        },
        language: ocrResult.language,
        pageCount: ocrResult.pageCount,
      };

      setOcrPreviewData(previewData);
    } else {
      // OCR not yet processed
      setOcrError('OCR processing not started. Click below to start.');
    }
  } catch (err) {
    console.error('Failed to load OCR data:', err);
    setOcrError(err instanceof Error ? err.message : 'Failed to load OCR data');
  } finally {
    setIsLoadingOCR(false);
  }
};

// Add OCR start function
const startOCRProcessing = async () => {
  try {
    setIsLoadingOCR(true);
    await ocrService.startOCRProcessing(document.id);

    // Poll for completion
    pollOCRStatus();
  } catch (error) {
    setOcrError(error.message);
    setIsLoadingOCR(false);
  }
};

const pollOCRStatus = async () => {
  const interval = setInterval(async () => {
    try {
      const status = await ocrService.getOCRStatus(document.id);

      if (status.status === 'completed') {
        clearInterval(interval);
        loadOCRData();
      } else if (status.status === 'failed') {
        clearInterval(interval);
        setOcrError('OCR processing failed');
        setIsLoadingOCR(false);
      }
    } catch (error) {
      clearInterval(interval);
      setOcrError(error.message);
      setIsLoadingOCR(false);
    }
  }, 2000);
};
```

### Phase 2: Tab Pages Implementation (P1)

#### 2.1 Folder Manager Tab
**File:** `components/documents/folders/FolderManager.tsx`

```typescript
// Connect to real folder API
const [folders, setFolders] = useState<Folder[]>([]);
const [isLoading, setIsLoading] = useState(false);

useEffect(() => {
  loadFolders();
}, []);

const loadFolders = async () => {
  setIsLoading(true);
  try {
    const response = await foldersService.getFolderTree();
    setFolders(response);
  } catch (error) {
    console.error('Failed to load folders:', error);
  } finally {
    setIsLoading(false);
  }
};

const handleCreateFolder = async (folderData: FolderCreate) => {
  try {
    const newFolder = await foldersService.createFolder(folderData);
    setFolders([...folders, newFolder]);
    onFolderCreate?.(newFolder);
  } catch (error) {
    console.error('Failed to create folder:', error);
  }
};

const handleUpdateFolder = async (folderId: string, updates: FolderUpdate) => {
  try {
    const updated = await foldersService.updateFolder(folderId, updates);
    setFolders(folders.map(f => f.id === folderId ? updated : f));
    onFolderUpdate?.(folderId, updates);
  } catch (error) {
    console.error('Failed to update folder:', error);
  }
};

const handleDeleteFolder = async (folderId: string) => {
  try {
    await foldersService.deleteFolder(folderId);
    setFolders(folders.filter(f => f.id !== folderId));
    onFolderDelete?.(folderId);
  } catch (error) {
    console.error('Failed to delete folder:', error);
  }
};
```

#### 2.2 Document Types Manager
**File:** `components/documents/doctypes/DocTypeManager.tsx`

```typescript
const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
const [isCreating, setIsCreating] = useState(false);

useEffect(() => {
  loadDocumentTypes();
}, []);

const loadDocumentTypes = async () => {
  try {
    const types = await documentTypesService.getDocumentTypes(true); // include stats
    setDocumentTypes(types);
  } catch (error) {
    console.error('Failed to load document types:', error);
  }
};

const handleCreateType = async (typeData: DocumentTypeCreate) => {
  try {
    const newType = await documentTypesService.createDocumentType(typeData);
    setDocumentTypes([...documentTypes, newType]);
    setIsCreating(false);
  } catch (error) {
    console.error('Failed to create document type:', error);
  }
};

const handleUpdateType = async (typeId: string, updates: DocumentTypeUpdate) => {
  try {
    const updated = await documentTypesService.updateDocumentType(typeId, updates);
    setDocumentTypes(documentTypes.map(t => t.id === typeId ? updated : t));
  } catch (error) {
    console.error('Failed to update document type:', error);
  }
};
```

#### 2.3 Tag Manager
**File:** `components/documents/tags/TagManager.tsx`

```typescript
const [tags, setTags] = useState<Tag[]>([]);
const [sortBy, setSortBy] = useState<'usage' | 'name' | 'created'>('usage');

useEffect(() => {
  loadTags();
}, [sortBy]);

const loadTags = async () => {
  try {
    const tagList = await tagsService.getTags(sortBy);
    setTags(tagList);
  } catch (error) {
    console.error('Failed to load tags:', error);
  }
};

const handleCreateTag = async (tagData: TagCreate) => {
  try {
    const newTag = await tagsService.createTag(tagData);
    setTags([...tags, newTag]);
  } catch (error) {
    console.error('Failed to create tag:', error);
  }
};

const handleMergeTags = async (sourceIds: string[], targetId: string) => {
  try {
    await tagsService.mergeTags(sourceIds, targetId);
    loadTags(); // Reload to get updated counts
  } catch (error) {
    console.error('Failed to merge tags:', error);
  }
};
```

#### 2.4 Check In/Out Manager
**File:** `components/documents/lifecycle/CheckInOutManager.tsx`

```typescript
const [checkouts, setCheckouts] = useState<Checkout[]>([]);
const [myCheckouts, setMyCheckouts] = useState<Checkout[]>([]);
const [overdueCheckouts, setOverdueCheckouts] = useState<Checkout[]>([]);

useEffect(() => {
  loadCheckoutData();
}, []);

const loadCheckoutData = async () => {
  try {
    const [my, overdue] = await Promise.all([
      checkInOutService.getMyCheckouts(),
      checkInOutService.getOverdueCheckouts(),
    ]);
    setMyCheckouts(my);
    setOverdueCheckouts(overdue);
  } catch (error) {
    console.error('Failed to load checkout data:', error);
  }
};

const handleCheckout = async (documentId: string, data: CheckoutRequest) => {
  try {
    await checkInOutService.checkoutDocument(documentId, data);
    loadCheckoutData();
  } catch (error) {
    console.error('Failed to checkout:', error);
  }
};

const handleCheckin = async (documentId: string, file?: File, notes?: string) => {
  try {
    await checkInOutService.checkinDocument(documentId, file, notes);
    loadCheckoutData();
  } catch (error) {
    console.error('Failed to checkin:', error);
  }
};

const handleForceCheckin = async (documentId: string, reason: string) => {
  try {
    await checkInOutService.forceCheckin(documentId, reason);
    loadCheckoutData();
  } catch (error) {
    console.error('Failed to force checkin:', error);
  }
};
```

#### 2.5 Metadata Manager
**File:** `components/documents/metadata/MetadataManager.tsx`

```typescript
const [schemas, setSchemas] = useState<MetadataSchema[]>([]);
const [selectedSchema, setSelectedSchema] = useState<MetadataSchema | null>(null);
const [isDesigning, setIsDesigning] = useState(false);

useEffect(() => {
  loadSchemas();
}, []);

const loadSchemas = async () => {
  try {
    const schemaList = await metadataService.getMetadataSchemas();
    setSchemas(schemaList);
  } catch (error) {
    console.error('Failed to load schemas:', error);
  }
};

const handleCreateSchema = async (schemaData: MetadataSchemaCreate) => {
  try {
    const newSchema = await metadataService.createMetadataSchema(schemaData);
    setSchemas([...schemas, newSchema]);
    setIsDesigning(false);
  } catch (error) {
    console.error('Failed to create schema:', error);
  }
};

// For editing document metadata
const handleUpdateDocumentMetadata = async (
  documentId: string,
  metadata: Record<string, any>
) => {
  try {
    await metadataService.updateDocumentMetadata(documentId, metadata);
  } catch (error) {
    console.error('Failed to update metadata:', error);
  }
};

const handleExtractMetadata = async (documentId: string) => {
  try {
    const extracted = await metadataService.extractMetadata(documentId);
    // Show extracted metadata for review before applying
    return extracted;
  } catch (error) {
    console.error('Failed to extract metadata:', error);
  }
};
```

### Phase 3: AI Features Implementation (P2)

#### 3.1 Document Intelligence Panel
**File:** `components/documents/intelligence/DocumentIntelligencePanel.tsx`

```typescript
const [intelligence, setIntelligence] = useState<DocumentIntelligence | null>(null);
const [isLoading, setIsLoading] = useState(false);

useEffect(() => {
  if (document?.id) {
    loadIntelligence();
  }
}, [document]);

const loadIntelligence = async () => {
  setIsLoading(true);
  try {
    const data = await aiIntelligenceService.getDocumentIntelligence(document.id);
    setIntelligence(data);
  } catch (error) {
    console.error('Failed to load intelligence:', error);
  } finally {
    setIsLoading(false);
  }
};

const handleAcceptSuggestion = async (type: string, data: any) => {
  try {
    await aiIntelligenceService.acceptSuggestion(document.id, type, data);

    // Refresh intelligence and document
    loadIntelligence();
    onDocumentUpdated?.();
  } catch (error) {
    console.error('Failed to accept suggestion:', error);
  }
};

const handleAnalyzeDocument = async () => {
  try {
    setIsLoading(true);
    await aiIntelligenceService.analyzeDocument(document.id);
    await loadIntelligence();
  } catch (error) {
    console.error('Failed to analyze document:', error);
  } finally {
    setIsLoading(false);
  }
};
```

#### 3.2 Cognitive Search Panel
**File:** `components/documents/search/DocumentSearchPanel.tsx`

```typescript
const [searchResults, setSearchResults] = useState<Document[]>([]);
const [isSearching, setIsSearching] = useState(false);
const [searchInsights, setSearchInsights] = useState<SearchInsights | null>(null);

const handleSearch = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!searchQuery.trim()) return;

  setIsSearching(true);
  try {
    let results;

    if (searchType === 'semantic') {
      results = await searchService.semanticSearch(searchQuery);

      // Get AI insights about the search
      const insights = await searchService.getSearchInsights(searchQuery);
      setSearchInsights(insights);
    } else {
      results = await searchService.keywordSearch(searchQuery);
    }

    setSearchResults(results);
    onSearchResults?.(results);
  } catch (error) {
    console.error('Search failed:', error);
  } finally {
    setIsSearching(false);
  }
};

const handleSaveSearch = async () => {
  try {
    await searchService.saveSearch({
      name: `Search: ${searchQuery.substring(0, 50)}`,
      query: searchQuery,
      searchType,
      filters: currentFilters,
    });
  } catch (error) {
    console.error('Failed to save search:', error);
  }
};
```

#### 3.3 Document Relationship Map
**File:** `components/documents/relationships/DocumentRelationshipMap.tsx` (NEW)

```typescript
const [relationshipData, setRelationshipData] = useState<RelationshipGraph | null>(null);
const [isLoading, setIsLoading] = useState(false);

useEffect(() => {
  if (document?.id) {
    loadRelationshipMap();
  }
}, [document]);

const loadRelationshipMap = async () => {
  setIsLoading(true);
  try {
    const graph = await relationshipsService.getRelationshipMap(document.id, 2);
    setRelationshipData(graph);
  } catch (error) {
    console.error('Failed to load relationship map:', error);
  } finally {
    setIsLoading(false);
  }
};

// Render using D3.js or vis.js for interactive graph
const renderGraph = () => {
  if (!relationshipData) return null;

  return (
    <ForceGraph3D
      graphData={relationshipData}
      nodeLabel="name"
      nodeColor={node => getNodeColor(node.type)}
      linkColor={() => 'rgba(255,255,255,0.2)'}
      onNodeClick={handleNodeClick}
    />
  );
};

const handleNodeClick = (node: any) => {
  // Navigate to related document
  onDocumentSelect?.(node.id);
};
```

### Phase 4: Service Layer Implementation

#### 4.1 Create documentsService.ts enhancements
**File:** `services/api/documentsService.ts`

```typescript
class DocumentsService {
  // Already implemented: getDocuments ✅

  async uploadDocument(formData: FormData, options?: UploadOptions): Promise<Document> {
    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      onUploadProgress: options?.onUploadProgress,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getDocumentDetails(documentId: string): Promise<Document> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get document: ${response.statusText}`);
    }

    return response.json();
  }

  async getDocumentPreviewUrl(documentId: string): Promise<string> {
    return `${API_BASE_URL}/documents/${documentId}/preview`;
  }

  async getDocumentDownloadUrl(documentId: string): Promise<string> {
    return `${API_BASE_URL}/documents/${documentId}/download`;
  }

  async deleteDocument(documentId: string, permanent: boolean = false): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/documents/${documentId}?permanent=${permanent}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete document: ${response.statusText}`);
    }
  }
}

export const documentsService = new DocumentsService();
```

#### 4.2 Create ocrService.ts
**File:** `services/api/ocrService.ts` (NEW)

```typescript
class OCRService {
  async startOCRProcessing(
    documentId: string,
    options?: OCRProcessingOptions
  ): Promise<{ jobId: string }> {
    const response = await fetch(
      `${API_BASE_URL}/ocr/documents/${documentId}/ocr/start`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(options),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to start OCR: ${response.statusText}`);
    }

    return response.json();
  }

  async getOCRStatus(documentId: string): Promise<OCRStatus> {
    const response = await fetch(
      `${API_BASE_URL}/ocr/documents/${documentId}/ocr/status`,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get OCR status: ${response.statusText}`);
    }

    return response.json();
  }

  async getOCRResult(documentId: string): Promise<OCRResult | null> {
    const response = await fetch(
      `${API_BASE_URL}/ocr/documents/${documentId}/ocr/result`,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      }
    );

    if (response.status === 404) {
      return null; // OCR not yet processed
    }

    if (!response.ok) {
      throw new Error(`Failed to get OCR result: ${response.statusText}`);
    }

    return response.json();
  }

  async retryOCR(documentId: string, engine?: string): Promise<{ jobId: string }> {
    const response = await fetch(
      `${API_BASE_URL}/ocr/documents/${documentId}/ocr/retry`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ engine }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to retry OCR: ${response.statusText}`);
    }

    return response.json();
  }
}

export const ocrService = new OCRService();
```

#### 4.3 Create aiIntelligenceService.ts
**File:** `services/api/aiIntelligenceService.ts` (NEW)

```typescript
class AIIntelligenceService {
  async analyzeDocument(
    documentId: string,
    analysisTypes?: string[]
  ): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/ai-intelligence/documents/${documentId}/analyze`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ analysis_types: analysisTypes }),
      }
    );

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }
  }

  async getDocumentIntelligence(documentId: string): Promise<DocumentIntelligence> {
    const response = await fetch(
      `${API_BASE_URL}/ai-intelligence/documents/${documentId}/intelligence`,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get intelligence: ${response.statusText}`);
    }

    return response.json();
  }

  async acceptSuggestion(
    documentId: string,
    suggestionType: string,
    suggestionData: any
  ): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/ai-intelligence/documents/${documentId}/suggestions/accept`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          suggestion_type: suggestionType,
          suggestion_data: suggestionData,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to accept suggestion: ${response.statusText}`);
    }
  }

  async getSuggestedRelationships(
    documentId: string,
    minConfidence: number = 0.7
  ): Promise<SuggestedRelationship[]> {
    const response = await fetch(
      `${API_BASE_URL}/ai-intelligence/documents/${documentId}/relationships/suggested?min_confidence=${minConfidence}`,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get suggestions: ${response.statusText}`);
    }

    return response.json();
  }
}

export const aiIntelligenceService = new AIIntelligenceService();
```

#### 4.4 Create additional service files

```typescript
// services/api/foldersService.ts
// services/api/documentTypesService.ts
// services/api/tagsService.ts
// services/api/checkInOutService.ts
// services/api/metadataService.ts
// services/api/searchService.ts
// services/api/relationshipsService.ts
```

---

## 📅 IMPLEMENTATION TIMELINE

### Sprint 1: Core Infrastructure (2 weeks) - P0
**Goal:** Get document upload, storage, and basic preview working

**Week 1:**
- [ ] Database migrations for core tables
- [ ] File storage system setup (local/S3)
- [ ] Upload API endpoint
- [ ] Document CRUD endpoints
- [ ] Fix upload in frontend

**Week 2:**
- [ ] Document preview system
- [ ] Thumbnail generation
- [ ] Download endpoints
- [ ] Basic OCR integration
- [ ] Frontend preview integration

### Sprint 2: OCR & Preview (1.5 weeks) - P0
**Goal:** Complete OCR processing and preview functionality

**Week 3:**
- [ ] OCR processing pipeline
- [ ] OCR API endpoints
- [ ] OCR results table
- [ ] Frontend OCR preview
- [ ] OCR status polling

### Sprint 3: Document Management (2 weeks) - P1
**Goal:** Folders, types, tags, metadata

**Week 4:**
- [ ] Folders API implementation
- [ ] Document types enhancement
- [ ] Tags system
- [ ] Frontend folder manager
- [ ] Frontend document types manager

**Week 5:**
- [ ] Metadata schemas
- [ ] Metadata management APIs
- [ ] Check-in/check-out enhancement
- [ ] Frontend tag manager
- [ ] Frontend metadata manager
- [ ] Frontend check-in/out manager

### Sprint 4: Search & Intelligence (2 weeks) - P1-P2
**Goal:** Semantic search and AI features

**Week 6:**
- [ ] Vector embeddings setup
- [ ] Semantic search API
- [ ] Advanced search
- [ ] Frontend search integration
- [ ] Saved searches

**Week 7:**
- [ ] AI intelligence pipeline
- [ ] Document classification
- [ ] Entity extraction
- [ ] Frontend intelligence panel
- [ ] Suggestions system

### Sprint 5: Relationships & Analytics (1.5 weeks) - P2
**Goal:** Document relationships and analytics

**Week 8:**
- [ ] Relationship detection
- [ ] Relationship APIs
- [ ] Frontend relationship map
- [ ] Analytics system
- [ ] Activity tracking

### Sprint 6: Polish & Testing (1 week) - P2
**Goal:** Bug fixes, optimization, testing

**Week 9:**
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Documentation
- [ ] User acceptance testing

---

## 🎯 SUCCESS METRICS

### Technical Metrics
- ✅ 100% of features using internal APIs (not Mayan)
- ✅ < 2s document upload time for files < 10MB
- ✅ < 1s document preview load time
- ✅ < 3s OCR processing for 1-page documents
- ✅ > 90% OCR accuracy
- ✅ < 500ms semantic search response time

### Functional Metrics
- ✅ All 7 tab pages fully functional
- ✅ All 18 document tools operational
- ✅ Document preview working for PDF, images, text
- ✅ OCR preview with confidence scores
- ✅ AI suggestions with > 80% accuracy
- ✅ Semantic search returning relevant results

### User Experience Metrics
- ✅ Zero broken/mock data components
- ✅ Smooth file upload with progress
- ✅ Real-time OCR status updates
- ✅ Instant document search
- ✅ Intuitive folder management

---

## 🔧 TECHNICAL STACK

### Backend
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL 14+
- **Extensions:** pgvector, pg_trgm, uuid-ossp
- **Storage:** Local filesystem (upgradeable to S3)
- **OCR:** Tesseract (primary), Azure CV (optional)
- **AI/ML:** OpenAI API (embeddings, GPT-4)
- **Background Jobs:** Celery + Redis

### Frontend
- **Framework:** React 18 + TypeScript
- **State:** Redux Toolkit
- **Routing:** React Router v6
- **UI:** TailwindCSS
- **Charts:** D3.js (relationship maps)
- **PDF Viewer:** react-pdf
- **Upload:** axios with progress tracking

### DevOps
- **Containers:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Monitoring:** Prometheus + Grafana
- **Logging:** ELK Stack

---

## 🚨 CRITICAL DEPENDENCIES

### Must Complete First
1. Database migrations (all core tables)
2. File storage system
3. Upload API endpoint
4. Authentication middleware

### Blocking Issues
1. **Mayan Integration:** Must fully replace with internal system
2. **Mock Data:** All hardcoded data must be removed
3. **API Connections:** All components need real API integration

### External Dependencies
1. OpenAI API key (for embeddings & GPT-4)
2. Azure Computer Vision (optional, for advanced OCR)
3. S3/Azure Blob (optional, for cloud storage)

---

## 📝 MIGRATION NOTES

### From Mayan EDMS to Internal System

**Current State:**
- Upload goes to Mayan API
- Documents stored in Mayan
- Cabinets concept from Mayan

**Migration Steps:**
1. Implement internal upload API
2. Create file storage system
3. Update frontend upload component
4. Migrate existing documents (if any)
5. Remove Mayan API calls
6. Keep cabinet concept but make it internal

---

## 🎓 DEVELOPER NOTES

### Code Standards
- TypeScript strict mode enabled
- ESLint + Prettier configured
- Component naming: PascalCase
- File naming: camelCase for utilities, PascalCase for components
- API response format: `{ data, error, meta }`

### Testing Requirements
- Unit tests for all services
- Integration tests for API endpoints
- E2E tests for critical flows
- Minimum 80% code coverage

### Documentation
- API documentation (OpenAPI/Swagger)
- Component Storybook
- Database schema diagrams
- Architecture decision records (ADRs)

---

## 📞 SUPPORT & RESOURCES

### Key Files Reference
- **Main Page:** `AdvancedDocumentLibraryV3.tsx`
- **Upload:** `EnhancedUploadInterface.tsx`
- **Preview:** `DocumentPreviewPanel.tsx`
- **Database Schema:** `database/migrations/04-comprehensive-schema.sql`
- **Document Models:** `app/models/documents.py`
- **Document Router:** `app/routers/documents.py`

### API Documentation
- Swagger UI: `http://localhost:8888/docs`
- ReDoc: `http://localhost:8888/redoc`

---

## ✅ COMPLETION CHECKLIST

### Phase 1: Core (P0)
- [ ] Database tables created
- [ ] Upload API working
- [ ] File storage system operational
- [ ] Document CRUD complete
- [ ] Preview system working
- [ ] OCR processing functional
- [ ] Frontend upload fixed
- [ ] Frontend preview fixed

### Phase 2: Management (P1)
- [ ] Folders fully functional
- [ ] Document types working
- [ ] Tags system complete
- [ ] Check-in/out operational
- [ ] Metadata manager working
- [ ] All tab pages functional

### Phase 3: Intelligence (P2)
- [ ] Semantic search working
- [ ] AI classification active
- [ ] Entity extraction working
- [ ] Relationship detection operational
- [ ] Intelligence panel showing real data
- [ ] Analytics tracking events

### Phase 4: Polish
- [ ] All mock data removed
- [ ] All components connected to APIs
- [ ] Error handling complete
- [ ] Loading states implemented
- [ ] Tests passing
- [ ] Documentation complete

---

## 🎉 FINAL NOTES

This is a complete rebuild of the Documents ecosystem. The current implementation has only basic document listing working. Everything else needs to be built from the ground up.

**Estimated Total Time:** 8-9 weeks (full-time development)

**Team Recommendation:**
- 1 Backend Developer (Python/FastAPI)
- 1 Frontend Developer (React/TypeScript)
- 1 DevOps Engineer (part-time)
- 1 QA Engineer (part-time)

**Risk Areas:**
1. OCR processing performance at scale
2. Vector embedding generation time
3. File storage costs (if using cloud)
4. AI API costs (OpenAI)

**Quick Wins:**
1. Fix upload to internal API (Week 1)
2. Get preview working (Week 2)
3. Enable OCR (Week 3)
4. Add semantic search (Week 6)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-06
**Author:** Development Team
**Status:** Ready for Implementation

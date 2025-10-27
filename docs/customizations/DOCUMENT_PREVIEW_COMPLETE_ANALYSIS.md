# Document Preview System - Complete Analysis & Implementation Plan

**Date**: 2025-10-09
**Status**: 65% Complete - Needs API Integration

---

## 📊 CURRENT IMPLEMENTATION STATUS

### ✅ What's Already Built (Frontend Structure)

#### 1. **Main Document Library** (`AdvancedDocumentLibraryV3.tsx`)
- ✅ Document grid/list/detail views
- ✅ Folder navigation
- ✅ Document selection
- ✅ Preview panel trigger
- ✅ Tab switching for 3 sidebar panels

#### 2. **Document Preview Panel** (`DocumentPreviewPanel.tsx`)
- ✅ Document viewer (PDF, Image, Text)
- ✅ OCR tab structure
- ✅ Search panel integration
- ⚠️ OCR data loading (commented out - NOT connected to backend)

#### 3. **Three Sidebar Tabs** (RIGHT PANEL)

##### **Tab 1: AI Services** (`DocumentAIFeaturesPanel.tsx`)
**Purpose**: AI-powered document features

**Current State**: 🔴 ALL MOCK DATA - Not connected to backend

**Features Shown (Hardcoded)**:
- 🤖 AI Annotations (Penalty clauses, PII redaction, data links)
- ✨ AI Document Generator (text area + buttons)
- 🎬 Multi-Modal Analysis (text/images/audio/tables)
- 🎯 Analysis Confidence Scores (Overall quality, OCR accuracy, coverage)

**What Needs to be Connected**:
- `/api/v1/ai/annotations/{document_id}` - Get AI annotations
- `/api/v1/ai/generate` - Generate documents from prompts
- `/api/v1/ai/multimodal/{document_id}` - Multi-modal content analysis
- `/api/v1/ocr/results/{document_id}` - Get OCR confidence scores

---

##### **Tab 2: Document Intelligence** (`DocumentIntelligencePanel.tsx`)
**Purpose**: Document metadata, versions, audit trail, compliance

**Current State**: 🔴 ALL MOCK DATA - Not connected to backend

**Features Shown (Hardcoded)**:
- 💡 Smart Suggestions (Tags, links, approval recommendations)
- 🔬 Classification (Document type, category with confidence)
- 📚 Version History (v3.2, v3.1, v3.0 with changes)
- 📋 Audit Trail (Access logs, metadata updates, downloads)
- 📍 Physical Location (Barcode tracking, warehouse location)
- 🔬 Content Analysis (Entities, language, stats)
- ⏱️ Retention & Compliance (Retention schedule, compliance status)

**What Needs to be Connected**:
- `/api/v1/documents/{id}` - Get full document details
- `/api/v1/ai/suggestions/{document_id}` - Get smart suggestions
- `/api/v1/classification/{document_id}` - Get classification results
- `/api/v1/documents/{id}/versions` - Get version history
- `/api/v1/audit_logs?document_id={id}` - Get audit trail
- `/api/v1/physical/barcode/{document_id}` - Get barcode tracking
- `/api/v1/warehouse/location/{document_id}` - Get physical location
- `/api/v1/ai/extract-entities/{document_id}` - Content analysis
- `/api/v1/documents/{id}/retention` - Retention policy data

---

##### **Tab 3: Tools** (`DocumentToolsRouter.tsx`)
**Purpose**: 19 document management tools

**Current State**: 🟡 PARTIALLY IMPLEMENTED

**Implemented Tools (7/19)**:
1. ✅ ACLs - Access control lists
2. ✅ Cabinets - Cabinet management
3. ✅ Comments - Document comments
4. ✅ Metadata - Metadata editing
5. ✅ Tags - Tag management
6. ✅ Versions - Version control
7. ✅ Workflows - Workflow assignment

**NOT Implemented (12/19)** - Show PlaceholderTool:
8. ❌ Check-in/out
9. ❌ Duplicates
10. ❌ Events
11. ❌ Files
12. ❌ Indexes
13. ❌ Preview
14. ❌ Properties
15. ❌ Sandbox
16. ❌ Signatures
17. ❌ Smart links
18. ❌ Subscriptions
19. ❌ Web links

**What Needs to be Done**:
- Implement remaining 12 tool components
- Connect all tools to their respective backend APIs

---

## 🔧 BACKEND API ENDPOINTS STATUS

### ✅ Already Implemented in Backend

```python
# Documents
/api/v1/documents                    ✅ GET, POST
/api/v1/documents/{id}              ✅ GET, PATCH, DELETE
/api/v1/documents/upload            ✅ POST
/api/v1/documents/{id}/versions     ✅ GET, POST
/api/v1/documents/{id}/metadata     ✅ GET, PATCH

# OCR
/api/v1/ocr/process                 ✅ POST
/api/v1/ocr/results/{document_id}   ✅ GET
/api/v1/ocr/retry                   ✅ POST

# AI Services
/api/v1/classification              ✅ POST (classify document)
/api/v1/metadata-extraction         ✅ POST (extract metadata)
/api/v1/embeddings/generate         ✅ POST
/api/v1/search/semantic             ✅ POST
/api/v1/rag/query                   ✅ POST (RAG query)

# Physical Tracking
/api/v1/physical/barcodes           ✅ GET, POST
/api/v1/physical/locations          ✅ GET, POST
/api/v1/checkinout                  ✅ GET, POST

# Warehouse
/api/v1/warehouse/locations         ✅ GET, POST
/api/v1/warehouse/zones             ✅ GET, POST
/api/v1/warehouse/racks             ✅ GET, POST

# Workflows
/api/v1/workflows                   ✅ GET, POST
/api/v1/approvals                   ✅ GET, POST

# Audit
/api/v1/audit_logs                  ✅ GET
```

### ❌ Missing Backend Endpoints

```python
# AI Intelligence Features (Needs Implementation)
/api/v1/ai/annotations/{document_id}        ❌ NOT IMPLEMENTED
/api/v1/ai/generate                         ❌ NOT IMPLEMENTED
/api/v1/ai/multimodal/{document_id}         ❌ NOT IMPLEMENTED
/api/v1/ai/suggestions/{document_id}        ❌ NOT IMPLEMENTED
/api/v1/ai/extract-entities/{document_id}   ❌ NOT IMPLEMENTED

# Document Features (Needs Implementation)
/api/v1/documents/{id}/retention            ❌ NOT IMPLEMENTED
/api/v1/documents/{id}/duplicates           ❌ NOT IMPLEMENTED
/api/v1/documents/{id}/events               ❌ NOT IMPLEMENTED
/api/v1/documents/{id}/subscriptions        ❌ NOT IMPLEMENTED
/api/v1/documents/{id}/smart-links          ❌ NOT IMPLEMENTED
/api/v1/documents/{id}/web-links            ❌ NOT IMPLEMENTED
/api/v1/documents/{id}/sandbox              ❌ NOT IMPLEMENTED
```

---

## 🎯 IMPLEMENTATION PLAN - Make Everything Work

### **Phase 1: Connect Existing Backend APIs (2-3 days)**

#### **1.1: Document Intelligence Panel - Real Data Integration**

**File**: `pie-docs-frontend/src/components/documents/intelligence/DocumentIntelligencePanel.tsx`

**Tasks**:
```typescript
// Add API service calls
import { documentsService } from '@/services/api/documentsService';
import { classificationService } from '@/services/api/classificationService';
import { auditLogsService } from '@/services/api/auditLogsService';
import { warehouseService } from '@/services/api/warehouseService';

// Replace mock data with:
useEffect(() => {
  async function loadIntelligence() {
    // 1. Load classification
    const classification = await classificationService.classify(document.id);

    // 2. Load version history
    const versions = await documentsService.getVersions(document.id);

    // 3. Load audit trail
    const auditLogs = await auditLogsService.getByDocument(document.id);

    // 4. Load physical location (if exists)
    try {
      const location = await warehouseService.getDocumentLocation(document.id);
      const barcode = await barcodeService.getByDocument(document.id);
    } catch (e) {
      // Not all documents have physical locations
    }

    // 5. Load retention policy (when backend is ready)
    // const retention = await documentsService.getRetention(document.id);
  }

  loadIntelligence();
}, [document.id]);
```

**Backend Endpoints to Use**:
- ✅ `GET /api/v1/classification/{document_id}`
- ✅ `GET /api/v1/documents/{id}/versions`
- ✅ `GET /api/v1/audit_logs?document_id={id}`
- ✅ `GET /api/v1/warehouse/document-location/{id}`
- ✅ `GET /api/v1/physical/barcodes?document_id={id}`

---

#### **1.2: AI Features Panel - Connect OCR & AI Services**

**File**: `pie-docs-frontend/src/components/documents/ai/DocumentAIFeaturesPanel.tsx`

**Tasks**:
```typescript
import { ocrService } from '@/services/api/ocrService';
import { classificationService } from '@/services/api/classificationService';
import { embeddingsService } from '@/services/api/embeddingsService';

useEffect(() => {
  async function loadAIFeatures() {
    // 1. Load OCR results and confidence
    const ocrResult = await ocrService.getOCRResult(document.id);
    setOcrQuality(ocrResult.confidence.overall);

    // 2. Load classification confidence
    const classification = await classificationService.classify(document.id);
    setClassificationData(classification);

    // 3. Multi-modal analysis (when available)
    // For now, show OCR text extraction status
    setMultiModalData({
      textExtracted: !!ocrResult.extractedText,
      pageCount: ocrResult.pageCount,
      wordCount: ocrResult.extractedText?.split(' ').length || 0
    });
  }

  loadAIFeatures();
}, [document.id]);
```

**Backend Endpoints to Use**:
- ✅ `GET /api/v1/ocr/results/{document_id}`
- ✅ `POST /api/v1/classification` (with document_id)
- ✅ `POST /api/v1/metadata-extraction`

---

#### **1.3: OCR Tab - Fix Data Loading**

**File**: `pie-docs-frontend/src/components/documents/preview/DocumentPreviewPanel.tsx`

**Current Issue**: Lines 122-125 are commented out

**Fix**:
```typescript
// Replace lines 122-125 with:
const result = await ocrService.getOCRResult(document.id);
setOcrResult(result);

const previewData: OCRPreviewData = {
  extractedText: result.extractedText,
  confidence: result.confidence,
  highlightedBlocks: result.blocks || [],
  formattedText: result.extractedText,
  pageImages: [] // Can be loaded separately if needed
};
setOcrPreviewData(previewData);
```

**Backend Endpoint**:
- ✅ `GET /api/v1/ocr/results/{document_id}`

---

### **Phase 2: Implement Missing Tools (3-4 days)**

#### **2.1: Create Missing Tool Components**

**Files to Create** (in `pie-docs-frontend/src/components/documents/tools/`):

1. **CheckInOutTool.tsx**
```typescript
// Connect to: GET/POST /api/v1/checkinout
// Show: Checkout history, current status, request checkout button
```

2. **DuplicatesTool.tsx**
```typescript
// Connect to: GET /api/v1/documents/{id}/duplicates (needs backend)
// Show: Similar documents based on hash/content
```

3. **EventsTool.tsx**
```typescript
// Connect to: GET /api/v1/audit_logs?document_id={id}
// Show: Document lifecycle events
```

4. **FilesTool.tsx**
```typescript
// Connect to: GET /api/v1/documents/{id}/files
// Show: Attached files, versions, thumbnails
```

5. **IndexesTool.tsx**
```typescript
// Connect to: GET /api/v1/documents/{id}/metadata
// Show: Searchable index fields
```

6. **PreviewTool.tsx**
```typescript
// Inline preview component (alternative viewer)
```

7. **PropertiesTool.tsx**
```typescript
// Show: File properties, EXIF data, system metadata
```

8. **SandboxTool.tsx**
```typescript
// Sandbox environment for document testing/preview
```

9. **SignaturesTool.tsx**
```typescript
// Connect to: GET/POST /api/v1/signatures
// Show: Signature captures, verify signatures
```

10. **SmartLinksTool.tsx**
```typescript
// Connect to: GET/POST /api/v1/documents/{id}/smart-links
// Show: Auto-detected relationships between documents
```

11. **SubscriptionsTool.tsx**
```typescript
// Connect to: GET/POST /api/v1/documents/{id}/subscriptions
// Show: Notification subscriptions for document changes
```

12. **WebLinksTool.tsx**
```typescript
// Connect to: GET/POST /api/v1/documents/{id}/web-links
// Show: Shareable web links with permissions
```

#### **2.2: Update DocumentToolsRouter**

**File**: `pie-docs-frontend/src/components/documents/tools/DocumentToolsRouter.tsx`

**Update switch statement** (around line 36):
```typescript
switch (toolId) {
  case 'acls':
    return <ACLsTool document={document} onBack={onClose} className={className} />;
  case 'cabinets':
    return <CabinetsTool document={document} onBack={onClose} className={className} />;
  case 'checkinout':
    return <CheckInOutTool document={document} onBack={onClose} className={className} />;
  case 'comments':
    return <CommentsTool document={document} onBack={onClose} className={className} />;
  case 'duplicates':
    return <DuplicatesTool document={document} onBack={onClose} className={className} />;
  case 'events':
    return <EventsTool document={document} onBack={onClose} className={className} />;
  case 'files':
    return <FilesTool document={document} onBack={onClose} className={className} />;
  case 'indexes':
    return <IndexesTool document={document} onBack={onClose} className={className} />;
  case 'metadata':
    return <MetadataTool document={document} onBack={onClose} className={className} />;
  case 'preview':
    return <PreviewTool document={document} onBack={onClose} className={className} />;
  case 'properties':
    return <PropertiesTool document={document} onBack={onClose} className={className} />;
  case 'sandbox':
    return <SandboxTool document={document} onBack={onClose} className={className} />;
  case 'signatures':
    return <SignaturesTool document={document} onBack={onClose} className={className} />;
  case 'smartlinks':
    return <SmartLinksTool document={document} onBack={onClose} className={className} />;
  case 'subscriptions':
    return <SubscriptionsTool document={document} onBack={onClose} className={className} />;
  case 'tags':
    return <TagsTool document={document} onBack={onClose} className={className} />;
  case 'versions':
    return <VersionsTool document={document} onBack={onClose} className={className} />;
  case 'weblinks':
    return <WebLinksTool document={document} onBack={onClose} className={className} />;
  case 'workflows':
    return <WorkflowsTool document={document} onBack={onClose} className={className} />;
  default:
    return <PlaceholderTool ... />;
}
```

---

### **Phase 3: Implement Missing Backend Endpoints (3-4 days)**

#### **3.1: Create AI Intelligence Endpoints**

**File**: `pie-docs-backend/app/routers/ai_intelligence.py` (NEW)

```python
from fastapi import APIRouter, HTTPException
from app.database import get_db_cursor
from app.llm_service import llm_service

router = APIRouter(prefix="/api/v1/ai", tags=["ai-intelligence"])

@router.get("/suggestions/{document_id}")
async def get_smart_suggestions(document_id: str):
    """Get AI-powered smart suggestions for a document"""
    # Use LLM to analyze document and generate suggestions
    # - Tag suggestions
    # - Link suggestions
    # - Workflow suggestions
    pass

@router.get("/annotations/{document_id}")
async def get_ai_annotations(document_id: str):
    """Get AI-generated annotations (clauses, PII, entities)"""
    # Use document intelligence to find:
    # - Key clauses
    # - PII/PHI for redaction
    # - Payment terms
    # - Important dates
    pass

@router.post("/generate")
async def generate_document(prompt: str, context_docs: List[str]):
    """Generate new document using AI"""
    # Use LLM to generate document from prompt
    pass

@router.get("/multimodal/{document_id}")
async def multimodal_analysis(document_id: str):
    """Multi-modal content analysis"""
    # Analyze text, images, tables, audio
    pass

@router.get("/extract-entities/{document_id}")
async def extract_entities(document_id: str):
    """Extract entities (companies, dates, amounts, people, locations)"""
    # Use NER from document intelligence service
    pass
```

#### **3.2: Create Document Features Endpoints**

**File**: `pie-docs-backend/app/routers/documents.py` (ADD to existing)

```python
@router.get("/{document_id}/retention")
async def get_retention_policy(document_id: UUID):
    """Get retention policy and compliance status"""
    pass

@router.get("/{document_id}/duplicates")
async def find_duplicates(document_id: UUID):
    """Find duplicate/similar documents"""
    # Use checksums and embeddings similarity
    pass

@router.get("/{document_id}/events")
async def get_document_events(document_id: UUID):
    """Get document lifecycle events"""
    # Return audit logs filtered for this document
    pass

@router.get("/{document_id}/subscriptions")
async def get_subscriptions(document_id: UUID):
    """Get notification subscriptions"""
    pass

@router.post("/{document_id}/subscriptions")
async def create_subscription(document_id: UUID, user_id: UUID):
    """Subscribe to document notifications"""
    pass

@router.get("/{document_id}/smart-links")
async def get_smart_links(document_id: UUID):
    """Get auto-detected document relationships"""
    # Use AI to find related documents
    pass

@router.get("/{document_id}/web-links")
async def get_web_links(document_id: UUID):
    """Get shareable web links"""
    pass

@router.post("/{document_id}/web-links")
async def create_web_link(document_id: UUID, permissions: dict):
    """Create shareable web link with permissions"""
    pass
```

---

### **Phase 4: Testing & Validation (2 days)**

#### **4.1: End-to-End Testing Checklist**

**Test Flow**:
1. ✅ Upload document
2. ✅ Document appears in library
3. ✅ Double-click opens preview
4. ✅ Preview shows document correctly (PDF/Image/Text)
5. ✅ Click "AI Services" tab
   - Shows real OCR quality score
   - Shows real classification confidence
   - Multi-modal analysis shows actual data
6. ✅ Click "Document Intelligence" tab
   - Shows real classification results
   - Shows actual version history from database
   - Shows real audit logs
   - Shows physical location (if exists)
   - Shows real retention policy
7. ✅ Click "Tools" tab
   - All 19 tools are clickable
   - Each tool loads and shows real data
   - No PlaceholderTool shown
8. ✅ OCR Tab
   - Shows extracted text from backend
   - Shows confidence scores
   - Allows retry if failed

#### **4.2: API Endpoint Validation**

**Create Test Script**: `test-preview-apis.sh`

```bash
#!/bin/bash
API_BASE="http://localhost:8001/api/v1"
TOKEN="YOUR_AUTH_TOKEN"
DOC_ID="test-document-id"

echo "Testing Document Preview APIs..."

# Test OCR
curl -X GET "$API_BASE/ocr/results/$DOC_ID" -H "Authorization: Bearer $TOKEN"

# Test Classification
curl -X POST "$API_BASE/classification" -H "Authorization: Bearer $TOKEN" \
  -d '{"document_id": "'$DOC_ID'"}'

# Test Audit Logs
curl -X GET "$API_BASE/audit_logs?document_id=$DOC_ID" -H "Authorization: Bearer $TOKEN"

# Test Versions
curl -X GET "$API_BASE/documents/$DOC_ID/versions" -H "Authorization: Bearer $TOKEN"

# Test Physical Location
curl -X GET "$API_BASE/warehouse/document-location/$DOC_ID" -H "Authorization: Bearer $TOKEN"

# Test Barcode
curl -X GET "$API_BASE/physical/barcodes?document_id=$DOC_ID" -H "Authorization: Bearer $TOKEN"

echo "All tests complete!"
```

---

## 📝 CRITICAL FIXES NEEDED RIGHT NOW

### **Fix 1: OCR Data Loading**
**File**: `pie-docs-frontend/src/components/documents/preview/DocumentPreviewPanel.tsx`
**Line**: 122-125
**Action**: Uncomment and fix API calls

### **Fix 2: Add Missing Tool Components**
**Location**: `pie-docs-frontend/src/components/documents/tools/`
**Action**: Create 12 missing tool components

### **Fix 3: Connect Intelligence Panel**
**File**: `pie-docs-frontend/src/components/documents/intelligence/DocumentIntelligencePanel.tsx`
**Action**: Replace all mock data with API calls

### **Fix 4: Connect AI Features Panel**
**File**: `pie-docs-frontend/src/components/documents/ai/DocumentAIFeaturesPanel.tsx`
**Action**: Replace all mock data with API calls

### **Fix 5: Create Missing Backend Endpoints**
**Files**:
- `pie-docs-backend/app/routers/ai_intelligence.py` (NEW)
- `pie-docs-backend/app/routers/documents.py` (ADD endpoints)

---

## 🎯 SUCCESS CRITERIA

**Document Preview is COMPLETE when**:

✅ 1. All 3 sidebar tabs show **REAL DATA from backend**
✅ 2. All 19 tools are **implemented and working**
✅ 3. OCR tab loads and displays **actual OCR results**
✅ 4. Physical location tracking shows **real warehouse data**
✅ 5. Audit trail shows **actual access logs**
✅ 6. Version history shows **real versions from database**
✅ 7. Classification shows **AI confidence scores**
✅ 8. All API endpoints respond with **HTTP 200 and real data**
✅ 9. **Zero PlaceholderTool components** shown
✅ 10. End-to-end flow works: **Upload → View → Preview → All Tabs → All Tools**

---

## 🚀 IMMEDIATE NEXT STEPS

**TODAY**:
1. Fix OCR data loading (30 mins)
2. Connect DocumentIntelligencePanel to existing APIs (2 hours)
3. Connect DocumentAIFeaturesPanel to OCR/Classification APIs (2 hours)

**TOMORROW**:
4. Create 12 missing tool components (6 hours)
5. Test all tools with real documents

**DAY 3**:
6. Implement missing backend AI endpoints (6 hours)
7. Connect new endpoints to frontend

**DAY 4**:
8. End-to-end testing
9. Fix bugs
10. Polish UI/UX

**TOTAL TIMELINE**: 3-4 days to complete everything

---

## 📋 ARCHITECTURAL DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│  AdvancedDocumentLibraryV3 (Main Page)                      │
│  ├── Document Grid/List View                                │
│  ├── Folder Navigation                                      │
│  └── Preview Trigger (Double-click document)                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Document Preview Layout                                     │
│  ┌─────────────────────┬─────────────────────────────────┐ │
│  │ LEFT: Preview Pane  │ RIGHT: Sidebar (3 Tabs)         │ │
│  │ ─────────────────── │ ───────────────────────────────  │ │
│  │                     │ Tab 1: AI Services              │ │
│  │ DocumentPreviewPanel│   DocumentAIFeaturesPanel       │ │
│  │ ├── Document Tab    │   ├── AI Annotations            │ │
│  │ │   ├── PDFViewer   │   ├── Document Generator        │ │
│  │ │   ├── ImageViewer │   ├── Multi-Modal Analysis      │ │
│  │ │   └── TextViewer  │   └── Confidence Scores         │ │
│  │ │                   │                                  │ │
│  │ └── OCR Tab         │ Tab 2: Document Intelligence    │ │
│  │     └── OCRText     │   DocumentIntelligencePanel     │ │
│  │        Preview      │   ├── Smart Suggestions         │ │
│  │                     │   ├── Classification            │ │
│  │                     │   ├── Version History           │ │
│  │                     │   ├── Audit Trail               │ │
│  │                     │   ├── Physical Location         │ │
│  │                     │   ├── Content Analysis          │ │
│  │                     │   └── Retention/Compliance      │ │
│  │                     │                                  │ │
│  │                     │ Tab 3: Tools (19 Tools)         │ │
│  │                     │   DocumentToolsRouter           │ │
│  │                     │   ├── ACLs                      │ │
│  │                     │   ├── Cabinets                  │ │
│  │                     │   ├── Check-in/out              │ │
│  │                     │   ├── Comments                  │ │
│  │                     │   ├── Duplicates                │ │
│  │                     │   ├── Events                    │ │
│  │                     │   ├── Files                     │ │
│  │                     │   ├── Indexes                   │ │
│  │                     │   ├── Metadata                  │ │
│  │                     │   ├── Preview                   │ │
│  │                     │   ├── Properties                │ │
│  │                     │   ├── Sandbox                   │ │
│  │                     │   ├── Signatures                │ │
│  │                     │   ├── Smart Links               │ │
│  │                     │   ├── Subscriptions             │ │
│  │                     │   ├── Tags                      │ │
│  │                     │   ├── Versions                  │ │
│  │                     │   ├── Web Links                 │ │
│  │                     │   └── Workflows                 │ │
│  └─────────────────────┴─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend API Layer (FastAPI)                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ /api/v1/documents          ✅ IMPLEMENTED            │  │
│  │ /api/v1/ocr/results        ✅ IMPLEMENTED            │  │
│  │ /api/v1/classification     ✅ IMPLEMENTED            │  │
│  │ /api/v1/audit_logs         ✅ IMPLEMENTED            │  │
│  │ /api/v1/warehouse          ✅ IMPLEMENTED            │  │
│  │ /api/v1/physical/barcodes  ✅ IMPLEMENTED            │  │
│  │ /api/v1/checkinout         ✅ IMPLEMENTED            │  │
│  │ /api/v1/workflows          ✅ IMPLEMENTED            │  │
│  │ /api/v1/approvals          ✅ IMPLEMENTED            │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ MISSING (Need to create):                            │  │
│  │ /api/v1/ai/annotations     ❌ NOT IMPLEMENTED        │  │
│  │ /api/v1/ai/suggestions     ❌ NOT IMPLEMENTED        │  │
│  │ /api/v1/ai/generate        ❌ NOT IMPLEMENTED        │  │
│  │ /api/v1/ai/multimodal      ❌ NOT IMPLEMENTED        │  │
│  │ /api/v1/ai/extract-entities❌ NOT IMPLEMENTED        │  │
│  │ /api/v1/documents/.../retention ❌ NOT IMPLEMENTED   │  │
│  │ /api/v1/documents/.../duplicates ❌ NOT IMPLEMENTED  │  │
│  │ /api/v1/documents/.../smart-links ❌ NOT IMPLEMENTED │  │
│  │ /api/v1/documents/.../subscriptions ❌ NOT IMPL      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Database (PostgreSQL)                                       │
│  ├── documents                ✅ EXISTS                      │
│  ├── document_versions        ✅ EXISTS                      │
│  ├── audit_logs              ✅ EXISTS                      │
│  ├── ocr_results             ✅ EXISTS                      │
│  ├── physical_documents      ✅ EXISTS                      │
│  ├── warehouse_locations     ✅ EXISTS                      │
│  ├── barcodes                ✅ EXISTS                      │
│  ├── workflows               ✅ EXISTS                      │
│  └── approvals               ✅ EXISTS                      │
└─────────────────────────────────────────────────────────────┘
```

---

**Generated by**: Claude Code - Dev Agent (James)
**Last Updated**: 2025-10-09

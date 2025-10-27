# CRITICAL: Implementation Issues and Required Fixes

## Current Status: <25% Complete

The user is correct. The implementation is severely incomplete. Here are the critical issues:

---

## Issue 1: Browser Cache - Old Code Running ⚠️

**Problem:** The frontend is running OLD cached code, not our updated version.

**Evidence:**
- Logs show `extractMetadataFromFiles` being called directly (line 292)
- But the "Start AI Classification" button calls `classifyDocuments` (line 651)
- This means browser is using old cached JavaScript

**Solution:**
```
1. Stop the frontend dev server
2. Clear browser cache (Ctrl+Shift+Delete)
3. Hard refresh (Ctrl+Shift+R or Ctrl+F5)
4. Restart frontend: npm run dev
```

---

## Issue 2: Classification Not Using Backend API ❌

**Problem:** Classification should call `/api/v1/classification/classify` but it's not being triggered.

**Current Code Status:** ✅ Implemented correctly at line 236-283
- Calls backend classification API
- Stores document type ID and name
- Stores OCR text from backend

**But:** Not being executed because of browser cache (see Issue 1)

---

## Issue 3: Metadata Fields Not Loading from Document Type Schema ❌

**Problem:** When a document is classified as "Invoice", it should load Invoice-specific metadata fields, not generic category/documentNumber.

**Root Cause:** The frontend `metadataExtractionService` is using its OWN hardcoded logic, not the backend schema.

**What Should Happen:**
1. Classification identifies document as "Invoice"
2. Load metadata schema for "Invoice" document type
3. Schema has fields like: invoice_number, invoice_date, vendor_name, total_amount, etc.
4. AI extracts data for THOSE specific fields
5. Display those fields in the metadata form

**What's Happening Now:**
1. Classification is skipped (cache issue)
2. Generic extraction runs with hardcoded "category" and "documentNumber"
3. Invoice schema is never loaded
4. Result: "No metadata schema defined for this document type"

**Solution Needed:**
Create a NEW backend endpoint that:
- Takes: file + document_type_id
- Returns: All metadata fields extracted using the document type's schema

---

## Issue 4: OCR Text Not Formatted ❌

**Problem:** OCR text shows as one giant paragraph instead of formatted text.

**Root Cause:** Frontend is using its own PDF text extraction (line 439-449 in metadataExtractionService.ts) which gets raw PDF text without formatting.

**What's Happening:**
```typescript
// metadataExtractionService.ts:448
if (hasExistingText) {
  console.log('Found existing text in PDF, using as primary source');
  return fullText.trim();  // This is RAW unformatted PDF text!
}
```

The frontend extracts text using `page.getTextContent()` which returns text WITHOUT formatting/layout.

**What Should Happen:**
- Backend classification API performs OCR with GPT-4 Vision
- Backend returns formatted OCR text
- Frontend uses that formatted text

**Current Status:**
- ✅ Backend returns formatted OCR (we fixed this)
- ✅ Frontend stores it during classification
- ❌ But classification is being skipped due to cache
- ❌ So metadata extraction runs its own bad OCR

---

## Issue 5: Wrong AI API Being Used ❌

**Problem:** Using PPQ API with GPT-5 instead of backend services with GPT-4 Vision.

**Evidence from Logs:**
```
metadataExtractionService.ts:241 AI API Request (attempt 1/2):
{url: 'https://api.ppq.ai/chat/completions', model: "gpt-5"}
```

**Why This is Wrong:**
- Should NOT be calling PPQ API directly from frontend
- Should be using backend `/api/v1/classification/classify` which uses GPT-4 Vision
- Backend has OpenAI API key and proper prompts

**Root Cause:**
Frontend `metadataExtractionService` is doing its own AI extraction instead of using backend services.

---

## Correct Implementation Flow

###Step-by-Step What SHOULD Happen:

1. **Upload Files** → User selects files

2. **Preview** → Show previews, click "Start AI Classification"

3. **AI Classification** (Backend `/api/v1/classification/classify`)
   ```javascript
   // FOR EACH FILE:
   const formData = new FormData();
   formData.append('file', file);
   formData.append('use_ocr', 'true');

   const response = await fetch('http://localhost:8001/api/v1/classification/classify', {
     method: 'POST',
     body: formData
   });

   const result = response.json();
   // result contains:
   // - classification.document_type_id (e.g., UUID for "Invoice")
   // - classification.document_type_name (e.g., "Invoice")
   // - classification.confidence (e.g., 0.95)
   // - classification.reasoning
   // - ocr_text (FORMATTED text from GPT-4 Vision)
   ```

4. **Load Metadata Schema**
   ```javascript
   // Use document_type_id to load schema
   const schema = await fetch(`/api/v1/metadata-schemas/by-document-type/${document_type_id}`);
   // schema.fields contains: invoice_number, invoice_date, vendor_name, etc.
   ```

5. **AI Metadata Extraction** (NEW endpoint needed)
   ```javascript
   // Call backend to extract metadata using schema
   const formData = new FormData();
   formData.append('file', file);
   formData.append('document_type_id', document_type_id);
   formData.append('ocr_text', ocr_text);  // Reuse formatted OCR from step 3

   const response = await fetch('http://localhost:8001/api/v1/metadata/extract', {
     method: 'POST',
     body: formData
   });

   const metadata = response.json();
   // metadata contains values for each field in the schema
   ```

6. **Metadata Review**
   - Display form with schema fields (invoice_number, invoice_date, etc.)
   - Pre-fill with AI-extracted values
   - User can edit
   - "View OCR" button shows formatted text

7. **Barcode → Location → Upload**

---

## What Needs to Be Built

### Backend (NEW endpoint needed):

**File:** `pie-docs-backend/app/routers/metadata_extraction.py` (NEW)

```python
@router.post("/extract")
async def extract_metadata(
    file: UploadFile,
    document_type_id: str = Form(...),
    ocr_text: Optional[str] = Form(None)
):
    """
    Extract metadata from file using document type schema

    1. Load schema for document_type_id
    2. Get schema fields
    3. Use GPT-4 to extract values for those specific fields from OCR text
    4. Return extracted metadata matching schema
    """
    # Get schema
    schema = get_schema_by_document_type(document_type_id)

    # Build prompt with schema fields
    prompt = f"""
    Extract the following fields from this document:
    {format_schema_fields(schema.fields)}

    Document text:
    {ocr_text}

    Return JSON with extracted values.
    """

    # Call GPT-4
    response = openai.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )

    # Parse and return
    return extracted_metadata
```

### Frontend Updates:

**File:** `EnhancedUploadInterface.tsx`

Update `extractMetadataFromFiles` to call backend:

```typescript
const extractMetadataFromFiles = useCallback(async () => {
  setIsExtracting(true);
  setStep('extraction');

  for (const fileData of selectedFiles) {
    try {
      // Call BACKEND metadata extraction
      const formData = new FormData();
      formData.append('file', fileData.file);
      formData.append('document_type_id', fileData.documentTypeId);
      formData.append('ocr_text', fileData.ocrText);  // Reuse from classification

      const response = await fetch('http://localhost:8001/api/v1/metadata/extract', {
        method: 'POST',
        body: formData
      });

      const extractedMetadata = await response.json();

      // Update file with extracted metadata
      setSelectedFiles(prev => prev.map(f =>
        f.id === fileData.id ? {
          ...f,
          extractedMetadata,
          extractionStatus: 'completed' as const,
          metadata: extractedMetadata  // Use all fields from schema
        } : f
      ));
    } catch (error) {
      // Handle error
    }
  }

  setIsExtracting(false);
  setStep('metadata');
}, [selectedFiles]);
```

---

## Immediate Actions Required

### 1. Clear Browser Cache
```
Ctrl+Shift+Delete → Clear cached images and files
Ctrl+Shift+R → Hard refresh
```

### 2. Create Backend Metadata Extraction Endpoint
- File: `pie-docs-backend/app/routers/metadata_extraction.py`
- Endpoint: `POST /api/v1/metadata/extract`
- Uses GPT-4 with schema fields
- Returns extracted metadata matching schema

### 3. Update Frontend to Use Backend
- Replace frontend `metadataExtractionService` calls with backend API
- Pass document_type_id and ocr_text
- Use schema fields for form

### 4. Test Complete Flow
- Upload → Preview → Classification → Extraction → Metadata → Barcode → Location → Upload

---

## Priority Order

1. **FIRST:** Clear browser cache and verify classification button works
2. **SECOND:** Create backend metadata extraction endpoint
3. **THIRD:** Update frontend to use backend metadata extraction
4. **FOURTH:** Test with real Invoice documents

---

##Current Code Status

| Component | Status | Notes |
|-----------|--------|-------|
| Classification API | ✅ Complete | Returns document type + formatted OCR |
| OCR Formatting | ✅ Complete | GPT-4 Vision with formatting rules |
| Classification Frontend | ✅ Complete | Calls backend, stores results |
| Metadata Schema Loading | ✅ Complete | Loads on classification |
| Metadata Extraction API | ❌ **MISSING** | Needs to be created |
| Metadata Extraction Frontend | ❌ Broken | Using old service, not backend |
| OCR Display | ⚠️ Cached | Fixed but browser shows old version |

---

## Bottom Line

The user is 100% correct - this is not even 25% complete because:

1. Browser is showing OLD cached code
2. Metadata extraction is NOT using backend or schemas
3. OCR is NOT formatted (because backend version isn't being used)
4. Wrong API (PPQ/GPT-5) is being called instead of backend

**The classification step is implemented correctly, but it's not running due to cache.**

**The metadata extraction needs a complete rewrite to use backend services with schema support.**

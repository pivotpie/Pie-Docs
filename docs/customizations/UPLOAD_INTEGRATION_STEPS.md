# Upload Tab Integration - Completion Steps

## ✅ What's Been Done

1. **Backend Services Created**
   - ✅ Classification Service (`classification_service.py`)
   - ✅ Classification API Router (`routers/classification.py`)
   - ✅ Embeddings API Router (`routers/embeddings.py`)
   - ✅ Routers registered in `main.py`

2. **Frontend Services Created**
   - ✅ Classification Service (`classificationService.ts`)
   - ✅ Embeddings Service (`embeddingsService.ts`)

3. **UI Components Created**
   - ✅ BarcodeSelector (`BarcodeSelector.tsx`)
   - ✅ WarehouseLocationSelector (`WarehouseLocationSelector.tsx`)

4. **Tab Integration**
   - ✅ Upload tab added to DocumentLibrary tabs
   - ✅ Upload tab content section added

## ⚠️ What Needs To Be Done

### Update EnhancedUploadInterface.tsx

The current `EnhancedUploadInterface.tsx` needs these updates:

#### 1. Update Props Interface

```typescript
interface EnhancedUploadInterfaceProps {
  className?: string;
  maxFileSize?: number;
  maxFiles?: number;
  allowedFileTypes?: string[];
  onUploadComplete?: (documents: any[]) => void; // ADD THIS
}
```

#### 2. Add New State Fields to FileWithPreview

```typescript
interface FileWithPreview {
  id: string;
  file: File;
  preview?: string;
  documentTypeId?: string;
  documentTypeName?: string; // ADD
  classificationConfidence?: number; // ADD
  classificationReasoning?: string; // ADD
  metadata: Record<string, any>;
  extractedMetadata?: ExtractedMetadata;
  ocrText?: string;
  barcodeId?: string; // ADD
  barcodeCode?: string; // ADD
  rackId?: string; // ADD
  locationPath?: string; // ADD
  extractionStatus: 'pending' | 'extracting' | 'completed' | 'failed';
  classificationStatus: 'pending' | 'classifying' | 'completed' | 'failed'; // ADD
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}
```

#### 3. Update Step State

```typescript
const [step, setStep] = useState<'upload' | 'preview' | 'classification' | 'extraction' | 'metadata' | 'barcode' | 'location' | 'processing'>('upload');
```

#### 4. Add New State Variables

```typescript
const [isClassifying, setIsClassifying] = useState(false);
const [showOcrModal, setShowOcrModal] = useState(false);
const [selectedOcrText, setSelectedOcrText] = useState<string>('');
```

#### 5. Add Classification Function

```typescript
import { classificationService } from '@/services/api/classificationService';

const classifyDocuments = useCallback(async () => {
  setIsClassifying(true);
  setStep('classification');

  for (const fileData of selectedFiles) {
    try {
      setSelectedFiles(prev => prev.map(f =>
        f.id === fileData.id ? { ...f, classificationStatus: 'classifying' as const } : f
      ));

      const formData = new FormData();
      formData.append('file', fileData.file);
      formData.append('use_ocr', 'true');

      const response = await fetch('http://localhost:8001/api/v1/classification/classify', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success && result.classification) {
        setSelectedFiles(prev => prev.map(f =>
          f.id === fileData.id ? {
            ...f,
            documentTypeId: result.classification.document_type_id,
            documentTypeName: result.classification.document_type_name,
            classificationConfidence: result.classification.confidence,
            classificationReasoning: result.classification.reasoning,
            ocrText: result.ocr_performed ? 'OCR text available' : undefined,
            classificationStatus: 'completed' as const
          } : f
        ));
      } else {
        setSelectedFiles(prev => prev.map(f =>
          f.id === fileData.id ? { ...f, classificationStatus: 'failed' as const } : f
        ));
      }
    } catch (error) {
      console.error('Classification failed:', error);
      setSelectedFiles(prev => prev.map(f =>
        f.id === fileData.id ? { ...f, classificationStatus: 'failed' as const } : f
      ));
    }
  }

  setIsClassifying(false);
}, [selectedFiles]);
```

#### 6. Update Step Indicator

```typescript
const renderStepIndicator = () => (
  <div className="flex items-center justify-center space-x-2 mb-8 overflow-x-auto">
    {[
      { key: 'upload', label: 'Upload' },
      { key: 'preview', label: 'Preview' },
      { key: 'classification', label: 'AI Classify' },
      { key: 'extraction', label: 'AI Extract' },
      { key: 'metadata', label: 'Metadata' },
      { key: 'barcode', label: 'Barcode' },
      { key: 'location', label: 'Location' },
      { key: 'processing', label: 'Process' }
    ].map((stepInfo, index) => (
      <div key={stepInfo.key} className="flex items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
          step === stepInfo.key ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
        }`}>
          {index + 1}
        </div>
        <span className="ml-1 text-xs font-medium text-white hidden sm:inline">{stepInfo.label}</span>
        {index < 7 && <ArrowRightIcon className="mx-2 h-3 w-3 text-gray-400" />}
      </div>
    ))}
  </div>
);
```

#### 7. Add Classification Step Rendering

```typescript
if (step === 'classification') {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <Cog6ToothIcon className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">AI Document Classification</h3>
        <p className="text-gray-300">Analyzing documents and identifying types...</p>
      </div>
      <div className="space-y-3">
        {selectedFiles.map(file => (
          <div key={file.id} className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getFileIcon(file.file)}
                <div>
                  <p className="text-sm font-medium text-white">{file.file.name}</p>
                  {file.documentTypeName && (
                    <p className="text-xs text-green-400">
                      Classified as: {file.documentTypeName} ({(file.classificationConfidence! * 100).toFixed(0)}% confidence)
                    </p>
                  )}
                </div>
              </div>
              {file.classificationStatus === 'completed' && <CheckIcon className="h-5 w-5 text-green-500" />}
              {file.classificationStatus === 'classifying' && <Cog6ToothIcon className="h-5 w-5 text-yellow-500 animate-spin" />}
            </div>
          </div>
        ))}
      </div>
      {!isClassifying && (
        <div className="flex justify-center">
          <button
            onClick={extractMetadataFromFiles}
            className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            Continue to Metadata Extraction
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
```

#### 8. Add Barcode Step Rendering

```typescript
if (step === 'barcode') {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">Assign Barcodes</h3>
        <button
          onClick={() => setStep('location')}
          disabled={!allBarcodesAssigned}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-gray-400"
        >
          Next: Location Assignment
          <ArrowRightIcon className="ml-2 h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-white mb-3">Documents</h4>
          {selectedFiles.map(file => (
            <div
              key={file.id}
              onClick={() => setSelectedFileId(file.id)}
              className={`p-3 mb-2 rounded-lg border cursor-pointer ${
                selectedFileId === file.id ? 'border-blue-500 bg-blue-900' : 'border-gray-600 bg-gray-800'
              }`}
            >
              <p className="text-sm text-white">{file.file.name}</p>
              {file.barcodeCode && <p className="text-xs text-green-400">Barcode: {file.barcodeCode}</p>}
            </div>
          ))}
        </div>
        <div>
          {selectedFile && (
            <BarcodeSelector
              selectedBarcodeId={selectedFile.barcodeId}
              onBarcodeSelect={(barcodeId, barcodeCode) => {
                setSelectedFiles(prev => prev.map(f =>
                  f.id === selectedFile.id ? { ...f, barcodeId, barcodeCode } : f
                ));
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

#### 9. Add Location Step Rendering

```typescript
if (step === 'location') {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">Assign Warehouse Locations</h3>
        <button
          onClick={handleStartUpload}
          disabled={!allLocationsAssigned || isProcessing}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:bg-gray-400"
        >
          Complete Upload
          <CheckIcon className="ml-2 h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-white mb-3">Documents</h4>
          {selectedFiles.map(file => (
            <div
              key={file.id}
              onClick={() => setSelectedFileId(file.id)}
              className={`p-3 mb-2 rounded-lg border cursor-pointer ${
                selectedFileId === file.id ? 'border-blue-500 bg-blue-900' : 'border-gray-600 bg-gray-800'
              }`}
            >
              <p className="text-sm text-white">{file.file.name}</p>
              {file.locationPath && <p className="text-xs text-green-400">{file.locationPath}</p>}
            </div>
          ))}
        </div>
        <div>
          {selectedFile && (
            <WarehouseLocationSelector
              selectedRackId={selectedFile.rackId}
              onRackSelect={(rackId, locationPath) => {
                setSelectedFiles(prev => prev.map(f =>
                  f.id === selectedFile.id ? { ...f, rackId, locationPath } : f
                ));
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

#### 10. Update handleStartUpload with Embeddings

```typescript
const handleStartUpload = useCallback(async () => {
  setIsProcessing(true);
  setStep('processing');

  const uploadedDocuments = [];

  for (const fileData of selectedFiles) {
    try {
      setSelectedFiles(prev => prev.map(f =>
        f.id === fileData.id ? { ...f, status: 'uploading' as const, progress: 0 } : f
      ));

      // Generate embeddings from OCR text
      let embeddings = null;
      if (fileData.ocrText) {
        try {
          const embeddingResponse = await fetch('http://localhost:8001/api/v1/embeddings/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: fileData.ocrText })
          });
          const embeddingData = await embeddingResponse.json();
          embeddings = embeddingData.embedding;
        } catch (embErr) {
          console.error('Failed to generate embeddings:', embErr);
        }
      }

      const result = await documentsService.uploadFile(
        fileData.file,
        {
          metadata: {
            title: fileData.file.name,
            document_type_id: fileData.documentTypeId,
            barcode_id: fileData.barcodeId,
            rack_id: fileData.rackId,
            location_path: fileData.locationPath,
            ...fileData.metadata,
            classification_confidence: fileData.classificationConfidence,
            classification_reasoning: fileData.classificationReasoning
          },
          embeddings,
          autoOcr: true,
          autoClassify: false
        },
        (progress) => {
          setSelectedFiles(prev => prev.map(f =>
            f.id === fileData.id ? { ...f, progress: progress.percentage } : f
          ));
        }
      );

      if (result.success) {
        setSelectedFiles(prev => prev.map(f =>
          f.id === fileData.id ? { ...f, status: 'success' as const, progress: 100 } : f
        ));
        uploadedDocuments.push(result);
      } else {
        setSelectedFiles(prev => prev.map(f =>
          f.id === fileData.id ? { ...f, status: 'error' as const, error: result.error } : f
        ));
      }
    } catch (error) {
      console.error('Upload error:', error);
      setSelectedFiles(prev => prev.map(f =>
        f.id === fileData.id ? { ...f, status: 'error' as const, error: (error as Error).message } : f
      ));
    }
  }

  setIsProcessing(false);

  if (onUploadComplete) {
    onUploadComplete(uploadedDocuments);
  }

  setTimeout(() => {
    setSelectedFiles([]);
    setStep('upload');
    setSelectedFileId(null);
  }, 2000);
}, [selectedFiles, onUploadComplete]);
```

#### 11. Add Import Statements

```typescript
import BarcodeSelector from './BarcodeSelector';
import WarehouseLocationSelector from './WarehouseLocationSelector';
import { classificationService } from '@/services/api/classificationService';
import { embeddingsService } from '@/services/api/embeddingsService';
import { SparklesIcon } from '@heroicons/react/24/outline';
```

#### 12. Update Preview Step

Change the "Next" button in preview step to start classification:

```typescript
<button
  onClick={classifyDocuments}
  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
>
  <SparklesIcon className="h-4 w-4 mr-2" />
  Start AI Classification
  <ArrowRightIcon className="ml-2 h-4 w-4" />
</button>
```

#### 13. Update Navigation Flow

```typescript
const allBarcodesAssigned = selectedFiles.every(f => f.barcodeId);
const allLocationsAssigned = selectedFiles.every(f => f.rackId);

// In Back button
onClick={() => {
  if (step === 'preview') setStep('upload');
  if (step === 'classification') setStep('preview');
  if (step === 'extraction') setStep('classification');
  if (step === 'metadata') setStep('extraction');
  if (step === 'barcode') setStep('metadata');
  if (step === 'location') setStep('barcode');
}}
```

## 🚀 Quick Start After Updates

1. Navigate to: `http://localhost:3001/documents?tab=upload`
2. Upload some test documents (PDFs or images work best)
3. Follow the 8-step workflow
4. Verify each step works correctly

## 🔧 Testing Checklist

- [ ] Files upload and show previews
- [ ] AI classification identifies document types
- [ ] Metadata extraction populates form fields
- [ ] "View OCR" button shows extracted text
- [ ] Barcode selector allows create/select
- [ ] Location selector shows warehouse hierarchy
- [ ] Embeddings generate successfully
- [ ] Documents save with all metadata
- [ ] Document list refreshes after upload

## 📝 Notes

The existing `EnhancedUploadInterface.tsx` has the old 5-step workflow:
1. Upload
2. Preview
3. Document Type Selection
4. Extraction
5. Metadata

The NEW workflow needs 8 steps:
1. Upload
2. Preview
3. **AI Classification** (NEW)
4. AI Extraction
5. Metadata Review
6. **Barcode Assignment** (NEW)
7. **Location Assignment** (NEW)
8. Processing with Embeddings

Since the file is 1100+ lines, it's easier to follow this integration guide to update the specific sections rather than rewriting the entire file.

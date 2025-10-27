import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import physicalDocsApi from '@/services/physicalDocsApi';

// Types for Physical Documents Management
export interface BarcodeRecord {
  id: string;
  code: string;
  format: BarcodeFormat;
  documentId?: string;
  assetId?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  metadata?: Record<string, any>;
  checksum?: string;
}

export interface BarcodeGenerationRequest {
  id: string;
  documentIds: string[];
  format: BarcodeFormat;
  prefix?: string;
  suffix?: string;
  quantity: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  progress?: number;
  error?: string;
}

export interface LabelTemplate {
  id: string;
  name: string;
  description?: string;
  dimensions: {
    width: number;
    height: number;
    unit: 'mm' | 'in';
  };
  elements: TemplateElement[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateElement {
  id: string;
  type: 'barcode' | 'text' | 'logo' | 'qr';
  position: { x: number; y: number };
  size: { width: number; height: number };
  properties: Record<string, any>;
}

export interface PrintJob {
  id: string;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  templateId: string;
  barcodeIds: string[];
  printerId?: string;
  copies: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface PhysicalDocument {
  id: string;
  digitalDocumentId: string;
  barcodeId?: string;
  location?: string;
  status: 'available' | 'checked_out' | 'missing' | 'damaged';
  lastSeenAt?: string;
  notes?: string;
}

export interface PhysicalAsset {
  id: string;
  name: string;
  type: string;
  barcodeId?: string;
  location?: string;
  status: 'active' | 'maintenance' | 'retired';
  metadata?: Record<string, any>;
}

export interface StorageLocation {
  id: string;
  name: string;
  description?: string;
  type: 'shelf' | 'cabinet' | 'room' | 'building';
  parentId?: string;
  barcodeId?: string;
}

export interface Printer {
  id: string;
  name: string;
  type: 'label' | 'standard';
  model: string;
  status: 'online' | 'offline' | 'error';
  capabilities: string[];
  isDefault: boolean;
}

export interface PrintHistory {
  id: string;
  printJobId: string;
  timestamp: string;
  printerId: string;
  status: 'success' | 'failed';
  details?: string;
}

export interface PrintTemplate {
  id: string;
  name: string;
  labelTemplateId: string;
  printerSettings: Record<string, any>;
}

export interface BarcodeFormat {
  id: string;
  name: string;
  type: 'linear' | '2d';
  standard: 'CODE128' | 'CODE39' | 'CODE93' | 'EAN13' | 'EAN8' | 'UPC' | 'UPCE' | 'ITF' | 'ITF14' | 'MSI' | 'pharmacode' | 'codabar' | 'QR' | 'DATAMATRIX';
  configuration: Record<string, any>;
}

export interface LabelSize {
  id: string;
  name: string;
  width: number;
  height: number;
  unit: 'mm' | 'in';
}

export interface BarcodeSettings {
  defaultFormat: string;
  autoGenerate: boolean;
  prefix: string;
  suffix: string;
  includeChecksum: boolean;
  qrErrorCorrection: 'L' | 'M' | 'Q' | 'H';
}

// Mobile scanning types
export interface ScanSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  scannedCount: number;
  capturedCount: number;
  status: 'active' | 'paused' | 'completed';
}

export interface ScannedItem {
  id: string;
  barcode: string;
  format: BarcodeFormat;
  confidence: number;
  timestamp: string;
  validated: boolean;
  metadata?: Record<string, any>;
}

export interface BatchItem {
  id: string;
  type: 'barcode' | 'document';
  data: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}

export interface BatchSession {
  id: string;
  type: 'barcode' | 'document';
  createdAt: string;
  completedAt?: string;
  targetCount: number;
  items: BatchItem[];
  status: 'active' | 'completed' | 'processing' | 'failed';
  autoAdvance: boolean;
}

export interface OfflineItem {
  id: string;
  type: 'scan' | 'capture';
  data: ScannedItem | CapturedDocument;
  timestamp: string;
  syncAttempts: number;
  lastSyncAttempt?: string;
}

export interface CameraStatus {
  isActive: boolean;
  hasPermission: boolean;
  deviceId?: string;
  constraints: MediaTrackConstraints;
  error?: string;
}

export interface ScanRecord {
  id: string;
  sessionId: string;
  barcode: string;
  format: BarcodeFormat;
  timestamp: string;
  location?: LocationData;
  confidence: number;
}

export interface CapturedDocument {
  id: string;
  sessionId: string;
  originalImage: Blob;
  enhancedImage?: Blob;
  documentType?: string;
  metadata: Record<string, any>;
  timestamp: string;
  location?: LocationData;
  pages: number;
}

export interface ImageEnhancementSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  autoEnhance: boolean;
  documentType: string;
}

export interface ProcessingStatus {
  isProcessing: boolean;
  operation?: string;
  progress: number;
  error?: string;
}

export interface OfflineOperation {
  id: string;
  type: 'upload_scan' | 'upload_capture' | 'validate_barcode';
  payload: any;
  timestamp: string;
  retryCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync?: string;
  pendingOperations: number;
  isSyncing: boolean;
  error?: string;
}

export interface StorageInfo {
  used: number;
  available: number;
  total: number;
  unit: 'MB' | 'GB';
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  address?: string;
}

export interface LocationPrivacySettings {
  enabled: boolean;
  shareLocation: boolean;
  retentionDays: number;
  anonymize: boolean;
}

export interface PhysicalDocsState {
  barcodes: {
    generated: BarcodeRecord[];
    pending: BarcodeGenerationRequest[];
    templates: LabelTemplate[];
    printJobs: PrintJob[];
  };
  assets: {
    documents: PhysicalDocument[];
    equipment: PhysicalAsset[];
    locations: StorageLocation[];
  };
  printing: {
    availablePrinters: Printer[];
    printQueue: PrintJob[];
    printHistory: PrintHistory[];
    templates: PrintTemplate[];
  };
  // Mobile scanning state extension
  mobileScanning: {
    currentSession: ScanSession | null;
    scanQueue: ScannedItem[];
    offlineQueue: OfflineItem[];
    cameraStatus: CameraStatus;
    scanHistory: ScanRecord[];
  };
  capture: {
    currentDocument: CapturedDocument | null;
    enhancementSettings: ImageEnhancementSettings;
    captureQueue: CapturedDocument[];
    processingStatus: ProcessingStatus;
  };
  batch: {
    currentBatch: BatchSession | null;
    batchQueue: BatchSession[];
    batchProgress: number;
  };
  offline: {
    isOffline: boolean;
    queuedOperations: OfflineOperation[];
    syncStatus: SyncStatus;
    storageUsage: StorageInfo;
  };
  geolocation: {
    currentLocation: LocationData | null;
    locationPermission: 'granted' | 'denied' | 'prompt';
    locationAccuracy: number;
    privacySettings: LocationPrivacySettings;
  };
  configuration: {
    barcodeFormats: BarcodeFormat[];
    labelSizes: LabelSize[];
    defaultSettings: BarcodeSettings;
  };
  loading: {
    generating: boolean;
    printing: boolean;
    validating: boolean;
    scanning: boolean;
    capturing: boolean;
    syncing: boolean;
  };
  errors: {
    generation?: string;
    printing?: string;
    validation?: string;
    scanning?: string;
    capturing?: string;
    sync?: string;
  };
}

// Initial state
const initialState: PhysicalDocsState = {
  barcodes: {
    generated: [],
    pending: [],
    templates: [],
    printJobs: [],
  },
  assets: {
    documents: [],
    equipment: [],
    locations: [],
  },
  printing: {
    availablePrinters: [],
    printQueue: [],
    printHistory: [],
    templates: [],
  },
  mobileScanning: {
    currentSession: null,
    scanQueue: [],
    offlineQueue: [],
    cameraStatus: {
      isActive: false,
      hasPermission: false,
      constraints: {
        video: {
          width: { ideal: 1920, max: 4096 },
          height: { ideal: 1080, max: 4096 },
          facingMode: { ideal: 'environment' },
        } as MediaTrackConstraints,
      },
    },
    scanHistory: [],
  },
  capture: {
    currentDocument: null,
    enhancementSettings: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      autoEnhance: true,
      documentType: 'document',
    },
    captureQueue: [],
    processingStatus: {
      isProcessing: false,
      progress: 0,
    },
  },
  batch: {
    currentBatch: null,
    batchQueue: [],
    batchProgress: 0,
  },
  offline: {
    isOffline: false,
    queuedOperations: [],
    syncStatus: {
      isOnline: navigator.onLine,
      pendingOperations: 0,
      isSyncing: false,
    },
    storageUsage: {
      used: 0,
      available: 0,
      total: 0,
      unit: 'MB',
    },
  },
  geolocation: {
    currentLocation: null,
    locationPermission: 'prompt',
    locationAccuracy: 0,
    privacySettings: {
      enabled: false,
      shareLocation: false,
      retentionDays: 30,
      anonymize: true,
    },
  },
  configuration: {
    barcodeFormats: [
      {
        id: 'code128',
        name: 'Code 128',
        type: 'linear',
        standard: 'CODE128',
        configuration: { height: 50, displayValue: true, width: 2 },
      },
      {
        id: 'code39',
        name: 'Code 39',
        type: 'linear',
        standard: 'CODE39',
        configuration: { height: 50, displayValue: true, width: 2 },
      },
      {
        id: 'code93',
        name: 'Code 93',
        type: 'linear',
        standard: 'CODE93',
        configuration: { height: 50, displayValue: true, width: 2 },
      },
      {
        id: 'ean13',
        name: 'EAN-13',
        type: 'linear',
        standard: 'EAN13',
        configuration: { height: 50, displayValue: true, width: 2 },
      },
      {
        id: 'ean8',
        name: 'EAN-8',
        type: 'linear',
        standard: 'EAN8',
        configuration: { height: 50, displayValue: true, width: 2 },
      },
      {
        id: 'upc',
        name: 'UPC-A',
        type: 'linear',
        standard: 'UPC',
        configuration: { height: 50, displayValue: true, width: 2 },
      },
      {
        id: 'upce',
        name: 'UPC-E',
        type: 'linear',
        standard: 'UPCE',
        configuration: { height: 50, displayValue: true, width: 2 },
      },
      {
        id: 'itf',
        name: 'ITF (Interleaved 2 of 5)',
        type: 'linear',
        standard: 'ITF',
        configuration: { height: 50, displayValue: true, width: 2 },
      },
      {
        id: 'itf14',
        name: 'ITF-14',
        type: 'linear',
        standard: 'ITF14',
        configuration: { height: 50, displayValue: true, width: 2 },
      },
      {
        id: 'msi',
        name: 'MSI Plessey',
        type: 'linear',
        standard: 'MSI',
        configuration: { height: 50, displayValue: true, width: 2 },
      },
      {
        id: 'pharmacode',
        name: 'Pharmacode',
        type: 'linear',
        standard: 'pharmacode',
        configuration: { height: 50, displayValue: true, width: 2 },
      },
      {
        id: 'codabar',
        name: 'Codabar',
        type: 'linear',
        standard: 'codabar',
        configuration: { height: 50, displayValue: true, width: 2 },
      },
      {
        id: 'qr',
        name: 'QR Code',
        type: '2d',
        standard: 'QR',
        configuration: { width: 256, height: 256, errorCorrectionLevel: 'M' },
      },
      {
        id: 'datamatrix',
        name: 'Data Matrix',
        type: '2d',
        standard: 'DATAMATRIX',
        configuration: { width: 128, height: 128 },
      },
    ],
    labelSizes: [
      { id: 'small', name: 'Small (25x10mm)', width: 25, height: 10, unit: 'mm' },
      { id: 'medium', name: 'Medium (50x25mm)', width: 50, height: 25, unit: 'mm' },
      { id: 'large', name: 'Large (100x50mm)', width: 100, height: 50, unit: 'mm' },
    ],
    defaultSettings: {
      defaultFormat: 'code128',
      autoGenerate: true,
      prefix: 'DOC',
      suffix: '',
      includeChecksum: true,
      qrErrorCorrection: 'M',
    },
  },
  loading: {
    generating: false,
    printing: false,
    validating: false,
    scanning: false,
    capturing: false,
    syncing: false,
  },
  errors: {},
};

// Async thunks for barcode operations
export const generateBarcode = createAsyncThunk(
  'physicalDocs/generateBarcode',
  async (params: {
    documentId?: string;
    assetId?: string;
    format: string;
    prefix?: string;
    suffix?: string;
  }, { getState }) => {
    // Get the format configuration from state to get the standard
    const state = getState() as any;
    const formatConfig = state.physicalDocs.configuration.barcodeFormats.find(
      (f: any) => f.id === params.format
    );

    const payload: any = {
      format: formatConfig?.standard || params.format.toUpperCase().replace(/-/g, ''),
      prefix: params.prefix,
      suffix: params.suffix,
      quantity: 1
    };

    // Only include document_ids/asset_ids if they're provided
    if (params.documentId) {
      payload.document_ids = [params.documentId];
    }
    if (params.assetId) {
      payload.asset_ids = [params.assetId];
    }

    const response = await physicalDocsApi.barcode.generateBarcodes(payload);

    return response;
  }
);

export const batchGenerateBarcodes = createAsyncThunk(
  'physicalDocs/batchGenerateBarcodes',
  async (params: {
    documentIds: string[];
    format: string;
    prefix?: string;
    suffix?: string;
  }, { getState }) => {
    // Get the format configuration from state to get the standard
    const state = getState() as any;
    const formatConfig = state.physicalDocs.configuration.barcodeFormats.find(
      (f: any) => f.id === params.format
    );

    const response = await physicalDocsApi.barcode.generateBarcodes({
      document_ids: params.documentIds,
      format: formatConfig?.standard || params.format.toUpperCase().replace(/-/g, ''),
      prefix: params.prefix,
      suffix: params.suffix,
      quantity: params.documentIds.length
    });

    return response;
  }
);

export const validateBarcodeUniqueness = createAsyncThunk(
  'physicalDocs/validateBarcodeUniqueness',
  async (code: string) => {
    const response = await physicalDocsApi.barcode.validateBarcode(code);
    return response;
  }
);

export const submitPrintJob = createAsyncThunk(
  'physicalDocs/submitPrintJob',
  async (params: {
    barcodeIds: string[];
    templateId: string;
    printerId?: string;
    copies: number;
  }) => {
    const response = await physicalDocsApi.print.createPrintJob({
      template_id: params.templateId,
      barcode_ids: params.barcodeIds,
      printer_id: params.printerId,
      copies: params.copies
    });

    return response;
  }
);

// Mobile scanning async thunks
export const startScanSession = createAsyncThunk(
  'physicalDocs/startScanSession',
  async (params: { userId: string; sessionType?: 'barcode' | 'document' | 'batch' }) => {
    const response = await physicalDocsApi.mobile.startScanSession(
      params.sessionType || 'barcode',
      params.userId
    );
    return response;
  }
);

export const initializeCamera = createAsyncThunk(
  'physicalDocs/initializeCamera',
  async () => {
    try {
      // Request camera permission
      await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920, max: 4096 },
          height: { ideal: 1080, max: 4096 },
          facingMode: { ideal: 'environment' },
        },
      });

      // Get device information
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      return {
        hasPermission: true,
        deviceId: videoDevices.find(d => d.label.includes('back'))?.deviceId || videoDevices[0]?.deviceId,
      };
    } catch (error) {
      throw new Error(`Camera access failed: ${error}`);
    }
  }
);

export const scanBarcode = createAsyncThunk(
  'physicalDocs/scanBarcode',
  async (scanData: { sessionId: string; barcode: string; format: string; confidence: number }) => {
    const response = await physicalDocsApi.mobile.recordScan({
      session_id: scanData.sessionId,
      barcode: scanData.barcode,
      format: scanData.format,
      confidence: scanData.confidence
    });

    return response;
  }
);

export const validateBarcode = createAsyncThunk(
  'physicalDocs/validateBarcode',
  async (barcode: string) => {
    const response = await physicalDocsApi.barcode.lookupBarcode(barcode);
    return response;
  }
);

export const captureDocument = createAsyncThunk(
  'physicalDocs/captureDocument',
  async (captureData: {
    imageBlob: Blob;
    corners?: number[][];
    captureTime: string;
    deviceInfo?: Record<string, string>;
  }) => {
    const capture: CapturedDocument = {
      id: `capture_${Date.now()}`,
      sessionId: 'current_session',
      originalImage: captureData.imageBlob,
      metadata: {
        corners: captureData.corners || [],
        captureTime: captureData.captureTime,
        deviceInfo: captureData.deviceInfo || {},
      },
      timestamp: new Date().toISOString(),
      pages: 1,
    };

    // Mock image processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return capture;
  }
);

export const enhanceDocument = createAsyncThunk(
  'physicalDocs/enhanceDocument',
  async (enhanceData: {
    documentId: string;
    enhancements: {
      brightness: number;
      contrast: number;
      saturation: number;
    };
  }) => {
    // Mock image enhancement processing
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      documentId: enhanceData.documentId,
      enhancedImageUrl: `enhanced_${enhanceData.documentId}_${Date.now()}.jpg`,
      enhancements: enhanceData.enhancements,
    };
  }
);

export const processDocument = createAsyncThunk(
  'physicalDocs/processDocument',
  async (processData: {
    documentId: string;
    enhancementSettings: {
      brightness: number;
      contrast: number;
      saturation: number;
      autoEnhance: boolean;
      documentType: string;
    };
  }) => {
    // Mock document processing (OCR, text extraction, etc.)
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      documentId: processData.documentId,
      processedAt: new Date().toISOString(),
      extractedText: 'Sample extracted text from document...',
      confidence: 0.95,
      pageCount: 1,
    };
  }
);

export const startBatchSession = createAsyncThunk(
  'physicalDocs/startBatchSession',
  async (batchData: {
    type: 'barcode' | 'document';
    targetCount: number;
    autoAdvance: boolean;
  }) => {
    const batch: BatchSession = {
      id: `batch_${Date.now()}`,
      type: batchData.type,
      createdAt: new Date().toISOString(),
      targetCount: batchData.targetCount,
      items: [],
      status: 'active',
      autoAdvance: batchData.autoAdvance,
    };

    return batch;
  }
);

export const endBatchSession = createAsyncThunk(
  'physicalDocs/endBatchSession',
  async () => {
    // Mock API call to finalize batch
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      completedAt: new Date().toISOString(),
    };
  }
);

export const addToBatch = createAsyncThunk(
  'physicalDocs/addToBatch',
  async (itemData: {
    batchId: string;
    item: BatchItem;
  }) => {
    // Mock validation/processing
    await new Promise(resolve => setTimeout(resolve, 200));

    return itemData;
  }
);

export const removeFromBatch = createAsyncThunk(
  'physicalDocs/removeFromBatch',
  async (removeData: {
    batchId: string;
    itemId: string;
  }) => {
    return removeData;
  }
);

export const processBatch = createAsyncThunk(
  'physicalDocs/processBatch',
  async (batchId: string) => {
    // Mock batch processing (upload, validation, etc.)
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      batchId,
      processedAt: new Date().toISOString(),
      results: {
        totalItems: 0,
        successCount: 0,
        failureCount: 0,
      },
    };
  }
);

export const clearBatch = createAsyncThunk(
  'physicalDocs/clearBatch',
  async (batchId: string) => {
    return { batchId };
  }
);

export const syncOfflineOperations = createAsyncThunk(
  'physicalDocs/syncOfflineOperations',
  async () => {
    const { syncService } = await import('@/services/syncService');

    // Start sync with progress tracking
    const result = await syncService.startSync();

    return {
      syncedCount: result.syncedCount,
      failedCount: result.failedCount,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    };
  }
);

const physicalDocsSlice = createSlice({
  name: 'physicalDocs',
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.errors = {};
    },
    addBarcodeLocally: (state, action) => {
      state.barcodes.generated.push(action.payload);
    },
    setEnhancementSettings: (state, action) => {
      state.capture.enhancementSettings = { ...state.capture.enhancementSettings, ...action.payload };
    },
    setBatchProgress: (state, action) => {
      state.batch.batchProgress = action.payload;
    },
    setDefaultSettings: (state, action) => {
      state.configuration.defaultSettings = { ...state.configuration.defaultSettings, ...action.payload };
    },
    addLabelTemplate: (state, action) => {
      state.barcodes.templates.push(action.payload);
    },
    updateLabelTemplate: (state, action) => {
      const index = state.barcodes.templates.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.barcodes.templates[index] = action.payload;
      }
    },
    deleteLabelTemplate: (state, action) => {
      state.barcodes.templates = state.barcodes.templates.filter(t => t.id !== action.payload);
    },
    deactivateBarcode: (state, action) => {
      const barcode = state.barcodes.generated.find(b => b.id === action.payload);
      if (barcode) {
        barcode.isActive = false;
        barcode.updatedAt = new Date().toISOString();
      }
    },
    updatePrintJobStatus: (state, action) => {
      const { jobId, status, error } = action.payload;
      const job = state.barcodes.printJobs.find(j => j.id === jobId);
      if (job) {
        job.status = status;
        if (error) job.error = error;
        if (status === 'completed' || status === 'failed') {
          job.completedAt = new Date().toISOString();
        }
      }
    },
    // Mobile scanning reducers
    addScannedItem: (state, action) => {
      state.mobileScanning.scanQueue.push(action.payload);
      if (state.mobileScanning.currentSession) {
        state.mobileScanning.currentSession.scannedCount += 1;
      }
    },
    removeScannedItem: (state, action) => {
      state.mobileScanning.scanQueue = state.mobileScanning.scanQueue.filter(
        item => item.id !== action.payload
      );
    },
    setCameraStatus: (state, action) => {
      state.mobileScanning.cameraStatus = { ...state.mobileScanning.cameraStatus, ...action.payload };
    },
    setOfflineMode: (state, action) => {
      state.offline.isOffline = action.payload;
      state.offline.syncStatus.isOnline = !action.payload;
    },
    addOfflineOperation: (state, action) => {
      state.offline.queuedOperations.push(action.payload);
      state.offline.syncStatus.pendingOperations += 1;
    },
    setLocationPermission: (state, action) => {
      state.geolocation.locationPermission = action.payload;
    },
    updateLocation: (state, action) => {
      state.geolocation.currentLocation = action.payload;
    },
    updateEnhancementSettings: (state, action) => {
      state.capture.enhancementSettings = { ...state.capture.enhancementSettings, ...action.payload };
    },
    setProcessingStatus: (state, action) => {
      state.capture.processingStatus = { ...state.capture.processingStatus, ...action.payload };
    },
    addCapturedDocument: (state, action) => {
      state.capture.captureQueue.push(action.payload);
      if (state.mobileScanning.currentSession) {
        state.mobileScanning.currentSession.capturedCount += 1;
      }
    },
    clearScanQueue: (state) => {
      state.mobileScanning.scanQueue = [];
    },
    clearCaptureQueue: (state) => {
      state.capture.captureQueue = [];
    },
    endScanSession: (state) => {
      if (state.mobileScanning.currentSession) {
        state.mobileScanning.currentSession.status = 'completed';
        state.mobileScanning.currentSession.endedAt = new Date().toISOString();
        state.mobileScanning.currentSession = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Generate single barcode
      .addCase(generateBarcode.pending, (state) => {
        state.loading.generating = true;
        delete state.errors.generation;
      })
      .addCase(generateBarcode.fulfilled, (state, action) => {
        state.loading.generating = false;
        state.barcodes.generated.push(action.payload);
      })
      .addCase(generateBarcode.rejected, (state, action) => {
        state.loading.generating = false;
        state.errors.generation = action.error.message || 'Failed to generate barcode';
      })

      // Batch generate barcodes
      .addCase(batchGenerateBarcodes.pending, (state) => {
        state.loading.generating = true;
        delete state.errors.generation;
      })
      .addCase(batchGenerateBarcodes.fulfilled, (state, action) => {
        state.loading.generating = false;
        state.barcodes.generated.push(...action.payload);
      })
      .addCase(batchGenerateBarcodes.rejected, (state, action) => {
        state.loading.generating = false;
        state.errors.generation = action.error.message || 'Failed to generate barcodes';
      })

      // Validate barcode uniqueness
      .addCase(validateBarcodeUniqueness.pending, (state) => {
        state.loading.validating = true;
        delete state.errors.validation;
      })
      .addCase(validateBarcodeUniqueness.fulfilled, (state) => {
        state.loading.validating = false;
        // Validation results can be handled by components
      })
      .addCase(validateBarcodeUniqueness.rejected, (state, action) => {
        state.loading.validating = false;
        state.errors.validation = action.error.message || 'Failed to validate barcode';
      })

      // Submit print job
      .addCase(submitPrintJob.pending, (state) => {
        state.loading.printing = true;
        delete state.errors.printing;
      })
      .addCase(submitPrintJob.fulfilled, (state, action) => {
        state.loading.printing = false;
        state.barcodes.printJobs.push(action.payload);
        state.printing.printQueue.push(action.payload);
      })
      .addCase(submitPrintJob.rejected, (state, action) => {
        state.loading.printing = false;
        state.errors.printing = action.error.message || 'Failed to submit print job';
      })
      // Mobile scanning async thunk handlers
      .addCase(startScanSession.pending, (state) => {
        state.loading.scanning = true;
        delete state.errors.scanning;
      })
      .addCase(startScanSession.fulfilled, (state, action) => {
        state.loading.scanning = false;
        state.mobileScanning.currentSession = action.payload;
      })
      .addCase(startScanSession.rejected, (state, action) => {
        state.loading.scanning = false;
        state.errors.scanning = action.error.message || 'Failed to start scan session';
      })
      .addCase(initializeCamera.pending, (state) => {
        state.loading.scanning = true;
        delete state.errors.scanning;
      })
      .addCase(initializeCamera.fulfilled, (state, action) => {
        state.loading.scanning = false;
        state.mobileScanning.cameraStatus = {
          ...state.mobileScanning.cameraStatus,
          isActive: true,
          hasPermission: action.payload.hasPermission,
          deviceId: action.payload.deviceId,
        };
      })
      .addCase(initializeCamera.rejected, (state, action) => {
        state.loading.scanning = false;
        state.mobileScanning.cameraStatus.error = action.error.message || 'Camera initialization failed';
        state.errors.scanning = action.error.message || 'Camera access denied';
      })
      .addCase(scanBarcode.pending, (state) => {
        state.loading.validating = true;
      })
      .addCase(scanBarcode.fulfilled, (state, action) => {
        state.loading.validating = false;
        state.mobileScanning.scanQueue.push(action.payload);
        state.mobileScanning.scanHistory.push({
          id: action.payload.id,
          sessionId: state.mobileScanning.currentSession?.id || '',
          barcode: action.payload.barcode,
          format: action.payload.format,
          timestamp: action.payload.timestamp,
          confidence: action.payload.confidence,
        });
        if (state.mobileScanning.currentSession) {
          state.mobileScanning.currentSession.scannedCount += 1;
        }
      })
      .addCase(scanBarcode.rejected, (state, action) => {
        state.loading.validating = false;
        state.errors.validation = action.error.message || 'Barcode scan failed';
      })
      .addCase(validateBarcode.pending, (state) => {
        state.loading.validating = true;
      })
      .addCase(validateBarcode.fulfilled, (state, action) => {
        state.loading.validating = false;
        // Update the scan item with validation result
        const lastScan = state.mobileScanning.scanQueue[state.mobileScanning.scanQueue.length - 1];
        if (lastScan) {
          lastScan.validated = action.payload.isValid;
          lastScan.metadata = action.payload.metadata;
        }
      })
      .addCase(validateBarcode.rejected, (state, action) => {
        state.loading.validating = false;
        state.errors.validation = action.error.message || 'Barcode validation failed';
      })
      .addCase(captureDocument.pending, (state) => {
        state.loading.capturing = true;
        state.capture.processingStatus.isProcessing = true;
        delete state.errors.capturing;
      })
      .addCase(captureDocument.fulfilled, (state, action) => {
        state.loading.capturing = false;
        state.capture.processingStatus.isProcessing = false;
        state.capture.captureQueue.push(action.payload);
        if (state.mobileScanning.currentSession) {
          state.mobileScanning.currentSession.capturedCount += 1;
        }
      })
      .addCase(captureDocument.rejected, (state, action) => {
        state.loading.capturing = false;
        state.capture.processingStatus.isProcessing = false;
        state.errors.capturing = action.error.message || 'Document capture failed';
      })
      .addCase(enhanceDocument.pending, (state) => {
        state.capture.processingStatus.isProcessing = true;
        delete state.errors.enhancement;
      })
      .addCase(enhanceDocument.fulfilled, (state, action) => {
        state.capture.processingStatus.isProcessing = false;
        if (state.capture.currentDocument) {
          state.capture.currentDocument.enhancedImage = action.payload.enhancedImageUrl;
        }
      })
      .addCase(enhanceDocument.rejected, (state, action) => {
        state.capture.processingStatus.isProcessing = false;
        state.errors.enhancement = action.error.message || 'Document enhancement failed';
      })
      .addCase(processDocument.pending, (state) => {
        state.capture.processingStatus.isProcessing = true;
        delete state.errors.processing;
      })
      .addCase(processDocument.fulfilled, (state, action) => {
        state.capture.processingStatus.isProcessing = false;
        if (state.capture.currentDocument) {
          state.capture.currentDocument.processedAt = action.payload.processedAt;
          state.capture.currentDocument.extractedText = action.payload.extractedText;
        }
      })
      .addCase(processDocument.rejected, (state, action) => {
        state.capture.processingStatus.isProcessing = false;
        state.errors.processing = action.error.message || 'Document processing failed';
      })
      // Batch operations
      .addCase(startBatchSession.pending, (state) => {
        delete state.errors.batch;
      })
      .addCase(startBatchSession.fulfilled, (state, action) => {
        state.batch.currentBatch = action.payload;
        state.batch.batchProgress = 0;
      })
      .addCase(startBatchSession.rejected, (state, action) => {
        state.errors.batch = action.error.message || 'Failed to start batch session';
      })
      .addCase(endBatchSession.fulfilled, (state, action) => {
        if (state.batch.currentBatch) {
          state.batch.currentBatch.completedAt = action.payload.completedAt;
          state.batch.currentBatch.status = 'completed';
          state.batch.batchQueue.push(state.batch.currentBatch);
          state.batch.currentBatch = null;
          state.batch.batchProgress = 0;
        }
      })
      .addCase(addToBatch.fulfilled, (state, action) => {
        if (state.batch.currentBatch) {
          state.batch.currentBatch.items.push(action.payload.item);
        }
      })
      .addCase(removeFromBatch.fulfilled, (state, action) => {
        if (state.batch.currentBatch) {
          state.batch.currentBatch.items = state.batch.currentBatch.items.filter(
            item => item.id !== action.payload.itemId
          );
        }
      })
      .addCase(processBatch.pending, (state) => {
        if (state.batch.currentBatch) {
          state.batch.currentBatch.status = 'processing';
        }
      })
      .addCase(processBatch.fulfilled, (state, action) => {
        if (state.batch.currentBatch) {
          state.batch.currentBatch.status = 'completed';
          state.batch.currentBatch.completedAt = action.payload.processedAt;
          state.batch.batchQueue.push(state.batch.currentBatch);
          state.batch.currentBatch = null;
          state.batch.batchProgress = 0;
        }
      })
      .addCase(processBatch.rejected, (state, action) => {
        if (state.batch.currentBatch) {
          state.batch.currentBatch.status = 'failed';
        }
        state.errors.batch = action.error.message || 'Batch processing failed';
      })
      .addCase(clearBatch.fulfilled, (state) => {
        if (state.batch.currentBatch) {
          state.batch.currentBatch.items = [];
          state.batch.batchProgress = 0;
        }
      })
      .addCase(syncOfflineOperations.pending, (state) => {
        state.loading.syncing = true;
        state.offline.syncStatus.isSyncing = true;
        delete state.errors.sync;
      })
      .addCase(syncOfflineOperations.fulfilled, (state, action) => {
        state.loading.syncing = false;
        state.offline.syncStatus.isSyncing = false;
        state.offline.syncStatus.lastSync = action.payload.timestamp;
        state.offline.syncStatus.pendingOperations = 0;
        state.offline.queuedOperations = [];
      })
      .addCase(syncOfflineOperations.rejected, (state, action) => {
        state.loading.syncing = false;
        state.offline.syncStatus.isSyncing = false;
        state.errors.sync = action.error.message || 'Sync failed';
      });
  },
});

export const {
  clearErrors,
  setEnhancementSettings,
  setBatchProgress,
  setDefaultSettings,
  addLabelTemplate,
  updateLabelTemplate,
  deleteLabelTemplate,
  deactivateBarcode,
  updatePrintJobStatus,
  addBarcodeLocally,
  // Mobile scanning actions
  addScannedItem,
  removeScannedItem,
  setCameraStatus,
  setOfflineMode,
  addOfflineOperation,
  setLocationPermission,
  updateLocation,
  updateEnhancementSettings,
  setProcessingStatus,
  addCapturedDocument,
  clearScanQueue,
  clearCaptureQueue,
  endScanSession,
} = physicalDocsSlice.actions;

export default physicalDocsSlice.reducer;
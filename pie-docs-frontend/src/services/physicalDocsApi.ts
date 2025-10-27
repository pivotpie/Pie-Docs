/**
 * Physical Documents API Service
 * Handles all API calls for barcode management, location tracking, mobile scanning, and printing
 */
import axiosInstance from '@/config/axiosConfig';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const api = axiosInstance.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ==========================================
// Barcode Management API
// ==========================================

export const barcodeApi = {
  // Get all barcode formats
  getFormats: async () => {
    const response = await api.get('/api/v1/physical/barcodes/formats');
    return response.data;
  },

  // List barcodes with pagination
  listBarcodes: async (params: {
    page?: number;
    page_size?: number;
    is_active?: boolean;
    document_id?: string;
    asset_id?: string;
  }) => {
    const response = await api.get('/api/v1/physical/barcodes', { params });
    return response.data;
  },

  // Get a specific barcode
  getBarcode: async (barcodeId: string) => {
    const response = await api.get(`/api/v1/physical/barcodes/${barcodeId}`);
    return response.data;
  },

  // Lookup barcode by code
  lookupBarcode: async (code: string) => {
    const response = await api.get(`/api/v1/physical/barcodes/lookup/${code}`);
    return response.data;
  },

  // Create a new barcode
  createBarcode: async (data: {
    code: string;
    format_id: string;
    document_id?: string;
    asset_id?: string;
    metadata?: Record<string, any>;
  }) => {
    const response = await api.post('/api/v1/physical/barcodes', data);
    return response.data;
  },

  // Generate barcodes
  generateBarcodes: async (data: {
    document_ids?: string[];
    asset_ids?: string[];
    format: string;
    prefix?: string;
    suffix?: string;
    quantity: number;
  }) => {
    const response = await api.post('/api/v1/physical/barcodes/generate', data);
    return response.data;
  },

  // Get generation job status
  getGenerationJob: async (jobId: string) => {
    const response = await api.get(`/api/v1/physical/barcodes/jobs/${jobId}`);
    return response.data;
  },

  // Validate barcode
  validateBarcode: async (code: string) => {
    const response = await api.post(`/api/v1/physical/barcodes/validate/${code}`);
    return response.data;
  },

  // Deactivate barcode
  deactivateBarcode: async (barcodeId: string) => {
    const response = await api.patch(`/api/v1/physical/barcodes/${barcodeId}/deactivate`);
    return response.data;
  },

  // Activate barcode
  activateBarcode: async (barcodeId: string) => {
    const response = await api.patch(`/api/v1/physical/barcodes/${barcodeId}/activate`);
    return response.data;
  },
};

// ==========================================
// Location Tracking API
// ==========================================

export const locationApi = {
  // List locations with pagination
  listLocations: async (params: {
    page?: number;
    page_size?: number;
    location_type?: string;
    parent_id?: string;
  }) => {
    const response = await api.get('/api/v1/physical/locations', { params });
    return response.data;
  },

  // Get location hierarchy
  getHierarchy: async (rootId?: string) => {
    const params = rootId ? { root_id: rootId } : {};
    const response = await api.get('/api/v1/physical/locations/hierarchy', { params });
    return response.data;
  },

  // Get a specific location
  getLocation: async (locationId: string) => {
    const response = await api.get(`/api/v1/physical/locations/${locationId}`);
    return response.data;
  },

  // Get location contents
  getLocationContents: async (locationId: string) => {
    const response = await api.get(`/api/v1/physical/locations/${locationId}/contents`);
    return response.data;
  },

  // Create a location
  createLocation: async (data: {
    name: string;
    description?: string;
    location_type: string;
    parent_id?: string;
    capacity?: number;
    barcode_id?: string;
    coordinates?: Record<string, any>;
    metadata?: Record<string, any>;
  }) => {
    const response = await api.post('/api/v1/physical/locations', data);
    return response.data;
  },

  // Update a location
  updateLocation: async (locationId: string, data: any) => {
    const response = await api.patch(`/api/v1/physical/locations/${locationId}`, data);
    return response.data;
  },

  // Delete a location
  deleteLocation: async (locationId: string) => {
    const response = await api.delete(`/api/v1/physical/locations/${locationId}`);
    return response.data;
  },

  // Record a movement
  recordMovement: async (data: {
    item_type: 'document' | 'asset';
    item_id: string;
    from_location_id?: string;
    to_location_id: string;
    notes?: string;
  }, userId: string) => {
    const response = await api.post('/api/v1/physical/locations/movements', data, {
      params: { user_id: userId },
    });
    return response.data;
  },

  // List movements
  listMovements: async (params: {
    page?: number;
    page_size?: number;
    item_id?: string;
    location_id?: string;
  }) => {
    const response = await api.get('/api/v1/physical/locations/movements', { params });
    return response.data;
  },

  // Get utilization report
  getUtilizationReport: async () => {
    const response = await api.get('/api/v1/physical/locations/utilization');
    return response.data;
  },
};

// ==========================================
// Mobile Scanning API
// ==========================================

export const mobileApi = {
  // Start a scan session
  startScanSession: async (sessionType: 'barcode' | 'document' | 'batch', userId: string) => {
    const response = await api.post(
      '/api/v1/physical/mobile/sessions',
      { session_type: sessionType },
      { params: { user_id: userId } }
    );
    return response.data;
  },

  // Get scan session
  getScanSession: async (sessionId: string) => {
    const response = await api.get(`/api/v1/physical/mobile/sessions/${sessionId}`);
    return response.data;
  },

  // End scan session
  endScanSession: async (sessionId: string) => {
    const response = await api.patch(`/api/v1/physical/mobile/sessions/${sessionId}/end`);
    return response.data;
  },

  // List scan sessions
  listScanSessions: async (params: { user_id?: string; page?: number; page_size?: number }) => {
    const response = await api.get('/api/v1/physical/mobile/sessions', { params });
    return response.data;
  },

  // Record a scan
  recordScan: async (data: {
    session_id: string;
    barcode: string;
    format: string;
    confidence: number;
    metadata?: Record<string, any>;
  }) => {
    const response = await api.post('/api/v1/physical/mobile/scans', data);
    return response.data;
  },

  // List scans
  listScans: async (params: { session_id?: string; page?: number; page_size?: number }) => {
    const response = await api.get('/api/v1/physical/mobile/scans', { params });
    return response.data;
  },

  // Capture a document
  captureDocument: async (sessionId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/api/v1/physical/mobile/captures', formData, {
      params: { session_id: sessionId },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // List captured documents
  listCapturedDocuments: async (params: { session_id?: string; page?: number; page_size?: number }) => {
    const response = await api.get('/api/v1/physical/mobile/captures', { params });
    return response.data;
  },

  // Process captured document
  processCapturedDocument: async (captureId: string) => {
    const response = await api.patch(`/api/v1/physical/mobile/captures/${captureId}/process`);
    return response.data;
  },

  // Start batch session
  startBatchSession: async (
    data: {
      batch_type: 'barcode' | 'document';
      target_count: number;
      auto_advance: boolean;
    },
    userId: string
  ) => {
    const response = await api.post('/api/v1/physical/mobile/batch', data, {
      params: { user_id: userId },
    });
    return response.data;
  },

  // Add batch item
  addBatchItem: async (batchId: string, data: { item_type: string; data: string; metadata?: Record<string, any> }) => {
    const response = await api.post(`/api/v1/physical/mobile/batch/${batchId}/items`, data);
    return response.data;
  },

  // Complete batch session
  completeBatchSession: async (batchId: string) => {
    const response = await api.patch(`/api/v1/physical/mobile/batch/${batchId}/complete`);
    return response.data;
  },

  // Get batch session
  getBatchSession: async (batchId: string) => {
    const response = await api.get(`/api/v1/physical/mobile/batch/${batchId}`);
    return response.data;
  },

  // Queue offline operation
  queueOfflineOperation: async (
    data: {
      operation_type: string;
      payload: Record<string, any>;
    },
    userId: string
  ) => {
    const response = await api.post('/api/v1/physical/mobile/offline', data, {
      params: { user_id: userId },
    });
    return response.data;
  },

  // Sync offline operations
  syncOfflineOperations: async (userId: string) => {
    const response = await api.post(
      '/api/v1/physical/mobile/sync',
      {},
      {
        params: { user_id: userId },
      }
    );
    return response.data;
  },

  // Get offline status
  getOfflineStatus: async (userId: string) => {
    const response = await api.get('/api/v1/physical/mobile/offline/status', {
      params: { user_id: userId },
    });
    return response.data;
  },
};

// ==========================================
// Print Management API
// ==========================================

export const printApi = {
  // List print templates
  listTemplates: async () => {
    const response = await api.get('/api/v1/physical/print/templates');
    return response.data;
  },

  // Get a template
  getTemplate: async (templateId: string) => {
    const response = await api.get(`/api/v1/physical/print/templates/${templateId}`);
    return response.data;
  },

  // Create a template
  createTemplate: async (data: {
    name: string;
    description?: string;
    dimensions: Record<string, any>;
    elements: any[];
    is_default?: boolean;
  }) => {
    const response = await api.post('/api/v1/physical/print/templates', data);
    return response.data;
  },

  // Delete a template
  deleteTemplate: async (templateId: string) => {
    const response = await api.delete(`/api/v1/physical/print/templates/${templateId}`);
    return response.data;
  },

  // List printers
  listPrinters: async () => {
    const response = await api.get('/api/v1/physical/print/printers');
    return response.data;
  },

  // Get a printer
  getPrinter: async (printerId: string) => {
    const response = await api.get(`/api/v1/physical/print/printers/${printerId}`);
    return response.data;
  },

  // Create a printer
  createPrinter: async (data: {
    name: string;
    printer_type: 'label' | 'standard';
    model: string;
    capabilities?: string[];
    is_default?: boolean;
  }) => {
    const response = await api.post('/api/v1/physical/print/printers', data);
    return response.data;
  },

  // Update a printer
  updatePrinter: async (
    printerId: string,
    data: {
      name?: string;
      status?: string;
      is_default?: boolean;
    }
  ) => {
    const response = await api.patch(`/api/v1/physical/print/printers/${printerId}`, data);
    return response.data;
  },

  // Delete a printer
  deletePrinter: async (printerId: string) => {
    const response = await api.delete(`/api/v1/physical/print/printers/${printerId}`);
    return response.data;
  },

  // List print jobs
  listPrintJobs: async (params: { page?: number; page_size?: number; status?: string }) => {
    const response = await api.get('/api/v1/physical/print/jobs', { params });
    return response.data;
  },

  // Get a print job
  getPrintJob: async (jobId: string) => {
    const response = await api.get(`/api/v1/physical/print/jobs/${jobId}`);
    return response.data;
  },

  // Create a print job
  createPrintJob: async (data: {
    template_id: string;
    barcode_ids: string[];
    printer_id?: string;
    copies?: number;
  }) => {
    const response = await api.post('/api/v1/physical/print/jobs', data);
    return response.data;
  },

  // Update print job status
  updatePrintJobStatus: async (jobId: string, status: string, error?: string) => {
    const response = await api.patch(`/api/v1/physical/print/jobs/${jobId}/status`, null, {
      params: { status, error },
    });
    return response.data;
  },

  // Execute print job
  executePrintJob: async (jobId: string) => {
    const response = await api.post(`/api/v1/physical/print/jobs/${jobId}/print`);
    return response.data;
  },
};

export default {
  barcode: barcodeApi,
  location: locationApi,
  mobile: mobileApi,
  print: printApi,
};

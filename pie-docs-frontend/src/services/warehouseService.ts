/**
 * Warehouse Management Service
 * API client for warehouse entity operations
 */
import axiosInstance from '@/config/axiosConfig';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const apiClient = axiosInstance.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});
import type {
  // Location
  Location, LocationCreate, LocationUpdate,
  // Warehouse
  Warehouse, WarehouseCreate, WarehouseUpdate,
  // Zone
  Zone, ZoneCreate, ZoneUpdate,
  // Shelf
  Shelf, ShelfCreate, ShelfUpdate,
  // Rack
  Rack, RackCreate, RackUpdate,
  // Physical Document
  PhysicalDocument, PhysicalDocumentCreate, PhysicalDocumentUpdate,
  // Movement
  DocumentMovement, DocumentMovementCreate,
  // Customer Assignment
  CustomerRackAssignment, CustomerRackAssignmentCreate,
  // Response types
  PaginatedResponse, ApiResponse, EntityCounts, CapacityStats,
  WarehouseHierarchy, WarehouseSearchFilters
} from '@/types/warehouse';

const API_BASE = '/warehouse';

// ==========================================
// Location Services
// ==========================================
export const locationService = {
  /**
   * List all locations with optional filtering
   */
  async list(filters?: { status?: string; search?: string }): Promise<Location[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const response = await apiClient.get(`${API_BASE}/locations?${params}`);
    return response.data;
  },

  /**
   * Get a specific location by ID
   */
  async get(locationId: string): Promise<Location> {
    const response = await apiClient.get(`${API_BASE}/locations/${locationId}`);
    return response.data;
  },

  /**
   * Create a new location
   */
  async create(location: LocationCreate, userId: string): Promise<Location> {
    const response = await apiClient.post(`${API_BASE}/locations?user_id=${userId}`, location);
    return response.data;
  },

  /**
   * Update a location
   */
  async update(locationId: string, location: LocationUpdate, userId: string): Promise<Location> {
    const response = await apiClient.patch(`${API_BASE}/locations/${locationId}?user_id=${userId}`, location);
    return response.data;
  },

  /**
   * Delete a location
   */
  async delete(locationId: string): Promise<{ message: string; id: string }> {
    const response = await apiClient.delete(`${API_BASE}/locations/${locationId}`);
    return response.data;
  }
};

// ==========================================
// Warehouse Services
// ==========================================
export const warehouseService = {
  /**
   * List all warehouses with optional filtering
   */
  async list(filters?: { location_id?: string; status?: string; search?: string }): Promise<Warehouse[]> {
    const params = new URLSearchParams();
    if (filters?.location_id) params.append('location_id', filters.location_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const response = await apiClient.get(`${API_BASE}/warehouses?${params}`);
    return response.data;
  },

  /**
   * Get a specific warehouse by ID
   */
  async get(warehouseId: string): Promise<Warehouse> {
    const response = await apiClient.get(`${API_BASE}/warehouses/${warehouseId}`);
    return response.data;
  },

  /**
   * Create a new warehouse
   */
  async create(warehouse: WarehouseCreate, userId: string): Promise<Warehouse> {
    const response = await apiClient.post(`${API_BASE}/warehouses?user_id=${userId}`, warehouse);
    return response.data;
  },

  /**
   * Update a warehouse
   */
  async update(warehouseId: string, warehouse: WarehouseUpdate, userId: string): Promise<Warehouse> {
    const response = await apiClient.patch(`${API_BASE}/warehouses/${warehouseId}?user_id=${userId}`, warehouse);
    return response.data;
  },

  /**
   * Delete a warehouse
   */
  async delete(warehouseId: string): Promise<{ message: string; id: string }> {
    const response = await apiClient.delete(`${API_BASE}/warehouses/${warehouseId}`);
    return response.data;
  }
};

// ==========================================
// Zone Services
// ==========================================
export const zoneService = {
  /**
   * List all zones with optional filtering
   */
  async list(filters?: { warehouse_id?: string; status?: string; search?: string }): Promise<Zone[]> {
    const params = new URLSearchParams();
    if (filters?.warehouse_id) params.append('warehouse_id', filters.warehouse_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const response = await apiClient.get(`${API_BASE}/zones?${params}`);
    return response.data;
  },

  /**
   * Get a specific zone by ID
   */
  async get(zoneId: string): Promise<Zone> {
    const response = await apiClient.get(`${API_BASE}/zones/${zoneId}`);
    return response.data;
  },

  /**
   * Create a new zone with barcode
   */
  async create(zone: ZoneCreate, userId: string): Promise<Zone> {
    const response = await apiClient.post(`${API_BASE}/zones?user_id=${userId}`, zone);
    return response.data;
  },

  /**
   * Update a zone
   */
  async update(zoneId: string, zone: ZoneUpdate, userId: string): Promise<Zone> {
    const response = await apiClient.patch(`${API_BASE}/zones/${zoneId}?user_id=${userId}`, zone);
    return response.data;
  },

  /**
   * Delete a zone
   */
  async delete(zoneId: string): Promise<{ message: string; id: string }> {
    const response = await apiClient.delete(`${API_BASE}/zones/${zoneId}`);
    return response.data;
  }
};

// ==========================================
// Shelf Services
// ==========================================
export const shelfService = {
  /**
   * List all shelves with optional filtering
   */
  async list(filters?: { zone_id?: string; status?: string; search?: string }): Promise<Shelf[]> {
    const params = new URLSearchParams();
    if (filters?.zone_id) params.append('zone_id', filters.zone_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const response = await apiClient.get(`${API_BASE}/shelves?${params}`);
    return response.data;
  },

  /**
   * Get a specific shelf by ID
   */
  async get(shelfId: string): Promise<Shelf> {
    const response = await apiClient.get(`${API_BASE}/shelves/${shelfId}`);
    return response.data;
  },

  /**
   * Create a new shelf with barcode
   */
  async create(shelf: ShelfCreate, userId: string): Promise<Shelf> {
    const response = await apiClient.post(`${API_BASE}/shelves?user_id=${userId}`, shelf);
    return response.data;
  },

  /**
   * Update a shelf
   */
  async update(shelfId: string, shelf: ShelfUpdate, userId: string): Promise<Shelf> {
    const response = await apiClient.patch(`${API_BASE}/shelves/${shelfId}?user_id=${userId}`, shelf);
    return response.data;
  },

  /**
   * Delete a shelf
   */
  async delete(shelfId: string): Promise<{ message: string; id: string }> {
    const response = await apiClient.delete(`${API_BASE}/shelves/${shelfId}`);
    return response.data;
  }
};

// ==========================================
// Rack Services
// ==========================================
export const rackService = {
  /**
   * List all racks with optional filtering
   */
  async list(filters?: {
    shelf_id?: string;
    customer_id?: string;
    status?: string;
    available?: boolean;
    search?: string
  }): Promise<Rack[]> {
    const params = new URLSearchParams();
    if (filters?.shelf_id) params.append('shelf_id', filters.shelf_id);
    if (filters?.customer_id) params.append('customer_id', filters.customer_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.available !== undefined) params.append('available', String(filters.available));
    if (filters?.search) params.append('search', filters.search);

    const response = await apiClient.get(`${API_BASE}/racks?${params}`);
    return response.data;
  },

  /**
   * Get a specific rack by ID
   */
  async get(rackId: string): Promise<Rack> {
    const response = await apiClient.get(`${API_BASE}/racks/${rackId}`);
    return response.data;
  },

  /**
   * Get rack by barcode
   */
  async getByBarcode(barcode: string): Promise<Rack> {
    const response = await apiClient.get(`${API_BASE}/racks/barcode/${barcode}`);
    return response.data;
  },

  /**
   * Create a new rack with barcode
   */
  async create(rack: RackCreate, userId: string): Promise<Rack> {
    const response = await apiClient.post(`${API_BASE}/racks?user_id=${userId}`, rack);
    return response.data;
  },

  /**
   * Update a rack
   */
  async update(rackId: string, rack: RackUpdate, userId: string): Promise<Rack> {
    const response = await apiClient.patch(`${API_BASE}/racks/${rackId}?user_id=${userId}`, rack);
    return response.data;
  },

  /**
   * Delete a rack
   */
  async delete(rackId: string): Promise<{ message: string; id: string }> {
    const response = await apiClient.delete(`${API_BASE}/racks/${rackId}`);
    return response.data;
  }
};

// ==========================================
// Physical Document Services
// ==========================================
export const physicalDocumentService = {
  /**
   * List physical documents with pagination and filtering
   */
  async list(filters?: {
    rack_id?: string;
    customer_id?: string;
    status?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PhysicalDocument[]> {
    const params = new URLSearchParams();
    if (filters?.rack_id) params.append('rack_id', filters.rack_id);
    if (filters?.customer_id) params.append('customer_id', filters.customer_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.page_size) params.append('page_size', String(filters.page_size));

    const response = await apiClient.get(`${API_BASE}/documents?${params}`);
    return response.data;
  },

  /**
   * Get a specific physical document by ID
   */
  async get(documentId: string): Promise<PhysicalDocument> {
    const response = await apiClient.get(`${API_BASE}/documents/${documentId}`);
    return response.data;
  },

  /**
   * Get document by barcode
   */
  async getByBarcode(barcode: string): Promise<PhysicalDocument> {
    const response = await apiClient.get(`${API_BASE}/documents/barcode/${barcode}`);
    return response.data;
  },

  /**
   * Create a new physical document record
   */
  async create(document: PhysicalDocumentCreate, userId: string): Promise<PhysicalDocument> {
    const response = await apiClient.post(`${API_BASE}/documents?user_id=${userId}`, document);
    return response.data;
  },

  /**
   * Update a physical document
   */
  async update(documentId: string, document: PhysicalDocumentUpdate, userId: string): Promise<PhysicalDocument> {
    const response = await apiClient.patch(`${API_BASE}/documents/${documentId}?user_id=${userId}`, document);
    return response.data;
  },

  /**
   * Delete a physical document
   */
  async delete(documentId: string): Promise<{ message: string; id: string }> {
    const response = await apiClient.delete(`${API_BASE}/documents/${documentId}`);
    return response.data;
  }
};

// ==========================================
// Customer Assignment Services
// ==========================================
export const customerAssignmentService = {
  /**
   * List customer rack assignments
   */
  async list(filters?: {
    customer_id?: string;
    rack_id?: string;
    status?: string
  }): Promise<CustomerRackAssignment[]> {
    const params = new URLSearchParams();
    if (filters?.customer_id) params.append('customer_id', filters.customer_id);
    if (filters?.rack_id) params.append('rack_id', filters.rack_id);
    if (filters?.status) params.append('status', filters.status);

    const response = await apiClient.get(`${API_BASE}/customer-assignments?${params}`);
    return response.data;
  },

  /**
   * Create a new customer rack assignment
   */
  async create(assignment: CustomerRackAssignmentCreate, userId: string): Promise<CustomerRackAssignment> {
    const response = await apiClient.post(`${API_BASE}/customer-assignments?user_id=${userId}`, assignment);
    return response.data;
  },

  /**
   * Delete a customer rack assignment
   */
  async delete(assignmentId: string): Promise<{ message: string; id: string }> {
    const response = await apiClient.delete(`${API_BASE}/customer-assignments/${assignmentId}`);
    return response.data;
  }
};

// ==========================================
// Statistics and Analytics Services
// ==========================================
export const warehouseStatsService = {
  /**
   * Get total counts of all entities
   */
  async getCounts(locationId?: string): Promise<EntityCounts> {
    const params = new URLSearchParams();
    if (locationId) params.append('location_id', locationId);

    const response = await apiClient.get(`${API_BASE}/stats/counts?${params}`);
    return response.data;
  },

  /**
   * Get capacity utilization statistics
   */
  async getCapacityStats(filters?: {
    entity_type?: 'zone' | 'shelf' | 'rack';
    entity_id?: string
  }): Promise<CapacityStats[]> {
    const params = new URLSearchParams();
    if (filters?.entity_type) params.append('entity_type', filters.entity_type);
    if (filters?.entity_id) params.append('entity_id', filters.entity_id);

    const response = await apiClient.get(`${API_BASE}/stats/capacity?${params}`);
    return response.data;
  },

  /**
   * Get complete warehouse hierarchy for a location
   */
  async getHierarchy(locationId: string): Promise<WarehouseHierarchy> {
    const response = await apiClient.get(`${API_BASE}/hierarchy/${locationId}`);
    return response.data;
  }
};

// ==========================================
// Barcode Integration Service
// ==========================================
export const warehouseBarcodeService = {
  /**
   * Scan a barcode and identify the entity
   */
  async scanBarcode(barcode: string): Promise<{
    entity_type: 'zone' | 'shelf' | 'rack' | 'document';
    entity: Zone | Shelf | Rack | PhysicalDocument;
    location_path: string;
  }> {
    // Try to find rack first
    try {
      const rack = await rackService.getByBarcode(barcode);
      return {
        entity_type: 'rack',
        entity: rack,
        location_path: `Rack: ${rack.name} (${rack.code})`
      };
    } catch (error) {
      // Not a rack, try document
    }

    // Try to find document
    try {
      const document = await physicalDocumentService.getByBarcode(barcode);
      return {
        entity_type: 'document',
        entity: document,
        location_path: `Document: ${document.title}`
      };
    } catch (error) {
      // Not found
      throw new Error('Barcode not found in warehouse system');
    }
  },

  /**
   * Generate barcode for a warehouse entity
   */
  async generateBarcode(entityType: 'zone' | 'shelf' | 'rack', prefix?: string): Promise<string> {
    // Generate a unique barcode with entity type prefix
    const typePrefix = {
      zone: 'ZN',
      shelf: 'SH',
      rack: 'RK'
    }[entityType];

    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();

    return `${prefix || typePrefix}-${timestamp}-${random}`;
  }
};

// ==========================================
// Document Movement Services
// ==========================================
export const movementService = {
  /**
   * Move a document to a new rack
   */
  async moveDocument(documentId: string, data: DocumentMovementCreate): Promise<DocumentMovement> {
    const response = await apiClient.post(`${API_BASE}/documents/${documentId}/move?user_id=${data.user_id}`, data);
    return response.data;
  },

  /**
   * Get movement history for a specific document
   */
  async getDocumentHistory(documentId: string): Promise<DocumentMovement[]> {
    const response = await apiClient.get(`${API_BASE}/documents/${documentId}/movements`);
    return response.data;
  },

  /**
   * List all document movements
   */
  async listAll(filters?: { page?: number; page_size?: number; movement_type?: string; status?: string }): Promise<DocumentMovement[]> {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());
    if (filters?.movement_type) params.append('movement_type', filters.movement_type);
    if (filters?.status) params.append('status', filters.status);

    const response = await apiClient.get(`${API_BASE}/movements?${params.toString()}`);
    return response.data;
  },

  /**
   * Get a specific movement record
   */
  async getMovement(movementId: string): Promise<DocumentMovement> {
    const response = await apiClient.get(`${API_BASE}/movements/${movementId}`);
    return response.data;
  }
};

// ==========================================
// Print Management Services
// ==========================================
export const printService = {
  /**
   * Print labels for warehouse entities
   */
  async printLabels(data: {
    entity_ids: string[];
    entity_type: 'zone' | 'shelf' | 'rack' | 'document';
    template_id?: string;
    printer_id?: string;
    copies?: number;
    include_qr_code?: boolean;
    notes?: string;
  }): Promise<any> {
    const response = await apiClient.post(`${API_BASE}/print/labels`, data);
    return response.data;
  },

  /**
   * Batch print labels for multiple entity types
   */
  async batchPrint(data: {
    zones?: string[];
    shelves?: string[];
    racks?: string[];
    documents?: string[];
    printer_id?: string;
    copies?: number;
    notes?: string;
  }): Promise<any> {
    const response = await apiClient.post(`${API_BASE}/print/batch`, data);
    return response.data;
  },

  /**
   * Preview label data for an entity
   */
  async previewLabel(entityType: string, entityId: string): Promise<any> {
    const response = await apiClient.get(`${API_BASE}/print/labels/preview/${entityType}/${entityId}`);
    return response.data;
  },

  /**
   * List print jobs
   */
  async listJobs(filters?: { entity_type?: string; status?: string; page?: number; page_size?: number }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.entity_type) params.append('entity_type', filters.entity_type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());

    const response = await apiClient.get(`${API_BASE}/print/jobs?${params.toString()}`);
    return response.data;
  },

  /**
   * Get a specific print job
   */
  async getJob(jobId: string): Promise<any> {
    const response = await apiClient.get(`${API_BASE}/print/jobs/${jobId}`);
    return response.data;
  },

  /**
   * Update print job status
   */
  async updateJobStatus(jobId: string, status: 'queued' | 'printing' | 'completed' | 'failed' | 'cancelled'): Promise<any> {
    const response = await apiClient.patch(`${API_BASE}/print/jobs/${jobId}/status`, { status });
    return response.data;
  }
};

// ==========================================
// Navigation Services (Children/Contents)
// ==========================================
export const navigationService = {
  /**
   * Get all warehouses in a location
   */
  async getLocationWarehouses(locationId: string): Promise<Warehouse[]> {
    const response = await apiClient.get(`${API_BASE}/locations/${locationId}/warehouses`);
    return response.data;
  },

  /**
   * Get all zones in a warehouse
   */
  async getWarehouseZones(warehouseId: string): Promise<Zone[]> {
    const response = await apiClient.get(`${API_BASE}/warehouses/${warehouseId}/zones`);
    return response.data;
  },

  /**
   * Get all shelves in a zone
   */
  async getZoneShelves(zoneId: string): Promise<Shelf[]> {
    const response = await apiClient.get(`${API_BASE}/zones/${zoneId}/shelves`);
    return response.data;
  },

  /**
   * Get all racks on a shelf
   */
  async getShelfRacks(shelfId: string): Promise<Rack[]> {
    const response = await apiClient.get(`${API_BASE}/shelves/${shelfId}/racks`);
    return response.data;
  },

  /**
   * Get all documents in a rack
   */
  async getRackDocuments(rackId: string): Promise<PhysicalDocument[]> {
    const response = await apiClient.get(`${API_BASE}/racks/${rackId}/documents`);
    return response.data;
  }
};

// ==========================================
// Export all services
// ==========================================
export const warehouseServices = {
  locations: locationService,
  warehouses: warehouseService,
  zones: zoneService,
  shelves: shelfService,
  racks: rackService,
  documents: physicalDocumentService,
  customerAssignments: customerAssignmentService,
  stats: warehouseStatsService,
  barcode: warehouseBarcodeService,
  movements: movementService,
  print: printService,
  navigation: navigationService,

  // Convenience methods
  getPhysicalDocuments: () => physicalDocumentService.list(),
  getRacks: () => rackService.list(),
  getDocumentMovements: () => movementService.listAll(),
  getDocumentMovementHistory: (documentId: string) => movementService.getDocumentHistory(documentId),
  moveDocument: (documentId: string, data: DocumentMovementCreate) => movementService.moveDocument(documentId, data)
};

export default warehouseServices;

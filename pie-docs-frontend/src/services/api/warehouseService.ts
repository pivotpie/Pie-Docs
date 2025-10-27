/**
 * Warehouse Management API Service
 *
 * Handles all warehouse-related API calls including:
 * - Locations, Warehouses, Zones, Shelves, Racks
 * - Physical Documents
 * - Barcodes
 * - Document Movements
 * - Capacity Statistics
 */

import type {
  Location,
  LocationCreateRequest,
  LocationListResponse,
  Warehouse,
  WarehouseCreateRequest,
  WarehouseListResponse,
  WarehouseQueryParams,
  Zone,
  ZoneCreateRequest,
  ZoneListResponse,
  ZoneQueryParams,
  Shelf,
  ShelfCreateRequest,
  ShelfListResponse,
  ShelfQueryParams,
  Rack,
  RackCreateRequest,
  RackListResponse,
  RackQueryParams,
  PhysicalDocument,
  PhysicalDocumentCreateRequest,
  PhysicalDocumentListResponse,
  PhysicalDocumentQueryParams,
  BarcodeRecord,
  BarcodeGenerateRequest,
  BarcodeGenerateResponse,
  BarcodeListResponse,
  DocumentMovement,
  DocumentMovementCreateRequest,
  DocumentMovementListResponse,
  CapacityStats,
  CapacityStatsListResponse,
  CapacityQueryParams,
  WarehouseStats,
} from '@/types/domain/Warehouse';

// Environment configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000');

class WarehouseService {
  private baseUrl = `${API_BASE_URL}/warehouse`;

  // ============================================
  // Location Management
  // ============================================

  async getLocations(page: number = 1, pageSize: number = 50): Promise<LocationListResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/locations?page=${page}&page_size=${pageSize}`,
        {
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          signal: AbortSignal.timeout(API_TIMEOUT),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch locations: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      throw error;
    }
  }

  async getLocation(id: string): Promise<Location> {
    try {
      const response = await fetch(`${this.baseUrl}/locations/${id}`, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch location: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to fetch location ${id}:`, error);
      throw error;
    }
  }

  async createLocation(data: LocationCreateRequest): Promise<Location> {
    try {
      const response = await fetch(`${this.baseUrl}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create location: ${response.statusText} - ${error}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to create location:', error);
      throw error;
    }
  }

  // ============================================
  // Warehouse Management
  // ============================================

  async getWarehouses(params: WarehouseQueryParams = {}): Promise<WarehouseListResponse> {
    try {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.page_size) searchParams.append('page_size', params.page_size.toString());
      if (params.location_id) searchParams.append('location_id', params.location_id);
      if (params.warehouse_type) searchParams.append('warehouse_type', params.warehouse_type);
      if (params.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());

      const response = await fetch(`${this.baseUrl}/warehouses?${searchParams.toString()}`, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch warehouses: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
      throw error;
    }
  }

  async getWarehouse(id: string): Promise<Warehouse> {
    try {
      const response = await fetch(`${this.baseUrl}/warehouses/${id}`, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch warehouse: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to fetch warehouse ${id}:`, error);
      throw error;
    }
  }

  async createWarehouse(data: WarehouseCreateRequest): Promise<Warehouse> {
    try {
      const response = await fetch(`${this.baseUrl}/warehouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create warehouse: ${response.statusText} - ${error}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to create warehouse:', error);
      throw error;
    }
  }

  // ============================================
  // Zone Management
  // ============================================

  async getZones(params: ZoneQueryParams = {}): Promise<ZoneListResponse> {
    try {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.page_size) searchParams.append('page_size', params.page_size.toString());
      if (params.warehouse_id) searchParams.append('warehouse_id', params.warehouse_id);
      if (params.zone_type) searchParams.append('zone_type', params.zone_type);
      if (params.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());

      const response = await fetch(`${this.baseUrl}/zones?${searchParams.toString()}`, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch zones: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to fetch zones:', error);
      throw error;
    }
  }

  async getZone(id: string): Promise<Zone> {
    try {
      const response = await fetch(`${this.baseUrl}/zones/${id}`, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch zone: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to fetch zone ${id}:`, error);
      throw error;
    }
  }

  async createZone(data: ZoneCreateRequest): Promise<Zone> {
    try {
      const response = await fetch(`${this.baseUrl}/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create zone: ${response.statusText} - ${error}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to create zone:', error);
      throw error;
    }
  }

  // ============================================
  // Shelf Management
  // ============================================

  async getShelves(params: ShelfQueryParams = {}): Promise<ShelfListResponse> {
    try {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.page_size) searchParams.append('page_size', params.page_size.toString());
      if (params.zone_id) searchParams.append('zone_id', params.zone_id);
      if (params.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());

      const response = await fetch(`${this.baseUrl}/shelves?${searchParams.toString()}`, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch shelves: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to fetch shelves:', error);
      throw error;
    }
  }

  async getShelf(id: string): Promise<Shelf> {
    try {
      const response = await fetch(`${this.baseUrl}/shelves/${id}`, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch shelf: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to fetch shelf ${id}:`, error);
      throw error;
    }
  }

  async createShelf(data: ShelfCreateRequest): Promise<Shelf> {
    try {
      const response = await fetch(`${this.baseUrl}/shelves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create shelf: ${response.statusText} - ${error}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to create shelf:', error);
      throw error;
    }
  }

  // ============================================
  // Rack Management
  // ============================================

  async getRacks(params: RackQueryParams = {}): Promise<RackListResponse> {
    try {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.page_size) searchParams.append('page_size', params.page_size.toString());
      if (params.shelf_id) searchParams.append('shelf_id', params.shelf_id);
      if (params.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());

      const response = await fetch(`${this.baseUrl}/racks?${searchParams.toString()}`, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch racks: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to fetch racks:', error);
      throw error;
    }
  }

  async getRack(id: string): Promise<Rack> {
    try {
      const response = await fetch(`${this.baseUrl}/racks/${id}`, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch rack: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to fetch rack ${id}:`, error);
      throw error;
    }
  }

  async createRack(data: RackCreateRequest): Promise<Rack> {
    try {
      const response = await fetch(`${this.baseUrl}/racks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create rack: ${response.statusText} - ${error}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to create rack:', error);
      throw error;
    }
  }

  // ============================================
  // Physical Document Management
  // ============================================

  async getPhysicalDocuments(params: PhysicalDocumentQueryParams = {}): Promise<PhysicalDocumentListResponse> {
    try {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.page_size) searchParams.append('page_size', params.page_size.toString());
      if (params.rack_id) searchParams.append('rack_id', params.rack_id);
      if (params.digital_document_id) searchParams.append('digital_document_id', params.digital_document_id);
      if (params.barcode_id) searchParams.append('barcode_id', params.barcode_id);
      if (params.document_type) searchParams.append('document_type', params.document_type);
      if (params.physical_format) searchParams.append('physical_format', params.physical_format);
      if (params.condition) searchParams.append('condition', params.condition);
      if (params.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());

      const response = await fetch(`${this.baseUrl}/documents?${searchParams.toString()}`, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch physical documents: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to fetch physical documents:', error);
      throw error;
    }
  }

  async getPhysicalDocument(id: string): Promise<PhysicalDocument> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${id}`, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch physical document: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to fetch physical document ${id}:`, error);
      throw error;
    }
  }

  async getPhysicalDocumentByDigitalId(digitalId: string): Promise<PhysicalDocument> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/digital/${digitalId}`, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch physical document by digital ID: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to fetch physical document for digital ID ${digitalId}:`, error);
      throw error;
    }
  }

  async getPhysicalDocumentByBarcode(barcode: string): Promise<PhysicalDocument> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/barcode/${barcode}`, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch physical document by barcode: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to fetch physical document for barcode ${barcode}:`, error);
      throw error;
    }
  }

  async createPhysicalDocument(data: PhysicalDocumentCreateRequest): Promise<PhysicalDocument> {
    try {
      const response = await fetch(`${this.baseUrl}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create physical document: ${response.statusText} - ${error}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to create physical document:', error);
      throw error;
    }
  }

  // ============================================
  // Barcode Management
  // ============================================

  async getBarcodes(page: number = 1, pageSize: number = 50): Promise<BarcodeListResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/physical/barcodes?page=${page}&page_size=${pageSize}`,
        {
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          signal: AbortSignal.timeout(API_TIMEOUT),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch barcodes: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to fetch barcodes:', error);
      throw error;
    }
  }

  async generateBarcodes(data: BarcodeGenerateRequest): Promise<BarcodeGenerateResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/physical/barcodes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to generate barcodes: ${response.statusText} - ${error}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to generate barcodes:', error);
      throw error;
    }
  }

  // ============================================
  // Document Movement Management
  // ============================================

  async getMovements(page: number = 1, pageSize: number = 50): Promise<DocumentMovementListResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/movements?page=${page}&page_size=${pageSize}`,
        {
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          signal: AbortSignal.timeout(API_TIMEOUT),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch movements: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to fetch movements:', error);
      throw error;
    }
  }

  async getDocumentMovements(documentId: string): Promise<DocumentMovement[]> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${documentId}/movements`, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch document movements: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to fetch movements for document ${documentId}:`, error);
      throw error;
    }
  }

  async createMovement(data: DocumentMovementCreateRequest): Promise<DocumentMovement> {
    try {
      const response = await fetch(`${this.baseUrl}/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create movement: ${response.statusText} - ${error}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to create movement:', error);
      throw error;
    }
  }

  // ============================================
  // Capacity and Statistics
  // ============================================

  async getCapacityStats(params: CapacityQueryParams): Promise<CapacityStatsListResponse> {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('entity_type', params.entity_type);
      if (params.entity_id) searchParams.append('entity_id', params.entity_id);
      if (params.status) searchParams.append('status', params.status);

      const response = await fetch(`${this.baseUrl}/stats/capacity?${searchParams.toString()}`, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch capacity stats: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to fetch capacity stats:', error);
      throw error;
    }
  }

  async getWarehouseStats(): Promise<WarehouseStats> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch warehouse stats: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to fetch warehouse stats:', error);
      throw error;
    }
  }

  // ============================================
  // Hierarchy Navigation
  // ============================================

  async getLocationHierarchy(locationId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/locations/${locationId}/hierarchy`, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch location hierarchy: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to fetch hierarchy for location ${locationId}:`, error);
      throw error;
    }
  }

  async getWarehouseHierarchy(warehouseId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/warehouses/${warehouseId}/hierarchy`, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch warehouse hierarchy: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to fetch hierarchy for warehouse ${warehouseId}:`, error);
      throw error;
    }
  }
}

export const warehouseService = new WarehouseService();
export default warehouseService;

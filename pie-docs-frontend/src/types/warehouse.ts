/**
 * Warehouse Management System Types
 * Physical Twin for Digital Documents Archiving System
 * Hierarchy: Location → Warehouse → Zone → Shelf → Rack → Document
 */

export type WarehouseEntityStatus = 'active' | 'inactive' | 'maintenance' | 'decommissioned';
export type BarcodeStatus = 'generated' | 'printed' | 'assigned' | 'scanned' | 'damaged' | 'lost';

// ==========================================
// Location (Top Level)
// ==========================================
export interface Location {
  id: string;
  code: string; // Unique identifier (e.g., "LOC-DXB-001")
  name: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postal_code?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  contact: {
    manager: string;
    phone: string;
    email: string;
  };
  timezone: string;
  status: WarehouseEntityStatus;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface LocationCreate {
  code: string;
  name: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postal_code?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  contact: {
    manager: string;
    phone: string;
    email: string;
  };
  timezone: string;
  metadata?: Record<string, any>;
}

export interface LocationUpdate {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  contact?: {
    manager: string;
    phone: string;
    email: string;
  };
  timezone?: string;
  status?: WarehouseEntityStatus;
  metadata?: Record<string, any>;
}

// ==========================================
// Warehouse
// ==========================================
export interface Warehouse {
  id: string;
  location_id: string;
  code: string; // Unique identifier (e.g., "WH-DXBJA-001")
  barcode?: string; // Optional barcode
  name: string;
  description?: string;
  warehouse_type: 'standard' | 'climate_controlled' | 'secure' | 'mixed';
  total_area: number; // in square meters
  operational_hours: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };
  contact: {
    supervisor: string;
    phone: string;
    email: string;
  };
  status: WarehouseEntityStatus;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface WarehouseCreate {
  location_id: string;
  code: string;
  barcode?: string;
  name: string;
  description?: string;
  warehouse_type: 'standard' | 'climate_controlled' | 'secure' | 'mixed';
  total_area: number;
  operational_hours?: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };
  contact: {
    supervisor: string;
    phone: string;
    email: string;
  };
  metadata?: Record<string, any>;
}

export interface WarehouseUpdate {
  code?: string;
  barcode?: string;
  name?: string;
  description?: string;
  warehouse_type?: 'standard' | 'climate_controlled' | 'secure' | 'mixed';
  total_area?: number;
  operational_hours?: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };
  contact?: {
    supervisor: string;
    phone: string;
    email: string;
  };
  status?: WarehouseEntityStatus;
  metadata?: Record<string, any>;
}

// ==========================================
// Zone
// ==========================================
export interface Zone {
  id: string;
  warehouse_id: string;
  code: string; // Unique identifier (e.g., "ZN-A-001")
  barcode: string; // Required barcode for tracking
  barcode_status: BarcodeStatus;
  name: string;
  description?: string;
  zone_type: 'storage' | 'receiving' | 'dispatch' | 'processing' | 'archive';
  area: number; // in square meters
  max_capacity: number; // maximum number of shelves
  current_capacity: number; // current number of shelves
  environmental_control: {
    temperature_min?: number;
    temperature_max?: number;
    humidity_min?: number;
    humidity_max?: number;
    monitoring_enabled: boolean;
  };
  access_level: 1 | 2 | 3 | 4 | 5; // Security access level
  status: WarehouseEntityStatus;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface ZoneCreate {
  warehouse_id: string;
  code: string;
  barcode: string;
  name: string;
  description?: string;
  zone_type: 'storage' | 'receiving' | 'dispatch' | 'processing' | 'archive';
  area: number;
  max_capacity: number;
  environmental_control?: {
    temperature_min?: number;
    temperature_max?: number;
    humidity_min?: number;
    humidity_max?: number;
    monitoring_enabled: boolean;
  };
  access_level: 1 | 2 | 3 | 4 | 5;
  metadata?: Record<string, any>;
}

export interface ZoneUpdate {
  code?: string;
  barcode?: string;
  barcode_status?: BarcodeStatus;
  name?: string;
  description?: string;
  zone_type?: 'storage' | 'receiving' | 'dispatch' | 'processing' | 'archive';
  area?: number;
  max_capacity?: number;
  environmental_control?: {
    temperature_min?: number;
    temperature_max?: number;
    humidity_min?: number;
    humidity_max?: number;
    monitoring_enabled: boolean;
  };
  access_level?: 1 | 2 | 3 | 4 | 5;
  status?: WarehouseEntityStatus;
  metadata?: Record<string, any>;
}

// ==========================================
// Shelf
// ==========================================
export interface Shelf {
  id: string;
  zone_id: string;
  code: string; // Unique identifier (e.g., "SH-A-001")
  barcode: string; // Required barcode for tracking
  barcode_status: BarcodeStatus;
  name: string;
  description?: string;
  shelf_type: 'standard' | 'heavy_duty' | 'mobile' | 'compact' | 'archive';
  dimensions: {
    width: number; // in cm
    depth: number; // in cm
    height: number; // in cm
  };
  weight_capacity: number; // in kg
  max_racks: number; // maximum number of racks
  current_racks: number; // current number of racks
  position: {
    row: string; // e.g., "A", "B", "C"
    column: number; // e.g., 1, 2, 3
    level: number; // e.g., 1 (ground), 2 (second level)
  };
  status: WarehouseEntityStatus;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface ShelfCreate {
  zone_id: string;
  code: string;
  barcode: string;
  name: string;
  description?: string;
  shelf_type: 'standard' | 'heavy_duty' | 'mobile' | 'compact' | 'archive';
  dimensions: {
    width: number;
    depth: number;
    height: number;
  };
  weight_capacity: number;
  max_racks: number;
  position: {
    row: string;
    column: number;
    level: number;
  };
  metadata?: Record<string, any>;
}

export interface ShelfUpdate {
  code?: string;
  barcode?: string;
  barcode_status?: BarcodeStatus;
  name?: string;
  description?: string;
  shelf_type?: 'standard' | 'heavy_duty' | 'mobile' | 'compact' | 'archive';
  dimensions?: {
    width: number;
    depth: number;
    height: number;
  };
  weight_capacity?: number;
  max_racks?: number;
  position?: {
    row: string;
    column: number;
    level: number;
  };
  status?: WarehouseEntityStatus;
  metadata?: Record<string, any>;
}

// ==========================================
// Rack
// ==========================================
export interface Rack {
  id: string;
  shelf_id: string;
  code: string; // Unique identifier (e.g., "RK-A-001")
  barcode: string; // Required barcode for tracking
  barcode_status: BarcodeStatus;
  name: string;
  description?: string;
  rack_type: 'box' | 'folder' | 'drawer' | 'tray' | 'bin';
  dimensions: {
    width: number; // in cm
    depth: number; // in cm
    height: number; // in cm
  };
  weight_capacity: number; // in kg
  max_documents: number;
  current_documents: number;
  position: string; // position on shelf (e.g., "A1", "B2")
  customer_id?: string; // if assigned to a specific customer
  assignment_type: 'general' | 'customer_dedicated' | 'document_specific';
  status: WarehouseEntityStatus;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface RackCreate {
  shelf_id: string;
  code: string;
  barcode: string;
  name: string;
  description?: string;
  rack_type: 'box' | 'folder' | 'drawer' | 'tray' | 'bin';
  dimensions: {
    width: number;
    depth: number;
    height: number;
  };
  weight_capacity: number;
  max_documents: number;
  position: string;
  customer_id?: string;
  assignment_type: 'general' | 'customer_dedicated' | 'document_specific';
  metadata?: Record<string, any>;
}

export interface RackUpdate {
  code?: string;
  barcode?: string;
  barcode_status?: BarcodeStatus;
  name?: string;
  description?: string;
  rack_type?: 'box' | 'folder' | 'drawer' | 'tray' | 'bin';
  dimensions?: {
    width: number;
    depth: number;
    height: number;
  };
  weight_capacity?: number;
  max_documents?: number;
  position?: string;
  customer_id?: string;
  assignment_type?: 'general' | 'customer_dedicated' | 'document_specific';
  status?: WarehouseEntityStatus;
  metadata?: Record<string, any>;
}

// ==========================================
// Physical Document
// ==========================================
export interface PhysicalDocument {
  id: string;
  digital_document_id: string; // Link to digital document system
  rack_id: string;
  barcode: string; // Required barcode for tracking
  barcode_status: BarcodeStatus;
  document_type: 'original' | 'copy' | 'certified_copy' | 'archive';
  document_category: string; // e.g., "contract", "invoice", "legal", etc.
  title: string;
  description?: string;
  physical_condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  conservation_priority: 'low' | 'medium' | 'high' | 'critical';
  storage_requirements: {
    temperature_controlled: boolean;
    humidity_controlled: boolean;
    light_sensitive: boolean;
    special_handling: boolean;
  };
  customer_id?: string;
  assignment_date: string;
  assigned_by: string;
  retrieval_count: number;
  last_accessed?: string;
  last_accessed_by?: string;
  status: 'stored' | 'retrieved' | 'in_transit' | 'missing' | 'destroyed';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface PhysicalDocumentCreate {
  digital_document_id: string;
  rack_id: string;
  barcode: string;
  document_type: 'original' | 'copy' | 'certified_copy' | 'archive';
  document_category: string;
  title: string;
  description?: string;
  physical_condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  conservation_priority?: 'low' | 'medium' | 'high' | 'critical';
  storage_requirements?: {
    temperature_controlled: boolean;
    humidity_controlled: boolean;
    light_sensitive: boolean;
    special_handling: boolean;
  };
  customer_id?: string;
  metadata?: Record<string, any>;
}

export interface PhysicalDocumentUpdate {
  rack_id?: string;
  barcode?: string;
  barcode_status?: BarcodeStatus;
  document_type?: 'original' | 'copy' | 'certified_copy' | 'archive';
  document_category?: string;
  title?: string;
  description?: string;
  physical_condition?: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  conservation_priority?: 'low' | 'medium' | 'high' | 'critical';
  storage_requirements?: {
    temperature_controlled: boolean;
    humidity_controlled: boolean;
    light_sensitive: boolean;
    special_handling: boolean;
  };
  customer_id?: string;
  status?: 'stored' | 'retrieved' | 'in_transit' | 'missing' | 'destroyed';
  metadata?: Record<string, any>;
}

// ==========================================
// Hierarchy and Navigation
// ==========================================
export interface WarehouseHierarchy {
  location: Location;
  warehouses: (Warehouse & {
    zones: (Zone & {
      shelves: (Shelf & {
        racks: (Rack & {
          documents: PhysicalDocument[];
        })[];
      })[];
    })[];
  })[];
}

export interface BreadcrumbPath {
  location?: { id: string; name: string };
  warehouse?: { id: string; name: string };
  zone?: { id: string; name: string };
  shelf?: { id: string; name: string };
  rack?: { id: string; name: string };
}

export interface EntityCounts {
  locations: number;
  warehouses: number;
  zones: number;
  shelves: number;
  racks: number;
  documents: number;
}

// ==========================================
// Capacity and Utilization
// ==========================================
export interface CapacityStats {
  entity_type: 'zone' | 'shelf' | 'rack';
  entity_id: string;
  entity_name: string;
  max_capacity: number;
  current_capacity: number;
  utilization_percentage: number;
  available_capacity: number;
  status: 'low' | 'normal' | 'high' | 'full' | 'over_capacity';
}

// ==========================================
// Movement and Tracking
// ==========================================
export interface DocumentMovement {
  id: string;
  document_id: string;
  from_rack_id?: string;
  to_rack_id: string;
  from_location_path?: string;
  to_location_path: string;
  movement_type: 'initial_storage' | 'relocation' | 'retrieval' | 'return';
  reason?: string;
  requested_by: string;
  requested_at: string;
  executed_by?: string;
  executed_at?: string;
  verified_by?: string;
  verified_at?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  notes?: string;
  metadata: Record<string, any>;
}

export interface DocumentMovementCreate {
  document_id: string;
  from_rack_id?: string;
  to_rack_id: string;
  movement_type: 'initial_storage' | 'relocation' | 'retrieval' | 'return';
  reason?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

// ==========================================
// Customer Rack Assignment
// ==========================================
export interface CustomerRackAssignment {
  id: string;
  customer_id: string;
  customer_name: string;
  rack_id: string;
  rack_code: string;
  assignment_type: 'permanent' | 'temporary' | 'contract';
  start_date: string;
  end_date?: string;
  billing_cycle: 'monthly' | 'quarterly' | 'yearly' | 'one_time';
  rate?: number;
  currency?: string;
  status: 'active' | 'expired' | 'terminated' | 'suspended';
  notes?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface CustomerRackAssignmentCreate {
  customer_id: string;
  customer_name: string;
  rack_id: string;
  assignment_type: 'permanent' | 'temporary' | 'contract';
  start_date: string;
  end_date?: string;
  billing_cycle: 'monthly' | 'quarterly' | 'yearly' | 'one_time';
  rate?: number;
  currency?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

// ==========================================
// Search and Filters
// ==========================================
export interface WarehouseSearchFilters {
  location_id?: string;
  warehouse_id?: string;
  zone_id?: string;
  shelf_id?: string;
  rack_id?: string;
  status?: WarehouseEntityStatus;
  barcode?: string;
  code?: string;
  search_query?: string;
}

// ==========================================
// API Response Types
// ==========================================
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

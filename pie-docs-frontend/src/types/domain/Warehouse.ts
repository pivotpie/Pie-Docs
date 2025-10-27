/**
 * Warehouse Management Types
 *
 * Types for the new warehouse system that replaces the old location hierarchy.
 * Hierarchy: Location → Warehouse → Zone → Shelf → Rack → Physical Document
 */

// ============================================
// Core Entity Types
// ============================================

export interface Location {
  id: string;
  name: string;
  code: string;
  address: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  location_id: string;
  name: string;
  code: string;
  description?: string;
  warehouse_type: 'general' | 'secure' | 'climate_controlled' | 'archive';
  max_capacity: number;
  current_capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Zone {
  id: string;
  warehouse_id: string;
  name: string;
  code: string;
  description?: string;
  zone_type: 'standard' | 'secure' | 'climate_controlled' | 'high_density';
  max_capacity: number;
  current_capacity: number;
  temperature_min?: number;
  temperature_max?: number;
  humidity_min?: number;
  humidity_max?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Shelf {
  id: string;
  zone_id: string;
  name: string;
  code: string;
  description?: string;
  shelf_level: number;
  max_racks: number;
  current_racks: number;
  weight_capacity?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Rack {
  id: string;
  shelf_id: string;
  name: string;
  code: string;
  description?: string;
  position: number;
  max_documents: number;
  current_documents: number;
  width?: number;
  height?: number;
  depth?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PhysicalDocument {
  id: string;
  digital_document_id: string | null;
  barcode_id: string | null;
  rack_id: string | null;
  document_type: string;
  title: string;
  description?: string;
  physical_format: 'paper' | 'microfilm' | 'microfiche' | 'photo' | 'other';
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  dimensions?: {
    width: number;
    height: number;
    depth?: number;
  };
  weight?: number;
  storage_requirements?: {
    temperature_range?: [number, number];
    humidity_range?: [number, number];
    light_sensitive?: boolean;
  };
  preservation_notes?: string;
  metadata?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// Barcode Types
// ============================================

export interface BarcodeFormat {
  id: string;
  name: string;
  format_type: 'CODE128' | 'QR' | 'CODE39' | 'EAN13' | 'DATAMATRIX';
  prefix?: string;
  length?: number;
  validation_pattern?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BarcodeRecord {
  id: string;
  code: string;
  format_id: string;
  document_id: string | null;
  is_active: boolean;
  checksum?: string;
  generated_at: string;
  printed_at?: string;
  assigned_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Barcode {
  id: string;
  document_id: string | null;
  barcode_type: 'CODE128' | 'QR' | 'CODE39' | 'EAN13' | 'DATAMATRIX';
  barcode_value: string;
  generated_at: string;
  printed_at?: string;
  verified_at?: string;
  is_active: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================
// Movement Types
// ============================================

export interface DocumentMovement {
  id: string;
  document_id: string;
  from_rack_id: string | null;
  to_rack_id: string | null;
  movement_type: 'incoming' | 'outgoing' | 'transfer' | 'inventory';
  requested_by: string;
  approved_by?: string;
  performed_by?: string;
  requested_at: string;
  approved_at?: string;
  completed_at?: string;
  expected_return_date?: string;
  actual_return_date?: string;
  reason?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// ============================================
// Capacity and Stats Types
// ============================================

export interface CapacityStats {
  entity_type: 'rack' | 'shelf' | 'zone' | 'warehouse' | 'location';
  entity_id: string;
  entity_name: string;
  entity_code: string;
  max_capacity: number;
  current_capacity: number;
  available_capacity: number;
  utilization_percentage: number;
  status: 'available' | 'near_full' | 'full' | 'over_capacity';
}

export interface WarehouseStats {
  total_locations: number;
  total_warehouses: number;
  total_zones: number;
  total_shelves: number;
  total_racks: number;
  total_physical_documents: number;
  total_capacity: number;
  used_capacity: number;
  available_capacity: number;
  overall_utilization: number;
}

// ============================================
// OCR Types
// ============================================

export interface OCRJob {
  id: string;
  document_id: string;
  language: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OCRResult {
  id: string;
  job_id: string;
  document_id: string;
  extracted_text: string;
  confidence: number;
  page_count: number;
  word_count: number;
  language_detected?: string;
  created_at: string;
}

export interface DocumentOCRResponse {
  document_id: string;
  has_ocr: boolean;
  job_id?: string;
  language?: string;
  job_status: 'not_started' | 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  job_created_at?: string;
  result_id?: string;
  extracted_text?: string;
  confidence?: number;
  page_count?: number;
  word_count?: number;
  result_created_at?: string;
}

// ============================================
// Document Event Types
// ============================================

export type DocumentEventType =
  | 'document_created'
  | 'version_created'
  | 'physical_movement'
  | 'comment_added'
  | 'metadata_updated'
  | 'status_changed'
  | 'barcode_assigned'
  | 'location_changed';

export interface DocumentEvent {
  event_id: string;
  event_type: DocumentEventType;
  description: string;
  performed_by: string;
  event_time: string;
  details?: string;
}

export interface DocumentEventsResponse {
  document_id: string;
  events: DocumentEvent[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ============================================
// API Request/Response Types
// ============================================

export interface LocationCreateRequest {
  name: string;
  code: string;
  address: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  description?: string;
}

export interface WarehouseCreateRequest {
  location_id: string;
  name: string;
  code: string;
  description?: string;
  warehouse_type: 'general' | 'secure' | 'climate_controlled' | 'archive';
  max_capacity: number;
}

export interface ZoneCreateRequest {
  warehouse_id: string;
  name: string;
  code: string;
  description?: string;
  zone_type: 'standard' | 'secure' | 'climate_controlled' | 'high_density';
  max_capacity: number;
  temperature_min?: number;
  temperature_max?: number;
  humidity_min?: number;
  humidity_max?: number;
}

export interface ShelfCreateRequest {
  zone_id: string;
  name: string;
  code: string;
  description?: string;
  shelf_level: number;
  max_racks: number;
  weight_capacity?: number;
}

export interface RackCreateRequest {
  shelf_id: string;
  name: string;
  code: string;
  description?: string;
  position: number;
  max_documents: number;
  width?: number;
  height?: number;
  depth?: number;
}

export interface PhysicalDocumentCreateRequest {
  digital_document_id?: string;
  barcode_id?: string;
  rack_id?: string;
  document_type: string;
  title: string;
  description?: string;
  physical_format: 'paper' | 'microfilm' | 'microfiche' | 'photo' | 'other';
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  dimensions?: {
    width: number;
    height: number;
    depth?: number;
  };
  weight?: number;
  storage_requirements?: {
    temperature_range?: [number, number];
    humidity_range?: [number, number];
    light_sensitive?: boolean;
  };
  preservation_notes?: string;
  metadata?: Record<string, unknown>;
}

export interface BarcodeGenerateRequest {
  format_id: string;
  document_id?: string;
  quantity?: number;
}

export interface BarcodeGenerateResponse {
  barcodes: BarcodeRecord[];
  total_generated: number;
}

export interface DocumentMovementCreateRequest {
  document_id: string;
  from_rack_id?: string;
  to_rack_id?: string;
  movement_type: 'incoming' | 'outgoing' | 'transfer' | 'inventory';
  requested_by: string;
  expected_return_date?: string;
  reason?: string;
  notes?: string;
}

// ============================================
// List Response Types
// ============================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export type LocationListResponse = PaginatedResponse<Location>;
export type WarehouseListResponse = PaginatedResponse<Warehouse>;
export type ZoneListResponse = PaginatedResponse<Zone>;
export type ShelfListResponse = PaginatedResponse<Shelf>;
export type RackListResponse = PaginatedResponse<Rack>;
export type PhysicalDocumentListResponse = PaginatedResponse<PhysicalDocument>;
export type DocumentMovementListResponse = PaginatedResponse<DocumentMovement>;
export type BarcodeListResponse = PaginatedResponse<BarcodeRecord>;
export type CapacityStatsListResponse = PaginatedResponse<CapacityStats>;

// ============================================
// Query Parameter Types
// ============================================

export interface WarehouseQueryParams {
  page?: number;
  page_size?: number;
  location_id?: string;
  warehouse_type?: string;
  is_active?: boolean;
}

export interface ZoneQueryParams {
  page?: number;
  page_size?: number;
  warehouse_id?: string;
  zone_type?: string;
  is_active?: boolean;
}

export interface ShelfQueryParams {
  page?: number;
  page_size?: number;
  zone_id?: string;
  is_active?: boolean;
}

export interface RackQueryParams {
  page?: number;
  page_size?: number;
  shelf_id?: string;
  is_active?: boolean;
}

export interface PhysicalDocumentQueryParams {
  page?: number;
  page_size?: number;
  rack_id?: string;
  digital_document_id?: string;
  barcode_id?: string;
  document_type?: string;
  physical_format?: string;
  condition?: string;
  is_active?: boolean;
}

export interface CapacityQueryParams {
  entity_type: 'rack' | 'shelf' | 'zone' | 'warehouse' | 'location';
  entity_id?: string;
  status?: 'available' | 'near_full' | 'full' | 'over_capacity';
}

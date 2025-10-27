// Location tracking types for physical document management system
export type LocationType = 'building' | 'floor' | 'room' | 'cabinet' | 'shelf';
export type RoomType = 'archive' | 'office' | 'storage' | 'secure' | 'climate_controlled';
export type LockType = 'none' | 'key' | 'digital' | 'biometric' | 'combination';

// Base location interface with common properties
export interface BaseLocation {
  id: string;
  name: string;
  description?: string;
  type: LocationType;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
}

// Capacity configuration for storage locations
export interface CapacityConfig {
  maxDocuments: number;
  maxWeight?: number; // in kg
  maxVolume?: number; // in cubic meters
  alertThreshold: number; // percentage (0-100)
  criticalThreshold: number; // percentage (0-100)
}

// Environmental monitoring configuration
export interface EnvironmentalConfig {
  temperatureMin: number; // Celsius
  temperatureMax: number; // Celsius
  humidityMin: number; // percentage
  humidityMax: number; // percentage
  lightLevel?: number; // lux
  airQuality?: number; // AQI
  monitoringEnabled: boolean;
}

// Building location type
export interface Building extends BaseLocation {
  type: 'building';
  address: string;
  floors: Floor[];
  capacity: CapacityConfig;
  environmental: EnvironmentalConfig;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  contactInfo?: {
    manager: string;
    phone: string;
    email: string;
  };
}

// Floor plan configuration
export interface FloorPlan {
  id: string;
  imageUrl?: string;
  svgData?: string;
  width: number;
  height: number;
  scale: number; // pixels per meter
  rooms: RoomPosition[];
}

export interface RoomPosition {
  roomId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

// Floor location type
export interface Floor extends BaseLocation {
  type: 'floor';
  level: number;
  buildingId: string;
  floorPlan?: FloorPlan;
  rooms: Room[];
  totalArea?: number; // square meters
  accessRestricted?: boolean;
}

// Room location type
export interface Room extends BaseLocation {
  type: 'room';
  floorId: string;
  roomType: RoomType;
  cabinets: Cabinet[];
  environmental: EnvironmentalReading;
  area?: number; // square meters
  accessCode?: string;
  securityLevel: number; // 1-5 scale
}

// Cabinet location type
export interface Cabinet extends BaseLocation {
  type: 'cabinet';
  roomId: string;
  capacity: CapacityConfig;
  shelves: Shelf[];
  lockType: LockType;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installDate?: string;
}

// Shelf location type (lowest level)
export interface Shelf extends BaseLocation {
  type: 'shelf';
  cabinetId: string;
  position: number; // shelf number from top/bottom
  documents: DocumentLocation[];
  capacity: CapacityConfig;
  currentUtilization: number; // 0-100 percentage
  weight?: number; // current weight in kg
  lastInventory?: string; // ISO date
}

// Document location association
export interface DocumentLocation {
  documentId: string;
  barcode: string;
  position?: string; // position on shelf (e.g., "A1", "B3")
  placedAt: string; // ISO date
  placedBy: string; // user ID
  status: 'active' | 'misplaced' | 'moved' | 'missing';
  lastSeen?: string; // ISO date of last scan/verification
}

// Location hierarchy structure
export interface LocationHierarchy {
  buildings: Building[];
  flatMap: Record<string, LocationRecord>; // for quick lookups
  totalLocations: number;
  lastUpdated: string;
}

// Union type for all location types
export type LocationRecord = Building | Floor | Room | Cabinet | Shelf;

// Capacity utilization data
export interface CapacityUtilization {
  locationId: string;
  locationName: string;
  locationType: LocationType;
  currentDocuments: number;
  maxCapacity: number;
  utilizationPercentage: number;
  weight?: {
    current: number;
    maximum: number;
  };
  volume?: {
    current: number;
    maximum: number;
  };
  lastUpdated: string;
  trend: 'increasing' | 'decreasing' | 'stable';
}

// Capacity alerts
export interface CapacityAlert {
  id: string;
  locationId: string;
  locationName: string;
  alertType: 'warning' | 'critical' | 'overflow';
  threshold: number;
  currentUtilization: number;
  message: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolved: boolean;
}

// Environmental monitoring
export interface EnvironmentalReading {
  locationId: string;
  timestamp: string;
  temperature: number; // Celsius
  humidity: number; // percentage
  lightLevel?: number; // lux
  airQuality?: number; // AQI
  pressure?: number; // hPa
  status: 'normal' | 'warning' | 'critical';
}

export interface EnvironmentalAlert {
  id: string;
  locationId: string;
  locationName: string;
  parameter: 'temperature' | 'humidity' | 'light' | 'air_quality' | 'pressure';
  currentValue: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
  createdAt: string;
  resolvedAt?: string;
}

// Movement tracking
export interface MovementRecord {
  id: string;
  documentId: string;
  barcode: string;
  fromLocationId: string;
  toLocationId: string;
  fromLocationName: string;
  toLocationName: string;
  movedAt: string;
  movedBy: string; // user ID
  reason?: string;
  method: 'barcode_scan' | 'manual_entry' | 'bulk_operation' | 'system_automated';
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface PendingMovement {
  id: string;
  documentId: string;
  barcode: string;
  targetLocationId: string;
  targetLocationName: string;
  requestedBy: string;
  requestedAt: string;
  reason?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  estimatedCompletion?: string;
  assignedTo?: string;
}

export interface MovementAudit {
  id: string;
  movementId: string;
  action: 'created' | 'modified' | 'cancelled' | 'completed' | 'verified';
  performedBy: string;
  performedAt: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// Bulk operations
export interface BulkMovementOperation {
  id: string;
  name: string;
  description?: string;
  documentIds: string[];
  targetLocationId: string;
  targetLocationName: string;
  createdBy: string;
  createdAt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
  };
  startedAt?: string;
  completedAt?: string;
  errors: BulkMovementError[];
}

export interface BulkMovementError {
  documentId: string;
  barcode: string;
  error: string;
  timestamp: string;
}

// Inventory management
export interface InventorySnapshot {
  id: string;
  locationId?: string; // if null, system-wide inventory
  locationName?: string;
  createdAt: string;
  createdBy: string;
  status: 'in_progress' | 'completed' | 'failed';
  totalDocuments: number;
  verifiedDocuments: number;
  missingDocuments: number;
  unexpectedDocuments: number;
  discrepancies: InventoryDiscrepancy[];
}

export interface InventoryDiscrepancy {
  id: string;
  type: 'missing' | 'unexpected' | 'misplaced' | 'damaged';
  documentId: string;
  barcode: string;
  expectedLocationId?: string;
  actualLocationId?: string;
  expectedLocationName?: string;
  actualLocationName?: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  discoveredAt: string;
  discoveredBy: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

export interface InventoryReport {
  id: string;
  title: string;
  type: 'scheduled' | 'on_demand' | 'audit';
  locationScope: 'system_wide' | 'building' | 'floor' | 'room' | 'cabinet';
  locationId?: string;
  generatedAt: string;
  generatedBy: string;
  reportData: InventorySnapshot;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  fileUrl?: string;
  expiresAt?: string;
}

export interface ReportSchedule {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  locationScope: 'system_wide' | 'building' | 'floor' | 'room';
  locationId?: string;
  schedule: string; // cron expression
  enabled: boolean;
  lastRun?: string;
  nextRun: string;
  reportFormat: 'pdf' | 'excel' | 'csv';
  emailRecipients: string[];
  createdBy: string;
  createdAt: string;
}

// Optimization and analytics
export interface AccessPattern {
  documentId: string;
  barcode: string;
  locationId: string;
  accessCount: number;
  lastAccessed: string;
  avgAccessFrequency: number; // accesses per day
  timePatterns: {
    hourly: number[]; // 24 elements
    daily: number[]; // 7 elements (Mon-Sun)
    monthly: number[]; // 12 elements
  };
  userPatterns: {
    userId: string;
    accessCount: number;
    avgDuration: number; // minutes
  }[];
}

export interface PlacementRecommendation {
  id: string;
  documentId: string;
  barcode: string;
  currentLocationId: string;
  recommendedLocationId: string;
  currentLocationName: string;
  recommendedLocationName: string;
  reason: string;
  benefits: string[];
  estimatedSavings: {
    timeMinutes: number;
    distanceMeters: number;
    costDollars: number;
  };
  confidence: number; // 0-100 percentage
  generatedAt: string;
  validUntil: string;
  implemented: boolean;
  implementedAt?: string;
}

// Search and filtering
export interface LocationSearchCriteria {
  query?: string;
  type?: LocationType;
  buildingId?: string;
  floorId?: string;
  roomId?: string;
  cabinetId?: string;
  hasCapacity?: boolean;
  capacityThreshold?: number;
  environmentalStatus?: 'normal' | 'warning' | 'critical';
  accessLevel?: number;
  tags?: string[];
}

export interface LocationSearchResult {
  location: LocationRecord;
  path: string; // "Building A > Floor 2 > Room 201 > Cabinet 3 > Shelf 2"
  relevanceScore: number;
  availableCapacity?: number;
  documentCount: number;
}

// Map interactions
export interface MapInteraction {
  id: string;
  type: 'click' | 'hover' | 'select' | 'drag' | 'zoom' | 'pan';
  locationId?: string;
  coordinates: {
    x: number;
    y: number;
  };
  timestamp: string;
  userId: string;
  details?: Record<string, unknown>;
}

// Preservation recommendations
export interface PreservationAdvice {
  id: string;
  locationId: string;
  documentIds: string[];
  issue: 'temperature' | 'humidity' | 'light' | 'air_quality' | 'pest' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendations: string[];
  estimatedCost?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  dueDate?: string;
  implementedAt?: string;
  implementedBy?: string;
}
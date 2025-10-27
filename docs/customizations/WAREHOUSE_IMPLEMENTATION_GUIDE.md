# Warehouse Management System - Implementation Guide

## Overview
Comprehensive physical document archiving system with barcode tracking across a complete warehouse hierarchy: **Location → Warehouse → Zone → Shelf → Rack → Document**

---

## ✅ COMPLETED COMPONENTS

### 1. Backend Infrastructure

#### **Type Definitions** (`pie-docs-backend/app/models/warehouse.py`)
- Complete Pydantic models for all entities
- CRUD models (Create, Update, Read) for each entity type
- Sub-models for complex structures
- Response models for API responses

#### **API Endpoints** (`pie-docs-backend/app/routers/warehouse.py`)
**40+ REST API endpoints covering:**

**Locations:**
- `GET /api/v1/warehouse/locations` - List locations
- `GET /api/v1/warehouse/locations/{id}` - Get location
- `POST /api/v1/warehouse/locations` - Create location
- `PATCH /api/v1/warehouse/locations/{id}` - Update location

**Warehouses:**
- `GET /api/v1/warehouse/warehouses` - List warehouses
- `GET /api/v1/warehouse/warehouses/{id}` - Get warehouse
- `POST /api/v1/warehouse/warehouses` - Create warehouse
- `PATCH /api/v1/warehouse/warehouses/{id}` - Update warehouse

**Zones:**
- `GET /api/v1/warehouse/zones` - List zones
- `GET /api/v1/warehouse/zones/{id}` - Get zone
- `POST /api/v1/warehouse/zones` - Create zone (with barcode)
- `PATCH /api/v1/warehouse/zones/{id}` - Update zone

**Shelves:**
- `GET /api/v1/warehouse/shelves` - List shelves
- `GET /api/v1/warehouse/shelves/{id}` - Get shelf
- `POST /api/v1/warehouse/shelves` - Create shelf (with barcode)
- `PATCH /api/v1/warehouse/shelves/{id}` - Update shelf

**Racks:**
- `GET /api/v1/warehouse/racks` - List racks
- `GET /api/v1/warehouse/racks/{id}` - Get rack
- `GET /api/v1/warehouse/racks/barcode/{barcode}` - Lookup by barcode
- `POST /api/v1/warehouse/racks` - Create rack (with barcode)
- `PATCH /api/v1/warehouse/racks/{id}` - Update rack

**Physical Documents:**
- `GET /api/v1/warehouse/documents` - List documents
- `GET /api/v1/warehouse/documents/{id}` - Get document
- `GET /api/v1/warehouse/documents/barcode/{barcode}` - Lookup by barcode
- `POST /api/v1/warehouse/documents` - Create document
- `PATCH /api/v1/warehouse/documents/{id}` - Update document

**Customer Assignments:**
- `GET /api/v1/warehouse/customer-assignments` - List assignments
- `POST /api/v1/warehouse/customer-assignments` - Create assignment

**Analytics:**
- `GET /api/v1/warehouse/stats/counts` - Get entity counts
- `GET /api/v1/warehouse/stats/capacity` - Get capacity utilization
- `GET /api/v1/warehouse/hierarchy/{location_id}` - Get full hierarchy

### 2. Frontend Infrastructure

#### **Type Definitions** (`pie-docs-frontend/src/types/warehouse.ts`)
- Complete TypeScript interfaces for all entities
- All CRUD type variants
- Response and filter types
- Hierarchy and navigation types

#### **API Services** (`pie-docs-frontend/src/services/warehouseService.ts`)
- Complete service layer for all API endpoints
- Barcode integration utilities
- Error handling and type safety

#### **Dashboard Page** (`pie-docs-frontend/src/pages/warehouse/WarehouseManagementPage.tsx`)
- Main warehouse management interface
- Overview dashboard with statistics
- Capacity utilization display
- Quick actions and navigation
- Tab-based navigation system

#### **Location Management Component** (`pie-docs-frontend/src/components/warehouse/LocationManagement.tsx`)
- Full CRUD operations for locations
- Search and filtering
- Modal forms for create/edit
- Status management

---

## 🚧 COMPONENTS TO IMPLEMENT

### Priority 1: Core Entity Management Components

#### 1. **Warehouse Management Component** (`WarehouseManagement.tsx`)
Similar to LocationManagement, with:
- List, create, update warehouses
- Barcode field (optional for warehouses)
- Operational hours configuration
- Warehouse type selection
- Link to parent location

#### 2. **Zone Management Component** (`ZoneManagement.tsx`)
- List, create, update zones
- **Barcode field (required)** - integrate with barcode generator
- Environmental control settings
- Access level configuration
- Capacity management
- Link to parent warehouse

#### 3. **Shelf Management Component** (`ShelfManagement.tsx`)
- List, create, update shelves
- **Barcode field (required)** - integrate with barcode generator
- Dimensions input (width, depth, height)
- Position configuration (row, column, level)
- Shelf type selection
- Weight capacity
- Link to parent zone

#### 4. **Rack Management Component** (`RackManagement.tsx`)
- List, create, update racks
- **Barcode field (required)** - integrate with barcode generator
- Dimensions input
- Rack type selection
- Position on shelf
- Document capacity
- Customer assignment options
- Link to parent shelf

#### 5. **Physical Document Management Component** (`PhysicalDocumentManagement.tsx`)
- List, create, update physical documents
- **Barcode field (required)** - integrate with barcode generator
- Link to digital document
- Assign to rack
- Physical condition assessment
- Conservation priority
- Storage requirements
- Document movement history

### Priority 2: Advanced Features

#### 6. **Warehouse Hierarchy Viewer** (`WarehouseHierarchyViewer.tsx`)
- Tree view of complete hierarchy
- Expandable/collapsible nodes
- Click to navigate to entity details
- Visual capacity indicators
- Barcode display for each level
- Path breadcrumbs

#### 7. **Barcode Scanner Integration** (`BarcodeScannerIntegration.tsx`)
- Scan barcodes for zones, shelves, racks, documents
- Auto-identify entity type
- Quick lookup and navigation
- Bulk scanning mode
- Scan history

#### 8. **Document Movement Tracker** (`DocumentMovementTracker.tsx`)
- Create movement requests
- Track movement status
- Movement history
- Bulk movement operations
- Barcode-based verification

#### 9. **Customer Rack Assignment Manager** (`CustomerRackAssignmentManager.tsx`)
- Assign racks to customers
- Assignment duration and billing
- View customer allocations
- Expiry notifications
- Release assignments

#### 10. **Capacity Dashboard** (`CapacityDashboard.tsx`)
- Real-time capacity monitoring
- Visual charts and graphs
- Capacity alerts
- Utilization trends
- Forecasting

---

## 🔧 DATABASE MIGRATIONS NEEDED

Create PostgreSQL tables for all entities:

```sql
-- locations table
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    coordinates JSONB,
    contact JSONB NOT NULL,
    timezone VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL
);

-- warehouses table
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES locations(id),
    code VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    warehouse_type VARCHAR(50) NOT NULL,
    total_area DECIMAL(10,2) NOT NULL,
    operational_hours JSONB,
    contact JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL
);

-- zones table
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES warehouses(id),
    code VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    barcode_status VARCHAR(20) DEFAULT 'generated',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    zone_type VARCHAR(50) NOT NULL,
    area DECIMAL(10,2) NOT NULL,
    max_capacity INTEGER NOT NULL,
    current_capacity INTEGER DEFAULT 0,
    environmental_control JSONB,
    access_level INTEGER NOT NULL CHECK (access_level BETWEEN 1 AND 5),
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL
);

-- shelves table
CREATE TABLE shelves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES zones(id),
    code VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    barcode_status VARCHAR(20) DEFAULT 'generated',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    shelf_type VARCHAR(50) NOT NULL,
    dimensions JSONB NOT NULL,
    weight_capacity DECIMAL(10,2) NOT NULL,
    max_racks INTEGER NOT NULL,
    current_racks INTEGER DEFAULT 0,
    position JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL
);

-- racks table
CREATE TABLE racks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shelf_id UUID REFERENCES shelves(id),
    code VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    barcode_status VARCHAR(20) DEFAULT 'generated',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rack_type VARCHAR(50) NOT NULL,
    dimensions JSONB NOT NULL,
    weight_capacity DECIMAL(10,2) NOT NULL,
    max_documents INTEGER NOT NULL,
    current_documents INTEGER DEFAULT 0,
    position VARCHAR(50) NOT NULL,
    customer_id UUID,
    assignment_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL
);

-- physical_documents table
CREATE TABLE physical_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    digital_document_id UUID NOT NULL,
    rack_id UUID REFERENCES racks(id),
    barcode VARCHAR(100) UNIQUE NOT NULL,
    barcode_status VARCHAR(20) DEFAULT 'generated',
    document_type VARCHAR(50) NOT NULL,
    document_category VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    physical_condition VARCHAR(50) NOT NULL,
    conservation_priority VARCHAR(20) DEFAULT 'low',
    storage_requirements JSONB,
    customer_id UUID,
    assignment_date TIMESTAMP DEFAULT NOW(),
    assigned_by UUID NOT NULL,
    retrieval_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP,
    last_accessed_by UUID,
    status VARCHAR(20) DEFAULT 'stored',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL
);

-- document_movements table
CREATE TABLE document_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES physical_documents(id),
    from_rack_id UUID REFERENCES racks(id),
    to_rack_id UUID REFERENCES racks(id) NOT NULL,
    from_location_path TEXT,
    to_location_path TEXT NOT NULL,
    movement_type VARCHAR(50) NOT NULL,
    reason TEXT,
    notes TEXT,
    requested_by UUID NOT NULL,
    requested_at TIMESTAMP DEFAULT NOW(),
    executed_by UUID,
    executed_at TIMESTAMP,
    verified_by UUID,
    verified_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- customer_rack_assignments table
CREATE TABLE customer_rack_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    rack_id UUID REFERENCES racks(id),
    assignment_type VARCHAR(50) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    billing_cycle VARCHAR(20) NOT NULL,
    rate DECIMAL(10,2),
    currency VARCHAR(10),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_warehouses_location ON warehouses(location_id);
CREATE INDEX idx_zones_warehouse ON zones(warehouse_id);
CREATE INDEX idx_zones_barcode ON zones(barcode);
CREATE INDEX idx_shelves_zone ON shelves(zone_id);
CREATE INDEX idx_shelves_barcode ON shelves(barcode);
CREATE INDEX idx_racks_shelf ON racks(shelf_id);
CREATE INDEX idx_racks_barcode ON racks(barcode);
CREATE INDEX idx_racks_customer ON racks(customer_id);
CREATE INDEX idx_documents_rack ON physical_documents(rack_id);
CREATE INDEX idx_documents_barcode ON physical_documents(barcode);
CREATE INDEX idx_documents_customer ON physical_documents(customer_id);
CREATE INDEX idx_movements_document ON document_movements(document_id);
CREATE INDEX idx_assignments_customer ON customer_rack_assignments(customer_id);
CREATE INDEX idx_assignments_rack ON customer_rack_assignments(rack_id);
```

---

## 🔗 INTEGRATION POINTS

### 1. **Barcode Management Integration**
Existing barcode components in `pie-docs-frontend/src/components/physical/` need to be integrated:
- `BarcodeGenerator.tsx` - Generate barcodes for zones, shelves, racks, documents
- `BarcodeValidator.tsx` - Validate barcode formats
- `BatchGenerator.tsx` - Generate multiple barcodes at once
- `PrintManager.tsx` - Print barcode labels

### 2. **User Authentication**
Replace `'current-user-id'` placeholders with actual user context:
- Get user ID from authentication context
- Use for `created_by` and `updated_by` fields
- Implement permission checks

### 3. **Digital Document Linking**
Physical documents reference digital documents via `digital_document_id`:
- Create UI to select digital document when creating physical document
- Display digital document details in physical document view
- Link back to digital document from physical document

### 4. **Customer Management**
Racks and documents can be assigned to customers:
- Integration with customer management system
- Customer selector components
- Billing integration for rack assignments

---

## 📋 NEXT STEPS

1. **Create Database Migration**
   - Run the SQL schema creation script
   - Seed initial data (locations, warehouse types, etc.)

2. **Register Router in FastAPI**
   ```python
   # In pie-docs-backend/app/main.py
   from app.routers import warehouse
   app.include_router(warehouse.router)
   ```

3. **Implement Remaining Management Components**
   - Start with WarehouseManagement.tsx (use LocationManagement as template)
   - Then ZoneManagement.tsx
   - Then ShelfManagement.tsx
   - Then RackManagement.tsx
   - Then PhysicalDocumentManagement.tsx

4. **Integrate Components into Dashboard**
   - Import all management components into WarehouseManagementPage.tsx
   - Replace placeholder content in `renderTabContent()` method

5. **Add Navigation Links**
   - Update main application navigation
   - Add route to warehouse management page
   - Add to sidebar menu

6. **Testing**
   - Test each entity CRUD operations
   - Test barcode generation and scanning
   - Test hierarchy traversal
   - Test capacity calculations

---

## 💡 TEMPLATE FOR NEW MANAGEMENT COMPONENTS

Each entity management component should follow this pattern:

```typescript
// Example: WarehouseManagement.tsx
import React, { useState, useEffect } from 'react';
import { warehouseServices } from '@/services/warehouseService';
import type { Warehouse, WarehouseCreate } from '@/types/warehouse';

export const WarehouseManagement: React.FC = () => {
  // State management
  const [entities, setEntities] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Warehouse | null>(null);

  // Form state
  const [formData, setFormData] = useState<WarehouseCreate>({...});

  // Load data
  useEffect(() => {
    loadEntities();
  }, []);

  // CRUD operations
  const loadEntities = async () => {...};
  const handleSubmit = async (e: React.FormEvent) => {...};
  const handleEdit = (entity: Warehouse) => {...};
  const resetForm = () => {...};

  // Render
  return (
    <div>
      {/* Search and filters */}
      {/* Create button */}
      {/* Form modal */}
      {/* Data table */}
    </div>
  );
};
```

---

## 📞 SUPPORT

For questions or issues:
1. Review type definitions in `warehouse.ts`
2. Check API endpoint documentation in router file
3. Reference LocationManagement.tsx as implementation example
4. Test API endpoints directly before building UI

---

**Status**: Foundation Complete ✅ | Components In Progress 🚧 | Testing Pending ⏳

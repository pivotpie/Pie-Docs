"""
Warehouse Management System API Router
Comprehensive endpoints for Location → Warehouse → Zone → Shelf → Rack → Document hierarchy
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from psycopg2.extras import Json

from app.database import get_db_cursor
from app.models.warehouse import (
    # Location
    Location, LocationCreate, LocationUpdate,
    # Warehouse
    Warehouse, WarehouseCreate, WarehouseUpdate,
    # Zone
    Zone, ZoneCreate, ZoneUpdate,
    # Shelf
    Shelf, ShelfCreate, ShelfUpdate,
    # Rack
    Rack, RackCreate, RackUpdate,
    # Physical Document
    PhysicalDocument, PhysicalDocumentCreate, PhysicalDocumentUpdate,
    # Movement
    DocumentMovement, DocumentMovementCreate,
    # Customer Assignment
    CustomerRackAssignment, CustomerRackAssignmentCreate,
    # Response models
    PaginatedResponse, EntityCounts, CapacityStats
)

router = APIRouter(prefix="/api/v1/warehouse", tags=["warehouse"])


# ==========================================
# LOCATION ENDPOINTS
# ==========================================

@router.get("/locations", response_model=List[Location])
async def list_locations(
    status: Optional[str] = None,
    search: Optional[str] = None
):
    """List all locations with optional filtering"""
    try:
        where_clauses = []
        params = []

        if status:
            where_clauses.append("status = %s")
            params.append(status)

        if search:
            where_clauses.append("(name ILIKE %s OR code ILIKE %s OR city ILIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        with get_db_cursor() as cursor:
            cursor.execute(f"""
                SELECT * FROM locations
                WHERE {where_sql}
                ORDER BY name
            """, params)
            locations = cursor.fetchall()
            return [dict(row) for row in locations]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch locations: {str(e)}")


@router.get("/locations/{location_id}", response_model=Location)
async def get_location(location_id: UUID):
    """Get a specific location by ID"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM locations WHERE id = %s", (location_id,))
            location = cursor.fetchone()

            if not location:
                raise HTTPException(status_code=404, detail="Location not found")

            return dict(location)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch location: {str(e)}")


@router.post("/locations", response_model=Location)
async def create_location(location: LocationCreate, user_id: UUID = Query(...)):
    """Create a new location"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO locations (
                    code, name, address, city, state, country, postal_code,
                    coordinates, contact, timezone, metadata, created_by, updated_by
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                location.code, location.name, location.address, location.city,
                location.state, location.country, location.postal_code,
                Json(location.coordinates.dict()) if location.coordinates else None,
                Json(location.contact.dict()), location.timezone, Json(location.metadata),
                user_id, user_id
            ))
            new_location = cursor.fetchone()
            return dict(new_location)
    except Exception as e:
        if 'unique constraint' in str(e).lower():
            raise HTTPException(status_code=409, detail="Location code already exists")
        raise HTTPException(status_code=500, detail=f"Failed to create location: {str(e)}")


@router.patch("/locations/{location_id}", response_model=Location)
async def update_location(location_id: UUID, location: LocationUpdate, user_id: UUID = Query(...)):
    """Update a location"""
    try:
        update_fields = []
        params = []

        for field, value in location.dict(exclude_unset=True).items():
            if value is not None:
                update_fields.append(f"{field} = %s")
                if field in ['coordinates', 'contact', 'metadata']:
                    params.append(Json(value) if isinstance(value, dict) else value)
                else:
                    params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        update_fields.append("updated_by = %s")
        update_fields.append("updated_at = NOW()")
        params.extend([user_id, location_id])

        with get_db_cursor(commit=True) as cursor:
            cursor.execute(f"""
                UPDATE locations
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING *
            """, params)
            updated_location = cursor.fetchone()

            if not updated_location:
                raise HTTPException(status_code=404, detail="Location not found")

            return dict(updated_location)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update location: {str(e)}")


# ==========================================
# WAREHOUSE ENDPOINTS
# ==========================================

@router.get("/warehouses", response_model=List[Warehouse])
async def list_warehouses(
    location_id: Optional[UUID] = None,
    status: Optional[str] = None,
    search: Optional[str] = None
):
    """List all warehouses with optional filtering"""
    try:
        where_clauses = []
        params = []

        if location_id:
            where_clauses.append("location_id = %s")
            params.append(location_id)

        if status:
            where_clauses.append("status = %s")
            params.append(status)

        if search:
            where_clauses.append("(name ILIKE %s OR code ILIKE %s OR description ILIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        with get_db_cursor() as cursor:
            cursor.execute(f"""
                SELECT * FROM warehouses
                WHERE {where_sql}
                ORDER BY name
            """, params)
            warehouses = cursor.fetchall()
            return [dict(row) for row in warehouses]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch warehouses: {str(e)}")


@router.get("/warehouses/{warehouse_id}", response_model=Warehouse)
async def get_warehouse(warehouse_id: UUID):
    """Get a specific warehouse by ID"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM warehouses WHERE id = %s", (warehouse_id,))
            warehouse = cursor.fetchone()

            if not warehouse:
                raise HTTPException(status_code=404, detail="Warehouse not found")

            return dict(warehouse)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch warehouse: {str(e)}")


@router.post("/warehouses", response_model=Warehouse)
async def create_warehouse(warehouse: WarehouseCreate, user_id: UUID = Query(...)):
    """Create a new warehouse"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO warehouses (
                    location_id, code, barcode, name, description, warehouse_type,
                    total_area, operational_hours, contact, metadata, created_by, updated_by
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                warehouse.location_id, warehouse.code, warehouse.barcode, warehouse.name,
                warehouse.description, warehouse.warehouse_type, warehouse.total_area,
                Json(warehouse.operational_hours.dict()) if warehouse.operational_hours else None,
                Json(warehouse.contact.dict()), Json(warehouse.metadata), user_id, user_id
            ))
            new_warehouse = cursor.fetchone()
            return dict(new_warehouse)
    except Exception as e:
        error_msg = str(e).lower()
        if 'unique constraint' in error_msg:
            if 'warehouses_code_key' in error_msg:
                raise HTTPException(status_code=409, detail=f"Warehouse code '{warehouse.code}' already exists")
            elif 'warehouses_barcode_key' in error_msg:
                raise HTTPException(status_code=409, detail=f"Barcode '{warehouse.barcode}' already exists")
            else:
                raise HTTPException(status_code=409, detail="Warehouse code or barcode already exists")
        raise HTTPException(status_code=500, detail=f"Failed to create warehouse: {str(e)}")


@router.patch("/warehouses/{warehouse_id}", response_model=Warehouse)
async def update_warehouse(warehouse_id: UUID, warehouse: WarehouseUpdate, user_id: UUID = Query(...)):
    """Update a warehouse"""
    try:
        update_fields = []
        params = []

        for field, value in warehouse.dict(exclude_unset=True).items():
            if value is not None:
                update_fields.append(f"{field} = %s")
                if field in ['operational_hours', 'contact', 'metadata']:
                    params.append(Json(value) if isinstance(value, dict) else value)
                else:
                    params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        update_fields.append("updated_by = %s")
        update_fields.append("updated_at = NOW()")
        params.extend([user_id, warehouse_id])

        with get_db_cursor(commit=True) as cursor:
            cursor.execute(f"""
                UPDATE warehouses
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING *
            """, params)
            updated_warehouse = cursor.fetchone()

            if not updated_warehouse:
                raise HTTPException(status_code=404, detail="Warehouse not found")

            return dict(updated_warehouse)
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e).lower()
        if 'unique constraint' in error_msg:
            if 'warehouses_code_key' in error_msg:
                raise HTTPException(status_code=409, detail=f"Warehouse code already exists")
            elif 'warehouses_barcode_key' in error_msg:
                raise HTTPException(status_code=409, detail=f"Barcode already exists")
            else:
                raise HTTPException(status_code=409, detail="Warehouse code or barcode already exists")
        raise HTTPException(status_code=500, detail=f"Failed to update warehouse: {str(e)}")


# ==========================================
# ZONE ENDPOINTS
# ==========================================

@router.get("/zones", response_model=List[Zone])
async def list_zones(
    warehouse_id: Optional[UUID] = None,
    status: Optional[str] = None,
    search: Optional[str] = None
):
    """List all zones with optional filtering"""
    try:
        where_clauses = []
        params = []

        if warehouse_id:
            where_clauses.append("z.warehouse_id = %s")
            params.append(warehouse_id)

        if status:
            where_clauses.append("z.status = %s")
            params.append(status)

        if search:
            where_clauses.append("(z.name ILIKE %s OR z.code ILIKE %s OR z.barcode ILIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        with get_db_cursor() as cursor:
            cursor.execute(f"""
                SELECT z.*, w.name as warehouse_name, w.code as warehouse_code
                FROM zones z
                LEFT JOIN warehouses w ON z.warehouse_id = w.id
                WHERE {where_sql}
                ORDER BY z.name
            """, params)
            zones = cursor.fetchall()
            return [dict(row) for row in zones]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch zones: {str(e)}")


@router.get("/zones/{zone_id}", response_model=Zone)
async def get_zone(zone_id: UUID):
    """Get a specific zone by ID"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM zones WHERE id = %s", (zone_id,))
            zone = cursor.fetchone()

            if not zone:
                raise HTTPException(status_code=404, detail="Zone not found")

            return dict(zone)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch zone: {str(e)}")


@router.post("/zones", response_model=Zone)
async def create_zone(zone: ZoneCreate, user_id: UUID = Query(...)):
    """Create a new zone with barcode"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO zones (
                    warehouse_id, code, barcode, name, description, zone_type,
                    area, max_capacity, environmental_control, access_level,
                    metadata, created_by, updated_by
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                zone.warehouse_id, zone.code, zone.barcode, zone.name, zone.description,
                zone.zone_type, zone.area, zone.max_capacity,
                Json(zone.environmental_control.dict()) if zone.environmental_control else None,
                zone.access_level, Json(zone.metadata), user_id, user_id
            ))
            new_zone = cursor.fetchone()
            return dict(new_zone)
    except Exception as e:
        error_msg = str(e).lower()
        if 'unique constraint' in error_msg:
            if 'zones_code_key' in error_msg:
                raise HTTPException(status_code=409, detail=f"Zone code '{zone.code}' already exists")
            elif 'zones_barcode_key' in error_msg:
                raise HTTPException(status_code=409, detail=f"Zone barcode '{zone.barcode}' already exists")
            else:
                raise HTTPException(status_code=409, detail="Zone code or barcode already exists")
        raise HTTPException(status_code=500, detail=f"Failed to create zone: {str(e)}")


@router.patch("/zones/{zone_id}", response_model=Zone)
async def update_zone(zone_id: UUID, zone: ZoneUpdate, user_id: UUID = Query(...)):
    """Update a zone"""
    try:
        update_fields = []
        params = []

        for field, value in zone.dict(exclude_unset=True).items():
            if value is not None:
                update_fields.append(f"{field} = %s")
                if field in ['environmental_control', 'metadata']:
                    params.append(Json(value) if isinstance(value, dict) else value)
                else:
                    params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        update_fields.append("updated_by = %s")
        update_fields.append("updated_at = NOW()")
        params.extend([user_id, zone_id])

        with get_db_cursor(commit=True) as cursor:
            cursor.execute(f"""
                UPDATE zones
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING *
            """, params)
            updated_zone = cursor.fetchone()

            if not updated_zone:
                raise HTTPException(status_code=404, detail="Zone not found")

            return dict(updated_zone)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update zone: {str(e)}")


# ==========================================
# SHELF ENDPOINTS
# ==========================================

@router.get("/shelves", response_model=List[Shelf])
async def list_shelves(
    zone_id: Optional[UUID] = None,
    status: Optional[str] = None,
    search: Optional[str] = None
):
    """List all shelves with optional filtering"""
    try:
        where_clauses = []
        params = []

        if zone_id:
            where_clauses.append("s.zone_id = %s")
            params.append(zone_id)

        if status:
            where_clauses.append("s.status = %s")
            params.append(status)

        if search:
            where_clauses.append("(s.name ILIKE %s OR s.code ILIKE %s OR s.barcode ILIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        with get_db_cursor() as cursor:
            cursor.execute(f"""
                SELECT s.*, z.name as zone_name, z.code as zone_code
                FROM shelves s
                LEFT JOIN zones z ON s.zone_id = z.id
                WHERE {where_sql}
                ORDER BY s.position->'row', s.position->'column', s.position->'level'
            """, params)
            shelves = cursor.fetchall()
            return [dict(row) for row in shelves]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch shelves: {str(e)}")


@router.get("/shelves/{shelf_id}", response_model=Shelf)
async def get_shelf(shelf_id: UUID):
    """Get a specific shelf by ID"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM shelves WHERE id = %s", (shelf_id,))
            shelf = cursor.fetchone()

            if not shelf:
                raise HTTPException(status_code=404, detail="Shelf not found")

            return dict(shelf)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch shelf: {str(e)}")


@router.post("/shelves", response_model=Shelf)
async def create_shelf(shelf: ShelfCreate, user_id: UUID = Query(...)):
    """Create a new shelf with barcode"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO shelves (
                    zone_id, code, barcode, name, description, shelf_type,
                    dimensions, weight_capacity, max_racks, position,
                    metadata, created_by, updated_by
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                shelf.zone_id, shelf.code, shelf.barcode, shelf.name, shelf.description,
                shelf.shelf_type, Json(shelf.dimensions.dict()), shelf.weight_capacity,
                shelf.max_racks, Json(shelf.position.dict()), Json(shelf.metadata), user_id, user_id
            ))
            new_shelf = cursor.fetchone()
            return dict(new_shelf)
    except Exception as e:
        error_msg = str(e).lower()
        if 'unique constraint' in error_msg:
            if 'shelves_code_key' in error_msg:
                raise HTTPException(status_code=409, detail=f"Shelf code '{shelf.code}' already exists")
            elif 'shelves_barcode_key' in error_msg:
                raise HTTPException(status_code=409, detail=f"Shelf barcode '{shelf.barcode}' already exists")
            else:
                raise HTTPException(status_code=409, detail="Shelf code or barcode already exists")
        raise HTTPException(status_code=500, detail=f"Failed to create shelf: {str(e)}")


@router.patch("/shelves/{shelf_id}", response_model=Shelf)
async def update_shelf(shelf_id: UUID, shelf: ShelfUpdate, user_id: UUID = Query(...)):
    """Update a shelf"""
    try:
        update_fields = []
        params = []

        for field, value in shelf.dict(exclude_unset=True).items():
            if value is not None:
                update_fields.append(f"{field} = %s")
                if field in ['dimensions', 'position', 'metadata']:
                    params.append(Json(value) if isinstance(value, dict) else value)
                else:
                    params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        update_fields.append("updated_by = %s")
        update_fields.append("updated_at = NOW()")
        params.extend([user_id, shelf_id])

        with get_db_cursor(commit=True) as cursor:
            cursor.execute(f"""
                UPDATE shelves
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING *
            """, params)
            updated_shelf = cursor.fetchone()

            if not updated_shelf:
                raise HTTPException(status_code=404, detail="Shelf not found")

            return dict(updated_shelf)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update shelf: {str(e)}")


# ==========================================
# RACK ENDPOINTS
# ==========================================

@router.get("/racks", response_model=List[Rack])
async def list_racks(
    shelf_id: Optional[UUID] = None,
    customer_id: Optional[UUID] = None,
    status: Optional[str] = None,
    available: Optional[bool] = None,
    search: Optional[str] = None
):
    """List all racks with optional filtering"""
    try:
        where_clauses = []
        params = []

        if shelf_id:
            where_clauses.append("r.shelf_id = %s")
            params.append(shelf_id)

        if customer_id:
            where_clauses.append("r.customer_id = %s")
            params.append(customer_id)

        if status:
            where_clauses.append("r.status = %s")
            params.append(status)

        if available is not None:
            if available:
                where_clauses.append("r.current_documents < r.max_documents")
            else:
                where_clauses.append("r.current_documents >= r.max_documents")

        if search:
            where_clauses.append("(r.name ILIKE %s OR r.code ILIKE %s OR r.barcode ILIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        with get_db_cursor() as cursor:
            cursor.execute(f"""
                SELECT r.*, s.name as shelf_name, s.code as shelf_code
                FROM racks r
                LEFT JOIN shelves s ON r.shelf_id = s.id
                WHERE {where_sql}
                ORDER BY r.position, r.name
            """, params)
            racks = cursor.fetchall()
            return [dict(row) for row in racks]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch racks: {str(e)}")


@router.get("/racks/{rack_id}", response_model=Rack)
async def get_rack(rack_id: UUID):
    """Get a specific rack by ID"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM racks WHERE id = %s", (rack_id,))
            rack = cursor.fetchone()

            if not rack:
                raise HTTPException(status_code=404, detail="Rack not found")

            return dict(rack)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch rack: {str(e)}")


@router.post("/racks", response_model=Rack)
async def create_rack(rack: RackCreate, user_id: UUID = Query(...)):
    """Create a new rack with barcode"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO racks (
                    shelf_id, code, barcode, name, description, rack_type,
                    dimensions, weight_capacity, max_documents, position,
                    customer_id, assignment_type, metadata, created_by, updated_by
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                rack.shelf_id, rack.code, rack.barcode, rack.name, rack.description,
                rack.rack_type, Json(rack.dimensions.dict()), rack.weight_capacity,
                rack.max_documents, rack.position, rack.customer_id,
                rack.assignment_type, Json(rack.metadata), user_id, user_id
            ))
            new_rack = cursor.fetchone()
            return dict(new_rack)
    except Exception as e:
        error_msg = str(e).lower()
        if 'unique constraint' in error_msg:
            if 'racks_code_key' in error_msg:
                raise HTTPException(status_code=409, detail=f"Rack code '{rack.code}' already exists")
            elif 'racks_barcode_key' in error_msg:
                raise HTTPException(status_code=409, detail=f"Rack barcode '{rack.barcode}' already exists")
            else:
                raise HTTPException(status_code=409, detail="Rack code or barcode already exists")
        raise HTTPException(status_code=500, detail=f"Failed to create rack: {str(e)}")


@router.patch("/racks/{rack_id}", response_model=Rack)
async def update_rack(rack_id: UUID, rack: RackUpdate, user_id: UUID = Query(...)):
    """Update a rack"""
    try:
        update_fields = []
        params = []

        for field, value in rack.dict(exclude_unset=True).items():
            if value is not None:
                update_fields.append(f"{field} = %s")
                if field in ['dimensions', 'metadata']:
                    params.append(Json(value) if isinstance(value, dict) else value)
                else:
                    params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        update_fields.append("updated_by = %s")
        update_fields.append("updated_at = NOW()")
        params.extend([user_id, rack_id])

        with get_db_cursor(commit=True) as cursor:
            cursor.execute(f"""
                UPDATE racks
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING *
            """, params)
            updated_rack = cursor.fetchone()

            if not updated_rack:
                raise HTTPException(status_code=404, detail="Rack not found")

            return dict(updated_rack)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update rack: {str(e)}")


@router.get("/racks/barcode/{barcode}", response_model=Rack)
async def get_rack_by_barcode(barcode: str):
    """Look up a rack by its barcode"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM racks WHERE barcode = %s AND status = 'active'", (barcode,))
            rack = cursor.fetchone()

            if not rack:
                raise HTTPException(status_code=404, detail="Rack not found with this barcode")

            return dict(rack)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to lookup rack: {str(e)}")


# ==========================================
# PHYSICAL DOCUMENT ENDPOINTS
# ==========================================

@router.get("/documents")
async def list_physical_documents(
    rack_id: Optional[UUID] = None,
    customer_id: Optional[UUID] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100)
):
    """List physical documents with pagination and filtering"""
    try:
        where_clauses = []
        params = []

        if rack_id:
            where_clauses.append("rack_id = %s")
            params.append(rack_id)

        if customer_id:
            where_clauses.append("customer_id = %s")
            params.append(customer_id)

        if status:
            where_clauses.append("status = %s")
            params.append(status)

        if search:
            where_clauses.append("(title ILIKE %s OR barcode ILIKE %s OR document_category ILIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        offset = (page - 1) * page_size

        with get_db_cursor() as cursor:
            cursor.execute(f"""
                SELECT * FROM physical_documents
                WHERE {where_sql}
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """, params + [page_size, offset])
            documents = cursor.fetchall()
            return [dict(row) for row in documents]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch documents: {str(e)}")


@router.get("/documents/{document_id}")
async def get_physical_document(document_id: UUID):
    """Get a specific physical document by ID"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM physical_documents WHERE id = %s", (document_id,))
            document = cursor.fetchone()

            if not document:
                raise HTTPException(status_code=404, detail="Physical document not found")

            return dict(document)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch document: {str(e)}")


@router.get("/documents/digital/{digital_document_id}")
async def get_physical_document_by_digital_id(digital_document_id: UUID):
    """Get a specific physical document by its digital document ID"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM physical_documents WHERE digital_document_id = %s", (str(digital_document_id),))
            document = cursor.fetchone()

            if not document:
                raise HTTPException(status_code=404, detail="Physical document not found for this digital document ID")

            return dict(document)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch document: {str(e)}")


@router.post("/documents")
async def create_physical_document(document: PhysicalDocumentCreate, user_id: UUID = Query(...)):
    """Create a new physical document record"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # Update rack capacity
            cursor.execute("""
                UPDATE racks
                SET current_documents = current_documents + 1
                WHERE id = %s AND current_documents < max_documents
                RETURNING id
            """, (document.rack_id,))

            if not cursor.fetchone():
                raise HTTPException(status_code=400, detail="Rack is at maximum capacity or not found")

            cursor.execute("""
                INSERT INTO physical_documents (
                    digital_document_id, rack_id, barcode, document_type,
                    document_category, title, description, physical_condition,
                    conservation_priority, storage_requirements, customer_id,
                    metadata, assigned_by, created_by, updated_by
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                document.digital_document_id, document.rack_id, document.barcode,
                document.document_type, document.document_category, document.title,
                document.description, document.physical_condition,
                document.conservation_priority,
                Json(document.storage_requirements.dict()) if document.storage_requirements else None,
                document.customer_id, Json(document.metadata), user_id, user_id, user_id
            ))
            new_document = cursor.fetchone()
            return dict(new_document)
    except HTTPException:
        raise
    except Exception as e:
        if 'unique constraint' in str(e).lower():
            raise HTTPException(status_code=409, detail="Document barcode already exists")
        raise HTTPException(status_code=500, detail=f"Failed to create document: {str(e)}")


@router.get("/documents/barcode/{barcode}")
async def get_document_by_barcode(barcode: str):
    """Look up a physical document by its barcode"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM physical_documents WHERE barcode = %s", (barcode,))
            document = cursor.fetchone()

            if not document:
                raise HTTPException(status_code=404, detail="Document not found with this barcode")

            return dict(document)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to lookup document: {str(e)}")


# ==========================================
# CUSTOMER RACK ASSIGNMENT ENDPOINTS
# ==========================================

@router.get("/customer-assignments", response_model=List[CustomerRackAssignment])
async def list_customer_rack_assignments(
    customer_id: Optional[UUID] = None,
    rack_id: Optional[UUID] = None,
    status: Optional[str] = None
):
    """List customer rack assignments"""
    try:
        where_clauses = []
        params = []

        if customer_id:
            where_clauses.append("customer_id = %s")
            params.append(customer_id)

        if rack_id:
            where_clauses.append("rack_id = %s")
            params.append(rack_id)

        if status:
            where_clauses.append("status = %s")
            params.append(status)

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        with get_db_cursor() as cursor:
            cursor.execute(f"""
                SELECT cra.*, r.code as rack_code
                FROM customer_rack_assignments cra
                JOIN racks r ON cra.rack_id = r.id
                WHERE {where_sql}
                ORDER BY cra.created_at DESC
            """, params)
            assignments = cursor.fetchall()
            return [dict(row) for row in assignments]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch assignments: {str(e)}")


@router.post("/customer-assignments", response_model=CustomerRackAssignment)
async def create_customer_rack_assignment(assignment: CustomerRackAssignmentCreate, user_id: UUID = Query(...)):
    """Create a new customer rack assignment"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # Get rack code
            cursor.execute("SELECT code FROM racks WHERE id = %s", (assignment.rack_id,))
            rack = cursor.fetchone()
            if not rack:
                raise HTTPException(status_code=404, detail="Rack not found")

            cursor.execute("""
                INSERT INTO customer_rack_assignments (
                    customer_id, customer_name, rack_id, assignment_type,
                    start_date, end_date, billing_cycle, rate, currency,
                    notes, metadata, created_by, updated_by
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                assignment.customer_id, assignment.customer_name, assignment.rack_id,
                assignment.assignment_type, assignment.start_date, assignment.end_date,
                assignment.billing_cycle, assignment.rate, assignment.currency,
                assignment.notes, Json(assignment.metadata), user_id, user_id
            ))
            new_assignment = cursor.fetchone()
            result = dict(new_assignment)
            result['rack_code'] = rack['code']
            return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create assignment: {str(e)}")


# ==========================================
# STATISTICS AND ANALYTICS ENDPOINTS
# ==========================================

@router.get("/stats/counts", response_model=EntityCounts)
async def get_entity_counts(location_id: Optional[UUID] = None):
    """Get total counts of all entities"""
    try:
        with get_db_cursor() as cursor:
            where_clause = ""
            params = []

            if location_id:
                where_clause = "WHERE l.id = %s"
                params.append(location_id)

            cursor.execute(f"""
                SELECT
                    COUNT(DISTINCT l.id) as locations,
                    COUNT(DISTINCT w.id) as warehouses,
                    COUNT(DISTINCT z.id) as zones,
                    COUNT(DISTINCT s.id) as shelves,
                    COUNT(DISTINCT r.id) as racks,
                    COUNT(DISTINCT pd.id) as documents
                FROM locations l
                LEFT JOIN warehouses w ON w.location_id = l.id
                LEFT JOIN zones z ON z.warehouse_id = w.id
                LEFT JOIN shelves s ON s.zone_id = z.id
                LEFT JOIN racks r ON r.shelf_id = s.id
                LEFT JOIN physical_documents pd ON pd.rack_id = r.id
                {where_clause}
            """, params)
            counts = cursor.fetchone()
            return dict(counts)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch counts: {str(e)}")


@router.get("/stats/capacity", response_model=List[CapacityStats])
async def get_capacity_stats(
    entity_type: Optional[str] = Query(None, regex="^(zone|shelf|rack)$"),
    entity_id: Optional[UUID] = None
):
    """Get capacity utilization statistics"""
    try:
        with get_db_cursor() as cursor:
            if entity_type == 'zone' or (not entity_type and not entity_id):
                cursor.execute("""
                    SELECT
                        'zone' as entity_type,
                        id as entity_id,
                        name as entity_name,
                        max_capacity,
                        current_capacity,
                        ROUND((current_capacity::numeric / max_capacity::numeric * 100), 2) as utilization_percentage,
                        (max_capacity - current_capacity) as available_capacity,
                        CASE
                            WHEN current_capacity >= max_capacity THEN 'full'
                            WHEN current_capacity::float / max_capacity::float >= 0.9 THEN 'high'
                            WHEN current_capacity::float / max_capacity::float >= 0.5 THEN 'normal'
                            ELSE 'low'
                        END as status
                    FROM zones
                    WHERE status = 'active'
                    ORDER BY utilization_percentage DESC
                """)
                return [dict(row) for row in cursor.fetchall()]

            elif entity_type == 'shelf':
                cursor.execute("""
                    SELECT
                        'shelf' as entity_type,
                        id as entity_id,
                        name as entity_name,
                        max_racks as max_capacity,
                        current_racks as current_capacity,
                        ROUND((current_racks::numeric / max_racks::numeric * 100), 2) as utilization_percentage,
                        (max_racks - current_racks) as available_capacity,
                        CASE
                            WHEN current_racks >= max_racks THEN 'full'
                            WHEN current_racks::float / max_racks::float >= 0.9 THEN 'high'
                            WHEN current_racks::float / max_racks::float >= 0.5 THEN 'normal'
                            ELSE 'low'
                        END as status
                    FROM shelves
                    WHERE status = 'active'
                    ORDER BY utilization_percentage DESC
                """)
                return [dict(row) for row in cursor.fetchall()]

            elif entity_type == 'rack':
                cursor.execute("""
                    SELECT
                        'rack' as entity_type,
                        id as entity_id,
                        name as entity_name,
                        max_documents as max_capacity,
                        current_documents as current_capacity,
                        ROUND((current_documents::numeric / max_documents::numeric * 100), 2) as utilization_percentage,
                        (max_documents - current_documents) as available_capacity,
                        CASE
                            WHEN current_documents >= max_documents THEN 'full'
                            WHEN current_documents::float / max_documents::float >= 0.9 THEN 'high'
                            WHEN current_documents::float / max_documents::float >= 0.5 THEN 'normal'
                            ELSE 'low'
                        END as status
                    FROM racks
                    WHERE status = 'active'
                    ORDER BY utilization_percentage DESC
                """)
                return [dict(row) for row in cursor.fetchall()]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch capacity stats: {str(e)}")


@router.get("/hierarchy/{location_id}")
async def get_warehouse_hierarchy(location_id: UUID):
    """Get complete warehouse hierarchy for a location"""
    try:
        with get_db_cursor() as cursor:
            # Get location
            cursor.execute("SELECT * FROM locations WHERE id = %s", (location_id,))
            location = cursor.fetchone()

            if not location:
                raise HTTPException(status_code=404, detail="Location not found")

            # Get warehouses
            cursor.execute("SELECT * FROM warehouses WHERE location_id = %s ORDER BY name", (location_id,))
            warehouses = cursor.fetchall()

            hierarchy = {
                "location": dict(location),
                "warehouses": []
            }

            for warehouse in warehouses:
                warehouse_dict = dict(warehouse)

                # Get zones
                cursor.execute("SELECT * FROM zones WHERE warehouse_id = %s ORDER BY name", (warehouse['id'],))
                zones = cursor.fetchall()
                warehouse_dict['zones'] = []

                for zone in zones:
                    zone_dict = dict(zone)

                    # Get shelves
                    cursor.execute("SELECT * FROM shelves WHERE zone_id = %s ORDER BY position", (zone['id'],))
                    shelves = cursor.fetchall()
                    zone_dict['shelves'] = []

                    for shelf in shelves:
                        shelf_dict = dict(shelf)

                        # Get racks
                        cursor.execute("SELECT * FROM racks WHERE shelf_id = %s ORDER BY position", (shelf['id'],))
                        racks = cursor.fetchall()
                        shelf_dict['racks'] = []

                        for rack in racks:
                            rack_dict = dict(rack)

                            # Get documents
                            cursor.execute("SELECT * FROM physical_documents WHERE rack_id = %s", (rack['id'],))
                            documents = cursor.fetchall()
                            rack_dict['documents'] = [dict(doc) for doc in documents]

                            shelf_dict['racks'].append(rack_dict)

                        zone_dict['shelves'].append(shelf_dict)

                    warehouse_dict['zones'].append(zone_dict)

                hierarchy['warehouses'].append(warehouse_dict)

            return hierarchy
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch hierarchy: {str(e)}")

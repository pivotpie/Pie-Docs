"""
Physical Documents - Location Tracking API Router

⚠️ DEPRECATED/INACTIVE MODULE ⚠️
Status: INACTIVE - Hidden from Swagger UI
Replaced By: app/routers/warehouse.py
See: pie-docs-backend/config/inactive-modules.yaml

This module is maintained for backward compatibility only.
DO NOT add new features to this module.
For new development, use the warehouse location management system instead.

Migration Path:
- Storage locations → Warehouse hierarchical structure (warehouse > zone > shelf > rack)
- Location movements → Warehouse document tracking with barcode integration
- Utilization reports → Warehouse analytics and capacity management
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.database import get_db_cursor
from app.models.physical_documents import (
    StorageLocation, StorageLocationCreate, StorageLocationUpdate,
    StorageLocationListResponse, LocationMovement, LocationMovementCreate,
    LocationType
)

router = APIRouter(prefix="/api/v1/physical/locations", tags=["physical-locations"])


# ==========================================
# Storage Locations Endpoints
# ==========================================

@router.get("", response_model=StorageLocationListResponse)
async def list_locations(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    location_type: Optional[LocationType] = None,
    parent_id: Optional[UUID] = None
):
    """List storage locations with pagination and filtering"""
    try:
        offset = (page - 1) * page_size

        # Build query
        where_clauses = []
        params = []

        if location_type:
            where_clauses.append("location_type = %s")
            params.append(location_type.value)

        if parent_id:
            where_clauses.append("parent_id = %s")
            params.append(parent_id)

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        with get_db_cursor() as cursor:
            # Get total count
            cursor.execute(f"""
                SELECT COUNT(*) FROM storage_locations WHERE {where_sql}
            """, params)
            total = cursor.fetchone()['count']

            # Get locations
            cursor.execute(f"""
                SELECT id, name, description, location_type, parent_id, path,
                       capacity, current_count, utilization, barcode_id,
                       coordinates, metadata, created_at, updated_at
                FROM storage_locations
                WHERE {where_sql}
                ORDER BY path, name
                LIMIT %s OFFSET %s
            """, params + [page_size, offset])
            locations = cursor.fetchall()

            return {
                "locations": [dict(row) for row in locations],
                "total": total,
                "page": page,
                "page_size": page_size
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch locations: {str(e)}")


@router.get("/hierarchy")
async def get_location_hierarchy(root_id: Optional[UUID] = None):
    """Get hierarchical tree of locations"""
    try:
        with get_db_cursor() as cursor:
            if root_id:
                # Get specific subtree
                cursor.execute("""
                    WITH RECURSIVE location_tree AS (
                        SELECT id, name, description, location_type, parent_id, path,
                               capacity, current_count, utilization, 0 as level
                        FROM storage_locations
                        WHERE id = %s
                        UNION ALL
                        SELECT sl.id, sl.name, sl.description, sl.location_type, sl.parent_id, sl.path,
                               sl.capacity, sl.current_count, sl.utilization, lt.level + 1
                        FROM storage_locations sl
                        JOIN location_tree lt ON sl.parent_id = lt.id
                    )
                    SELECT * FROM location_tree ORDER BY level, name
                """, (root_id,))
            else:
                # Get full tree
                cursor.execute("""
                    WITH RECURSIVE location_tree AS (
                        SELECT id, name, description, location_type, parent_id, path,
                               capacity, current_count, utilization, 0 as level
                        FROM storage_locations
                        WHERE parent_id IS NULL
                        UNION ALL
                        SELECT sl.id, sl.name, sl.description, sl.location_type, sl.parent_id, sl.path,
                               sl.capacity, sl.current_count, sl.utilization, lt.level + 1
                        FROM storage_locations sl
                        JOIN location_tree lt ON sl.parent_id = lt.id
                    )
                    SELECT * FROM location_tree ORDER BY level, name
                """)

            locations = cursor.fetchall()
            return [dict(row) for row in locations]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch location hierarchy: {str(e)}")


@router.get("/{location_id}", response_model=StorageLocation)
async def get_location(location_id: UUID):
    """Get a specific storage location"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, name, description, location_type, parent_id, path,
                       capacity, current_count, utilization, barcode_id,
                       coordinates, metadata, created_at, updated_at
                FROM storage_locations
                WHERE id = %s
            """, (location_id,))
            location = cursor.fetchone()

            if not location:
                raise HTTPException(status_code=404, detail="Location not found")

            return dict(location)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch location: {str(e)}")


@router.get("/{location_id}/contents")
async def get_location_contents(location_id: UUID):
    """Get all documents and assets at a location"""
    try:
        with get_db_cursor() as cursor:
            # Get documents
            cursor.execute("""
                SELECT pd.id, pd.digital_document_id, pd.status, pd.last_seen_at,
                       d.title, d.document_type
                FROM physical_documents pd
                LEFT JOIN documents d ON pd.digital_document_id = d.id
                WHERE pd.location_id = %s
            """, (location_id,))
            documents = cursor.fetchall()

            # Get assets
            cursor.execute("""
                SELECT id, name, asset_type, status, metadata
                FROM physical_assets
                WHERE location_id = %s
            """, (location_id,))
            assets = cursor.fetchall()

            return {
                "documents": [dict(row) for row in documents],
                "assets": [dict(row) for row in assets]
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch location contents: {str(e)}")


@router.post("", response_model=StorageLocation)
async def create_location(location: StorageLocationCreate):
    """Create a new storage location"""
    try:
        # Build path
        path = f"/{location.name}"
        if location.parent_id:
            with get_db_cursor() as cursor:
                cursor.execute("""
                    SELECT path FROM storage_locations WHERE id = %s
                """, (location.parent_id,))
                parent = cursor.fetchone()
                if parent:
                    path = f"{parent['path']}/{location.name}"

        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO storage_locations (
                    name, description, location_type, parent_id, path,
                    capacity, barcode_id, coordinates, metadata
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, name, description, location_type, parent_id, path,
                          capacity, current_count, utilization, barcode_id,
                          coordinates, metadata, created_at, updated_at
            """, (
                location.name,
                location.description,
                location.location_type.value,
                location.parent_id,
                path,
                location.capacity,
                location.barcode_id,
                location.coordinates,
                location.metadata
            ))
            new_location = cursor.fetchone()
            return dict(new_location)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create location: {str(e)}")


@router.patch("/{location_id}", response_model=StorageLocation)
async def update_location(location_id: UUID, location: StorageLocationUpdate):
    """Update a storage location"""
    try:
        # Build update query
        update_fields = []
        params = []

        if location.name is not None:
            update_fields.append("name = %s")
            params.append(location.name)

        if location.description is not None:
            update_fields.append("description = %s")
            params.append(location.description)

        if location.location_type is not None:
            update_fields.append("location_type = %s")
            params.append(location.location_type.value)

        if location.capacity is not None:
            update_fields.append("capacity = %s")
            params.append(location.capacity)

        if location.barcode_id is not None:
            update_fields.append("barcode_id = %s")
            params.append(location.barcode_id)

        if location.coordinates is not None:
            update_fields.append("coordinates = %s")
            params.append(location.coordinates)

        if location.metadata is not None:
            update_fields.append("metadata = %s")
            params.append(location.metadata)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        update_fields.append("updated_at = NOW()")
        params.append(location_id)

        with get_db_cursor(commit=True) as cursor:
            cursor.execute(f"""
                UPDATE storage_locations
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING id, name, description, location_type, parent_id, path,
                          capacity, current_count, utilization, barcode_id,
                          coordinates, metadata, created_at, updated_at
            """, params)
            updated_location = cursor.fetchone()

            if not updated_location:
                raise HTTPException(status_code=404, detail="Location not found")

            return dict(updated_location)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update location: {str(e)}")


@router.delete("/{location_id}")
async def delete_location(location_id: UUID):
    """Delete a storage location"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if location has items
            cursor.execute("""
                SELECT
                    (SELECT COUNT(*) FROM physical_documents WHERE location_id = %s) +
                    (SELECT COUNT(*) FROM physical_assets WHERE location_id = %s) as total_items
            """, (location_id, location_id))
            result = cursor.fetchone()

            if result['total_items'] > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot delete location with {result['total_items']} items"
                )

            # Delete location
            cursor.execute("""
                DELETE FROM storage_locations WHERE id = %s RETURNING id
            """, (location_id,))
            deleted = cursor.fetchone()

            if not deleted:
                raise HTTPException(status_code=404, detail="Location not found")

            return {"message": "Location deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete location: {str(e)}")


# ==========================================
# Location Movement Endpoints
# ==========================================

@router.post("/movements", response_model=LocationMovement)
async def record_movement(movement: LocationMovementCreate, user_id: UUID = Query(...)):
    """Record a location movement for a document or asset"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # Create movement record
            cursor.execute("""
                INSERT INTO location_movements (
                    item_type, item_id, from_location_id, to_location_id, moved_by, notes
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, item_type, item_id, from_location_id, to_location_id,
                          moved_by, moved_at, notes
            """, (
                movement.item_type,
                movement.item_id,
                movement.from_location_id,
                movement.to_location_id,
                user_id,
                movement.notes
            ))
            new_movement = cursor.fetchone()

            # Update item location
            if movement.item_type == "document":
                cursor.execute("""
                    UPDATE physical_documents
                    SET location_id = %s, updated_at = NOW()
                    WHERE digital_document_id = %s
                """, (movement.to_location_id, movement.item_id))
            elif movement.item_type == "asset":
                cursor.execute("""
                    UPDATE physical_assets
                    SET location_id = %s, updated_at = NOW()
                    WHERE id = %s
                """, (movement.to_location_id, movement.item_id))

            return dict(new_movement)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record movement: {str(e)}")


@router.get("/movements")
async def list_movements(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    item_id: Optional[UUID] = None,
    location_id: Optional[UUID] = None
):
    """List location movements with pagination"""
    try:
        offset = (page - 1) * page_size

        # Build query
        where_clauses = []
        params = []

        if item_id:
            where_clauses.append("item_id = %s")
            params.append(item_id)

        if location_id:
            where_clauses.append("(from_location_id = %s OR to_location_id = %s)")
            params.extend([location_id, location_id])

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        with get_db_cursor() as cursor:
            # Get total count
            cursor.execute(f"""
                SELECT COUNT(*) FROM location_movements WHERE {where_sql}
            """, params)
            total = cursor.fetchone()['count']

            # Get movements
            cursor.execute(f"""
                SELECT lm.*,
                       fl.name as from_location_name,
                       tl.name as to_location_name
                FROM location_movements lm
                LEFT JOIN storage_locations fl ON lm.from_location_id = fl.id
                LEFT JOIN storage_locations tl ON lm.to_location_id = tl.id
                WHERE {where_sql}
                ORDER BY lm.moved_at DESC
                LIMIT %s OFFSET %s
            """, params + [page_size, offset])
            movements = cursor.fetchall()

            return {
                "movements": [dict(row) for row in movements],
                "total": total,
                "page": page,
                "page_size": page_size
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch movements: {str(e)}")


@router.get("/utilization")
async def get_utilization_report():
    """Get storage utilization report"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT
                    location_type,
                    COUNT(*) as location_count,
                    SUM(capacity) as total_capacity,
                    SUM(current_count) as total_items,
                    AVG(utilization) as avg_utilization,
                    MAX(utilization) as max_utilization
                FROM storage_locations
                WHERE capacity > 0
                GROUP BY location_type
                ORDER BY location_type
            """)
            utilization = cursor.fetchall()

            # Get locations near capacity
            cursor.execute("""
                SELECT id, name, location_type, capacity, current_count, utilization
                FROM storage_locations
                WHERE utilization > 80 AND capacity > 0
                ORDER BY utilization DESC
                LIMIT 10
            """)
            near_capacity = cursor.fetchall()

            return {
                "by_type": [dict(row) for row in utilization],
                "near_capacity": [dict(row) for row in near_capacity]
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate utilization report: {str(e)}")

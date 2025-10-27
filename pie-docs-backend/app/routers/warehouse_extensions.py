"""
Warehouse Management System - Extended API Endpoints
DELETE operations, Movement tracking, Children navigation
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.database import get_db_cursor
from app.models.warehouse import (
    Location, Warehouse, Zone, Shelf, Rack, PhysicalDocument,
    DocumentMovement, DocumentMovementCreate
)

router = APIRouter(prefix="/api/v1/warehouse", tags=["warehouse"])


# ==========================================
# DELETE OPERATIONS
# ==========================================

@router.delete("/locations/{location_id}")
async def delete_location(location_id: UUID):
    """Delete a location (cascades to warehouses, zones, etc.)"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if location has warehouses
            cursor.execute("SELECT COUNT(*) as count FROM warehouses WHERE location_id = %s", (location_id,))
            count = cursor.fetchone()['count']

            if count > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot delete location: {count} warehouse(s) exist. Delete warehouses first."
                )

            # Delete location
            cursor.execute("DELETE FROM locations WHERE id = %s RETURNING id", (location_id,))
            deleted = cursor.fetchone()

            if not deleted:
                raise HTTPException(status_code=404, detail="Location not found")

            return {"message": "Location deleted successfully", "id": str(deleted['id'])}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete location: {str(e)}")


@router.delete("/warehouses/{warehouse_id}")
async def delete_warehouse(warehouse_id: UUID):
    """Delete a warehouse (must have no zones)"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if warehouse has zones
            cursor.execute("SELECT COUNT(*) as count FROM zones WHERE warehouse_id = %s", (warehouse_id,))
            count = cursor.fetchone()['count']

            if count > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot delete warehouse: {count} zone(s) exist. Delete zones first."
                )

            # Delete warehouse
            cursor.execute("DELETE FROM warehouses WHERE id = %s RETURNING id", (warehouse_id,))
            deleted = cursor.fetchone()

            if not deleted:
                raise HTTPException(status_code=404, detail="Warehouse not found")

            return {"message": "Warehouse deleted successfully", "id": str(deleted['id'])}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete warehouse: {str(e)}")


@router.delete("/zones/{zone_id}")
async def delete_zone(zone_id: UUID):
    """Delete a zone (must have no shelves)"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if zone has shelves
            cursor.execute("SELECT COUNT(*) as count FROM shelves WHERE zone_id = %s", (zone_id,))
            count = cursor.fetchone()['count']

            if count > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot delete zone: {count} shelf/shelves exist. Delete shelves first."
                )

            # Delete zone
            cursor.execute("DELETE FROM zones WHERE id = %s RETURNING id", (zone_id,))
            deleted = cursor.fetchone()

            if not deleted:
                raise HTTPException(status_code=404, detail="Zone not found")

            return {"message": "Zone deleted successfully", "id": str(deleted['id'])}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete zone: {str(e)}")


@router.delete("/shelves/{shelf_id}")
async def delete_shelf(shelf_id: UUID):
    """Delete a shelf (must have no racks)"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if shelf has racks
            cursor.execute("SELECT COUNT(*) as count FROM racks WHERE shelf_id = %s", (shelf_id,))
            count = cursor.fetchone()['count']

            if count > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot delete shelf: {count} rack(s) exist. Delete racks first."
                )

            # Delete shelf
            cursor.execute("DELETE FROM shelves WHERE id = %s RETURNING id", (shelf_id,))
            deleted = cursor.fetchone()

            if not deleted:
                raise HTTPException(status_code=404, detail="Shelf not found")

            return {"message": "Shelf deleted successfully", "id": str(deleted['id'])}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete shelf: {str(e)}")


@router.delete("/racks/{rack_id}")
async def delete_rack(rack_id: UUID):
    """Delete a rack (must have no documents)"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if rack has documents
            cursor.execute("SELECT COUNT(*) as count FROM physical_documents WHERE rack_id = %s", (rack_id,))
            count = cursor.fetchone()['count']

            if count > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot delete rack: {count} document(s) exist. Delete documents first."
                )

            # Delete rack
            cursor.execute("DELETE FROM racks WHERE id = %s RETURNING id", (rack_id,))
            deleted = cursor.fetchone()

            if not deleted:
                raise HTTPException(status_code=404, detail="Rack not found")

            return {"message": "Rack deleted successfully", "id": str(deleted['id'])}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete rack: {str(e)}")


@router.delete("/documents/{document_id}")
async def delete_document(document_id: UUID):
    """Delete a physical document"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # Delete document
            cursor.execute("DELETE FROM physical_documents WHERE id = %s RETURNING id", (document_id,))
            deleted = cursor.fetchone()

            if not deleted:
                raise HTTPException(status_code=404, detail="Document not found")

            return {"message": "Document deleted successfully", "id": str(deleted['id'])}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")


@router.delete("/customer-assignments/{assignment_id}")
async def delete_customer_assignment(assignment_id: UUID):
    """Delete a customer rack assignment"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("DELETE FROM customer_rack_assignments WHERE id = %s RETURNING id", (assignment_id,))
            deleted = cursor.fetchone()

            if not deleted:
                raise HTTPException(status_code=404, detail="Assignment not found")

            return {"message": "Customer assignment deleted successfully", "id": str(deleted['id'])}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete assignment: {str(e)}")


# ==========================================
# DOCUMENT MOVEMENT TRACKING
# ==========================================

@router.post("/documents/{document_id}/move", response_model=DocumentMovement)
async def move_document(
    document_id: UUID,
    movement: DocumentMovementCreate,
    user_id: UUID = Query(...)
):
    """Move a document to a new rack"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # Get current document location
            cursor.execute("SELECT rack_id FROM physical_documents WHERE id = %s", (document_id,))
            doc = cursor.fetchone()

            if not doc:
                raise HTTPException(status_code=404, detail="Document not found")

            from_rack_id = doc['rack_id']

            # Get location paths
            cursor.execute("""
                SELECT
                    l.name || ' > ' || w.name || ' > ' || z.name || ' > ' || s.name || ' > ' || r.name as path
                FROM racks r
                JOIN shelves s ON r.shelf_id = s.id
                JOIN zones z ON s.zone_id = z.id
                JOIN warehouses w ON z.warehouse_id = w.id
                JOIN locations l ON w.location_id = l.id
                WHERE r.id = %s
            """, (from_rack_id,))
            from_path = cursor.fetchone()['path'] if cursor.rowcount > 0 else "Unknown"

            cursor.execute("""
                SELECT
                    l.name || ' > ' || w.name || ' > ' || z.name || ' > ' || s.name || ' > ' || r.name as path
                FROM racks r
                JOIN shelves s ON r.shelf_id = s.id
                JOIN zones z ON s.zone_id = z.id
                JOIN warehouses w ON z.warehouse_id = w.id
                JOIN locations l ON w.location_id = l.id
                WHERE r.id = %s
            """, (movement.to_rack_id,))
            to_path_result = cursor.fetchone()
            if not to_path_result:
                raise HTTPException(status_code=404, detail="Destination rack not found")
            to_path = to_path_result['path']

            # Create movement record
            cursor.execute("""
                INSERT INTO document_movements (
                    document_id, from_rack_id, to_rack_id, from_location_path, to_location_path,
                    movement_type, reason, notes, requested_by
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                document_id, from_rack_id, movement.to_rack_id, from_path, to_path,
                movement.movement_type, movement.reason, movement.notes, user_id
            ))

            movement_record = cursor.fetchone()

            # Update document location if movement type is not 'retrieval'
            if movement.movement_type in ['initial_storage', 'relocation', 'return']:
                cursor.execute("""
                    UPDATE physical_documents
                    SET rack_id = %s, status = 'stored'
                    WHERE id = %s
                """, (movement.to_rack_id, document_id))

            return dict(movement_record)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to move document: {str(e)}")


@router.get("/documents/{document_id}/movements", response_model=List[DocumentMovement])
async def get_document_movements(document_id: UUID):
    """Get movement history for a specific document (accepts digital or physical document ID)"""
    try:
        with get_db_cursor() as cursor:
            # Query supports both digital and physical document IDs
            cursor.execute("""
                SELECT DISTINCT dm.* FROM document_movements dm
                LEFT JOIN physical_documents pd ON dm.document_id = pd.id
                WHERE dm.document_id = %s OR pd.digital_document_id = %s
                ORDER BY dm.requested_at DESC
            """, (str(document_id), str(document_id)))
            movements = cursor.fetchall()
            return [dict(row) for row in movements]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch movements: {str(e)}")


@router.get("/movements", response_model=List[DocumentMovement])
async def list_movements(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    movement_type: Optional[str] = None,
    status: Optional[str] = None
):
    """List all document movements with pagination"""
    try:
        offset = (page - 1) * page_size
        where_clauses = []
        params = []

        if movement_type:
            where_clauses.append("movement_type = %s")
            params.append(movement_type)

        if status:
            where_clauses.append("status = %s")
            params.append(status)

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        with get_db_cursor() as cursor:
            cursor.execute(f"""
                SELECT * FROM document_movements
                WHERE {where_sql}
                ORDER BY requested_at DESC
                LIMIT %s OFFSET %s
            """, params + [page_size, offset])

            movements = cursor.fetchall()
            return [dict(row) for row in movements]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch movements: {str(e)}")


@router.get("/movements/{movement_id}", response_model=DocumentMovement)
async def get_movement(movement_id: UUID):
    """Get a specific movement record"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM document_movements WHERE id = %s", (movement_id,))
            movement = cursor.fetchone()

            if not movement:
                raise HTTPException(status_code=404, detail="Movement not found")

            return dict(movement)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch movement: {str(e)}")


# ==========================================
# CHILDREN / CONTENTS NAVIGATION
# ==========================================

@router.get("/locations/{location_id}/warehouses", response_model=List[Warehouse])
async def get_location_warehouses(location_id: UUID):
    """Get all warehouses in a location"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM warehouses
                WHERE location_id = %s
                ORDER BY name
            """, (location_id,))
            warehouses = cursor.fetchall()
            return [dict(row) for row in warehouses]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch warehouses: {str(e)}")


@router.get("/warehouses/{warehouse_id}/zones", response_model=List[Zone])
async def get_warehouse_zones(warehouse_id: UUID):
    """Get all zones in a warehouse"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM zones
                WHERE warehouse_id = %s
                ORDER BY name
            """, (warehouse_id,))
            zones = cursor.fetchall()
            return [dict(row) for row in zones]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch zones: {str(e)}")


@router.get("/zones/{zone_id}/shelves", response_model=List[Shelf])
async def get_zone_shelves(zone_id: UUID):
    """Get all shelves in a zone"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM shelves
                WHERE zone_id = %s
                ORDER BY position
            """, (zone_id,))
            shelves = cursor.fetchall()
            return [dict(row) for row in shelves]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch shelves: {str(e)}")


@router.get("/shelves/{shelf_id}/racks", response_model=List[Rack])
async def get_shelf_racks(shelf_id: UUID):
    """Get all racks on a shelf"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM racks
                WHERE shelf_id = %s
                ORDER BY position_on_shelf
            """, (shelf_id,))
            racks = cursor.fetchall()
            return [dict(row) for row in racks]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch racks: {str(e)}")


@router.get("/racks/{rack_id}/documents", response_model=List[PhysicalDocument])
async def get_rack_documents(rack_id: UUID):
    """Get all documents in a rack"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM physical_documents
                WHERE rack_id = %s
                ORDER BY title
            """, (rack_id,))
            documents = cursor.fetchall()
            return [dict(row) for row in documents]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch documents: {str(e)}")

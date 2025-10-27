"""
Warehouse Management System - Mobile Scanning Module
Mobile barcode scanning, inventory verification, offline sync
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime
from enum import Enum

from app.database import get_db_cursor

router = APIRouter(prefix="/api/v1/warehouse/mobile", tags=["warehouse"])


# ==========================================
# PYDANTIC MODELS
# ==========================================

class ScanMode(str, Enum):
    """Scan modes for mobile app"""
    LOOKUP = "lookup"  # Just lookup entity info
    INVENTORY = "inventory"  # Verify inventory at location
    DOCUMENT_CAPTURE = "document_capture"  # Add new document
    MOVEMENT = "movement"  # Record document movement


class ScanSessionStatus(str, Enum):
    """Scan session status"""
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class EntityType(str, Enum):
    """Scanned entity types"""
    ZONE = "zone"
    SHELF = "shelf"
    RACK = "rack"
    DOCUMENT = "document"
    UNKNOWN = "unknown"


class ScanSessionCreate(BaseModel):
    """Create a new scan session"""
    mode: ScanMode
    location_id: Optional[UUID] = None
    warehouse_id: Optional[UUID] = None
    zone_id: Optional[UUID] = None
    user_id: UUID
    notes: Optional[str] = None


class ScanSessionUpdate(BaseModel):
    """Update scan session"""
    status: Optional[ScanSessionStatus] = None
    notes: Optional[str] = None
    completed_at: Optional[datetime] = None


class ScanSession(BaseModel):
    """Scan session response"""
    id: UUID
    mode: ScanMode
    status: ScanSessionStatus
    location_id: Optional[UUID]
    warehouse_id: Optional[UUID]
    zone_id: Optional[UUID]
    user_id: UUID
    scan_count: int
    started_at: datetime
    completed_at: Optional[datetime]
    notes: Optional[str]


class ScanRecordCreate(BaseModel):
    """Create a scan record"""
    session_id: UUID
    barcode: str
    entity_type: Optional[EntityType] = None  # Auto-detected if not provided
    entity_id: Optional[UUID] = None  # Auto-looked up if not provided
    location_lat: Optional[float] = None
    location_lon: Optional[float] = None
    photo_url: Optional[str] = None
    notes: Optional[str] = None
    offline: bool = False  # True if scanned while offline


class ScanRecord(BaseModel):
    """Scan record response"""
    id: UUID
    session_id: UUID
    barcode: str
    entity_type: EntityType
    entity_id: Optional[UUID]
    entity_name: Optional[str]
    entity_location_path: Optional[str]
    scanned_at: datetime
    location_lat: Optional[float]
    location_lon: Optional[float]
    photo_url: Optional[str]
    notes: Optional[str]
    verified: bool
    offline: bool


class InventoryVerification(BaseModel):
    """Inventory verification result"""
    rack_id: UUID
    expected_documents: List[Dict[str, Any]]
    scanned_documents: List[str]  # Barcodes
    matched: List[Dict[str, Any]]
    missing: List[Dict[str, Any]]
    unexpected: List[str]  # Barcodes that shouldn't be here
    accuracy_percentage: float


class BulkScanSync(BaseModel):
    """Bulk sync for offline scans"""
    scans: List[ScanRecordCreate]


class EntityLookupResponse(BaseModel):
    """Response for barcode lookup"""
    barcode: str
    entity_type: EntityType
    entity_id: Optional[UUID]
    entity_name: Optional[str]
    location_path: Optional[str]
    details: Optional[Dict[str, Any]]
    found: bool


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def detect_entity_type(barcode: str) -> EntityType:
    """Detect entity type from barcode prefix"""
    barcode_upper = barcode.upper()
    if barcode_upper.startswith('ZN-'):
        return EntityType.ZONE
    elif barcode_upper.startswith('SH-'):
        return EntityType.SHELF
    elif barcode_upper.startswith('RK-'):
        return EntityType.RACK
    elif barcode_upper.startswith('DOC-'):
        return EntityType.DOCUMENT
    return EntityType.UNKNOWN


def lookup_entity(cursor, barcode: str, entity_type: EntityType) -> Optional[Dict[str, Any]]:
    """Look up entity by barcode and type"""
    if entity_type == EntityType.ZONE:
        cursor.execute("""
            SELECT z.id, z.name, z.barcode,
                   l.name || ' > ' || w.name || ' > ' || z.name as location_path
            FROM zones z
            JOIN warehouses w ON z.warehouse_id = w.id
            JOIN locations l ON w.location_id = l.id
            WHERE z.barcode = %s AND z.status = 'active'
        """, (barcode,))
    elif entity_type == EntityType.SHELF:
        cursor.execute("""
            SELECT s.id, s.name, s.barcode,
                   l.name || ' > ' || w.name || ' > ' || z.name || ' > ' || s.name as location_path
            FROM shelves s
            JOIN zones z ON s.zone_id = z.id
            JOIN warehouses w ON z.warehouse_id = w.id
            JOIN locations l ON w.location_id = l.id
            WHERE s.barcode = %s AND s.status = 'active'
        """, (barcode,))
    elif entity_type == EntityType.RACK:
        cursor.execute("""
            SELECT r.id, r.name, r.barcode,
                   l.name || ' > ' || w.name || ' > ' || z.name || ' > ' || s.name || ' > ' || r.name as location_path
            FROM racks r
            JOIN shelves s ON r.shelf_id = s.id
            JOIN zones z ON s.zone_id = z.id
            JOIN warehouses w ON z.warehouse_id = w.id
            JOIN locations l ON w.location_id = l.id
            WHERE r.barcode = %s AND r.status = 'active'
        """, (barcode,))
    elif entity_type == EntityType.DOCUMENT:
        cursor.execute("""
            SELECT d.id, d.title as name, d.barcode,
                   l.name || ' > ' || w.name || ' > ' || z.name || ' > ' || s.name || ' > ' || r.name as location_path
            FROM physical_documents d
            LEFT JOIN racks r ON d.rack_id = r.id
            LEFT JOIN shelves s ON r.shelf_id = s.id
            LEFT JOIN zones z ON s.zone_id = z.id
            LEFT JOIN warehouses w ON z.warehouse_id = w.id
            LEFT JOIN locations l ON w.location_id = l.id
            WHERE d.barcode = %s
        """, (barcode,))
    else:
        return None

    result = cursor.fetchone()
    return dict(result) if result else None


# ==========================================
# SCAN SESSION ENDPOINTS
# ==========================================

@router.post("/sessions", response_model=ScanSession)
async def create_scan_session(session: ScanSessionCreate):
    """Start a new mobile scanning session"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO scan_sessions (
                    mode, status, location_id, warehouse_id, zone_id, user_id, notes
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, mode, status, location_id, warehouse_id, zone_id, user_id,
                          started_at, completed_at, notes
            """, (
                session.mode, ScanSessionStatus.ACTIVE, session.location_id,
                session.warehouse_id, session.zone_id, session.user_id, session.notes
            ))

            result = cursor.fetchone()
            session_data = dict(result)
            session_data['scan_count'] = 0

            return session_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")


@router.get("/sessions", response_model=List[ScanSession])
async def list_scan_sessions(
    user_id: Optional[UUID] = None,
    status: Optional[ScanSessionStatus] = None,
    mode: Optional[ScanMode] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100)
):
    """List scan sessions with filters"""
    try:
        offset = (page - 1) * page_size
        where_clauses = []
        params = []

        if user_id:
            where_clauses.append("s.user_id = %s")
            params.append(user_id)

        if status:
            where_clauses.append("s.status = %s")
            params.append(status)

        if mode:
            where_clauses.append("s.mode = %s")
            params.append(mode)

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        with get_db_cursor() as cursor:
            cursor.execute(f"""
                SELECT s.*, COUNT(sr.id) as scan_count
                FROM scan_sessions s
                LEFT JOIN scan_records sr ON s.id = sr.session_id
                WHERE {where_sql}
                GROUP BY s.id
                ORDER BY s.started_at DESC
                LIMIT %s OFFSET %s
            """, params + [page_size, offset])

            sessions = cursor.fetchall()
            return [dict(row) for row in sessions]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list sessions: {str(e)}")


@router.get("/sessions/{session_id}", response_model=ScanSession)
async def get_scan_session(session_id: UUID):
    """Get a specific scan session"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT s.*, COUNT(sr.id) as scan_count
                FROM scan_sessions s
                LEFT JOIN scan_records sr ON s.id = sr.session_id
                WHERE s.id = %s
                GROUP BY s.id
            """, (session_id,))

            session = cursor.fetchone()
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")

            return dict(session)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session: {str(e)}")


@router.patch("/sessions/{session_id}", response_model=ScanSession)
async def update_scan_session(session_id: UUID, update: ScanSessionUpdate):
    """Update a scan session (complete, cancel, add notes)"""
    try:
        update_fields = []
        params = []

        if update.status:
            update_fields.append("status = %s")
            params.append(update.status)

            if update.status == ScanSessionStatus.COMPLETED and not update.completed_at:
                update_fields.append("completed_at = NOW()")

        if update.notes is not None:
            update_fields.append("notes = %s")
            params.append(update.notes)

        if update.completed_at:
            update_fields.append("completed_at = %s")
            params.append(update.completed_at)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(session_id)

        with get_db_cursor(commit=True) as cursor:
            cursor.execute(f"""
                UPDATE scan_sessions
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING id, mode, status, location_id, warehouse_id, zone_id, user_id,
                          started_at, completed_at, notes
            """, params)

            result = cursor.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Session not found")

            # Get scan count
            cursor.execute("SELECT COUNT(*) as count FROM scan_records WHERE session_id = %s", (session_id,))
            count_result = cursor.fetchone()

            session_data = dict(result)
            session_data['scan_count'] = count_result['count']

            return session_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update session: {str(e)}")


# ==========================================
# SCAN RECORDING ENDPOINTS
# ==========================================

@router.post("/scans", response_model=ScanRecord)
async def record_scan(scan: ScanRecordCreate):
    """Record a barcode scan"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # Auto-detect entity type if not provided
            entity_type = scan.entity_type or detect_entity_type(scan.barcode)

            # Auto-lookup entity if not provided
            entity_id = scan.entity_id
            entity_name = None
            location_path = None
            verified = False

            if not entity_id and entity_type != EntityType.UNKNOWN:
                entity_info = lookup_entity(cursor, scan.barcode, entity_type)
                if entity_info:
                    entity_id = entity_info['id']
                    entity_name = entity_info['name']
                    location_path = entity_info['location_path']
                    verified = True

            # Insert scan record
            cursor.execute("""
                INSERT INTO scan_records (
                    session_id, barcode, entity_type, entity_id, entity_name, entity_location_path,
                    location_lat, location_lon, photo_url, notes, verified, offline
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                scan.session_id, scan.barcode, entity_type.value, entity_id, entity_name,
                location_path, scan.location_lat, scan.location_lon, scan.photo_url,
                scan.notes, verified, scan.offline
            ))

            result = cursor.fetchone()

            # Update barcode status to 'scanned' if entity found
            if verified and entity_id:
                table_name = f"{entity_type.value}s" if entity_type != EntityType.DOCUMENT else "physical_documents"
                cursor.execute(f"""
                    UPDATE {table_name}
                    SET barcode_status = 'scanned'
                    WHERE id = %s AND barcode_status != 'scanned'
                """, (entity_id,))

            return dict(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record scan: {str(e)}")


@router.post("/scans/bulk", response_model=Dict[str, Any])
async def bulk_record_scans(bulk_sync: BulkScanSync):
    """Bulk upload scans (for offline sync)"""
    try:
        successful = 0
        failed = 0
        errors = []

        with get_db_cursor(commit=True) as cursor:
            for scan in bulk_sync.scans:
                try:
                    # Auto-detect entity type
                    entity_type = scan.entity_type or detect_entity_type(scan.barcode)

                    # Auto-lookup entity
                    entity_id = scan.entity_id
                    entity_name = None
                    location_path = None
                    verified = False

                    if not entity_id and entity_type != EntityType.UNKNOWN:
                        entity_info = lookup_entity(cursor, scan.barcode, entity_type)
                        if entity_info:
                            entity_id = entity_info['id']
                            entity_name = entity_info['name']
                            location_path = entity_info['location_path']
                            verified = True

                    # Insert scan record
                    cursor.execute("""
                        INSERT INTO scan_records (
                            session_id, barcode, entity_type, entity_id, entity_name, entity_location_path,
                            location_lat, location_lon, photo_url, notes, verified, offline
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        scan.session_id, scan.barcode, entity_type.value, entity_id, entity_name,
                        location_path, scan.location_lat, scan.location_lon, scan.photo_url,
                        scan.notes, verified, scan.offline
                    ))

                    successful += 1
                except Exception as e:
                    failed += 1
                    errors.append({"barcode": scan.barcode, "error": str(e)})

        return {
            "total": len(bulk_sync.scans),
            "successful": successful,
            "failed": failed,
            "errors": errors
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk sync failed: {str(e)}")


@router.get("/sessions/{session_id}/scans", response_model=List[ScanRecord])
async def get_session_scans(session_id: UUID):
    """Get all scans for a session"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM scan_records
                WHERE session_id = %s
                ORDER BY scanned_at DESC
            """, (session_id,))

            scans = cursor.fetchall()
            return [dict(row) for row in scans]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get scans: {str(e)}")


# ==========================================
# BARCODE LOOKUP ENDPOINT
# ==========================================

@router.get("/lookup/{barcode}", response_model=EntityLookupResponse)
async def lookup_barcode(barcode: str):
    """Look up entity by barcode (quick lookup)"""
    try:
        entity_type = detect_entity_type(barcode)

        if entity_type == EntityType.UNKNOWN:
            return EntityLookupResponse(
                barcode=barcode,
                entity_type=EntityType.UNKNOWN,
                entity_id=None,
                entity_name=None,
                location_path=None,
                details=None,
                found=False
            )

        with get_db_cursor() as cursor:
            entity_info = lookup_entity(cursor, barcode, entity_type)

            if not entity_info:
                return EntityLookupResponse(
                    barcode=barcode,
                    entity_type=entity_type,
                    entity_id=None,
                    entity_name=None,
                    location_path=None,
                    details=None,
                    found=False
                )

            # Get additional details based on entity type
            entity_id = entity_info['id']
            details = {}

            if entity_type == EntityType.ZONE:
                cursor.execute("SELECT * FROM zones WHERE id = %s", (entity_id,))
                details = dict(cursor.fetchone())
            elif entity_type == EntityType.SHELF:
                cursor.execute("SELECT * FROM shelves WHERE id = %s", (entity_id,))
                details = dict(cursor.fetchone())
            elif entity_type == EntityType.RACK:
                cursor.execute("SELECT * FROM racks WHERE id = %s", (entity_id,))
                details = dict(cursor.fetchone())
            elif entity_type == EntityType.DOCUMENT:
                cursor.execute("SELECT * FROM physical_documents WHERE id = %s", (entity_id,))
                details = dict(cursor.fetchone())

            return EntityLookupResponse(
                barcode=barcode,
                entity_type=entity_type,
                entity_id=entity_id,
                entity_name=entity_info['name'],
                location_path=entity_info['location_path'],
                details=details,
                found=True
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lookup failed: {str(e)}")


# ==========================================
# INVENTORY VERIFICATION ENDPOINT
# ==========================================

@router.post("/inventory/verify/{rack_id}", response_model=InventoryVerification)
async def verify_rack_inventory(
    rack_id: UUID,
    scanned_barcodes: List[str]
):
    """Verify inventory in a rack against scanned barcodes"""
    try:
        with get_db_cursor() as cursor:
            # Get expected documents in rack
            cursor.execute("""
                SELECT id, title, barcode, document_type, status
                FROM physical_documents
                WHERE rack_id = %s
                ORDER BY title
            """, (rack_id,))

            expected_docs = [dict(row) for row in cursor.fetchall()]
            expected_barcodes = {doc['barcode'] for doc in expected_docs}
            scanned_set = set(scanned_barcodes)

            # Calculate matches, missing, and unexpected
            matched_barcodes = expected_barcodes & scanned_set
            missing_barcodes = expected_barcodes - scanned_set
            unexpected_barcodes = scanned_set - expected_barcodes

            matched = [doc for doc in expected_docs if doc['barcode'] in matched_barcodes]
            missing = [doc for doc in expected_docs if doc['barcode'] in missing_barcodes]

            # Calculate accuracy
            total_expected = len(expected_docs)
            accuracy = (len(matched) / total_expected * 100) if total_expected > 0 else 100.0

            return InventoryVerification(
                rack_id=rack_id,
                expected_documents=expected_docs,
                scanned_documents=scanned_barcodes,
                matched=matched,
                missing=missing,
                unexpected=list(unexpected_barcodes),
                accuracy_percentage=round(accuracy, 2)
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inventory verification failed: {str(e)}")

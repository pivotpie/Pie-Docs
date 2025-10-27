"""
Warehouse Management System - Print Management
Label printing for zones, shelves, racks, and documents
Integrates with existing physical print system
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from app.database import get_db_cursor

router = APIRouter(prefix="/api/v1/warehouse/print", tags=["warehouse"])


# ==========================================
# PYDANTIC MODELS
# ==========================================

class LabelSize(BaseModel):
    """Label dimensions"""
    width: float = Field(..., description="Width in mm")
    height: float = Field(..., description="Height in mm")


class WarehouseLabelType(BaseModel):
    """Warehouse label type configuration"""
    entity_type: str  # zone, shelf, rack, document
    label_size: LabelSize
    include_barcode: bool = True
    include_qr_code: bool = False
    include_location_path: bool = True
    include_capacity: bool = True
    font_size: int = 12


class PrintLabelRequest(BaseModel):
    """Request to print labels for warehouse entities"""
    entity_ids: List[UUID]
    entity_type: str  # zone, shelf, rack, document
    template_id: Optional[UUID] = None  # Use existing print template
    printer_id: Optional[UUID] = None  # Target printer
    copies: int = Field(default=1, ge=1, le=10)
    include_qr_code: bool = False
    notes: Optional[str] = None


class BatchPrintRequest(BaseModel):
    """Batch print request for multiple entity types"""
    zones: List[UUID] = []
    shelves: List[UUID] = []
    racks: List[UUID] = []
    documents: List[UUID] = []
    printer_id: Optional[UUID] = None
    copies: int = Field(default=1, ge=1, le=10)
    notes: Optional[str] = None


class PrintJobResponse(BaseModel):
    """Print job response"""
    job_id: UUID
    status: str
    entity_count: int
    printer_name: Optional[str]
    created_at: datetime
    message: str


class LabelData(BaseModel):
    """Label data for rendering"""
    entity_id: UUID
    entity_type: str
    entity_name: str
    barcode: str
    location_path: str
    capacity_info: Optional[Dict[str, Any]] = None
    qr_code_data: Optional[str] = None
    additional_info: Optional[Dict[str, Any]] = None


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def get_zone_label_data(cursor, zone_id: UUID) -> LabelData:
    """Get zone data for label printing"""
    cursor.execute("""
        SELECT
            z.id, z.name, z.code, z.barcode, z.zone_type,
            z.max_capacity, z.current_capacity,
            l.name || ' > ' || w.name || ' > ' || z.name as location_path,
            w.name as warehouse_name,
            l.name as location_name
        FROM zones z
        JOIN warehouses w ON z.warehouse_id = w.id
        JOIN locations l ON w.location_id = l.id
        WHERE z.id = %s
    """, (zone_id,))

    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Zone {zone_id} not found")

    data = dict(row)
    utilization = (data['current_capacity'] / data['max_capacity'] * 100) if data['max_capacity'] > 0 else 0

    return LabelData(
        entity_id=data['id'],
        entity_type='zone',
        entity_name=data['name'],
        barcode=data['barcode'],
        location_path=data['location_path'],
        capacity_info={
            'current': data['current_capacity'],
            'max': data['max_capacity'],
            'utilization': round(utilization, 1)
        },
        qr_code_data=data['barcode'],
        additional_info={
            'code': data['code'],
            'type': data['zone_type'],
            'warehouse': data['warehouse_name'],
            'location': data['location_name']
        }
    )


def get_shelf_label_data(cursor, shelf_id: UUID) -> LabelData:
    """Get shelf data for label printing"""
    cursor.execute("""
        SELECT
            s.id, s.name, s.barcode, s.position,
            s.max_capacity, s.current_capacity,
            l.name || ' > ' || w.name || ' > ' || z.name || ' > ' || s.name as location_path,
            z.name as zone_name,
            w.name as warehouse_name
        FROM shelves s
        JOIN zones z ON s.zone_id = z.id
        JOIN warehouses w ON z.warehouse_id = w.id
        JOIN locations l ON w.location_id = l.id
        WHERE s.id = %s
    """, (shelf_id,))

    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Shelf {shelf_id} not found")

    data = dict(row)
    utilization = (data['current_capacity'] / data['max_capacity'] * 100) if data['max_capacity'] > 0 else 0

    return LabelData(
        entity_id=data['id'],
        entity_type='shelf',
        entity_name=data['name'],
        barcode=data['barcode'],
        location_path=data['location_path'],
        capacity_info={
            'current': data['current_capacity'],
            'max': data['max_capacity'],
            'utilization': round(utilization, 1)
        },
        qr_code_data=data['barcode'],
        additional_info={
            'position': data['position'],
            'zone': data['zone_name'],
            'warehouse': data['warehouse_name']
        }
    )


def get_rack_label_data(cursor, rack_id: UUID) -> LabelData:
    """Get rack data for label printing"""
    cursor.execute("""
        SELECT
            r.id, r.name, r.barcode, r.position_on_shelf,
            r.max_capacity, r.current_capacity,
            l.name || ' > ' || w.name || ' > ' || z.name || ' > ' || s.name || ' > ' || r.name as location_path,
            s.name as shelf_name,
            z.name as zone_name
        FROM racks r
        JOIN shelves s ON r.shelf_id = s.id
        JOIN zones z ON s.zone_id = z.id
        JOIN warehouses w ON z.warehouse_id = w.id
        JOIN locations l ON w.location_id = l.id
        WHERE r.id = %s
    """, (rack_id,))

    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Rack {rack_id} not found")

    data = dict(row)
    utilization = (data['current_capacity'] / data['max_capacity'] * 100) if data['max_capacity'] > 0 else 0

    return LabelData(
        entity_id=data['id'],
        entity_type='rack',
        entity_name=data['name'],
        barcode=data['barcode'],
        location_path=data['location_path'],
        capacity_info={
            'current': data['current_capacity'],
            'max': data['max_capacity'],
            'utilization': round(utilization, 1)
        },
        qr_code_data=data['barcode'],
        additional_info={
            'position': data['position_on_shelf'],
            'shelf': data['shelf_name'],
            'zone': data['zone_name']
        }
    )


def get_document_label_data(cursor, document_id: UUID) -> LabelData:
    """Get document data for label printing"""
    cursor.execute("""
        SELECT
            d.id, d.title, d.barcode, d.document_type, d.status,
            COALESCE(
                l.name || ' > ' || w.name || ' > ' || z.name || ' > ' || s.name || ' > ' || r.name,
                'Not Assigned'
            ) as location_path,
            r.name as rack_name,
            d.created_at
        FROM physical_documents d
        LEFT JOIN racks r ON d.rack_id = r.id
        LEFT JOIN shelves s ON r.shelf_id = s.id
        LEFT JOIN zones z ON s.zone_id = z.id
        LEFT JOIN warehouses w ON z.warehouse_id = w.id
        LEFT JOIN locations l ON w.location_id = l.id
        WHERE d.id = %s
    """, (document_id,))

    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Document {document_id} not found")

    data = dict(row)

    return LabelData(
        entity_id=data['id'],
        entity_type='document',
        entity_name=data['title'],
        barcode=data['barcode'],
        location_path=data['location_path'],
        capacity_info=None,
        qr_code_data=data['barcode'],
        additional_info={
            'type': data['document_type'],
            'status': data['status'],
            'rack': data['rack_name'] if data['rack_name'] else 'Unassigned',
            'created': data['created_at'].strftime('%Y-%m-%d') if data['created_at'] else None
        }
    )


def create_print_job_record(cursor, entity_type: str, entity_ids: List[UUID], printer_id: Optional[UUID], copies: int, notes: Optional[str]) -> UUID:
    """Create a print job record in the database"""
    cursor.execute("""
        INSERT INTO warehouse_print_jobs (
            entity_type, entity_ids, printer_id, copies, status, notes
        )
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (entity_type, entity_ids, printer_id, copies, 'queued', notes))

    result = cursor.fetchone()
    return result['id']


# ==========================================
# PRINT ENDPOINTS
# ==========================================

@router.post("/labels", response_model=PrintJobResponse)
async def print_labels(request: PrintLabelRequest):
    """Print labels for warehouse entities"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # Get label data for all entities
            label_data_list = []

            for entity_id in request.entity_ids:
                if request.entity_type == 'zone':
                    label_data = get_zone_label_data(cursor, entity_id)
                elif request.entity_type == 'shelf':
                    label_data = get_shelf_label_data(cursor, entity_id)
                elif request.entity_type == 'rack':
                    label_data = get_rack_label_data(cursor, entity_id)
                elif request.entity_type == 'document':
                    label_data = get_document_label_data(cursor, entity_id)
                else:
                    raise HTTPException(status_code=400, detail=f"Invalid entity type: {request.entity_type}")

                label_data_list.append(label_data)

            # Create print job record
            job_id = create_print_job_record(
                cursor, request.entity_type, request.entity_ids,
                request.printer_id, request.copies, request.notes
            )

            # Get printer name if specified
            printer_name = None
            if request.printer_id:
                cursor.execute("SELECT name FROM printers WHERE id = %s", (request.printer_id,))
                printer_row = cursor.fetchone()
                printer_name = printer_row['name'] if printer_row else None

            # Update barcode status to 'printed'
            table_map = {
                'zone': 'zones',
                'shelf': 'shelves',
                'rack': 'racks',
                'document': 'physical_documents'
            }
            table_name = table_map[request.entity_type]

            for entity_id in request.entity_ids:
                cursor.execute(f"""
                    UPDATE {table_name}
                    SET barcode_status = 'printed'
                    WHERE id = %s AND barcode_status IN ('generated', 'assigned')
                """, (entity_id,))

            return PrintJobResponse(
                job_id=job_id,
                status='queued',
                entity_count=len(request.entity_ids) * request.copies,
                printer_name=printer_name,
                created_at=datetime.now(),
                message=f"Print job created for {len(request.entity_ids)} {request.entity_type}(s)"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create print job: {str(e)}")


@router.post("/batch", response_model=PrintJobResponse)
async def batch_print_labels(request: BatchPrintRequest):
    """Batch print labels for multiple entity types"""
    try:
        total_count = len(request.zones) + len(request.shelves) + len(request.racks) + len(request.documents)

        if total_count == 0:
            raise HTTPException(status_code=400, detail="No entities specified for printing")

        with get_db_cursor(commit=True) as cursor:
            job_ids = []

            # Print zone labels
            if request.zones:
                job_id = create_print_job_record(cursor, 'zone', request.zones, request.printer_id, request.copies, request.notes)
                job_ids.append(job_id)
                for zone_id in request.zones:
                    cursor.execute("UPDATE zones SET barcode_status = 'printed' WHERE id = %s", (zone_id,))

            # Print shelf labels
            if request.shelves:
                job_id = create_print_job_record(cursor, 'shelf', request.shelves, request.printer_id, request.copies, request.notes)
                job_ids.append(job_id)
                for shelf_id in request.shelves:
                    cursor.execute("UPDATE shelves SET barcode_status = 'printed' WHERE id = %s", (shelf_id,))

            # Print rack labels
            if request.racks:
                job_id = create_print_job_record(cursor, 'rack', request.racks, request.printer_id, request.copies, request.notes)
                job_ids.append(job_id)
                for rack_id in request.racks:
                    cursor.execute("UPDATE racks SET barcode_status = 'printed' WHERE id = %s", (rack_id,))

            # Print document labels
            if request.documents:
                job_id = create_print_job_record(cursor, 'document', request.documents, request.printer_id, request.copies, request.notes)
                job_ids.append(job_id)
                for doc_id in request.documents:
                    cursor.execute("UPDATE physical_documents SET barcode_status = 'printed' WHERE id = %s", (doc_id,))

            # Get printer name
            printer_name = None
            if request.printer_id:
                cursor.execute("SELECT name FROM printers WHERE id = %s", (request.printer_id,))
                printer_row = cursor.fetchone()
                printer_name = printer_row['name'] if printer_row else None

            return PrintJobResponse(
                job_id=job_ids[0],  # Return first job ID as reference
                status='queued',
                entity_count=total_count * request.copies,
                printer_name=printer_name,
                created_at=datetime.now(),
                message=f"Batch print job created for {total_count} entities across {len(job_ids)} print jobs"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create batch print job: {str(e)}")


@router.get("/labels/preview/{entity_type}/{entity_id}", response_model=LabelData)
async def preview_label(entity_type: str, entity_id: UUID):
    """Preview label data for an entity"""
    try:
        with get_db_cursor() as cursor:
            if entity_type == 'zone':
                return get_zone_label_data(cursor, entity_id)
            elif entity_type == 'shelf':
                return get_shelf_label_data(cursor, entity_id)
            elif entity_type == 'rack':
                return get_rack_label_data(cursor, entity_id)
            elif entity_type == 'document':
                return get_document_label_data(cursor, entity_id)
            else:
                raise HTTPException(status_code=400, detail=f"Invalid entity type: {entity_type}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to preview label: {str(e)}")


@router.get("/jobs", response_model=List[Dict[str, Any]])
async def list_print_jobs(
    entity_type: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100)
):
    """List warehouse print jobs"""
    try:
        offset = (page - 1) * page_size
        where_clauses = []
        params = []

        if entity_type:
            where_clauses.append("entity_type = %s")
            params.append(entity_type)

        if status:
            where_clauses.append("status = %s")
            params.append(status)

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        with get_db_cursor() as cursor:
            cursor.execute(f"""
                SELECT j.*, p.name as printer_name
                FROM warehouse_print_jobs j
                LEFT JOIN printers p ON j.printer_id = p.id
                WHERE {where_sql}
                ORDER BY j.created_at DESC
                LIMIT %s OFFSET %s
            """, params + [page_size, offset])

            jobs = cursor.fetchall()
            return [dict(row) for row in jobs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list print jobs: {str(e)}")


@router.get("/jobs/{job_id}", response_model=Dict[str, Any])
async def get_print_job(job_id: UUID):
    """Get a specific print job"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT j.*, p.name as printer_name
                FROM warehouse_print_jobs j
                LEFT JOIN printers p ON j.printer_id = p.id
                WHERE j.id = %s
            """, (job_id,))

            job = cursor.fetchone()
            if not job:
                raise HTTPException(status_code=404, detail="Print job not found")

            return dict(job)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get print job: {str(e)}")


@router.patch("/jobs/{job_id}/status")
async def update_print_job_status(job_id: UUID, status: str):
    """Update print job status"""
    valid_statuses = ['queued', 'printing', 'completed', 'failed', 'cancelled']
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE warehouse_print_jobs
                SET status = %s, updated_at = NOW()
                WHERE id = %s
                RETURNING id
            """, (status, job_id))

            result = cursor.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Print job not found")

            return {"message": f"Print job status updated to {status}", "job_id": str(result['id'])}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update print job: {str(e)}")

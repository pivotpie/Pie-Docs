"""
Physical Documents - Print Management API Router
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from uuid import UUID

from app.database import get_db_cursor
from app.models.physical_documents import (
    PrintTemplate, PrintTemplateCreate,
    Printer, PrinterCreate, PrinterUpdate,
    PrintJob, PrintJobCreate, PrintJobStatus
)

router = APIRouter(prefix="/api/v1/physical/print", tags=["physical-print"])


# ==========================================
# Print Template Endpoints
# ==========================================

@router.get("/templates", response_model=List[PrintTemplate])
async def list_print_templates():
    """Get all print templates"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, name, description, dimensions, elements, is_default,
                       created_at, updated_at
                FROM print_templates
                ORDER BY is_default DESC, name
            """)
            templates = cursor.fetchall()
            return [dict(row) for row in templates]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch templates: {str(e)}")


@router.get("/templates/{template_id}", response_model=PrintTemplate)
async def get_print_template(template_id: UUID):
    """Get a specific print template"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, name, description, dimensions, elements, is_default,
                       created_at, updated_at
                FROM print_templates
                WHERE id = %s
            """, (template_id,))
            template = cursor.fetchone()

            if not template:
                raise HTTPException(status_code=404, detail="Template not found")

            return dict(template)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch template: {str(e)}")


@router.post("/templates", response_model=PrintTemplate)
async def create_print_template(template: PrintTemplateCreate):
    """Create a new print template"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # If setting as default, unset other defaults
            if template.is_default:
                cursor.execute("""
                    UPDATE print_templates SET is_default = FALSE
                """)

            cursor.execute("""
                INSERT INTO print_templates (name, description, dimensions, elements, is_default)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, name, description, dimensions, elements, is_default,
                          created_at, updated_at
            """, (
                template.name,
                template.description,
                template.dimensions,
                template.elements,
                template.is_default
            ))
            new_template = cursor.fetchone()
            return dict(new_template)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create template: {str(e)}")


@router.delete("/templates/{template_id}")
async def delete_print_template(template_id: UUID):
    """Delete a print template"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                DELETE FROM print_templates WHERE id = %s RETURNING id
            """, (template_id,))
            result = cursor.fetchone()

            if not result:
                raise HTTPException(status_code=404, detail="Template not found")

            return {"message": "Template deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete template: {str(e)}")


# ==========================================
# Printer Endpoints
# ==========================================

@router.get("/printers", response_model=List[Printer])
async def list_printers():
    """Get all printers"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, name, printer_type, model, status, capabilities,
                       is_default, created_at, updated_at
                FROM printers
                ORDER BY is_default DESC, name
            """)
            printers = cursor.fetchall()
            return [dict(row) for row in printers]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch printers: {str(e)}")


@router.get("/printers/{printer_id}", response_model=Printer)
async def get_printer(printer_id: UUID):
    """Get a specific printer"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, name, printer_type, model, status, capabilities,
                       is_default, created_at, updated_at
                FROM printers
                WHERE id = %s
            """, (printer_id,))
            printer = cursor.fetchone()

            if not printer:
                raise HTTPException(status_code=404, detail="Printer not found")

            return dict(printer)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch printer: {str(e)}")


@router.post("/printers", response_model=Printer)
async def create_printer(printer: PrinterCreate):
    """Create a new printer"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # If setting as default, unset other defaults
            if printer.is_default:
                cursor.execute("""
                    UPDATE printers SET is_default = FALSE
                """)

            cursor.execute("""
                INSERT INTO printers (name, printer_type, model, capabilities, is_default)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, name, printer_type, model, status, capabilities,
                          is_default, created_at, updated_at
            """, (
                printer.name,
                printer.printer_type,
                printer.model,
                printer.capabilities,
                printer.is_default
            ))
            new_printer = cursor.fetchone()
            return dict(new_printer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create printer: {str(e)}")


@router.patch("/printers/{printer_id}", response_model=Printer)
async def update_printer(printer_id: UUID, printer: PrinterUpdate):
    """Update a printer"""
    try:
        update_fields = []
        params = []

        if printer.name is not None:
            update_fields.append("name = %s")
            params.append(printer.name)

        if printer.status is not None:
            update_fields.append("status = %s")
            params.append(printer.status)

        if printer.is_default is not None:
            update_fields.append("is_default = %s")
            params.append(printer.is_default)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        update_fields.append("updated_at = NOW()")
        params.append(printer_id)

        with get_db_cursor(commit=True) as cursor:
            # If setting as default, unset other defaults
            if printer.is_default:
                cursor.execute("""
                    UPDATE printers SET is_default = FALSE WHERE id != %s
                """, (printer_id,))

            cursor.execute(f"""
                UPDATE printers
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING id, name, printer_type, model, status, capabilities,
                          is_default, created_at, updated_at
            """, params)
            updated_printer = cursor.fetchone()

            if not updated_printer:
                raise HTTPException(status_code=404, detail="Printer not found")

            return dict(updated_printer)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update printer: {str(e)}")


@router.delete("/printers/{printer_id}")
async def delete_printer(printer_id: UUID):
    """Delete a printer"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                DELETE FROM printers WHERE id = %s RETURNING id
            """, (printer_id,))
            result = cursor.fetchone()

            if not result:
                raise HTTPException(status_code=404, detail="Printer not found")

            return {"message": "Printer deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete printer: {str(e)}")


# ==========================================
# Print Job Endpoints
# ==========================================

@router.get("/jobs", response_model=List[PrintJob])
async def list_print_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    status: Optional[PrintJobStatus] = None
):
    """List print jobs"""
    try:
        offset = (page - 1) * page_size
        where_clause = "status = %s" if status else "1=1"
        params = [status.value] if status else []

        with get_db_cursor() as cursor:
            cursor.execute(f"""
                SELECT pj.*, pt.name as template_name, pr.name as printer_name
                FROM print_jobs pj
                LEFT JOIN print_templates pt ON pj.template_id = pt.id
                LEFT JOIN printers pr ON pj.printer_id = pr.id
                WHERE {where_clause}
                ORDER BY pj.created_at DESC
                LIMIT %s OFFSET %s
            """, params + [page_size, offset])
            jobs = cursor.fetchall()
            return [dict(row) for row in jobs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch print jobs: {str(e)}")


@router.get("/jobs/{job_id}", response_model=PrintJob)
async def get_print_job(job_id: UUID):
    """Get a specific print job"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM print_jobs WHERE id = %s
            """, (job_id,))
            job = cursor.fetchone()

            if not job:
                raise HTTPException(status_code=404, detail="Print job not found")

            return dict(job)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch print job: {str(e)}")


@router.post("/jobs", response_model=PrintJob)
async def create_print_job(job: PrintJobCreate):
    """Create a new print job"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # Get default printer if not specified
            printer_id = job.printer_id
            if not printer_id:
                cursor.execute("""
                    SELECT id FROM printers WHERE is_default = TRUE LIMIT 1
                """)
                default_printer = cursor.fetchone()
                if default_printer:
                    printer_id = default_printer['id']

            cursor.execute("""
                INSERT INTO print_jobs (template_id, barcode_ids, printer_id, copies, status)
                VALUES (%s, %s, %s, %s, 'pending')
                RETURNING id, template_id, barcode_ids, printer_id, copies,
                          status, created_at, completed_at, error
            """, (
                job.template_id,
                job.barcode_ids,
                printer_id,
                job.copies
            ))
            new_job = cursor.fetchone()
            return dict(new_job)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create print job: {str(e)}")


@router.patch("/jobs/{job_id}/status")
async def update_print_job_status(
    job_id: UUID,
    status: PrintJobStatus,
    error: Optional[str] = None
):
    """Update print job status"""
    try:
        with get_db_cursor(commit=True) as cursor:
            if status in [PrintJobStatus.COMPLETED, PrintJobStatus.FAILED]:
                cursor.execute("""
                    UPDATE print_jobs
                    SET status = %s, error = %s, completed_at = NOW()
                    WHERE id = %s
                    RETURNING id
                """, (status.value, error, job_id))
            else:
                cursor.execute("""
                    UPDATE print_jobs
                    SET status = %s, error = %s
                    WHERE id = %s
                    RETURNING id
                """, (status.value, error, job_id))

            result = cursor.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Print job not found")

            return {"message": f"Print job status updated to {status.value}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update print job status: {str(e)}")


@router.post("/jobs/{job_id}/print")
async def execute_print_job(job_id: UUID):
    """Execute a print job (trigger printing)"""
    try:
        with get_db_cursor(commit=True) as cursor:
            # Get job details
            cursor.execute("""
                SELECT pj.*, pt.elements, pt.dimensions, pr.name as printer_name
                FROM print_jobs pj
                JOIN print_templates pt ON pj.template_id = pt.id
                LEFT JOIN printers pr ON pj.printer_id = pr.id
                WHERE pj.id = %s
            """, (job_id,))
            job = cursor.fetchone()

            if not job:
                raise HTTPException(status_code=404, detail="Print job not found")

            if job['status'] != 'pending':
                raise HTTPException(status_code=400, detail="Print job is not in pending status")

            # Update status to printing
            cursor.execute("""
                UPDATE print_jobs
                SET status = 'printing'
                WHERE id = %s
            """, (job_id,))

            # TODO: Implement actual print logic
            # For now, we'll just simulate success

            # Update to completed
            cursor.execute("""
                UPDATE print_jobs
                SET status = 'completed', completed_at = NOW()
                WHERE id = %s
            """, (job_id,))

            return {"message": "Print job executed successfully", "job_id": str(job_id)}
    except HTTPException:
        raise
    except Exception as e:
        # Mark job as failed
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE print_jobs
                SET status = 'failed', error = %s
                WHERE id = %s
            """, (str(e), job_id))
        raise HTTPException(status_code=500, detail=f"Failed to execute print job: {str(e)}")

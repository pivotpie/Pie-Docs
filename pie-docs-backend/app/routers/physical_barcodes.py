"""
Physical Documents - Barcode Management API Router
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from uuid import UUID
import hashlib
import random
import string
import json

from app.database import get_db_cursor
from app.models.physical_documents import (
    BarcodeRecord, BarcodeRecordCreate, BarcodeListResponse,
    BarcodeGenerationRequest, BarcodeGenerationJob,
    BarcodeFormat, BarcodeFormatType
)

router = APIRouter(prefix="/api/v1/physical/barcodes", tags=["physical-barcodes"])


# ==========================================
# Barcode Formats Endpoints
# ==========================================

@router.get("/formats", response_model=List[BarcodeFormat])
async def list_barcode_formats():
    """Get all available barcode formats"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, name, type, standard, configuration
                FROM barcode_formats
                ORDER BY type, name
            """)
            formats = cursor.fetchall()
            return [dict(row) for row in formats]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch barcode formats: {str(e)}")


@router.get("/formats/{format_id}", response_model=BarcodeFormat)
async def get_barcode_format(format_id: UUID):
    """Get a specific barcode format"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, name, type, standard, configuration
                FROM barcode_formats
                WHERE id = %s
            """, (format_id,))
            format_data = cursor.fetchone()

            if not format_data:
                raise HTTPException(status_code=404, detail="Barcode format not found")

            return dict(format_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch barcode format: {str(e)}")


# ==========================================
# Barcode Records Endpoints
# ==========================================

@router.get("", response_model=BarcodeListResponse)
async def list_barcodes(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    is_active: Optional[bool] = None,
    document_id: Optional[UUID] = None,
    asset_id: Optional[UUID] = None
):
    """List barcode records with pagination and filtering"""
    try:
        offset = (page - 1) * page_size

        # Build query
        where_clauses = []
        params = []

        if is_active is not None:
            where_clauses.append("br.is_active = %s")
            params.append(is_active)

        if document_id:
            where_clauses.append("br.document_id = %s")
            params.append(document_id)

        if asset_id:
            where_clauses.append("br.asset_id = %s")
            params.append(asset_id)

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        with get_db_cursor() as cursor:
            # Get total count
            cursor.execute(f"""
                SELECT COUNT(*)
                FROM barcode_records br
                WHERE {where_sql}
            """, params)
            total = cursor.fetchone()['count']

            # Get barcodes
            cursor.execute(f"""
                SELECT br.*, bf.id as format_id, bf.name as format_name,
                       bf.type as format_type, bf.standard as format_standard
                FROM barcode_records br
                JOIN barcode_formats bf ON br.format_id = bf.id
                WHERE {where_sql}
                ORDER BY br.created_at DESC
                LIMIT %s OFFSET %s
            """, params + [page_size, offset])
            barcodes = cursor.fetchall()

            return {
                "barcodes": [dict(row) for row in barcodes],
                "total": total,
                "page": page,
                "page_size": page_size
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch barcodes: {str(e)}")


@router.get("/{barcode_id}", response_model=BarcodeRecord)
async def get_barcode(barcode_id: UUID):
    """Get a specific barcode record"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT br.*, bf.id as format_id
                FROM barcode_records br
                JOIN barcode_formats bf ON br.format_id = bf.id
                WHERE br.id = %s
            """, (barcode_id,))
            barcode = cursor.fetchone()

            if not barcode:
                raise HTTPException(status_code=404, detail="Barcode not found")

            return dict(barcode)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch barcode: {str(e)}")


@router.get("/lookup/{code}")
async def lookup_barcode(code: str):
    """Look up a barcode by its code"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT br.*, bf.name as format_name, bf.type as format_type,
                       pd.digital_document_id, pd.status as physical_status,
                       pa.name as asset_name, pa.asset_type
                FROM barcode_records br
                JOIN barcode_formats bf ON br.format_id = bf.id
                LEFT JOIN physical_documents pd ON br.id = pd.barcode_id
                LEFT JOIN physical_assets pa ON br.id = pa.barcode_id
                WHERE br.code = %s AND br.is_active = TRUE
            """, (code,))
            barcode = cursor.fetchone()

            if not barcode:
                raise HTTPException(status_code=404, detail="Barcode not found or inactive")

            return dict(barcode)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to lookup barcode: {str(e)}")


@router.post("", response_model=BarcodeRecord)
async def create_barcode(barcode: BarcodeRecordCreate):
    """Create a new barcode record"""
    try:
        # Generate checksum
        checksum = hashlib.md5(barcode.code.encode()).hexdigest()

        # Serialize metadata to JSON string for JSONB column
        metadata_json = json.dumps(barcode.metadata) if barcode.metadata else '{}'

        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO barcode_records (code, format_id, document_id, asset_id, metadata, checksum)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, code, format_id, document_id, asset_id, is_active, metadata, checksum, created_at, updated_at
            """, (
                barcode.code,
                barcode.format_id,
                barcode.document_id,
                barcode.asset_id,
                metadata_json,
                checksum
            ))
            new_barcode = cursor.fetchone()
            return dict(new_barcode)
    except Exception as e:
        if 'unique constraint' in str(e).lower():
            raise HTTPException(status_code=409, detail="Barcode code already exists")
        raise HTTPException(status_code=500, detail=f"Failed to create barcode: {str(e)}")


@router.patch("/{barcode_id}/deactivate")
async def deactivate_barcode(barcode_id: UUID):
    """Deactivate a barcode"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE barcode_records
                SET is_active = FALSE, updated_at = NOW()
                WHERE id = %s
                RETURNING id
            """, (barcode_id,))
            result = cursor.fetchone()

            if not result:
                raise HTTPException(status_code=404, detail="Barcode not found")

            return {"message": "Barcode deactivated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to deactivate barcode: {str(e)}")


@router.patch("/{barcode_id}/activate")
async def activate_barcode(barcode_id: UUID):
    """Activate a barcode"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                UPDATE barcode_records
                SET is_active = TRUE, updated_at = NOW()
                WHERE id = %s
                RETURNING id
            """, (barcode_id,))
            result = cursor.fetchone()

            if not result:
                raise HTTPException(status_code=404, detail="Barcode not found")

            return {"message": "Barcode activated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to activate barcode: {str(e)}")


# ==========================================
# Barcode Generation Endpoints
# ==========================================

def generate_barcode_code(prefix: Optional[str] = None, suffix: Optional[str] = None, length: int = 12) -> str:
    """Generate a unique barcode code"""
    # Generate random alphanumeric code
    chars = string.ascii_uppercase + string.digits
    code_part = ''.join(random.choices(chars, k=length))

    # Add prefix and suffix
    code = f"{prefix or ''}{code_part}{suffix or ''}"
    return code


@router.post("/generate", response_model=BarcodeGenerationJob)
async def generate_barcodes(request: BarcodeGenerationRequest):
    """Generate barcodes for documents or assets"""
    try:
        # Get format
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id FROM barcode_formats WHERE standard = %s
            """, (request.format.value,))
            format_row = cursor.fetchone()

            if not format_row:
                raise HTTPException(status_code=404, detail="Barcode format not found")

            format_id = format_row['id']

        # Create generation job
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("""
                INSERT INTO barcode_generation_jobs (document_ids, format, prefix, suffix, quantity, status)
                VALUES (%s, %s, %s, %s, %s, 'processing')
                RETURNING id, document_ids, format, prefix, suffix, quantity, status, progress, created_at
            """, (
                request.document_ids,
                request.format.value,
                request.prefix,
                request.suffix,
                request.quantity
            ))
            job = cursor.fetchone()
            job_id = job['id']

        # Generate barcodes
        generated_count = 0
        try:
            with get_db_cursor(commit=True) as cursor:
                # Generate for documents
                for doc_id in request.document_ids:
                    code = generate_barcode_code(request.prefix, request.suffix)
                    checksum = hashlib.md5(code.encode()).hexdigest()

                    cursor.execute("""
                        INSERT INTO barcode_records (code, format_id, document_id, checksum)
                        VALUES (%s, %s, %s, %s)
                    """, (code, format_id, doc_id, checksum))
                    generated_count += 1

                # Generate for assets
                for asset_id in request.asset_ids:
                    code = generate_barcode_code(request.prefix, request.suffix)
                    checksum = hashlib.md5(code.encode()).hexdigest()

                    cursor.execute("""
                        INSERT INTO barcode_records (code, format_id, asset_id, checksum)
                        VALUES (%s, %s, %s, %s)
                    """, (code, format_id, asset_id, checksum))
                    generated_count += 1

                # Generate additional quantity if specified
                remaining = request.quantity - generated_count
                for _ in range(remaining):
                    code = generate_barcode_code(request.prefix, request.suffix)
                    checksum = hashlib.md5(code.encode()).hexdigest()

                    cursor.execute("""
                        INSERT INTO barcode_records (code, format_id, checksum)
                        VALUES (%s, %s, %s)
                    """, (code, format_id, checksum))
                    generated_count += 1

                # Update job status
                cursor.execute("""
                    UPDATE barcode_generation_jobs
                    SET status = 'completed', progress = 100, completed_at = NOW()
                    WHERE id = %s
                """, (job_id,))

        except Exception as e:
            # Mark job as failed
            with get_db_cursor(commit=True) as cursor:
                cursor.execute("""
                    UPDATE barcode_generation_jobs
                    SET status = 'failed', error = %s
                    WHERE id = %s
                """, (str(e), job_id))
            raise

        # Return job details
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM barcode_generation_jobs WHERE id = %s
            """, (job_id,))
            result = cursor.fetchone()
            return dict(result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate barcodes: {str(e)}")


@router.get("/jobs/{job_id}", response_model=BarcodeGenerationJob)
async def get_generation_job(job_id: UUID):
    """Get barcode generation job status"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT * FROM barcode_generation_jobs WHERE id = %s
            """, (job_id,))
            job = cursor.fetchone()

            if not job:
                raise HTTPException(status_code=404, detail="Generation job not found")

            return dict(job)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch generation job: {str(e)}")


@router.post("/validate/{code}")
async def validate_barcode(code: str):
    """Validate a barcode code"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS(SELECT 1 FROM barcode_records WHERE code = %s AND is_active = TRUE) as exists
            """, (code,))
            result = cursor.fetchone()

            is_unique = not result['exists']

            return {
                "code": code,
                "is_valid": len(code) > 0,
                "is_unique": is_unique,
                "checksum": hashlib.md5(code.encode()).hexdigest()
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate barcode: {str(e)}")

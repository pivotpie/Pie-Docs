"""
API endpoints for document signatures.
"""
import logging
import json
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from uuid import UUID
from app.models.signatures import (
    SignatureCreate,
    SignatureUpdate,
    SignatureResponse,
    SignatureListResponse
)
from app.database import get_db_cursor
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/signatures", tags=["signatures"])


@router.post("", response_model=SignatureResponse, status_code=status.HTTP_201_CREATED)
async def create_signature(
    signature: SignatureCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new signature for a document.
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Verify document exists
            cursor.execute(
                "SELECT id FROM documents WHERE id = %s",
                (str(signature.document_id),)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document with id {signature.document_id} not found"
                )

            # Insert signature
            cursor.execute("""
                INSERT INTO document_signatures
                (document_id, signature_data, signature_type, metadata, created_by)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, document_id, signature_data, signature_type, metadata,
                          created_by, created_at, updated_at
            """, (
                str(signature.document_id),
                signature.signature_data,
                signature.signature_type,
                json.dumps(signature.metadata or {}),
                current_user['id']
            ))

            result = cursor.fetchone()

            # Get creator name
            cursor.execute("""
                SELECT COALESCE(
                    NULLIF(CONCAT(first_name, ' ', last_name), ' '),
                    username,
                    email
                ) as name
                FROM users WHERE id = %s
            """, (current_user['id'],))
            user_name = cursor.fetchone()

            response_data = dict(result)
            response_data['created_by_name'] = user_name['name'] if user_name else 'Unknown User'

            logger.info(f"Signature {result['id']} created for document {signature.document_id}")
            return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating signature: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create signature: {str(e)}"
        )


@router.get("/document/{document_id}", response_model=SignatureListResponse)
async def get_document_signatures(
    document_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all signatures for a specific document.
    """
    try:
        with get_db_cursor() as cursor:
            # Verify document exists
            cursor.execute(
                "SELECT id FROM documents WHERE id = %s",
                (str(document_id),)
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document with id {document_id} not found"
                )

            # Get all signatures for the document
            cursor.execute("""
                SELECT
                    ds.id, ds.document_id, ds.signature_data, ds.signature_type,
                    ds.metadata, ds.created_by, ds.created_at, ds.updated_at,
                    COALESCE(
                        NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '),
                        u.username,
                        u.email
                    ) as created_by_name
                FROM document_signatures ds
                LEFT JOIN users u ON ds.created_by = u.id
                WHERE ds.document_id = %s
                ORDER BY ds.created_at DESC
            """, (str(document_id),))

            signatures = cursor.fetchall()

            return {
                "signatures": [dict(sig) for sig in signatures],
                "total": len(signatures)
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching signatures for document {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch signatures: {str(e)}"
        )


@router.get("/{signature_id}", response_model=SignatureResponse)
async def get_signature(
    signature_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific signature by ID.
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT
                    ds.id, ds.document_id, ds.signature_data, ds.signature_type,
                    ds.metadata, ds.created_by, ds.created_at, ds.updated_at,
                    COALESCE(
                        NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '),
                        u.username,
                        u.email
                    ) as created_by_name
                FROM document_signatures ds
                LEFT JOIN users u ON ds.created_by = u.id
                WHERE ds.id = %s
            """, (str(signature_id),))

            signature = cursor.fetchone()

            if not signature:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Signature with id {signature_id} not found"
                )

            return dict(signature)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching signature {signature_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch signature: {str(e)}"
        )


@router.put("/{signature_id}", response_model=SignatureResponse)
async def update_signature(
    signature_id: UUID,
    signature_update: SignatureUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a signature. Only the creator can update their signature.
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if signature exists and user is the creator
            cursor.execute(
                "SELECT created_by FROM document_signatures WHERE id = %s",
                (str(signature_id),)
            )
            result = cursor.fetchone()

            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Signature with id {signature_id} not found"
                )

            if str(result['created_by']) != current_user['id']:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only update your own signatures"
                )

            # Build update query
            update_fields = []
            params = []

            if signature_update.signature_data is not None:
                update_fields.append("signature_data = %s")
                params.append(signature_update.signature_data)

            if signature_update.metadata is not None:
                update_fields.append("metadata = %s")
                params.append(json.dumps(signature_update.metadata))

            if not update_fields:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No fields to update"
                )

            params.append(str(signature_id))

            cursor.execute(f"""
                UPDATE document_signatures
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING id, document_id, signature_data, signature_type, metadata,
                          created_by, created_at, updated_at
            """, params)

            result = cursor.fetchone()

            # Get creator name
            cursor.execute("""
                SELECT COALESCE(
                    NULLIF(CONCAT(first_name, ' ', last_name), ' '),
                    username,
                    email
                ) as name
                FROM users WHERE id = %s
            """, (current_user['id'],))
            user_name = cursor.fetchone()

            response_data = dict(result)
            response_data['created_by_name'] = user_name['name'] if user_name else 'Unknown User'

            logger.info(f"Signature {signature_id} updated")
            return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating signature {signature_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update signature: {str(e)}"
        )


@router.delete("/{signature_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_signature(
    signature_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a signature. Only the creator can delete their signature.
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # Check if signature exists and user is the creator
            cursor.execute(
                "SELECT created_by FROM document_signatures WHERE id = %s",
                (str(signature_id),)
            )
            result = cursor.fetchone()

            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Signature with id {signature_id} not found"
                )

            if str(result['created_by']) != current_user['id']:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only delete your own signatures"
                )

            cursor.execute(
                "DELETE FROM document_signatures WHERE id = %s",
                (str(signature_id),)
            )

            logger.info(f"Signature {signature_id} deleted")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting signature {signature_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete signature: {str(e)}"
        )

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
import uvicorn
import sys
import asyncio
from dotenv import load_dotenv
import os

# Load environment variables BEFORE importing any app modules
# This ensures .env values are available in os.environ for all services
load_dotenv()

# Verify critical environment variables are loaded
print(f"[STARTUP] LLM_PROVIDER: {os.getenv('LLM_PROVIDER', 'NOT SET')}")
print(f"[STARTUP] OPENAI_MODEL: {os.getenv('OPENAI_MODEL', 'NOT SET')}")
print(f"[STARTUP] OPENAI_API_KEY length: {len(os.getenv('OPENAI_API_KEY', ''))}")

from app.config import settings
from app.database import init_db_pool, close_db_pool, get_db_cursor
from app.rag_service import rag_service
from app.embedding_service import embedding_service

# ============================================
# Windows asyncio ConnectionResetError Fix
# ============================================
# Suppress Windows-specific connection reset errors in asyncio
# These are harmless errors that occur when clients disconnect abruptly
if sys.platform == 'win32':
    # Set Windows-specific event loop policy
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    # Suppress ConnectionResetError logging
    logging.getLogger('asyncio').setLevel(logging.CRITICAL)

# Import routers
from app.routers import (
    users, roles, permissions, auth, audit_logs,
    documents, folders, tags, cabinets, document_types,
    annotations, approvals, ocr, tasks, notifications, workflows,
    user_preferences, api_keys, system_monitoring,
    physical_barcodes, physical_locations, physical_mobile, physical_print,
    checkinout, warehouse, warehouse_extensions, warehouse_print, metadata_schemas,
    classification, embeddings, metadata_extraction, search, documents_extensions,
    ai, signatures
)
from app.routers import settings as settings_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app with metadata for Swagger UI
tags_metadata = [
    {
        "name": "authentication",
        "description": "Authentication endpoints - Login, logout, token refresh, password reset, MFA",
    },
    {
        "name": "users",
        "description": "User management endpoints - Create, read, update, and delete users, assign roles",
    },
    {
        "name": "roles",
        "description": "Role management endpoints - Manage roles and assign permissions to roles",
    },
    {
        "name": "permissions",
        "description": "Permission management endpoints - View and manage system permissions",
    },
    {
        "name": "settings",
        "description": "System settings management - View and update system configuration",
    },
    {
        "name": "audit",
        "description": "Audit logs - View system audit trail and activity logs",
    },
    {
        "name": "documents",
        "description": "Document management and RAG endpoints",
    },
    {
        "name": "search",
        "description": "Search and query endpoints",
    },
    {
        "name": "workflows",
        "description": "Workflow management - Create, execute, and manage document workflows",
    },
    {
        "name": "user-preferences",
        "description": "User preferences management - Manage user-specific settings and preferences",
    },
    {
        "name": "api-keys",
        "description": "API key management - Create, manage, and revoke API keys for programmatic access",
    },
    {
        "name": "system-monitoring",
        "description": "System monitoring - View system health, database stats, and cache management",
    },
    {
        "name": "physical-barcodes",
        "description": "Barcode management - Generate, validate, and manage barcodes for physical documents and assets",
    },
    {
        "name": "physical-locations",
        "description": "Location tracking - Manage storage locations and track document/asset movements",
    },
    {
        "name": "physical-mobile",
        "description": "Mobile scanning - Barcode scanning, document capture, and offline operations",
    },
    {
        "name": "physical-print",
        "description": "Print management - Templates, printers, and print job management",
    },
    {
        "name": "warehouse",
        "description": "Warehouse management - Manage locations, warehouses, zones, shelves, racks, and physical documents",
    },
    {
        "name": "Metadata Schemas",
        "description": "Metadata schema management - Define and manage metadata schemas and fields for document types",
    },
    {
        "name": "classification",
        "description": "Document classification - AI-powered document type identification using LLM",
    },
    {
        "name": "embeddings",
        "description": "Embeddings generation - Generate vector embeddings for semantic search and RAG",
    },
    {
        "name": "annotations",
        "description": "Document annotations - Add comments, highlights, and threaded replies to documents",
    },
    {
        "name": "approvals",
        "description": "Approval workflows - Multi-step approval chains, routing rules, and bulk operations",
    },
    {
        "name": "check-in-out",
        "description": "Document check-in/check-out - Document locking and version control system",
    },
    {
        "name": "document-types",
        "description": "Document type management - Define and manage document types and their properties",
    },
    {
        "name": "folders",
        "description": "Folder organization - Hierarchical folder structure for document organization",
    },
    {
        "name": "Metadata Extraction",
        "description": "Metadata extraction - AI-powered metadata extraction using GPT-5-Nano Vision for multi-page documents",
    },
    {
        "name": "notifications",
        "description": "Notifications - Real-time notifications for workflow events, approvals, and system updates",
    },
    {
        "name": "ocr",
        "description": "OCR processing - Optical character recognition and document text extraction",
    },
    {
        "name": "tags",
        "description": "Document tagging - Create and manage tags for document categorization and filtering",
    },
    {
        "name": "tasks",
        "description": "Task management - Assign and track document-related tasks and workflows",
    },
    {
        "name": "ai",
        "description": "AI Features - Document insights, summaries, key terms, dynamic actions, and document generation using GPT-5",
    },
    {
        "name": "signatures",
        "description": "Document signatures - Capture, store, and manage digital signatures for documents",
    },
]

app = FastAPI(
    title="PieDocs API",
    version="1.0.0",
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware - must be added before routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(roles.router)
app.include_router(permissions.router)
app.include_router(settings_router.router)
app.include_router(audit_logs.router)
app.include_router(documents.router)
app.include_router(documents_extensions.router)
app.include_router(document_types.router)
app.include_router(folders.router)
app.include_router(tags.router)

# INACTIVE/DEPRECATED ROUTERS - Hidden from Swagger UI but still functional
# See: pie-docs-backend/config/inactive-modules.yaml for AI/developer guidance
app.include_router(cabinets.router, include_in_schema=False)  # INACTIVE: Replaced by folders
app.include_router(physical_locations.router, include_in_schema=False)  # INACTIVE: Use warehouse locations

app.include_router(annotations.router)
app.include_router(approvals.router)
app.include_router(ocr.router)
app.include_router(tasks.router)
app.include_router(notifications.router)
app.include_router(workflows.router)
app.include_router(user_preferences.router)
app.include_router(api_keys.router)
app.include_router(system_monitoring.router)
app.include_router(physical_barcodes.router)
app.include_router(physical_mobile.router)
app.include_router(physical_print.router)
app.include_router(checkinout.router)
app.include_router(warehouse.router)
app.include_router(warehouse_extensions.router)
app.include_router(warehouse_print.router)
app.include_router(metadata_schemas.router)
app.include_router(classification.router)
app.include_router(embeddings.router)
app.include_router(metadata_extraction.router)
app.include_router(search.router)
app.include_router(ai.router)
app.include_router(signatures.router)

# Pydantic models
class SearchRequest(BaseModel):
    query: str
    search_type: str = "semantic"  # semantic, keyword, hybrid
    top_k: Optional[int] = None

class DocumentCreate(BaseModel):
    title: str
    content: str
    document_type: str
    author: str = "System"
    tags: List[str] = []
    metadata: Dict[str, Any] = {}

class RAGQueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    try:
        init_db_pool()
        embedding_service.load_model()

        # Check LLM service status
        from app.llm_service import llm_service
        llm_info = llm_service.get_provider_info()
        logger.info(f"LLM Service: provider={llm_info['provider']}, model={llm_info['model']}, available={llm_info['available']}")

        logger.info("API started successfully")
    except Exception as e:
        logger.error(f"Error during startup: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    close_db_pool()
    logger.info("API shutdown complete")

# Health check
@app.get("/", tags=["system-monitoring"])
async def root():
    return {
        "message": "PieDocs RAG API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health", tags=["system-monitoring"])
async def health_check():
    """Health check endpoint"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database error: {str(e)}")

@app.get("/api/v1/status", tags=["system-monitoring"])
async def detailed_status():
    """Detailed system status endpoint"""
    try:
        # Check database
        db_status = "connected"
        db_table_count = 0
        try:
            with get_db_cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'")
                result = cursor.fetchone()
                db_table_count = result['count'] if result else 0
        except Exception as e:
            db_status = f"error: {str(e)}"

        # Check embedding service
        embedding_status = "loaded" if hasattr(embedding_service, 'model') else "not loaded"

        return {
            "api": {
                "name": "PieDocs API",
                "version": "1.0.0",
                "status": "running"
            },
            "database": {
                "status": db_status,
                "tables": db_table_count
            },
            "services": {
                "embedding_service": embedding_status,
                "rag_service": "available"
            }
        }
    except Exception as e:
        logger.error(f"Status check error: {e}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

# Document endpoints
@app.get("/api/v1/documents", tags=["documents"])
async def list_documents(skip: int = 0, limit: int = 10):
    """List all documents"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, title, document_type, author, created_at, tags, metadata
                FROM documents
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
                """,
                (limit, skip)
            )
            documents = cursor.fetchall()

        return {"documents": [dict(row) for row in documents]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/documents/{document_id}", tags=["documents"])
async def get_document(document_id: str):
    """Get a specific document"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT * FROM documents WHERE id = %s",
                (document_id,)
            )
            document = cursor.fetchone()

        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        return dict(document)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/documents", tags=["documents"])
async def create_document(doc: DocumentCreate):
    """Create a new document with embeddings"""
    try:
        import json as json_lib
        with get_db_cursor(commit=True) as cursor:
            # Insert document - convert dict/list to JSON string for PostgreSQL
            cursor.execute(
                """
                INSERT INTO documents (title, content, document_type, author, tags, metadata)
                VALUES (%s, %s, %s, %s, %s::jsonb, %s::jsonb)
                RETURNING id
                """,
                (
                    doc.title,
                    doc.content,
                    doc.document_type,
                    doc.author,
                    json_lib.dumps(doc.tags),
                    json_lib.dumps(doc.metadata)
                )
            )
            result = cursor.fetchone()
            document_id = str(result['id'])

        # Generate embeddings asynchronously
        rag_service.generate_and_store_document_embedding(document_id, doc.title, doc.content)
        rag_service.generate_and_store_chunks(document_id, doc.content)

        return {"id": document_id, "message": "Document created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Search endpoints - Moved to app.routers.search
# The search functionality is now handled by the dedicated search router

# RAG endpoints
@app.post("/api/v1/rag/query", tags=["search"])
async def rag_query(request: RAGQueryRequest):
    """RAG query endpoint - returns answer with relevant chunks"""
    try:
        response = rag_service.generate_rag_response(request.query)

        # Log search
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO search_history (query, search_type, results_count)
                VALUES (%s, %s, %s)
                """,
                (request.query, "rag", len(response['relevant_chunks']))
            )

        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/rag/suggestions", tags=["search"])
async def get_suggestions():
    """Get suggested queries"""
    suggestions = [
        "What is the Document Problem?",
        "Show me all invoices from December 2023",
        "What is intelligent document processing?",
        "What are our technology vendors?",
        "Explain the Intelligence Gap",
        "What is DocExtractor?",
        "Tell me about automation challenges"
    ]
    return {"suggestions": suggestions}

# Admin endpoints
@app.post("/api/v1/admin/regenerate-embeddings/{document_id}", tags=["search"])
async def regenerate_embeddings(document_id: str):
    """Regenerate embeddings for a document"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                "SELECT title, content FROM documents WHERE id = %s",
                (document_id,)
            )
            doc = cursor.fetchone()

        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        # Regenerate embeddings
        success = rag_service.generate_and_store_document_embedding(
            document_id, doc['title'], doc['content']
        )
        chunks_success = rag_service.generate_and_store_chunks(
            document_id, doc['content']
        )

        if success and chunks_success:
            return {"message": "Embeddings regenerated successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to regenerate embeddings")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/admin/regenerate-all-embeddings", tags=["search"])
async def regenerate_all_embeddings():
    """Regenerate embeddings for all documents"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT id, title, content FROM documents")
            documents = cursor.fetchall()

        count = 0
        for doc in documents:
            success = rag_service.generate_and_store_document_embedding(
                str(doc['id']), doc['title'], doc['content']
            )
            chunks_success = rag_service.generate_and_store_chunks(
                str(doc['id']), doc['content']
            )
            if success and chunks_success:
                count += 1

        return {
            "message": f"Regenerated embeddings for {count}/{len(documents)} documents",
            "total": len(documents),
            "successful": count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Run the application
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )

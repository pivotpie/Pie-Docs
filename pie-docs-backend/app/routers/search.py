"""
Search API Router - Comprehensive search endpoints
Handles semantic search, suggestions, and search history
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from pydantic import BaseModel
import logging
from datetime import datetime

from app.database import get_db_cursor
from app.rag_service import rag_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/search", tags=["search"])


# Request/Response Models
class SearchRequest(BaseModel):
    query: str
    search_type: str = "semantic"  # semantic, keyword, hybrid
    top_k: Optional[int] = 10
    filters: Optional[dict] = {}


class SearchResponse(BaseModel):
    query: str
    search_type: str
    results_count: int
    results: List[dict]
    timeTaken: Optional[int] = 0


class SuggestionResponse(BaseModel):
    suggestions: List[str]


class RAGRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5
    include_sources: Optional[bool] = True


class RAGResponse(BaseModel):
    query: str
    answer: str
    confidence: float
    relevant_chunks: List[dict]
    sources: List[dict]
    timeTaken: int


class ChunkSearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 10


class ChunkSearchResponse(BaseModel):
    query: str
    chunks: List[dict]
    results_count: int
    timeTaken: int


# ==========================================
# Search Endpoints
# ==========================================

@router.post("", response_model=SearchResponse)
@router.post("/", response_model=SearchResponse, include_in_schema=False)
async def search_documents(request: SearchRequest):
    """
    Comprehensive document search endpoint

    Supports:
    - Semantic search using embeddings
    - Hybrid search (keyword + semantic)
    - Filtering and pagination
    """
    try:
        start_time = datetime.now()

        # Perform search based on type
        if request.search_type == "semantic":
            results = rag_service.semantic_search_documents(
                request.query,
                request.top_k or 10
            )
        elif request.search_type == "hybrid":
            results = rag_service.hybrid_search(
                request.query,
                request.top_k or 10
            )
        else:
            # Default to semantic search
            results = rag_service.semantic_search_documents(
                request.query,
                request.top_k or 10
            )

        # Calculate time taken
        time_taken = int((datetime.now() - start_time).total_seconds() * 1000)

        # Log search to history
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    INSERT INTO search_history (query, search_type, results_count, filters)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (request.query, request.search_type, len(results), request.filters)
                )
        except Exception as e:
            logger.warning(f"Failed to log search history: {e}")

        return SearchResponse(
            query=request.query,
            search_type=request.search_type,
            results_count=len(results),
            results=results,
            timeTaken=time_taken
        )

    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions", response_model=SuggestionResponse)
async def get_search_suggestions(
    q: Optional[str] = Query(None, description="Partial query for suggestions"),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Get search suggestions based on query

    Returns popular/recent searches and suggestions
    """
    try:
        suggestions = []

        if q and len(q) >= 2:
            # Get suggestions from search history
            with get_db_cursor() as cursor:
                cursor.execute(
                    """
                    SELECT query, COUNT(*) as count, MAX(created_at) as last_used
                    FROM search_history
                    WHERE query ILIKE %s
                    GROUP BY query
                    ORDER BY count DESC, last_used DESC
                    LIMIT %s
                    """,
                    (f'%{q}%', limit)
                )

                results = cursor.fetchall()
                suggestions = [row['query'] for row in results]

        # Add default suggestions if not enough results
        default_suggestions = [
            "financial reports",
            "employee handbook",
            "contracts 2024",
            "invoices",
            "meeting minutes",
            "project documentation"
        ]

        if len(suggestions) < limit:
            suggestions.extend(
                [s for s in default_suggestions if s not in suggestions][:limit - len(suggestions)]
            )

        return SuggestionResponse(suggestions=suggestions[:limit])

    except Exception as e:
        logger.error(f"Error getting suggestions: {e}")
        return SuggestionResponse(suggestions=[])


@router.get("/history")
async def get_search_history(
    limit: int = Query(20, ge=1, le=100),
    user_id: Optional[str] = None
):
    """
    Get recent search history
    """
    try:
        with get_db_cursor() as cursor:
            if user_id:
                cursor.execute(
                    """
                    SELECT id, query, search_type, results_count, created_at
                    FROM search_history
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s
                    """,
                    (user_id, limit)
                )
            else:
                cursor.execute(
                    """
                    SELECT id, query, search_type, results_count, created_at
                    FROM search_history
                    ORDER BY created_at DESC
                    LIMIT %s
                    """,
                    (limit,)
                )

            history = cursor.fetchall()

            return {
                "history": [
                    {
                        "id": str(row['id']),
                        "query": row['query'],
                        "search_type": row['search_type'],
                        "results_count": row['results_count'],
                        "timestamp": row['created_at'].isoformat() if row['created_at'] else None
                    }
                    for row in history
                ]
            }

    except Exception as e:
        logger.error(f"Error getting search history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history/{history_id}")
async def delete_search_history(history_id: str):
    """
    Delete a search history entry
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "DELETE FROM search_history WHERE id = %s",
                (history_id,)
            )

        return {"message": "Search history deleted successfully"}

    except Exception as e:
        logger.error(f"Error deleting search history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_search_stats():
    """
    Get search statistics and analytics
    """
    try:
        with get_db_cursor() as cursor:
            # Total searches
            cursor.execute("SELECT COUNT(*) as total FROM search_history")
            total_searches = cursor.fetchone()['total']

            # Top queries
            cursor.execute(
                """
                SELECT query, COUNT(*) as count
                FROM search_history
                GROUP BY query
                ORDER BY count DESC
                LIMIT 10
                """
            )
            top_queries = cursor.fetchall()

            # Search types distribution
            cursor.execute(
                """
                SELECT search_type, COUNT(*) as count
                FROM search_history
                GROUP BY search_type
                """
            )
            search_types = cursor.fetchall()

            # Average results count
            cursor.execute(
                """
                SELECT AVG(results_count) as avg_results
                FROM search_history
                WHERE results_count > 0
                """
            )
            avg_results = cursor.fetchone()['avg_results'] or 0

            return {
                "total_searches": total_searches,
                "top_queries": [
                    {"query": row['query'], "count": row['count']}
                    for row in top_queries
                ],
                "search_types": [
                    {"type": row['search_type'], "count": row['count']}
                    for row in search_types
                ],
                "average_results": float(avg_results)
            }

    except Exception as e:
        logger.error(f"Error getting search stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# RAG Endpoints
# ==========================================

@router.post("/rag", response_model=RAGResponse)
async def rag_query(request: RAGRequest):
    """
    RAG (Retrieval-Augmented Generation) Q&A endpoint

    Performs semantic search on document chunks and generates
    a comprehensive answer with source attribution.

    Features:
    - Chunk-level semantic search
    - Source document attribution
    - Confidence scoring
    - Relevant context snippets
    """
    try:
        start_time = datetime.now()

        # Generate RAG response with chunks
        rag_response = rag_service.generate_rag_response(request.query)

        # Calculate time taken
        time_taken = int((datetime.now() - start_time).total_seconds() * 1000)

        # Log RAG query
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    INSERT INTO search_history (query, search_type, results_count)
                    VALUES (%s, %s, %s)
                    """,
                    (request.query, "rag", len(rag_response.get('relevant_chunks', [])))
                )
        except Exception as e:
            logger.warning(f"Failed to log RAG query: {e}")

        return RAGResponse(
            query=request.query,
            answer=rag_response['answer'],
            confidence=rag_response['confidence'],
            relevant_chunks=rag_response['relevant_chunks'],
            sources=rag_response['sources'],
            timeTaken=time_taken
        )

    except Exception as e:
        logger.error(f"RAG query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chunks", response_model=ChunkSearchResponse)
async def search_chunks(request: ChunkSearchRequest):
    """
    Direct chunk-level semantic search

    Returns relevant document chunks with similarity scores
    and source document information.

    Useful for:
    - Fine-grained search results
    - Context extraction
    - Source verification
    """
    try:
        start_time = datetime.now()

        # Perform chunk-level search
        chunks = rag_service.semantic_search_chunks(
            request.query,
            request.top_k or 10
        )

        # Calculate time taken
        time_taken = int((datetime.now() - start_time).total_seconds() * 1000)

        # Format chunks for response
        formatted_chunks = []
        for chunk in chunks:
            formatted_chunks.append({
                "chunk_id": str(chunk.get('chunk_id', '')),
                "document_id": str(chunk.get('document_id', '')),
                "document_title": chunk.get('title', 'Unknown'),
                "document_type": chunk.get('document_type', 'Unknown'),
                "content": chunk.get('chunk_content', ''),
                "chunk_index": chunk.get('chunk_index', 0),
                "similarity": float(chunk.get('similarity', 0.0)),
                "metadata": chunk.get('metadata', {})
            })

        return ChunkSearchResponse(
            query=request.query,
            chunks=formatted_chunks,
            results_count=len(formatted_chunks),
            timeTaken=time_taken
        )

    except Exception as e:
        logger.error(f"Chunk search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/similar/{document_id}")
async def get_similar_documents(
    document_id: str,
    limit: int = Query(5, ge=1, le=20)
):
    """
    Find semantically similar documents

    Uses vector similarity to find documents related to the given document.
    Great for:
    - Document discovery
    - Related content suggestions
    - Duplicate detection
    """
    try:
        with get_db_cursor() as cursor:
            # Get the document's embedding
            cursor.execute(
                """
                SELECT embedding, title
                FROM documents
                WHERE id = %s AND embedding IS NOT NULL
                """,
                (document_id,)
            )

            doc = cursor.fetchone()

            if not doc:
                raise HTTPException(
                    status_code=404,
                    detail="Document not found or has no embedding"
                )

            # Find similar documents
            cursor.execute(
                """
                SELECT
                    id,
                    title,
                    document_type,
                    author,
                    tags,
                    created_at,
                    metadata,
                    1 - (embedding <=> %s::vector) as similarity
                FROM documents
                WHERE id != %s
                AND embedding IS NOT NULL
                AND 1 - (embedding <=> %s::vector) >= 0.5
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                (doc['embedding'], document_id, doc['embedding'], doc['embedding'], limit)
            )

            similar_docs = cursor.fetchall()

            return {
                "document_id": document_id,
                "document_title": doc['title'],
                "similar_documents": [
                    {
                        "id": str(row['id']),
                        "title": row['title'],
                        "document_type": row['document_type'],
                        "author": row['author'],
                        "tags": row['tags'],
                        "similarity": float(row['similarity']),
                        "created_at": row['created_at'].isoformat() if row['created_at'] else None,
                        "metadata": row['metadata']
                    }
                    for row in similar_docs
                ],
                "results_count": len(similar_docs)
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error finding similar documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

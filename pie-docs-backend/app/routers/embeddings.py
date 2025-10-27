"""
Embeddings API Router
Generate embeddings for text using sentence transformers
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import logging

from app.embedding_service import embedding_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/embeddings", tags=["embeddings"])


class EmbeddingRequest(BaseModel):
    text: str


class BatchEmbeddingRequest(BaseModel):
    texts: List[str]


class EmbeddingResponse(BaseModel):
    embedding: List[float]
    dimension: int
    model: str


class BatchEmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    count: int
    dimension: int
    model: str


@router.post("/generate", response_model=EmbeddingResponse)
async def generate_embedding(request: EmbeddingRequest):
    """
    Generate embedding for a single text

    Args:
        request: Text to generate embedding for

    Returns:
        Embedding vector and metadata
    """
    try:
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        # Generate embedding
        embedding = embedding_service.generate_embedding(request.text)

        return {
            "embedding": embedding,
            "dimension": len(embedding),
            "model": embedding_service.model_name
        }

    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")


@router.post("/generate-batch", response_model=BatchEmbeddingResponse)
async def generate_embeddings_batch(request: BatchEmbeddingRequest):
    """
    Generate embeddings for multiple texts

    Args:
        request: List of texts to generate embeddings for

    Returns:
        List of embedding vectors and metadata
    """
    try:
        if not request.texts or len(request.texts) == 0:
            raise HTTPException(status_code=400, detail="Texts list cannot be empty")

        # Filter out empty texts
        valid_texts = [text for text in request.texts if text and len(text.strip()) > 0]

        if len(valid_texts) == 0:
            raise HTTPException(status_code=400, detail="All texts are empty")

        # Generate embeddings
        embeddings = embedding_service.generate_embeddings_batch(valid_texts)

        return {
            "embeddings": embeddings,
            "count": len(embeddings),
            "dimension": len(embeddings[0]) if embeddings else 0,
            "model": embedding_service.model_name
        }

    except Exception as e:
        logger.error(f"Error generating batch embeddings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate embeddings: {str(e)}")


@router.get("/status")
async def get_embedding_service_status():
    """Check embedding service status"""
    try:
        # Try to load model if not loaded
        if embedding_service.model is None:
            embedding_service.load_model()

        return {
            "available": True,
            "model": embedding_service.model_name,
            "dimension": embedding_service.dimension,
            "status": "ready"
        }
    except Exception as e:
        logger.error(f"Embedding service error: {e}")
        return {
            "available": False,
            "model": embedding_service.model_name,
            "dimension": None,
            "status": "error",
            "error": str(e)
        }


@router.post("/health")
async def health_check():
    """
    Health check endpoint - generate a test embedding
    """
    try:
        test_text = "This is a test embedding for health check"
        embedding = embedding_service.generate_embedding(test_text)

        return {
            "healthy": True,
            "model": embedding_service.model_name,
            "test_dimension": len(embedding),
            "message": "Embedding service is healthy"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

"""Test RAG search directly"""
import logging
from app.database import init_db_pool, close_db_pool
from app.rag_service import rag_service
from app.embedding_service import embedding_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_rag_search():
    try:
        # Initialize
        logger.info("Initializing...")
        init_db_pool()
        embedding_service.load_model()

        # Test search
        query = "invoice"
        logger.info(f"\nSearching for: '{query}'")

        results = rag_service.semantic_search_documents(query, top_k=5)

        logger.info(f"Found {len(results)} results:")
        for i, result in enumerate(results, 1):
            logger.info(f"\n{i}. {result.get('title')}")
            logger.info(f"   Similarity: {result.get('similarity', 0):.4f}")
            logger.info(f"   Author: {result.get('author')}")
            logger.info(f"   Type: {result.get('document_type')}")

        # Try another query
        query2 = "enterprise software"
        logger.info(f"\n\nSearching for: '{query2}'")
        results2 = rag_service.semantic_search_documents(query2, top_k=5)

        logger.info(f"Found {len(results2)} results:")
        for i, result in enumerate(results2, 1):
            logger.info(f"\n{i}. {result.get('title')}")
            logger.info(f"   Similarity: {result.get('similarity', 0):.4f}")

    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        close_db_pool()

if __name__ == "__main__":
    test_rag_search()

"""Test similarity scores"""
import logging
from app.database import init_db_pool, close_db_pool, get_db_cursor
from app.embedding_service import embedding_service
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_similarity():
    try:
        # Initialize
        logger.info("Initializing...")
        init_db_pool()
        embedding_service.load_model()

        logger.info(f"Similarity threshold from config: {settings.SIMILARITY_THRESHOLD}")

        # Test search without threshold
        query = "invoice"
        logger.info(f"\nSearching for: '{query}' (no threshold)")

        query_embedding = embedding_service.generate_embedding(query)

        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    title,
                    author,
                    1 - (embedding <=> %s::vector) as similarity
                FROM documents
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> %s::vector
                LIMIT 10
                """,
                (query_embedding, query_embedding)
            )
            results = cursor.fetchall()

            logger.info(f"\nFound {len(results)} results:")
            for r in results:
                logger.info(f"  - {r['title'][:60]}: similarity={r['similarity']:.4f}")

        # Test with enterprise
        query2 = "enterprise software white paper"
        logger.info(f"\n\nSearching for: '{query2}' (no threshold)")

        query2_embedding = embedding_service.generate_embedding(query2)

        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    title,
                    author,
                    1 - (embedding <=> %s::vector) as similarity
                FROM documents
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> %s::vector
                LIMIT 10
                """,
                (query2_embedding, query2_embedding)
            )
            results = cursor.fetchall()

            logger.info(f"\nFound {len(results)} results:")
            for r in results:
                logger.info(f"  - {r['title'][:60]}: similarity={r['similarity']:.4f}")

    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        close_db_pool()

if __name__ == "__main__":
    test_similarity()

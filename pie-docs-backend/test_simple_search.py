"""Simple test to verify search is working"""
import logging
from app.database import init_db_pool, close_db_pool, get_db_cursor
from app.embedding_service import embedding_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_search():
    try:
        # Initialize
        logger.info("Initializing...")
        init_db_pool()
        embedding_service.load_model()

        # Check if we have any documents with embeddings
        with get_db_cursor() as cursor:
            cursor.execute("SELECT COUNT(*) as count FROM documents WHERE embedding IS NOT NULL")
            count = cursor.fetchone()['count']
            logger.info(f"Documents with embeddings: {count}")

            cursor.execute("SELECT COUNT(*) as count FROM documents")
            total = cursor.fetchone()['count']
            logger.info(f"Total documents: {total}")

            if total > 0:
                cursor.execute("SELECT id, title, (embedding IS NOT NULL) as has_embedding FROM documents LIMIT 5")
                docs = cursor.fetchall()
                for doc in docs:
                    logger.info(f"  - {doc['title']}: embedding={doc['has_embedding']}")

        # Try to create a simple document with embedding
        logger.info("\nCreating test document...")
        test_content = "This is a test financial report about quarterly sales and revenue."

        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO documents (title, content, document_type, author)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                ("Test Financial Document", test_content, "Test", "System")
            )
            doc_id = cursor.fetchone()[0]
            logger.info(f"Created document: {doc_id}")

        # Generate embedding
        logger.info("Generating embedding...")
        embedding = embedding_service.generate_embedding(test_content)
        logger.info(f"Embedding dimensions: {len(embedding)}")

        # Update document with embedding
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "UPDATE documents SET embedding = %s::vector WHERE id = %s",
                (embedding, doc_id)
            )
            logger.info("Embedding stored successfully")

        # Try a search
        logger.info("\nTesting search...")
        query = "financial"
        query_embedding = embedding_service.generate_embedding(query)

        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    title,
                    1 - (embedding <=> %s::vector) as similarity
                FROM documents
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> %s::vector
                LIMIT 5
                """,
                (query_embedding, query_embedding)
            )
            results = cursor.fetchall()

            logger.info(f"Found {len(results)} results:")
            for r in results:
                logger.info(f"  - {r['title']}: similarity={r['similarity']:.4f}")

    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        close_db_pool()

if __name__ == "__main__":
    test_search()

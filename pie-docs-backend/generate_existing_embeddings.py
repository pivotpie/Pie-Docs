"""
Generate Embeddings for Existing Documents
This script processes all existing documents in the database and generates embeddings
"""
import logging
from app.database import get_db_cursor, init_db_pool, close_db_pool
from app.rag_service import rag_service
from app.embedding_service import embedding_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def generate_embeddings_for_existing_documents():
    """Process all existing documents and generate embeddings"""
    try:
        logger.info("=" * 70)
        logger.info("STARTING EMBEDDING GENERATION FOR EXISTING DOCUMENTS")
        logger.info("=" * 70)

        # Get all documents
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, title, content, ocr_text
                FROM documents
                WHERE deleted_at IS NULL
                ORDER BY created_at DESC
                """
            )
            documents = cursor.fetchall()

        if not documents:
            logger.warning("No documents found in database!")
            return

        logger.info(f"\nFound {len(documents)} documents to process\n")

        success_count = 0
        error_count = 0

        for idx, doc in enumerate(documents, 1):
            doc_id = str(doc['id'])
            title = doc['title']
            content = doc['content'] or ""
            ocr_text = doc['ocr_text'] or ""

            # Combine content and OCR text
            full_content = f"{content}\n{ocr_text}".strip()

            if not full_content:
                logger.warning(f"[{idx}/{len(documents)}] Skipping '{title}' - no content")
                continue

            logger.info(f"\n[{idx}/{len(documents)}] Processing: {title}")
            logger.info(f"  Document ID: {doc_id}")
            logger.info(f"  Content length: {len(full_content)} characters")

            try:
                # Generate document-level embedding
                logger.info("  → Generating document embedding...")
                embedding_success = rag_service.generate_and_store_document_embedding(
                    doc_id, title, full_content
                )

                if embedding_success:
                    logger.info("  ✓ Document embedding created")
                else:
                    logger.warning("  ✗ Document embedding failed")
                    error_count += 1
                    continue

                # Generate chunks and chunk embeddings
                logger.info("  → Generating chunks and embeddings...")
                chunks_success = rag_service.generate_and_store_chunks(
                    doc_id, full_content
                )

                if chunks_success:
                    logger.info("  ✓ Chunks and embeddings created")
                    success_count += 1
                else:
                    logger.warning("  ✗ Chunk generation failed")
                    error_count += 1

            except Exception as e:
                logger.error(f"  ✗ Error processing document: {e}")
                error_count += 1
                continue

        # Summary
        logger.info("\n" + "=" * 70)
        logger.info("EMBEDDING GENERATION COMPLETE!")
        logger.info("=" * 70)
        logger.info(f"✓ Successfully processed: {success_count} documents")
        logger.info(f"✗ Errors: {error_count} documents")
        logger.info(f"Total documents: {len(documents)}")
        logger.info("=" * 70)

        if success_count > 0:
            logger.info("\n🎉 Your RAG search is now ready to use!")
            logger.info("Try asking questions about your invoices at http://localhost:3001/search")

    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    try:
        # Initialize database
        logger.info("Initializing database connection...")
        init_db_pool()

        # Load embedding model
        logger.info("Loading embedding model (this may take a minute)...")
        embedding_service.load_model()
        logger.info(f"Using embedding model: {embedding_service.model_name}\n")

        # Generate embeddings
        generate_embeddings_for_existing_documents()

    except Exception as e:
        logger.error(f"Script failed: {e}", exc_info=True)
    finally:
        close_db_pool()

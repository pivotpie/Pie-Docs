#!/usr/bin/env python3
"""
Generate Embeddings for Existing Documents
This script processes all documents without embeddings and generates:
1. Document-level embeddings
2. Document chunks with embeddings
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db_cursor, init_db_pool
from app.rag_service import rag_service
from app.embedding_service import embedding_service
import logging
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_documents_without_embeddings():
    """Get all documents that don't have embeddings"""
    with get_db_cursor() as cursor:
        cursor.execute("""
            SELECT id, title, content, ocr_text
            FROM documents
            WHERE embedding IS NULL
            ORDER BY created_at DESC
        """)
        return cursor.fetchall()


def get_documents_count():
    """Get total document counts"""
    with get_db_cursor() as cursor:
        cursor.execute("""
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embeddings,
                COUNT(*) FILTER (WHERE embedding IS NULL) as without_embeddings
            FROM documents
        """)
        return cursor.fetchone()


def get_chunks_count():
    """Get chunk counts"""
    with get_db_cursor() as cursor:
        cursor.execute("""
            SELECT
                COUNT(*) as total_chunks,
                COUNT(DISTINCT document_id) as documents_with_chunks
            FROM document_chunks
        """)
        return cursor.fetchone()


def generate_embeddings_for_document(doc):
    """Generate embeddings for a single document"""
    doc_id = str(doc['id'])
    title = doc['title'] or 'Untitled'
    content = doc['content'] or doc['ocr_text'] or ''

    if not content or len(content.strip()) < 10:
        logger.warning(f"Skipping document '{title}' - insufficient content")
        return False

    try:
        # Generate document-level embedding
        logger.info(f"Generating embedding for document: {title}")
        success_doc = rag_service.generate_and_store_document_embedding(
            doc_id,
            title,
            content
        )

        if not success_doc:
            logger.error(f"Failed to generate document embedding for: {title}")
            return False

        # Generate chunks and chunk embeddings
        logger.info(f"Generating chunks for document: {title}")
        success_chunks = rag_service.generate_and_store_chunks(
            doc_id,
            content
        )

        if not success_chunks:
            logger.error(f"Failed to generate chunks for: {title}")
            return False

        logger.info(f"✓ Successfully processed: {title}")
        return True

    except Exception as e:
        logger.error(f"Error processing document '{title}': {e}")
        return False


def main():
    """Main execution"""
    print("=" * 80)
    print("RAG EMBEDDING GENERATION UTILITY".center(80))
    print("=" * 80)
    print()

    # Initialize database
    try:
        init_db_pool()
        logger.info("Database connection initialized")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        return 1

    # Load embedding model
    try:
        embedding_service.load_model()
        logger.info(f"Embedding model loaded: {embedding_service.model_name}")
    except Exception as e:
        logger.error(f"Failed to load embedding model: {e}")
        return 1

    # Get current statistics
    print("\n" + "=" * 80)
    print("CURRENT DATABASE STATISTICS")
    print("=" * 80)

    doc_stats = get_documents_count()
    chunk_stats = get_chunks_count()

    print(f"\nDocuments:")
    print(f"  Total: {doc_stats['total']}")
    print(f"  With embeddings: {doc_stats['with_embeddings']}")
    print(f"  Without embeddings: {doc_stats['without_embeddings']}")

    print(f"\nChunks:")
    print(f"  Total chunks: {chunk_stats['total_chunks']}")
    print(f"  Documents with chunks: {chunk_stats['documents_with_chunks']}")

    # Check if any work needed
    if doc_stats['without_embeddings'] == 0:
        print("\n✓ All documents already have embeddings!")
        print("  Nothing to do.")
        return 0

    # Get documents to process
    print("\n" + "=" * 80)
    print("PROCESSING DOCUMENTS")
    print("=" * 80)

    documents = get_documents_without_embeddings()
    total = len(documents)

    print(f"\nFound {total} documents to process")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Process each document
    success_count = 0
    failed_count = 0

    for i, doc in enumerate(documents, 1):
        print(f"\n[{i}/{total}] Processing: {doc['title']}")

        if generate_embeddings_for_document(doc):
            success_count += 1
        else:
            failed_count += 1

        # Progress indicator
        progress = (i / total) * 100
        print(f"Progress: {progress:.1f}% ({i}/{total})")

    # Final statistics
    print("\n" + "=" * 80)
    print("GENERATION COMPLETE")
    print("=" * 80)

    print(f"\nResults:")
    print(f"  Successful: {success_count}")
    print(f"  Failed: {failed_count}")
    print(f"  Total processed: {total}")
    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Get updated statistics
    doc_stats_after = get_documents_count()
    chunk_stats_after = get_chunks_count()

    print(f"\nUpdated Statistics:")
    print(f"  Documents with embeddings: {doc_stats_after['with_embeddings']}")
    print(f"  Total chunks: {chunk_stats_after['total_chunks']}")
    print(f"  Documents with chunks: {chunk_stats_after['documents_with_chunks']}")

    if failed_count > 0:
        print(f"\n⚠ Warning: {failed_count} documents failed to process")
        return 1
    else:
        print("\n✓ All documents processed successfully!")
        return 0


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\n⚠ Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n✗ Error: {e}")
        logger.exception("Unexpected error")
        sys.exit(1)

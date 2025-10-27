#!/usr/bin/env python3
"""
Generate chunks for all documents that are missing them
"""
import sys
import os

# Add the app directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Initialize database pool
from app.database import init_db_pool, get_db_cursor
init_db_pool()

from app.rag_service import rag_service
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_missing_chunks():
    """Generate chunks for all documents without chunks"""

    print("\n" + "="*80)
    print("FIXING MISSING CHUNKS")
    print("="*80 + "\n")

    # Get documents without chunks
    with get_db_cursor() as cursor:
        cursor.execute("""
            SELECT
                d.id,
                d.title,
                d.document_type,
                d.ocr_text,
                d.content,
                COUNT(dc.id) as chunk_count
            FROM documents d
            LEFT JOIN document_chunks dc ON dc.document_id = d.id
            GROUP BY d.id, d.title, d.document_type, d.ocr_text, d.content
            HAVING COUNT(dc.id) = 0
            ORDER BY d.created_at DESC
        """)

        docs_needing_chunks = cursor.fetchall()

    print(f"Found {len(docs_needing_chunks)} documents without chunks\n")

    if len(docs_needing_chunks) == 0:
        print("All documents already have chunks!")
        return

    success_count = 0
    error_count = 0
    skipped_count = 0

    for i, doc in enumerate(docs_needing_chunks, 1):
        doc_id = str(doc['id'])
        title = doc['title'] or 'Untitled'
        content = doc['ocr_text'] or doc['content'] or ''

        print(f"[{i}/{len(docs_needing_chunks)}] Processing: {title[:60]}")

        if not content.strip():
            print(f"  -> SKIPPED: No content to chunk")
            skipped_count += 1
            continue

        print(f"  -> Content length: {len(content)} chars")

        try:
            # Generate chunks
            success = rag_service.generate_and_store_chunks(doc_id, content)

            if success:
                # Verify chunks were created
                with get_db_cursor() as cursor:
                    cursor.execute("""
                        SELECT COUNT(*) as chunk_count
                        FROM document_chunks
                        WHERE document_id = %s
                    """, (doc_id,))
                    result = cursor.fetchone()
                    chunk_count = result['chunk_count']

                success_count += 1
                print(f"  -> SUCCESS: Created {chunk_count} chunks with embeddings")
            else:
                error_count += 1
                print(f"  -> ERROR: Failed to generate chunks")

        except Exception as e:
            error_count += 1
            print(f"  -> ERROR: {e}")
            logger.exception(f"Error processing document {doc_id}")

    print("\n" + "="*80)
    print("CHUNK GENERATION COMPLETE")
    print("="*80)
    print(f"\nRESULTS:")
    print(f"  Success: {success_count}")
    print(f"  Errors: {error_count}")
    print(f"  Skipped (no content): {skipped_count}")
    print(f"  Total processed: {len(docs_needing_chunks)}")

    # Show final stats
    with get_db_cursor() as cursor:
        cursor.execute("""
            SELECT
                COUNT(*) as total_chunks,
                COUNT(DISTINCT document_id) as docs_with_chunks
            FROM document_chunks
        """)
        stats = cursor.fetchone()

    print(f"\nFINAL DATABASE STATE:")
    print(f"  Total chunks: {stats['total_chunks']}")
    print(f"  Documents with chunks: {stats['docs_with_chunks']}")
    print("\n" + "="*80 + "\n")

if __name__ == "__main__":
    fix_missing_chunks()

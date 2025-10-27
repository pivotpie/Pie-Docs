#!/usr/bin/env python3
"""
Simple RAG diagnostic - Windows compatible
"""
import sys
import os

# Add the app directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Initialize database pool
from app.database import init_db_pool
init_db_pool()

from app.database import get_db_cursor

print("\n" + "="*80)
print("DATABASE CHECK - PIE-DOCS RAG SYSTEM")
print("="*80 + "\n")

try:
    with get_db_cursor() as cursor:
        # Check documents
        cursor.execute("""
            SELECT
                COUNT(*) as total_docs,
                COUNT(embedding) as docs_with_embeddings,
                COUNT(CASE WHEN embedding IS NULL THEN 1 END) as docs_without_embeddings,
                COUNT(ocr_text) as docs_with_ocr,
                COUNT(content) as docs_with_content
            FROM documents
        """)
        doc_stats = cursor.fetchone()

        print("DOCUMENTS TABLE:")
        print(f"  Total documents: {doc_stats['total_docs']}")
        print(f"  With embeddings: {doc_stats['docs_with_embeddings']}")
        print(f"  Without embeddings: {doc_stats['docs_without_embeddings']}")
        print(f"  With OCR text: {doc_stats['docs_with_ocr']}")
        print(f"  With content: {doc_stats['docs_with_content']}")

        # Check chunks
        cursor.execute("""
            SELECT
                COUNT(*) as total_chunks,
                COUNT(embedding) as chunks_with_embeddings,
                COUNT(CASE WHEN embedding IS NULL THEN 1 END) as chunks_without_embeddings,
                COUNT(DISTINCT document_id) as docs_with_chunks,
                AVG(LENGTH(content)) as avg_chunk_length,
                MIN(LENGTH(content)) as min_chunk_length,
                MAX(LENGTH(content)) as max_chunk_length
            FROM document_chunks
        """)
        chunk_stats = cursor.fetchone()

        print(f"\nDOCUMENT_CHUNKS TABLE:")
        print(f"  Total chunks: {chunk_stats['total_chunks']}")
        print(f"  With embeddings: {chunk_stats['chunks_with_embeddings']}")
        print(f"  Without embeddings: {chunk_stats['chunks_without_embeddings']}")
        print(f"  Documents chunked: {chunk_stats['docs_with_chunks']}")
        if chunk_stats['avg_chunk_length']:
            print(f"  Avg chunk length: {int(chunk_stats['avg_chunk_length'])} chars")
            print(f"  Min/Max chunk length: {chunk_stats['min_chunk_length']}/{chunk_stats['max_chunk_length']} chars")

        # Check if we have the function for semantic search
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM pg_proc WHERE proname = 'search_chunks_semantic'
            ) as function_exists
        """)
        func_check = cursor.fetchone()
        print(f"\nSEARCH FUNCTION:")
        print(f"  search_chunks_semantic exists: {func_check['function_exists']}")

        # Sample documents with chunk details
        cursor.execute("""
            SELECT
                d.id,
                d.title,
                d.document_type,
                LENGTH(d.ocr_text) as ocr_len,
                LENGTH(d.content) as content_len,
                d.embedding IS NOT NULL as has_doc_embedding,
                COUNT(dc.id) as chunk_count,
                COUNT(CASE WHEN dc.embedding IS NOT NULL THEN 1 END) as chunks_with_emb
            FROM documents d
            LEFT JOIN document_chunks dc ON dc.document_id = d.id
            GROUP BY d.id, d.title, d.document_type, d.ocr_text, d.content, d.embedding, d.created_at
            ORDER BY d.created_at DESC
            LIMIT 10
        """)
        sample_docs = cursor.fetchall()

        print(f"\nSAMPLE DOCUMENTS (latest 10):")
        for i, doc in enumerate(sample_docs, 1):
            title = doc['title'][:50] if doc['title'] else 'Untitled'
            print(f"\n  [{i}] {title}")
            print(f"      Type: {doc['document_type']}")
            print(f"      OCR: {doc['ocr_len'] or 0} chars, Content: {doc['content_len'] or 0} chars")
            print(f"      Doc Embedding: {'YES' if doc['has_doc_embedding'] else 'NO'}")
            print(f"      Chunks: {doc['chunk_count']} total, {doc['chunks_with_emb']} with embeddings")

        print("\n" + "="*80)
        print("CHECK COMPLETE")
        print("="*80 + "\n")

        # Summary diagnosis
        print("DIAGNOSIS:")
        if doc_stats['total_docs'] == 0:
            print("  [!] No documents in database")
        elif doc_stats['docs_with_embeddings'] == 0:
            print("  [!] ISSUE FOUND: No documents have embeddings!")
            print("      -> Need to generate embeddings for documents")
        elif chunk_stats['total_chunks'] == 0:
            print("  [!] ISSUE FOUND: No document chunks exist!")
            print("      -> Need to chunk documents and generate chunk embeddings")
        elif chunk_stats['chunks_with_embeddings'] == 0:
            print("  [!] ISSUE FOUND: Chunks exist but have no embeddings!")
            print("      -> Need to generate embeddings for chunks")
        elif chunk_stats['chunks_with_embeddings'] < chunk_stats['total_chunks'] * 0.5:
            print("  [!] WARNING: Less than 50% of chunks have embeddings")
            print(f"      -> {chunk_stats['chunks_with_embeddings']}/{chunk_stats['total_chunks']} chunks have embeddings")
        else:
            print("  [OK] Embeddings appear to be present")
            print(f"      -> {chunk_stats['chunks_with_embeddings']} chunks with embeddings")
            print("      -> Issue may be with:")
            print("         - Similarity threshold too high")
            print("         - Query embedding not matching document embeddings")
            print("         - Top-K retrieval too low")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()

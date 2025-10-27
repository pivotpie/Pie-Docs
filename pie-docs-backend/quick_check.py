#!/usr/bin/env python3
"""
Quick database check without loading embedding models
"""
from app.database import get_db_cursor

print("\n" + "="*80)
print("QUICK DATABASE CHECK")
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

        print("📄 DOCUMENTS TABLE:")
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
                COUNT(DISTINCT document_id) as docs_with_chunks,
                AVG(LENGTH(content)) as avg_chunk_length
            FROM document_chunks
        """)
        chunk_stats = cursor.fetchone()

        print(f"\n📝 DOCUMENT_CHUNKS TABLE:")
        print(f"  Total chunks: {chunk_stats['total_chunks']}")
        print(f"  With embeddings: {chunk_stats['chunks_with_embeddings']}")
        print(f"  Documents chunked: {chunk_stats['docs_with_chunks']}")
        if chunk_stats['avg_chunk_length']:
            print(f"  Avg chunk length: {int(chunk_stats['avg_chunk_length'])} chars")

        # Sample documents with details
        cursor.execute("""
            SELECT
                id,
                title,
                document_type,
                LENGTH(ocr_text) as ocr_len,
                LENGTH(content) as content_len,
                embedding IS NOT NULL as has_doc_embedding,
                (SELECT COUNT(*) FROM document_chunks WHERE document_id = documents.id) as chunk_count,
                (SELECT COUNT(*) FROM document_chunks WHERE document_id = documents.id AND embedding IS NOT NULL) as chunks_with_emb
            FROM documents
            ORDER BY created_at DESC
            LIMIT 10
        """)
        sample_docs = cursor.fetchall()

        print(f"\n📋 SAMPLE DOCUMENTS (latest 10):")
        for doc in sample_docs:
            print(f"\n  • {doc['title'][:60]}")
            print(f"    Type: {doc['document_type']}")
            print(f"    OCR: {doc['ocr_len'] or 0} chars, Content: {doc['content_len'] or 0} chars")
            print(f"    Doc Embedding: {'✓' if doc['has_doc_embedding'] else '✗'}")
            print(f"    Chunks: {doc['chunk_count']} total, {doc['chunks_with_emb']} with embeddings")

        print("\n" + "="*80)
        print("✅ CHECK COMPLETE")
        print("="*80 + "\n")

except Exception as e:
    print(f"❌ ERROR: {e}")
    import traceback
    traceback.print_exc()

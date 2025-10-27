#!/usr/bin/env python3
"""
RAG System Diagnostic Tool
Checks why RAG queries return limited results
"""
import logging
from app.database import get_db_cursor
from app.rag_service import rag_service
from app.embedding_service import embedding_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def diagnose_database():
    """Check database state"""
    print("\n" + "="*80)
    print("DATABASE DIAGNOSIS")
    print("="*80 + "\n")

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
                AVG(LENGTH(content)) as avg_chunk_length,
                AVG(token_count) as avg_token_count
            FROM document_chunks
        """)
        chunk_stats = cursor.fetchone()

        print(f"\n📝 DOCUMENT_CHUNKS TABLE:")
        print(f"  Total chunks: {chunk_stats['total_chunks']}")
        print(f"  With embeddings: {chunk_stats['chunks_with_embeddings']}")
        print(f"  Documents chunked: {chunk_stats['docs_with_chunks']}")
        if chunk_stats['avg_chunk_length']:
            print(f"  Avg chunk length: {int(chunk_stats['avg_chunk_length'])} chars")
        if chunk_stats['avg_token_count']:
            print(f"  Avg token count: {int(chunk_stats['avg_token_count'])}")

        # Sample documents
        cursor.execute("""
            SELECT id, title, document_type,
                   LENGTH(ocr_text) as ocr_len,
                   LENGTH(content) as content_len,
                   embedding IS NOT NULL as has_embedding
            FROM documents
            WHERE ocr_text IS NOT NULL OR content IS NOT NULL
            LIMIT 5
        """)
        sample_docs = cursor.fetchall()

        print(f"\n📋 SAMPLE DOCUMENTS:")
        for doc in sample_docs:
            print(f"  • {doc['title'][:50]}")
            print(f"    Type: {doc['document_type']}, OCR: {doc['ocr_len']} chars, "
                  f"Content: {doc['content_len']} chars, Embedding: {'✓' if doc['has_embedding'] else '✗'}")


def diagnose_embedding_service():
    """Check embedding service"""
    print("\n" + "="*80)
    print("EMBEDDING SERVICE DIAGNOSIS")
    print("="*80 + "\n")

    try:
        # Try to generate a test embedding
        test_text = "This is a test document about invoices and payments"
        embedding = embedding_service.generate_embedding(test_text)

        print("✅ EMBEDDING SERVICE STATUS:")
        print(f"  Model: {embedding_service.model_name}")
        print(f"  Dimension: {len(embedding)}")
        print(f"  Sample values: {embedding[:5]}")
        print(f"  Model loaded: {embedding_service.model is not None}")

        return True
    except Exception as e:
        print("❌ EMBEDDING SERVICE ERROR:")
        print(f"  Error: {e}")
        return False


def diagnose_search(query: str = "invoices for Google"):
    """Test search functionality"""
    print("\n" + "="*80)
    print(f"SEARCH DIAGNOSIS: '{query}'")
    print("="*80 + "\n")

    try:
        # Generate query embedding
        query_embedding = embedding_service.generate_embedding(query)
        print(f"✅ Query embedding generated: {len(query_embedding)} dimensions\n")

        # Test semantic search on chunks
        print("🔍 SEMANTIC SEARCH ON CHUNKS:")
        chunks = rag_service.semantic_search_chunks(query, top_k=10)

        print(f"  Found {len(chunks)} chunks")
        print(f"  Similarity threshold: {rag_service.similarity_threshold}")

        if chunks:
            print(f"\n  📊 TOP CHUNKS:")
            for i, chunk in enumerate(chunks[:5], 1):
                print(f"\n  [{i}] Document: {chunk.get('title', 'Unknown')}")
                print(f"      Similarity: {chunk.get('similarity', 0):.4f}")
                print(f"      Content: {chunk.get('chunk_content', '')[:100]}...")
        else:
            print("  ⚠️ NO CHUNKS FOUND!")
            print("  Possible reasons:")
            print("    - No embeddings in database")
            print("    - Similarity threshold too high")
            print("    - Query embedding not matching document embeddings")

        # Test RAG response generation
        print(f"\n🤖 RAG RESPONSE GENERATION:")
        rag_response = rag_service.generate_rag_response(query)

        print(f"  Confidence: {rag_response['confidence']:.2f}")
        print(f"  Relevant chunks: {len(rag_response['relevant_chunks'])}")
        print(f"  Sources: {len(rag_response['sources'])}")
        print(f"\n  Answer preview:")
        print(f"  {rag_response['answer'][:300]}...")

    except Exception as e:
        logger.exception("Search diagnosis error")
        print(f"❌ SEARCH ERROR: {e}")


def diagnose_similarity_scores():
    """Check actual similarity scores in database"""
    print("\n" + "="*80)
    print("SIMILARITY SCORE DIAGNOSIS")
    print("="*80 + "\n")

    test_query = "invoice payment Google"

    try:
        query_embedding = embedding_service.generate_embedding(test_query)

        with get_db_cursor() as cursor:
            # Check similarity distribution
            cursor.execute("""
                SELECT
                    CASE
                        WHEN 1 - (embedding <=> %s::vector) >= 0.8 THEN 'High (0.8+)'
                        WHEN 1 - (embedding <=> %s::vector) >= 0.6 THEN 'Medium (0.6-0.8)'
                        WHEN 1 - (embedding <=> %s::vector) >= 0.4 THEN 'Low (0.4-0.6)'
                        ELSE 'Very Low (<0.4)'
                    END as similarity_range,
                    COUNT(*) as count
                FROM document_chunks
                WHERE embedding IS NOT NULL
                GROUP BY similarity_range
                ORDER BY similarity_range
            """, (query_embedding, query_embedding, query_embedding))

            results = cursor.fetchall()

            print(f"📈 SIMILARITY DISTRIBUTION for query: '{test_query}'")
            for row in results:
                print(f"  {row['similarity_range']}: {row['count']} chunks")

            # Get top matches regardless of threshold
            cursor.execute("""
                SELECT
                    c.content,
                    d.title,
                    1 - (c.embedding <=> %s::vector) as similarity
                FROM document_chunks c
                JOIN documents d ON c.document_id = d.id
                WHERE c.embedding IS NOT NULL
                ORDER BY c.embedding <=> %s::vector
                LIMIT 5
            """, (query_embedding, query_embedding))

            top_matches = cursor.fetchall()

            print(f"\n🎯 TOP 5 MATCHES (ignoring threshold):")
            for i, match in enumerate(top_matches, 1):
                print(f"\n  [{i}] Similarity: {match['similarity']:.4f}")
                print(f"      Document: {match['title']}")
                print(f"      Content: {match['content'][:100]}...")

    except Exception as e:
        logger.exception("Similarity diagnosis error")
        print(f"❌ ERROR: {e}")


def main():
    """Run all diagnostics"""
    print("\n" + "="*80)
    print("🔬 PIE-DOCS RAG SYSTEM DIAGNOSTICS")
    print("="*80)

    # Run diagnostics
    diagnose_database()
    embedding_ok = diagnose_embedding_service()

    if embedding_ok:
        diagnose_search()
        diagnose_similarity_scores()
    else:
        print("\n⚠️ Skipping search tests - embedding service not working")

    print("\n" + "="*80)
    print("✅ DIAGNOSTICS COMPLETE")
    print("="*80 + "\n")


if __name__ == "__main__":
    main()

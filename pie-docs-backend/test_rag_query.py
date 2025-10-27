#!/usr/bin/env python3
"""
Test RAG query with updated chunks
"""
import sys
import os

# Add the app directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Initialize database pool
from app.database import init_db_pool
init_db_pool()

from app.rag_service import rag_service
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_query(query_text="What invoices do we have?"):
    """Test a RAG query"""

    print("\n" + "="*80)
    print(f"TESTING RAG QUERY: '{query_text}'")
    print("="*80 + "\n")

    try:
        # Test chunk search first
        print("STEP 1: Searching for relevant chunks...")
        chunks = rag_service.semantic_search_chunks(query_text, top_k=10)

        print(f"  Found {len(chunks)} chunks")
        print(f"  Similarity threshold: {rag_service.similarity_threshold}\n")

        if chunks:
            print("TOP CHUNKS:")
            for i, chunk in enumerate(chunks[:8], 1):
                print(f"\n  [{i}] Document: {chunk.get('title', 'Unknown')}")
                print(f"      Similarity: {chunk.get('similarity', 0):.4f}")
                print(f"      Content preview: {chunk.get('chunk_content', '')[:120]}...")

        # Test full RAG response
        print("\n" + "-"*80)
        print("STEP 2: Generating RAG response...\n")

        response = rag_service.generate_rag_response(query_text)

        print(f"CONFIDENCE: {response['confidence']:.2f}")
        print(f"RELEVANT CHUNKS: {len(response['relevant_chunks'])}")
        print(f"SOURCES: {len(response['sources'])}")

        print(f"\nANSWER:")
        print("-"*80)
        print(response['answer'])
        print("-"*80)

        if response['sources']:
            print(f"\nSOURCES:")
            for i, source in enumerate(response['sources'], 1):
                print(f"  [{i}] {source['title']} ({source['document_type']})")
                print(f"      {len(source['chunks'])} chunks used")

        print("\n" + "="*80)
        print("TEST COMPLETE")
        print("="*80 + "\n")

    except Exception as e:
        print(f"ERROR: {e}")
        logger.exception("Error testing RAG query")

if __name__ == "__main__":
    # Test with different queries
    test_query("What invoices do we have?")
    print("\n\n")
    test_query("invoices for Google")

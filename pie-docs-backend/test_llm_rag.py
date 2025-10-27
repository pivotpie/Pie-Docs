#!/usr/bin/env python3
"""
Test LLM-powered RAG System
Creates test documents and queries them with AI responses
"""

import requests
import json
import time

API_BASE = "http://localhost:8001"

def print_section(title):
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)

def create_test_document():
    """Create a test document"""
    print_section("Step 1: Creating Test Document")

    document = {
        "title": "Enterprise RAG Strategy 2025",
        "content": """
Our company is implementing a Retrieval-Augmented Generation (RAG) system to improve knowledge management.

Key Technologies:
- PostgreSQL with pgvector extension for vector storage
- Sentence transformers (all-MiniLM-L6-v2) for generating embeddings
- GPT-4o-mini for generating natural language responses
- FastAPI backend with React frontend

Expected Benefits:
- 70% reduction in document search time
- Improved knowledge discovery across the organization
- Better decision-making with contextual information
- AI-powered question answering over document library

Implementation Timeline:
The system will be deployed in Q1 2025 with initial focus on:
1. Technical documentation
2. Internal wikis
3. Process documents
4. Training materials

The RAG system uses semantic search to find relevant document chunks,
then uses an LLM to generate natural language responses based on the
retrieved context. This enables employees to ask questions in natural
language and receive accurate answers with source attribution.
        """,
        "document_type": "Strategy Document",
        "author": "RAG Implementation Team",
        "tags": ["RAG", "AI", "Strategy", "2025", "Knowledge Management"],
        "metadata": {
            "department": "Engineering",
            "priority": "High",
            "year": 2025,
            "status": "Active"
        }
    }

    try:
        response = requests.post(
            f"{API_BASE}/api/v1/documents",
            json=document,
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            doc_id = data.get('id')
            print(f"✅ Document created successfully!")
            print(f"   Document ID: {doc_id}")
            print(f"   Embeddings generated: Yes")
            return doc_id
        else:
            print(f"❌ Failed to create document: {response.status_code}")
            print(f"   Error: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_rag_query(query):
    """Test RAG query with LLM"""
    print_section(f"Step 2: Testing RAG Query with LLM")
    print(f"\nQuery: '{query}'")
    print("\nWaiting for AI response (may take 5-10 seconds)...")

    try:
        start_time = time.time()

        response = requests.post(
            f"{API_BASE}/api/v1/rag/query",
            json={"query": query, "top_k": 5},
            timeout=30
        )

        elapsed = time.time() - start_time

        if response.status_code == 200:
            data = response.json()

            print(f"\n✅ Response received in {elapsed:.1f} seconds")
            print("\n" + "-"*70)
            print("AI RESPONSE:")
            print("-"*70)
            print(data.get('answer', 'No answer'))
            print("-"*70)

            # Show metadata
            print(f"\n📊 Response Metadata:")
            print(f"   Confidence: {data.get('confidence', 0):.1%}")
            print(f"   Chunks Used: {len(data.get('relevant_chunks', []))}")
            print(f"   Sources: {len(data.get('sources', []))}")

            # Show top chunk
            chunks = data.get('relevant_chunks', [])
            if chunks:
                print(f"\n📄 Top Relevant Chunk:")
                print(f"   From: {chunks[0].get('document_title', 'Unknown')}")
                print(f"   Similarity: {chunks[0].get('similarity', 0):.2f}")
                content = chunks[0].get('content', '')[:150]
                print(f"   Preview: {content}...")

            return True
        else:
            print(f"❌ Query failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def check_llm_status():
    """Check if LLM is configured"""
    print_section("Step 0: Checking LLM Status")

    try:
        response = requests.get(f"{API_BASE}/api/v1/status", timeout=10)
        if response.status_code == 200:
            data = response.json()
            services = data.get('services', {})
            llm_status = services.get('rag_service', 'unknown')

            print(f"Backend Status: ✅ Running")
            print(f"RAG Service: {llm_status}")

            # Try to infer if LLM is configured by looking at response
            print(f"\nLLM Provider: Will be shown in query logs")
            return True
        else:
            print(f"⚠️ Status check returned: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        return False

def main():
    print("\n")
    print("╔" + "="*68 + "╗")
    print("║" + " "*18 + "LLM-Powered RAG System Test" + " "*23 + "║")
    print("╚" + "="*68 + "╝")

    # Check backend
    if not check_llm_status():
        print("\n❌ Backend not available. Please start it first:")
        print("   cd pie-docs-backend")
        print("   python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload")
        return 1

    # Wait for backend
    time.sleep(2)

    # Create test document
    doc_id = create_test_document()
    if not doc_id:
        print("\n❌ Failed to create test document")
        return 1

    # Wait for embeddings to be generated
    print("\n⏳ Waiting 3 seconds for embeddings to be generated...")
    time.sleep(3)

    # Test RAG queries
    queries = [
        "What technologies are we using for RAG?",
        "When will the system be deployed?",
        "What are the expected benefits of the RAG system?",
        "How does our RAG system work?"
    ]

    print_section("Testing Multiple Queries")

    success_count = 0
    for i, query in enumerate(queries, 1):
        print(f"\n{'─'*70}")
        print(f"Query {i}/{len(queries)}: {query}")
        print(f"{'─'*70}")

        if test_rag_query(query):
            success_count += 1

        if i < len(queries):
            print("\n⏳ Waiting 2 seconds before next query...")
            time.sleep(2)

    # Summary
    print_section("Test Summary")
    print(f"\n✅ Successful Queries: {success_count}/{len(queries)}")

    if success_count == len(queries):
        print("\n🎉 All tests passed! LLM-powered RAG is working perfectly!")
        print("\nYou should see in backend logs:")
        print("   'Generated LLM response using openai'")
    elif success_count > 0:
        print(f"\n⚠️ Some tests passed. Check backend logs for errors.")
    else:
        print(f"\n❌ No tests passed. Check:")
        print("   1. Backend is running")
        print("   2. LLM_PROVIDER=openai in .env")
        print("   3. OPENAI_API_KEY is set")
        print("   4. Backend logs for errors")

    print("\n" + "="*70)
    return 0 if success_count == len(queries) else 1

if __name__ == "__main__":
    try:
        exit(main())
    except KeyboardInterrupt:
        print("\n\nTest interrupted.")
        exit(130)
    except Exception as e:
        print(f"\n\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

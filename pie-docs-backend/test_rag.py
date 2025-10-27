#!/usr/bin/env python3
"""
RAG System Test Script
Tests all RAG functionality end-to-end
"""

import requests
import json
import time
from typing import Dict, Any

API_BASE = "http://localhost:8001"

def print_header(title: str):
    """Print a formatted header"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def print_response(response: requests.Response, title: str = "Response"):
    """Print formatted response"""
    print(f"\n{title}:")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        try:
            data = response.json()
            print(json.dumps(data, indent=2))
        except:
            print(response.text)
    else:
        print(f"Error: {response.text}")

def test_health():
    """Test 1: Health Check"""
    print_header("Test 1: Health Check")
    try:
        response = requests.get(f"{API_BASE}/health", timeout=5)
        print_response(response, "Health Status")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_status():
    """Test 2: System Status"""
    print_header("Test 2: System Status")
    try:
        response = requests.get(f"{API_BASE}/api/v1/status", timeout=10)
        print_response(response, "System Status")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Status check failed: {e}")
        return False

def test_create_document():
    """Test 3: Create Document with Auto-Embeddings"""
    print_header("Test 3: Create Document (Auto-Embeddings)")

    document = {
        "title": "Test Document - Enterprise AI Strategy",
        "content": """
        This document outlines our enterprise AI strategy for 2025.

        Key Focus Areas:
        1. Intelligent Document Processing (IDP)
        2. Retrieval-Augmented Generation (RAG)
        3. Vector Search and Semantic Similarity
        4. Natural Language Processing

        The system will enable employees to ask questions about our document library
        and receive AI-powered answers with source attribution.

        Technologies:
        - PostgreSQL with pgvector for vector storage
        - Sentence transformers for embeddings
        - FastAPI for backend services
        - React for frontend interface

        Expected Benefits:
        - 70% reduction in document search time
        - Improved knowledge discovery
        - Better decision making with context
        """,
        "document_type": "Strategy Document",
        "author": "RAG Test Script",
        "tags": ["AI", "RAG", "Strategy", "Testing"],
        "metadata": {
            "department": "Engineering",
            "priority": "High",
            "year": 2025
        }
    }

    try:
        response = requests.post(
            f"{API_BASE}/api/v1/documents",
            json=document,
            timeout=30
        )
        print_response(response, "Document Creation")

        if response.status_code == 200:
            doc_id = response.json().get('id')
            print(f"\n✅ Document created with ID: {doc_id}")
            print("   Embeddings generated automatically!")
            return doc_id
        return None
    except Exception as e:
        print(f"❌ Document creation failed: {e}")
        return None

def test_rag_suggestions():
    """Test 4: Get RAG Suggestions"""
    print_header("Test 4: RAG Query Suggestions")
    try:
        response = requests.get(f"{API_BASE}/api/v1/rag/suggestions", timeout=5)
        print_response(response, "Suggested Queries")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Suggestions failed: {e}")
        return False

def test_rag_query(query: str):
    """Test 5: RAG Query"""
    print_header(f"Test 5: RAG Query - '{query}'")

    payload = {
        "query": query,
        "top_k": 5
    }

    try:
        print(f"Sending query: {query}")
        print("Waiting for response (may take 5-10s)...")

        response = requests.post(
            f"{API_BASE}/api/v1/rag/query",
            json=payload,
            timeout=30
        )

        print_response(response, "RAG Response")

        if response.status_code == 200:
            data = response.json()
            print("\n📊 Response Analysis:")
            print(f"   Confidence: {data.get('confidence', 0):.2%}")
            print(f"   Relevant Chunks: {len(data.get('relevant_chunks', []))}")
            print(f"   Sources: {len(data.get('sources', []))}")

            # Print first chunk sample
            chunks = data.get('relevant_chunks', [])
            if chunks:
                print(f"\n   Top Chunk (similarity: {chunks[0].get('similarity', 0):.2f}):")
                print(f"   From: {chunks[0].get('document_title', 'Unknown')}")
                content = chunks[0].get('content', '')
                print(f"   Preview: {content[:150]}...")

            return True
        return False
    except Exception as e:
        print(f"❌ RAG query failed: {e}")
        return False

def test_semantic_search(query: str):
    """Test 6: Semantic Search"""
    print_header(f"Test 6: Semantic Search - '{query}'")

    payload = {
        "query": query,
        "search_type": "semantic",
        "top_k": 3
    }

    try:
        response = requests.post(
            f"{API_BASE}/api/v1/search",
            json=payload,
            timeout=10
        )

        print_response(response, "Search Results")

        if response.status_code == 200:
            data = response.json()
            results = data.get('results', [])
            print(f"\n📊 Found {len(results)} results in {data.get('timeTaken', 0)}ms")

            for i, result in enumerate(results[:3], 1):
                print(f"\n   Result {i}:")
                print(f"   Title: {result.get('title', 'Unknown')}")
                print(f"   Similarity: {result.get('similarity', 0):.2f}")
                print(f"   Type: {result.get('document_type', 'Unknown')}")

            return True
        return False
    except Exception as e:
        print(f"❌ Semantic search failed: {e}")
        return False

def test_hybrid_search(query: str):
    """Test 7: Hybrid Search"""
    print_header(f"Test 7: Hybrid Search - '{query}'")

    payload = {
        "query": query,
        "search_type": "hybrid",
        "top_k": 3
    }

    try:
        response = requests.post(
            f"{API_BASE}/api/v1/search",
            json=payload,
            timeout=10
        )

        print_response(response, "Hybrid Search Results")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Hybrid search failed: {e}")
        return False

def run_all_tests():
    """Run all RAG tests"""
    print("\n")
    print("╔" + "="*58 + "╗")
    print("║" + " "*15 + "RAG SYSTEM TEST SUITE" + " "*22 + "║")
    print("╚" + "="*58 + "╝")

    results = {}

    # Test 1: Health Check
    results['health'] = test_health()
    time.sleep(1)

    # Test 2: System Status
    results['status'] = test_status()
    time.sleep(1)

    # Test 3: Create Document
    doc_id = test_create_document()
    results['create_doc'] = doc_id is not None
    time.sleep(2)  # Wait for embedding generation

    # Test 4: RAG Suggestions
    results['suggestions'] = test_rag_suggestions()
    time.sleep(1)

    # Test 5: RAG Query
    results['rag_query'] = test_rag_query("What is our AI strategy?")
    time.sleep(1)

    # Test 6: Semantic Search
    results['semantic'] = test_semantic_search("document processing")
    time.sleep(1)

    # Test 7: Hybrid Search
    results['hybrid'] = test_hybrid_search("vector search")

    # Print Summary
    print_header("TEST SUMMARY")
    passed = sum(1 for v in results.values() if v)
    total = len(results)

    print(f"\nTests Passed: {passed}/{total}\n")

    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status}  {test_name}")

    print("\n" + "="*60)

    if passed == total:
        print("\n🎉 All tests passed! RAG system is fully functional.")
    elif passed >= total * 0.7:
        print(f"\n⚠️  {passed}/{total} tests passed. Core functionality working.")
    else:
        print(f"\n❌ Only {passed}/{total} tests passed. Check backend logs.")

    print("\n" + "="*60 + "\n")

    return passed == total

if __name__ == "__main__":
    try:
        success = run_all_tests()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user.")
        exit(130)
    except Exception as e:
        print(f"\n\n❌ Test suite failed with error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

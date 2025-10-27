"""
Cognitive Search Service - AI-powered semantic search using embeddings

Provides:
- Semantic search using vector embeddings
- Relevance-based ranking
- Multi-field search (content, metadata, entities)
- Similarity-based document discovery
"""
import logging
import os
from typing import List, Dict, Tuple, Optional
import json

logger = logging.getLogger(__name__)

# Check if OpenAI is available
OPENAI_AVAILABLE = False
OPENAI_API_KEY = None

try:
    from openai import OpenAI
    import numpy as np

    # Get API key from environment or use provided key
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

    if OPENAI_API_KEY:
        OPENAI_AVAILABLE = True
        logger.info("OpenAI Cognitive Search is available")
    else:
        logger.warning("OpenAI API key not found. Cognitive Search will use fallback mode.")

except ImportError as e:
    logger.warning(f"Cognitive Search dependencies not fully installed: {e}")
    logger.warning("Install: pip install openai numpy")


class CognitiveSearchService:
    """Service for AI-powered semantic search using embeddings"""

    def __init__(self):
        self.openai_available = OPENAI_AVAILABLE
        if self.openai_available:
            self.client = OpenAI(api_key=OPENAI_API_KEY)
            self.embedding_model = "text-embedding-3-small"  # Cost-effective, 1536 dimensions
        else:
            self.client = None

    def is_available(self) -> bool:
        """Check if Cognitive Search service is available"""
        return self.openai_available

    def generate_embedding(
        self,
        text: str
    ) -> Tuple[bool, Optional[List[float]], Optional[str]]:
        """
        Generate embedding vector for text

        Args:
            text: Text to embed

        Returns:
            Tuple of (success, embedding_vector, error_message)
        """
        if not self.openai_available:
            return False, None, "Cognitive Search not available. Please configure OpenAI API key."

        if not text or len(text.strip()) < 3:
            return False, None, "Text too short for embedding generation"

        try:
            # Truncate text if too long (OpenAI limit is ~8000 tokens)
            text_to_embed = text[:30000]  # Roughly 8000 tokens

            response = self.client.embeddings.create(
                model=self.embedding_model,
                input=text_to_embed
            )

            embedding = response.data[0].embedding

            logger.info(f"Generated embedding: {len(embedding)} dimensions")

            return True, embedding, None

        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return False, None, str(e)

    def generate_document_embedding(
        self,
        document_content: Dict
    ) -> Tuple[bool, Optional[List[float]], Optional[str]]:
        """
        Generate comprehensive embedding for document

        Combines multiple fields for better search relevance:
        - Title
        - OCR content
        - Metadata
        - Tags and keywords

        Args:
            document_content: Dict with document fields

        Returns:
            Tuple of (success, embedding_vector, error_message)
        """
        if not self.openai_available:
            return False, None, "Cognitive Search not available."

        try:
            # Build comprehensive text representation
            parts = []

            if document_content.get('title'):
                # Weight title more heavily
                parts.append(f"Title: {document_content['title']}")
                parts.append(document_content['title'])  # Add twice for emphasis

            if document_content.get('ocr_content'):
                content = document_content['ocr_content']
                # Take first 20000 chars to avoid token limits
                parts.append(f"Content: {content[:20000]}")

            if document_content.get('document_type'):
                parts.append(f"Type: {document_content['document_type']}")

            if document_content.get('tags'):
                tags = document_content['tags']
                if isinstance(tags, list):
                    parts.append(f"Tags: {', '.join(tags)}")

            if document_content.get('keywords'):
                keywords = document_content['keywords']
                if isinstance(keywords, list):
                    parts.append(f"Keywords: {', '.join(keywords)}")

            if document_content.get('summary'):
                parts.append(f"Summary: {document_content['summary']}")

            # Combine all parts
            combined_text = "\n\n".join(parts)

            if not combined_text or len(combined_text.strip()) < 10:
                return False, None, "Insufficient document content for embedding"

            # Generate embedding
            return self.generate_embedding(combined_text)

        except Exception as e:
            logger.error(f"Error generating document embedding: {e}")
            return False, None, str(e)

    def semantic_search(
        self,
        query: str,
        documents: List[Dict],
        top_k: int = 10
    ) -> Tuple[bool, Optional[List[Dict]], Optional[str]]:
        """
        Perform semantic search on documents

        Args:
            query: Search query
            documents: List of document dicts with embeddings
            top_k: Number of top results to return

        Returns:
            Tuple of (success, ranked_results, error_message)

        Ranked results include:
        - document: Original document dict
        - score: Similarity score (0-1, higher is better)
        - rank: Result ranking (1, 2, 3, ...)
        """
        if not self.openai_available:
            return False, None, "Cognitive Search not available."

        try:
            # Generate query embedding
            success, query_embedding, error = self.generate_embedding(query)

            if not success:
                return False, None, f"Failed to generate query embedding: {error}"

            # Calculate similarity scores
            results = []

            for doc in documents:
                if not doc.get('embedding'):
                    continue

                doc_embedding = doc['embedding']

                # Calculate cosine similarity
                similarity = self._cosine_similarity(query_embedding, doc_embedding)

                results.append({
                    'document': doc,
                    'score': float(similarity),
                    'rank': 0  # Will be set after sorting
                })

            # Sort by similarity score (descending)
            results.sort(key=lambda x: x['score'], reverse=True)

            # Add ranks
            for i, result in enumerate(results[:top_k]):
                result['rank'] = i + 1

            logger.info(f"Semantic search returned {len(results[:top_k])} results")

            return True, results[:top_k], None

        except Exception as e:
            logger.error(f"Error in semantic search: {e}")
            return False, None, str(e)

    def find_similar_documents(
        self,
        document_embedding: List[float],
        candidate_documents: List[Dict],
        top_k: int = 5,
        threshold: float = 0.7
    ) -> Tuple[bool, Optional[List[Dict]], Optional[str]]:
        """
        Find documents similar to a given document

        Args:
            document_embedding: Embedding of the source document
            candidate_documents: List of documents to compare against
            top_k: Number of similar documents to return
            threshold: Minimum similarity score (0-1)

        Returns:
            Tuple of (success, similar_documents, error_message)
        """
        try:
            similarities = []

            for candidate in candidate_documents:
                if not candidate.get('embedding'):
                    continue

                similarity = self._cosine_similarity(document_embedding, candidate['embedding'])

                if similarity >= threshold:
                    similarities.append({
                        'document': candidate,
                        'score': float(similarity),
                        'rank': 0
                    })

            # Sort by similarity
            similarities.sort(key=lambda x: x['score'], reverse=True)

            # Add ranks
            for i, result in enumerate(similarities[:top_k]):
                result['rank'] = i + 1

            logger.info(f"Found {len(similarities[:top_k])} similar documents")

            return True, similarities[:top_k], None

        except Exception as e:
            logger.error(f"Error finding similar documents: {e}")
            return False, None, str(e)

    def _cosine_similarity(
        self,
        vec1: List[float],
        vec2: List[float]
    ) -> float:
        """
        Calculate cosine similarity between two vectors

        Args:
            vec1: First vector
            vec2: Second vector

        Returns:
            Similarity score (0-1, higher is more similar)
        """
        try:
            import numpy as np

            v1 = np.array(vec1)
            v2 = np.array(vec2)

            # Cosine similarity: dot product / (magnitude1 * magnitude2)
            dot_product = np.dot(v1, v2)
            magnitude1 = np.linalg.norm(v1)
            magnitude2 = np.linalg.norm(v2)

            if magnitude1 == 0 or magnitude2 == 0:
                return 0.0

            similarity = dot_product / (magnitude1 * magnitude2)

            # Normalize to 0-1 range (cosine similarity is -1 to 1)
            normalized = (similarity + 1) / 2

            return normalized

        except Exception as e:
            logger.error(f"Error calculating cosine similarity: {e}")
            return 0.0

    def hybrid_search(
        self,
        query: str,
        documents: List[Dict],
        keyword_weight: float = 0.3,
        semantic_weight: float = 0.7,
        top_k: int = 10
    ) -> Tuple[bool, Optional[List[Dict]], Optional[str]]:
        """
        Hybrid search combining keyword matching and semantic search

        Args:
            query: Search query
            documents: List of document dicts
            keyword_weight: Weight for keyword matching (0-1)
            semantic_weight: Weight for semantic similarity (0-1)
            top_k: Number of results to return

        Returns:
            Tuple of (success, ranked_results, error_message)
        """
        if not self.openai_available:
            return False, None, "Cognitive Search not available."

        try:
            # Normalize weights
            total_weight = keyword_weight + semantic_weight
            keyword_weight = keyword_weight / total_weight
            semantic_weight = semantic_weight / total_weight

            # Semantic search
            success, semantic_results, error = self.semantic_search(query, documents, top_k=len(documents))

            if not success:
                return False, None, error

            # Create score map
            semantic_scores = {
                result['document'].get('id'): result['score']
                for result in semantic_results
            }

            # Keyword matching
            query_lower = query.lower()
            query_terms = query_lower.split()

            combined_results = []

            for doc in documents:
                doc_id = doc.get('id')

                # Semantic score
                semantic_score = semantic_scores.get(doc_id, 0.0)

                # Keyword score
                keyword_score = 0.0
                searchable_text = " ".join([
                    str(doc.get('title', '')),
                    str(doc.get('ocr_content', ''))[:1000],
                    " ".join(doc.get('tags', [])),
                    " ".join(doc.get('keywords', []))
                ]).lower()

                # Count matching terms
                matches = sum(1 for term in query_terms if term in searchable_text)
                if query_terms:
                    keyword_score = matches / len(query_terms)

                # Combined score
                combined_score = (semantic_weight * semantic_score) + (keyword_weight * keyword_score)

                combined_results.append({
                    'document': doc,
                    'score': float(combined_score),
                    'semantic_score': float(semantic_score),
                    'keyword_score': float(keyword_score),
                    'rank': 0
                })

            # Sort by combined score
            combined_results.sort(key=lambda x: x['score'], reverse=True)

            # Add ranks
            for i, result in enumerate(combined_results[:top_k]):
                result['rank'] = i + 1

            logger.info(f"Hybrid search returned {len(combined_results[:top_k])} results")

            return True, combined_results[:top_k], None

        except Exception as e:
            logger.error(f"Error in hybrid search: {e}")
            return False, None, str(e)


# Singleton instance
cognitive_search_service = CognitiveSearchService()


# Convenience functions
def is_search_available() -> bool:
    """Check if Cognitive Search service is available"""
    return cognitive_search_service.is_available()


def generate_embedding(text: str) -> Tuple[bool, Optional[List[float]], Optional[str]]:
    """Generate embedding for text"""
    return cognitive_search_service.generate_embedding(text)


def search_documents(query: str, documents: List[Dict], top_k: int = 10) -> Tuple[bool, Optional[List[Dict]], Optional[str]]:
    """Search documents semantically"""
    return cognitive_search_service.semantic_search(query, documents, top_k)

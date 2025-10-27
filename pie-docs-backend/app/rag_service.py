from typing import List, Dict, Any, Optional
import logging
from app.database import get_db_cursor
from app.embedding_service import embedding_service
from app.config import settings

logger = logging.getLogger(__name__)

# Import LLM service (will be initialized on first use)
try:
    from app.llm_service import llm_service
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False
    logger.warning("LLM service not available. Using template-based responses.")

class RAGService:
    def __init__(self):
        self.chunk_size = settings.CHUNK_SIZE
        self.chunk_overlap = settings.CHUNK_OVERLAP
        self.similarity_threshold = 0.45  # 45% similarity threshold - balance between precision and recall
        self.top_k = settings.TOP_K_RESULTS

    def chunk_text(self, text: str) -> List[str]:
        """Split text into overlapping chunks"""
        if not text:
            return []

        words = text.split()
        chunks = []

        for i in range(0, len(words), self.chunk_size - self.chunk_overlap):
            chunk = ' '.join(words[i:i + self.chunk_size])
            if chunk:  # Only add non-empty chunks
                chunks.append(chunk)

            # Break if we've reached the end
            if i + self.chunk_size >= len(words):
                break

        return chunks

    def generate_and_store_document_embedding(self, document_id: str, title: str, content: str) -> bool:
        """Generate embedding for a document and update database"""
        try:
            # Combine title and content for embedding
            text_for_embedding = f"{title}\n\n{content}"

            # Generate embedding
            embedding = embedding_service.generate_embedding(text_for_embedding)

            # Update document with embedding
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    UPDATE documents
                    SET embedding = %s::vector
                    WHERE id = %s
                    """,
                    (embedding, document_id)
                )

            logger.info(f"Generated embedding for document {document_id}")
            return True

        except Exception as e:
            logger.error(f"Error generating document embedding: {e}")
            return False

    def generate_and_store_chunks(self, document_id: str, content: str) -> bool:
        """Chunk document and generate embeddings for each chunk"""
        try:
            # Create chunks
            chunks = self.chunk_text(content)

            if not chunks:
                logger.warning(f"No chunks created for document {document_id}")
                return False

            # Generate embeddings for all chunks
            embeddings = embedding_service.generate_embeddings_batch(chunks)

            # Store chunks with embeddings
            with get_db_cursor(commit=True) as cursor:
                for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                    cursor.execute(
                        """
                        INSERT INTO document_chunks (document_id, chunk_index, content, embedding, token_count)
                        VALUES (%s, %s, %s, %s::vector, %s)
                        ON CONFLICT (document_id, chunk_index) DO UPDATE
                        SET content = EXCLUDED.content,
                            embedding = EXCLUDED.embedding,
                            token_count = EXCLUDED.token_count
                        """,
                        (document_id, idx, chunk, embedding, len(chunk.split()))
                    )

            logger.info(f"Created {len(chunks)} chunks for document {document_id}")
            return True

        except Exception as e:
            logger.error(f"Error generating chunks: {e}")
            return False

    def semantic_search_documents(self, query: str, top_k: Optional[int] = None) -> List[Dict[str, Any]]:
        """Perform semantic search on documents using vector similarity"""
        try:
            # Generate query embedding
            query_embedding = embedding_service.generate_embedding(query)

            # Search documents by vector similarity
            k = top_k or self.top_k
            with get_db_cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        id,
                        title,
                        content,
                        document_type,
                        author,
                        tags,
                        created_at,
                        modified_at,
                        metadata,
                        1 - (embedding <=> %s::vector) as similarity
                    FROM documents
                    WHERE embedding IS NOT NULL
                    AND 1 - (embedding <=> %s::vector) >= %s
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                    """,
                    (query_embedding, query_embedding, self.similarity_threshold, query_embedding, k)
                )

                results = cursor.fetchall()

            return [dict(row) for row in results]

        except Exception as e:
            logger.error(f"Error in semantic search: {e}")
            logger.exception(e)
            return []

    def semantic_search_chunks(self, query: str, top_k: Optional[int] = None) -> List[Dict[str, Any]]:
        """Perform semantic search on document chunks (RAG)"""
        try:
            # Generate query embedding
            query_embedding = embedding_service.generate_embedding(query)

            # Search chunks
            k = top_k or (self.top_k * 3)  # Get more chunks than documents
            with get_db_cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        c.chunk_id,
                        c.document_id,
                        c.content as chunk_content,
                        c.chunk_index,
                        c.similarity,
                        d.title,
                        d.document_type,
                        d.author,
                        d.metadata
                    FROM search_chunks_semantic(
                        %s::vector,
                        %s,
                        %s
                    ) c
                    LEFT JOIN documents d ON c.document_id = d.id
                    """,
                    (query_embedding, self.similarity_threshold, k)
                )

                results = cursor.fetchall()

            return [dict(row) for row in results]

        except Exception as e:
            logger.error(f"Error in chunk search: {e}")
            return []

    def hybrid_search(self, query: str, top_k: Optional[int] = None) -> List[Dict[str, Any]]:
        """Perform hybrid search (semantic + keyword)"""
        try:
            # Generate query embedding
            query_embedding = embedding_service.generate_embedding(query)

            k = top_k or self.top_k
            with get_db_cursor() as cursor:
                cursor.execute(
                    """
                    SELECT * FROM search_documents_hybrid(
                        %s,
                        %s::vector,
                        0.7,  -- semantic_weight
                        0.3,  -- keyword_weight
                        %s
                    )
                    """,
                    (query, query_embedding, k)
                )

                results = cursor.fetchall()

            return [dict(row) for row in results]

        except Exception as e:
            logger.error(f"Error in hybrid search: {e}")
            return []

    def generate_rag_response(self, query: str) -> Dict[str, Any]:
        """Generate RAG response with relevant chunks using LLM"""
        try:
            # Get relevant chunks
            chunks = self.semantic_search_chunks(query, top_k=5)

            if not chunks:
                return {
                    "answer": "I couldn't find relevant information to answer your query.",
                    "relevant_chunks": [],
                    "confidence": 0.0,
                    "sources": []
                }

            # Group chunks by document for source attribution
            documents_used = {}
            for chunk in chunks:
                doc_id = str(chunk['document_id'])
                if doc_id not in documents_used:
                    documents_used[doc_id] = {
                        'title': chunk['title'],
                        'document_type': chunk['document_type'],
                        'chunks': []
                    }
                documents_used[doc_id]['chunks'].append({
                    'content': chunk['chunk_content'],
                    'similarity': float(chunk['similarity'])
                })

            # Calculate average similarity (confidence score)
            avg_similarity = sum(float(c['similarity']) for c in chunks) / len(chunks)

            # Generate answer using LLM if available, otherwise use template
            if LLM_AVAILABLE and llm_service.is_available():
                answer = llm_service.generate_rag_response(query, chunks, max_tokens=500)
                logger.info(f"Generated LLM response using {llm_service.get_provider_info()['provider']}")
            else:
                # Fallback to template-based response
                context_preview = "\n\n".join([
                    f"From '{chunk['title']}':\n{chunk['chunk_content'][:200]}..."
                    for chunk in chunks[:3]
                ])
                answer = f"Based on the available documents:\n\n{context_preview}\n\n"
                answer += "Note: For more detailed AI-generated responses, configure an LLM provider (OpenAI, Anthropic, or Ollama)."
                logger.info("Using template-based response (no LLM configured)")

            return {
                "answer": answer,
                "relevant_chunks": [
                    {
                        "content": chunk['chunk_content'],
                        "document_title": chunk['title'],
                        "similarity": float(chunk['similarity'])
                    }
                    for chunk in chunks
                ],
                "confidence": avg_similarity,
                "sources": list(documents_used.values())
            }

        except Exception as e:
            logger.error(f"Error generating RAG response: {e}", exc_info=True)
            return {
                "answer": "An error occurred while processing your query.",
                "relevant_chunks": [],
                "confidence": 0.0,
                "sources": []
            }

# Global RAG service instance
rag_service = RAGService()

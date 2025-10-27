from sentence_transformers import SentenceTransformer
from typing import List
import numpy as np
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        self.model = None
        self.model_name = settings.SENTENCE_TRANSFORMER_MODEL
        self.dimension = 384  # all-MiniLM-L6-v2 dimension

    def load_model(self):
        """Load the sentence transformer model"""
        if self.model is None:
            logger.info(f"Loading embedding model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            logger.info("Embedding model loaded successfully")

    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text"""
        if self.model is None:
            self.load_model()

        # Generate embedding
        embedding = self.model.encode(text, convert_to_numpy=True)

        # Pad to 1536 dimensions to match database schema
        # (PostgreSQL vector column is set to 1536 for OpenAI compatibility)
        if len(embedding) < 1536:
            padding = np.zeros(1536 - len(embedding))
            embedding = np.concatenate([embedding, padding])
        else:
            embedding = embedding[:1536]

        return embedding.tolist()

    def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        if self.model is None:
            self.load_model()

        embeddings = self.model.encode(texts, convert_to_numpy=True)

        # Pad all embeddings to 1536 dimensions
        padded_embeddings = []
        for embedding in embeddings:
            if len(embedding) < 1536:
                padding = np.zeros(1536 - len(embedding))
                embedding = np.concatenate([embedding, padding])
            else:
                embedding = embedding[:1536]
            padded_embeddings.append(embedding.tolist())

        return padded_embeddings

# Global embedding service instance
embedding_service = EmbeddingService()

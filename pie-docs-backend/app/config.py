from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import List

class Settings(BaseSettings):
    model_config = ConfigDict(
        env_file=".env",
        extra="ignore"  # Ignore extra fields from .env
    )

    # Database
    DATABASE_URL: str

    # OpenAI
    OPENAI_API_KEY: str = ""

    # Embedding
    EMBEDDING_MODEL: str = "sentence-transformers"
    SENTENCE_TRANSFORMER_MODEL: str = "all-MiniLM-L6-v2"

    # Server
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8001
    DEBUG: bool = True

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:3001,http://127.0.0.1:5173,http://127.0.0.1:3000,http://127.0.0.1:3001"

    # RAG
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    MAX_CHUNKS_PER_DOCUMENT: int = 100
    SIMILARITY_THRESHOLD: float = 0.1  # Lowered for better search results
    TOP_K_RESULTS: int = 5

    # Authentication & JWT
    SECRET_KEY: str = "NATGo4Q9h3wkPqr5K4iiUKatIp0CFWQhQFZX2gd3SBE"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 60
    MFA_CODE_EXPIRE_MINUTES: int = 10
    MAX_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_MINUTES: int = 30

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

settings = Settings()

import psycopg2
from psycopg2.extras import RealDictCursor, register_uuid
from psycopg2.pool import SimpleConnectionPool
from psycopg2 import extensions
from contextlib import contextmanager
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Connection pool
pool = None

def init_db_pool(minconn=1, maxconn=10):
    """Initialize database connection pool"""
    global pool
    try:
        pool = SimpleConnectionPool(
            minconn,
            maxconn,
            settings.DATABASE_URL
        )

        # Register UUID type
        register_uuid()

        logger.info("Database connection pool created successfully")
    except Exception as e:
        logger.error(f"Error creating connection pool: {e}")
        raise

@contextmanager
def get_db_connection():
    """Get database connection from pool"""
    conn = None
    try:
        conn = pool.getconn()
        yield conn
    finally:
        if conn:
            pool.putconn(conn)

@contextmanager
def get_db_cursor(commit=False):
    """Get database cursor"""
    with get_db_connection() as conn:
        # Register UUID adapter for this connection
        register_uuid(conn_or_curs=conn)

        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            yield cursor
            if commit:
                conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()

def close_db_pool():
    """Close database connection pool"""
    global pool
    if pool:
        pool.closeall()
        logger.info("Database connection pool closed")

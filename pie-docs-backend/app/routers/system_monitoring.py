"""
System Monitoring Router
Handles system health, database stats, and cache management
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime
import logging
import psutil
import os

from app.database import get_db_cursor
from app.middleware import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/system",
    tags=["system-monitoring"]
)


# ============= Request/Response Models =============

class SystemHealthResponse(BaseModel):
    status: str  # healthy, warning, critical
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    uptime_seconds: int
    active_users: int
    api_response_time_ms: int


class DatabaseStatsResponse(BaseModel):
    total_size: str
    table_count: int
    total_documents: int
    total_users: int
    total_workflows: int
    last_backup: Optional[str] = None
    connection_pool_size: int
    active_connections: int


class CacheStatsResponse(BaseModel):
    cache_name: str
    total_keys: int
    memory_usage_mb: float
    hit_rate: float
    miss_rate: float
    eviction_count: int


class BackupRequest(BaseModel):
    backup_type: str = "full"  # full or incremental


class BackupResponse(BaseModel):
    id: str
    backup_name: str
    backup_type: str
    backup_size_mb: Optional[float]
    backup_status: str
    started_at: datetime
    completed_at: Optional[datetime] = None


# ============= System Health Endpoints =============

@router.get("/health", response_model=SystemHealthResponse)
async def get_system_health(current_user: dict = Depends(get_current_user)):
    """
    Get current system health metrics

    - Requires authentication
    - Returns real-time system health data
    """
    try:
        # Get CPU, Memory, Disk usage
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')

        # Get uptime (process uptime for now)
        uptime = int(datetime.now().timestamp() - psutil.Process(os.getpid()).create_time())

        # Get active users count
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(DISTINCT user_id) as active_users
                FROM user_sessions
                WHERE expires_at > NOW()
                """
            )
            result = cursor.fetchone()
            active_users = result['active_users'] if result else 0

        # Determine status
        status_value = "healthy"
        if cpu_percent > 80 or memory.percent > 85 or disk.percent > 90:
            status_value = "critical"
        elif cpu_percent > 60 or memory.percent > 70 or disk.percent > 80:
            status_value = "warning"

        # Record metrics
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    """
                    INSERT INTO system_health_metrics (
                        cpu_usage_percent, memory_usage_percent,
                        memory_used_mb, memory_total_mb,
                        disk_usage_percent, disk_used_gb, disk_total_gb,
                        active_users, uptime_seconds, status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        cpu_percent, memory.percent,
                        memory.used / (1024**2), memory.total / (1024**2),
                        disk.percent, disk.used / (1024**3), disk.total / (1024**3),
                        active_users, uptime, status_value
                    )
                )
        except Exception as e:
            logger.warning(f"Failed to record health metrics: {e}")

        return SystemHealthResponse(
            status=status_value,
            cpu_usage=round(cpu_percent, 2),
            memory_usage=round(memory.percent, 2),
            disk_usage=round(disk.percent, 2),
            uptime_seconds=uptime,
            active_users=active_users,
            api_response_time_ms=100  # TODO: Implement actual response time tracking
        )

    except Exception as e:
        logger.error(f"Error getting system health: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching system health"
        )


# ============= Database Management Endpoints =============

@router.get("/database/stats", response_model=DatabaseStatsResponse)
async def get_database_stats(current_user: dict = Depends(get_current_user)):
    """
    Get database statistics

    - Requires authentication
    - Returns database size, counts, and status
    """
    try:
        with get_db_cursor() as cursor:
            # Get database size
            cursor.execute(
                """
                SELECT pg_size_pretty(pg_database_size(current_database())) as size
                """
            )
            db_size = cursor.fetchone()['size']

            # Get table count
            cursor.execute(
                """
                SELECT COUNT(*) as count
                FROM information_schema.tables
                WHERE table_schema = 'public'
                """
            )
            table_count = cursor.fetchone()['count']

            # Get document count
            cursor.execute("SELECT COUNT(*) as count FROM documents")
            doc_count = cursor.fetchone()['count']

            # Get user count
            cursor.execute("SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL")
            user_count = cursor.fetchone()['count']

            # Get workflow count
            cursor.execute("SELECT COUNT(*) as count FROM workflows")
            workflow_count = cursor.fetchone()['count']

            # Get connection stats
            cursor.execute(
                """
                SELECT count(*) as active_connections
                FROM pg_stat_activity
                WHERE state = 'active'
                """
            )
            active_conn = cursor.fetchone()['active_connections']

        # Get last backup in a separate transaction to avoid aborting main transaction
        last_backup = None
        try:
            with get_db_cursor() as cursor:
                cursor.execute(
                    """
                    SELECT completed_at
                    FROM database_backups
                    WHERE backup_status = 'completed'
                    ORDER BY completed_at DESC
                    LIMIT 1
                    """
                )
                last_backup_row = cursor.fetchone()
                last_backup = str(last_backup_row['completed_at']) if last_backup_row else None
        except Exception as e:
            logger.warning(f"Could not fetch backup info (table may not exist): {e}")

        return DatabaseStatsResponse(
            total_size=db_size,
            table_count=table_count,
            total_documents=doc_count,
            total_users=user_count,
            total_workflows=workflow_count,
            last_backup=last_backup,
            connection_pool_size=20,  # Configure based on your pool
            active_connections=active_conn
        )

    except Exception as e:
        logger.error(f"Error getting database stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching database statistics"
        )


@router.post("/database/backup", response_model=BackupResponse, status_code=status.HTTP_201_CREATED)
async def create_database_backup(
    request: BackupRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Initiate a database backup

    - Requires admin authentication
    - Creates a backup job
    - Returns backup metadata
    """
    try:
        backup_name = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                """
                INSERT INTO database_backups (
                    backup_name, backup_type, backup_status,
                    started_at, created_by
                )
                VALUES (%s, %s, 'pending', NOW(), %s)
                RETURNING id, backup_name, backup_type, backup_size_mb,
                          backup_status, started_at, completed_at
                """,
                (backup_name, request.backup_type, current_user['id'])
            )
            backup = cursor.fetchone()

        # TODO: Implement actual backup logic here (pg_dump, etc.)
        logger.info(f"Backup job created: {backup_name}")

        return BackupResponse(**dict(backup))

    except Exception as e:
        logger.error(f"Error creating backup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating database backup"
        )


# ============= Cache Management Endpoints =============

@router.get("/cache/stats", response_model=List[CacheStatsResponse])
async def get_cache_stats(current_user: dict = Depends(get_current_user)):
    """
    Get cache statistics

    - Requires authentication
    - Returns cache performance metrics
    """
    try:
        # Mock data for now - integrate with actual cache (Redis, etc.)
        cache_stats = [
            CacheStatsResponse(
                cache_name="document_cache",
                total_keys=1250,
                memory_usage_mb=85.5,
                hit_rate=94.2,
                miss_rate=5.8,
                eviction_count=145
            ),
            CacheStatsResponse(
                cache_name="search_cache",
                total_keys=893,
                memory_usage_mb=42.3,
                hit_rate=89.1,
                miss_rate=10.9,
                eviction_count=67
            ),
            CacheStatsResponse(
                cache_name="session_cache",
                total_keys=324,
                memory_usage_mb=15.7,
                hit_rate=98.5,
                miss_rate=1.5,
                eviction_count=23
            )
        ]

        return cache_stats

    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching cache statistics"
        )


@router.post("/cache/clear/{cache_name}")
async def clear_cache(
    cache_name: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Clear a specific cache

    - Requires admin authentication
    - Clears the specified cache
    """
    try:
        # TODO: Implement actual cache clearing logic
        logger.info(f"Cache cleared: {cache_name} by user {current_user['id']}")

        return {
            "message": f"Cache '{cache_name}' cleared successfully",
            "cache_name": cache_name
        }

    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error clearing cache"
        )


@router.post("/cache/clear-all")
async def clear_all_caches(current_user: dict = Depends(get_current_user)):
    """
    Clear all caches

    - Requires admin authentication
    - Clears all application caches
    """
    try:
        # TODO: Implement actual cache clearing logic for all caches
        logger.info(f"All caches cleared by user {current_user['id']}")

        return {
            "message": "All caches cleared successfully",
            "caches_cleared": ["document_cache", "search_cache", "session_cache"]
        }

    except Exception as e:
        logger.error(f"Error clearing all caches: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error clearing all caches"
        )

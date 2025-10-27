"""
WebSocket connection manager for real-time notifications.
Handles user connections, broadcasting, and targeted messaging.
"""
import logging
from typing import Dict, Set, Optional, Any
from fastapi import WebSocket
from uuid import UUID
import json
from datetime import datetime

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time notifications"""

    def __init__(self):
        # Store active connections by user_id
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Track connection metadata
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()

        # Initialize user's connection set if not exists
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()

        # Add connection to user's set
        self.active_connections[user_id].add(websocket)

        # Store metadata
        self.connection_metadata[websocket] = {
            "user_id": user_id,
            "connected_at": datetime.utcnow().isoformat(),
            "last_activity": datetime.utcnow().isoformat()
        }

        logger.info(f"WebSocket connected for user {user_id}. Total connections: {len(self.active_connections[user_id])}")

    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        # Find and remove from user's connection set
        user_id = self.connection_metadata.get(websocket, {}).get("user_id")

        if user_id and user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)

            # Clean up empty user entries
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

        # Remove metadata
        if websocket in self.connection_metadata:
            del self.connection_metadata[websocket]

        logger.info(f"WebSocket disconnected for user {user_id}")

    async def send_personal_message(self, message: dict, user_id: str):
        """Send a message to all connections of a specific user"""
        if user_id not in self.active_connections:
            logger.debug(f"No active connections for user {user_id}")
            return

        message_json = json.dumps(message)
        disconnected = set()

        # Send to all user's connections
        for websocket in self.active_connections[user_id]:
            try:
                await websocket.send_text(message_json)
                # Update last activity
                if websocket in self.connection_metadata:
                    self.connection_metadata[websocket]["last_activity"] = datetime.utcnow().isoformat()
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {e}")
                disconnected.add(websocket)

        # Clean up disconnected sockets
        for websocket in disconnected:
            self.disconnect(websocket)

    async def send_to_multiple_users(self, message: dict, user_ids: list):
        """Send a message to multiple users"""
        for user_id in user_ids:
            await self.send_personal_message(message, str(user_id))

    async def broadcast(self, message: dict):
        """Broadcast a message to all connected users"""
        message_json = json.dumps(message)
        disconnected = []

        for user_id, connections in self.active_connections.items():
            for websocket in connections:
                try:
                    await websocket.send_text(message_json)
                except Exception as e:
                    logger.error(f"Error broadcasting to user {user_id}: {e}")
                    disconnected.append(websocket)

        # Clean up disconnected sockets
        for websocket in disconnected:
            self.disconnect(websocket)

    def get_connected_users(self) -> list:
        """Get list of all connected user IDs"""
        return list(self.active_connections.keys())

    def get_user_connection_count(self, user_id: str) -> int:
        """Get number of active connections for a user"""
        return len(self.active_connections.get(user_id, set()))

    def is_user_connected(self, user_id: str) -> bool:
        """Check if a user has any active connections"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0


# Global connection manager instance
connection_manager = ConnectionManager()

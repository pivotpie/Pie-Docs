"""
WebSocket router for real-time notifications
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.websocket_manager import connection_manager
from app.services.notification_service import notification_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ws", tags=["websocket"])


@router.websocket("/notifications")
async def websocket_notifications(
    websocket: WebSocket,
    user_id: str = Query(..., description="User ID for authentication")
):
    """
    WebSocket endpoint for real-time notifications.

    Client should connect with user_id as query parameter:
    ws://localhost:8000/api/v1/ws/notifications?user_id=USER_ID

    Message format received:
    {
        "type": "approval_required|approval_decision|approval_escalated|...",
        "timestamp": "ISO-8601 timestamp",
        "data": {
            ... notification-specific data ...
        }
    }
    """
    await connection_manager.connect(websocket, user_id)

    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "timestamp": "",
            "data": {
                "message": "Connected to notifications service",
                "user_id": user_id
            }
        })

        # Keep connection alive and handle incoming messages
        while True:
            # Receive messages from client (for heartbeat, acknowledgments, etc.)
            data = await websocket.receive_text()

            # Handle client messages
            if data == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": "",
                    "data": {}
                })
            elif data == "get_unread_count":
                # Send unread notification count
                notifications = await notification_service.get_user_notifications(user_id, unread_only=True)
                await websocket.send_json({
                    "type": "unread_count",
                    "timestamp": "",
                    "data": {
                        "count": len(notifications)
                    }
                })

    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        connection_manager.disconnect(websocket)

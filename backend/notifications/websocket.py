
from fastapi import WebSocket
from typing import List, Dict, Any
import json

class NotificationWebSocketManager:
    """
    Manages WebSocket connections for real-time notifications.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"   [WS] Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"   [WS] Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """
        Send a message to all connected clients.
        """
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"   [WS] Error sending to connection: {e}")
                dead_connections.append(connection)
        
        # Cleanup closed connections
        for dead in dead_connections:
            self.disconnect(dead)

# Global manager instance
ws_manager = NotificationWebSocketManager()

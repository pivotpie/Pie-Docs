/**
 * WebSocket client for real-time approval notifications
 */

type NotificationCallback = (notification: any) => void;

class NotificationWebSocket {
  private ws: WebSocket | null = null;
  private userId: string | null = null;
  private callbacks: Set<NotificationCallback> = new Set();
  private reconnectInterval: number = 5000; // 5 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isIntentionallyClosed: boolean = false;

  /**
   * Connect to the WebSocket server
   */
  connect(userId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    this.userId = userId;
    this.isIntentionallyClosed = false;

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    const url = `${wsUrl}/api/v1/ws/notifications?user_id=${userId}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected for user:', userId);
        this.startHeartbeat();

        // Clear reconnection timer
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data);
          console.log('Received notification:', notification);

          // Handle special message types
          if (notification.type === 'connected') {
            console.log('WebSocket connection confirmed');
            return;
          }

          if (notification.type === 'pong') {
            // Heartbeat response
            return;
          }

          // Notify all registered callbacks
          this.callbacks.forEach(callback => {
            try {
              callback(notification);
            } catch (error) {
              console.error('Error in notification callback:', error);
            }
          });
        } catch (error) {
          console.error('Error parsing notification:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.stopHeartbeat();

        // Attempt to reconnect if not intentionally closed
        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    console.log('WebSocket disconnected intentionally');
  }

  /**
   * Subscribe to notifications
   */
  subscribe(callback: NotificationCallback): () => void {
    this.callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Send a message to the server
   */
  send(message: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(): void {
    this.send('get_unread_count');
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isIntentionallyClosed) {
      return;
    }

    console.log(`Scheduling reconnect in ${this.reconnectInterval}ms...`);

    this.reconnectTimer = setTimeout(() => {
      if (this.userId && !this.isIntentionallyClosed) {
        console.log('Attempting to reconnect...');
        this.connect(this.userId);
      }
    }, this.reconnectInterval);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      this.send('ping');
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const notificationWebSocket = new NotificationWebSocket();
export default notificationWebSocket;

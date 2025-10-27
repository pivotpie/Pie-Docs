import React, { useRef, useCallback, useEffect, useState } from 'react';

interface TouchGestureHandlerProps {
  children: React.ReactNode;
  onZoom?: (scale: number, center?: { x: number; y: number }) => void;
  onPan?: (deltaX: number, deltaY: number) => void;
  onDoubleTap?: (x: number, y: number) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchStart?: () => void;
  onPinchEnd?: () => void;
  enableZoom?: boolean;
  enablePan?: boolean;
  enableSwipe?: boolean;
  minScale?: number;
  maxScale?: number;
  swipeThreshold?: number;
  className?: string;
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface GestureState {
  isGesturing: boolean;
  lastTouchPoints: TouchPoint[];
  initialDistance: number;
  initialScale: number;
  initialCenter: { x: number; y: number };
  lastPanPoint: { x: number; y: number } | null;
  swipeStartPoint: TouchPoint | null;
  lastTapTime: number;
  lastTapPoint: { x: number; y: number } | null;
}

export const TouchGestureHandler: React.FC<TouchGestureHandlerProps> = ({
  children,
  onZoom,
  onPan,
  onDoubleTap,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinchStart,
  onPinchEnd,
  enableZoom = true,
  enablePan = true,
  enableSwipe = true,
  minScale = 0.5,
  maxScale = 5,
  swipeThreshold = 50,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gestureState, setGestureState] = useState<GestureState>({
    isGesturing: false,
    lastTouchPoints: [],
    initialDistance: 0,
    initialScale: 1,
    initialCenter: { x: 0, y: 0 },
    lastPanPoint: null,
    swipeStartPoint: null,
    lastTapTime: 0,
    lastTapPoint: null
  });

  // Calculate distance between two touch points
  const calculateDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calculate center point between two touches
  const calculateCenter = useCallback((touch1: Touch, touch2: Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }, []);

  // Get touch point relative to container
  const getTouchPoint = useCallback((touch: Touch): TouchPoint => {
    const rect = containerRef.current?.getBoundingClientRect();
    return {
      x: touch.clientX - (rect?.left || 0),
      y: touch.clientY - (rect?.top || 0),
      timestamp: Date.now()
    };
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();

    const touches = Array.from(e.touches);
    const touchPoints = touches.map(touch => getTouchPoint(touch));

    setGestureState(prev => {
      const newState = { ...prev };

      if (touches.length === 1) {
        // Single touch - prepare for pan or swipe
        const touchPoint = touchPoints[0];
        newState.lastPanPoint = { x: touchPoint.x, y: touchPoint.y };
        newState.swipeStartPoint = touchPoint;

        // Check for double tap
        const timeSinceLastTap = touchPoint.timestamp - prev.lastTapTime;
        const isDoubleTap = timeSinceLastTap < 300 &&
          prev.lastTapPoint &&
          Math.abs(touchPoint.x - prev.lastTapPoint.x) < 25 &&
          Math.abs(touchPoint.y - prev.lastTapPoint.y) < 25;

        if (isDoubleTap) {
          onDoubleTap?.(touchPoint.x, touchPoint.y);
          newState.lastTapTime = 0;
          newState.lastTapPoint = null;
        } else {
          newState.lastTapTime = touchPoint.timestamp;
          newState.lastTapPoint = { x: touchPoint.x, y: touchPoint.y };
        }

      } else if (touches.length === 2 && enableZoom) {
        // Two fingers - prepare for pinch zoom
        const distance = calculateDistance(touches[0], touches[1]);
        const center = calculateCenter(touches[0], touches[1]);

        newState.isGesturing = true;
        newState.initialDistance = distance;
        newState.initialCenter = center;
        newState.lastPanPoint = null;
        newState.swipeStartPoint = null;

        onPinchStart?.();
      }

      newState.lastTouchPoints = touchPoints;
      return newState;
    });
  }, [getTouchPoint, calculateDistance, calculateCenter, onDoubleTap, onPinchStart, enableZoom]);

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();

    const touches = Array.from(e.touches);
    const touchPoints = touches.map(touch => getTouchPoint(touch));

    setGestureState(prev => {
      const newState = { ...prev };

      if (touches.length === 1 && enablePan) {
        // Single touch - pan
        const touchPoint = touchPoints[0];

        if (prev.lastPanPoint) {
          const deltaX = touchPoint.x - prev.lastPanPoint.x;
          const deltaY = touchPoint.y - prev.lastPanPoint.y;

          // Only trigger pan if we're not in a gesture and movement is significant
          if (!prev.isGesturing && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
            onPan?.(deltaX, deltaY);
          }
        }

        newState.lastPanPoint = { x: touchPoint.x, y: touchPoint.y };

      } else if (touches.length === 2 && enableZoom && prev.isGesturing) {
        // Two fingers - pinch zoom
        const distance = calculateDistance(touches[0], touches[1]);
        const center = calculateCenter(touches[0], touches[1]);

        if (prev.initialDistance > 0) {
          const scale = distance / prev.initialDistance;
          const clampedScale = Math.max(minScale, Math.min(maxScale, scale));

          onZoom?.(clampedScale, center);
        }
      }

      newState.lastTouchPoints = touchPoints;
      return newState;
    });
  }, [getTouchPoint, calculateDistance, calculateCenter, onPan, onZoom, enablePan, enableZoom, minScale, maxScale]);

  // Handle touch end
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();

    const touches = Array.from(e.touches);

    setGestureState(prev => {
      const newState = { ...prev };

      if (touches.length === 0) {
        // All touches ended

        // Check for swipe gesture
        if (enableSwipe && prev.swipeStartPoint && prev.lastTouchPoints.length > 0) {
          const endPoint = prev.lastTouchPoints[prev.lastTouchPoints.length - 1];
          const deltaX = endPoint.x - prev.swipeStartPoint.x;
          const deltaY = endPoint.y - prev.swipeStartPoint.y;
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          const timeDiff = endPoint.timestamp - prev.swipeStartPoint.timestamp;

          // Check if it's a valid swipe (fast enough and far enough)
          if (distance > swipeThreshold && timeDiff < 500) {
            const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;

            if (Math.abs(angle) < 45) {
              // Horizontal swipe right
              onSwipeRight?.();
            } else if (Math.abs(angle) > 135) {
              // Horizontal swipe left
              onSwipeLeft?.();
            } else if (angle > 45 && angle < 135) {
              // Vertical swipe down
              onSwipeDown?.();
            } else if (angle < -45 && angle > -135) {
              // Vertical swipe up
              onSwipeUp?.();
            }
          }
        }

        if (prev.isGesturing) {
          onPinchEnd?.();
        }

        newState.isGesturing = false;
        newState.lastPanPoint = null;
        newState.swipeStartPoint = null;

      } else if (touches.length === 1 && prev.isGesturing) {
        // Went from multi-touch to single touch
        newState.isGesturing = false;
        onPinchEnd?.();
      }

      return newState;
    });
  }, [enableSwipe, swipeThreshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onPinchEnd]);

  // Handle touch cancel
  const handleTouchCancel = useCallback((e: React.TouchEvent) => {
    e.preventDefault();

    setGestureState(prev => {
      const newState = { ...prev };
      newState.isGesturing = false;
      newState.lastPanPoint = null;
      newState.swipeStartPoint = null;

      if (prev.isGesturing) {
        onPinchEnd?.();
      }

      return newState;
    });
  }, [onPinchEnd]);

  // Prevent context menu on long press
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Add passive event listeners for better performance
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventDefault = (e: Event) => e.preventDefault();

    // Prevent default touch behaviors
    container.addEventListener('touchstart', preventDefault, { passive: false });
    container.addEventListener('touchmove', preventDefault, { passive: false });
    container.addEventListener('touchend', preventDefault, { passive: false });

    return () => {
      container.removeEventListener('touchstart', preventDefault);
      container.removeEventListener('touchmove', preventDefault);
      container.removeEventListener('touchend', preventDefault);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`touch-gesture-handler ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onContextMenu={handleContextMenu}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
    >
      {children}

      {/* Visual feedback for gestures */}
      {gestureState.isGesturing && (
        <div className="absolute inset-0 pointer-events-none">
          {gestureState.initialCenter && (
            <div
              className="absolute w-4 h-4 bg-blue-500 rounded-full opacity-50 transform -translate-x-2 -translate-y-2"
              style={{
                left: gestureState.initialCenter.x,
                top: gestureState.initialCenter.y
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default TouchGestureHandler;
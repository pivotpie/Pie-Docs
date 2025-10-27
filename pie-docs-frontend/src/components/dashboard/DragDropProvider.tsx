import React from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import type {
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

interface DragDropProviderProps {
  children: React.ReactNode;
  items: string[];
  onReorder: (newItems: string[]) => void;
  disabled?: boolean;
}

// Interface for widget drag data (for future use)
// interface DraggableWidgetData {
//   id: string;
//   type: 'widget';
// }

const DragDropProvider: React.FC<DragDropProviderProps> = ({
  children,
  items,
  onReorder,
  disabled = false
}) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // Configure sensors for different input methods
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (disabled) return;

    const { active } = event;
    setActiveId(active.id as string);

    // Announce drag start for screen readers
    const element = document.querySelector(`[data-widget-id="${active.id}"]`);
    if (element) {
      const title = element.querySelector('h3')?.textContent || 'Widget';
      announceToScreenReader(`Started dragging ${title}`);
    }
  };

  const handleDragOver = (_event: DragOverEvent) => {
    if (disabled) return;
    // Handle drag over logic if needed for drop zones
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (disabled) return;

    const { active, over } = event;

    setActiveId(null);

    if (!over) {
      announceToScreenReader('Drag cancelled');
      return;
    }

    if (active.id !== over.id) {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(items, oldIndex, newIndex);
        onReorder(newItems);

        // Announce successful reorder for screen readers
        const element = document.querySelector(`[data-widget-id="${active.id}"]`);
        if (element) {
          const title = element.querySelector('h3')?.textContent || 'Widget';
          announceToScreenReader(`${title} moved to position ${newIndex + 1}`);
        }
      }
    } else {
      announceToScreenReader('Widget returned to original position');
    }
  };

  // Function to announce messages to screen readers
  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.setAttribute('class', 'sr-only');
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={rectSortingStrategy}>
        {children}
      </SortableContext>

      <DragOverlay>
        {activeId ? (
          <div className="widget-dragging opacity-80 transform rotate-2 scale-105 z-50">
            {/* This would be the dragged widget preview */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-primary-400 p-4">
              <div className="text-gray-600 dark:text-gray-400">
                Moving widget...
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default DragDropProvider;
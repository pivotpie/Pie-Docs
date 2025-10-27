import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import WidgetContainer, { WidgetSize } from './WidgetContainer';

interface DraggableWidgetProps {
  id: string;
  title: string;
  size?: WidgetSize;
  children: React.ReactNode;
  className?: string;
  onResize?: (size: WidgetSize) => void;
  disabled?: boolean;
}

const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  id,
  title,
  size = 'medium',
  children,
  className = '',
  onResize,
  disabled = false
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id,
    disabled,
    data: {
      type: 'widget',
      widget: { id, title, size }
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandleProps = disabled ? {} : {
    ...attributes,
    ...listeners,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        ${isDragging ? 'z-50 opacity-50' : ''}
        ${isOver ? 'ring-2 ring-primary-400 ring-offset-2' : ''}
        ${className}
      `}
    >
      <WidgetContainer
        id={id}
        title={title}
        size={size}
        onResize={onResize}
        isDragging={isDragging}
        className={`
          transition-all duration-200
          ${isDragging ? 'shadow-2xl scale-105 rotate-2' : ''}
          ${isOver ? 'shadow-lg' : ''}
        `}
      >
        {/* Drag Handle - Only visible when not disabled */}
        {!disabled && (
          <div
            {...dragHandleProps}
            className="absolute top-2 right-2 p-1 rounded cursor-move hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
            aria-label={`Drag ${title} widget to reorder`}
            title={`Drag to move ${title}`}
          >
            <svg
              className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M9 3h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm4-16h2v2h-2V3zm0 4h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"/>
            </svg>
          </div>
        )}

        {/* Widget Content */}
        <div className="relative">
          {children}
        </div>

        {/* Drop Zone Indicator */}
        {isOver && !isDragging && (
          <div className="absolute inset-0 bg-primary-50 dark:bg-primary-900/20 border-2 border-dashed border-primary-400 rounded-lg flex items-center justify-center">
            <div className="text-primary-600 dark:text-primary-400 font-medium">
              Drop here
            </div>
          </div>
        )}
      </WidgetContainer>
    </div>
  );
};

export default DraggableWidget;
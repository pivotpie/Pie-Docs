import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Document, DocumentFolder } from '@/types/domain/Document';

interface DraggableDocumentProps {
  document: Document;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

interface DraggableFolderProps {
  folder: DocumentFolder;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const DraggableDocument: React.FC<DraggableDocumentProps> = ({
  document,
  children,
  disabled = false,
  className = '',
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: document.id,
    data: {
      type: 'document',
      document,
    },
    disabled,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        ${className}
        ${isDragging ? 'opacity-50 z-50' : ''}
        ${disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
      `}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
};

export const DraggableFolder: React.FC<DraggableFolderProps> = ({
  folder,
  children,
  disabled = false,
  className = '',
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: folder.id,
    data: {
      type: 'folder',
      folder,
    },
    disabled: disabled || folder.type === 'smart', // Smart folders cannot be moved
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const isDisabled = disabled || folder.type === 'smart';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        ${className}
        ${isDragging ? 'opacity-50 z-50' : ''}
        ${isDisabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
      `}
      {...(isDisabled ? {} : { ...listeners, ...attributes })}
    >
      {children}

      {/* Drag handle indicator */}
      {!isDisabled && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </div>
      )}
    </div>
  );
};

// Combined draggable item component that auto-detects type
interface DraggableItemProps {
  item: Document | DocumentFolder;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const DraggableItem: React.FC<DraggableItemProps> = ({ item, ...props }) => {
  // Type guard to check if item is a Document
  const isDocument = (item: Document | DocumentFolder): item is Document => {
    return 'type' in item && 'downloadUrl' in item;
  };

  if (isDocument(item)) {
    return <DraggableDocument document={item} {...props} />;
  } else {
    return <DraggableFolder folder={item} {...props} />;
  }
};

export default DraggableItem;
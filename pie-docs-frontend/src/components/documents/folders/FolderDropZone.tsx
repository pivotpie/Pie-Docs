import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { DocumentFolder } from '@/types/domain/Document';

interface FolderDropZoneProps {
  folder: DocumentFolder;
  isOver: boolean;
  isDragging: boolean;
  canDrop: boolean;
  children: React.ReactNode;
  className?: string;
  validDropTypes?: ('document' | 'folder')[];
}

const FolderDropZone: React.FC<FolderDropZoneProps> = ({
  folder,
  isOver,
  isDragging,
  canDrop,
  children,
  className = '',
  validDropTypes = ['document', 'folder'],
}) => {
  const {
    setNodeRef,
  } = useDroppable({
    id: folder.id,
    data: {
      type: 'folder',
      folder,
      acceptsTypes: validDropTypes,
    },
  });

  const isActiveDropZone = isDragging && isOver && canDrop;
  const isInvalidDropZone = isDragging && isOver && !canDrop;

  return (
    <div
      ref={setNodeRef}
      className={`
        relative transition-all duration-200 ease-in-out
        ${className}
        ${isActiveDropZone ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 ring-opacity-50' : ''}
        ${isInvalidDropZone ? 'bg-red-50 dark:bg-red-900/20 ring-2 ring-red-500 ring-opacity-50' : ''}
        ${isDragging && canDrop ? 'border-dashed border-2 border-blue-300 dark:border-blue-600' : ''}
      `}
    >
      {children}

      {/* Drop indicator overlay */}
      {isActiveDropZone && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute inset-0 bg-blue-500/10 rounded-md">
            <div className="flex items-center justify-center h-full">
              <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-md shadow-lg flex items-center space-x-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Drop here</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invalid drop indicator */}
      {isInvalidDropZone && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute inset-0 bg-red-500/10 rounded-md">
            <div className="flex items-center justify-center h-full">
              <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-md shadow-lg flex items-center space-x-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>Cannot drop</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtle hover indicator for potential drop targets */}
      {isDragging && !isOver && canDrop && (
        <div className="absolute inset-0 pointer-events-none z-5">
          <div className="absolute inset-0 border border-blue-200 dark:border-blue-700 rounded-md opacity-50" />
        </div>
      )}
    </div>
  );
};

export default FolderDropZone;
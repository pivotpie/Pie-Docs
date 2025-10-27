import React from 'react';
import { useSelector } from 'react-redux';
import type { Document } from '@/types/domain/Document';
import { selectFolders } from '@/store/slices/documentsSlice';
import { Badge } from '@/components/ui/Badge';

interface DocumentLocationBreadcrumbProps {
  document: Document;
  onFolderClick?: (folderId: string) => void;
  showIcon?: boolean;
  compact?: boolean;
}

export const DocumentLocationBreadcrumb: React.FC<DocumentLocationBreadcrumbProps> = ({
  document,
  onFolderClick,
  showIcon = true,
  compact = false
}) => {
  const folders = useSelector(selectFolders);

  // Find all folders that contain this document
  const containingFolders = folders.filter(folder =>
    folder.documentRefs.includes(document.id) || folder.id === document.parentFolderId
  );

  // Separate primary folder from linked folders
  const primaryFolder = folders.find(folder => folder.id === document.parentFolderId);
  const linkedFolders = containingFolders.filter(folder =>
    folder.id !== document.parentFolderId && folder.documentRefs.includes(document.id)
  );

  if (containingFolders.length === 0) {
    return (
      <div className="flex items-center text-sm text-gray-500">
        {showIcon && <span className="mr-1">📄</span>}
        <span>Not in any folder</span>
      </div>
    );
  }

  const handleFolderClick = (folderId: string) => {
    if (onFolderClick) {
      onFolderClick(folderId);
    }
  };

  const renderFolderPath = (folder: any, isPrimary: boolean) => {
    const pathParts = folder.path.split('/').filter(Boolean);

    return (
      <div className="flex items-center space-x-1">
        {isPrimary && showIcon && <span className="text-blue-600">📁</span>}
        {!isPrimary && showIcon && <span className="text-gray-400">🔗</span>}

        <div className="flex items-center space-x-1">
          {pathParts.map((part: string, index: number) => (
            <React.Fragment key={`${folder.id}-${index}-${part}`}>
              {index > 0 && <span className="text-gray-400">/</span>}
              <span className="text-gray-600">{part}</span>
            </React.Fragment>
          ))}
          {pathParts.length > 0 && <span className="text-gray-400">/</span>}

          <button
            onClick={() => handleFolderClick(folder.id)}
            className={`font-medium hover:underline ${
              isPrimary ? 'text-blue-600' : 'text-gray-700'
            }`}
          >
            {folder.name}
          </button>
        </div>

        {isPrimary && (
          <Badge variant="default" className="ml-2 text-xs">
            Primary
          </Badge>
        )}
      </div>
    );
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        {primaryFolder && (
          <div className="flex items-center space-x-1">
            {showIcon && <span className="text-blue-600">📁</span>}
            <button
              onClick={() => handleFolderClick(primaryFolder.id)}
              className="text-blue-600 hover:underline font-medium"
            >
              {primaryFolder.name}
            </button>
          </div>
        )}

        {linkedFolders.length > 0 && (
          <div className="flex items-center space-x-1">
            <span className="text-gray-400">+</span>
            <Badge variant="outline" className="text-xs">
              {linkedFolders.length} more
            </Badge>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Primary Folder */}
      {primaryFolder && (
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 min-w-0 flex-shrink-0">Primary:</span>
          {renderFolderPath(primaryFolder, true)}
        </div>
      )}

      {/* Linked Folders */}
      {linkedFolders.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-gray-500 block">Also in:</span>
          {linkedFolders.map(folder => (
            <div key={folder.id} className="flex items-center space-x-2 ml-4">
              {renderFolderPath(folder, false)}
            </div>
          ))}
        </div>
      )}

      {/* Statistics */}
      {containingFolders.length > 1 && (
        <div className="text-xs text-gray-500 mt-2">
          Document appears in {containingFolders.length} folder{containingFolders.length > 1 ? 's' : ''}
          {linkedFolders.length > 0 && ` (${linkedFolders.length} cross-reference${linkedFolders.length > 1 ? 's' : ''})`}
        </div>
      )}
    </div>
  );
};

export default DocumentLocationBreadcrumb;
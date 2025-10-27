import React, { useState, useRef, useCallback } from 'react';
import { FolderIcon, DocumentIcon, ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface FileWithPath {
  file: File;
  path: string;
  relativePath: string;
  folder: string;
}

interface FolderStructure {
  [key: string]: {
    files: FileWithPath[];
    subfolders: FolderStructure;
    isExpanded?: boolean;
  };
}

interface FolderUploadProps {
  onFoldersSelected: (files: FileWithPath[], structure: FolderStructure) => void;
  onDestinationSelect?: (path: string) => void;
  destinationPath?: string;
  className?: string;
  maxFileSize?: number;
  allowedFileTypes?: string[];
}

interface FolderTreeProps {
  structure: FolderStructure;
  onToggleExpand: (path: string) => void;
  level?: number;
}

// Component to display folder structure tree
const FolderTree: React.FC<FolderTreeProps> = ({ structure, onToggleExpand, level = 0 }) => {
  const indent = level * 20;

  return (
    <div className="space-y-1">
      {Object.entries(structure).map(([folderName, folder]) => (
        <div key={folderName}>
          {/* Folder Node */}
          <div
            className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
            style={{ paddingLeft: `${indent + 8}px` }}
            onClick={() => onToggleExpand(folderName)}
          >
            {Object.keys(folder.subfolders).length > 0 ? (
              folder.isExpanded ? (
                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRightIcon className="w-4 h-4 text-gray-400" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
            <FolderIcon className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">{folderName}</span>
            <span className="text-xs text-gray-500">
              ({folder.files.length} file{folder.files.length !== 1 ? 's' : ''})
            </span>
          </div>

          {/* Files in this folder */}
          {folder.files.map((fileWithPath) => (
            <div
              key={fileWithPath.path}
              className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded"
              style={{ paddingLeft: `${indent + 32}px` }}
            >
              <DocumentIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{fileWithPath.file.name}</span>
              <span className="text-xs text-gray-400">
                ({(fileWithPath.file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          ))}

          {/* Subfolders */}
          {folder.isExpanded && Object.keys(folder.subfolders).length > 0 && (
            <FolderTree
              structure={folder.subfolders}
              onToggleExpand={(subPath) => onToggleExpand(`${folderName}/${subPath}`)}
              level={level + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
};

// Destination folder selector component
const DestinationSelector: React.FC<{
  selectedPath: string;
  onPathSelect: (path: string) => void;
}> = ({ selectedPath, onPathSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Mock folder tree for demonstration
  const mockFolders = [
    'Documents',
    'Documents/Financial',
    'Documents/Financial/2024',
    'Documents/Legal',
    'Documents/Legal/Contracts',
    'Documents/HR',
    'Documents/HR/Policies',
    'Documents/Marketing',
    'Documents/Technical'
  ];

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Destination Folder
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <span className="text-sm text-gray-900">
          {selectedPath || 'Select destination folder...'}
        </span>
        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="p-1">
            {mockFolders.map((folder) => (
              <button
                key={folder}
                type="button"
                onClick={() => {
                  onPathSelect(folder);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center space-x-2"
              >
                <FolderIcon className="w-4 h-4 text-blue-500" />
                <span>{folder}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const FolderUpload: React.FC<FolderUploadProps> = ({
  onFoldersSelected,
  onDestinationSelect,
  destinationPath = '',
  className = '',
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  allowedFileTypes = []
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPath[]>([]);
  const [folderStructure, setFolderStructure] = useState<FolderStructure>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Build folder structure from files
  const buildFolderStructure = useCallback((files: FileWithPath[]): FolderStructure => {
    const structure: FolderStructure = {};

    files.forEach((fileWithPath) => {
      const pathParts = fileWithPath.relativePath.split('/');
      let currentLevel = structure;

      // Navigate through folder hierarchy
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderName = pathParts[i];

        if (!currentLevel[folderName]) {
          currentLevel[folderName] = {
            files: [],
            subfolders: {},
            isExpanded: true
          };
        }

        currentLevel = currentLevel[folderName].subfolders;
      }

      // Add file to the final folder
      const finalFolder = pathParts[pathParts.length - 2] || 'root';
      if (!currentLevel[finalFolder]) {
        currentLevel[finalFolder] = {
          files: [],
          subfolders: {},
          isExpanded: true
        };
      }

      currentLevel[finalFolder].files.push(fileWithPath);
    });

    return structure;
  }, []);

  // Process selected files
  const processFiles = useCallback((fileList: FileList | File[]) => {
    setIsProcessing(true);
    setErrors([]);

    const filesArray = Array.from(fileList);
    const processedFiles: FileWithPath[] = [];
    const newErrors: string[] = [];

    filesArray.forEach((file) => {
      // Validate file size
      if (file.size > maxFileSize) {
        newErrors.push(`${file.name}: File size exceeds ${(maxFileSize / 1024 / 1024).toFixed(1)}MB limit`);
        return;
      }

      // Validate file type
      if (allowedFileTypes.length > 0) {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const isAllowed = allowedFileTypes.some(type =>
          type.toLowerCase() === fileExtension ||
          file.type.includes(type)
        );

        if (!isAllowed) {
          newErrors.push(`${file.name}: File type not allowed`);
          return;
        }
      }

      // Get relative path from webkitRelativePath or create one
      const relativePath = (file as any).webkitRelativePath || file.name;
      const pathParts = relativePath.split('/');
      const folder = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'root';

      processedFiles.push({
        file,
        path: relativePath,
        relativePath,
        folder
      });
    });

    if (newErrors.length > 0) {
      setErrors(newErrors);
    }

    const structure = buildFolderStructure(processedFiles);
    setSelectedFiles(processedFiles);
    setFolderStructure(structure);
    setIsProcessing(false);

    if (processedFiles.length > 0) {
      onFoldersSelected(processedFiles, structure);
    }
  }, [maxFileSize, allowedFileTypes, buildFolderStructure, onFoldersSelected]);

  // Handle folder input change
  const handleFolderInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  // Handle drag and drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const items = Array.from(e.dataTransfer.items);
    const files: File[] = [];

    // Process dropped items
    const processItems = async () => {
      for (const item of items) {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            await processEntry(entry, '', files);
          }
        }
      }

      if (files.length > 0) {
        processFiles(files);
      }
    };

    processItems();
  };

  // Recursively process directory entries
  const processEntry = (entry: any, path: string, files: File[]): Promise<void> => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((file: File) => {
          // Add webkitRelativePath property for consistency
          Object.defineProperty(file, 'webkitRelativePath', {
            value: path + file.name,
            writable: false
          });
          files.push(file);
          resolve();
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        dirReader.readEntries(async (entries: any[]) => {
          for (const childEntry of entries) {
            await processEntry(childEntry, path + entry.name + '/', files);
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  };

  // Toggle folder expansion
  const toggleFolderExpansion = (path: string) => {
    const pathParts = path.split('/');
    const newStructure = { ...folderStructure };
    let currentLevel = newStructure;

    for (let i = 0; i < pathParts.length - 1; i++) {
      currentLevel = currentLevel[pathParts[i]].subfolders;
    }

    const finalFolder = pathParts[pathParts.length - 1];
    if (currentLevel[finalFolder]) {
      currentLevel[finalFolder].isExpanded = !currentLevel[finalFolder].isExpanded;
      setFolderStructure(newStructure);
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedFiles([]);
    setFolderStructure({});
    setErrors([]);
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-4 ${className}`} dir="ltr">
      {/* Folder Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={folderInputRef}
          type="file"
          multiple
          webkitdirectory=""
          directory=""
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFolderInputChange}
          disabled={isProcessing}
        />

        <div className="space-y-3">
          <div className="flex justify-center">
            <FolderIcon className="w-12 h-12 text-gray-400" />
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Drop folders here or click to select
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Select entire folders with their directory structure preserved
            </p>
          </div>

          {maxFileSize && (
            <p className="text-xs text-gray-400">
              Maximum file size: {(maxFileSize / 1024 / 1024).toFixed(1)}MB per file
            </p>
          )}

          {allowedFileTypes.length > 0 && (
            <p className="text-xs text-gray-400">
              Allowed types: {allowedFileTypes.join(', ')}
            </p>
          )}
        </div>

        {isDragOver && (
          <div className="absolute inset-0 bg-blue-100 bg-opacity-50 rounded-lg flex items-center justify-center">
            <div className="text-blue-600 font-medium">
              Drop folders here
            </div>
          </div>
        )}
      </div>

      {/* Destination Folder Selection */}
      {onDestinationSelect && (
        <DestinationSelector
          selectedPath={destinationPath}
          onPathSelect={onDestinationSelect}
        />
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-sm text-blue-600">Processing folders...</span>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">Upload Errors</h4>
              <ul className="mt-1 text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Selected Folders Structure */}
      {selectedFiles.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div>
              <h4 className="text-lg font-medium text-gray-900">
                Selected Folders
              </h4>
              <p className="text-sm text-gray-500">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
              </p>
            </div>
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-red-300"
            >
              Clear Selection
            </button>
          </div>

          <div className="p-4 max-h-96 overflow-y-auto">
            <FolderTree
              structure={folderStructure}
              onToggleExpand={toggleFolderExpansion}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FolderUpload;
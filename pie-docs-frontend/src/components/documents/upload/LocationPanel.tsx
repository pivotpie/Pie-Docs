import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import FolderSelector from './FolderSelector';
import WarehouseLocationSelector from './WarehouseLocationSelector';
import {
  CheckIcon,
  FolderIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { autoFolderService } from '@/services/api/autoFolderService';

interface FileWithPreview {
  id: string;
  file: File;
  folderId?: string;
  folderPath?: string;
  folderAutoAssigned?: boolean;
  rackId?: string;
  locationPath?: string;
  documentTypeName?: string;
}

interface LocationPanelProps {
  file: FileWithPreview | null;
  onFolderSelect: (folderId: string, folderPath: string, autoAssigned?: boolean) => void;
  onRackSelect: (rackId: string, locationPath: string) => void;
  allFiles: FileWithPreview[];
}

export const LocationPanel: React.FC<LocationPanelProps> = ({
  file,
  onFolderSelect,
  onRackSelect,
  allFiles
}) => {
  const { theme } = useTheme();
  const [showManualFolderSelect, setShowManualFolderSelect] = useState(false);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);

  // Auto-assign folder when file is selected and has document type
  useEffect(() => {
    if (file && !file.folderId && file.documentTypeName && !isAutoAssigning) {
      handleAutoAssignFolder();
    }
  }, [file?.id, file?.documentTypeName]);

  const handleAutoAssignFolder = async () => {
    if (!file?.documentTypeName) return;

    setIsAutoAssigning(true);
    try {
      const result = await autoFolderService.autoAssignFolder(file.documentTypeName);

      if (result.success && result.folder) {
        console.log(`✅ Auto-assigned folder: ${result.folder.path}`);
        onFolderSelect(result.folder.id, result.folder.path, true);
      } else {
        console.log(`ℹ️ No matching folder found for "${file.documentTypeName}"`);
        // No match - user will need to select manually
        setShowManualFolderSelect(true);
      }
    } catch (error) {
      console.error('Auto-assignment error:', error);
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!file?.documentTypeName) return;

    try {
      const result = await autoFolderService.createFolderForDocumentType(file.documentTypeName);

      if (result.success && result.folder) {
        onFolderSelect(result.folder.id, result.folder.path, true);
        setShowManualFolderSelect(false);
      } else {
        alert(`Failed to create folder: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Folder creation error:', error);
      alert('Failed to create folder. Please try again.');
    }
  };

  if (!file) {
    return (
      <div className="flex flex-col h-full">
        <div className="text-center p-8">
          <FolderIcon className="mx-auto h-12 w-12 text-gray-600 mb-4" />
          <p className="text-gray-400 text-sm">
            Select a file to assign locations
          </p>
        </div>
      </div>
    );
  }

  const getProgress = () => {
    const total = allFiles.length;
    const completeDigital = allFiles.filter(f => f.folderId).length;
    const completePhysical = allFiles.filter(f => f.rackId).length;
    const completeBoth = allFiles.filter(f => f.folderId && f.rackId).length;
    return { total, completeDigital, completePhysical, completeBoth };
  };

  const progress = getProgress();

  const hasDigital = !!file.folderId;
  const hasPhysical = !!file.rackId;
  const isComplete = hasDigital && hasPhysical;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg ${
            isComplete ? 'bg-green-100' : 'bg-blue-100'
          }`}>
            {isComplete ? (
              <CheckIcon className="h-6 w-6 text-green-600" />
            ) : (
              <FolderIcon className="h-6 w-6 text-blue-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              Location Management
            </h3>
            <p className="text-xs text-gray-400">
              Digital and physical location tracking
            </p>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="mt-3 bg-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-300 font-medium">Overall Progress</span>
            <span className="text-gray-400">
              {progress.completeBoth} / {progress.total} complete
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.completeBoth / progress.total) * 100}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center text-blue-400">
              <FolderIcon className="h-3 w-3 mr-1" />
              <span>Digital: {progress.completeDigital}/{progress.total}</span>
            </div>
            <div className="flex items-center text-purple-400">
              <BuildingOfficeIcon className="h-3 w-3 mr-1" />
              <span>Physical: {progress.completePhysical}/{progress.total}</span>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-3 bg-green-900/20 border border-green-500 rounded-lg p-3">
          <p className="text-xs text-green-300">
            <span className="font-semibold">Dual Location System:</span> Assign both digital folder paths and physical warehouse locations for complete document tracking.
          </p>
        </div>
      </div>

      {/* Current File Status */}
      <div className="mb-4">
        {isComplete ? (
          <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-400">Both Locations Assigned</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <FolderIcon className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Digital Location:</p>
                  <p className="text-sm text-white font-medium">{file.folderPath}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <BuildingOfficeIcon className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Physical Location:</p>
                  <p className="text-sm text-white font-medium">{file.locationPath}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-medium text-yellow-400">
                {!hasDigital && !hasPhysical
                  ? 'No Locations Assigned'
                  : !hasDigital
                  ? 'Digital Location Missing'
                  : 'Physical Location Missing'}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                {hasDigital ? (
                  <CheckIcon className="h-4 w-4 text-green-400" />
                ) : (
                  <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400" />
                )}
                <span className={hasDigital ? 'text-green-300' : 'text-yellow-300'}>
                  Digital Location {hasDigital ? 'assigned' : 'required'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {hasPhysical ? (
                  <CheckIcon className="h-4 w-4 text-green-400" />
                ) : (
                  <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400" />
                )}
                <span className={hasPhysical ? 'text-green-300' : 'text-yellow-300'}>
                  Physical Location {hasPhysical ? 'assigned' : 'required'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Location Selectors */}
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="space-y-4">
          {/* Digital Location Selector */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FolderIcon className="h-5 w-5 text-blue-400" />
              <h4 className="text-sm font-medium text-white">Digital Location</h4>
              {hasDigital && <CheckIcon className="h-4 w-4 text-green-500 ml-auto" />}
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Select the folder path where this document will be stored in the system.
            </p>

            {/* Auto-assigning state */}
            {isAutoAssigning && (
              <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4 mb-3">
                <div className="flex items-center gap-2">
                  <ArrowPathIcon className="h-5 w-5 text-blue-400 animate-spin" />
                  <span className="text-sm text-blue-300">Auto-assigning folder...</span>
                </div>
              </div>
            )}

            {/* Auto-assigned successfully */}
            {hasDigital && file.folderAutoAssigned && !showManualFolderSelect && (
              <div className="bg-green-900/20 border border-green-500 rounded-lg p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckIcon className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium text-green-400">Auto-Assigned</span>
                  </div>
                  <span className="inline-flex items-center text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full">
                    <SparklesIcon className="h-3 w-3 mr-1" />
                    Smart Match
                  </span>
                </div>
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-1">Folder:</p>
                  <p className="text-sm text-white font-medium">{file.folderPath}</p>
                </div>
                <p className="text-xs text-green-300 mb-3">
                  System matched your document type to this folder.
                </p>
                <button
                  onClick={() => setShowManualFolderSelect(!showManualFolderSelect)}
                  className="w-full inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                >
                  <MagnifyingGlassIcon className="h-4 w-4 mr-1" />
                  Choose Different Folder
                </button>
              </div>
            )}

            {/* Manually assigned */}
            {hasDigital && !file.folderAutoAssigned && !showManualFolderSelect && (
              <div className="mb-3 p-3 bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Current folder:</p>
                <p className="text-sm text-blue-300 font-medium">{file.folderPath}</p>
                <button
                  onClick={() => setShowManualFolderSelect(true)}
                  className="w-full mt-2 inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
                >
                  <MagnifyingGlassIcon className="h-4 w-4 mr-1" />
                  Change Folder
                </button>
              </div>
            )}

            {/* No folder assigned - show options */}
            {!hasDigital && !isAutoAssigning && (
              <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-400">No Matching Folder</span>
                </div>
                <p className="text-xs text-yellow-300 mb-4">
                  No folder found for "{file.documentTypeName}". You can create one or select manually.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateFolder}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Create Folder
                  </button>
                  <button
                    onClick={() => setShowManualFolderSelect(true)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                  >
                    <MagnifyingGlassIcon className="h-4 w-4 mr-1" />
                    Select Manual
                  </button>
                </div>
              </div>
            )}

            {/* Folder Selector - Shown when manual selection is active */}
            {(showManualFolderSelect || (!hasDigital && !isAutoAssigning)) && (
              <div className="border border-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-medium text-gray-300">Select Folder</h5>
                  {showManualFolderSelect && (
                    <button
                      onClick={() => setShowManualFolderSelect(false)}
                      className="text-xs text-gray-400 hover:text-gray-300"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <FolderSelector
                  selectedFolderId={file.folderId}
                  onFolderSelect={(folderId, folderPath) => {
                    onFolderSelect(folderId, folderPath, false);
                    setShowManualFolderSelect(false);
                  }}
                />
              </div>
            )}
          </div>

          {/* Physical Location Selector */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <BuildingOfficeIcon className="h-5 w-5 text-purple-400" />
              <h4 className="text-sm font-medium text-white">Physical Location</h4>
              {hasPhysical && <CheckIcon className="h-4 w-4 text-green-500 ml-auto" />}
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Select the warehouse rack where the physical document is stored.
            </p>
            {hasPhysical && (
              <div className="mb-3 p-2 bg-gray-700 rounded text-xs text-purple-300">
                Current: {file.locationPath}
              </div>
            )}
            <WarehouseLocationSelector
              selectedRackId={file.rackId}
              onRackSelect={onRackSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPanel;

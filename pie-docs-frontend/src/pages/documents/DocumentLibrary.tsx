import React, { useEffect, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '@/contexts/ThemeContext';
import { useSearchParams } from 'react-router-dom';
import { documentsService } from '@/services/api/documentsService';
import {
  selectDocuments,
  selectFolders,
  selectViewMode,
  selectDocumentsLoading,
  selectDocumentsError,
  selectSelectedDocumentIds,
  selectFilters,
  selectSearchQuery,
  selectFilterPanelCollapsed,
  selectSortCriteria,
  setViewMode,
  selectDocument,
  setSearchQuery,
  navigateToFolder,
  setSortCriteria,
} from '@/store/slices/documentsSlice';
import ViewModeToggle from '@/components/documents/ViewModeToggle';
import VirtualizedDocumentView from '@/components/documents/VirtualizedDocumentView';
import FilterPanel from '@/components/documents/FilterPanel';
import SearchBar from '@/components/documents/SearchBar';
import BulkActionToolbar from '@/components/documents/BulkActionToolbar';
import SortControls from '@/components/documents/SortControls';
import FolderManager from '@/components/documents/folders/FolderManager';
import SmartFolderBuilder from '@/components/documents/folders/SmartFolderBuilder';
import BulkFolderActions from '@/components/documents/folders/BulkFolderActions';
import EnhancedUploadInterface from '@/components/documents/upload/EnhancedUploadInterface';
import DocumentTypesManager from '@/components/documents/doctypes/DocumentTypesManager';
import { DocumentLibrarySkeleton, LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useUploadManager } from '@/hooks/useUploadManager';
import type { Document, DocumentFolder, ViewMode, SortCriteria, Cabinet } from '@/types/domain/Document';

interface DocumentLibraryProps {
  openUpload?: boolean;
}

const DocumentLibrary: React.FC<DocumentLibraryProps> = ({ openUpload = false }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get active tab from URL params
  const activeTab = searchParams.get('tab') || 'library';

  // Local state for UI components
  const [showUploadDocuments, setShowUploadDocuments] = useState(openUpload);
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [showSmartFolderBuilder, setShowSmartFolderBuilder] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [uploadContext, setUploadContext] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Mayan integration state
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [selectedCabinet, setSelectedCabinet] = useState<Cabinet | null>(null);
  const [mayanDocuments, setMayanDocuments] = useState<Document[]>([]);
  const [isLoadingMayan, setIsLoadingMayan] = useState(false);
  const [mayanError, setMayanError] = useState<string | null>(null);

  // Selectors
  const documents = useSelector(selectDocuments);
  const folders = useSelector(selectFolders);
  const viewMode = useSelector(selectViewMode);
  const isLoading = useSelector(selectDocumentsLoading);
  const error = useSelector(selectDocumentsError);
  const selectedDocumentIds = useSelector(selectSelectedDocumentIds);
  const filters = useSelector(selectFilters);
  const searchQuery = useSelector(selectSearchQuery);
  const filterPanelCollapsed = useSelector(selectFilterPanelCollapsed);
  const sortCriteria = useSelector(selectSortCriteria);

  // Upload manager hook
  const {
    uploadFiles,
    addFiles,
    removeFile,
    startUploads,
    cancelUpload,
    retryUpload,
    getCompleteUploadFiles
  } = useUploadManager();

  // Persistent view mode preference
  useEffect(() => {
    const savedViewMode = localStorage.getItem('pie-docs-document-view-mode') as ViewMode;
    if (savedViewMode && ['grid', 'list', 'tree'].includes(savedViewMode)) {
      dispatch(setViewMode(savedViewMode));
    }
  }, [dispatch]);

  // Save view mode preference when it changes
  useEffect(() => {
    localStorage.setItem('pie-docs-document-view-mode', viewMode);
  }, [viewMode]);

  // Handle openUpload prop
  useEffect(() => {
    if (openUpload) {
      setShowUploadDocuments(true);
    }
  }, [openUpload]);

  // Load cabinets on component mount
  useEffect(() => {
    loadCabinets();
    loadMayanDocuments(); // Load all documents initially
  }, []);

  // Load cabinets from Mayan EDMS
  const loadCabinets = async () => {
    try {
      const cabinetResponse = await documentsService.getCabinets();
      setCabinets(cabinetResponse.results || []);
    } catch (err) {
      console.error('Failed to load cabinets:', err);
      setCabinets([]); // Ensure cabinets is always an array
    }
  };

  // Load documents from Mayan EDMS
  const loadMayanDocuments = async (cabinetId?: string) => {
    setIsLoadingMayan(true);
    setMayanError(null);

    try {
      let response;
      if (cabinetId) {
        response = await documentsService.getCabinetDocuments(cabinetId, {
          page: 1,
          limit: 50,
          searchQuery: searchQuery || undefined,
        });
      } else {
        response = await documentsService.getDocuments({
          page: 1,
          limit: 50,
          searchQuery: searchQuery || undefined,
        });
      }

      setMayanDocuments(response.documents);
    } catch (err) {
      setMayanError(err instanceof Error ? err.message : 'Failed to load documents');
      setMayanDocuments([]);
    } finally {
      setIsLoadingMayan(false);
    }
  };

  // Handle cabinet selection
  const handleCabinetSelect = useCallback((cabinetId: string) => {
    const cabinet = cabinetId ? cabinets.find(c => c.id === cabinetId) : null;
    setSelectedCabinet(cabinet);
    loadMayanDocuments(cabinet?.id);
  }, [cabinets, searchQuery]);

  // Reload documents when search query changes
  useEffect(() => {
    if (searchQuery !== undefined) {
      loadMayanDocuments(selectedCabinet?.id);
    }
  }, [searchQuery, selectedCabinet]);

  // Event Handlers
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    dispatch(setViewMode(mode));
  }, [dispatch]);

  const handleDocumentSelect = useCallback((id: string, selected: boolean) => {
    dispatch(selectDocument({ id, selected }));
  }, [dispatch]);

  const handleDocumentOpen = useCallback((document: Document) => {
    // TODO: Implement document viewer integration
    console.log('Opening document:', document);
  }, []);

  const handleDocumentAction = useCallback((action: string, document: Document) => {
    // TODO: Implement document actions (download, delete, etc.)
    console.log('Document action:', action, document);
  }, []);

  const handleFolderOpen = useCallback((folder: DocumentFolder) => {
    dispatch(navigateToFolder({ folderId: folder.id, folder }));
    // TODO: Load folder contents
  }, [dispatch]);

  // Upload handlers
  const handleFilesAdded = useCallback((files: File[]) => {
    const result = addFiles(files);
    if (result.success) {
      startUploads();
    }
  }, [addFiles, startUploads]);

  const handleUploadDocumentsToggle = useCallback(() => {
    setShowUploadDocuments(!showUploadDocuments);
  }, [showUploadDocuments]);

  const handleFolderManagerToggle = useCallback(() => {
    setShowFolderManager(!showFolderManager);
  }, [showFolderManager]);

  const handleUploadComplete = useCallback((documents: any[]) => {
    console.log('Upload completed:', documents);
    // Refresh the document list
    setRefreshTrigger(prev => prev + 1);
    // Close upload panel
    setShowUploadDocuments(false);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    dispatch(setSearchQuery(query));
    // TODO: Trigger search API call
  }, [dispatch]);

  const handleSortChange = useCallback((criteria: SortCriteria[]) => {
    dispatch(setSortCriteria(criteria));
    // TODO: Trigger API call with new sort criteria
  }, [dispatch]);

  // Tab navigation handlers
  const handleTabChange = useCallback((tab: string) => {
    setSearchParams({ tab });
  }, [setSearchParams]);

  const tabs = [
    { id: 'library', label: 'Document Library', icon: '📚' },
    { id: 'upload', label: 'Upload Documents', icon: '📤' },
    { id: 'folders', label: 'Folder Manager', icon: '📁' },
    { id: 'smart-folders', label: 'Smart Folders', icon: '🔍' },
    { id: 'doctypes', label: 'Document Types', icon: '📑' },
    { id: 'bulk-operations', label: 'Bulk Operations', icon: '⚡' },
  ];

  // Common props for all view components - use Mayan documents
  const commonViewProps = {
    documents: mayanDocuments, // Use Mayan documents instead of Redux state
    folders: [], // Cabinets are handled separately
    loading: isLoadingMayan, // Use Mayan loading state
    error: mayanError, // Use Mayan error state
    selectedIds: selectedDocumentIds,
    onDocumentSelect: handleDocumentSelect,
    onDocumentOpen: handleDocumentOpen,
    onDocumentAction: handleDocumentAction,
    onFolderOpen: handleFolderOpen,
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 glass-strong">
        <div className="px-6 py-4">
          <div className="flex flex-col space-y-4">
            {/* Top Row: Title and Tab Navigation */}
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              {/* Title */}
              <div className="flex items-center space-x-4">
                <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                  Documents
                </h1>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center space-x-1 bg-white/10 rounded-lg p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`
                      flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
                      ${activeTab === tab.id
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                      }
                    `}
                  >
                    <span>{tab.icon}</span>
                    <span className="hidden md:block">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Second Row: Controls for Library tab */}
            {activeTab === 'library' && (
              <>
                <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
                  {/* View Mode and Actions */}
                  <div className="flex items-center space-x-4">
                    <ViewModeToggle
                      currentMode={viewMode}
                      onModeChange={handleViewModeChange}
                      disabled={isLoading || isLoadingMayan}
                    />

                    {/* Cabinet Selector */}
                    <div className="flex items-center space-x-2">
                      <label htmlFor="cabinet-select" className="text-sm text-white/70">
                        Cabinet:
                      </label>
                      <select
                        id="cabinet-select"
                        value={selectedCabinet?.id || ''}
                        onChange={(e) => handleCabinetSelect(e.target.value)}
                        className="glass-input text-sm min-w-[150px]"
                      >
                        <option value="">All Documents</option>
                        {(cabinets || []).map(cabinet => (
                          <option key={cabinet.id} value={cabinet.id}>
                            {cabinet.label} ({cabinet.documentCount || 0})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Document Count */}
                    {mayanDocuments.length > 0 && (
                      <div className="text-sm text-white/60">
                        {mayanDocuments.length} document{mayanDocuments.length !== 1 ? 's' : ''}
                        {selectedCabinet && (
                          <span className="ml-1">in {selectedCabinet.label}</span>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleUploadDocumentsToggle}
                        className="btn-glass inline-flex items-center px-3 py-2 text-sm leading-4 font-medium rounded-md text-white hover:scale-105 transition-all duration-300"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload Documents
                      </button>

                      <button
                        onClick={handleFolderManagerToggle}
                        className="btn-glass inline-flex items-center px-3 py-2 text-sm leading-4 font-medium rounded-md text-white hover:scale-105 transition-all duration-300"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        New Folder
                      </button>

                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="flex-1 max-w-lg">
                    <SearchBar
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder="Search documents..."
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Sort Controls */}
                <div className="border-t border-white/10 pt-4">
                  <SortControls
                    sortCriteria={sortCriteria}
                    onSortChange={handleSortChange}
                    disabled={isLoading}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bulk Action Toolbar */}
        {selectedDocumentIds.length > 0 && (
          <BulkActionToolbar
            selectedCount={selectedDocumentIds.length}
            totalCount={documents.length}
            onClearSelection={() => {
              selectedDocumentIds.forEach(id =>
                dispatch(selectDocument({ id, selected: false }))
              );
            }}
          />
        )}
      </div>

      {/* Upload Documents Interface */}
      {showUploadDocuments && (
        <div className="border-b border-white/10 glass-panel">
          <div className="px-6 py-4">
            <EnhancedUploadInterface
              maxFileSize={50 * 1024 * 1024} // 50MB
              maxFiles={100}
              allowedFileTypes={['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'mp3']}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Folder Manager */}
      {showFolderManager && (
        <div className="border-b border-white/10 glass-panel">
          <div className="px-6 py-4">
            <FolderManager
              onFolderCreate={(folder) => {
                console.log('Folder created:', folder);
                setShowFolderManager(false);
              }}
              onFolderUpdate={(folderId, updates) => {
                console.log('Folder updated:', folderId, updates);
              }}
              onFolderDelete={(folderId) => {
                console.log('Folder deleted:', folderId);
              }}
              onFolderMove={(folderId, targetParentId) => {
                console.log('Folder moved:', folderId, targetParentId);
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Render different content based on active tab */}
        {activeTab === 'library' && (
          <>
            {/* Filter Panel */}
            <FilterPanel
              filters={filters}
              onFiltersChange={(newFilters) => {
                // TODO: Implement filter changes
                console.log('Filters changed:', newFilters);
              }}
              availableTypes={[]}
              availableTags={[]}
              availableAuthors={[]}
              collapsed={filterPanelCollapsed}
              onToggleCollapsed={() => {
                // TODO: Implement filter panel toggle
              }}
            />

            {/* Document View */}
            <div className="flex-1 overflow-hidden">
              {isLoadingMayan && mayanDocuments.length === 0 ? (
                <div className="p-6">
                  <DocumentLibrarySkeleton
                    view={viewMode}
                    count={viewMode === 'grid' ? 12 : viewMode === 'list' ? 10 : 8}
                  />
                </div>
              ) : mayanError ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-red-400 text-lg font-medium mb-2">
                      Error loading documents
                    </div>
                    <div className="text-white/60 mb-4">{mayanError}</div>
                    <button
                      onClick={() => loadMayanDocuments(selectedCabinet?.id.toString())}
                      className="btn-glass px-4 py-2 text-sm"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <VirtualizedDocumentView
                  {...commonViewProps}
                  viewMode={viewMode}
                  hasNextPage={false} // TODO: Connect to pagination state
                  isNextPageLoading={false} // TODO: Connect to loading state
                  loadNextPage={() => {
                    // TODO: Implement infinite scroll loading
                    console.log('Load next page');
                  }}
                />
              )}
            </div>
          </>
        )}

        {/* Upload Documents Tab */}
        {activeTab === 'upload' && (
          <div className="flex-1 overflow-auto">
            <div className="p-6 max-w-7xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Upload Documents</h2>
                <p className="text-white/70">Enhanced document upload with AI classification, metadata extraction, and warehouse management.</p>
              </div>
              <EnhancedUploadInterface
                maxFileSize={50 * 1024 * 1024}
                maxFiles={100}
                allowedFileTypes={['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'mp3']}
                onUploadComplete={handleUploadComplete}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Folder Manager Tab */}
        {activeTab === 'folders' && (
          <div className="flex-1 overflow-hidden">
            <FolderManager
              onFolderCreate={(folder) => {
                console.log('Folder created:', folder);
              }}
              onFolderUpdate={(folderId, updates) => {
                console.log('Folder updated:', folderId, updates);
              }}
              onFolderDelete={(folderId) => {
                console.log('Folder deleted:', folderId);
              }}
              onFolderMove={(folderId, targetParentId) => {
                console.log('Folder moved:', folderId, targetParentId);
              }}
              className="h-full"
            />
          </div>
        )}

        {/* Smart Folders Tab */}
        {activeTab === 'smart-folders' && (
          <div className="flex-1 overflow-hidden p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Smart Folders</h2>
                <p className="text-white/70">Create intelligent folders that automatically organize documents based on criteria.</p>
              </div>

              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowSmartFolderBuilder(true)}
                  className="btn-glass inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white hover:scale-105 transition-all duration-300"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Smart Folder
                </button>
              </div>

              {/* Smart folders list would go here */}
              <div className="glass-panel rounded-lg p-6">
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H9a2 2 0 00-2 2v8a2 2 0 002 2h10m0-10V5a2 2 0 012-2h8a2 2 0 012 2v6m0 0v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-8" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-white">No smart folders</h3>
                  <p className="mt-1 text-sm text-white/60">Create your first smart folder to automatically organize documents.</p>
                </div>
              </div>
            </div>

            <SmartFolderBuilder
              isOpen={showSmartFolderBuilder}
              onClose={() => setShowSmartFolderBuilder(false)}
              onFolderCreated={(folderId) => {
                console.log('Smart folder created:', folderId);
                setShowSmartFolderBuilder(false);
              }}
            />
          </div>
        )}

        {/* Document Types Tab */}
        {activeTab === 'doctypes' && (
          <div className="flex-1 overflow-hidden">
            <DocumentTypesManager />
          </div>
        )}

        {/* Bulk Operations Tab */}
        {activeTab === 'bulk-operations' && (
          <div className="flex-1 overflow-hidden p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Bulk Operations</h2>
                <p className="text-white/70">Perform actions on multiple documents and folders at once.</p>
              </div>

              <div className="glass-panel rounded-lg p-6">
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-white">Select items for bulk operations</h3>
                  <p className="mt-1 text-sm text-white/60">Select documents or folders from the main library to perform bulk actions.</p>
                </div>
              </div>
            </div>

            <BulkFolderActions
              isVisible={showBulkActions}
              onClose={() => setShowBulkActions(false)}
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default DocumentLibrary;
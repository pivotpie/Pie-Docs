import React, { useEffect, useState, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSearchParams } from 'react-router-dom';
import { documentsService } from '@/services/api/documentsService';
import ViewModeToggle from '@/components/documents/ViewModeToggle';
import DocumentGridView from '@/components/documents/DocumentGridView';
import DocumentListView from '@/components/documents/DocumentListView';
import SearchBar from '@/components/documents/SearchBar';
import { DocumentLibrarySkeleton } from '@/components/common/LoadingSkeleton';
import type { Document, ViewMode, DocumentQueryParams } from '@/types/domain/Document';

interface Cabinet {
  id: number;
  label: string;
  documents_count?: number;
}

const MayanDocumentLibrary: React.FC = () => {
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  // State management
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [selectedCabinet, setSelectedCabinet] = useState<Cabinet | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Get cabinet from URL params
  const cabinetId = searchParams.get('cabinet');

  // Load cabinets on component mount
  useEffect(() => {
    loadCabinets();
  }, []);

  // Load documents when cabinet selection changes
  useEffect(() => {
    if (cabinetId) {
      const cabinet = cabinets.find(c => c.id.toString() === cabinetId);
      if (cabinet) {
        setSelectedCabinet(cabinet);
        loadCabinetDocuments(cabinetId);
      }
    } else {
      setSelectedCabinet(null);
      loadAllDocuments();
    }
  }, [cabinetId, cabinets]);

  // Load search results when search query changes
  useEffect(() => {
    if (searchQuery) {
      handleSearch();
    } else if (selectedCabinet) {
      loadCabinetDocuments(selectedCabinet.id.toString());
    } else {
      loadAllDocuments();
    }
  }, [searchQuery]);

  // Load cabinets from Mayan EDMS
  const loadCabinets = async () => {
    try {
      const cabinetData = await documentsService.getCabinets();
      setCabinets(cabinetData);
    } catch (err) {
      console.error('Failed to load cabinets:', err);
    }
  };

  // Load documents from a specific cabinet
  const loadCabinetDocuments = async (cabinetId: string, page = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const params: DocumentQueryParams = {
        page,
        limit: 24,
        searchQuery: searchQuery || undefined,
      };

      const response = await documentsService.getCabinetDocuments(cabinetId, params);

      if (page === 1) {
        setDocuments(response.documents);
      } else {
        setDocuments(prev => [...prev, ...response.documents]);
      }

      setCurrentPage(page);
      setHasMore(response.hasMore);
      setTotalCount(response.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  // Load all documents
  const loadAllDocuments = async (page = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const params: DocumentQueryParams = {
        page,
        limit: 24,
        searchQuery: searchQuery || undefined,
      };

      const response = await documentsService.getDocuments(params);

      if (page === 1) {
        setDocuments(response.documents);
      } else {
        setDocuments(prev => [...prev, ...response.documents]);
      }

      setCurrentPage(page);
      setHasMore(response.hasMore);
      setTotalCount(response.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1);
    if (selectedCabinet) {
      loadCabinetDocuments(selectedCabinet.id.toString(), 1);
    } else {
      loadAllDocuments(1);
    }
  };

  // Handle cabinet selection
  const handleCabinetSelect = useCallback((cabinet: Cabinet | null) => {
    if (cabinet) {
      setSearchParams({ cabinet: cabinet.id.toString() });
    } else {
      setSearchParams({});
    }
    setCurrentPage(1);
    setSelectedDocumentIds([]);
    setSearchQuery('');
  }, [setSearchParams]);

  // Handle document selection
  const handleDocumentSelect = useCallback((id: string, selected: boolean) => {
    setSelectedDocumentIds(prev =>
      selected
        ? [...prev, id]
        : prev.filter(docId => docId !== id)
    );
  }, []);

  // Handle document open
  const handleDocumentOpen = useCallback((document: Document) => {
    // TODO: Open document viewer or download
    window.open(document.downloadUrl, '_blank');
  }, []);

  // Handle document actions
  const handleDocumentAction = useCallback((action: string, document: Document) => {
    switch (action) {
      case 'download':
        window.open(document.downloadUrl, '_blank');
        break;
      case 'menu':
        // TODO: Show context menu
        console.log('Show menu for', document);
        break;
      default:
        console.log('Action:', action, document);
    }
  }, []);

  // Handle view mode change
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('mayan-document-view-mode', mode);
  }, []);

  // Load more documents (infinite scroll)
  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      const nextPage = currentPage + 1;
      if (selectedCabinet) {
        loadCabinetDocuments(selectedCabinet.id.toString(), nextPage);
      } else {
        loadAllDocuments(nextPage);
      }
    }
  }, [hasMore, isLoading, currentPage, selectedCabinet]);

  // Restore view mode preference
  useEffect(() => {
    const savedViewMode = localStorage.getItem('mayan-document-view-mode') as ViewMode;
    if (savedViewMode && ['grid', 'list'].includes(savedViewMode)) {
      setViewMode(savedViewMode);
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 glass-strong">
        <div className="px-6 py-4">
          <div className="flex flex-col space-y-4">
            {/* Title and Cabinet Selector */}
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              <div className="flex items-center space-x-4">
                <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                  Mayan Document Library
                </h1>
                {selectedCabinet && (
                  <div className="flex items-center space-x-2">
                    <span className="text-white/60">|</span>
                    <span className="text-white/80">{selectedCabinet.label}</span>
                    {selectedCabinet.documents_count !== undefined && (
                      <span className="text-sm text-white/60">
                        ({selectedCabinet.documents_count} documents)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Cabinet Filter */}
              <div className="flex items-center space-x-4">
                <select
                  value={selectedCabinet?.id.toString() || ''}
                  onChange={(e) => {
                    const cabinetId = e.target.value;
                    const cabinet = cabinetId ? cabinets.find(c => c.id.toString() === cabinetId) : null;
                    handleCabinetSelect(cabinet);
                  }}
                  className="glass-input min-w-[200px]"
                >
                  <option value="">All Documents</option>
                  {cabinets.map(cabinet => (
                    <option key={cabinet.id} value={cabinet.id}>
                      {cabinet.label} ({cabinet.documents_count || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              {/* View Mode and Stats */}
              <div className="flex items-center space-x-4">
                <ViewModeToggle
                  currentMode={viewMode}
                  onModeChange={handleViewModeChange}
                  disabled={isLoading}
                />

                {totalCount > 0 && (
                  <div className="text-sm text-white/60">
                    {totalCount} document{totalCount !== 1 ? 's' : ''}
                    {selectedDocumentIds.length > 0 && (
                      <span className="ml-2">
                        ({selectedDocumentIds.length} selected)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Search Bar */}
              <div className="flex-1 max-w-lg">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search documents..."
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading && documents.length === 0 ? (
          <div className="p-6">
            <DocumentLibrarySkeleton
              view={viewMode}
              count={viewMode === 'grid' ? 12 : 10}
            />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-red-400 text-lg font-medium mb-2">
                Error loading documents
              </div>
              <div className="text-white/60 mb-4">{error}</div>
              <button
                onClick={() => selectedCabinet ? loadCabinetDocuments(selectedCabinet.id.toString()) : loadAllDocuments()}
                className="btn-glass px-4 py-2 text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full">
            {viewMode === 'grid' ? (
              <DocumentGridView
                documents={documents}
                folders={[]}
                loading={isLoading}
                error={error}
                selectedIds={selectedDocumentIds}
                onDocumentSelect={handleDocumentSelect}
                onDocumentOpen={handleDocumentOpen}
                onDocumentAction={handleDocumentAction}
                onFolderOpen={() => {}}
              />
            ) : (
              <DocumentListView
                documents={documents}
                folders={[]}
                loading={isLoading}
                error={error}
                selectedIds={selectedDocumentIds}
                onDocumentSelect={handleDocumentSelect}
                onDocumentOpen={handleDocumentOpen}
                onDocumentAction={handleDocumentAction}
                onFolderOpen={() => {}}
              />
            )}

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center p-6">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="btn-glass px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MayanDocumentLibrary;
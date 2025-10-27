import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { documentsService } from '@/services/api/documentsService';
import { foldersService } from '@/services/api/foldersService';
import { warehouseService } from '@/services/api/warehouseService';
import { searchService } from '@/services/api/searchService';
import EnhancedUploadInterface from '@/components/documents/upload/EnhancedUploadInterface';
import MetadataManagerLive from '@/components/documents/metadata/MetadataManagerLive';
import CheckInOutManager from '@/components/documents/lifecycle/CheckInOutManager';
import TagManager from '@/components/documents/tags/TagManager';
import DocTypeManager from '@/components/documents/doctypes/DocTypeManager';
import FolderManager from '@/components/documents/folders/FolderManager';
import { DocumentPreviewPanel } from '@/components/documents/preview/DocumentPreviewPanel';
import { DocumentToolsRouter } from '@/components/documents/tools';
import { DocumentSearchPanel } from '@/components/documents/search/DocumentSearchPanel';
import { SearchResultsView } from '@/components/documents/search/SearchResultsView';
import { DocumentIntelligencePanel } from '@/components/documents/intelligence/DocumentIntelligencePanel';
import FilterPanel from '@/components/documents/FilterPanel';
import type { AIWorkspaceType } from '@/components/documents/ai/DocumentAIFeaturesPanel';
import type { DocumentFilter, DocumentType, DocumentStatus } from '@/types/domain/Document';
import { DocumentAIFeaturesPanel } from '@/components/documents/ai/DocumentAIFeaturesPanel';
import { DocumentGeneratorWorkspace } from '@/components/documents/ai/workspaces/DocumentGeneratorWorkspace';
import { SummaryViewerWorkspace } from '@/components/documents/ai/workspaces/SummaryViewerWorkspace';
import { DynamicAIWorkspace } from '@/components/documents/ai/workspaces/DynamicAIWorkspace';
import type { AIAction } from '@/components/documents/ai/workspaces/DynamicAIWorkspace';

// Data types
interface Document {
  id: string;
  name: string;
  type: string;
  document_type: string; // Semantic document type (Invoice, Contract, etc.)
  mime_type: string; // File format (application/pdf, etc.)
  size: string;
  sizeBytes: number;
  modified: string;
  created: string;
  tags: string[];
  relationships: string[];
  confidenceScore?: number;
  extractedText?: string;
  ocrQuality?: number;
  owner: string;
  status: string;
  downloadUrl?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  physicalLocation?: string;
  barcodeId?: string;
  barcodeCode?: string;
  rackId?: string;
  rackName?: string;
  shelfId?: string;
  shelfName?: string;
  zoneId?: string;
  zoneName?: string;
  warehouseId?: string;
  warehouseName?: string;
  locationId?: string;
  locationName?: string;
  folderId?: string;
  folderName?: string;
  metadata?: any;
  ocrText?: string;
  version?: number;
  versionDescription?: string;
  versionType?: string;
}

interface Folder {
  id: string;
  name: string;
  itemCount: number;
  modified: string;
  type: 'folder';
  parentId?: string;
  children?: Folder[];
  path?: string;
  size?: string;
  owner?: string;
  shared?: boolean;
  color?: string;
  description?: string;
}

type ViewMode = 'folder' | 'grid' | 'list' | 'detail' | 'relationship';
type PreviewTab = 'document' | 'ocr';
type PageView = 'library' | 'upload' | 'folders' | 'doctypes' | 'tags' | 'checkinout' | 'metadata';
type RightPanelTab = 'ai' | 'intelligence' | 'tools';

const AdvancedDocumentLibraryV3: React.FC = () => {
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>('folder');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('document');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'keyword' | 'semantic'>('semantic');
  const [currentView, setCurrentView] = useState<'library' | 'search'>('library');
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('ai'); // Tab for right panel when preview is open
  const [activePage, setActivePage] = useState<PageView>((searchParams.get('tab') as PageView) || 'library');
  const [isSearchPanelCollapsed, setIsSearchPanelCollapsed] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [folderPath, setFolderPath] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<AIWorkspaceType | null>(null);
  const [searchResults, setSearchResults] = useState<{
    query: string;
    searchType: string;
    resultsCount: number;
    timeTaken: number;
    isActive: boolean;
  } | null>(null);
  const [activeFilters, setActiveFilters] = useState<Partial<DocumentFilter>>({
    types: [],
    status: [],
    tags: [],
    authors: [],
    dateRange: undefined
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<Array<{ query: string; timestamp: string }>>([]);
  const [isInFolderNavigationMode, setIsInFolderNavigationMode] = useState(false);

  // Load documents and folders from API
  const loadDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Build documents query params
      const docsParams: any = {
        page: 1,
        limit: 50,
      };
      if (currentFolder?.id) {
        docsParams.folderId = currentFolder.id;
        console.log('Loading documents for folder:', currentFolder.name, 'ID:', currentFolder.id);
      } else {
        // At root level - don't send folder_id, will filter on frontend
        console.log('Loading documents at root level (will filter for no folder assignment)');
      }

      // Load documents
      const docsResponse = await documentsService.getDocuments(docsParams);
      console.log('Loaded', docsResponse.documents.length, 'documents from API');

      // Filter documents based on folder context
      let filteredDocuments = docsResponse.documents;
      if (currentFolder?.id) {
        // Inside a folder - API already filtered by folder_id, use documents as-is
        console.log('Using', filteredDocuments.length, 'documents from API (already filtered by folder_id)');
      } else {
        // At root level - API returned all docs, filter for only those with NO folder assignment
        filteredDocuments = docsResponse.documents.filter((doc: any) => !doc.folder_id);
        console.log('Filtered to', filteredDocuments.length, 'documents at root level (no folder)');
      }

      // Transform API documents to match local Document interface
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1';

      // Load physical locations for all documents in parallel
      const physicalLocationsMap = new Map<string, any>();
      await Promise.all(
        filteredDocuments.map(async (doc: any) => {
          try {
            const physicalDoc = await warehouseService.getPhysicalDocumentByDigitalId(doc.id.toString());
            if (physicalDoc) {
              physicalLocationsMap.set(doc.id.toString(), physicalDoc);
            }
          } catch (err) {
            // Document may not have physical location - silently skip
          }
        })
      );

      const transformedDocs: Document[] = filteredDocuments.map((doc: any) => {
        const physicalDoc = physicalLocationsMap.get(doc.id.toString());

        // Construct thumbnail URL - prioritize API response, fallback to constructed URL
        const thumbnailUrl = doc.thumbnail_url || `http://localhost:8001/api/v1/documents/${doc.id}/thumbnail`;

        // Log thumbnail URL for debugging (first document only)
        if (filteredDocuments.indexOf(doc) === 0) {
          console.log('Sample thumbnail URL:', thumbnailUrl, 'for document:', doc.title || doc.name);
        }

        return {
          id: doc.id.toString(),
          name: doc.title || doc.name,
          type: doc.mime_type || doc.type || 'Unknown',
          document_type: doc.document_type || 'General',
          mime_type: doc.mime_type || 'application/octet-stream',
          size: formatFileSize(doc.file_size || doc.size || 0),
          sizeBytes: doc.file_size || doc.size || 0,
          modified: doc.modified_at || doc.dateModified || doc.updated_at,
          created: doc.created_at || doc.dateCreated,
          tags: doc.tags || [],
          relationships: [], // Not available in API yet
          confidenceScore: doc.ocr_confidence,
          extractedText: doc.ocr_text || '',
          ocrQuality: doc.ocr_confidence,
          owner: doc.author || 'Unknown',
          status: doc.status || 'published',
          downloadUrl: doc.download_url || `${API_BASE_URL}/documents/${doc.id}/download`,
          thumbnail: thumbnailUrl,
          thumbnailUrl: thumbnailUrl,
          previewUrl: doc.preview_url,
          physicalLocation: doc.rack_name ? `${doc.warehouse_name || ''} - ${doc.zone_name || ''} - ${doc.rack_name}`.trim() : undefined,
          barcodeId: doc.barcode_id,
          barcodeCode: doc.barcode_code,
          rackId: doc.rack_id,
          rackName: doc.rack_name,
          shelfId: doc.shelf_id,
          shelfName: doc.shelf_name,
          zoneId: doc.zone_id,
          zoneName: doc.zone_name,
          warehouseId: doc.warehouse_id,
          warehouseName: doc.warehouse_name,
          locationId: doc.location_id,
          locationName: doc.location_name,
          folderId: doc.folder_id,
          folderName: doc.folder_name,
          metadata: doc.metadata,
          ocrText: doc.ocr_text,
          version: doc.version,
          versionDescription: doc.version_description,
          versionType: doc.version_type,
        };
      });

      setDocuments(transformedDocs);

      // Load folders
      try {
        // Build folders query params
        const foldersParams: any = {
          page: 1,
          page_size: 100,
        };
        // Only include parent_id if we're inside a folder
        if (currentFolder?.id) {
          foldersParams.parent_id = currentFolder.id;
        }
        // If currentFolder is null, we'll get root-level folders (no parent_id means root)

        const foldersResponse = await foldersService.getFolders(foldersParams);

        // Transform API folders to match local Folder interface
        const transformedFolders: Folder[] = foldersResponse.folders.map((folder: any) => ({
          id: folder.id,
          name: folder.name,
          itemCount: folder.document_count || 0,
          modified: folder.updated_at || folder.created_at,
          type: 'folder' as const,
          parentId: folder.parent_id,
          path: folder.path || `/${folder.name}`,
          size: formatFileSize(folder.total_size || 0),
          owner: folder.owner_id || 'Unknown',
          shared: folder.is_shared || false,
          color: folder.color,
          description: folder.description,
        }));

        setFolders(transformedFolders);
      } catch (folderErr) {
        console.error('Failed to load folders:', folderErr);
        setFolders([]);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
      setDocuments([]);
      setFolders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Helper function to get relevance badge color
  const getRelevanceBadgeColor = (score?: number): string => {
    if (!score) return 'bg-gray-500/20 text-gray-300';
    const percentage = score * 100;
    if (percentage >= 90) return 'bg-green-500/20 text-green-300';
    if (percentage >= 75) return 'bg-yellow-500/20 text-yellow-300';
    if (percentage >= 60) return 'bg-orange-500/20 text-orange-300';
    return 'bg-gray-500/20 text-gray-300';
  };

  // Extract available filter options from documents
  const availableDocumentTypes = React.useMemo(() => {
    const types = new Set<DocumentType>();
    documents.forEach(doc => {
      if (doc.document_type) types.add(doc.document_type as DocumentType);
    });
    return Array.from(types).sort();
  }, [documents]);

  const availableTags = React.useMemo(() => {
    const tags = new Set<string>();
    documents.forEach(doc => {
      doc.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [documents]);

  const availableAuthors = React.useMemo(() => {
    const authors = new Set<string>();
    documents.forEach(doc => {
      if (doc.owner) authors.add(doc.owner);
    });
    return Array.from(authors).sort();
  }, [documents]);

  // Sync activePage with URL parameter
  useEffect(() => {
    const pageFromUrl = searchParams.get('tab') as PageView;
    if (pageFromUrl && pageFromUrl !== activePage) {
      setActivePage(pageFromUrl);
    }
  }, [searchParams]);

  // Auto-collapse search panel when preview opens
  useEffect(() => {
    if (showPreview) {
      setIsSearchPanelCollapsed(true);
    }
  }, [showPreview]);

  // Load documents on mount, when refreshing, or when navigating folders
  useEffect(() => {
    loadDocuments();
  }, [refreshTrigger, currentFolder]);

  // Auto-trigger search when filters change (only if search is active)
  useEffect(() => {
    if (searchResults?.isActive && searchQuery.trim()) {
      // Create synthetic event for handleSearch
      const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSearch(syntheticEvent);
    }
  }, [activeFilters]);

  // Fetch search suggestions on query change with debouncing
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length >= 2) {
        try {
          const suggestions = await searchService.getSuggestions(searchQuery, 5);
          setSearchSuggestions(suggestions);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Failed to fetch suggestions:', error);
          setSearchSuggestions([]);
          setShowSuggestions(false);
        }
      } else {
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }
    };

    // Debounce the fetch with 300ms delay
    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Fetch search history and refresh after each search
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await searchService.getSearchHistory(10);
        setSearchHistory(history.history || []);
      } catch (error) {
        console.error('Failed to fetch search history:', error);
      }
    };

    fetchHistory();
  }, [searchResults]); // Refresh after each search

  const documentTools = [
    { id: 'acls', label: 'ACLs', icon: '🔒' },
    { id: 'cabinets', label: 'Folders', icon: '📚' },
    { id: 'checkinout', label: 'Check in/out', icon: '🛒' },
    { id: 'comments', label: 'Comments', icon: '💬' },
    { id: 'duplicates', label: 'Duplicates', icon: '📑' },
    { id: 'events', label: 'Events', icon: '📋' },
    { id: 'metadata', label: 'Metadata', icon: '🗂️' },
    { id: 'properties', label: 'Properties', icon: 'ℹ️' },
    { id: 'signatures', label: 'Signature captures', icon: '✍️' },
    { id: 'smartlinks', label: 'Smart links', icon: '🔗' },
    { id: 'subscriptions', label: 'Subscriptions', icon: '📡' },
    { id: 'tags', label: 'Tags', icon: '🏷️' },
    { id: 'versions', label: 'Versions', icon: '🔄' },
    { id: 'weblinks', label: 'Web links', icon: '🔗' },
    { id: 'workflows', label: 'Workflows', icon: '⚙️' },
  ];

  // Mock Checkout Records Data


  const handleDocumentClick = (doc: Document) => {
    setSelectedDocument(doc);
  };

  const handleDocumentDoubleClick = (doc: Document) => {
    setSelectedDocument(doc);
    setShowPreview(true);
    setPreviewTab('document');
  };

  const handleFolderDoubleClick = (folder: Folder) => {
    setCurrentFolder(folder);
    setFolderPath([...folderPath, folder]);
    setViewMode('grid'); // Auto-switch to grid view when entering a folder
    setIsInFolderNavigationMode(true); // Mark that user has entered folder navigation mode
    console.log('Opening folder:', folder.name);
  };

  const handleBackToParentFolder = () => {
    if (folderPath.length > 0) {
      const newPath = [...folderPath];
      newPath.pop();
      setFolderPath(newPath);
      setCurrentFolder(newPath.length > 0 ? newPath[newPath.length - 1] : null);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      // Clear search and reload all documents
      setSearchResults(null);
      loadDocuments();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const startTime = Date.now();
      console.log('Performing search:', searchQuery, 'Type:', searchType);

      // Call search API with the selected search type and active filters
      const searchApiResults = await searchService.search(
        searchQuery,
        activeFilters, // Apply active filters
        1, // page
        50, // pageSize
        'relevance', // sortBy
        searchType // Use the selected search type
      );

      const timeTaken = Date.now() - startTime;
      console.log('Search results:', searchApiResults);

      // Transform search results to Document format
      const transformedDocs: Document[] = searchApiResults.results.map((result: any) => ({
        id: result.id,
        name: result.title,
        type: result.documentType || 'Unknown',
        document_type: result.documentType || 'General',
        mime_type: result.metadata?.mime_type || 'application/octet-stream',
        size: result.metadata?.file_size ? formatFileSize(result.metadata.file_size) : 'Unknown',
        sizeBytes: result.metadata?.file_size || 0,
        modified: result.modifiedAt,
        created: result.createdAt,
        tags: result.tags || [],
        relationships: [],
        confidenceScore: result.score,
        extractedText: result.content || '',
        ocrQuality: result.score,
        owner: result.author || 'Unknown',
        status: result.metadata?.status || 'published',
        downloadUrl: result.downloadUrl,
        thumbnail: result.thumbnailUrl,
        thumbnailUrl: result.thumbnailUrl,
        previewUrl: result.previewUrl,
        metadata: result.metadata,
      }));

      setDocuments(transformedDocs);

      // Set search results state
      setSearchResults({
        query: searchQuery,
        searchType: searchType,
        resultsCount: searchApiResults.totalResults,
        timeTaken: timeTaken,
        isActive: true
      });

      // Switch to search results view
      setCurrentView('search');

      console.log(`Found ${transformedDocs.length} documents using ${searchType} search in ${timeTaken}ms`);
    } catch (error) {
      console.error('Search error:', error);
      setError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setCurrentView('library');
    loadDocuments();
  };

  const handleBackToLibrary = () => {
    setCurrentView('library');
    setSearchResults(null);
  };

  // Helper to remove individual filter
  const handleRemoveFilter = (filterType: keyof DocumentFilter, filterValue: string | undefined) => {
    const newFilters = { ...activeFilters };

    if (filterType === 'types' || filterType === 'status' || filterType === 'tags' || filterType === 'authors') {
      newFilters[filterType] = (activeFilters[filterType] || []).filter(v => v !== filterValue);
    } else if (filterType === 'dateRange') {
      newFilters.dateRange = undefined;
    }

    setActiveFilters(newFilters);
  };

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewTab('document');
    setSelectedTool(null);
  };

  const handleBackToPreview = () => {
    setSelectedTool(null);
  };

  const handleNavigateToWorkspace = (workspace: AIWorkspaceType) => {
    setActiveWorkspace(workspace);
    setSelectedTool(null); // Clear any active tool
  };

  const handleBackFromWorkspace = () => {
    setActiveWorkspace(null);
  };

  const handleUploadComplete = (documents: any[]) => {
    console.log('Upload completed:', documents);
    // Refresh the document list
    setRefreshTrigger(prev => prev + 1);
    // Navigate back to library view
    handlePageChange('library');
  };

  const handlePageChange = (page: PageView) => {
    setActivePage(page);
    setSearchParams({ tab: page });
  };

  // Render tool pages
  const renderToolPage = (toolId: string) => {
    return (
      <DocumentToolsRouter
        toolId={toolId}
        document={selectedDocument}
        allTools={documentTools}
        onClose={handleBackToPreview}
      />
    );
  };

  // Render different view modes
  const renderContent = () => {
    switch (viewMode) {
      case 'folder':
        return renderFolderView();
      case 'grid':
        return renderGridView();
      case 'list':
        return renderListView();
      case 'detail':
        return renderDetailView();
      case 'relationship':
        return renderRelationshipView();
      default:
        return renderFolderView();
    }
  };

  const renderFolderView = () => (
    <div className="p-6">
      {/* Breadcrumb navigation */}
      {folderPath.length > 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <button
            onClick={() => {
              setCurrentFolder(null);
              setFolderPath([]);
            }}
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            📁 Root
          </button>
          {folderPath.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <span className="text-white/40">/</span>
              <button
                onClick={() => {
                  const newPath = folderPath.slice(0, index + 1);
                  setFolderPath(newPath);
                  setCurrentFolder(folder);
                }}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {currentFolder ? `${currentFolder.name}` : 'Folders'}
          </h3>
          {currentFolder && (
            <button
              onClick={handleBackToParentFolder}
              className="btn-glass px-4 py-2 text-sm flex items-center gap-2"
            >
              ← Back
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {folders.length > 0 ? (
            folders.map((folder) => (
              <div
                key={folder.id}
                onDoubleClick={() => handleFolderDoubleClick(folder)}
                className="p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer transition-all"
              >
                <div className="text-4xl mb-2">📁</div>
                <div className="text-sm font-medium text-white mb-1">{folder.name}</div>
                <div className="text-xs text-white/40 mt-1">{folder.modified}</div>
              </div>
            ))
          ) : (
            <div className="col-span-4 text-center text-white/60 py-8">
              No folders available
            </div>
          )}
        </div>
      </div>

      {/* Show Recent Documents only on initial landing (not in folder navigation mode) */}
      {!isInFolderNavigationMode && !currentFolder && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            {isLoading ? 'Loading documents...' : 'Recent Documents'}
          </h3>
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300">
              {error}
            </div>
          )}
          <div className="grid grid-cols-4 gap-4">
            {isLoading ? (
              <div className="col-span-4 text-center text-white/60 py-8">Loading...</div>
            ) : documents.length > 0 ? (
              documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleDocumentClick(doc)}
                onDoubleClick={() => handleDocumentDoubleClick(doc)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedDocument?.id === doc.id
                    ? 'bg-indigo-500/20 border-indigo-500/40'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                {doc.thumbnailUrl ? (
                  <div className="w-full h-32 mb-2 rounded overflow-hidden bg-white/5 flex items-center justify-center">
                    <img
                      src={doc.thumbnailUrl}
                      alt={doc.name}
                      className="max-w-full max-h-full object-contain"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        // Fallback to emoji if image fails to load
                        console.warn('Failed to load thumbnail for:', doc.name, 'URL:', doc.thumbnailUrl);
                        (e.target as HTMLImageElement).style.display = 'none';
                        if (e.currentTarget.parentElement) {
                          e.currentTarget.parentElement.innerHTML = '<div class="text-4xl">📄</div>';
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-4xl mb-2">📄</div>
                )}
                <div className="text-sm font-medium text-white mb-1 truncate">{doc.name}</div>
                <div className="text-xs text-white/60">{doc.size}</div>
                <div className="text-xs text-white/40 mt-1">{doc.modified}</div>
                {searchResults?.isActive && doc.confidenceScore !== undefined && (
                  <div className={`mt-2 px-2 py-0.5 rounded text-[10px] font-medium inline-block ${getRelevanceBadgeColor(doc.confidenceScore)}`}>
                    {Math.round(doc.confidenceScore * 100)}% Match
                  </div>
                )}
              </div>
            ))
            ) : (
              <div className="col-span-4 text-center text-white/60 py-8">
                No documents found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderGridView = () => (
    <div className="p-6">
      {/* Breadcrumb navigation */}
      {folderPath.length > 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <button
            onClick={() => {
              setCurrentFolder(null);
              setFolderPath([]);
            }}
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            📁 Root
          </button>
          {folderPath.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <span className="text-white/40">/</span>
              <button
                onClick={() => {
                  const newPath = folderPath.slice(0, index + 1);
                  setFolderPath(newPath);
                  setCurrentFolder(folder);
                }}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-white/60 py-8">Loading...</div>
      ) : error ? (
        <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300">
          {error}
        </div>
      ) : folders.length === 0 && documents.length === 0 ? (
        <div className="text-center text-white/60 py-8">No items found</div>
      ) : (
      <div className="grid grid-cols-4 gap-4">
        {/* Folders First */}
        {folders.map((folder) => (
          <div
            key={folder.id}
            onDoubleClick={() => handleFolderDoubleClick(folder)}
            className="p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer transition-all hover:bg-white/10"
          >
            <div className="text-5xl mb-3 text-center">📁</div>
            <div className="text-sm font-medium text-white mb-2 truncate text-center">{folder.name}</div>
          </div>
        ))}

        {/* Documents After Folders */}
        {documents.map((doc) => (
          <div
            key={doc.id}
            onClick={() => handleDocumentClick(doc)}
            onDoubleClick={() => handleDocumentDoubleClick(doc)}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedDocument?.id === doc.id
                ? 'bg-indigo-500/20 border-indigo-500/40'
                : 'bg-white/5 border-white/10'
            }`}
          >
            {doc.thumbnailUrl ? (
              <div className="w-full h-40 mb-3 rounded overflow-hidden bg-white/5 flex items-center justify-center">
                <img
                  src={doc.thumbnailUrl}
                  alt={doc.name}
                  className="max-w-full max-h-full object-contain"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    // Fallback to emoji if image fails to load
                    console.warn('Failed to load thumbnail for:', doc.name, 'URL:', doc.thumbnailUrl);
                    (e.target as HTMLImageElement).style.display = 'none';
                    if (e.currentTarget.parentElement) {
                      e.currentTarget.parentElement.innerHTML = '<div class="text-5xl">📄</div>';
                    }
                  }}
                />
              </div>
            ) : (
              <div className="text-5xl mb-3 text-center">📄</div>
            )}
            <div className="text-sm font-medium text-white mb-2 truncate text-center">{doc.name}</div>
            <div className="text-xs text-white/60 text-center mb-1">{doc.type}</div>
            <div className="text-xs text-white/60 text-center">{doc.size}</div>
            <div className="flex flex-wrap gap-1 mt-2 justify-center">
              {searchResults?.isActive && doc.confidenceScore !== undefined && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getRelevanceBadgeColor(doc.confidenceScore)}`}>
                  {Math.round(doc.confidenceScore * 100)}%
                </span>
              )}
              {doc.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-white/10 rounded text-[10px] text-white/70">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );

  const renderListView = () => (
    <div className="p-6">
      {/* Breadcrumb navigation */}
      {folderPath.length > 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <button
            onClick={() => {
              setCurrentFolder(null);
              setFolderPath([]);
            }}
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            📁 Root
          </button>
          {folderPath.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <span className="text-white/40">/</span>
              <button
                onClick={() => {
                  const newPath = folderPath.slice(0, index + 1);
                  setFolderPath(newPath);
                  setCurrentFolder(folder);
                }}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-white/60 py-8">Loading...</div>
      ) : error ? (
        <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300">
          {error}
        </div>
      ) : folders.length === 0 && documents.length === 0 ? (
        <div className="text-center text-white/60 py-8">No items found</div>
      ) : (
      <div className="space-y-2">
        {/* Folders First */}
        {folders.map((folder) => (
          <div
            key={folder.id}
            onDoubleClick={() => handleFolderDoubleClick(folder)}
            className="flex items-center gap-3 p-3 border bg-white/5 border-white/10 rounded-lg cursor-pointer transition-all hover:bg-white/10"
          >
            <div className="text-2xl">📁</div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">{folder.name}</div>
              <div className="flex items-center gap-3 text-xs text-white/60">
                <span>{folder.modified}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Documents After Folders */}
        {documents.map((doc) => (
          <div
            key={doc.id}
            onClick={() => handleDocumentClick(doc)}
            onDoubleClick={() => handleDocumentDoubleClick(doc)}
            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
              selectedDocument?.id === doc.id
                ? 'bg-indigo-500/20 border-indigo-500/40'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="text-2xl">📄</div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">{doc.name}</div>
              <div className="flex items-center gap-3 text-xs text-white/60">
                <span>{doc.type}</span>
                <span>•</span>
                <span>{doc.size}</span>
                <span>•</span>
                <span>{doc.modified}</span>
              </div>
            </div>
            <div className="flex gap-1">
              {searchResults?.isActive && doc.confidenceScore !== undefined && (
                <span className={`px-2 py-1 rounded text-xs font-medium ${getRelevanceBadgeColor(doc.confidenceScore)}`}>
                  {Math.round(doc.confidenceScore * 100)}%
                </span>
              )}
              {doc.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="px-2 py-1 bg-white/10 rounded text-xs text-white/70">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );

  const renderDetailView = () => (
    <div className="p-6">
      {/* Breadcrumb navigation */}
      {folderPath.length > 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <button
            onClick={() => {
              setCurrentFolder(null);
              setFolderPath([]);
            }}
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            📁 Root
          </button>
          {folderPath.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <span className="text-white/40">/</span>
              <button
                onClick={() => {
                  const newPath = folderPath.slice(0, index + 1);
                  setFolderPath(newPath);
                  setCurrentFolder(folder);
                }}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-white/60 py-8">Loading...</div>
      ) : error ? (
        <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300">
          {error}
        </div>
      ) : folders.length === 0 && documents.length === 0 ? (
        <div className="text-center text-white/60 py-8">No items found</div>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/80">Name</th>
              {searchResults?.isActive && (
                <th className="text-left py-3 px-4 text-sm font-semibold text-white/80">Relevance</th>
              )}
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/80">Classification</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/80">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/80">File Size</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/80">Location</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/80">Warehouse</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/80">Zone</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/80">Shelf</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/80">Rack</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/80">Barcode</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/80">Modified Date</th>
            </tr>
          </thead>
          <tbody>
            {/* Folders First */}
            {folders.map((folder) => (
              <tr
                key={folder.id}
                onDoubleClick={() => handleFolderDoubleClick(folder)}
                className="border-b border-white/5 cursor-pointer transition-all hover:bg-white/5"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📁</span>
                    <span className="text-sm text-white max-w-xs truncate" title={folder.name}>{folder.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">
                    Folder
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-white/40" colSpan={8}>-</td>
                <td className="py-3 px-4 text-xs text-white/70">
                  {folder.modified ? new Date(folder.modified).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '-'}
                </td>
              </tr>
            ))}

            {/* Documents After Folders */}
            {documents.map((doc) => (
              <tr
                key={doc.id}
                onClick={() => handleDocumentClick(doc)}
                onDoubleClick={() => handleDocumentDoubleClick(doc)}
                className={`border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 ${
                  selectedDocument?.id === doc.id
                    ? 'bg-indigo-500/20'
                    : ''
                }`}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📄</span>
                    <span className="text-sm text-white max-w-xs truncate" title={doc.name}>{doc.name}</span>
                  </div>
                </td>
                {searchResults?.isActive && (
                  <td className="py-3 px-4">
                    {doc.confidenceScore !== undefined ? (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getRelevanceBadgeColor(doc.confidenceScore)}`}>
                        {Math.round(doc.confidenceScore * 100)}%
                      </span>
                    ) : (
                      <span className="text-xs text-white/40">-</span>
                    )}
                  </td>
                )}
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-medium">
                    {doc.document_type || 'General'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    doc.status === 'published'
                      ? 'bg-green-500/20 text-green-300'
                      : doc.status === 'draft'
                      ? 'bg-yellow-500/20 text-yellow-300'
                      : 'bg-gray-500/20 text-gray-300'
                  }`}>
                    {doc.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-white/70">{doc.size}</td>
                <td className="py-3 px-4">
                  {doc.locationName ? (
                    <span className="text-xs text-white/80">{doc.locationName}</span>
                  ) : (
                    <span className="text-xs text-white/40 italic">-</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {doc.warehouseName ? (
                    <span className="text-xs text-white/80">{doc.warehouseName}</span>
                  ) : (
                    <span className="text-xs text-white/40 italic">-</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {doc.zoneName ? (
                    <span className="text-xs text-white/80">{doc.zoneName}</span>
                  ) : (
                    <span className="text-xs text-white/40 italic">-</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {doc.shelfName ? (
                    <span className="text-xs text-white/80">{doc.shelfName}</span>
                  ) : (
                    <span className="text-xs text-white/40 italic">-</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {doc.rackName ? (
                    <span className="text-xs text-white/80 font-medium">{doc.rackName}</span>
                  ) : (
                    <span className="text-xs text-white/40 italic">-</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {doc.barcodeCode ? (
                    <div className="flex items-center gap-1">
                      <span className="text-sm">🏷️</span>
                      <span className="text-xs text-white/80 font-mono">{doc.barcodeCode}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-white/40 italic">-</span>
                  )}
                </td>
                <td className="py-3 px-4 text-xs text-white/70">
                  {doc.modified ? new Date(doc.modified).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );

  const renderRelationshipView = () => (
    <div className="flex items-center justify-center h-full p-6">
      <div className="text-center space-y-4 max-w-2xl">
        <div className="relative w-full h-96">
          {/* Central Document */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-32 h-32 bg-indigo-500/30 border-2 border-indigo-400 rounded-lg flex items-center justify-center shadow-lg">
              <div className="text-center p-2">
                <div className="text-3xl mb-1">📄</div>
                <div className="text-xs text-white font-medium">Selected</div>
                <div className="text-xs text-white font-medium">Document</div>
              </div>
            </div>
          </div>

          {/* Related Documents */}
          {[
            { angle: 0, icon: '💰', label: 'Invoice', type: 'Financial' },
            { angle: 60, icon: '👤', label: 'Vendor', type: 'Reference' },
            { angle: 120, icon: '📅', label: 'Schedule', type: 'Related' },
            { angle: 180, icon: '📋', label: 'PO', type: 'Source' },
            { angle: 240, icon: '✍️', label: 'Amendment', type: 'Version' },
            { angle: 300, icon: '⚖️', label: 'Legal', type: 'Workflow' }
          ].map((node, i) => {
            const radius = 160;
            const x = Math.cos((node.angle * Math.PI) / 180) * radius;
            const y = Math.sin((node.angle * Math.PI) / 180) * radius;

            return (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                style={{
                  marginLeft: `${x}px`,
                  marginTop: `${y}px`
                }}
              >
                <div className="w-20 h-20 bg-purple-500/20 border border-purple-400/40 rounded-lg flex items-center justify-center transition-all">
                  <div className="text-center">
                    <div className="text-xl mb-0.5">{node.icon}</div>
                    <div className="text-[9px] text-white/80">{node.label}</div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {[0, 60, 120, 180, 240, 300].map((angle, i) => {
              const radius = 160;
              const centerX = '50%';
              const centerY = '50%';
              const x2 = `calc(50% + ${Math.cos((angle * Math.PI) / 180) * radius}px)`;
              const y2 = `calc(50% + ${Math.sin((angle * Math.PI) / 180) * radius}px)`;

              return (
                <line
                  key={i}
                  x1={centerX}
                  y1={centerY}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="2"
                  strokeDasharray="4"
                />
              );
            })}
          </svg>
        </div>
        <div className="text-white/60 text-sm">
          Document Relationship Map - Showing metadata-based connections
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 glass-strong">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">📚</span>
                Document Library
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Page Tabs */}
              <button
                onClick={() => handlePageChange('library')}
                className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                  activePage === 'library' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60'
                }`}
              >
                📚 Document Library
              </button>
              <button
                onClick={() => handlePageChange('upload')}
                className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                  activePage === 'upload' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60'
                }`}
              >
                ⬆️ Document Upload
              </button>
              <button
                onClick={() => handlePageChange('folders')}
                className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                  activePage === 'folders' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60'
                }`}
              >
                📁 Folder Manager
              </button>
              <button
                onClick={() => handlePageChange('doctypes')}
                className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                  activePage === 'doctypes' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60'
                }`}
              >
                📄 Document Types
              </button>
              <button
                onClick={() => handlePageChange('tags')}
                className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                  activePage === 'tags' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60'
                }`}
              >
                🏷️ Tag Manager
              </button>
              <button
                onClick={() => handlePageChange('checkinout')}
                className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                  activePage === 'checkinout' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60'
                }`}
              >
                🛒 Check in/out
              </button>
              <button
                onClick={() => handlePageChange('metadata')}
                className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                  activePage === 'metadata' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60'
                }`}
              >
                🗂️ Metadata
              </button>
              <button
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                className="btn-glass text-sm px-4 py-2 ml-2"
                disabled={isLoading}
              >
                <span className="mr-2">🔄</span>
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Page Content */}
      {activePage === 'library' ? (
        /* Document Library Page - Three Panel Layout */
        <div className="flex-1 flex overflow-hidden relative">
        {/* Backdrop when search panel is expanded over preview */}
        {showPreview && !isSearchPanelCollapsed && (
          <div
            className="absolute inset-0 bg-black/50 z-20"
            onClick={() => setIsSearchPanelCollapsed(true)}
          />
        )}

        {/* Left Panel: AI Search & Navigation - Collapsed when preview is open */}
        {!showPreview || !isSearchPanelCollapsed ? (
          <DocumentSearchPanel
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            searchType={searchType}
            onSearchTypeChange={setSearchType}
            onSearch={handleSearch}
            showPreview={showPreview}
            isCollapsed={isSearchPanelCollapsed}
            onClose={() => setIsSearchPanelCollapsed(true)}
            suggestions={showSuggestions ? searchSuggestions : undefined}
            onSuggestionClick={(suggestion) => {
              setSearchQuery(suggestion);
              setShowSuggestions(false);
              // Auto-trigger search after selecting suggestion
              setTimeout(() => handleSearch({ preventDefault: () => {} } as React.FormEvent), 100);
            }}
            searchHistory={searchHistory}
          />
        ) : null}

        {/* Filter Panel - Show when filters are enabled */}
        {showFilters && (
          <FilterPanel
            filters={activeFilters}
            onFiltersChange={setActiveFilters}
            availableTypes={availableDocumentTypes}
            availableTags={availableTags}
            availableAuthors={availableAuthors}
            collapsed={false}
            onToggleCollapsed={() => setShowFilters(false)}
          />
        )}

        {/* Center Panel: Content View */}
        <div className="flex-1 flex flex-col">
          {/* View Mode Selector - Hidden when preview is open */}
          {!showPreview && (
          <div className="p-4 border-b border-white/10 glass-panel">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('folder')}
                  className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                    viewMode === 'folder' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60'
                  }`}
                  title="Folder View"
                >
                  📁
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                    viewMode === 'grid' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60'
                  }`}
                  title="Grid View"
                >
                  ⊞
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                    viewMode === 'list' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60'
                  }`}
                  title="List View"
                >
                  ☰
                </button>
                <div className="w-px h-6 bg-white/10 mx-1"></div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-all flex items-center gap-1 ${
                    showFilters ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60'
                  }`}
                  title="Filters"
                >
                  🔍 Filters
                  {(activeFilters.types && activeFilters.types.length > 0) ||
                   (activeFilters.status && activeFilters.status.length > 0) ||
                   (activeFilters.tags && activeFilters.tags.length > 0) ||
                   (activeFilters.authors && activeFilters.authors.length > 0) ||
                   activeFilters.dateRange ? (
                    <span className="ml-1 px-1.5 py-0.5 bg-indigo-500 text-white text-xs rounded-full">
                      {(activeFilters.types?.length || 0) +
                       (activeFilters.status?.length || 0) +
                       (activeFilters.tags?.length || 0) +
                       (activeFilters.authors?.length || 0) +
                       (activeFilters.dateRange ? 1 : 0)}
                    </span>
                  ) : null}
                </button>
              </div>
              <div className="text-sm text-white/60">
                {isLoading ? 'Loading...' : `${documents.length} documents`}
              </div>
            </div>
          </div>
          )}

          {/* Search Results Header - Show when search is active */}
          {!showPreview && searchResults?.isActive && (
            <div className="p-3 border-b border-white/10 bg-indigo-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-400">🔍</span>
                    <span className="text-sm text-white">
                      Search: <span className="font-medium">"{searchResults.query}"</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/60">
                    <span>{searchResults.resultsCount} results</span>
                    <span>•</span>
                    <span className="capitalize">{searchResults.searchType} search</span>
                    <span>•</span>
                    <span>{searchResults.timeTaken}ms</span>
                  </div>
                </div>
                <button
                  onClick={handleClearSearch}
                  className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-all"
                >
                  Clear Search
                </button>
              </div>
            </div>
          )}

          {/* Active Filters Display - Show active filter chips when search is active */}
          {!showPreview && searchResults?.isActive && (
            (activeFilters.types && activeFilters.types.length > 0) ||
            (activeFilters.status && activeFilters.status.length > 0) ||
            (activeFilters.tags && activeFilters.tags.length > 0) ||
            (activeFilters.authors && activeFilters.authors.length > 0) ||
            activeFilters.dateRange
          ) && (
            <div className="px-4 py-3 border-b border-white/10 bg-white/5">
              <div className="flex items-start gap-3">
                <span className="text-xs text-white/60 font-medium pt-1.5">Active Filters:</span>
                <div className="flex-1 flex flex-wrap gap-2">
                  {/* Document Types */}
                  {activeFilters.types && activeFilters.types.map((type) => (
                    <div
                      key={`type-${type}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-xs text-purple-200"
                    >
                      <span className="font-medium">Type:</span>
                      <span className="capitalize">{type}</span>
                      <button
                        onClick={() => handleRemoveFilter('types', type)}
                        className="ml-1 hover:bg-purple-500/30 rounded-full p-0.5 transition-colors"
                        title="Remove filter"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Status */}
                  {activeFilters.status && activeFilters.status.map((status) => (
                    <div
                      key={`status-${status}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-xs text-green-200"
                    >
                      <span className="font-medium">Status:</span>
                      <span className="capitalize">{status}</span>
                      <button
                        onClick={() => handleRemoveFilter('status', status)}
                        className="ml-1 hover:bg-green-500/30 rounded-full p-0.5 transition-colors"
                        title="Remove filter"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Tags */}
                  {activeFilters.tags && activeFilters.tags.map((tag) => (
                    <div
                      key={`tag-${tag}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-200"
                    >
                      <span className="font-medium">Tag:</span>
                      <span>{tag}</span>
                      <button
                        onClick={() => handleRemoveFilter('tags', tag)}
                        className="ml-1 hover:bg-blue-500/30 rounded-full p-0.5 transition-colors"
                        title="Remove filter"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Authors */}
                  {activeFilters.authors && activeFilters.authors.map((author) => (
                    <div
                      key={`author-${author}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs text-amber-200"
                    >
                      <span className="font-medium">Author:</span>
                      <span>{author}</span>
                      <button
                        onClick={() => handleRemoveFilter('authors', author)}
                        className="ml-1 hover:bg-amber-500/30 rounded-full p-0.5 transition-colors"
                        title="Remove filter"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Date Range */}
                  {activeFilters.dateRange && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-xs text-indigo-200">
                      <span className="font-medium">Date:</span>
                      <span>
                        {activeFilters.dateRange.start && activeFilters.dateRange.end
                          ? `${activeFilters.dateRange.start} to ${activeFilters.dateRange.end}`
                          : activeFilters.dateRange.start
                          ? `From ${activeFilters.dateRange.start}`
                          : `To ${activeFilters.dateRange.end}`}
                      </span>
                      <button
                        onClick={() => handleRemoveFilter('dateRange', undefined)}
                        className="ml-1 hover:bg-indigo-500/30 rounded-full p-0.5 transition-colors"
                        title="Remove filter"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Clear All Filters Button */}
                  <button
                    onClick={() => setActiveFilters({
                      types: [],
                      status: [],
                      tags: [],
                      authors: [],
                      dateRange: undefined
                    })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-xs text-red-200 hover:bg-red-500/30 transition-colors font-medium"
                    title="Clear all filters"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Content Area - Preview, Tool Page, or AI Workspace */}
          {showPreview && selectedDocument ? (
            activeWorkspace ? (
              /* AI Workspace - Full page workspace for AI actions */
              activeWorkspace === 'generator' ? (
                <DocumentGeneratorWorkspace
                  document={selectedDocument}
                  onBack={handleBackFromWorkspace}
                />
              ) : activeWorkspace === 'summary' ? (
                <SummaryViewerWorkspace
                  document={selectedDocument}
                  onBack={handleBackFromWorkspace}
                />
              ) : typeof activeWorkspace === 'object' && activeWorkspace.type === 'dynamic' ? (
                <DynamicAIWorkspace
                  document={selectedDocument}
                  action={activeWorkspace.action}
                  onBack={handleBackFromWorkspace}
                />
              ) : null
            ) : selectedTool ? (
              /* Tool Page - Replaces preview when tool is selected */
              renderToolPage(selectedTool)
            ) : (
              /* Preview Panel - Extracted Component */
              <DocumentPreviewPanel
                document={selectedDocument}
                onClose={closePreview}
                previewTab={previewTab}
                onTabChange={setPreviewTab}
                isSearchPanelCollapsed={isSearchPanelCollapsed}
                onToggleSearchPanel={() => setIsSearchPanelCollapsed(!isSearchPanelCollapsed)}
              />
            )
          ) : currentView === 'search' && searchResults ? (
            /* Search Results View */
            <SearchResultsView
              searchQuery={searchResults.query}
              searchType={searchResults.searchType as 'keyword' | 'semantic'}
              searchResults={documents}
              isLoading={isLoading}
              onBack={handleBackToLibrary}
              onDocumentClick={handleDocumentClick}
              onDocumentDoubleClick={handleDocumentDoubleClick}
              selectedDocument={selectedDocument}
              resultsCount={searchResults.resultsCount}
              timeTaken={searchResults.timeTaken}
            />
          ) : (
            /* Document List View */
            <div className="flex-1 overflow-auto">{renderContent()}</div>
          )}
        </div>

        {/* Right Panel: Conditional - AI Features, Tools, or Intelligence */}
        <div className={`${showPreview ? 'w-[420px]' : 'w-80'} border-l border-white/10 glass-panel flex flex-col overflow-hidden transition-all duration-300`}>
          {showPreview && selectedDocument ? (
            /* Preview is open - Show 3 tabs */
            <>
              {/* Tab Header */}
              <div className="p-3 border-b border-white/10">
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                  <button
                    onClick={() => setRightPanelTab('ai')}
                    className={`flex-1 px-2 py-2 rounded text-xs font-medium transition-all ${
                      rightPanelTab === 'ai' ? 'bg-white/20 text-white' : 'text-white/60'
                    }`}
                  >
                    🤖 AI
                  </button>
                  <button
                    onClick={() => setRightPanelTab('intelligence')}
                    className={`flex-1 px-2 py-2 rounded text-xs font-medium transition-all ${
                      rightPanelTab === 'intelligence' ? 'bg-white/20 text-white' : 'text-white/60'
                    }`}
                  >
                    📊 Intelligence
                  </button>
                  <button
                    onClick={() => setRightPanelTab('tools')}
                    className={`flex-1 px-2 py-2 rounded text-xs font-medium transition-all ${
                      rightPanelTab === 'tools' ? 'bg-white/20 text-white' : 'text-white/60'
                    }`}
                  >
                    🛠️ Tools
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              {rightPanelTab === 'tools' ? (
                /* Document Tools Panel */
                <div className="flex-1 overflow-y-auto">
                  {documentTools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => handleToolSelect(tool.id)}
                      className={`w-full flex items-center gap-3 px-6 py-4 border-b border-white/5 transition-all ${
                        selectedTool === tool.id
                          ? 'bg-indigo-500/20 text-white'
                          : 'text-white/80'
                      }`}
                    >
                      <span className="text-xl">{tool.icon}</span>
                      <span className="text-sm font-medium">{tool.label}</span>
                    </button>
                  ))}
                </div>
              ) : rightPanelTab === 'intelligence' ? (
                /* Document Intelligence Panel */
                <DocumentIntelligencePanel document={selectedDocument} />
              ) : (
                /* AI Features Panel */
                <DocumentAIFeaturesPanel
                  document={selectedDocument}
                  onNavigateToWorkspace={handleNavigateToWorkspace}
                />
              )}
            </>
          ) : selectedDocument ? (
            /* Document Intelligence Panel (when document selected but preview closed) */
            <>
              <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">📊 Document Intelligence</h2>
                <p className="text-xs text-white/60 mt-1 truncate">{selectedDocument.name}</p>
              </div>
              <DocumentIntelligencePanel document={selectedDocument} />
            </>
          ) : (
            /* Empty state - No document selected */
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center text-white/40">
                <div className="text-4xl mb-3">👈</div>
                <div className="text-sm">Select a document to view details</div>
              </div>
            </div>
          )}
        </div>
      </div>
      ) : activePage === 'upload' ? (
        /* Document Upload Page */
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-8xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Document Upload</h2>
              <p className="text-white/70">Upload your documents to the library. Supports multiple file formats and batch uploads.</p>
            </div>
            <div className="glass-panel rounded-lg p-6">
              <EnhancedUploadInterface
                maxFileSize={50 * 1024 * 1024} // 50MB
                maxFiles={100}
                allowedFileTypes={['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'mp3']}
                className="w-full"
                onUploadComplete={handleUploadComplete}
              />
            </div>
          </div>
        </div>
      ) : activePage === 'folders' ? (
        /* Advanced Folder Manager Page */
        <FolderManager />

      ) : activePage === 'doctypes' ? (
        /* Advanced Document Type Manager Page */
        <DocTypeManager />

      ) : activePage === 'tags' ? (
        /* Tag Manager Page */
        <TagManager />

      ) : activePage === 'checkinout' ? (
        /* Check In/Out Manager Page */
        <CheckInOutManager />
      ) : (
        /* Metadata Manager Page */
        <MetadataManagerLive />
      )}
    </div>
  );
};

export default AdvancedDocumentLibraryV3;

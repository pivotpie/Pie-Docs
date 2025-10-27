import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  Document,
  DocumentFolder,
  DocumentFilter,
  SortCriteria,
  ViewMode
} from '@/types/domain/Document';
import type {
  UploadFileMetadata,
  UploadQueue
} from '@/types/domain/Upload';
import type {
  OCRJob,
  OCRResult,
  OCRQueue,
  OCRError,
  OCREditSession,
  OCRProcessingSettings
} from '@/types/domain/OCR';

interface DocumentsState {
  // Data
  documents: Document[];
  folders: DocumentFolder[];
  currentFolderId?: string;
  folderPath: DocumentFolder[];
  expandedFolders: string[]; // Track expanded state for tree view
  selectedFolderIds: string[]; // Track selected folders for bulk operations

  // UI State
  viewMode: ViewMode;
  selectedDocumentIds: string[];

  // Filtering and Sorting
  filters: Partial<DocumentFilter>;
  sortCriteria: SortCriteria[];
  searchQuery: string;

  // Pagination
  currentPage: number;
  totalCount: number;
  hasMore: boolean;

  // Loading States
  isLoading: boolean;
  isLoadingMore: boolean;
  isBulkActionLoading: boolean;

  // Error States
  error?: string;
  bulkActionError?: string;

  // Filter Panel
  filterPanelCollapsed: boolean;
  availableTypes: string[];
  availableTags: string[];
  availableAuthors: string[];

  // Performance
  lastFetchTimestamp?: number;
  cacheTimeout: number; // milliseconds

  // Upload State
  uploadQueue: UploadQueue;
  isUploadZoneVisible: boolean;

  // OCR State
  ocrQueue: OCRQueue;
  ocrResults: Record<string, OCRResult>; // documentId -> OCRResult
  ocrJobs: Record<string, OCRJob>; // jobId -> OCRJob
  ocrEditSessions: Record<string, OCREditSession>; // sessionId -> OCREditSession
  ocrProcessingSettings: OCRProcessingSettings;
}

const initialState: DocumentsState = {
  documents: [],
  folders: [],
  folderPath: [],
  expandedFolders: [],
  selectedFolderIds: [],
  viewMode: 'grid',
  selectedDocumentIds: [],
  filters: {
    types: [],
    status: [],
    tags: [],
    authors: [],
  },
  sortCriteria: [
    { field: 'dateModified', order: 'desc' }
  ],
  searchQuery: '',
  currentPage: 1,
  totalCount: 0,
  hasMore: false,
  isLoading: false,
  isLoadingMore: false,
  isBulkActionLoading: false,
  filterPanelCollapsed: false,
  availableTypes: [],
  availableTags: [],
  availableAuthors: [],
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  uploadQueue: {
    files: [],
    isUploading: false,
    totalFiles: 0,
    completedFiles: 0,
    failedFiles: 0,
    totalBytes: 0,
    uploadedBytes: 0,
    overallProgress: 0,
    concurrentUploads: 0,
    maxConcurrentUploads: 3,
  },
  isUploadZoneVisible: false,

  // OCR Initial State
  ocrQueue: {
    jobs: [],
    activeJobs: 0,
    maxConcurrentJobs: 2,
    totalProcessingTime: 0,
    averageProcessingTime: 0,
    isProcessing: false,
  },
  ocrResults: {},
  ocrJobs: {},
  ocrEditSessions: {},
  ocrProcessingSettings: {
    enableLanguageDetection: true,
    targetLanguages: ['ar', 'en'],
    qualityThreshold: 75,
    imagePreprocessing: {
      enhanceContrast: true,
      denoiseImage: true,
      deskewImage: true,
      resolutionDPI: 300,
    },
    textProcessing: {
      preserveFormatting: true,
      extractTables: true,
      extractHeaders: true,
      mergeFragments: true,
    },
  },
};

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    // View Mode
    setViewMode: (state, action: PayloadAction<ViewMode>) => {
      state.viewMode = action.payload;
    },

    // Document Selection
    selectDocument: (state, action: PayloadAction<{ id: string; selected: boolean }>) => {
      const { id, selected } = action.payload;
      if (selected && !state.selectedDocumentIds.includes(id)) {
        state.selectedDocumentIds.push(id);
      } else if (!selected) {
        state.selectedDocumentIds = state.selectedDocumentIds.filter(docId => docId !== id);
      }
    },

    selectAllDocuments: (state, action: PayloadAction<boolean>) => {
      if (action.payload) {
        state.selectedDocumentIds = state.documents.map(doc => doc.id);
      } else {
        state.selectedDocumentIds = [];
      }
    },

    clearSelection: (state) => {
      state.selectedDocumentIds = [];
    },

    // Filtering
    setFilters: (state, action: PayloadAction<Partial<DocumentFilter>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.currentPage = 1; // Reset pagination when filtering
    },

    clearFilters: (state) => {
      state.filters = {
        types: [],
        status: [],
        tags: [],
        authors: [],
      };
      state.currentPage = 1;
    },

    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      state.currentPage = 1; // Reset pagination when searching
    },

    toggleFilterPanel: (state) => {
      state.filterPanelCollapsed = !state.filterPanelCollapsed;
    },

    // Sorting
    setSortCriteria: (state, action: PayloadAction<SortCriteria[]>) => {
      state.sortCriteria = action.payload;
      state.currentPage = 1; // Reset pagination when sorting changes
    },

    addSortCriteria: (state, action: PayloadAction<SortCriteria>) => {
      const existing = state.sortCriteria.findIndex(s => s.field === action.payload.field);
      if (existing >= 0) {
        state.sortCriteria[existing] = action.payload;
      } else {
        state.sortCriteria.push(action.payload);
      }
      state.currentPage = 1;
    },

    removeSortCriteria: (state, action: PayloadAction<string>) => {
      state.sortCriteria = state.sortCriteria.filter(s => s.field !== action.payload);
      state.currentPage = 1;
    },

    // Navigation
    navigateToFolder: (state, action: PayloadAction<{ folderId?: string; folder?: DocumentFolder }>) => {
      const { folderId, folder } = action.payload;
      state.currentFolderId = folderId;
      state.selectedDocumentIds = [];
      state.selectedFolderIds = [];
      state.currentPage = 1;

      if (folder) {
        // Update folder path for breadcrumb navigation
        const existingIndex = state.folderPath.findIndex(f => f.id === folder.id);
        if (existingIndex >= 0) {
          // Navigate to existing folder in path, remove everything after it
          state.folderPath = state.folderPath.slice(0, existingIndex + 1);
        } else {
          // Add new folder to path
          state.folderPath.push(folder);
        }
      } else if (!folderId) {
        // Navigate to root
        state.folderPath = [];
      }
    },

    // Folder Management
    createFolder: (state, action: PayloadAction<DocumentFolder>) => {
      state.folders.push(action.payload);
      // Update parent folder's child folders if exists
      if (action.payload.parentId) {
        const parentFolder = state.folders.find(f => f.id === action.payload.parentId);
        if (parentFolder) {
          parentFolder.childFolders.push(action.payload.id);
        }
      }
    },

    updateFolder: (state, action: PayloadAction<{ folderId: string; updates: Partial<DocumentFolder> }>) => {
      const { folderId, updates } = action.payload;
      const folderIndex = state.folders.findIndex(f => f.id === folderId);
      if (folderIndex >= 0) {
        state.folders[folderIndex] = { ...state.folders[folderIndex], ...updates };

        // Update folder path if current folder is updated
        const pathIndex = state.folderPath.findIndex(f => f.id === folderId);
        if (pathIndex >= 0) {
          state.folderPath[pathIndex] = state.folders[folderIndex];
        }
      }
    },

    deleteFolder: (state, action: PayloadAction<string>) => {
      const folderId = action.payload;
      const folder = state.folders.find(f => f.id === folderId);

      if (folder) {
        // Remove from parent's child folders
        if (folder.parentId) {
          const parentFolder = state.folders.find(f => f.id === folder.parentId);
          if (parentFolder) {
            parentFolder.childFolders = parentFolder.childFolders.filter(id => id !== folderId);
          }
        }

        // Remove folder and all its children recursively
        const foldersToDelete = [folderId];
        let index = 0;
        while (index < foldersToDelete.length) {
          const currentFolderId = foldersToDelete[index];
          const childFolders = state.folders.filter(f => f.parentId === currentFolderId);
          foldersToDelete.push(...childFolders.map(f => f.id));
          index++;
        }

        state.folders = state.folders.filter(f => !foldersToDelete.includes(f.id));
        state.selectedFolderIds = state.selectedFolderIds.filter(id => !foldersToDelete.includes(id));

        // Navigate to parent if current folder is deleted
        if (foldersToDelete.includes(state.currentFolderId || '')) {
          if (folder.parentId) {
            state.currentFolderId = folder.parentId;
            state.folderPath = state.folderPath.slice(0, -1);
          } else {
            state.currentFolderId = undefined;
            state.folderPath = [];
          }
        }
      }
    },

    moveFolder: (state, action: PayloadAction<{ folderId: string; targetParentId?: string }>) => {
      const { folderId, targetParentId } = action.payload;
      const folder = state.folders.find(f => f.id === folderId);

      if (folder) {
        // Remove from old parent
        if (folder.parentId) {
          const oldParent = state.folders.find(f => f.id === folder.parentId);
          if (oldParent) {
            oldParent.childFolders = oldParent.childFolders.filter(id => id !== folderId);
          }
        }

        // Add to new parent
        if (targetParentId) {
          const newParent = state.folders.find(f => f.id === targetParentId);
          if (newParent) {
            newParent.childFolders.push(folderId);
            folder.parentId = targetParentId;
            folder.path = `${newParent.path}/${folder.name}`;
          }
        } else {
          folder.parentId = undefined;
          folder.path = `/${folder.name}`;
        }

        // Update folder path in breadcrumb if necessary
        const pathIndex = state.folderPath.findIndex(f => f.id === folderId);
        if (pathIndex >= 0) {
          state.folderPath[pathIndex] = folder;
        }
      }
    },

    // Folder Selection
    selectFolder: (state, action: PayloadAction<{ id: string; selected: boolean }>) => {
      const { id, selected } = action.payload;
      if (selected && !state.selectedFolderIds.includes(id)) {
        state.selectedFolderIds.push(id);
      } else if (!selected) {
        state.selectedFolderIds = state.selectedFolderIds.filter(folderId => folderId !== id);
      }
    },

    selectAllFolders: (state, action: PayloadAction<boolean>) => {
      if (action.payload) {
        state.selectedFolderIds = state.folders.map(folder => folder.id);
      } else {
        state.selectedFolderIds = [];
      }
    },

    clearFolderSelection: (state) => {
      state.selectedFolderIds = [];
    },

    // Folder Tree State
    toggleFolderExpanded: (state, action: PayloadAction<string>) => {
      const folderId = action.payload;
      const index = state.expandedFolders.indexOf(folderId);
      if (index >= 0) {
        state.expandedFolders.splice(index, 1);
      } else {
        state.expandedFolders.push(folderId);
      }
    },

    setFolderExpanded: (state, action: PayloadAction<{ folderId: string; expanded: boolean }>) => {
      const { folderId, expanded } = action.payload;
      const index = state.expandedFolders.indexOf(folderId);
      if (expanded && index < 0) {
        state.expandedFolders.push(folderId);
      } else if (!expanded && index >= 0) {
        state.expandedFolders.splice(index, 1);
      }
    },

    expandAllFolders: (state) => {
      state.folders.forEach(folder => {
        if (!state.expandedFolders.includes(folder.id)) {
          state.expandedFolders.push(folder.id);
        }
      });
    },

    collapseAllFolders: (state) => {
      state.expandedFolders.length = 0;
    },

    // Data Loading
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
      if (action.payload) {
        state.error = undefined;
      }
    },

    setLoadingMore: (state, action: PayloadAction<boolean>) => {
      state.isLoadingMore = action.payload;
    },

    setDocuments: (state, action: PayloadAction<{
      documents: Document[];
      folders: DocumentFolder[];
      totalCount: number;
      hasMore: boolean;
      append?: boolean;
    }>) => {
      const { documents, folders, totalCount, hasMore, append = false } = action.payload;

      if (append) {
        state.documents = [...state.documents, ...documents];
        state.folders = [...state.folders, ...folders];
      } else {
        state.documents = documents;
        state.folders = folders;
      }

      state.totalCount = totalCount;
      state.hasMore = hasMore;
      state.lastFetchTimestamp = Date.now();
      state.isLoading = false;
      state.isLoadingMore = false;
      state.error = undefined;
    },

    // Pagination
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },

    loadMoreDocuments: (state) => {
      if (state.hasMore && !state.isLoadingMore) {
        state.currentPage += 1;
        state.isLoadingMore = true;
      }
    },

    // Error Handling
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
      state.isLoadingMore = false;
    },

    clearError: (state) => {
      state.error = undefined;
    },

    // Bulk Actions
    setBulkActionLoading: (state, action: PayloadAction<boolean>) => {
      state.isBulkActionLoading = action.payload;
      if (action.payload) {
        state.bulkActionError = undefined;
      }
    },

    setBulkActionError: (state, action: PayloadAction<string>) => {
      state.bulkActionError = action.payload;
      state.isBulkActionLoading = false;
    },

    clearBulkActionError: (state) => {
      state.bulkActionError = undefined;
    },

    // Document Updates
    updateDocument: (state, action: PayloadAction<Document>) => {
      const index = state.documents.findIndex(doc => doc.id === action.payload.id);
      if (index >= 0) {
        state.documents[index] = action.payload;
      }
    },

    removeDocuments: (state, action: PayloadAction<string[]>) => {
      const idsToRemove = new Set(action.payload);

      // Remove documents
      state.documents = state.documents.filter(doc => !idsToRemove.has(doc.id));
      state.selectedDocumentIds = state.selectedDocumentIds.filter(id => !idsToRemove.has(id));
      state.totalCount = Math.max(0, state.totalCount - action.payload.length);

      // Clean up cross-references from all folders
      state.folders = state.folders.map(folder => {
        const hasReferences = folder.documentRefs.some(docId => idsToRemove.has(docId));
        if (hasReferences) {
          const updatedRefs = folder.documentRefs.filter(docId => !idsToRemove.has(docId));
          const removedCount = folder.documentRefs.length - updatedRefs.length;

          return {
            ...folder,
            documentRefs: updatedRefs,
            statistics: {
              ...folder.statistics,
              documentCount: Math.max(0, folder.statistics.documentCount - removedCount),
              lastActivity: new Date().toISOString()
            }
          };
        }
        return folder;
      });
    },

    // Cross-Reference Management
    addDocumentReference: (state, action: PayloadAction<{ documentId: string; folderId: string }>) => {
      const { documentId, folderId } = action.payload;
      const folder = state.folders.find(f => f.id === folderId);

      if (folder && !folder.documentRefs.includes(documentId)) {
        folder.documentRefs.push(documentId);
        folder.statistics.documentCount += 1;
        folder.statistics.lastActivity = new Date().toISOString();
      }
    },

    removeDocumentReference: (state, action: PayloadAction<{ documentId: string; folderId: string }>) => {
      const { documentId, folderId } = action.payload;
      const folder = state.folders.find(f => f.id === folderId);
      const document = state.documents.find(d => d.id === documentId);

      // Don't allow removing reference from primary folder
      if (folder && document && document.parentFolderId !== folderId) {
        folder.documentRefs = folder.documentRefs.filter(id => id !== documentId);
        folder.statistics.documentCount = Math.max(0, folder.statistics.documentCount - 1);
        folder.statistics.lastActivity = new Date().toISOString();
      }
    },

    bulkUpdateDocumentReferences: (state, action: PayloadAction<{
      documentId: string;
      folderIds: string[];
    }>) => {
      const { documentId, folderIds } = action.payload;
      const document = state.documents.find(d => d.id === documentId);

      if (!document) return;

      // Remove document from all folders except primary
      state.folders.forEach(folder => {
        if (folder.id !== document.parentFolderId && folder.documentRefs.includes(documentId)) {
          folder.documentRefs = folder.documentRefs.filter(id => id !== documentId);
          folder.statistics.documentCount = Math.max(0, folder.statistics.documentCount - 1);
          folder.statistics.lastActivity = new Date().toISOString();
        }
      });

      // Add document to specified folders
      folderIds.forEach(folderId => {
        if (folderId !== document.parentFolderId) {
          const folder = state.folders.find(f => f.id === folderId);
          if (folder && !folder.documentRefs.includes(documentId)) {
            folder.documentRefs.push(documentId);
            folder.statistics.documentCount += 1;
            folder.statistics.lastActivity = new Date().toISOString();
          }
        }
      });
    },

    // Filter Options
    setAvailableFilterOptions: (state, action: PayloadAction<{
      types?: string[];
      tags?: string[];
      authors?: string[];
    }>) => {
      const { types, tags, authors } = action.payload;
      if (types) state.availableTypes = types;
      if (tags) state.availableTags = tags;
      if (authors) state.availableAuthors = authors;
    },

    // Cache Management
    invalidateCache: (state) => {
      state.lastFetchTimestamp = undefined;
    },

    // Upload Management
    addFilesToQueue: (state, action: PayloadAction<UploadFileMetadata[]>) => {
      state.uploadQueue.files.push(...action.payload);
      state.uploadQueue.totalFiles = state.uploadQueue.files.length;
      state.uploadQueue.totalBytes = state.uploadQueue.files.reduce((sum, file) => sum + file.size, 0);
    },

    removeFileFromQueue: (state, action: PayloadAction<string>) => {
      state.uploadQueue.files = state.uploadQueue.files.filter(file => file.id !== action.payload);
      state.uploadQueue.totalFiles = state.uploadQueue.files.length;
      state.uploadQueue.totalBytes = state.uploadQueue.files.reduce((sum, file) => sum + file.size, 0);
    },

    updateFileProgress: (state, action: PayloadAction<{ fileId: string; progress: number; status?: UploadFileMetadata['status'] }>) => {
      const file = state.uploadQueue.files.find(f => f.id === action.payload.fileId);
      if (file) {
        file.progress = action.payload.progress;
        if (action.payload.status) {
          file.status = action.payload.status;
        }

        // Update overall progress
        const totalProgress = state.uploadQueue.files.reduce((sum, f) => sum + f.progress, 0);
        state.uploadQueue.overallProgress = state.uploadQueue.files.length > 0
          ? totalProgress / state.uploadQueue.files.length
          : 0;

        // Update counts
        state.uploadQueue.completedFiles = state.uploadQueue.files.filter(f => f.status === 'success').length;
        state.uploadQueue.failedFiles = state.uploadQueue.files.filter(f => f.status === 'error').length;
        state.uploadQueue.uploadedBytes = state.uploadQueue.files.reduce((sum, f) =>
          sum + (f.size * f.progress / 100), 0);
      }
    },

    updateFileMetadata: (state, action: PayloadAction<{ fileId: string; metadata: UploadFileMetadata['metadata'] }>) => {
      const file = state.uploadQueue.files.find(f => f.id === action.payload.fileId);
      if (file) {
        file.metadata = { ...file.metadata, ...action.payload.metadata };
      }
    },

    setUploadQueueStatus: (state, action: PayloadAction<boolean>) => {
      state.uploadQueue.isUploading = action.payload;
      state.uploadQueue.concurrentUploads = action.payload ? state.uploadQueue.concurrentUploads : 0;
    },

    setUploadZoneVisible: (state, action: PayloadAction<boolean>) => {
      state.isUploadZoneVisible = action.payload;
    },

    clearCompletedUploads: (state) => {
      state.uploadQueue.files = state.uploadQueue.files.filter(file =>
        file.status !== 'success' && file.status !== 'error'
      );
      state.uploadQueue.totalFiles = state.uploadQueue.files.length;
      state.uploadQueue.completedFiles = 0;
      state.uploadQueue.failedFiles = 0;
      state.uploadQueue.totalBytes = state.uploadQueue.files.reduce((sum, file) => sum + file.size, 0);
      state.uploadQueue.uploadedBytes = state.uploadQueue.files.reduce((sum, f) =>
        sum + (f.size * f.progress / 100), 0);
    },

    clearUploadQueue: (state) => {
      state.uploadQueue = {
        files: [],
        isUploading: false,
        totalFiles: 0,
        completedFiles: 0,
        failedFiles: 0,
        totalBytes: 0,
        uploadedBytes: 0,
        overallProgress: 0,
        concurrentUploads: 0,
        maxConcurrentUploads: 3,
      };
    },

    // OCR Actions
    startOCRJob: (state, action: PayloadAction<OCRJob>) => {
      const job = action.payload;
      state.ocrJobs[job.id] = job;
      state.ocrQueue.jobs.push(job);
      if (state.ocrQueue.activeJobs < state.ocrQueue.maxConcurrentJobs) {
        state.ocrQueue.activeJobs += 1;
        state.ocrQueue.isProcessing = true;
      }
    },

    updateOCRJob: (state, action: PayloadAction<{ jobId: string; updates: Partial<OCRJob> }>) => {
      const { jobId, updates } = action.payload;
      const job = state.ocrJobs[jobId];
      if (job) {
        Object.assign(job, updates);

        // Update queue item
        const queueIndex = state.ocrQueue.jobs.findIndex(j => j.id === jobId);
        if (queueIndex >= 0) {
          state.ocrQueue.jobs[queueIndex] = job;
        }
      }
    },

    completeOCRJob: (state, action: PayloadAction<{ jobId: string; result: OCRResult }>) => {
      const { jobId, result } = action.payload;
      const job = state.ocrJobs[jobId];

      if (job) {
        job.status = 'completed';
        job.progress = 100;
        job.endTime = new Date().toISOString();

        // Store result
        state.ocrResults[result.documentId] = result;

        // Update processing time
        const processingTime = result.processingTime;
        state.ocrQueue.totalProcessingTime += processingTime;
        const completedJobs = Object.values(state.ocrJobs).filter(j => j.status === 'completed').length;
        state.ocrQueue.averageProcessingTime = state.ocrQueue.totalProcessingTime / completedJobs;

        // Decrease active jobs
        state.ocrQueue.activeJobs = Math.max(0, state.ocrQueue.activeJobs - 1);

        // Check if processing is complete
        if (state.ocrQueue.activeJobs === 0 && !state.ocrQueue.jobs.some(j => j.status === 'pending')) {
          state.ocrQueue.isProcessing = false;
        }
      }
    },

    failOCRJob: (state, action: PayloadAction<{ jobId: string; error: OCRError }>) => {
      const { jobId, error } = action.payload;
      const job = state.ocrJobs[jobId];

      if (job) {
        job.status = 'failed';
        job.error = error;
        job.endTime = new Date().toISOString();

        // Decrease active jobs
        state.ocrQueue.activeJobs = Math.max(0, state.ocrQueue.activeJobs - 1);

        // Check if processing is complete
        if (state.ocrQueue.activeJobs === 0 && !state.ocrQueue.jobs.some(j => j.status === 'pending')) {
          state.ocrQueue.isProcessing = false;
        }
      }
    },

    retryOCRJob: (state, action: PayloadAction<{ jobId: string; newSettings?: Partial<OCRProcessingSettings> }>) => {
      const { jobId, newSettings } = action.payload;
      const job = state.ocrJobs[jobId];

      if (job && job.retryCount < job.maxRetries) {
        job.status = 'retrying';
        job.retryCount += 1;
        job.progress = 0;
        job.error = undefined;
        job.startTime = new Date().toISOString();
        job.endTime = undefined;

        if (newSettings) {
          job.processingSettings = { ...job.processingSettings, ...newSettings };
        }

        // Add back to processing if slots available
        if (state.ocrQueue.activeJobs < state.ocrQueue.maxConcurrentJobs) {
          state.ocrQueue.activeJobs += 1;
          state.ocrQueue.isProcessing = true;
        }
      }
    },

    removeOCRJob: (state, action: PayloadAction<string>) => {
      const jobId = action.payload;
      const job = state.ocrJobs[jobId];

      if (job) {
        // Remove from jobs
        delete state.ocrJobs[jobId];

        // Remove from queue
        state.ocrQueue.jobs = state.ocrQueue.jobs.filter(j => j.id !== jobId);

        // Adjust active jobs if it was active
        if (job.status === 'processing' || job.status === 'retrying') {
          state.ocrQueue.activeJobs = Math.max(0, state.ocrQueue.activeJobs - 1);
        }

        // Check if processing is complete
        if (state.ocrQueue.activeJobs === 0 && !state.ocrQueue.jobs.some(j => j.status === 'pending')) {
          state.ocrQueue.isProcessing = false;
        }
      }
    },

    updateOCRProcessingSettings: (state, action: PayloadAction<Partial<OCRProcessingSettings>>) => {
      state.ocrProcessingSettings = { ...state.ocrProcessingSettings, ...action.payload };
    },

    clearOCRQueue: (state) => {
      state.ocrQueue = {
        jobs: [],
        activeJobs: 0,
        maxConcurrentJobs: 2,
        totalProcessingTime: 0,
        averageProcessingTime: 0,
        isProcessing: false,
      };
      state.ocrJobs = {};
    },

    // OCR Edit Session Management
    startOCREditSession: (state, action: PayloadAction<OCREditSession>) => {
      const session = action.payload;
      state.ocrEditSessions[session.id] = session;
    },

    updateOCREditSession: (state, action: PayloadAction<{ sessionId: string; updates: Partial<OCREditSession> }>) => {
      const { sessionId, updates } = action.payload;
      const session = state.ocrEditSessions[sessionId];
      if (session) {
        Object.assign(session, updates);
        session.dateLastModified = new Date().toISOString();
      }
    },

    completeOCREditSession: (state, action: PayloadAction<{ sessionId: string; finalText: string }>) => {
      const { sessionId, finalText } = action.payload;
      const session = state.ocrEditSessions[sessionId];
      if (session) {
        session.editedText = finalText;
        session.isCompleted = true;
        session.dateLastModified = new Date().toISOString();

        // Update the OCR result if it exists
        const ocrResult = state.ocrResults[session.ocrResultId];
        if (ocrResult) {
          ocrResult.extractedText = finalText;
        }
      }
    },

    removeOCREditSession: (state, action: PayloadAction<string>) => {
      const sessionId = action.payload;
      delete state.ocrEditSessions[sessionId];
    },
  },
});

export const {
  setViewMode,
  selectDocument,
  selectAllDocuments,
  clearSelection,
  setFilters,
  clearFilters,
  setSearchQuery,
  toggleFilterPanel,
  setSortCriteria,
  addSortCriteria,
  removeSortCriteria,
  navigateToFolder,
  // Folder Management
  createFolder,
  updateFolder,
  deleteFolder,
  moveFolder,
  selectFolder,
  selectAllFolders,
  clearFolderSelection,
  toggleFolderExpanded,
  setFolderExpanded,
  expandAllFolders,
  collapseAllFolders,
  setLoading,
  setLoadingMore,
  setDocuments,
  setCurrentPage,
  loadMoreDocuments,
  setError,
  clearError,
  setBulkActionLoading,
  setBulkActionError,
  clearBulkActionError,
  updateDocument,
  removeDocuments,
  // Cross-Reference Management
  addDocumentReference,
  removeDocumentReference,
  bulkUpdateDocumentReferences,
  setAvailableFilterOptions,
  invalidateCache,
  addFilesToQueue,
  removeFileFromQueue,
  updateFileProgress,
  updateFileMetadata,
  setUploadQueueStatus,
  setUploadZoneVisible,
  clearCompletedUploads,
  clearUploadQueue,
  // OCR Actions
  startOCRJob,
  updateOCRJob,
  completeOCRJob,
  failOCRJob,
  retryOCRJob,
  removeOCRJob,
  updateOCRProcessingSettings,
  clearOCRQueue,
  startOCREditSession,
  updateOCREditSession,
  completeOCREditSession,
  removeOCREditSession,
} = documentsSlice.actions;

// Selectors
export const selectDocuments = (state: { documents: DocumentsState }) => state.documents.documents;
export const selectFolders = (state: { documents: DocumentsState }) => state.documents.folders;
export const selectCurrentFolder = (state: { documents: DocumentsState }) => {
  if (!state.documents.currentFolderId) return null;
  return state.documents.folders.find(f => f.id === state.documents.currentFolderId) || null;
};
export const selectFolderPath = (state: { documents: DocumentsState }) => state.documents.folderPath;
export const selectSelectedFolderIds = (state: { documents: DocumentsState }) => state.documents.selectedFolderIds;
export const selectSelectedFolders = (state: { documents: DocumentsState }) => {
  const selectedIds = new Set(state.documents.selectedFolderIds);
  return state.documents.folders.filter(folder => selectedIds.has(folder.id));
};
export const selectExpandedFolders = (state: { documents: DocumentsState }) => state.documents.expandedFolders;
export const selectFolderById = (folderId: string) => (state: { documents: DocumentsState }) =>
  state.documents.folders.find(f => f.id === folderId);
export const selectChildFolders = (parentId?: string) => (state: { documents: DocumentsState }) =>
  state.documents.folders.filter(f => f.parentId === parentId);
export const selectRootFolders = (state: { documents: DocumentsState }) =>
  state.documents.folders.filter(f => !f.parentId);
export const selectSmartFolders = (state: { documents: DocumentsState }) =>
  state.documents.folders.filter(f => f.type === 'smart');
export const selectFolderHierarchy = (state: { documents: DocumentsState }) => {
  const folders = state.documents.folders;
  const rootFolders = folders.filter(f => !f.parentId);

  const buildHierarchy = (folder: DocumentFolder): DocumentFolder & { children: DocumentFolder[] } => ({
    ...folder,
    children: folders
      .filter(f => f.parentId === folder.id)
      .map(buildHierarchy)
      .sort((a, b) => a.name.localeCompare(b.name))
  });

  return rootFolders
    .map(buildHierarchy)
    .sort((a, b) => a.name.localeCompare(b.name));
};

// Cross-Reference Selectors
export const selectDocumentFolders = (documentId: string) => (state: { documents: DocumentsState }) => {
  const document = state.documents.documents.find(d => d.id === documentId);
  if (!document) return [];

  return state.documents.folders.filter(folder =>
    folder.id === document.parentFolderId || folder.documentRefs.includes(documentId)
  );
};

export const selectDocumentPrimaryFolder = (documentId: string) => (state: { documents: DocumentsState }) => {
  const document = state.documents.documents.find(d => d.id === documentId);
  if (!document || !document.parentFolderId) return null;

  return state.documents.folders.find(f => f.id === document.parentFolderId) || null;
};

export const selectDocumentLinkedFolders = (documentId: string) => (state: { documents: DocumentsState }) => {
  const document = state.documents.documents.find(d => d.id === documentId);
  if (!document) return [];

  return state.documents.folders.filter(folder =>
    folder.id !== document.parentFolderId && folder.documentRefs.includes(documentId)
  );
};

export const selectFolderDocuments = (folderId: string, includeReferences = true) => (state: { documents: DocumentsState }) => {
  const folder = state.documents.folders.find(f => f.id === folderId);
  if (!folder) return [];

  const directDocuments = state.documents.documents.filter(doc => doc.parentFolderId === folderId);

  if (!includeReferences) {
    return directDocuments;
  }

  const referencedDocuments = state.documents.documents.filter(doc =>
    folder.documentRefs.includes(doc.id) && doc.parentFolderId !== folderId
  );

  return [...directDocuments, ...referencedDocuments];
};

export const selectViewMode = (state: { documents: DocumentsState }) => state.documents.viewMode;
export const selectSelectedDocuments = (state: { documents: DocumentsState }) => {
  const selectedIds = new Set(state.documents.selectedDocumentIds);
  return state.documents.documents.filter(doc => selectedIds.has(doc.id));
};
export const selectSelectedDocumentIds = (state: { documents: DocumentsState }) => state.documents.selectedDocumentIds;
export const selectFilters = (state: { documents: DocumentsState }) => state.documents.filters;
export const selectSortCriteria = (state: { documents: DocumentsState }) => state.documents.sortCriteria;
export const selectSearchQuery = (state: { documents: DocumentsState }) => state.documents.searchQuery;
export const selectDocumentsLoading = (state: { documents: DocumentsState }) => state.documents.isLoading;
export const selectDocumentsError = (state: { documents: DocumentsState }) => state.documents.error;
export const selectHasMore = (state: { documents: DocumentsState }) => state.documents.hasMore;
export const selectFilterPanelCollapsed = (state: { documents: DocumentsState }) => state.documents.filterPanelCollapsed;
export const selectAvailableFilterOptions = (state: { documents: DocumentsState }) => ({
  types: state.documents.availableTypes,
  tags: state.documents.availableTags,
  authors: state.documents.availableAuthors,
});

// Upload Selectors
export const selectUploadQueue = (state: { documents: DocumentsState }) => state.documents.uploadQueue;
export const selectUploadFiles = (state: { documents: DocumentsState }) => state.documents.uploadQueue.files;
export const selectIsUploading = (state: { documents: DocumentsState }) => state.documents.uploadQueue.isUploading;
export const selectUploadProgress = (state: { documents: DocumentsState }) => state.documents.uploadQueue.overallProgress;
export const selectIsUploadZoneVisible = (state: { documents: DocumentsState }) => state.documents.isUploadZoneVisible;
export const selectUploadStats = (state: { documents: DocumentsState }) => ({
  totalFiles: state.documents.uploadQueue.totalFiles,
  completedFiles: state.documents.uploadQueue.completedFiles,
  failedFiles: state.documents.uploadQueue.failedFiles,
  totalBytes: state.documents.uploadQueue.totalBytes,
  uploadedBytes: state.documents.uploadQueue.uploadedBytes,
  overallProgress: state.documents.uploadQueue.overallProgress,
});

// OCR Selectors
export const selectOCRQueue = (state: { documents: DocumentsState }) => state.documents.ocrQueue;
export const selectOCRJobs = (state: { documents: DocumentsState }) => state.documents.ocrJobs;
export const selectOCRJobsArray = (state: { documents: DocumentsState }) => Object.values(state.documents.ocrJobs);
export const selectOCRJobById = (jobId: string) => (state: { documents: DocumentsState }) => state.documents.ocrJobs[jobId];
export const selectOCRResults = (state: { documents: DocumentsState }) => state.documents.ocrResults;
export const selectOCRResultByDocumentId = (documentId: string) => (state: { documents: DocumentsState }) =>
  state.documents.ocrResults[documentId];
export const selectOCREditSessions = (state: { documents: DocumentsState }) => state.documents.ocrEditSessions;
export const selectOCREditSession = (sessionId: string) => (state: { documents: DocumentsState }) =>
  state.documents.ocrEditSessions[sessionId];
export const selectOCRProcessingSettings = (state: { documents: DocumentsState }) => state.documents.ocrProcessingSettings;
export const selectIsOCRProcessing = (state: { documents: DocumentsState }) => state.documents.ocrQueue.isProcessing;
export const selectOCRActiveJobs = (state: { documents: DocumentsState }) => state.documents.ocrQueue.activeJobs;
export const selectOCRAverageProcessingTime = (state: { documents: DocumentsState }) => state.documents.ocrQueue.averageProcessingTime;

export default documentsSlice.reducer;
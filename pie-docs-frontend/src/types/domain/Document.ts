export type DocumentStatus = 'draft' | 'published' | 'archived' | 'processing' | 'failed';
export type DocumentType = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'txt' | 'md' | 'html' | 'image' | 'video' | 'audio' | 'other';
export type ViewMode = 'grid' | 'list' | 'tree';
export type SortField = 'name' | 'dateModified' | 'dateCreated' | 'size' | 'relevance' | 'type';
export type SortOrder = 'asc' | 'desc';

export interface DocumentMetadata {
  tags: string[];
  author: string;
  version: number;
  description?: string;
  language?: string;
  keywords?: string[];
  customFields?: Record<string, unknown>;
}

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  size: number; // in bytes
  dateCreated: string; // ISO string
  dateModified: string; // ISO string
  dateAccessed?: string; // ISO string
  path: string; // folder path
  thumbnail?: string; // URL or base64
  downloadUrl: string;
  previewUrl?: string;
  metadata: DocumentMetadata;
  parentFolderId?: string;
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
}

export type FolderType = 'regular' | 'smart';

export interface SmartFolderCriteria {
  documentTypes?: DocumentType[];
  tags?: string[];
  authors?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
  status?: DocumentStatus[];
  contentKeywords?: string[];
}

export interface DocumentFolder {
  id: string;
  name: string;
  description?: string;
  path: string;
  type: FolderType;
  parentId?: string;
  childFolders: string[]; // folder IDs
  documentCount: number;
  totalSize: number; // in bytes
  dateCreated: string;
  dateModified: string;
  color?: string; // folder color for visual organization
  icon?: string; // custom folder icon

  // Smart folder specific properties
  smartCriteria?: SmartFolderCriteria;
  autoRefresh?: boolean;
  lastRefreshed?: string;

  // Cross-reference support
  documentRefs: string[]; // document IDs that reference this folder

  permissions: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canCreateChild: boolean;
    canManagePermissions: boolean;
    inheritPermissions: boolean;
  };

  // Folder statistics
  statistics: {
    documentCount: number;
    totalSize: number;
    averageFileSize: number;
    lastActivity: string;
    fileTypeDistribution: Record<DocumentType, number>;
  };
}

export interface DocumentFilter {
  types: DocumentType[];
  status: DocumentStatus[];
  dateRange?: {
    start: string;
    end: string;
  };
  tags: string[];
  authors: string[];
  sizeRange?: {
    min: number; // bytes
    max: number; // bytes
  };
  searchQuery?: string;
  customFilters?: Record<string, unknown>;
}

export interface SortCriteria {
  field: SortField;
  order: SortOrder;
}

export interface DocumentQueryParams {
  page?: number;
  limit?: number;
  folderId?: string;
  filters?: Partial<DocumentFilter>;
  sort?: SortCriteria[];
  searchQuery?: string;
}

export interface DocumentQueryResponse {
  documents: Document[];
  folders: DocumentFolder[];
  cabinets?: Cabinet[];
  totalCount: number;
  hasMore: boolean;
  nextPage?: number;
}

// Cabinet types for Mayan EDMS integration
export interface Cabinet {
  id: string;
  label: string;
  created: string;
  edited: string;
  documentCount?: number;
  documents?: Document[];
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canAddDocuments: boolean;
    canRemoveDocuments: boolean;
  };
}

export interface CabinetQueryParams {
  page?: number;
  page_size?: number;
  _ordering?: string;
}

export interface CabinetQueryResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Cabinet[];
}

export interface BulkAction {
  type: 'download' | 'delete' | 'move' | 'copy' | 'tag' | 'changeStatus';
  documentIds: string[];
  targetFolderId?: string;
  tags?: string[];
  status?: DocumentStatus;
}

export interface FolderAction {
  type: 'create' | 'rename' | 'delete' | 'move' | 'copy' | 'changePermissions';
  folderId?: string;
  name?: string;
  parentId?: string;
  targetParentId?: string;
  permissions?: Partial<DocumentFolder['permissions']>;
}

export interface BulkFolderAction {
  type: 'move' | 'copy' | 'delete' | 'changePermissions';
  folderIds: string[];
  targetParentId?: string;
  permissions?: Partial<DocumentFolder['permissions']>;
  preserveStructure?: boolean;
}

export interface FolderCreationRequest {
  name: string;
  description?: string;
  parentId?: string;
  type: FolderType;
  color?: string;
  icon?: string;
  smartCriteria?: SmartFolderCriteria;
  autoRefresh?: boolean;
  permissions?: Partial<DocumentFolder['permissions']>;
}

// Utility types for component props
export interface DocumentListProps {
  documents: Document[];
  folders: DocumentFolder[];
  loading?: boolean;
  error?: string;
  selectedIds: string[];
  onDocumentSelect: (id: string, selected: boolean) => void;
  onDocumentOpen: (document: Document) => void;
  onDocumentAction: (action: string, document: Document) => void;
  onFolderOpen: (folder: DocumentFolder) => void;
}

export interface ViewModeToggleProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  disabled?: boolean;
}

export interface FilterPanelProps {
  filters: Partial<DocumentFilter>;
  onFiltersChange: (filters: Partial<DocumentFilter>) => void;
  availableTypes: DocumentType[];
  availableTags: string[];
  availableAuthors: string[];
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}
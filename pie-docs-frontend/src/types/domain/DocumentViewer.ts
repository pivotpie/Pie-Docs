export type ZoomMode = 'fit-width' | 'fit-page' | 'custom';

export interface ZoomState {
  level: number; // percentage (e.g., 100 for 100%)
  mode: ZoomMode;
}

export interface ViewerState {
  currentDocument: string | null;
  currentPage: number;
  totalPages: number;
  zoom: ZoomState;
  isFullScreen: boolean;
  sidebarVisible: boolean;
  loading: boolean;
  error: string | null;
}

export interface AnnotationBase {
  id: string;
  type: 'comment' | 'highlight' | 'rectangle' | 'circle' | 'arrow';
  page: number;
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  author: string;
  timestamp: string;
  color?: string;
}

export interface CommentAnnotation extends AnnotationBase {
  type: 'comment';
  content: string;
  replies?: CommentAnnotation[];
}

export interface HighlightAnnotation extends AnnotationBase {
  type: 'highlight';
  text: string;
  color: string;
}

export interface ShapeAnnotation extends AnnotationBase {
  type: 'rectangle' | 'circle' | 'arrow';
  strokeColor: string;
  fillColor?: string;
  strokeWidth: number;
}

export type Annotation = CommentAnnotation | HighlightAnnotation | ShapeAnnotation;

export interface DocumentViewerProps {
  documentId: string;
  document?: {
    id: string;
    name: string;
    type: string;
    downloadUrl: string;
    previewUrl?: string;
    metadata: Record<string, any>;
  };
  onClose?: () => void;
  onDocumentChange?: (documentId: string) => void;
  className?: string;
}

export interface ZoomControlsProps {
  zoom: ZoomState;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomToFitWidth: () => void;
  onZoomToFitPage: () => void;
  onZoomChange: (level: number) => void;
  disabled?: boolean;
}

export interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  disabled?: boolean;
}

export interface AnnotationToolbarProps {
  selectedTool: string | null;
  onToolSelect: (tool: string) => void;
  annotations: Annotation[];
  onAnnotationAdd: (annotation: Omit<Annotation, 'id' | 'timestamp'>) => void;
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
  onAnnotationDelete: (id: string) => void;
  disabled?: boolean;
}

export interface MetadataPanelProps {
  document: {
    id: string;
    name: string;
    metadata: Record<string, any>;
  };
  visible: boolean;
  onToggle: () => void;
  onMetadataUpdate: (metadata: Record<string, any>) => void;
  onBulkEdit?: boolean;
  disabled?: boolean;
}

export interface ViewerFormat {
  type: string;
  mimeTypes: string[];
  extensions: string[];
  component: React.ComponentType<any>;
  supports: {
    zoom: boolean;
    pagination: boolean;
    annotations: boolean;
    fullScreen: boolean;
  };
}

export interface LoadingState {
  isLoading: boolean;
  progress?: number;
  message?: string;
}

export interface ViewerError {
  code: 'LOAD_FAILED' | 'UNSUPPORTED_FORMAT' | 'NETWORK_ERROR' | 'PERMISSION_DENIED';
  message: string;
  details?: any;
}
/**
 * Dashboard Builder Types
 * For the custom dashboard creation and management system
 */

export type WidgetSize = 'small' | 'medium' | 'large' | 'wide';

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  position: WidgetPosition;
  config: Record<string, any>;
  data?: any;
  refreshInterval?: number;
  isVisible: boolean;
  permissions?: string[];
}

export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  isTemplate: boolean;
  isPublic: boolean;
  owner: string;
  widgets: DashboardWidget[];
  gridProps: {
    cols: number;
    rowHeight: number;
    margin: [number, number];
    containerPadding: [number, number];
  };
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  icon: string;
  defaultSize: WidgetSize;
  defaultConfig: Record<string, any>;
  configSchema: WidgetConfigSchema;
  permissions?: string[];
  previewComponent?: React.ComponentType<any>;
  isCustom: boolean;
}

export interface WidgetConfigSchema {
  type: 'object';
  properties: Record<string, ConfigProperty>;
  required?: string[];
}

export interface ConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'select' | 'multiselect';
  title: string;
  description?: string;
  default?: any;
  options?: Array<{ value: any; label: string }>;
  minimum?: number;
  maximum?: number;
  items?: ConfigProperty;
  properties?: Record<string, ConfigProperty>;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'personal' | 'analytics' | 'monitoring' | 'custom';
  thumbnail?: string;
  layout: Omit<DashboardLayout, 'id' | 'owner' | 'createdAt' | 'updatedAt'>;
  tags: string[];
  popularity: number;
  isOfficial: boolean;
  author?: string;
}

export interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'database' | 'file' | 'mock';
  config: {
    url?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    params?: Record<string, any>;
    refreshInterval?: number;
    cacheTimeout?: number;
  };
  schema?: {
    fields: Array<{
      name: string;
      type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
      description?: string;
    }>;
  };
  isActive: boolean;
  lastUpdated?: Date;
}

export interface DashboardBuilderState {
  // Current editing state
  currentDashboard: DashboardLayout | null;
  isDirty: boolean;
  isEditing: boolean;

  // Widget management
  availableWidgets: WidgetTemplate[];
  selectedWidget: string | null;
  draggedWidget: WidgetTemplate | null;

  // Layout management
  gridLayout: any[]; // react-grid-layout items
  breakpoint: 'lg' | 'md' | 'sm' | 'xs' | 'xxs';

  // Templates and presets
  templates: DashboardTemplate[];
  userDashboards: DashboardLayout[];

  // Data sources
  dataSources: DataSource[];
  selectedDataSource: string | null;

  // UI state
  sidebarOpen: boolean;
  previewMode: boolean;
  showGrid: boolean;
  snapToGrid: boolean;

  // Loading and error states
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

export interface WidgetConfigPanelProps {
  widget: DashboardWidget;
  template: WidgetTemplate;
  onConfigChange: (config: Record<string, any>) => void;
  onClose: () => void;
}

export interface DashboardBuilderToolbarProps {
  dashboard: DashboardLayout;
  onSave: () => void;
  onPreview: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
}

export interface WidgetLibraryProps {
  widgets: WidgetTemplate[];
  onWidgetDrag: (widget: WidgetTemplate) => void;
  onWidgetSelect: (widget: WidgetTemplate) => void;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
}

export interface DashboardTemplateGridProps {
  templates: DashboardTemplate[];
  onTemplateSelect: (template: DashboardTemplate) => void;
  selectedTemplate?: string;
  showCategories?: boolean;
}

export interface DashboardExportOptions {
  format: 'json' | 'pdf' | 'image';
  includeData: boolean;
  resolution?: 'low' | 'medium' | 'high';
  paperSize?: 'a4' | 'letter' | 'legal';
  orientation?: 'portrait' | 'landscape';
}

export interface DashboardImportOptions {
  replaceExisting: boolean;
  preserveIds: boolean;
  updateDataSources: boolean;
}

// Events and Actions
export type DashboardBuilderAction =
  | { type: 'SET_DASHBOARD'; payload: DashboardLayout }
  | { type: 'ADD_WIDGET'; payload: { widget: WidgetTemplate; position: WidgetPosition } }
  | { type: 'UPDATE_WIDGET'; payload: { id: string; updates: Partial<DashboardWidget> } }
  | { type: 'REMOVE_WIDGET'; payload: string }
  | { type: 'UPDATE_LAYOUT'; payload: any[] }
  | { type: 'SET_EDITING'; payload: boolean }
  | { type: 'SET_PREVIEW'; payload: boolean }
  | { type: 'SET_SELECTED_WIDGET'; payload: string | null }
  | { type: 'SET_SIDEBAR_OPEN'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SAVE_SUCCESS'; payload: DashboardLayout }
  | { type: 'LOAD_TEMPLATES'; payload: DashboardTemplate[] }
  | { type: 'LOAD_WIDGETS'; payload: WidgetTemplate[] };

export interface DashboardEvent {
  type: 'widget_added' | 'widget_removed' | 'widget_updated' | 'layout_changed' | 'dashboard_saved';
  timestamp: Date;
  data: any;
}

// Validation
export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
}

export interface DashboardValidationOptions {
  checkDataSources: boolean;
  validatePermissions: boolean;
  checkDependencies: boolean;
}
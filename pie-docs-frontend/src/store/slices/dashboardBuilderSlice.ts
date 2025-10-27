import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// Local type definitions to avoid import issues
type WidgetSize = 'small' | 'medium' | 'large' | 'wide';

interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DashboardWidget {
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

interface DashboardLayout {
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

interface ConfigProperty {
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

interface WidgetConfigSchema {
  type: 'object';
  properties: Record<string, ConfigProperty>;
  required?: string[];
}

interface WidgetTemplate {
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

interface DashboardTemplate {
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

interface DataSource {
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

// Dashboard Builder State interface
interface DashboardBuilderState {
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

// Initial state
const initialState: DashboardBuilderState = {
  currentDashboard: null,
  isDirty: false,
  isEditing: false,
  availableWidgets: [],
  selectedWidget: null,
  draggedWidget: null,
  gridLayout: [],
  breakpoint: 'lg',
  templates: [],
  userDashboards: [],
  dataSources: [],
  selectedDataSource: null,
  sidebarOpen: true,
  previewMode: false,
  showGrid: true,
  snapToGrid: true,
  isLoading: false,
  isSaving: false,
  error: null
};

// Mock widget templates
const mockWidgetTemplates: WidgetTemplate[] = [
  {
    id: 'document-statistics',
    name: 'Document Statistics',
    description: 'Overview of document counts and processing status',
    type: 'statistics',
    category: 'analytics',
    icon: '📊',
    defaultSize: 'medium',
    defaultConfig: {
      showTrends: true,
      refreshInterval: 300000,
      metrics: ['total', 'processing', 'completed']
    },
    configSchema: {
      type: 'object',
      properties: {
        showTrends: {
          type: 'boolean',
          title: 'Show Trends',
          description: 'Display trend indicators for metrics',
          default: true
        },
        refreshInterval: {
          type: 'number',
          title: 'Refresh Interval (ms)',
          description: 'How often to refresh data',
          default: 300000,
          minimum: 30000,
          maximum: 3600000
        },
        metrics: {
          type: 'multiselect',
          title: 'Metrics to Display',
          description: 'Select which metrics to show',
          options: [
            { value: 'total', label: 'Total Documents' },
            { value: 'processing', label: 'Processing' },
            { value: 'completed', label: 'Completed' },
            { value: 'pending', label: 'Pending' },
            { value: 'error', label: 'Errors' }
          ],
          default: ['total', 'processing', 'completed']
        }
      },
      required: ['metrics']
    },
    isCustom: false
  },
  {
    id: 'recent-activity',
    name: 'Recent Activity',
    description: 'Timeline of recent system activities',
    type: 'activity-feed',
    category: 'monitoring',
    icon: '🔄',
    defaultSize: 'large',
    defaultConfig: {
      maxItems: 10,
      showTimestamps: true,
      filterTypes: ['upload', 'ocr', 'workflow', 'search']
    },
    configSchema: {
      type: 'object',
      properties: {
        maxItems: {
          type: 'number',
          title: 'Maximum Items',
          description: 'Number of activities to display',
          default: 10,
          minimum: 5,
          maximum: 50
        },
        showTimestamps: {
          type: 'boolean',
          title: 'Show Timestamps',
          description: 'Display when activities occurred',
          default: true
        },
        filterTypes: {
          type: 'multiselect',
          title: 'Activity Types',
          description: 'Types of activities to show',
          options: [
            { value: 'upload', label: 'Document Uploads' },
            { value: 'ocr', label: 'OCR Processing' },
            { value: 'workflow', label: 'Workflow Events' },
            { value: 'search', label: 'Search Updates' },
            { value: 'user', label: 'User Actions' }
          ],
          default: ['upload', 'ocr', 'workflow', 'search']
        }
      }
    },
    isCustom: false
  }
];

// Mock dashboard templates
const mockDashboardTemplates: DashboardTemplate[] = [
  {
    id: 'executive-overview',
    name: 'Executive Overview',
    description: 'High-level metrics and KPIs for executives',
    category: 'business',
    layout: {
      name: 'Executive Overview',
      description: 'Executive dashboard template',
      isTemplate: true,
      isPublic: true,
      widgets: [],
      gridProps: {
        cols: 12,
        rowHeight: 60,
        margin: [16, 16],
        containerPadding: [16, 16]
      },
      tags: ['executive', 'kpi'],
      version: 1
    },
    tags: ['executive', 'kpi', 'management'],
    popularity: 95,
    isOfficial: true,
    author: 'PIE DOCS Team'
  }
];

// Async thunks
export const loadWidgetTemplates = createAsyncThunk(
  'dashboardBuilder/loadWidgetTemplates',
  async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockWidgetTemplates;
  }
);

export const loadDashboardTemplates = createAsyncThunk(
  'dashboardBuilder/loadDashboardTemplates',
  async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockDashboardTemplates;
  }
);

export const loadUserDashboards = createAsyncThunk(
  'dashboardBuilder/loadUserDashboards',
  async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return [] as DashboardLayout[];
  }
);

export const saveDashboard = createAsyncThunk(
  'dashboardBuilder/saveDashboard',
  async (dashboard: DashboardLayout) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      ...dashboard,
      updatedAt: new Date()
    };
  }
);

export const loadDashboard = createAsyncThunk(
  'dashboardBuilder/loadDashboard',
  async (dashboardId: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return mock dashboard
    const mockDashboard: DashboardLayout = {
      id: dashboardId,
      name: 'Loaded Dashboard',
      description: 'Dashboard loaded from server',
      isTemplate: false,
      isPublic: false,
      owner: 'current-user',
      widgets: [],
      gridProps: {
        cols: 12,
        rowHeight: 60,
        margin: [16, 16],
        containerPadding: [16, 16]
      },
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    return mockDashboard;
  }
);

// Dashboard builder slice
const dashboardBuilderSlice = createSlice({
  name: 'dashboardBuilder',
  initialState,
  reducers: {
    setDashboard: (state, action: PayloadAction<DashboardLayout>) => {
      state.currentDashboard = action.payload;
      state.isDirty = false;
    },

    addWidget: (state, action: PayloadAction<{ widget: WidgetTemplate; position: { x: number; y: number; w: number; h: number } }>) => {
      if (!state.currentDashboard) return;

      const { widget, position } = action.payload;
      const newWidget: DashboardWidget = {
        id: `${widget.id}-${Date.now()}`,
        type: widget.type,
        title: widget.name,
        position,
        config: { ...widget.defaultConfig },
        isVisible: true,
        permissions: widget.permissions
      };

      state.currentDashboard.widgets.push(newWidget);
      state.currentDashboard.updatedAt = new Date();
      state.isDirty = true;
    },

    updateWidget: (state, action: PayloadAction<{ id: string; updates: Partial<DashboardWidget> }>) => {
      if (!state.currentDashboard) return;

      const { id, updates } = action.payload;
      const widgetIndex = state.currentDashboard.widgets.findIndex(w => w.id === id);

      if (widgetIndex !== -1) {
        state.currentDashboard.widgets[widgetIndex] = {
          ...state.currentDashboard.widgets[widgetIndex],
          ...updates
        };
        state.currentDashboard.updatedAt = new Date();
        state.isDirty = true;
      }
    },

    removeWidget: (state, action: PayloadAction<string>) => {
      if (!state.currentDashboard) return;

      const widgetId = action.payload;
      state.currentDashboard.widgets = state.currentDashboard.widgets.filter(w => w.id !== widgetId);
      state.currentDashboard.updatedAt = new Date();
      state.isDirty = true;
    },

    updateLayout: (state, action: PayloadAction<any[]>) => {
      if (!state.currentDashboard) return;

      const layout = action.payload;

      // Update widget positions based on layout
      state.currentDashboard.widgets = state.currentDashboard.widgets.map(widget => {
        const layoutItem = layout.find(item => item.i === widget.id);
        if (layoutItem) {
          return {
            ...widget,
            position: {
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h
            }
          };
        }
        return widget;
      });

      state.gridLayout = layout;
      state.currentDashboard.updatedAt = new Date();
      state.isDirty = true;
    },

    setEditing: (state, action: PayloadAction<boolean>) => {
      state.isEditing = action.payload;
    },

    setPreview: (state, action: PayloadAction<boolean>) => {
      state.previewMode = action.payload;
    },

    setSelectedWidget: (state, action: PayloadAction<string | null>) => {
      state.selectedWidget = action.payload;
    },

    setDraggedWidget: (state, action: PayloadAction<WidgetTemplate | null>) => {
      state.draggedWidget = action.payload;
    },

    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },

    setShowGrid: (state, action: PayloadAction<boolean>) => {
      state.showGrid = action.payload;
    },

    setSnapToGrid: (state, action: PayloadAction<boolean>) => {
      state.snapToGrid = action.payload;
    },

    setBreakpoint: (state, action: PayloadAction<'lg' | 'md' | 'sm' | 'xs' | 'xxs'>) => {
      state.breakpoint = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    clearDashboard: (state) => {
      if (state.currentDashboard) {
        state.currentDashboard.widgets = [];
        state.currentDashboard.updatedAt = new Date();
        state.isDirty = true;
      }
    },

    resetBuilder: (state) => {
      return {
        ...initialState,
        availableWidgets: state.availableWidgets,
        templates: state.templates
      };
    }
  },

  extraReducers: (builder) => {
    builder
      // Load widget templates
      .addCase(loadWidgetTemplates.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadWidgetTemplates.fulfilled, (state, action) => {
        state.isLoading = false;
        state.availableWidgets = action.payload;
      })
      .addCase(loadWidgetTemplates.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load widget templates';
      })

      // Load dashboard templates
      .addCase(loadDashboardTemplates.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadDashboardTemplates.fulfilled, (state, action) => {
        state.isLoading = false;
        state.templates = action.payload;
      })
      .addCase(loadDashboardTemplates.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load dashboard templates';
      })

      // Load user dashboards
      .addCase(loadUserDashboards.fulfilled, (state, action) => {
        state.userDashboards = action.payload;
      })

      // Save dashboard
      .addCase(saveDashboard.pending, (state) => {
        state.isSaving = true;
      })
      .addCase(saveDashboard.fulfilled, (state, action) => {
        state.isSaving = false;
        state.currentDashboard = action.payload;
        state.isDirty = false;
      })
      .addCase(saveDashboard.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.error.message || 'Failed to save dashboard';
      })

      // Load dashboard
      .addCase(loadDashboard.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadDashboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentDashboard = action.payload;
        state.isDirty = false;
      })
      .addCase(loadDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load dashboard';
      });
  }
});

export const {
  setDashboard,
  addWidget,
  updateWidget,
  removeWidget,
  updateLayout,
  setEditing,
  setPreview,
  setSelectedWidget,
  setDraggedWidget,
  setSidebarOpen,
  setShowGrid,
  setSnapToGrid,
  setBreakpoint,
  setError,
  clearDashboard,
  resetBuilder
} = dashboardBuilderSlice.actions;

export default dashboardBuilderSlice.reducer;
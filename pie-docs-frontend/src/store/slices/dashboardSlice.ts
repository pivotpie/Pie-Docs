import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { WidgetSize } from '@/components/dashboard/WidgetContainer';

export interface WidgetPreferences {
  id: string;
  size: WidgetSize;
  visible: boolean;
  order: number;
}

export interface DashboardLayout {
  widgets: WidgetPreferences[];
  lastModified: string;
  version: number;
}

interface DashboardState {
  layout: DashboardLayout;
  isLoading: boolean;
  hasChanges: boolean;
  preferencesLoaded: boolean;
}

const defaultLayout: DashboardLayout = {
  widgets: [
    { id: 'statistics', size: 'medium', visible: true, order: 0 },
    { id: 'recent-activity', size: 'medium', visible: true, order: 1 },
    { id: 'quick-actions', size: 'small', visible: true, order: 2 },
    { id: 'system-overview', size: 'wide', visible: true, order: 3 },
  ],
  lastModified: new Date().toISOString(),
  version: 1,
};

const initialState: DashboardState = {
  layout: defaultLayout,
  isLoading: false,
  hasChanges: false,
  preferencesLoaded: false,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    // Load preferences from localStorage
    loadPreferences: (state, action: PayloadAction<DashboardLayout | null>) => {
      if (action.payload) {
        state.layout = action.payload;
      }
      state.preferencesLoaded = true;
      state.isLoading = false;
    },

    // Reorder widgets
    reorderWidgets: (state, action: PayloadAction<string[]>) => {
      const newOrder = action.payload;
      const updatedWidgets = newOrder.map((id, index) => {
        const widget = state.layout.widgets.find(w => w.id === id);
        return widget ? { ...widget, order: index } : null;
      }).filter(Boolean) as WidgetPreferences[];

      state.layout.widgets = updatedWidgets;
      state.layout.lastModified = new Date().toISOString();
      state.layout.version += 1;
      state.hasChanges = true;
    },

    // Resize widget
    resizeWidget: (state, action: PayloadAction<{ id: string; size: WidgetSize }>) => {
      const { id, size } = action.payload;
      const widget = state.layout.widgets.find(w => w.id === id);

      if (widget) {
        widget.size = size;
        state.layout.lastModified = new Date().toISOString();
        state.layout.version += 1;
        state.hasChanges = true;
      }
    },

    // Toggle widget visibility
    toggleWidgetVisibility: (state, action: PayloadAction<string>) => {
      const widget = state.layout.widgets.find(w => w.id === action.payload);

      if (widget) {
        widget.visible = !widget.visible;
        state.layout.lastModified = new Date().toISOString();
        state.layout.version += 1;
        state.hasChanges = true;
      }
    },

    // Add new widget
    addWidget: (state, action: PayloadAction<Omit<WidgetPreferences, 'order'>>) => {
      const maxOrder = Math.max(...state.layout.widgets.map(w => w.order), -1);
      const newWidget: WidgetPreferences = {
        ...action.payload,
        order: maxOrder + 1,
      };

      state.layout.widgets.push(newWidget);
      state.layout.lastModified = new Date().toISOString();
      state.layout.version += 1;
      state.hasChanges = true;
    },

    // Remove widget
    removeWidget: (state, action: PayloadAction<string>) => {
      state.layout.widgets = state.layout.widgets.filter(w => w.id !== action.payload);
      // Reorder remaining widgets
      state.layout.widgets.forEach((widget, index) => {
        widget.order = index;
      });

      state.layout.lastModified = new Date().toISOString();
      state.layout.version += 1;
      state.hasChanges = true;
    },

    // Reset to default layout
    resetToDefault: (state) => {
      state.layout = {
        ...defaultLayout,
        lastModified: new Date().toISOString(),
        version: state.layout.version + 1,
      };
      state.hasChanges = true;
    },

    // Save preferences (mark as saved)
    savePreferences: (state) => {
      state.hasChanges = false;
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const {
  loadPreferences,
  reorderWidgets,
  resizeWidget,
  toggleWidgetVisibility,
  addWidget,
  removeWidget,
  resetToDefault,
  savePreferences,
  setLoading,
} = dashboardSlice.actions;

// Selectors
export const selectDashboardLayout = (state: { dashboard: DashboardState }) => state.dashboard.layout;
export const selectVisibleWidgets = (state: { dashboard: DashboardState }) =>
  state.dashboard.layout.widgets
    .filter(w => w.visible)
    .sort((a, b) => a.order - b.order);
export const selectDashboardLoading = (state: { dashboard: DashboardState }) => state.dashboard.isLoading;
export const selectHasChanges = (state: { dashboard: DashboardState }) => state.dashboard.hasChanges;
export const selectPreferencesLoaded = (state: { dashboard: DashboardState }) => state.dashboard.preferencesLoaded;

export default dashboardSlice.reducer;
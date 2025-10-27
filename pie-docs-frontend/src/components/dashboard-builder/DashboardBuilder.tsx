import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import WidgetLibrary from './WidgetLibrary';
import DashboardBuilderToolbar from './DashboardBuilderToolbar';
import WidgetConfigPanel from './WidgetConfigPanel';
import {
  DashboardLayout,
  DashboardWidget,
  WidgetTemplate,
  WidgetPosition,
  DashboardBuilderState
} from '@/types/domain/DashboardBuilder';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardBuilderProps {
  initialDashboard?: DashboardLayout;
  onSave?: (dashboard: DashboardLayout) => void;
  onPreview?: (dashboard: DashboardLayout) => void;
  onClose?: () => void;
}

const DashboardBuilder: React.FC<DashboardBuilderProps> = ({
  initialDashboard,
  onSave,
  onPreview,
  onClose
}) => {
  const { t } = useTranslation('dashboard');
  const dragItemRef = useRef<WidgetTemplate | null>(null);

  const [state, setState] = useState<DashboardBuilderState>({
    currentDashboard: initialDashboard || createNewDashboard(),
    isDirty: false,
    isEditing: true,
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
  });

  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);

  // Create new dashboard helper
  function createNewDashboard(): DashboardLayout {
    return {
      id: `dashboard-${Date.now()}`,
      name: 'Untitled Dashboard',
      description: '',
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
  }

  // Convert dashboard widgets to grid layout
  const getGridLayout = useCallback(() => {
    if (!state.currentDashboard) return [];

    return state.currentDashboard.widgets.map(widget => ({
      i: widget.id,
      x: widget.position.x,
      y: widget.position.y,
      w: widget.position.w,
      h: widget.position.h,
      minW: 2,
      minH: 2,
      maxW: 12,
      maxH: 8
    }));
  }, [state.currentDashboard]);

  // Handle layout changes from grid
  const handleLayoutChange = useCallback((layout: Layout[]) => {
    if (!state.currentDashboard) return;

    const updatedWidgets = state.currentDashboard.widgets.map(widget => {
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

    setState(prev => ({
      ...prev,
      currentDashboard: {
        ...prev.currentDashboard!,
        widgets: updatedWidgets,
        updatedAt: new Date()
      },
      isDirty: true
    }));
  }, [state.currentDashboard]);

  // Handle widget drag from library
  const handleWidgetDrag = useCallback((widget: WidgetTemplate) => {
    dragItemRef.current = widget;
    setState(prev => ({
      ...prev,
      draggedWidget: widget
    }));
  }, []);

  // Handle drop on grid
  const handleDrop = useCallback((layout: Layout[], layoutItem: any, event: DragEvent) => {
    event.preventDefault();

    const widget = dragItemRef.current;
    if (!widget || !state.currentDashboard) return;

    // Create new widget instance
    const newWidget: DashboardWidget = {
      id: `${widget.id}-${Date.now()}`,
      type: widget.type,
      title: widget.name,
      position: {
        x: layoutItem.x,
        y: layoutItem.y,
        w: getWidgetWidth(widget.defaultSize),
        h: getWidgetHeight(widget.defaultSize)
      },
      config: { ...widget.defaultConfig },
      isVisible: true,
      permissions: widget.permissions
    };

    setState(prev => ({
      ...prev,
      currentDashboard: {
        ...prev.currentDashboard!,
        widgets: [...prev.currentDashboard!.widgets, newWidget],
        updatedAt: new Date()
      },
      isDirty: true,
      draggedWidget: null
    }));

    dragItemRef.current = null;
  }, [state.currentDashboard]);

  // Get widget dimensions from size
  const getWidgetWidth = (size: string): number => {
    switch (size) {
      case 'small': return 3;
      case 'medium': return 4;
      case 'large': return 6;
      case 'wide': return 8;
      default: return 4;
    }
  };

  const getWidgetHeight = (size: string): number => {
    switch (size) {
      case 'small': return 3;
      case 'medium': return 4;
      case 'large': return 5;
      case 'wide': return 4;
      default: return 4;
    }
  };

  // Handle widget configuration
  const handleWidgetConfig = useCallback((widgetId: string) => {
    setSelectedWidgetId(widgetId);
    setConfigPanelOpen(true);
  }, []);

  const handleConfigChange = useCallback((config: Record<string, any>) => {
    if (!selectedWidgetId || !state.currentDashboard) return;

    const updatedWidgets = state.currentDashboard.widgets.map(widget =>
      widget.id === selectedWidgetId
        ? { ...widget, config: { ...widget.config, ...config } }
        : widget
    );

    setState(prev => ({
      ...prev,
      currentDashboard: {
        ...prev.currentDashboard!,
        widgets: updatedWidgets,
        updatedAt: new Date()
      },
      isDirty: true
    }));
  }, [selectedWidgetId, state.currentDashboard]);

  // Handle widget removal
  const handleWidgetRemove = useCallback((widgetId: string) => {
    if (!state.currentDashboard) return;

    const updatedWidgets = state.currentDashboard.widgets.filter(widget => widget.id !== widgetId);

    setState(prev => ({
      ...prev,
      currentDashboard: {
        ...prev.currentDashboard!,
        widgets: updatedWidgets,
        updatedAt: new Date()
      },
      isDirty: true
    }));
  }, [state.currentDashboard]);

  // Handle dashboard save
  const handleSave = useCallback(async () => {
    if (!state.currentDashboard) return;

    setState(prev => ({ ...prev, isSaving: true }));

    try {
      await onSave?.(state.currentDashboard);
      setState(prev => ({ ...prev, isDirty: false, isSaving: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to save dashboard',
        isSaving: false
      }));
    }
  }, [state.currentDashboard, onSave]);

  // Handle preview mode
  const handlePreview = useCallback(() => {
    if (!state.currentDashboard) return;

    setState(prev => ({ ...prev, previewMode: !prev.previewMode }));
    onPreview?.(state.currentDashboard);
  }, [state.currentDashboard, onPreview]);

  // Render widget content
  const renderWidget = (widget: DashboardWidget) => (
    <div
      key={widget.id}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden relative group"
    >
      {/* Widget Header */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {widget.title}
          </h3>
          {!state.previewMode && (
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleWidgetConfig(widget.id)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Configure widget"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                onClick={() => handleWidgetRemove(widget.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Remove widget"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-4 h-full">
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm">{widget.type}</div>
            <div className="text-xs opacity-75">Widget preview</div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!state.currentDashboard) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            Create Your Dashboard
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Start building your custom dashboard by adding widgets from the library.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Toolbar */}
      <DashboardBuilderToolbar
        dashboard={state.currentDashboard}
        onSave={handleSave}
        onPreview={handlePreview}
        onUndo={() => {}} // TODO: Implement undo/redo
        onRedo={() => {}} // TODO: Implement undo/redo
        onClear={() => {}} // TODO: Implement clear
        canUndo={false}
        canRedo={false}
        isSaving={state.isSaving}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Widget Library Sidebar */}
        {state.sidebarOpen && !state.previewMode && (
          <div className="w-80 flex-shrink-0">
            <WidgetLibrary
              widgets={state.availableWidgets}
              onWidgetDrag={handleWidgetDrag}
              onWidgetSelect={(widget) => setState(prev => ({ ...prev, selectedWidget: widget.id }))}
              selectedCategory="all"
              onCategoryChange={() => {}}
            />
          </div>
        )}

        {/* Main Dashboard Canvas */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <ResponsiveGridLayout
              className="layout"
              layouts={{ lg: getGridLayout() }}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={state.currentDashboard.gridProps.rowHeight}
              margin={state.currentDashboard.gridProps.margin}
              containerPadding={state.currentDashboard.gridProps.containerPadding}
              onLayoutChange={handleLayoutChange}
              onDrop={handleDrop}
              isDroppable={!state.previewMode}
              isDraggable={!state.previewMode}
              isResizable={!state.previewMode}
              compactType="vertical"
              preventCollision={false}
            >
              {state.currentDashboard.widgets.map(renderWidget)}
            </ResponsiveGridLayout>

            {/* Empty State */}
            {state.currentDashboard.widgets.length === 0 && (
              <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Your dashboard is empty
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Drag widgets from the library to start building your dashboard.
                  </p>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    💡 Tip: You can resize and rearrange widgets after adding them
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Widget Configuration Panel */}
      {configPanelOpen && selectedWidgetId && (
        <WidgetConfigPanel
          widget={state.currentDashboard.widgets.find(w => w.id === selectedWidgetId)!}
          template={state.availableWidgets.find(t => t.type === state.currentDashboard.widgets.find(w => w.id === selectedWidgetId)?.type)!}
          onConfigChange={handleConfigChange}
          onClose={() => {
            setConfigPanelOpen(false);
            setSelectedWidgetId(null);
          }}
        />
      )}
    </div>
  );
};

export default DashboardBuilder;
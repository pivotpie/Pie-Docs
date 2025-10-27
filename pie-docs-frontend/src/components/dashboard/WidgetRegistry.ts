import { WidgetConfig } from './Widget';

class WidgetRegistry {
  private static instance: WidgetRegistry;
  private widgets: Map<string, WidgetConfig> = new Map();

  private constructor() {}

  static getInstance(): WidgetRegistry {
    if (!WidgetRegistry.instance) {
      WidgetRegistry.instance = new WidgetRegistry();
    }
    return WidgetRegistry.instance;
  }

  register(config: WidgetConfig): void {
    if (this.widgets.has(config.id)) {
      console.warn(`Widget with id "${config.id}" is already registered`);
      return;
    }

    this.widgets.set(config.id, config);
  }

  unregister(id: string): void {
    this.widgets.delete(id);
  }

  get(id: string): WidgetConfig | undefined {
    return this.widgets.get(id);
  }

  getAll(): WidgetConfig[] {
    return Array.from(this.widgets.values());
  }

  getByCategory(category: string): WidgetConfig[] {
    return this.getAll().filter(widget => widget.category === category);
  }

  getAvailableWidgets(userPermissions: string[] = []): WidgetConfig[] {
    return this.getAll().filter(widget => {
      if (!widget.permissions || widget.permissions.length === 0) {
        return true;
      }
      return widget.permissions.some(permission => userPermissions.includes(permission));
    });
  }

  exists(id: string): boolean {
    return this.widgets.has(id);
  }

  clear(): void {
    this.widgets.clear();
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    this.widgets.forEach(widget => categories.add(widget.category));
    return Array.from(categories);
  }
}

// Export singleton instance
export const widgetRegistry = WidgetRegistry.getInstance();

// Helper function to register a widget
export const registerWidget = (config: WidgetConfig): void => {
  widgetRegistry.register(config);
};

// Helper function to get available widgets
export const getAvailableWidgets = (userPermissions?: string[]): WidgetConfig[] => {
  return widgetRegistry.getAvailableWidgets(userPermissions);
};

export default WidgetRegistry;
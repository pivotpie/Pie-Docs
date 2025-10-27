import type { DashboardLayout } from '@/store/slices/dashboardSlice';

const DASHBOARD_STORAGE_KEY = 'pie-docs-dashboard-preferences';
const STORAGE_VERSION = 1;

interface StoredDashboard {
  layout: DashboardLayout;
  version: number;
  userId?: string;
  timestamp: string;
}

export class DashboardPersistence {
  /**
   * Load dashboard preferences from localStorage
   */
  static load(userId?: string): DashboardLayout | null {
    try {
      const stored = localStorage.getItem(DASHBOARD_STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const parsed: StoredDashboard = JSON.parse(stored);

      // Check version compatibility
      if (parsed.version !== STORAGE_VERSION) {
        console.warn('Dashboard preferences version mismatch, using defaults');
        this.clear();
        return null;
      }

      // Check user-specific preferences if userId provided
      if (userId && parsed.userId && parsed.userId !== userId) {
        console.info('Dashboard preferences for different user, using defaults');
        return null;
      }

      // Validate layout structure
      if (!this.isValidLayout(parsed.layout)) {
        console.warn('Invalid dashboard layout structure, using defaults');
        this.clear();
        return null;
      }

      return parsed.layout;
    } catch (error) {
      console.error('Error loading dashboard preferences:', error);
      this.clear(); // Clear corrupted data
      return null;
    }
  }

  /**
   * Save dashboard preferences to localStorage
   */
  static save(layout: DashboardLayout, userId?: string): boolean {
    try {
      const toStore: StoredDashboard = {
        layout,
        version: STORAGE_VERSION,
        userId,
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(toStore));
      return true;
    } catch (error) {
      console.error('Error saving dashboard preferences:', error);
      return false;
    }
  }

  /**
   * Clear dashboard preferences from localStorage
   */
  static clear(): void {
    try {
      localStorage.removeItem(DASHBOARD_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing dashboard preferences:', error);
    }
  }

  /**
   * Check if localStorage is available
   */
  static isStorageAvailable(): boolean {
    try {
      const test = '__dashboard_storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate dashboard layout structure
   */
  private static isValidLayout(layout: unknown): layout is DashboardLayout {
    if (!layout || typeof layout !== 'object') {
      return false;
    }

    const layoutObj = layout as Record<string, unknown>;

    // Check required properties
    if (!Array.isArray(layoutObj.widgets) ||
        typeof layoutObj.lastModified !== 'string' ||
        typeof layoutObj.version !== 'number') {
      return false;
    }

    // Validate widgets
    for (const widget of layoutObj.widgets) {
      if (!widget ||
          typeof widget !== 'object' ||
          typeof (widget as Record<string, unknown>).id !== 'string' ||
          typeof (widget as Record<string, unknown>).size !== 'string' ||
          typeof (widget as Record<string, unknown>).visible !== 'boolean' ||
          typeof (widget as Record<string, unknown>).order !== 'number') {
        return false;
      }
    }

    return true;
  }

  /**
   * Get storage usage information
   */
  static getStorageInfo(): {
    exists: boolean;
    size: number;
    lastModified?: string;
    userId?: string;
  } {
    try {
      const stored = localStorage.getItem(DASHBOARD_STORAGE_KEY);
      if (!stored) {
        return { exists: false, size: 0 };
      }

      const parsed: StoredDashboard = JSON.parse(stored);
      return {
        exists: true,
        size: stored.length,
        lastModified: parsed.timestamp,
        userId: parsed.userId,
      };
    } catch {
      return { exists: false, size: 0 };
    }
  }

  /**
   * Export dashboard preferences as JSON
   */
  static export(): string | null {
    try {
      const stored = localStorage.getItem(DASHBOARD_STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const parsed: StoredDashboard = JSON.parse(stored);
      return JSON.stringify(parsed.layout, null, 2);
    } catch (error) {
      console.error('Error exporting dashboard preferences:', error);
      return null;
    }
  }

  /**
   * Import dashboard preferences from JSON
   */
  static import(jsonData: string, userId?: string): boolean {
    try {
      const layout: DashboardLayout = JSON.parse(jsonData);

      if (!this.isValidLayout(layout)) {
        console.error('Invalid layout format for import');
        return false;
      }

      return this.save(layout, userId);
    } catch (error) {
      console.error('Error importing dashboard preferences:', error);
      return false;
    }
  }
}

// Redux middleware for automatic persistence
export const dashboardPersistenceMiddleware = (store: { getState: () => { auth?: { user?: { id?: string } }; dashboard: { layout: DashboardLayout } } }) => (next: (action: unknown) => unknown) => (action: { type?: string }) => {
  const result = next(action);

  // Auto-save on dashboard state changes
  if (action.type?.startsWith('dashboard/') &&
      !action.type.includes('loadPreferences') &&
      !action.type.includes('setLoading')) {

    const state = store.getState();
    const userId = state.auth?.user?.id;

    if (DashboardPersistence.isStorageAvailable()) {
      DashboardPersistence.save(state.dashboard.layout, userId);
    }
  }

  return result;
};

export default DashboardPersistence;
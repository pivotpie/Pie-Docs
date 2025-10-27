/**
 * Sync Service
 * Handles synchronization of offline operations when connection is restored
 */

import {
  offlineStorage,
  getPendingOperations,
  markOperationSynced,
  markOperationFailed,
} from '@/utils/offlineStorage';

interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}

interface SyncProgress {
  total: number;
  completed: number;
  current: string;
}

type SyncProgressCallback = (progress: SyncProgress) => void;

class SyncService {
  private isSyncing = false;
  private syncQueue: string[] = [];
  private progressCallback?: SyncProgressCallback;

  async startSync(onProgress?: SyncProgressCallback): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;
    this.progressCallback = onProgress;

    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      const pendingOperations = await getPendingOperations();

      if (pendingOperations.length === 0) {
        return result;
      }

      this.syncQueue = pendingOperations.map(op => op.id);

      for (let i = 0; i < pendingOperations.length; i++) {
        const operation = pendingOperations[i];

        if (this.progressCallback) {
          this.progressCallback({
            total: pendingOperations.length,
            completed: i,
            current: `Syncing ${operation.type} ${operation.id}`,
          });
        }

        try {
          await this.syncOperation(operation);
          await markOperationSynced(operation.id);
          result.syncedCount++;
        } catch (error) {
          await markOperationFailed(operation.id);
          result.failedCount++;
          result.errors.push(`Failed to sync ${operation.id}: ${error}`);
          console.error(`Sync failed for operation ${operation.id}:`, error);
        }
      }

      if (result.failedCount > 0) {
        result.success = false;
      }

      if (this.progressCallback) {
        this.progressCallback({
          total: pendingOperations.length,
          completed: pendingOperations.length,
          current: 'Sync completed',
        });
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Sync process failed: ${error}`);
      console.error('Sync process failed:', error);
    } finally {
      this.isSyncing = false;
      this.syncQueue = [];
      this.progressCallback = undefined;
    }

    return result;
  }

  private async syncOperation(operation: any): Promise<void> {
    switch (operation.type) {
      case 'scan':
        return this.syncScanOperation(operation);
      case 'capture':
        return this.syncCaptureOperation(operation);
      case 'batch':
        return this.syncBatchOperation(operation);
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  private async syncScanOperation(operation: any): Promise<void> {
    // Mock API call to sync scan data
    const response = await this.makeApiCall('/api/scans', {
      method: 'POST',
      body: JSON.stringify(operation.data),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async syncCaptureOperation(operation: any): Promise<void> {
    const formData = new FormData();

    // Add metadata
    formData.append('metadata', JSON.stringify(operation.data.metadata));
    formData.append('timestamp', operation.data.timestamp);

    // Add image if available
    if (operation.data.imageId) {
      const imageBlob = await offlineStorage.getMedia(operation.data.imageId);
      if (imageBlob) {
        formData.append('image', imageBlob, 'capture.jpg');
      }
    }

    const response = await this.makeApiCall('/api/captures', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Clean up stored media after successful sync
    if (operation.data.imageId) {
      await offlineStorage.deleteMedia(operation.data.imageId);
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  private async syncBatchOperation(operation: any): Promise<void> {
    // Sync batch operation - could be multiple items
    const batchData = operation.data;

    const response = await this.makeApiCall('/api/batches', {
      method: 'POST',
      body: JSON.stringify({
        ...batchData,
        offlineId: operation.id,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1200));
  }

  private async makeApiCall(url: string, options: RequestInit): Promise<Response> {
    // Check if we're actually online
    if (!navigator.onLine) {
      throw new Error('Device is offline');
    }

    // Add retry logic
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;

      } catch (error) {
        lastError = error as Error;

        // If it's the last attempt, throw the error
        if (attempt === maxRetries - 1) {
          throw lastError;
        }

        // Wait before retrying (exponential backoff)
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw lastError || new Error('Sync failed after retries');
  }

  async stopSync(): Promise<void> {
    this.isSyncing = false;
  }

  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  getCurrentSyncQueue(): string[] {
    return [...this.syncQueue];
  }

  async canSync(): Promise<boolean> {
    // Check if device is online
    if (!navigator.onLine) {
      return false;
    }

    // Check if there are pending operations
    const pendingOps = await getPendingOperations();
    return pendingOps.length > 0;
  }

  async getConflicts(): Promise<any[]> {
    // Mock conflict detection
    // In a real implementation, this would check for data conflicts
    const pendingOps = await getPendingOperations();

    return pendingOps.filter(op => {
      // Simulate conflict detection logic
      return op.syncAttempts > 2 && op.status === 'failed';
    });
  }

  async resolveConflict(operationId: string, resolution: 'keep_local' | 'keep_remote' | 'merge'): Promise<void> {
    // Mock conflict resolution
    switch (resolution) {
      case 'keep_local':
        // Mark for retry
        await offlineStorage.updateOperation(operationId, {
          status: 'pending',
          syncAttempts: 0,
        });
        break;

      case 'keep_remote':
        // Mark as synced (discard local)
        await markOperationSynced(operationId);
        break;

      case 'merge':
        // Custom merge logic would go here
        await offlineStorage.updateOperation(operationId, {
          status: 'pending',
          syncAttempts: 0,
        });
        break;
    }
  }
}

// Singleton instance
export const syncService = new SyncService();

// Auto-sync when connection is restored
let isOnline = navigator.onLine;

const handleOnline = async () => {
  if (!isOnline && navigator.onLine) {
    isOnline = true;

    // Wait a bit for connection to stabilize
    setTimeout(async () => {
      if (await syncService.canSync()) {
        console.log('Connection restored, starting auto-sync...');
        try {
          const result = await syncService.startSync();
          console.log('Auto-sync completed:', result);
        } catch (error) {
          console.error('Auto-sync failed:', error);
        }
      }
    }, 2000);
  }
};

const handleOffline = () => {
  isOnline = false;
  if (syncService.isSyncInProgress()) {
    syncService.stopSync();
  }
};

window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);

export default syncService;
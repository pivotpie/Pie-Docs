/**
 * Offline Storage Utility
 * Manages local storage for offline operations with IndexedDB
 */

interface StoredOperation {
  id: string;
  type: 'scan' | 'capture' | 'batch';
  data: any;
  timestamp: string;
  syncAttempts: number;
  lastSyncAttempt?: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

interface StorageUsage {
  used: number;
  available: number;
  total: number;
  unit: 'MB' | 'GB';
}

class OfflineStorage {
  private dbName = 'pie-docs-offline';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;

        // Operations store
        if (!db.objectStoreNames.contains('operations')) {
          const operationsStore = db.createObjectStore('operations', { keyPath: 'id' });
          operationsStore.createIndex('type', 'type', { unique: false });
          operationsStore.createIndex('status', 'status', { unique: false });
          operationsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Media store for images/files
        if (!db.objectStoreNames.contains('media')) {
          const mediaStore = db.createObjectStore('media', { keyPath: 'id' });
          mediaStore.createIndex('operationId', 'operationId', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  async storeOperation(operation: StoredOperation): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore('operations');
      const request = store.add(operation);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async updateOperation(id: string, updates: Partial<StoredOperation>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore('operations');

      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const operation = getRequest.result;
        if (operation) {
          const updatedOperation = { ...operation, ...updates };
          const putRequest = store.put(updatedOperation);
          putRequest.onerror = () => reject(putRequest.error);
          putRequest.onsuccess = () => resolve();
        } else {
          reject(new Error('Operation not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getOperations(status?: string): Promise<StoredOperation[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['operations'], 'readonly');
      const store = transaction.objectStore('operations');

      let request: IDBRequest;
      if (status) {
        const index = store.index('status');
        request = index.getAll(status);
      } else {
        request = store.getAll();
      }

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async deleteOperation(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore('operations');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async storeMedia(id: string, operationId: string, blob: Blob): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['media'], 'readwrite');
      const store = transaction.objectStore('media');
      const request = store.add({
        id,
        operationId,
        blob,
        timestamp: new Date().toISOString(),
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getMedia(id: string): Promise<Blob | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['media'], 'readonly');
      const store = transaction.objectStore('media');
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.blob : null);
      };
    });
  }

  async deleteMedia(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['media'], 'readwrite');
      const store = transaction.objectStore('media');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getStorageUsage(): Promise<StorageUsage> {
    if (!this.db) throw new Error('Database not initialized');

    const estimate = await navigator.storage.estimate();
    const used = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const available = quota - used;

    // Convert to MB
    return {
      used: Math.round(used / 1024 / 1024),
      available: Math.round(available / 1024 / 1024),
      total: Math.round(quota / 1024 / 1024),
      unit: 'MB',
    };
  }

  async clearOldOperations(daysToKeep: number = 30): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffTimestamp = cutoffDate.toISOString();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore('operations');
      const index = store.index('timestamp');

      const range = IDBKeyRange.upperBound(cutoffTimestamp);
      const request = index.openCursor(range);
      let deletedCount = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const operation = cursor.value;
          if (operation.status === 'synced') {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async saveSetting(key: string, value: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      const request = store.put({ key, value });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getSetting(key: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorage();

// Helper functions
export const initializeOfflineStorage = async (): Promise<void> => {
  await offlineStorage.initialize();
};

export const storeOfflineOperation = async (
  type: 'scan' | 'capture' | 'batch',
  data: any
): Promise<string> => {
  const operation: StoredOperation = {
    id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    data,
    timestamp: new Date().toISOString(),
    syncAttempts: 0,
    status: 'pending',
  };

  await offlineStorage.storeOperation(operation);
  return operation.id;
};

export const getPendingOperations = async (): Promise<StoredOperation[]> => {
  return await offlineStorage.getOperations('pending');
};

export const markOperationSynced = async (id: string): Promise<void> => {
  await offlineStorage.updateOperation(id, {
    status: 'synced',
    lastSyncAttempt: new Date().toISOString(),
  });
};

export const markOperationFailed = async (id: string): Promise<void> => {
  const operations = await offlineStorage.getOperations();
  const operation = operations.find(op => op.id === id);

  if (operation) {
    await offlineStorage.updateOperation(id, {
      status: 'failed',
      syncAttempts: operation.syncAttempts + 1,
      lastSyncAttempt: new Date().toISOString(),
    });
  }
};

export const cleanupOldOperations = async (daysToKeep: number = 30): Promise<number> => {
  return await offlineStorage.clearOldOperations(daysToKeep);
};

export const getStorageInfo = async (): Promise<StorageUsage> => {
  return await offlineStorage.getStorageUsage();
};
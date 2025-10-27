import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { syncOfflineOperations, setOfflineMode } from '@/store/slices/physicalDocsSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { syncService } from '@/services/syncService';
import { getStorageInfo, getPendingOperations, cleanupOldOperations } from '@/utils/offlineStorage';

interface OfflineStatusProps {
  className?: string;
  showDetails?: boolean;
}

const OfflineStatus: React.FC<OfflineStatusProps> = ({
  className = '',
  showDetails = false
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isOffline, syncStatus, storageUsage } = useSelector(
    (state: RootState) => state.physicalDocs.offline
  );

  const [pendingCount, setPendingCount] = useState(0);
  const [currentStorageUsage, setCurrentStorageUsage] = useState(storageUsage);
  const [syncProgress, setSyncProgress] = useState<{
    total: number;
    completed: number;
    current: string;
  } | null>(null);
  const [showDetails_, setShowDetails] = useState(showDetails);

  // Update pending operations count
  useEffect(() => {
    const updatePendingCount = async () => {
      try {
        const pending = await getPendingOperations();
        setPendingCount(pending.length);
      } catch (error) {
        console.error('Failed to get pending operations:', error);
      }
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 10000); // Update every 10s

    return () => clearInterval(interval);
  }, []);

  // Update storage usage
  useEffect(() => {
    const updateStorageUsage = async () => {
      try {
        const usage = await getStorageInfo();
        setCurrentStorageUsage(usage);
      } catch (error) {
        console.error('Failed to get storage info:', error);
      }
    };

    updateStorageUsage();
    const interval = setInterval(updateStorageUsage, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => dispatch(setOfflineMode(false));
    const handleOffline = () => dispatch(setOfflineMode(true));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  const handleManualSync = async () => {
    if (syncService.isSyncInProgress()) return;

    try {
      await syncService.startSync((progress) => {
        setSyncProgress(progress);
      });

      // Refresh pending count after sync
      const pending = await getPendingOperations();
      setPendingCount(pending.length);
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setSyncProgress(null);
    }
  };

  const handleCleanupStorage = async () => {
    try {
      const deletedCount = await cleanupOldOperations(30);
      console.log(`Cleaned up ${deletedCount} old operations`);

      // Refresh storage usage
      const usage = await getStorageInfo();
      setCurrentStorageUsage(usage);
    } catch (error) {
      console.error('Storage cleanup failed:', error);
    }
  };

  const getStoragePercentage = () => {
    if (currentStorageUsage.total === 0) return 0;
    return Math.round((currentStorageUsage.used / currentStorageUsage.total) * 100);
  };

  const getStorageColor = () => {
    const percentage = getStoragePercentage();
    if (percentage > 80) return 'bg-red-500';
    if (percentage > 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      {/* Status header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isOffline ? 'bg-red-500' : 'bg-green-500'}`} />
          <span className="text-white font-medium">
            {isOffline ? 'Offline' : 'Online'}
          </span>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails_)}
          className="text-gray-400 hover:text-white"
        >
          <svg className={`w-5 h-5 transition-transform ${showDetails_ ? 'rotate-180' : ''}`}
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Quick status */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-300">
          {pendingCount} pending operations
        </span>
        <span className="text-gray-300">
          {currentStorageUsage.used}{currentStorageUsage.unit} used
        </span>
      </div>

      {/* Detailed status */}
      <AnimatePresence>
        {showDetails_ && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-4"
          >
            {/* Sync status */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm font-medium">Sync Status</span>
                {!isOffline && !syncService.isSyncInProgress() && pendingCount > 0 && (
                  <button
                    onClick={handleManualSync}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Sync Now
                  </button>
                )}
              </div>

              {syncProgress ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-300">
                    <span>{syncProgress.current}</span>
                    <span>{syncProgress.completed}/{syncProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(syncProgress.completed / syncProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-400">
                  {isOffline ? 'Waiting for connection' :
                   pendingCount === 0 ? 'All data synced' :
                   `${pendingCount} operations pending`}
                </div>
              )}
            </div>

            {/* Storage usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm font-medium">Storage Usage</span>
                <button
                  onClick={handleCleanupStorage}
                  className="text-yellow-400 hover:text-yellow-300 text-sm"
                >
                  Cleanup
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-300">
                  <span>
                    {currentStorageUsage.used}{currentStorageUsage.unit} / {currentStorageUsage.total}{currentStorageUsage.unit}
                  </span>
                  <span>{getStoragePercentage()}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getStorageColor()}`}
                    style={{ width: `${getStoragePercentage()}%` }}
                  />
                </div>
              </div>

              {getStoragePercentage() > 80 && (
                <div className="text-xs text-yellow-400 mt-1">
                  ⚠️ Storage is running low. Consider cleaning up old data.
                </div>
              )}
            </div>

            {/* Connection info */}
            <div>
              <span className="text-white text-sm font-medium">Connection</span>
              <div className="text-xs text-gray-400 mt-1">
                {isOffline ? (
                  <>
                    <div>📱 Working offline</div>
                    <div>🔄 Data will sync when reconnected</div>
                  </>
                ) : (
                  <>
                    <div>🌐 Connected to internet</div>
                    <div>✅ Real-time sync enabled</div>
                  </>
                )}
              </div>
            </div>

            {/* Offline capabilities */}
            {isOffline && (
              <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-3">
                <div className="text-yellow-200 text-sm font-medium mb-1">
                  Offline Mode Active
                </div>
                <div className="text-yellow-300 text-xs">
                  • Scans and captures are saved locally
                  <br />
                  • Auto-sync when connection restored
                  <br />
                  • Storage: {currentStorageUsage.available}{currentStorageUsage.unit} available
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OfflineStatus;
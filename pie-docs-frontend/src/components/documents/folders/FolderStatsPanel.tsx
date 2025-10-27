import React, { useMemo } from 'react';
import type { DocumentFolder, DocumentType } from '@/types/domain/Document';

interface FolderStatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  folder?: DocumentFolder | null;
  allFolders: DocumentFolder[];
}

interface FolderStatsData {
  totalFolders: number;
  totalDocuments: number;
  totalSize: number;
  averageFileSize: number;
  largestFolder: DocumentFolder | null;
  mostActiveFolder: DocumentFolder | null;
  fileTypeDistribution: Array<{
    type: DocumentType;
    count: number;
    size: number;
    percentage: number;
  }>;
  sizeDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  recentActivity: Array<{
    folderName: string;
    lastActivity: string;
    documentCount: number;
  }>;
}

const FolderStatsPanel: React.FC<FolderStatsPanelProps> = ({
  isOpen,
  onClose,
  folder,
  allFolders,
}) => {
  const stats = useMemo((): FolderStatsData => {
    const folders = folder ? [folder] : allFolders;

    const totalDocuments = folders.reduce((sum, f) => sum + f.statistics.documentCount, 0);
    const totalSize = folders.reduce((sum, f) => sum + f.statistics.totalSize, 0);
    const averageFileSize = totalDocuments > 0 ? totalSize / totalDocuments : 0;

    // Find largest folder by document count
    const largestFolder = folders.reduce((largest, current) =>
      !largest || current.statistics.documentCount > largest.statistics.documentCount
        ? current
        : largest
    , null as DocumentFolder | null);

    // Find most active folder by recent activity
    const mostActiveFolder = folders.reduce((mostActive, current) => {
      const currentActivity = new Date(current.statistics.lastActivity).getTime();
      const mostActiveActivity = mostActive ? new Date(mostActive.statistics.lastActivity).getTime() : 0;
      return currentActivity > mostActiveActivity ? current : mostActive;
    }, null as DocumentFolder | null);

    // Calculate file type distribution
    const fileTypeMap = new Map<DocumentType, { count: number; size: number }>();
    folders.forEach(f => {
      Object.entries(f.statistics.fileTypeDistribution).forEach(([type, count]) => {
        const existing = fileTypeMap.get(type as DocumentType) || { count: 0, size: 0 };
        fileTypeMap.set(type as DocumentType, {
          count: existing.count + count,
          size: existing.size + (f.statistics.totalSize * count / f.statistics.documentCount || 0),
        });
      });
    });

    const fileTypeDistribution = Array.from(fileTypeMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      size: data.size,
      percentage: totalDocuments > 0 ? (data.count / totalDocuments) * 100 : 0,
    })).sort((a, b) => b.count - a.count);

    // Calculate size distribution
    const sizeRanges = [
      { range: '< 1 MB', min: 0, max: 1024 * 1024 },
      { range: '1-10 MB', min: 1024 * 1024, max: 10 * 1024 * 1024 },
      { range: '10-100 MB', min: 10 * 1024 * 1024, max: 100 * 1024 * 1024 },
      { range: '> 100 MB', min: 100 * 1024 * 1024, max: Infinity },
    ];

    const sizeDistribution = sizeRanges.map(range => {
      const count = folders.reduce((sum, f) => {
        // This is a simplified calculation - in real implementation,
        // you'd need individual document sizes
        const avgSize = f.statistics.averageFileSize;
        return sum + (avgSize >= range.min && avgSize < range.max ? f.statistics.documentCount : 0);
      }, 0);

      return {
        range: range.range,
        count,
        percentage: totalDocuments > 0 ? (count / totalDocuments) * 100 : 0,
      };
    });

    // Recent activity
    const recentActivity = folders
      .map(f => ({
        folderName: f.name,
        lastActivity: f.statistics.lastActivity,
        documentCount: f.statistics.documentCount,
      }))
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
      .slice(0, 5);

    return {
      totalFolders: folders.length,
      totalDocuments,
      totalSize,
      averageFileSize,
      largestFolder,
      mostActiveFolder,
      fileTypeDistribution,
      sizeDistribution,
      recentActivity,
    };
  }, [folder, allFolders]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {folder ? `${folder.name} Statistics` : 'Folder Statistics'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Total Folders</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalFolders}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">Total Documents</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.totalDocuments.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="flex items-center">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100">Total Size</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{formatFileSize(stats.totalSize)}</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <div className="flex items-center">
                <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">Avg File Size</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{formatFileSize(stats.averageFileSize)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts and Detailed Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* File Type Distribution */}
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">File Type Distribution</h3>
              <div className="space-y-3">
                {stats.fileTypeDistribution.slice(0, 6).map((item, index) => (
                  <div key={item.type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-white uppercase">
                        {item.type}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.count} ({item.percentage.toFixed(1)}%)
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(item.size)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Size Distribution */}
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Size Distribution</h3>
              <div className="space-y-3">
                {stats.sizeDistribution.map((item, index) => (
                  <div key={item.range} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: `hsl(${index * 90}, 60%, 55%)` }}
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.range}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.count} ({item.percentage.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Performers */}
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Performers</h3>
              <div className="space-y-4">
                {stats.largestFolder && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Largest Folder</h4>
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {stats.largestFolder.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {stats.largestFolder.statistics.documentCount} documents
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {formatFileSize(stats.largestFolder.statistics.totalSize)}
                      </div>
                    </div>
                  </div>
                )}

                {stats.mostActiveFolder && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Most Active</h4>
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {stats.mostActiveFolder.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Last activity: {formatDate(stats.mostActiveFolder.statistics.lastActivity)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {stats.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.folderName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.documentCount} documents
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(activity.lastActivity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          {folder && (
            <div className="mt-8 bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Detailed Breakdown - {folder.name}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Creation Date
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {formatDate(folder.dateCreated)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Modified
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {formatDate(folder.dateModified)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Folder Type
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white capitalize">
                    {folder.type}
                    {folder.type === 'smart' && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full dark:bg-purple-900/20 dark:text-purple-400">
                        Auto-updating
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {folder.description && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {folder.description}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FolderStatsPanel;
import React, { useState, useEffect, useCallback } from 'react';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';

interface ProgressiveLoaderProps {
  documentUrl: string;
  documentType: 'pdf' | 'image' | 'text';
  onLoadProgress?: (progress: number) => void;
  onLoadComplete?: (data: any) => void;
  onLoadError?: (error: Error) => void;
  chunkSize?: number;
  className?: string;
}

interface LoadingChunk {
  id: string;
  start: number;
  end: number;
  status: 'pending' | 'loading' | 'loaded' | 'error';
  data?: any;
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  documentUrl,
  documentType,
  onLoadProgress,
  onLoadComplete,
  onLoadError,
  chunkSize = 64 * 1024, // 64KB chunks
  className = ''
}) => {
  const [loadingChunks, setLoadingChunks] = useState<LoadingChunk[]>([]);
  const [totalSize, setTotalSize] = useState<number>(0);
  const [loadedSize, setLoadedSize] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadedData, setLoadedData] = useState<any>(null);

  // Initialize chunks based on document size
  const initializeChunks = useCallback(async () => {
    try {
      const response = await fetch(documentUrl, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');

      if (!contentLength) {
        // If we can't get content length, load normally
        const fullResponse = await fetch(documentUrl);
        const data = await fullResponse.blob();
        setLoadedData(data);
        onLoadComplete?.(data);
        return;
      }

      const size = parseInt(contentLength, 10);
      setTotalSize(size);

      const chunks: LoadingChunk[] = [];
      for (let i = 0; i < size; i += chunkSize) {
        chunks.push({
          id: `chunk_${i}`,
          start: i,
          end: Math.min(i + chunkSize - 1, size - 1),
          status: 'pending'
        });
      }

      setLoadingChunks(chunks);
    } catch (error) {
      console.error('Failed to initialize progressive loading:', error);
      onLoadError?.(error as Error);
    }
  }, [documentUrl, chunkSize, onLoadComplete, onLoadError]);

  // Load a single chunk
  const loadChunk = useCallback(async (chunk: LoadingChunk) => {
    try {
      setLoadingChunks(prev => prev.map(c =>
        c.id === chunk.id ? { ...c, status: 'loading' } : c
      ));

      const response = await fetch(documentUrl, {
        headers: {
          Range: `bytes=${chunk.start}-${chunk.end}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load chunk: ${response.statusText}`);
      }

      const data = await response.arrayBuffer();

      setLoadingChunks(prev => prev.map(c =>
        c.id === chunk.id ? { ...c, status: 'loaded', data } : c
      ));

      setLoadedSize(prev => prev + data.byteLength);

    } catch (error) {
      setLoadingChunks(prev => prev.map(c =>
        c.id === chunk.id ? { ...c, status: 'error' } : c
      ));
      console.error('Failed to load chunk:', error);
    }
  }, [documentUrl]);

  // Start progressive loading
  const startProgressiveLoad = useCallback(async () => {
    if (loadingChunks.length === 0) return;

    setIsLoading(true);

    // Load chunks progressively - prioritize first and visible chunks
    const priorityChunks = loadingChunks.slice(0, Math.min(3, loadingChunks.length));

    // Load priority chunks in parallel
    await Promise.all(priorityChunks.map(chunk => loadChunk(chunk)));

    // Load remaining chunks
    for (let i = 3; i < loadingChunks.length; i++) {
      await loadChunk(loadingChunks[i]);
    }

    setIsLoading(false);
  }, [loadingChunks, loadChunk]);

  // Combine loaded chunks
  const combineChunks = useCallback(() => {
    const allLoaded = loadingChunks.every(chunk => chunk.status === 'loaded');

    if (!allLoaded) return null;

    const totalLength = loadingChunks.reduce((sum, chunk) =>
      sum + (chunk.data ? chunk.data.byteLength : 0), 0
    );

    const combined = new Uint8Array(totalLength);
    let offset = 0;

    loadingChunks.forEach(chunk => {
      if (chunk.data) {
        combined.set(new Uint8Array(chunk.data), offset);
        offset += chunk.data.byteLength;
      }
    });

    const blob = new Blob([combined]);
    return blob;
  }, [loadingChunks]);

  // Update progress
  useEffect(() => {
    if (totalSize > 0) {
      const progress = (loadedSize / totalSize) * 100;
      onLoadProgress?.(progress);
    }
  }, [loadedSize, totalSize, onLoadProgress]);

  // Check if all chunks are loaded
  useEffect(() => {
    if (loadingChunks.length > 0) {
      const combinedData = combineChunks();
      if (combinedData) {
        setLoadedData(combinedData);
        onLoadComplete?.(combinedData);
      }
    }
  }, [loadingChunks, combineChunks, onLoadComplete]);

  // Start loading process
  useEffect(() => {
    initializeChunks();
  }, [initializeChunks]);

  useEffect(() => {
    if (loadingChunks.length > 0 && !isLoading && !loadedData) {
      startProgressiveLoad();
    }
  }, [loadingChunks, isLoading, loadedData, startProgressiveLoad]);

  const progress = totalSize > 0 ? (loadedSize / totalSize) * 100 : 0;
  const loadedChunks = loadingChunks.filter(c => c.status === 'loaded').length;
  const totalChunks = loadingChunks.length;

  return (
    <div className={`progressive-loader ${className}`} dir="ltr">
      {isLoading && !loadedData && (
        <div className="space-y-4">
          {/* Document preview skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {documentType === 'pdf' && (
              <div className="space-y-4">
                <LoadingSkeleton height={300} variant="rounded" />
                <div className="flex justify-center space-x-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <LoadingSkeleton key={i} height={20} width={20} variant="circular" />
                  ))}
                </div>
              </div>
            )}

            {documentType === 'image' && (
              <LoadingSkeleton height={400} variant="rounded" />
            )}

            {documentType === 'text' && (
              <div className="space-y-3">
                <LoadingSkeleton height={20} lines={15} />
              </div>
            )}
          </div>

          {/* Progress indicator */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Loading Document
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {Math.round(progress)}%
              </span>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                {loadedChunks} of {totalChunks} chunks loaded
              </span>
              <span>
                {(loadedSize / 1024).toFixed(1)} KB of {(totalSize / 1024).toFixed(1)} KB
              </span>
            </div>

            {/* Chunk status visualization */}
            <div className="mt-3 flex flex-wrap gap-1">
              {loadingChunks.slice(0, 50).map((chunk) => (
                <div
                  key={chunk.id}
                  className={`w-2 h-2 rounded-sm ${
                    chunk.status === 'loaded' ? 'bg-green-500' :
                    chunk.status === 'loading' ? 'bg-blue-500 animate-pulse' :
                    chunk.status === 'error' ? 'bg-red-500' :
                    'bg-gray-300 dark:bg-gray-600'
                  }`}
                  title={`Chunk ${chunk.id}: ${chunk.status}`}
                />
              ))}
              {loadingChunks.length > 50 && (
                <span className="text-xs text-gray-500 ml-2">
                  +{loadingChunks.length - 50} more
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressiveLoader;
import React, { useState, useCallback } from 'react';
import type { Document } from '@/types/domain/Document';
import type { Annotation } from '@/types/domain/DocumentViewer';

interface DownloadControlsProps {
  document: Document;
  annotations?: Annotation[];
  disabled?: boolean;
}

export const DownloadControls: React.FC<DownloadControlsProps> = ({
  document,
  annotations = [],
  disabled = false,
}) => {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadFormats = [
    {
      id: 'original',
      name: 'Original Format',
      description: `Download as ${document.type.toUpperCase()}`,
      icon: '📄',
    },
    {
      id: 'pdf',
      name: 'PDF with Annotations',
      description: 'Include all annotations and comments',
      icon: '📑',
      disabled: document.type === 'pdf' && annotations.length === 0,
    },
    {
      id: 'pdf-clean',
      name: 'Clean PDF',
      description: 'PDF without annotations',
      icon: '📋',
    },
    {
      id: 'image',
      name: 'Image (PNG)',
      description: 'Convert to high-quality image',
      icon: '🖼️',
    },
  ];

  const handleDownload = useCallback(async (format: string) => {
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // Simulate download progress
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev === null) return 10;
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      // Simulate download delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create download based on format
      const downloadUrl = document.downloadUrl;
      let filename = document.name;

      switch (format) {
        case 'pdf':
          // TODO: Implement PDF generation with annotations
          filename = document.name.replace(/\.[^/.]+$/, '_with_annotations.pdf');
          break;
        case 'pdf-clean':
          // TODO: Implement clean PDF generation
          filename = document.name.replace(/\.[^/.]+$/, '_clean.pdf');
          break;
        case 'image':
          // TODO: Implement image conversion
          filename = document.name.replace(/\.[^/.]+$/, '.png');
          break;
        default:
          // Original format
          break;
      }

      // Create download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      clearInterval(progressInterval);
      setDownloadProgress(100);

      // Reset after short delay
      setTimeout(() => {
        setDownloadProgress(null);
        setIsDownloading(false);
        setShowDownloadMenu(false);
      }, 1000);

    } catch (error) {
      console.error('Download failed:', error);
      setDownloadProgress(null);
      setIsDownloading(false);
    }
  }, [document]);

  const handlePrint = useCallback(() => {
    // TODO: Implement print functionality
    if (window.print) {
      window.print();
    } else {
      alert('Print functionality not available in this browser');
    }
  }, []);

  return (
    <div className="relative">
      {/* Download Button */}
      <button
        onClick={() => setShowDownloadMenu(!showDownloadMenu)}
        disabled={disabled || isDownloading}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Download options"
        title="Download document"
      >
        {isDownloading ? (
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </button>

      {/* Print Button */}
      <button
        onClick={handlePrint}
        disabled={disabled || isDownloading}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-1"
        aria-label="Print document"
        title="Print document"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
      </button>

      {/* Download Menu */}
      {showDownloadMenu && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
              Download Options
            </div>

            {downloadFormats.map((format) => (
              <button
                key={format.id}
                onClick={() => handleDownload(format.id)}
                disabled={disabled || isDownloading || format.disabled}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-start space-x-3"
              >
                <span className="text-lg mt-0.5">{format.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{format.name}</div>
                  <div className="text-xs text-gray-600">{format.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Download Progress */}
          {downloadProgress !== null && (
            <div className="px-3 py-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Downloading...</span>
                <span>{downloadProgress}%</span>
              </div>
              <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DownloadControls;
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import Widget from '../Widget';
import type { WidgetProps } from '../Widget';

interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'xlsx' | 'image' | 'txt';
  size: number;
  lastModified: Date;
  thumbnail?: string;
  isBookmarked: boolean;
  tags: string[];
}

interface PersonalDocumentsWidgetProps extends WidgetProps {
  documents?: Document[];
  showThumbnails?: boolean;
  maxItems?: number;
  onDocumentClick?: (document: Document) => void;
  onBookmarkToggle?: (documentId: string) => void;
}

const PersonalDocumentsWidget: React.FC<PersonalDocumentsWidgetProps> = ({
  documents = generateMockDocuments(),
  showThumbnails = true,
  maxItems = 5,
  onDocumentClick,
  onBookmarkToggle,
  ...widgetProps
}) => {
  const { t } = useTranslation('dashboard');
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<'recent' | 'bookmarked' | 'shared'>('recent');

  const getFileIcon = (type: Document['type']) => {
    const iconClasses = "w-8 h-8 p-1.5 rounded-md";

    switch (type) {
      case 'pdf':
        return (
          <div className={`${iconClasses} bg-red-100 text-red-600`}>
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'doc':
        return (
          <div className={`${iconClasses} bg-blue-100 text-blue-600`}>
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'xlsx':
        return (
          <div className={`${iconClasses} bg-green-100 text-green-600`}>
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'image':
        return (
          <div className={`${iconClasses} bg-purple-100 text-purple-600`}>
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className={`${iconClasses} bg-gray-100 text-gray-600`}>
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 10) / 10 + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const filteredDocuments = documents
    .filter(doc => {
      switch (viewMode) {
        case 'bookmarked':
          return doc.isBookmarked;
        case 'shared':
          return doc.tags.includes('shared');
        default:
          return true;
      }
    })
    .slice(0, maxItems);

  return (
    <Widget {...widgetProps}>
      <div className="space-y-4">
        {/* View Mode Tabs */}
        <div className="flex space-x-1 glass-panel p-1 rounded-lg">
          {[
            { key: 'recent', label: 'Recent', icon: '🕒' },
            { key: 'bookmarked', label: 'Bookmarked', icon: '⭐' },
            { key: 'shared', label: 'Shared', icon: '👥' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key as any)}
              className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-300 ${
                viewMode === tab.key
                  ? 'glass-strong text-white shadow-sm scale-105'
                  : 'text-white/70 hover:text-white hover:scale-105'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Documents List */}
        <div className="space-y-3">
          {filteredDocuments.map((document) => (
            <div
              key={document.id}
              className="group flex items-center space-x-3 p-2 rounded-lg glass-panel hover:scale-105 cursor-pointer transition-all duration-300"
              onClick={() => onDocumentClick?.(document)}
            >
              {/* File Icon/Thumbnail */}
              <div className="flex-shrink-0">
                {showThumbnails && document.thumbnail ? (
                  <img
                    src={document.thumbnail}
                    alt={document.name}
                    className="w-8 h-8 rounded object-cover"
                  />
                ) : (
                  getFileIcon(document.type)
                )}
              </div>

              {/* Document Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                    {document.name}
                  </p>
                  {document.isBookmarked && (
                    <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  )}
                </div>
                <div className={`flex items-center space-x-4 text-xs ${theme === 'dark' ? 'text-white/60' : 'text-white/70'}`}>
                  <span>{formatFileSize(document.size)}</span>
                  <span>•</span>
                  <span>{formatDate(document.lastModified)}</span>
                </div>
                {document.tags.length > 0 && (
                  <div className="flex space-x-1 mt-1">
                    {document.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="inline-block px-1.5 py-0.5 text-xs glass text-white/80 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {document.tags.length > 2 && (
                      <span className="text-xs text-white/50">+{document.tags.length - 2}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onBookmarkToggle?.(document.id);
                  }}
                  className="p-1 text-white/60 hover:text-yellow-400 hover:scale-110 transition-all duration-300"
                  title={document.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                >
                  <svg className="w-4 h-4" fill={document.isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle more actions menu
                  }}
                  className="p-1 text-white/60 hover:text-white/90 hover:scale-110 transition-all duration-300"
                  title="More actions"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center pt-2 border-t border-white/20">
          <button className="text-sm text-primary-300 hover:text-primary-200 hover:scale-105 font-medium transition-all duration-300">
            View All Documents
          </button>
        </div>
      </div>
    </Widget>
  );
};

// Mock data generator
function generateMockDocuments(): Document[] {
  return [
    {
      id: '1',
      name: 'Q4 Financial Report.pdf',
      type: 'pdf',
      size: 2457600,
      lastModified: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      isBookmarked: true,
      tags: ['finance', 'quarterly'],
    },
    {
      id: '2',
      name: 'Project Proposal.docx',
      type: 'doc',
      size: 1024000,
      lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      isBookmarked: false,
      tags: ['project', 'proposal'],
    },
    {
      id: '3',
      name: 'Team Budget.xlsx',
      type: 'xlsx',
      size: 512000,
      lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      isBookmarked: true,
      tags: ['budget', 'team'],
    },
    {
      id: '4',
      name: 'Marketing Analytics.pdf',
      type: 'pdf',
      size: 3145728,
      lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      isBookmarked: false,
      tags: ['marketing', 'analytics', 'shared'],
    },
    {
      id: '5',
      name: 'Product Roadmap.png',
      type: 'image',
      size: 819200,
      lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
      isBookmarked: false,
      tags: ['product', 'roadmap', 'shared'],
    },
  ];
}

export default PersonalDocumentsWidget;
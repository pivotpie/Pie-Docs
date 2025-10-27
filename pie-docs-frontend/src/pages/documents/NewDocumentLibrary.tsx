import React, { useState } from 'react';
import {
  DocumentIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import EnhancedUploadWorkflow from '@/components/documents/upload/EnhancedUploadWorkflow';
import DocumentListWithPreviews from '@/components/documents/DocumentListWithPreviews';

interface NewDocumentLibraryProps {
  openUpload?: boolean;
}

type ViewMode = 'list' | 'upload' | 'search' | 'analytics' | 'workflows' | 'admin';

const NewDocumentLibrary: React.FC<NewDocumentLibraryProps> = ({ openUpload = false }) => {
  const [viewMode, setViewMode] = useState<ViewMode>(openUpload ? 'upload' : 'list');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = (documents: any[]) => {
    console.log('Upload completed:', documents);
    // Refresh the document list
    setRefreshTrigger(prev => prev + 1);
    // Switch back to list view
    setViewMode('list');
  };

  const navigationItems = [
    { id: 'list' as ViewMode, label: 'Document Library', icon: FolderIcon },
    { id: 'upload' as ViewMode, label: 'Upload Documents', icon: CloudArrowUpIcon },
    { id: 'search' as ViewMode, label: 'Search & Analytics', icon: MagnifyingGlassIcon },
    { id: 'workflows' as ViewMode, label: 'Workflows', icon: Cog6ToothIcon },
    { id: 'analytics' as ViewMode, label: 'Analytics', icon: ChartBarIcon },
    { id: 'admin' as ViewMode, label: 'Administration', icon: WrenchScrewdriverIcon }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <DocumentIcon className="h-8 w-8 text-white" />
              <h1 className="text-xl font-bold text-white">Pie Docs</h1>
            </div>
            <div className="text-sm text-white/70">
              Document Management System
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white/5 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 py-4">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setViewMode(item.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    viewMode === item.id
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <IconComponent className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'list' && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
            <DocumentListWithPreviews
              onRefresh={refreshTrigger}
              className="min-h-[600px]"
            />
          </div>
        )}

        {viewMode === 'upload' && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Upload Documents</h2>
              <p className="text-white/70">
                Upload documents with metadata and process them to Mayan EDMS
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <EnhancedUploadWorkflow
                  onUploadComplete={handleUploadComplete}
                  className="min-h-[600px]"
                />
              </div>
            </div>
          </div>
        )}

        {viewMode === 'search' && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
            <div className="text-center py-12">
              <MagnifyingGlassIcon className="mx-auto h-16 w-16 text-white/50 mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Search & Analytics</h3>
              <p className="text-white/70">
                Advanced search and analytics features coming soon
              </p>
            </div>
          </div>
        )}

        {viewMode === 'workflows' && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
            <div className="text-center py-12">
              <Cog6ToothIcon className="mx-auto h-16 w-16 text-white/50 mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Workflows</h3>
              <p className="text-white/70">
                Document workflow management features coming soon
              </p>
            </div>
          </div>
        )}

        {viewMode === 'analytics' && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
            <div className="text-center py-12">
              <ChartBarIcon className="mx-auto h-16 w-16 text-white/50 mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Analytics</h3>
              <p className="text-white/70">
                Document analytics and reporting features coming soon
              </p>
            </div>
          </div>
        )}

        {viewMode === 'admin' && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6">
            <div className="text-center py-12">
              <WrenchScrewdriverIcon className="mx-auto h-16 w-16 text-white/50 mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Administration</h3>
              <p className="text-white/70">
                System administration features coming soon
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewDocumentLibrary;
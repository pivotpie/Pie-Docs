import React, { useState, useEffect } from 'react';
import {
  DocumentIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { documentsService } from '@/services/api/documentsService';
import type { Document, DocumentQueryParams } from '@/types/domain/Document';

interface DocumentListWithPreviewsProps {
  onRefresh?: () => void;
  className?: string;
}

const DocumentListWithPreviews: React.FC<DocumentListWithPreviewsProps> = ({
  onRefresh,
  className = ''
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    loadDocuments();
  }, [currentPage, searchQuery]);

  useEffect(() => {
    if (onRefresh) {
      loadDocuments();
    }
  }, [onRefresh]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const params: DocumentQueryParams = {
        page: currentPage,
        limit: pageSize,
        searchQuery: searchQuery || undefined,
      };

      const response = await documentsService.getDocuments(params);
      setDocuments(response.documents);
      setTotalCount(response.totalCount);
      setHasMore(response.hasMore);

      // Auto-select first document if none selected
      if (response.documents.length > 0 && !selectedDocument) {
        setSelectedDocument(response.documents[0]);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadDocuments();
  };

  const handleDownload = async (document: Document) => {
    try {
      // Open download URL in new tab
      if (document.downloadUrl) {
        window.open(document.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (type: string) => {
    return <DocumentIcon className="h-5 w-5" />;
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading && documents.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
          <p className="text-sm text-gray-600 mt-1">
            {totalCount} documents found
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex space-x-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Search
          </button>
        </form>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12">
          <DocumentIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-600">
            {searchQuery ? 'Try adjusting your search terms' : 'Upload some documents to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedDocument?.id === document.id
                      ? 'bg-blue-50 border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedDocument(document)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getFileIcon(document.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {document.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(document.dateCreated)}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          document.status === 'published' ? 'bg-green-100 text-green-800' :
                          document.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {document.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {document.type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <ChevronLeftIcon className="h-4 w-4 mr-1" />
                  Previous
                </button>

                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4 ml-1" />
                </button>
              </div>
            )}
          </div>

          {/* Document Preview */}
          <div className="lg:col-span-2">
            {selectedDocument ? (
              <div className="bg-white rounded-lg border border-gray-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {selectedDocument.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Created {formatDate(selectedDocument.dateCreated)}
                        {selectedDocument.metadata?.author && ` by ${selectedDocument.metadata.author}`}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDownload(selectedDocument)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview Content */}
                <div className="p-6">
                  <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 h-96 flex items-center justify-center">
                    <div className="text-center">
                      <DocumentIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        {selectedDocument.name}
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Document preview not available
                      </p>
                      <button
                        onClick={() => handleDownload(selectedDocument)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                        Download to View
                      </button>
                    </div>
                  </div>
                </div>

                {/* Document Metadata */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Document Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="font-medium text-gray-600">Type</dt>
                      <dd className="text-gray-900">{selectedDocument.type.toUpperCase()}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-600">Status</dt>
                      <dd className="text-gray-900 capitalize">{selectedDocument.status}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-600">Size</dt>
                      <dd className="text-gray-900">
                        {selectedDocument.size > 0 ? `${(selectedDocument.size / 1024).toFixed(1)} KB` : 'Unknown'}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-600">Last Modified</dt>
                      <dd className="text-gray-900">{formatDate(selectedDocument.dateModified)}</dd>
                    </div>
                    {selectedDocument.metadata?.description && (
                      <div className="col-span-2">
                        <dt className="font-medium text-gray-600">Description</dt>
                        <dd className="text-gray-900">{selectedDocument.metadata.description}</dd>
                      </div>
                    )}
                    {selectedDocument.metadata?.tags && selectedDocument.metadata.tags.length > 0 && (
                      <div className="col-span-2">
                        <dt className="font-medium text-gray-600">Tags</dt>
                        <dd className="text-gray-900">
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedDocument.metadata.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </dd>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 h-96 flex items-center justify-center">
                <div className="text-center">
                  <EyeIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Document</h3>
                  <p className="text-gray-600">
                    Choose a document from the list to view its details
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentListWithPreviews;
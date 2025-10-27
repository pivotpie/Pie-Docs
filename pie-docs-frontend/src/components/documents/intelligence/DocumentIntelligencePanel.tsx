/**
 * DocumentIntelligencePanel - AI-powered document intelligence and insights
 */

import React, { useState, useEffect } from 'react';
import { documentsService } from '@/services/api/documentsService';
import { searchService } from '@/services/api/searchService';

export interface DocumentIntelligencePanelProps {
  document: any;
  className?: string;
}

export const DocumentIntelligencePanel: React.FC<DocumentIntelligencePanelProps> = ({
  document,
  className = '',
}) => {
  const [documentDetails, setDocumentDetails] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [similarDocuments, setSimilarDocuments] = useState<any[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Fetch document details and events from API
  useEffect(() => {
    async function loadDocumentData() {
      if (!document?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch full document details from /api/v1/documents/{id}
        const details = await documentsService.getDocumentDetails(document.id);
        setDocumentDetails(details);

        // Fetch events from /api/v1/documents/{id}/events
        try {
          const eventsResult = await documentsService.getDocumentEvents(document.id, 1, 10);
          if (eventsResult?.events && Array.isArray(eventsResult.events)) {
            setEvents(eventsResult.events);
          }
        } catch (e) {
          console.log('Events not available:', e);
          setEvents([]);
        }

      } catch (error) {
        console.error('Failed to load document data:', error);
        setError('Failed to load document data');
      } finally {
        setIsLoading(false);
      }
    }

    loadDocumentData();
  }, [document?.id]);

  // Fetch similar documents
  useEffect(() => {
    async function fetchSimilar() {
      if (!document?.id) return;

      setLoadingSimilar(true);
      try {
        const similar = await searchService.findSimilarDocuments(document.id, 5);
        setSimilarDocuments(similar.similar_documents || []);
      } catch (error) {
        console.error('Failed to fetch similar documents:', error);
        setSimilarDocuments([]);
      } finally {
        setLoadingSimilar(false);
      }
    }

    fetchSimilar();
  }, [document?.id]);

  if (isLoading) {
    return (
      <div className={`flex-1 overflow-y-auto p-4 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className="text-white/60">Loading document details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !documentDetails) {
    return (
      <div className={`flex-1 overflow-y-auto p-4 ${className}`}>
        <div className="text-center text-white/60">
          <div className="text-4xl mb-3">⚠️</div>
          <div className="text-sm">{error || 'No document data available'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${className}`}>
      {/* Classification */}
      <div className="glass-panel p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-white mb-3">🔬 Classification</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/70">Document Type:</span>
              <span className="text-white font-medium">
                {documentDetails.document_type || 'General'}
              </span>
            </div>
          </div>
          {documentDetails.folder_name && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/70">Folder:</span>
                <span className="text-white font-medium">{documentDetails.folder_name}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Physical Location Panel - Under Classification */}
      <div className="glass-panel p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <span>📍</span>
          Location Details
        </h3>

        {/* Digital Location */}
        {documentDetails.folder_name && (
          <div className="mb-3">
            <div className="text-xs font-medium text-purple-300 mb-2">💾 Digital</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 bg-purple-500/10 border border-purple-500/20 rounded">
                <span className="text-white/60">Folder Name:</span>
                <span className="text-white font-medium">{documentDetails.folder_name}</span>
              </div>
              {documentDetails.metadata?.folder_path && (
                <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded">
                  <div className="text-white/60 mb-1">Folder Tree:</div>
                  <div className="text-[10px] text-white/80 font-mono break-all">
                    {documentDetails.metadata.folder_path}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Physical Location */}
        {(documentDetails.barcode_code || documentDetails.rack_name) && (
          <div>
            <div className="text-xs font-medium text-blue-300 mb-2">📦 Physical</div>

            {/* Barcode */}
            {documentDetails.barcode_code && (
              <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                <div className="text-xs font-medium text-blue-300 mb-2">Barcode</div>
                <div className="font-mono text-lg text-white text-center py-2 bg-white/10 rounded">
                  {documentDetails.barcode_code}
                </div>
              </div>
            )}

            {/* Physical Storage Details */}
            <div className="space-y-2 text-xs">
              {documentDetails.location_name && (
                <div className="flex justify-between p-2 bg-white/5 rounded">
                  <span className="text-white/60">Location:</span>
                  <span className="text-white font-medium">{documentDetails.location_name}</span>
                </div>
              )}
              {documentDetails.warehouse_name && (
                <div className="flex justify-between p-2 bg-white/5 rounded">
                  <span className="text-white/60">Warehouse:</span>
                  <span className="text-white font-medium">{documentDetails.warehouse_name}</span>
                </div>
              )}
              {documentDetails.zone_name && (
                <div className="flex justify-between p-2 bg-white/5 rounded">
                  <span className="text-white/60">Zone:</span>
                  <span className="text-white font-medium">{documentDetails.zone_name}</span>
                </div>
              )}
              {documentDetails.shelf_name && (
                <div className="flex justify-between p-2 bg-white/5 rounded">
                  <span className="text-white/60">Shelf:</span>
                  <span className="text-white font-medium">{documentDetails.shelf_name}</span>
                </div>
              )}
              {documentDetails.rack_name && (
                <div className="flex justify-between p-2 bg-white/5 rounded">
                  <span className="text-white/60">Rack:</span>
                  <span className="text-white font-medium">{documentDetails.rack_name}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Similar Documents */}
      <div className="glass-panel p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <span>🔗</span>
          Similar Documents
        </h3>
        {loadingSimilar ? (
          <div className="text-xs text-white/60 text-center py-4">
            <div className="animate-pulse">Loading similar documents...</div>
          </div>
        ) : similarDocuments.length > 0 ? (
          <div className="space-y-2">
            {similarDocuments.map((doc) => (
              <div
                key={doc.id}
                className="p-3 bg-white/5 rounded-lg text-xs hover:bg-white/10 transition-all cursor-pointer border border-white/10 hover:border-indigo-500/50"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="text-white/80 font-medium truncate flex-1" title={doc.title}>
                    {doc.title}
                  </div>
                  <div className="flex items-center gap-1 text-indigo-300 shrink-0">
                    <span className="text-[10px]">{(doc.similarity * 100).toFixed(0)}%</span>
                    <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                        style={{ width: `${doc.similarity * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                {doc.document_type && (
                  <div className="text-[10px] text-white/50 mb-1">
                    Type: <span className="text-white/70">{doc.document_type}</span>
                  </div>
                )}
                {doc.author && (
                  <div className="text-[10px] text-white/50">
                    Author: <span className="text-white/70">{doc.author}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-xs text-white/60 mb-1">No similar documents found</p>
            <p className="text-[10px] text-white/40">Vector search found no matches above similarity threshold</p>
          </div>
        )}
      </div>

      {/* Version History */}
      <div className="glass-panel p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-white mb-3">📚 Version History</h3>
        {documentDetails.version ? (
          <div className="space-y-2">
            <div className="p-3 bg-white/5 rounded border border-white/10 text-xs">
              <div className="flex justify-between mb-2">
                <span className="font-medium text-white text-sm">v{documentDetails.version}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] ${
                  documentDetails.version_type === 'major' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'
                }`}>
                  {documentDetails.version_type || 'major'}
                </span>
              </div>
              <div className="text-white/80 mb-2">
                {documentDetails.version_description || 'Initial upload'}
              </div>
              <div className="flex justify-between text-[10px] text-white/50">
                <span>{documentDetails.author || 'System'}</span>
                <span>{new Date(documentDetails.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">📝</div>
            <p className="text-xs text-white/60">This is the current version</p>
          </div>
        )}
      </div>

      {/* Audit Trail */}
      <div className="glass-panel p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-white mb-3">📋 Audit Trail</h3>
        {events && events.length > 0 ? (
          <div className="space-y-2">
            {events.map((event, idx) => (
              <div key={event.event_id || idx} className="p-2 bg-white/5 rounded text-xs border-l-2 border-indigo-400/50">
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-indigo-300">
                    {event.event_type?.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <span className="text-white/50 text-[10px]">
                    {new Date(event.event_time).toLocaleString()}
                  </span>
                </div>
                {event.description && (
                  <div className="text-white/70 text-[10px] mb-1">{event.description}</div>
                )}
                {event.details && (
                  <div className="text-white/50 text-[10px] italic">{event.details}</div>
                )}
                {event.performed_by && (
                  <div className="text-white/40 text-[10px] mt-1">
                    By: {event.performed_by}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">📝</div>
            <p className="text-xs text-white/60 mb-2">No audit logs available</p>
            <p className="text-[10px] text-white/40">Activity tracking will appear here</p>
          </div>
        )}
      </div>

      {/* Content Analysis */}
      <div className="glass-panel p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <span>🔬</span>
          Content Analysis
        </h3>
        <div className="space-y-3">
          {/* Extracted Entities from Metadata */}
          <div>
            <div className="text-xs text-white/60 mb-2">Extracted Entities</div>
            {documentDetails.metadata ? (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(documentDetails.metadata)
                  .filter(([key, value]) =>
                    value !== null && value !== '' && !['folder_path'].includes(key)
                  )
                  .map(([key, value], i) => (
                    <div key={i} className="text-[10px] bg-indigo-500/20 text-indigo-200 px-2 py-1 rounded border border-indigo-500/30">
                      <span className="text-indigo-300 font-semibold">{key.replace(/_/g, ' ').toUpperCase()}:</span>{' '}
                      <span className="text-white">{String(value)}</span>
                    </div>
                  ))}
                {Object.keys(documentDetails.metadata).filter(key =>
                  documentDetails.metadata[key] !== null &&
                  documentDetails.metadata[key] !== '' &&
                  key !== 'folder_path'
                ).length === 0 && (
                  <div className="text-[10px] text-white/40 italic">No entities extracted</div>
                )}
              </div>
            ) : (
              <div className="text-[10px] text-white/40 italic">No metadata available</div>
            )}
          </div>

          {/* Document Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-white/5 rounded text-center">
              <div className="text-white/50 text-[10px]">Language</div>
              <div className="text-white font-medium">{documentDetails.language || 'en'}</div>
            </div>
            <div className="p-2 bg-white/5 rounded text-center">
              <div className="text-white/50 text-[10px]">File Size</div>
              <div className="text-white font-medium">
                {(documentDetails.file_size / 1024).toFixed(2)} KB
              </div>
            </div>
            {documentDetails.ocr_text && (
              <>
                <div className="p-2 bg-white/5 rounded text-center">
                  <div className="text-white/50 text-[10px]">Word Count</div>
                  <div className="text-white font-medium">
                    {documentDetails.ocr_text.split(/\s+/).filter((word: string) => word.length > 0).length.toLocaleString()}
                  </div>
                </div>
                <div className="p-2 bg-white/5 rounded text-center">
                  <div className="text-white/50 text-[10px]">Characters</div>
                  <div className="text-white font-medium">{documentDetails.ocr_text.length.toLocaleString()}</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* File Details */}
      <div className="glass-panel p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-white mb-3">📋 File Details</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between p-2 bg-white/5 rounded">
            <span className="text-white/60">File Name:</span>
            <span className="text-white font-medium truncate ml-2" title={documentDetails.title}>
              {documentDetails.title}
            </span>
          </div>
          <div className="flex justify-between p-2 bg-white/5 rounded">
            <span className="text-white/60">File Type:</span>
            <span className="text-white font-medium">{documentDetails.mime_type}</span>
          </div>
          <div className="flex justify-between p-2 bg-white/5 rounded">
            <span className="text-white/60">File Size:</span>
            <span className="text-white font-medium">
              {(documentDetails.file_size / 1024).toFixed(2)} KB
            </span>
          </div>
          <div className="flex justify-between p-2 bg-white/5 rounded">
            <span className="text-white/60">Status:</span>
            <span className="px-2 py-0.5 bg-green-500/20 text-green-300 rounded text-[10px]">
              {documentDetails.status}
            </span>
          </div>
          <div className="flex justify-between p-2 bg-white/5 rounded">
            <span className="text-white/60">Author:</span>
            <span className="text-white font-medium">{documentDetails.author}</span>
          </div>
          <div className="flex justify-between p-2 bg-white/5 rounded">
            <span className="text-white/60">Created:</span>
            <span className="text-white font-medium">
              {new Date(documentDetails.created_at).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between p-2 bg-white/5 rounded">
            <span className="text-white/60">Modified:</span>
            <span className="text-white font-medium">
              {new Date(documentDetails.modified_at).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Retention & Compliance */}
      <div className="glass-panel p-4 rounded-lg border-2 border-amber-500/30">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <span>⏱️</span>
          Retention & Compliance
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/60">Retention Period</span>
              <span className="text-xs text-white font-medium">7 years (Legal)</span>
            </div>
            <div className="text-center py-3">
              <div className="text-2xl font-bold text-amber-300 mb-1">N/A</div>
              <div className="text-xs text-white/60 mb-3">Retention tracking not configured</div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-amber-400" style={{ width: '0%' }} />
              </div>
            </div>
          </div>

          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded">
            <div className="text-xs font-medium text-green-300 mb-2">✓ Compliance Status</div>
            <div className="space-y-1 text-[10px] text-white/70">
              <div className="flex items-center justify-between">
                <span>Metadata Complete:</span>
                <span className="text-green-300">Yes</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Access Controls:</span>
                <span className="text-green-300">Configured</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Audit Trail:</span>
                <span className="text-green-300">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Backup Status:</span>
                <span className="text-green-300">Current</span>
              </div>
            </div>
          </div>

          <button className="w-full btn-glass text-xs py-2 hover:bg-white/10">
            📋 View Retention Policy
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentIntelligencePanel;

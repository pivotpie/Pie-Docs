import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { Document } from '@/types/domain/Document';
import { documentsService } from '@/services/api/documentsService';
import { warehouseService } from '@/services/api/warehouseService';

interface ComprehensiveDocumentPreviewProps {
  document: Document;
  onClose?: () => void;
}

type TabId = 'preview' | 'properties' | 'metadata' | 'ocr' | 'versions' | 'comments' | 'files' | 'events' | 'tags' | 'acls' | 'workflow' | 'location' | 'movements';

const ComprehensiveDocumentPreview: React.FC<ComprehensiveDocumentPreviewProps> = ({
  document,
  onClose
}) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>('preview');
  const [ocrResults, setOcrResults] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [physicalLocation, setPhysicalLocation] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tabs configuration
  const tabs: Array<{id: TabId; label: string; icon: string}> = [
    { id: 'preview', label: 'Preview', icon: '👁️' },
    { id: 'properties', label: 'Properties', icon: 'ℹ️' },
    { id: 'metadata', label: 'Metadata', icon: '🗂️' },
    { id: 'ocr', label: 'OCR Results', icon: '📝' },
    { id: 'versions', label: 'Versions', icon: '📊' },
    { id: 'comments', label: 'Comments', icon: '💬' },
    { id: 'location', label: 'Physical Location', icon: '📍' },
    { id: 'movements', label: 'Movement History', icon: '🚚' },
    { id: 'files', label: 'Files', icon: '🗄️' },
    { id: 'events', label: 'Events', icon: '📋' },
    { id: 'tags', label: 'Tags', icon: '🏷️' },
    { id: 'acls', label: 'Permissions', icon: '🔒' },
    { id: 'workflow', label: 'Workflow', icon: '🔄' },
  ];

  // Load real data from APIs
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Load OCR results
        try {
          const ocrData = await documentsService.getDocumentOCR(document.id);
          if (ocrData.has_ocr && ocrData.extracted_text) {
            setOcrResults({
              text: ocrData.extracted_text,
              confidence: ocrData.confidence || 0,
              language: ocrData.language || 'en',
              extractedAt: ocrData.result_created_at || new Date().toISOString(),
              pageCount: ocrData.page_count,
              wordCount: ocrData.word_count,
              jobStatus: ocrData.job_status,
            });
          } else {
            setOcrResults(null);
          }
        } catch (err) {
          console.warn('Failed to load OCR results:', err);
          setOcrResults(null);
        }

        // Load document events
        try {
          const eventsData = await documentsService.getDocumentEvents(document.id, 1, 50);
          if (eventsData.events && eventsData.events.length > 0) {
            setEvents(eventsData.events.map((event: any) => ({
              id: event.event_id,
              type: event.event_type,
              user: event.performed_by,
              date: new Date(event.event_time).toLocaleString(),
              details: event.description,
              rawDetails: event.details,
            })));
          } else {
            setEvents([]);
          }
        } catch (err) {
          console.warn('Failed to load document events:', err);
          setEvents([]);
        }

        // Load physical location and movements
        try {
          const physicalDoc = await warehouseService.getPhysicalDocumentByDigitalId(document.id);
          setPhysicalLocation(physicalDoc);

          // Load movement history
          const movementsData = await warehouseService.getDocumentMovements(document.id);
          setMovements(movementsData || []);
        } catch (err) {
          console.warn('Failed to load physical location:', err);
          setPhysicalLocation(null);
          setMovements([]);
        }

        // TODO: Load versions from backend when API is available
        // For now, use empty array
        setVersions([]);

        // TODO: Load comments from backend when API is available
        // For now, use empty array
        setComments([]);

      } catch (err) {
        console.error('Error loading document details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load document details');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [document.id]);

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'preview':
        return (
          <div className="flex items-center justify-center h-full bg-white/5 rounded-lg">
            <div className="text-center">
              <div className="text-6xl mb-4">{document.type === 'pdf' ? '📄' : '📊'}</div>
              <h3 className="text-xl font-semibold text-white mb-2">{document.name}</h3>
              <p className="text-white/60">Document preview will be displayed here</p>
              <p className="text-sm text-white/40 mt-2">Type: {document.type.toUpperCase()}</p>
            </div>
          </div>
        );

      case 'properties':
        return (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Document Properties</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-white/60 mb-1">Name</div>
                  <div className="text-white">{document.name}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Type</div>
                  <div className="text-white">{document.type.toUpperCase()}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Size</div>
                  <div className="text-white">{(document.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Created</div>
                  <div className="text-white">{new Date(document.dateCreated).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Modified</div>
                  <div className="text-white">{new Date(document.dateModified).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Author</div>
                  <div className="text-white">{document.metadata?.author || 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Version</div>
                  <div className="text-white">v{document.metadata?.version || 1}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Language</div>
                  <div className="text-white">{document.metadata?.language?.toUpperCase() || 'EN'}</div>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Storage Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-white/60 mb-1">Path</div>
                  <div className="text-white font-mono text-sm">{document.path}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Status</div>
                  <div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      document.status === 'published' ? 'bg-green-500/20 text-green-300' :
                      document.status === 'draft' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {document.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'metadata':
        return (
          <div className="space-y-4">
            <div className="glass-panel p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Document Metadata</h3>
              <div className="space-y-3">
                {document.metadata?.description && (
                  <div>
                    <div className="text-sm text-white/60 mb-1">Description</div>
                    <div className="text-white">{document.metadata.description}</div>
                  </div>
                )}
                {document.metadata?.keywords && document.metadata.keywords.length > 0 && (
                  <div>
                    <div className="text-sm text-white/60 mb-2">Keywords</div>
                    <div className="flex flex-wrap gap-2">
                      {document.metadata.keywords.map((keyword, idx) => (
                        <span key={idx} className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-sm">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {document.metadata?.customFields && Object.keys(document.metadata.customFields).length > 0 && (
                  <div>
                    <div className="text-sm text-white/60 mb-2">Custom Fields</div>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(document.metadata.customFields).map(([key, value]) => (
                        <div key={key} className="bg-white/5 p-3 rounded">
                          <div className="text-xs text-white/60">{key}</div>
                          <div className="text-white text-sm">{String(value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'ocr':
        return (
          <div className="space-y-4">
            <div className="glass-panel p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">OCR Results</h3>
                {ocrResults && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/60">Confidence:</span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-sm font-medium">
                      {(ocrResults.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              {ocrResults ? (
                <div className="space-y-4">
                  <div className="bg-white/5 p-4 rounded-lg font-mono text-sm text-white whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {ocrResults.text}
                  </div>
                  <div className="flex gap-4 text-sm text-white/60">
                    <div>Language: {ocrResults.language.toUpperCase()}</div>
                    <div>Extracted: {new Date(ocrResults.extractedAt).toLocaleString()}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-white/60">
                  No OCR results available for this document
                </div>
              )}
            </div>
          </div>
        );

      case 'versions':
        return (
          <div className="space-y-4">
            <div className="glass-panel p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Version History</h3>
              <div className="space-y-3">
                {versions.map((version) => (
                  <div key={version.id} className="bg-white/5 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-sm font-medium">
                          {version.version}
                        </span>
                        <span className="text-white font-medium">{version.author}</span>
                      </div>
                      <span className="text-sm text-white/60">{version.date}</span>
                    </div>
                    <div className="text-sm text-white/70">{version.changes}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'comments':
        return (
          <div className="space-y-4">
            <div className="glass-panel p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Comments</h3>
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-white/5 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{comment.author}</span>
                      <div className="flex items-center gap-2">
                        {comment.page && (
                          <span className="text-xs bg-white/10 px-2 py-1 rounded">Page {comment.page}</span>
                        )}
                        <span className="text-sm text-white/60">{comment.date}</span>
                      </div>
                    </div>
                    <div className="text-white/80">{comment.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'files':
        return (
          <div className="glass-panel p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Document Files</h3>
            <div className="text-center py-8 text-white/60">
              Files management will be displayed here
            </div>
          </div>
        );

      case 'events':
        return (
          <div className="space-y-4">
            <div className="glass-panel p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Document Events</h3>
              <div className="space-y-2">
                {events.map((event) => (
                  <div key={event.id} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                    <div className="text-2xl">
                      {event.type === 'upload' && '⬆️'}
                      {event.type === 'ocr' && '📝'}
                      {event.type === 'view' && '👁️'}
                      {event.type === 'edit' && '✏️'}
                      {event.type === 'approve' && '✅'}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">{event.details}</div>
                      <div className="text-sm text-white/60">{event.user} • {event.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'tags':
        return (
          <div className="glass-panel p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Document Tags</h3>
            <div className="flex flex-wrap gap-2">
              {document.metadata?.tags?.map((tag, idx) => (
                <span key={idx} className="px-3 py-2 bg-indigo-500/20 text-indigo-300 rounded-lg">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        );

      case 'acls':
        return (
          <div className="glass-panel p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Access Permissions</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded">
                <span className="text-white">Can View</span>
                <span className={`text-sm ${document.permissions?.canView ? 'text-green-300' : 'text-red-300'}`}>
                  {document.permissions?.canView ? '✓ Allowed' : '✗ Denied'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded">
                <span className="text-white">Can Edit</span>
                <span className={`text-sm ${document.permissions?.canEdit ? 'text-green-300' : 'text-red-300'}`}>
                  {document.permissions?.canEdit ? '✓ Allowed' : '✗ Denied'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded">
                <span className="text-white">Can Delete</span>
                <span className={`text-sm ${document.permissions?.canDelete ? 'text-green-300' : 'text-red-300'}`}>
                  {document.permissions?.canDelete ? '✓ Allowed' : '✗ Denied'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded">
                <span className="text-white">Can Share</span>
                <span className={`text-sm ${document.permissions?.canShare ? 'text-green-300' : 'text-red-300'}`}>
                  {document.permissions?.canShare ? '✓ Allowed' : '✗ Denied'}
                </span>
              </div>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="space-y-4">
            <div className="glass-panel p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Physical Location</h3>
              {physicalLocation ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-white/60 mb-1">Physical Format</div>
                      <div className="text-white">{physicalLocation.physical_format}</div>
                    </div>
                    <div>
                      <div className="text-sm text-white/60 mb-1">Condition</div>
                      <div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          physicalLocation.condition === 'excellent' ? 'bg-green-500/20 text-green-300' :
                          physicalLocation.condition === 'good' ? 'bg-blue-500/20 text-blue-300' :
                          physicalLocation.condition === 'fair' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {physicalLocation.condition}
                        </span>
                      </div>
                    </div>
                  </div>
                  {physicalLocation.rack_id && (
                    <div className="bg-indigo-500/10 p-4 rounded-lg border border-indigo-400/30">
                      <div className="text-sm text-white/60 mb-2">Warehouse Location</div>
                      <div className="text-white font-mono">Rack ID: {physicalLocation.rack_id}</div>
                    </div>
                  )}
                  {physicalLocation.barcode_id && (
                    <div>
                      <div className="text-sm text-white/60 mb-1">Barcode</div>
                      <div className="text-white font-mono">{physicalLocation.barcode_id}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-white/60">
                  No physical location information available for this document
                </div>
              )}
            </div>
          </div>
        );

      case 'movements':
        return (
          <div className="space-y-4">
            <div className="glass-panel p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Movement History</h3>
              {movements.length > 0 ? (
                <div className="space-y-3">
                  {movements.map((movement: any) => (
                    <div key={movement.id} className="bg-white/5 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-sm font-medium">
                          {movement.movement_type}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          movement.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                          movement.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300' :
                          movement.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {movement.status}
                        </span>
                      </div>
                      <div className="text-sm text-white/70 mb-1">
                        {movement.from_rack_id && `From: ${movement.from_rack_id}`}
                        {movement.from_rack_id && movement.to_rack_id && ' → '}
                        {movement.to_rack_id && `To: ${movement.to_rack_id}`}
                      </div>
                      <div className="text-xs text-white/60">
                        Requested: {new Date(movement.requested_at).toLocaleString()}
                        {movement.requested_by && ` by ${movement.requested_by}`}
                      </div>
                      {movement.notes && (
                        <div className="text-sm text-white/60 mt-2 italic">{movement.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-white/60">
                  No movement history available for this document
                </div>
              )}
            </div>
          </div>
        );

      case 'workflow':
        return (
          <div className="glass-panel p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Workflow Status</h3>
            <div className="text-center py-8 text-white/60">
              Workflow information will be displayed here
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{document.type === 'pdf' ? '📄' : '📊'}</div>
          <div>
            <h2 className="text-xl font-bold text-white">{document.name}</h2>
            <p className="text-sm text-white/60">{document.type.toUpperCase()} • {(document.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="btn-glass p-2">
            ✕
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/50'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ComprehensiveDocumentPreview;

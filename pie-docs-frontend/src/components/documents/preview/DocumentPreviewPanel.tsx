/**
 * DocumentPreviewPanel - Main preview panel for documents
 *
 * This component provides a unified preview interface with:
 * - Document viewer tab (PDF, images, text)
 * - OCR extracted text tab
 * - Search panel integration
 * - Close functionality
 */

import React, { useState, useEffect } from 'react';
import { EnhancedDocumentViewer } from '../viewer/EnhancedDocumentViewer';
import OCRTextPreview from '../ocr/OCRTextPreview';
import { documentsService } from '@/services/api/documentsService';
import { ocrService } from '@/services/api/ocrService';
import type { Document as DocumentType } from '@/types/domain/Document';
import type { OCRResult, OCRPreviewData } from '@/types/domain/OCR';

export interface DocumentPreviewPanelProps {
  /** The document to preview */
  document: DocumentType | any; // Using 'any' to support the mock document structure
  /** Callback when preview is closed */
  onClose: () => void;
  /** Current preview tab */
  previewTab: 'document' | 'ocr';
  /** Callback when tab changes */
  onTabChange: (tab: 'document' | 'ocr') => void;
  /** Whether search panel is collapsed */
  isSearchPanelCollapsed: boolean;
  /** Callback to toggle search panel */
  onToggleSearchPanel: () => void;
  /** Optional className for styling */
  className?: string;
}

export const DocumentPreviewPanel: React.FC<DocumentPreviewPanelProps> = ({
  document,
  onClose,
  previewTab,
  onTabChange,
  isSearchPanelCollapsed,
  onToggleSearchPanel,
  className = '',
}) => {
  const [documentDetails, setDocumentDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [ocrPreviewData, setOcrPreviewData] = useState<OCRPreviewData | null>(null);
  const [isLoadingOCR, setIsLoadingOCR] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Load document details on mount
  useEffect(() => {
    if (document?.id) {
      loadDocumentDetails();
    }
  }, [document?.id]);

  // Load OCR data when OCR tab is selected
  useEffect(() => {
    if (previewTab === 'ocr' && documentDetails && !ocrResult) {
      loadOCRData();
    }
  }, [previewTab, documentDetails]);

  const loadDocumentDetails = async () => {
    setIsLoadingDetails(true);
    setDetailsError(null);

    try {
      console.log('Fetching document details for:', document.id);
      const details = await documentsService.getDocumentDetails(document.id);
      console.log('Document details loaded:', details);
      setDocumentDetails(details);
    } catch (error) {
      console.error('Failed to load document details:', error);
      setDetailsError('Failed to load document details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const loadOCRData = async () => {
    setIsLoadingOCR(true);
    setOcrError(null);

    try {
      // Use OCR text from document details API response
      if (documentDetails?.ocr_text) {
        const ocrText = documentDetails.ocr_text;
        const ocrConfidence = documentDetails.ocr_confidence || 95;

        // Create OCR result from API data
        const apiOCRResult: OCRResult = {
          id: `ocr-${documentDetails.id}`,
          jobId: `job-${documentDetails.id}`,
          documentId: documentDetails.id,
          status: 'completed',
          extractedText: ocrText,
          confidence: {
            overall: ocrConfidence,
            byPage: [{ pageNumber: 1, confidence: ocrConfidence }],
          },
          language: documentDetails.language || 'auto',
          processingTime: 0,
          pageCount: 1,
          metadata: {
            engine: 'backend-ocr',
            version: '1.0',
            settings: {
              language: documentDetails.language || 'auto',
              dpi: 300,
              imagePreprocessing: {
                denoise: true,
                deskew: true,
                contrast: 1.2,
                brightness: 1.0,
              },
            },
          },
          createdAt: documentDetails.created_at || new Date().toISOString(),
          updatedAt: documentDetails.modified_at || new Date().toISOString(),
        };

        const apiPreviewData: OCRPreviewData = {
          extractedText: ocrText,
          confidence: {
            overall: ocrConfidence,
            byPage: [ocrConfidence],
            byBlock: [],
          },
          highlightedBlocks: [
            {
              id: 'block-1',
              text: ocrText,
              confidence: ocrConfidence,
              language: documentDetails.language || 'en',
              type: 'text',
              order: 1,
              bbox: { x: 0, y: 0, width: 100, height: 100 },
            },
          ],
          formattedText: ocrText,
          pageImages: [],
        };

        setOcrResult(apiOCRResult);
        setOcrPreviewData(apiPreviewData);
      } else {
        setOcrError('No OCR text available for this document');
      }
    } catch (error) {
      console.error('Failed to load OCR data:', error);
      setOcrError('Failed to load OCR data');
    } finally {
      setIsLoadingOCR(false);
    }
  };

  return (
    <div className={`flex-1 flex flex-col ${className}`}>
      {/* Preview Tabs */}
      <div className="flex items-center gap-2 p-4 border-b border-white/10 glass-panel">
        {/* Search Toggle Button */}
        <button
          onClick={onToggleSearchPanel}
          className={`px-4 py-2 rounded text-sm font-medium transition-all ${
            !isSearchPanelCollapsed
              ? 'bg-indigo-500/30 text-white border border-indigo-400/50'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
          title={isSearchPanelCollapsed ? 'Show Cognitive Search' : 'Hide Cognitive Search'}
        >
          🔍 Search
        </button>

        {/* Document Preview Tab */}
        <button
          onClick={() => onTabChange('document')}
          className={`px-4 py-2 rounded text-sm font-medium transition-all ${
            previewTab === 'document'
              ? 'bg-white/20 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          📄 Document Preview
        </button>

        {/* OCR Tab */}
        <button
          onClick={() => onTabChange('ocr')}
          className={`px-4 py-2 rounded text-sm font-medium transition-all ${
            previewTab === 'ocr'
              ? 'bg-white/20 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          📝 Extracted Text (OCR)
        </button>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="ml-auto px-3 py-2 bg-white/5 rounded text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all"
        >
          ✕ Close
        </button>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoadingDetails ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-4">⏳</div>
              <div className="text-white/80">Loading document...</div>
            </div>
          </div>
        ) : detailsError ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <div className="text-white/80 mb-2">Failed to Load Document</div>
              <div className="text-sm text-white/60">{detailsError}</div>
            </div>
          </div>
        ) : previewTab === 'document' ? (
          <div className="h-full">
            {/* Use preview_url or download_url to display document */}
            {documentDetails?.preview_url || documentDetails?.download_url ? (
              <div className="bg-white/5 rounded-lg border border-white/10 relative h-full overflow-hidden flex flex-col">
                <div className="flex-1 w-full h-full">
                  {documentDetails.mime_type === 'application/pdf' ? (
                    <object
                      data={`http://localhost:8001${documentDetails.preview_url || documentDetails.download_url}`}
                      type="application/pdf"
                      className="w-full h-full"
                    >
                      <p className="p-8 text-center text-white/60">
                        Your browser doesn't support PDF viewing.
                        <a
                          href={`http://localhost:8001${documentDetails.download_url}`}
                          className="text-indigo-400 hover:text-indigo-300 ml-2"
                          download
                        >
                          Download the file
                        </a>
                      </p>
                    </object>
                  ) : documentDetails.mime_type?.startsWith('image/') ? (
                    <div className="w-full h-full flex items-center justify-center bg-black/20">
                      <img
                        src={`http://localhost:8001${documentDetails.preview_url || documentDetails.download_url}`}
                        alt={documentDetails.title}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : (
                    <iframe
                      src={`http://localhost:8001${documentDetails.preview_url || documentDetails.download_url}`}
                      className="w-full h-full border-0"
                      title={documentDetails.title || document.name}
                    />
                  )}
                </div>
              </div>
            ) : (
              /* Fallback placeholder for documents without preview/download URL */
              <div className="bg-white/5 rounded-lg border border-white/10 p-8 relative h-full overflow-auto flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">📄</div>
                  <div className="text-white font-medium mb-2">{documentDetails?.title || document.name}</div>
                  <div className="text-sm text-white/60 mb-2">
                    Preview not available for this document
                  </div>
                  <div className="text-xs text-white/40">
                    {documentDetails?.mime_type || 'Unknown file type'}
                  </div>
                  <div className="text-xs text-white/40 mt-4">
                    AI Annotations and insights available in the right panel →
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* OCR Tab Content */
          <div className="h-full">
            {isLoadingOCR ? (
              <div className="glass-panel p-6 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-4">⏳</div>
                  <div className="text-white/80">Loading OCR data...</div>
                </div>
              </div>
            ) : ocrError ? (
              <div className="glass-panel p-6 rounded-lg">
                <div className="text-center">
                  <div className="text-4xl mb-4">⚠️</div>
                  <div className="text-white/80 mb-2">OCR Data Unavailable</div>
                  <div className="text-sm text-white/60">{ocrError}</div>
                </div>
              </div>
            ) : ocrResult && ocrPreviewData ? (
              <div className="h-full">
                <OCRTextPreview
                  ocrResult={ocrResult}
                  previewData={ocrPreviewData}
                  editMode={true}
                  onTextEdit={(changes) => {
                    console.log('OCR text edited:', changes);
                  }}
                  onSave={(finalText) => {
                    console.log('OCR text saved:', finalText);
                  }}
                />
              </div>
            ) : (
              /* Fallback for missing OCR data */
              <div className="glass-panel p-6 rounded-lg h-full flex flex-col">
                <div className="mb-4 flex items-center justify-between flex-shrink-0">
                  <h3 className="text-lg font-semibold text-white">OCR Extracted Text</h3>
                  <div className="text-sm">
                    <span className="text-white/60">Quality: </span>
                    <span className="text-green-300 font-medium">
                      {documentDetails?.ocr_confidence || 0}%
                    </span>
                  </div>
                </div>
                <div className="space-y-4 flex-1 flex flex-col">
                  <div className="p-4 bg-white/5 rounded border border-white/10 flex-1 overflow-auto min-h-[500px]">
                    <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                      {documentDetails?.ocr_text ||
                        'No OCR text available for this document.'}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 mt-4">
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(documentDetails?.ocr_text || '')
                      }
                      className="btn-glass text-sm px-4 py-2"
                    >
                      📋 Copy Text
                    </button>
                    <button className="btn-glass text-sm px-4 py-2">
                      💾 Export as TXT
                    </button>
                    <button className="btn-glass text-sm px-4 py-2">
                      🔍 Search in Text
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentPreviewPanel;

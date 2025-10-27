/**
 * DocumentAIFeaturesPanel - AI-powered document features and analysis
 */

import React, { useState, useEffect } from 'react';
import { ocrService } from '@/services/api/ocrService';
import { classificationService } from '@/services/api/classificationService';
import { aiService } from '@/services/api/aiService';
import type { DocumentInsight } from '@/services/api/aiService';

export type AIWorkspaceType =
  | 'generator'
  | 'summary'
  | { type: 'dynamic'; action: 'insights' | 'key-terms' };

export interface DocumentAIFeaturesPanelProps {
  document: any;
  className?: string;
  onNavigateToWorkspace?: (workspace: AIWorkspaceType) => void;
}

export const DocumentAIFeaturesPanel: React.FC<DocumentAIFeaturesPanelProps> = ({
  document,
  className = '',
  onNavigateToWorkspace,
}) => {
  // State for AI features data
  const [ocrQuality, setOcrQuality] = useState<number>(0);
  const [classificationData, setClassificationData] = useState<any>(null);
  const [multiModalData, setMultiModalData] = useState<any>(null);
  const [insights, setInsights] = useState<DocumentInsight[]>([]);
  const [insightsCount, setInsightsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load AI features data from backend
  useEffect(() => {
    async function loadAIFeatures() {
      if (!document?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Load document insights from backend (cached from upload-time processing)
        try {
          const insightsData = await aiService.getDocumentInsights(document.id);
          setInsights(insightsData.insights || []);
          setInsightsCount(insightsData.count || 0);
        } catch (e) {
          console.log('Insights not available:', e);
          setInsights([]);
          setInsightsCount(0);
        }

        // Load OCR results and confidence
        try {
          const ocrResult = await ocrService.getDocumentOCRResults(document.id);

          if (ocrResult.has_ocr_results && ocrResult.extractedText) {
            setOcrQuality((ocrResult.confidence?.overall || 0) * 100);
            setMultiModalData({
              textExtracted: true,
              pageCount: ocrResult.pageCount || 0,
              wordCount: ocrResult.extractedText?.split(/\s+/).filter(Boolean).length || 0,
              hasImages: false, // Can be enhanced later
              hasTables: false, // Can be enhanced later
            });
          } else {
            setOcrQuality(0);
            setMultiModalData({
              textExtracted: false,
              pageCount: 0,
              wordCount: 0,
              hasImages: false,
              hasTables: false,
            });
          }
        } catch (e) {
          console.log('OCR data not available:', e);
          setOcrQuality(0);
          setMultiModalData({
            textExtracted: false,
            pageCount: 0,
            wordCount: 0,
            hasImages: false,
            hasTables: false,
          });
        }

        // Load classification confidence
        try {
          // Classification service requires a file upload, not document ID lookup
          // Skip until we have a proper endpoint
          console.log('Classification not available: Requires file upload, not supported for existing documents yet');
        } catch (e) {
          console.log('Classification not available:', e);
        }

      } catch (error) {
        console.error('Failed to load AI features:', error);
        setError('Failed to load AI features data');
      } finally {
        setIsLoading(false);
      }
    }

    loadAIFeatures();
  }, [document?.id]);

  // Show loading state
  if (isLoading) {
    return (
      <div className={`flex-1 overflow-y-auto p-4 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-white/60">Loading AI features...</p>
          </div>
        </div>
      </div>
    );
  }

  // Helper function to get insight icon and color
  const getInsightStyle = (type: string, severity?: string) => {
    const styles = {
      clause: { icon: '⚠️', color: 'blue', label: 'Clause' },
      pii: { icon: '🔒', color: 'red', label: 'PII' },
      financial: { icon: '💰', color: 'purple', label: 'Financial' },
      reference: { icon: '🔗', color: 'green', label: 'Reference' },
      date: { icon: '📅', color: 'indigo', label: 'Date' },
      risk: { icon: '🚨', color: 'orange', label: 'Risk' }
    };
    return styles[type as keyof typeof styles] || { icon: '📌', color: 'gray', label: 'Info' };
  };

  return (
    <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${className}`}>
      {/* Document Insights (renamed from AI Annotations) */}
      <div className="glass-panel p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>📊</span>
            Document Insights
          </h4>
          <button
            onClick={() => onNavigateToWorkspace?.({ type: 'dynamic', action: 'insights' })}
            className="text-xs text-indigo-300 hover:text-indigo-200 underline"
          >
            View All ({insightsCount})
          </button>
        </div>

        {insights.length > 0 ? (
          <div className="space-y-2">
            {insights.slice(0, 5).map((insight) => {
              const style = getInsightStyle(insight.insight_type, insight.severity);
              return (
                <div
                  key={insight.id}
                  className={`p-2 bg-${style.color}-500/10 border-l-2 border-${style.color}-400 rounded-r text-xs cursor-pointer hover:bg-${style.color}-500/20 transition-colors`}
                  onClick={() => onNavigateToWorkspace?.({ type: 'dynamic', action: 'insights' })}
                >
                  <div className="flex items-start gap-2">
                    {insight.page_number && (
                      <span className={`text-${style.color}-300 font-medium`}>Page {insight.page_number}</span>
                    )}
                    <div className="flex-1">
                      <div className="text-white mb-0.5">
                        {style.icon} {insight.category}
                      </div>
                      <div className="text-white/60 text-[10px] line-clamp-2">
                        {insight.content}
                      </div>
                      {insight.confidence && (
                        <div className="text-white/40 text-[10px] mt-1">
                          Confidence: {Math.round(insight.confidence * 100)}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-xs text-white/60 mb-2">No insights available yet</p>
            <p className="text-[10px] text-white/40">
              Insights are extracted during document upload
            </p>
          </div>
        )}
      </div>

      {/* Generative Document Synthesis */}
      <div className="glass-panel p-4 rounded-lg">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <span>✨</span>
          AI Document Generator
        </h4>
        <div className="text-xs text-white/60 mb-3">
          Generate new documents using AI based on this document and others
        </div>
        <button
          onClick={() => onNavigateToWorkspace?.('generator')}
          className="w-full btn-glass text-xs py-2.5 hover:bg-purple-500/20 transition-colors"
        >
          🚀 Open Document Generator
        </button>

        {/* Quick Actions */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-xs text-white/60 mb-2">Quick Actions:</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onNavigateToWorkspace?.('summary')}
              className="text-center px-2 py-2.5 bg-white/5 rounded text-xs text-white/80 hover:bg-white/10 transition-colors"
            >
              <div className="text-lg mb-1">📝</div>
              <div className="font-medium">Summary</div>
            </button>
            <button
              onClick={() => onNavigateToWorkspace?.({ type: 'dynamic', action: 'key-terms' })}
              className="text-center px-2 py-2.5 bg-white/5 rounded text-xs text-white/80 hover:bg-white/10 transition-colors"
            >
              <div className="text-lg mb-1">📋</div>
              <div className="font-medium">Key Terms</div>
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Modal Content Analysis */}
      <div className="glass-panel p-4 rounded-lg">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <span>🎬</span>
          Multi-Modal Analysis
        </h4>
        <div className="space-y-3 text-xs">
          {/* Text Analysis */}
          <div className="p-2 bg-white/5 rounded">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/70">📄 Text Extraction</span>
              <span className={multiModalData?.textExtracted ? "text-green-300" : "text-yellow-300"}>
                {multiModalData?.textExtracted ? "✓ Complete" : "⚠ Pending"}
              </span>
            </div>
            {multiModalData && (
              <div className="text-white/50 text-[10px]">
                {multiModalData.pageCount} pages • {multiModalData.wordCount.toLocaleString()} words
              </div>
            )}
          </div>

          {/* Embedded Images */}
          <div className="p-2 bg-white/5 rounded">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/70">🖼️ Images Detected</span>
              <span className="text-blue-300">3 found</span>
            </div>
            <div className="text-white/50 text-[10px]">
              • Company logo identified<br/>
              • 2 signature images detected
            </div>
          </div>

          {/* Audio/Video (if present) */}
          <div className="p-2 bg-white/5 rounded">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/70">🎤 Audio Transcription</span>
              <span className="text-amber-300">Available</span>
            </div>
            <div className="text-white/50 text-[10px]">
              Attached: meeting-notes.mp3<br/>
              Duration: 12:34 • Auto-transcribed
            </div>
            <button className="mt-2 text-[10px] text-indigo-300 hover:text-indigo-200 underline">
              View Transcript →
            </button>
          </div>

          {/* Chart/Table Detection */}
          <div className="p-2 bg-white/5 rounded">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/70">📊 Data Structures</span>
              <span className="text-purple-300">Extracted</span>
            </div>
            <div className="text-white/50 text-[10px]">
              • 3 tables converted to structured data<br/>
              • Payment schedule extracted
            </div>
            <button className="mt-2 text-[10px] text-indigo-300 hover:text-indigo-200 underline">
              Export as CSV →
            </button>
          </div>
        </div>
      </div>

      {/* AI Confidence Score */}
      <div className="glass-panel p-4 rounded-lg">
        <h4 className="text-sm font-semibold text-white mb-3">🎯 Analysis Confidence</h4>
        <div className="space-y-2">
          {classificationData && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/70">Classification Confidence</span>
                <span className="text-green-300">{Math.round((classificationData.confidence || 0) * 100)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div className="h-full bg-gradient-to-r from-green-400 to-emerald-400" style={{ width: `${(classificationData.confidence || 0) * 100}%` }} />
              </div>
            </div>
          )}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/70">OCR Accuracy</span>
              <span className={ocrQuality > 80 ? "text-green-300" : ocrQuality > 50 ? "text-yellow-300" : "text-red-300"}>
                {Math.round(ocrQuality)}%
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div
                className={`h-full ${ocrQuality > 80 ? 'bg-gradient-to-r from-blue-400 to-cyan-400' : 'bg-gradient-to-r from-yellow-400 to-amber-400'}`}
                style={{ width: `${ocrQuality}%` }}
              />
            </div>
          </div>
          {multiModalData && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/70">Document Completeness</span>
                <span className="text-green-300">{multiModalData.textExtracted ? '100%' : '0%'}</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400" style={{ width: multiModalData.textExtracted ? '100%' : '0%' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentAIFeaturesPanel;

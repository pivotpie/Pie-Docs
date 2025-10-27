/**
 * SummaryViewerWorkspace - Full-page document summary viewer
 * Displays AI-generated summary from upload-time processing
 */

import React, { useState, useEffect } from 'react';
import type { DocumentSummary } from '@/services/api/aiService';
import { aiService } from '@/services/api/aiService';

export interface SummaryViewerWorkspaceProps {
  document: any;
  onBack: () => void;
  className?: string;
}

export const SummaryViewerWorkspace: React.FC<SummaryViewerWorkspaceProps> = ({
  document,
  onBack,
  className = '',
}) => {
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [customSummary, setCustomSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'default' | 'custom'>('default');

  useEffect(() => {
    loadSummary();
  }, [document.id]);

  const loadSummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const summaryData = await aiService.getDocumentSummary(document.id);
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to load summary:', err);
      setError('No summary available for this document');
    } finally {
      setIsLoading(false);
    }
  };

  const generateCustomSummary = async (length: 'short' | 'medium' | 'long') => {
    setIsGeneratingCustom(true);
    setError(null);
    setActiveTab('custom');

    try {
      const result = await aiService.createCustomSummary(document.id, length);
      setCustomSummary(result.summary);
    } catch (err) {
      console.error('Failed to generate custom summary:', err);
      setError('Failed to generate custom summary');
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Show toast notification
  };

  const handleExportAsPDF = () => {
    // TODO: Implement PDF export
    console.log('Export as PDF');
  };

  if (isLoading) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-white/60">Loading summary...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with Breadcrumb */}
      <div className="flex-shrink-0 border-b border-white/10 glass-panel p-4">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Back to Preview"
          >
            <span className="text-white/70">←</span>
          </button>
          <div className="flex-1">
            <div className="text-xs text-white/40 mb-1">
              Document Preview / AI Tools
            </div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span>📝</span>
              Document Summary
            </h2>
          </div>
        </div>
        <p className="text-xs text-white/60 ml-11">
          AI-generated summary of <span className="font-medium text-white">{document.name}</span>
        </p>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Sidebar: Actions */}
        <div className="w-64 border-r border-white/10 overflow-y-auto p-4">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-3">Summary Types</h3>
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('default')}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all ${
                  activeTab === 'default'
                    ? 'bg-indigo-500/20 border border-indigo-500/40 text-white'
                    : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="font-medium">Default Summary</div>
                <div className="text-[10px] text-white/50 mt-0.5">
                  Generated at upload
                </div>
              </button>
              <button
                onClick={() => setActiveTab('custom')}
                disabled={!customSummary}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  activeTab === 'custom'
                    ? 'bg-purple-500/20 border border-purple-500/40 text-white'
                    : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="font-medium">Custom Summary</div>
                <div className="text-[10px] text-white/50 mt-0.5">
                  {customSummary ? 'Generated' : 'Not generated'}
                </div>
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-3">Generate Custom</h3>
            <div className="space-y-2">
              <button
                onClick={() => generateCustomSummary('short')}
                disabled={isGeneratingCustom}
                className="w-full btn-glass text-xs py-2.5 hover:bg-white/10 disabled:opacity-50"
              >
                📄 Short Summary
              </button>
              <button
                onClick={() => generateCustomSummary('medium')}
                disabled={isGeneratingCustom}
                className="w-full btn-glass text-xs py-2.5 hover:bg-white/10 disabled:opacity-50"
              >
                📋 Medium Summary
              </button>
              <button
                onClick={() => generateCustomSummary('long')}
                disabled={isGeneratingCustom}
                className="w-full btn-glass text-xs py-2.5 hover:bg-white/10 disabled:opacity-50"
              >
                📚 Detailed Summary
              </button>
            </div>
            {isGeneratingCustom && (
              <div className="mt-3 p-2 bg-purple-500/10 border border-purple-500/20 rounded text-xs text-center text-purple-300">
                <span className="animate-pulse">Generating with AI...</span>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Export</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleCopyToClipboard(activeTab === 'default' ? summary?.summary_text || '' : customSummary)}
                className="w-full btn-glass text-xs py-2.5 hover:bg-white/10"
              >
                📋 Copy to Clipboard
              </button>
              <button
                onClick={handleExportAsPDF}
                className="w-full btn-glass text-xs py-2.5 hover:bg-white/10"
              >
                💾 Export as PDF
              </button>
            </div>
          </div>
        </div>

        {/* Main Content: Summary Display */}
        <div className="flex-1 overflow-y-auto p-8">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-lg font-semibold text-white mb-2">No Summary Available</h3>
                <p className="text-sm text-white/60 mb-4">{error}</p>
                <button
                  onClick={() => generateCustomSummary('medium')}
                  className="btn-glass px-4 py-2 text-sm hover:bg-purple-500/20"
                >
                  Generate Summary Now
                </button>
              </div>
            </div>
          ) : activeTab === 'default' && summary ? (
            <div className="max-w-4xl mx-auto">
              {/* Summary Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-bold text-white">Document Summary</h3>
                  <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-medium">
                    AI Generated
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-white/50">
                  <span>Words: {summary.word_count}</span>
                  <span>•</span>
                  <span>Model: {summary.model_version}</span>
                  <span>•</span>
                  <span>Generated: {new Date(summary.generated_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Summary Content */}
              <div className="glass-panel p-8 rounded-lg mb-8">
                <div className="prose prose-invert max-w-none">
                  <div className="text-white/90 leading-relaxed whitespace-pre-wrap">
                    {summary.summary_text}
                  </div>
                </div>
              </div>

              {/* Key Points */}
              {summary.key_points && summary.key_points.length > 0 && (
                <div className="glass-panel p-6 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-4">Key Points</h4>
                  <ul className="space-y-3">
                    {summary.key_points.map((point, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 text-xs flex items-center justify-center font-medium">
                          {index + 1}
                        </span>
                        <span className="flex-1 text-sm text-white/80 leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : activeTab === 'custom' && customSummary ? (
            <div className="max-w-4xl mx-auto">
              {/* Custom Summary Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-bold text-white">Custom Summary</h3>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium">
                    AI Generated
                  </span>
                </div>
              </div>

              {/* Custom Summary Content */}
              <div className="glass-panel p-8 rounded-lg">
                <div className="prose prose-invert max-w-none">
                  <div className="text-white/90 leading-relaxed whitespace-pre-wrap">
                    {customSummary}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-lg font-semibold text-white mb-2">No Summary Generated</h3>
                <p className="text-sm text-white/60">
                  Generate a custom summary using the buttons on the left.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryViewerWorkspace;

/**
 * DocumentGeneratorWorkspace - Full-page AI document generation interface
 * Replaces preview pane for immersive document creation experience
 */

import React, { useState } from 'react';
import { aiService } from '@/services/api/aiService';
import ReactMarkdown from 'react-markdown';

export interface DocumentGeneratorWorkspaceProps {
  document: any;
  onBack: () => void;
  className?: string;
}

export const DocumentGeneratorWorkspace: React.FC<DocumentGeneratorWorkspaceProps> = ({
  document,
  onBack,
  className = '',
}) => {
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<any>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedContent('');

    try {
      const result = await aiService.generateDocument({
        prompt: prompt.trim(),
        source_document_ids: [document.id],
        document_type: 'Generated Document'
      });

      setGeneratedContent(result.content);
      setUsage(result.usage);
    } catch (err) {
      console.error('Failed to generate document:', err);
      setError('Failed to generate document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent);
      // TODO: Show toast notification
    }
  };

  const handleDownloadAsMarkdown = () => {
    if (generatedContent) {
      const blob = new Blob([generatedContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-document-${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const quickPrompts = [
    {
      label: 'Summarize for Executive',
      prompt: 'Create an executive summary of this document in 2-3 paragraphs, highlighting key points, decisions, and action items.'
    },
    {
      label: 'Draft Amendment',
      prompt: 'Draft an amendment document to extend the contract deadline by 60 days, maintaining the same terms and conditions.'
    },
    {
      label: 'Generate Cover Letter',
      prompt: 'Generate a professional cover letter for this document, suitable for formal submission.'
    },
    {
      label: 'Create Meeting Agenda',
      prompt: 'Create a meeting agenda based on the topics and action items mentioned in this document.'
    },
    {
      label: 'Extract Action Items',
      prompt: 'Extract all action items, tasks, and obligations from this document and format them as a checklist.'
    }
  ];

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
              <span>✨</span>
              AI Document Generator
            </h2>
          </div>
        </div>
        <p className="text-xs text-white/60 ml-11">
          Generate new documents using AI based on <span className="font-medium text-white">{document.name}</span>
        </p>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel: Prompt Input */}
        <div className="w-1/3 border-r border-white/10 overflow-y-auto p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-white mb-2">
              What would you like to generate?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='Example: "Draft a new vendor agreement using this document as a template, focusing on payment terms and delivery schedules..."'
              className="w-full h-48 bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>

          {/* Quick Prompts */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white mb-3">
              Quick Prompts
            </label>
            <div className="space-y-2">
              {quickPrompts.map((item, index) => (
                <button
                  key={index}
                  onClick={() => setPrompt(item.prompt)}
                  className="w-full text-left px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white transition-colors"
                >
                  <div className="font-medium mb-1">{item.label}</div>
                  <div className="text-white/50 text-[10px] line-clamp-2">{item.prompt}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full btn-glass py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-500/20 transition-colors"
          >
            {isGenerating ? (
              <>
                <span className="animate-spin inline-block mr-2">⏳</span>
                Generating...
              </>
            ) : (
              <>
                <span className="mr-2">🚀</span>
                Generate Document
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-xs">
              {error}
            </div>
          )}

          {usage && (
            <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <div className="text-xs font-medium text-indigo-300 mb-2">Token Usage</div>
              <div className="space-y-1 text-[10px] text-white/60">
                <div className="flex justify-between">
                  <span>Prompt:</span>
                  <span className="text-white">{usage.prompt_tokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completion:</span>
                  <span className="text-white">{usage.completion_tokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-medium text-white/80">
                  <span>Total:</span>
                  <span>{usage.total_tokens.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Generated Output */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {generatedContent ? (
            <>
              {/* Output Header */}
              <div className="flex-shrink-0 border-b border-white/10 p-4 bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span className="text-sm font-medium text-white">Generated Successfully</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyToClipboard}
                      className="btn-glass text-xs px-3 py-1.5 hover:bg-white/10"
                    >
                      📋 Copy
                    </button>
                    <button
                      onClick={handleDownloadAsMarkdown}
                      className="btn-glass text-xs px-3 py-1.5 hover:bg-white/10"
                    >
                      💾 Download MD
                    </button>
                  </div>
                </div>
              </div>

              {/* Generated Content Display */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose prose-invert max-w-none [&_*]:text-white">
                  <ReactMarkdown>{generatedContent}</ReactMarkdown>
                </div>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">✨</div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  AI Document Generator
                </h3>
                <p className="text-sm text-white/60 mb-4">
                  Enter a prompt on the left to generate new documents using AI.
                  The system will use the current document as context.
                </p>
                <div className="glass-panel p-4 rounded-lg text-left">
                  <div className="text-xs font-medium text-white/80 mb-2">Examples:</div>
                  <ul className="text-xs text-white/60 space-y-1 list-disc list-inside">
                    <li>Create a summary for stakeholders</li>
                    <li>Draft an amendment with specific changes</li>
                    <li>Generate a response letter</li>
                    <li>Extract action items as a checklist</li>
                    <li>Create meeting notes format</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentGeneratorWorkspace;

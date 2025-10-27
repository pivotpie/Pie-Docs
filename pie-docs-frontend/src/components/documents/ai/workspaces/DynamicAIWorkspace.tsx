/**
 * DynamicAIWorkspace - Unified dynamic AI workspace
 * Handles all dynamic LLM-powered actions (amendment, insights, key terms, etc.)
 * LLM returns structured responses that are parsed and rendered as beautiful pages
 */

import React, { useState, useEffect } from 'react';
import { aiService } from '@/services/api/aiService';
import type { DocumentInsight, DocumentKeyTerm } from '@/services/api/aiService';
import ReactMarkdown from 'react-markdown';

export type AIAction =
  | 'insights'
  | 'key-terms';

export interface DynamicAIWorkspaceProps {
  document: any;
  action: AIAction;
  onBack: () => void;
  className?: string;
}

interface ActionConfig {
  title: string;
  icon: string;
  description: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  requiresInput: boolean;
  systemPrompt: string;
}

const ACTION_CONFIGS: Record<AIAction, ActionConfig> = {
  'insights': {
    title: 'Document Insights',
    icon: '📊',
    description: 'View AI-extracted insights, clauses, and important information from upload',
    requiresInput: false,
    systemPrompt: '' // Not used - fetching from database
  },
  'key-terms': {
    title: 'Key Terms & Definitions',
    icon: '📋',
    description: 'View all key terms and definitions extracted during upload',
    requiresInput: false,
    systemPrompt: '' // Not used - fetching from database
  }
};

export const DynamicAIWorkspace: React.FC<DynamicAIWorkspaceProps> = ({
  document,
  action,
  onBack,
  className = '',
}) => {
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = ACTION_CONFIGS[action];

  useEffect(() => {
    // Auto-generate for actions that don't require input
    if (!config.requiresInput) {
      handleGenerate();
    }
  }, [action, document.id]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      // Fetch already-saved AI features from database instead of regenerating
      if (action === 'insights') {
        const response = await aiService.getDocumentInsights(document.id);

        // Format insights into structured display format
        const formattedResult = {
          title: 'Document Insights Report',
          summary: `Found ${response.count} insights extracted during document upload`,
          sections: formatInsightsIntoSections(response.insights)
        };

        setResult(formattedResult);
      } else if (action === 'key-terms') {
        const response = await aiService.getDocumentKeyTerms(document.id);

        // Format key terms into structured display format
        const formattedResult = {
          title: 'Key Terms & Definitions',
          totalTerms: response.count,
          categories: formatKeyTermsIntoCategories(response.terms)
        };

        setResult(formattedResult);
      }
    } catch (err) {
      console.error('Failed to fetch AI features:', err);
      setError('Failed to load AI features. The document may not have been processed with AI extraction yet.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper function to format insights into sections by category
  const formatInsightsIntoSections = (insights: DocumentInsight[]) => {
    const categories: Record<string, DocumentInsight[]> = {};

    insights.forEach(insight => {
      const category = insight.category || 'General';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(insight);
    });

    return Object.entries(categories).map(([heading, items]) => ({
      heading,
      items: items.map(insight => ({
        title: insight.insight_type,
        description: insight.content,
        page: insight.page_number,
        severity: insight.severity,
        action: insight.action
      }))
    }));
  };

  // Helper function to format key terms into categories
  const formatKeyTermsIntoCategories = (terms: DocumentKeyTerm[]) => {
    const categories: Record<string, DocumentKeyTerm[]> = {};

    terms.forEach(term => {
      const category = term.category || 'Other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(term);
    });

    const iconMap: Record<string, string> = {
      'legal': '⚖️',
      'financial': '💰',
      'technical': '🔧',
      'date': '📅',
      'party': '👥',
      'other': '📌'
    };

    return Object.entries(categories).map(([name, terms]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      icon: iconMap[name.toLowerCase()] || '📌',
      terms: terms.map(term => ({
        term: term.term,
        definition: term.definition,
        importance: term.importance,
        context: term.context,
        pages: term.page_references
      }))
    }));
  };

  const renderStructuredContent = (data: any) => {
    // Check if it's markdown type
    if (data.type === 'markdown') {
      return (
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown>{data.content}</ReactMarkdown>
        </div>
      );
    }

    // Render structured JSON data
    return (
      <div className="space-y-6">
        {/* Title */}
        {data.title && (
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">{data.title}</h2>
            {data.summary && (
              <p className="text-sm text-white/70 leading-relaxed">{data.summary}</p>
            )}
          </div>
        )}

        {/* Metadata Cards (for amendments, risk analysis, etc.) */}
        {data.metadata && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {data.metadata.effectiveDate && (
              <div className="glass-panel p-4 rounded-lg">
                <div className="text-xs text-white/50 mb-1">Effective Date</div>
                <div className="text-sm font-medium text-white">{data.metadata.effectiveDate}</div>
              </div>
            )}
            {data.metadata.partiesAffected && (
              <div className="glass-panel p-4 rounded-lg">
                <div className="text-xs text-white/50 mb-1">Parties Affected</div>
                <div className="text-sm font-medium text-white">
                  {data.metadata.partiesAffected.join(', ')}
                </div>
              </div>
            )}
            {data.metadata.changesSummary && (
              <div className="glass-panel p-4 rounded-lg">
                <div className="text-xs text-white/50 mb-1">Changes</div>
                <div className="text-sm font-medium text-white">
                  {data.metadata.changesSummary.length} modifications
                </div>
              </div>
            )}
          </div>
        )}

        {/* Risk Score / Compliance Score */}
        {(data.riskScore !== undefined || data.complianceScore !== undefined) && (
          <div className="glass-panel p-6 rounded-lg mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  {data.riskScore !== undefined ? 'Overall Risk Score' : 'Compliance Score'}
                </h3>
                <p className="text-xs text-white/60">
                  {data.overallRisk || data.overallCompliance}
                </p>
              </div>
              <div className="text-4xl font-bold text-white">
                {data.riskScore || data.complianceScore}
                <span className="text-xl text-white/50">/100</span>
              </div>
            </div>
            <div className="mt-4 w-full bg-white/10 rounded-full h-2">
              <div
                className={`h-full rounded-full ${
                  (data.riskScore || data.complianceScore) > 75
                    ? 'bg-gradient-to-r from-green-400 to-emerald-400'
                    : (data.riskScore || data.complianceScore) > 50
                    ? 'bg-gradient-to-r from-yellow-400 to-amber-400'
                    : 'bg-gradient-to-r from-red-400 to-rose-400'
                }`}
                style={{ width: `${data.riskScore || data.complianceScore}%` }}
              />
            </div>
          </div>
        )}

        {/* Sections */}
        {data.sections && data.sections.map((section: any, idx: number) => (
          <div key={idx} className="glass-panel p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-4">{section.heading}</h3>

            {/* Amendment-style sections */}
            {section.content && (
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown>{section.content}</ReactMarkdown>
              </div>
            )}

            {/* Insights/Terms style items */}
            {section.items && (
              <div className="space-y-4">
                {section.items.map((item: any, itemIdx: number) => (
                  <div key={itemIdx} className="p-4 bg-white/5 rounded-lg border-l-4 border-indigo-500">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-semibold text-white">{item.title || item.term}</h4>
                      {item.severity && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.severity === 'high' || item.severity === 'critical'
                            ? 'bg-red-500/20 text-red-300'
                            : item.severity === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-green-500/20 text-green-300'
                        }`}>
                          {item.severity}
                        </span>
                      )}
                      {item.importance && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.importance === 'critical'
                            ? 'bg-red-500/20 text-red-300'
                            : item.importance === 'important'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {item.importance}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/70 mb-2">{item.description || item.definition}</p>
                    {item.action && (
                      <div className="text-xs text-indigo-300 mt-2">
                        <strong>Action:</strong> {item.action}
                      </div>
                    )}
                    {item.context && (
                      <div className="text-xs text-white/50 mt-2 italic">
                        "{item.context}"
                      </div>
                    )}
                    {item.page && (
                      <div className="text-xs text-white/40 mt-2">Page {item.page}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Risk/Clause analysis style */}
            {section.clauses && (
              <div className="space-y-4">
                {section.clauses.map((clause: any, clauseIdx: number) => (
                  <div key={clauseIdx} className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-semibold text-white">{clause.title}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        clause.impact === 'high'
                          ? 'bg-red-500/20 text-red-300'
                          : clause.impact === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : 'bg-green-500/20 text-green-300'
                      }`}>
                        {clause.impact} impact
                      </span>
                    </div>
                    <div className="text-xs text-white/60 mb-3 p-2 bg-white/5 rounded border-l-2 border-white/20">
                      {clause.text}
                    </div>
                    <p className="text-sm text-white/70 mb-2">{clause.analysis}</p>
                    {clause.recommendations && (
                      <div className="mt-3">
                        <div className="text-xs font-medium text-white/80 mb-1">Recommendations:</div>
                        <ul className="text-xs text-white/60 space-y-1">
                          {clause.recommendations.map((rec: string, recIdx: number) => (
                            <li key={recIdx}>• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Risks */}
            {section.risks && (
              <div className="space-y-4">
                {section.risks.map((risk: any, riskIdx: number) => (
                  <div key={riskIdx} className="p-4 bg-red-500/10 rounded-lg border-l-4 border-red-500">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-semibold text-white">{risk.title}</h4>
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full text-xs font-medium">
                          {risk.severity}
                        </span>
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full text-xs font-medium">
                          {risk.likelihood} likelihood
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-white/70 mb-3">{risk.description}</p>
                    <div className="mb-3">
                      <div className="text-xs font-medium text-white/80 mb-1">Impact:</div>
                      <p className="text-xs text-white/60">{risk.impact}</p>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-white/80 mb-1">Mitigation:</div>
                      <p className="text-xs text-green-300">{risk.mitigation}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Categories (for key terms) */}
        {data.categories && data.categories.map((category: any, idx: number) => (
          <div key={idx} className="glass-panel p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span>{category.icon}</span>
              {category.name}
            </h3>
            <div className="space-y-3">
              {category.terms?.map((term: any, termIdx: number) => (
                <div key={termIdx} className="p-3 bg-white/5 rounded-lg">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-sm font-semibold text-white">{term.term}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      term.importance === 'critical'
                        ? 'bg-red-500/20 text-red-300'
                        : term.importance === 'important'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {term.importance}
                    </span>
                  </div>
                  <p className="text-xs text-white/70 mb-2">{term.definition}</p>
                  {term.context && (
                    <p className="text-xs text-white/50 italic">"{term.context}"</p>
                  )}
                  {term.pages && term.pages.length > 0 && (
                    <div className="text-xs text-white/40 mt-2">
                      Pages: {term.pages.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Recommendations */}
        {data.recommendations && (
          <div className="glass-panel p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-4">Recommendations</h3>
            <div className="space-y-3">
              {data.recommendations.map((rec: any, idx: number) => (
                <div key={idx} className="p-4 bg-indigo-500/10 rounded-lg border-l-4 border-indigo-500">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-semibold text-white">{rec.action}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      rec.priority === 'high'
                        ? 'bg-red-500/20 text-red-300'
                        : rec.priority === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : 'bg-green-500/20 text-green-300'
                    }`}>
                      {rec.priority} priority
                    </span>
                  </div>
                  <p className="text-xs text-white/70">{rec.rationale}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

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
              <span>{config.icon}</span>
              {config.title}
            </h2>
          </div>
        </div>
        <p className="text-xs text-white/60 ml-11">
          {config.description} for <span className="font-medium text-white">{document.name}</span>
        </p>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel: Input (if required) */}
        {config.requiresInput && (
          <div className="w-1/3 border-r border-white/10 overflow-y-auto p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-2">
                {config.inputLabel}
              </label>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={config.inputPlaceholder}
                className="w-full h-48 bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full btn-glass py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-500/20 transition-colors"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin inline-block mr-2">⏳</span>
                  Generating with AI...
                </>
              ) : (
                <>
                  <span className="mr-2">🚀</span>
                  Generate
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-xs">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Right Panel: Result */}
        <div className={`${config.requiresInput ? 'flex-1' : 'w-full'} overflow-y-auto p-8`}>
          {isGenerating ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-white/60">Loading AI features from database...</p>
                <p className="text-xs text-white/40 mt-2">Retrieving pre-extracted data</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="text-5xl mb-4">⚠️</div>
                <h3 className="text-lg font-semibold text-white mb-2">Failed to Load AI Features</h3>
                <p className="text-sm text-white/60 mb-4">{error}</p>
                <button
                  onClick={handleGenerate}
                  className="btn-glass px-4 py-2 text-sm hover:bg-purple-500/20"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : result ? (
            <div className="max-w-5xl mx-auto">
              {renderStructuredContent(result)}
            </div>
          ) : config.requiresInput ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">{config.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{config.title}</h3>
                <p className="text-sm text-white/60">
                  Enter your requirements on the left and click Generate to begin.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default DynamicAIWorkspace;

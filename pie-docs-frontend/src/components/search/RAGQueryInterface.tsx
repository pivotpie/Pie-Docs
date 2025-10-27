import React, { useState } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';

export interface RAGQueryInterfaceProps {
  onQuery: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

const EXAMPLE_QUESTIONS = [
  "Do we have an invoice for Openpos?",
  "What invoices do we have from 2023?",
  "Show me all Google invoices",
  "What was the total amount for Envato purchases?",
  "Find invoices from Vietnam vendors",
];

export const RAGQueryInterface: React.FC<RAGQueryInterfaceProps> = ({
  onQuery,
  isLoading = false,
  placeholder = "Ask a question about your documents...",
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onQuery(query.trim());
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    onQuery(example);
  };

  return (
    <div className="space-y-4">
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            className="w-full pl-12 pr-12 py-4 glass-input text-white placeholder-white/40 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md bg-gradient-to-r from-blue-500 to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-700 transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>

      {/* Example Questions */}
      <div>
        <p className="text-xs text-white/50 mb-2">Try asking:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((example, idx) => (
            <button
              key={idx}
              onClick={() => handleExampleClick(example)}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-full border border-white/10 hover:border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start space-x-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="w-3 h-3 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white mb-1">
            AI-Powered RAG Search
          </h4>
          <p className="text-xs text-white/60">
            Ask questions in natural language. The system will search through document chunks,
            find relevant context, and generate a comprehensive answer with source attribution.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RAGQueryInterface;

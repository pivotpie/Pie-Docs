import React from 'react';
import { FileText, ExternalLink, TrendingUp } from 'lucide-react';

export interface RAGChunk {
  content: string;
  document_title: string;
  similarity: number;
  chunk_index?: number;
}

export interface RAGSource {
  title: string;
  document_type: string;
  chunks: Array<{
    content: string;
    similarity: number;
  }>;
}

export interface RAGSearchResultsProps {
  query: string;
  answer: string;
  confidence: number;
  relevant_chunks: RAGChunk[];
  sources: RAGSource[];
  timeTaken?: number;
  isLoading?: boolean;
}

export const RAGSearchResults: React.FC<RAGSearchResultsProps> = ({
  query,
  answer,
  confidence,
  relevant_chunks,
  sources,
  timeTaken,
  isLoading = false,
}) => {
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-500';
    if (conf >= 0.6) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 0.8) return 'High';
    if (conf >= 0.6) return 'Medium';
    return 'Low';
  };

  if (isLoading) {
    return (
      <div className="glass-card p-8">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="text-white/70">Generating RAG response...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Query & Metadata */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">Your Question</h3>
            <p className="text-white/80 text-sm">{query}</p>
          </div>
          <div className="flex items-center space-x-4">
            {timeTaken && (
              <span className="text-xs text-white/50">
                {timeTaken}ms
              </span>
            )}
            <div className="flex items-center space-x-2">
              <TrendingUp className={`w-5 h-5 ${getConfidenceColor(confidence)}`} />
              <span className={`text-sm font-medium ${getConfidenceColor(confidence)}`}>
                {getConfidenceLabel(confidence)} Confidence
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI-Generated Answer */}
      <div className="glass-card p-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">AI</span>
          </div>
          <h3 className="text-lg font-semibold text-white">Generated Answer</h3>
        </div>
        <div className="prose prose-invert max-w-none">
          <p className="text-white/90 leading-relaxed whitespace-pre-wrap">{answer}</p>
        </div>
      </div>

      {/* Source Documents */}
      {sources.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Sources ({sources.length})
          </h3>
          <div className="space-y-3">
            {sources.map((source, idx) => (
              <div
                key={idx}
                className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium truncate">
                        {source.title}
                      </h4>
                      <span className="text-xs text-white/50 ml-2">
                        {source.document_type}
                      </span>
                    </div>
                    <p className="text-sm text-white/60 mb-2">
                      {source.chunks.length} relevant {source.chunks.length === 1 ? 'section' : 'sections'} found
                    </p>
                    {/* Preview first chunk */}
                    {source.chunks[0] && (
                      <div className="mt-2 p-3 bg-black/20 rounded text-sm text-white/70">
                        <p className="line-clamp-2">{source.chunks[0].content}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-white/50">
                            Similarity: {(source.chunks[0].similarity * 100).toFixed(1)}%
                          </span>
                          <button className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1">
                            <span>View full document</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Relevant Chunks */}
      {relevant_chunks.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Relevant Context ({relevant_chunks.length})
          </h3>
          <div className="space-y-3">
            {relevant_chunks.map((chunk, idx) => (
              <div
                key={idx}
                className="bg-white/5 rounded-lg p-4 border border-white/10"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-medium text-blue-400">
                    {chunk.document_title}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                        style={{ width: `${chunk.similarity * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-white/50">
                      {(chunk.similarity * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-white/80 leading-relaxed">
                  {chunk.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {relevant_chunks.length === 0 && sources.length === 0 && (
        <div className="glass-card p-8 text-center">
          <p className="text-white/60">
            No relevant information found for your query.
          </p>
        </div>
      )}
    </div>
  );
};

export default RAGSearchResults;

import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

export interface DocumentChunk {
  chunk_id: string;
  document_id: string;
  document_title: string;
  document_type: string;
  content: string;
  chunk_index: number;
  similarity: number;
  metadata?: Record<string, any>;
}

export interface ChunkSearchResultsProps {
  chunks: DocumentChunk[];
  query: string;
  isLoading?: boolean;
  onDocumentClick?: (documentId: string) => void;
}

export const ChunkSearchResults: React.FC<ChunkSearchResultsProps> = ({
  chunks,
  query,
  isLoading = false,
  onDocumentClick,
}) => {
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());

  const toggleChunk = (chunkId: string) => {
    setExpandedChunks((prev) => {
      const next = new Set(prev);
      if (next.has(chunkId)) {
        next.delete(chunkId);
      } else {
        next.add(chunkId);
      }
      return next;
    });
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return 'bg-green-500';
    if (similarity >= 0.6) return 'bg-yellow-500';
    if (similarity >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getSimilarityLabel = (similarity: number) => {
    if (similarity >= 0.8) return 'Excellent match';
    if (similarity >= 0.6) return 'Good match';
    if (similarity >= 0.4) return 'Fair match';
    return 'Weak match';
  };

  if (isLoading) {
    return (
      <div className="glass-card p-8">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="text-white/70">Searching chunks...</span>
        </div>
      </div>
    );
  }

  if (chunks.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-white/60">No matching chunks found for "{query}"</p>
      </div>
    );
  }

  // Group chunks by document
  const chunksByDocument = chunks.reduce((acc, chunk) => {
    if (!acc[chunk.document_id]) {
      acc[chunk.document_id] = {
        title: chunk.document_title,
        type: chunk.document_type,
        chunks: [],
      };
    }
    acc[chunk.document_id].chunks.push(chunk);
    return acc;
  }, {} as Record<string, { title: string; type: string; chunks: DocumentChunk[] }>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Found {chunks.length} relevant chunks in {Object.keys(chunksByDocument).length} documents
        </h3>
      </div>

      {/* Group by document */}
      {Object.entries(chunksByDocument).map(([documentId, doc]) => (
        <div key={documentId} className="glass-card p-6">
          {/* Document Header */}
          <div className="flex items-start justify-between mb-4 pb-4 border-b border-white/10">
            <div className="flex items-start space-x-3 flex-1">
              <FileText className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium mb-1 truncate">{doc.title}</h4>
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-white/50">{doc.type}</span>
                  <span className="text-xs text-white/50">•</span>
                  <span className="text-xs text-white/50">
                    {doc.chunks.length} {doc.chunks.length === 1 ? 'chunk' : 'chunks'} found
                  </span>
                </div>
              </div>
            </div>
            {onDocumentClick && (
              <button
                onClick={() => onDocumentClick(documentId)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1 ml-4"
              >
                <span>View Document</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Chunks */}
          <div className="space-y-3">
            {doc.chunks.map((chunk) => {
              const isExpanded = expandedChunks.has(chunk.chunk_id);
              const displayContent = isExpanded
                ? chunk.content
                : chunk.content.slice(0, 200) + (chunk.content.length > 200 ? '...' : '');

              return (
                <div
                  key={chunk.chunk_id}
                  className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-colors"
                >
                  {/* Chunk Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-mono text-white/40">
                        Chunk #{chunk.chunk_index}
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-700 rounded-full h-1.5">
                          <div
                            className={`${getSimilarityColor(chunk.similarity)} h-1.5 rounded-full`}
                            style={{ width: `${chunk.similarity * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/70">
                          {(chunk.similarity * 100).toFixed(0)}%
                        </span>
                      </div>
                      <span className="text-xs text-white/50">
                        {getSimilarityLabel(chunk.similarity)}
                      </span>
                    </div>
                    {chunk.content.length > 200 && (
                      <button
                        onClick={() => toggleChunk(chunk.chunk_id)}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                      >
                        <span>{isExpanded ? 'Show less' : 'Show more'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Chunk Content */}
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                    {displayContent}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChunkSearchResults;

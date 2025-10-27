import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  ConversationContext,
  ConversationMessage,
  GeneratedAnswer
} from '@/types/domain/Answer';

interface ConversationHistoryManagerProps {
  conversationId?: string;
  onMessageSelect?: (message: ConversationMessage) => void;
  onConversationSelect?: (conversation: ConversationContext) => void;
  className?: string;
}

interface ConversationFilterOptions {
  timeRange: 'today' | 'week' | 'month' | 'all';
  searchQuery: string;
  hasAnswers: boolean | null;
  tags: string[];
}

export const ConversationHistoryManager: React.FC<ConversationHistoryManagerProps> = ({
  conversationId,
  onMessageSelect,
  onConversationSelect,
  className = '',
}) => {
  const [conversations, setConversations] = useState<ConversationContext[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(conversationId || null);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<ConversationFilterOptions>({
    timeRange: 'week',
    searchQuery: '',
    hasAnswers: null,
    tags: [],
  });
  const [showFilters, setShowFilters] = useState(false);

  /**
   * Load conversations from storage or API
   */
  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would fetch from an API
      // For now, we'll simulate with localStorage
      const stored = localStorage.getItem('conversation_history');
      const conversations: ConversationContext[] = stored ? JSON.parse(stored) : [];

      // Add sample data if none exists
      if (conversations.length === 0) {
        const sampleConversations = generateSampleConversations();
        localStorage.setItem('conversation_history', JSON.stringify(sampleConversations));
        setConversations(sampleConversations);
      } else {
        setConversations(conversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Generate sample conversation data for demonstration
   */
  const generateSampleConversations = (): ConversationContext[] => {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return [
      {
        id: 'conv-1',
        title: 'Document Management Workflow',
        messages: [
          {
            id: 'msg-1',
            type: 'question',
            content: 'How do I set up automated document approval workflows?',
            timestamp: dayAgo,
          },
          {
            id: 'msg-2',
            type: 'answer',
            content: 'To set up automated document approval workflows, you can use the workflow builder in the admin panel...',
            timestamp: dayAgo,
            answer: {
              id: 'answer-1',
              query: 'How do I set up automated document approval workflows?',
              content: 'To set up automated document approval workflows, you can use the workflow builder in the admin panel...',
              citations: [],
              confidence: 0.85,
              confidenceExplanation: 'High confidence based on official documentation',
              generatedAt: dayAgo,
              processingTime: 1200,
              sources: ['doc-workflow-guide', 'admin-manual'],
              relatedQuestions: ['How to customize approval stages?', 'What are approval notifications?'],
            },
          },
        ],
        createdAt: dayAgo,
        updatedAt: dayAgo,
        tags: ['workflow', 'automation', 'approval'],
        isArchived: false,
      },
      {
        id: 'conv-2',
        title: 'Search and AI Features',
        messages: [
          {
            id: 'msg-3',
            type: 'question',
            content: 'What AI features are available for document search?',
            timestamp: weekAgo,
          },
          {
            id: 'msg-4',
            type: 'answer',
            content: 'The system provides several AI-powered search features including semantic search, intelligent document classification...',
            timestamp: weekAgo,
          },
        ],
        createdAt: weekAgo,
        updatedAt: weekAgo,
        tags: ['search', 'ai', 'features'],
        isArchived: false,
      },
    ];
  };

  /**
   * Filter conversations based on current filter settings
   */
  const filteredConversations = useMemo(() => {
    let filtered = [...conversations];

    // Time range filter
    if (filters.timeRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();

      switch (filters.timeRange) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(conv => new Date(conv.updatedAt) >= cutoff);
    }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(conv =>
        conv.title.toLowerCase().includes(query) ||
        conv.messages.some(msg => msg.content.toLowerCase().includes(query)) ||
        conv.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Has answers filter
    if (filters.hasAnswers !== null) {
      filtered = filtered.filter(conv => {
        const hasAnswers = conv.messages.some(msg => msg.type === 'answer');
        return filters.hasAnswers ? hasAnswers : !hasAnswers;
      });
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(conv =>
        filters.tags.every(tag => conv.tags.includes(tag))
      );
    }

    return filtered.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [conversations, filters]);

  /**
   * Handle conversation selection
   */
  const handleConversationSelect = (conversation: ConversationContext) => {
    setSelectedConversation(conversation.id);
    onConversationSelect?.(conversation);
  };

  /**
   * Handle message selection
   */
  const handleMessageSelect = (message: ConversationMessage) => {
    onMessageSelect?.(message);
  };

  /**
   * Export conversation data
   */
  const exportConversations = useCallback(() => {
    const dataStr = JSON.stringify(filteredConversations, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `conversation-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredConversations]);

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp: Date): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else if (diffHours < 24 * 7) {
      return `${Math.floor(diffHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  /**
   * Get unique tags from all conversations
   */
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    conversations.forEach(conv => conv.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [conversations]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  if (isLoading) {
    return (
      <div className={`conversation-history-manager ${className}`}>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading conversation history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`conversation-history-manager ${className}`}>
      <div className="border border-gray-200 rounded-lg bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Conversation History
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-sm text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
              >
                Filters {showFilters ? '▼' : '▶'}
              </button>
              <button
                onClick={exportConversations}
                className="text-sm text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
              >
                Export
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-3 p-3 bg-gray-50 rounded border">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Time Range
                  </label>
                  <select
                    value={filters.timeRange}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      timeRange: e.target.value as any
                    }))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="all">All Time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Search
                  </label>
                  <input
                    type="text"
                    value={filters.searchQuery}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      searchQuery: e.target.value
                    }))}
                    placeholder="Search conversations..."
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Has Answers
                  </label>
                  <select
                    value={filters.hasAnswers === null ? 'all' : filters.hasAnswers.toString()}
                    onChange={(e) => {
                      const value = e.target.value === 'all' ? null : e.target.value === 'true';
                      setFilters(prev => ({ ...prev, hasAnswers: value }));
                    }}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  >
                    <option value="all">All</option>
                    <option value="true">With Answers</option>
                    <option value="false">Questions Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {availableTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          const newTags = filters.tags.includes(tag)
                            ? filters.tags.filter(t => t !== tag)
                            : [...filters.tags, tag];
                          setFilters(prev => ({ ...prev, tags: newTags }));
                        }}
                        className={`text-xs px-2 py-1 rounded border ${
                          filters.tags.includes(tag)
                            ? 'bg-blue-100 border-blue-300 text-blue-800'
                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Conversation List */}
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-lg mb-2">💬</div>
              <p>No conversations found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            filteredConversations.map(conversation => {
              const isSelected = selectedConversation === conversation.id;
              const messageCount = conversation.messages.length;
              const answerCount = conversation.messages.filter(m => m.type === 'answer').length;

              return (
                <div
                  key={conversation.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleConversationSelect(conversation)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {conversation.title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {messageCount} messages • {answerCount} answers
                      </p>
                      {conversation.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {conversation.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {conversation.tags.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{conversation.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="ml-3 text-xs text-gray-500">
                      {formatTimestamp(conversation.updatedAt)}
                    </div>
                  </div>

                  {/* Messages Preview */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {conversation.messages.map(message => (
                          <div
                            key={message.id}
                            className="p-2 rounded cursor-pointer hover:bg-white transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMessageSelect(message);
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                message.type === 'question' ? 'bg-blue-500' : 'bg-green-500'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-500 mb-1">
                                  {message.type === 'question' ? 'Question' : 'Answer'} • {formatTimestamp(message.timestamp)}
                                </div>
                                <p className="text-sm text-gray-800 line-clamp-2">
                                  {message.content}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationHistoryManager;
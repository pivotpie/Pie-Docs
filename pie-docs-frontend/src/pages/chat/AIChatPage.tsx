import React, { useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '@/contexts/ThemeContext';
import { searchService } from '@/services/api/searchService';
import {
  selectConversations,
  selectActiveConversation,
  selectNLPProcessing,
  createConversation,
  setActiveConversation,
  addMessage,
  setNLPProcessing,
  deleteConversation,
  clearConversations,
} from '@/store/slices/searchSlice';
import type { ConversationContext, ConversationMessage } from '@/types/domain/Search';

const AIChatPage: React.FC = () => {
  const { theme } = useTheme();
  const dispatch = useDispatch();

  // Redux state
  const conversations = useSelector(selectConversations);
  const activeConversation = useSelector(selectActiveConversation);
  const isTyping = useSelector(selectNLPProcessing);

  // Local UI state
  const [inputValue, setInputValue] = React.useState('');
  const [suggestedQueries, setSuggestedQueries] = React.useState<string[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const [showAnalytics, setShowAnalytics] = React.useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize with a default conversation if none exists or activeConversation is null
  useEffect(() => {
    if (conversations.length === 0 || !activeConversation) {
      // Only create if we truly have no conversations
      if (conversations.length === 0) {
        dispatch(createConversation({
          messages: [],
          title: 'Document Analysis',
          language: 'en',
          isActive: true,
        }));
      } else if (!activeConversation && conversations.length > 0) {
        // We have conversations but no active one, set the first as active
        dispatch(setActiveConversation(conversations[0].id));
      }
    }
  }, [conversations, activeConversation, dispatch]);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  useEffect(() => {
    // Load suggested queries when component mounts
    const loadSuggestions = async () => {
      try {
        // Use default suggestions
        setSuggestedQueries([
          "Do we have an invoice for Openpos?",
          "What invoices do we have?",
          "Show me all documents",
          "What is the total amount of invoices?",
          "Find documents from 2023",
          "Search for Google invoices",
          "What types of documents are available?",
          "List all invoice numbers"
        ]);
      } catch (error) {
        console.error('Failed to load suggestions:', error);
      }
    };
    loadSuggestions();
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !activeConversation) return;

    const query = inputValue.trim();

    // Add user message to Redux store
    dispatch(addMessage({
      type: 'user',
      content: query,
      language: activeConversation.language || 'en',
    }));

    // Update conversation title if this is the first message
    if (activeConversation.messages.length === 0) {
      // Title will be updated via the Redux state
      const titlePreview = query.slice(0, 30) + (query.length > 30 ? '...' : '');
      // We can dispatch an update here if needed, but for now the conversation keeps its original title
    }

    setInputValue('');
    dispatch(setNLPProcessing(true));

    try {
      // Process query through real RAG service
      const ragResponse = await searchService.ragQuery(query, 5);

      // Add assistant message with metadata
      dispatch(addMessage({
        type: 'assistant',
        content: ragResponse.answer,
        language: activeConversation.language || 'en',
        metadata: {
          confidence: ragResponse.confidence,
          sources: ragResponse.sources?.map(source => source.title) || [],
          entities: ragResponse.relevant_chunks?.flatMap(chunk =>
            chunk.metadata?.entities || []
          ) || [],
        },
      }));

      dispatch(setNLPProcessing(false));

    } catch (error) {
      console.error('Error processing query:', error);

      dispatch(addMessage({
        type: 'assistant',
        content: "I apologize, but I encountered an error while processing your query. Please try again or rephrase your question.",
        language: activeConversation.language || 'en',
        metadata: {
          confidence: 0.1,
        },
      }));

      dispatch(setNLPProcessing(false));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const createNewConversation = () => {
    dispatch(createConversation({
      messages: [],
      title: 'New Conversation',
      language: 'en',
      isActive: true,
    }));
  };

  const handleDeleteConversation = (conversationId: string) => {
    dispatch(deleteConversation(conversationId));
  };

  const handleClearAllConversations = () => {
    if (window.confirm('Are you sure you want to delete all conversations? This action cannot be undone.')) {
      dispatch(clearConversations());
    }
  };

  const handleExportConversation = (format: 'json' | 'txt') => {
    if (!activeConversation) return;

    const timestamp = new Date().toISOString().split('T')[0];
    let content: string;
    let filename: string;

    if (format === 'json') {
      content = JSON.stringify(activeConversation, null, 2);
      filename = `conversation-${activeConversation.id}-${timestamp}.json`;
    } else {
      content = `Conversation: ${activeConversation.title || 'Untitled'}\n`;
      content += `Created: ${new Date(activeConversation.createdAt).toLocaleString()}\n`;
      content += `Last Updated: ${new Date(activeConversation.updatedAt).toLocaleString()}\n`;
      content += `Messages: ${activeConversation.messages.length}\n\n`;
      content += '─'.repeat(80) + '\n\n';

      activeConversation.messages.forEach((msg, idx) => {
        content += `[${idx + 1}] ${msg.type.toUpperCase()} - ${new Date(msg.timestamp).toLocaleString()}\n`;
        content += `${msg.content}\n`;
        if (msg.metadata?.confidence) {
          content += `Confidence: ${Math.round(msg.metadata.confidence * 100)}%\n`;
        }
        if (msg.metadata?.sources && msg.metadata.sources.length > 0) {
          content += `Sources: ${msg.metadata.sources.join(', ')}\n`;
        }
        content += '\n' + '─'.repeat(80) + '\n\n';
      });

      filename = `conversation-${activeConversation.id}-${timestamp}.txt`;
    }

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const calculateAnalytics = () => {
    const totalMessages = conversations.reduce((acc, conv) => acc + conv.messages.length, 0);
    const totalConversations = conversations.length;
    const avgMessagesPerConversation = totalConversations > 0 ? totalMessages / totalConversations : 0;

    const allAssistantMessages = conversations.flatMap(conv =>
      conv.messages.filter(msg => msg.type === 'assistant' && msg.metadata?.confidence !== undefined)
    );

    const avgConfidence = allAssistantMessages.length > 0
      ? allAssistantMessages.reduce((acc, msg) => acc + (msg.metadata?.confidence || 0), 0) / allAssistantMessages.length
      : 0;

    return {
      totalMessages,
      totalConversations,
      avgMessagesPerConversation: avgMessagesPerConversation.toFixed(1),
      avgConfidence: Math.round(avgConfidence * 100),
      activeConversationMessages: activeConversation?.messages.length || 0,
    };
  };

  // Filtered conversations based on search
  const filteredConversations = searchQuery.trim()
    ? conversations.filter(conv =>
        (conv.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : conversations;

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportMenu && !(event.target as Element).closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  return (
    <div className="fixed inset-x-0 bottom-0 top-32 flex z-20" style={{ background: 'transparent' }}>
      {/* Sidebar */}
      <div className="w-80 glass-panel border-r border-white/20 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/20 space-y-3">
          <button
            onClick={createNewConversation}
            className="w-full flex items-center gap-3 px-4 py-3 btn-glass text-white rounded-lg transition-all hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="font-medium">New Chat</span>
          </button>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full px-4 py-2 pl-10 bg-white/10 border border-white/20 rounded-lg text-white/90 placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 p-1 hover:bg-white/10 rounded"
              >
                <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 glass hover:glass-strong text-white/80 hover:text-white rounded-lg transition-all text-xs"
              title="Analytics"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Stats
            </button>
            <div className="relative export-menu-container">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 glass hover:glass-strong text-white/80 hover:text-white rounded-lg transition-all text-xs"
                title="Export"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
              {showExportMenu && activeConversation && (
                <div className="absolute top-full mt-1 right-0 z-10 bg-gray-900 border border-white/20 rounded-lg shadow-xl p-2 min-w-[120px]">
                  <button
                    onClick={() => handleExportConversation('json')}
                    className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10 rounded transition-colors"
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => handleExportConversation('txt')}
                    className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10 rounded transition-colors"
                  >
                    Text
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleClearAllConversations}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 glass hover:bg-red-500/20 text-white/80 hover:text-red-400 rounded-lg transition-all text-xs"
              title="Clear All"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear
            </button>
          </div>
        </div>

        {/* Analytics Panel */}
        {showAnalytics && (
          <div className="p-4 border-b border-white/20 glass-strong">
            <h3 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
              <button
                onClick={() => setShowAnalytics(false)}
                className="ml-auto p-1 hover:bg-white/10 rounded"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </h3>
            {(() => {
              const analytics = calculateAnalytics();
              return (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/60">Total Conversations:</span>
                    <span className="text-white/90 font-medium">{analytics.totalConversations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Total Messages:</span>
                    <span className="text-white/90 font-medium">{analytics.totalMessages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Avg Messages/Chat:</span>
                    <span className="text-white/90 font-medium">{analytics.avgMessagesPerConversation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Avg Confidence:</span>
                    <span className={`font-medium ${
                      analytics.avgConfidence > 80 ? 'text-green-400' :
                      analytics.avgConfidence > 50 ? 'text-yellow-400' : 'text-white/90'
                    }`}>{analytics.avgConfidence}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Current Chat:</span>
                    <span className="text-white/90 font-medium">{analytics.activeConversationMessages} msgs</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2">
          {searchQuery && filteredConversations.length === 0 && (
            <div className="text-center py-8 text-white/50 text-sm">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              No conversations found
            </div>
          )}
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => dispatch(setActiveConversation(conversation.id))}
              className={`group relative p-3 mb-2 rounded-lg cursor-pointer transition-all ${
                activeConversation?.id === conversation.id
                  ? 'glass-strong border border-white/30'
                  : 'hover:glass'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white/90 truncate">
                    {conversation.title || 'New Conversation'}
                  </h3>
                  <p className="text-xs text-white/60 mt-1">
                    {conversation.messages.length} messages
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conversation.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-red-400 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="glass border-b border-white/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white/90">
                AI Document Assistant
              </h1>
              <p className="text-sm text-white/70">
                RAG-powered document analysis • Ask questions about your documents and get intelligent answers
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium glass border border-green-400/50 text-green-300">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></div>
                Online
              </span>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!activeConversation || activeConversation.messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-2xl">
                <div className="w-16 h-16 glass-card border border-blue-400/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-white/90 mb-2">
                  How can I help you today?
                </h2>
                <p className="text-white/70 mb-8">
                  I can help you search through documents, analyze content, answer questions about your document library, and assist with various document management tasks.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suggestedQueries.slice(0, 8).map((query, index) => (
                    <button
                      key={index}
                      onClick={() => setInputValue(query)}
                      className="p-3 glass-card hover:glass-strong transition-all text-left group hover:scale-105"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/30 transition-colors">
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white/90 truncate">{query}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {activeConversation?.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.type === 'assistant' && (
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                  )}
                  <div
                    className={`max-w-3xl px-4 py-3 rounded-2xl ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white ml-12'
                        : 'glass-card text-white/90'
                    }`}
                  >
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>

                    {/* Assistant message metadata */}
                    {message.type === 'assistant' && message.metadata && (
                      <div className="mt-3 pt-2 border-t border-white/20">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            {message.metadata.confidence !== undefined && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium glass border ${
                                message.metadata.confidence > 0.8
                                  ? 'border-green-400/50 text-green-300'
                                  : message.metadata.confidence > 0.5
                                  ? 'border-yellow-400/50 text-yellow-300'
                                  : 'border-white/30 text-white/70'
                              }`}>
                                {Math.round(message.metadata.confidence * 100)}% confidence
                              </span>
                            )}
                            {message.metadata.sources && message.metadata.sources.length > 0 && (
                              <span className="text-white/60">
                                Sources: {message.metadata.sources.slice(0, 2).join(', ')}
                                {message.metadata.sources.length > 2 && ` +${message.metadata.sources.length - 2} more`}
                              </span>
                            )}
                          </div>
                          <span className="text-white/60">
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* User message timestamp */}
                    {message.type === 'user' && (
                      <div className="text-xs mt-2 text-blue-100">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  {message.type === 'user' && (
                    <div className="w-8 h-8 glass border border-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="glass-card text-white/90 px-4 py-3 rounded-2xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white/5 backdrop-blur-md border-t border-white/20 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/15 transition-all">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your documents..."
                className="w-full px-4 py-3 pr-12 bg-transparent border-none outline-none resize-none text-white/90 placeholder-white/50"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '200px' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-white/40 text-center mt-2">
              AI responses are simulated. Press Enter to send, Shift+Enter for new line.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatPage;
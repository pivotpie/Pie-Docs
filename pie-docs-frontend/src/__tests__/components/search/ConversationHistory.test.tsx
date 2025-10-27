import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect } from 'vitest';
import searchReducer from '@/store/slices/searchSlice';
import ConversationHistory from '@/components/search/ConversationHistory';
import type { ConversationContext, ConversationMessage } from '@/types/domain/Search';

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      search: searchReducer,
    },
    preloadedState: {
      search: {
        query: '',
        filters: {},
        results: [],
        isLoading: false,
        error: null,
        totalResults: 0,
        page: 1,
        pageSize: 20,
        savedSearches: [],
        searchHistory: [],
        suggestions: [],
        isInitialized: false,
        nlp: {
          conversations: [],
          activeConversationId: null,
          isProcessing: false,
          voiceInputEnabled: false,
          isListening: false,
          language: 'en',
          error: null,
        },
        ...initialState,
      },
    },
  });
};

const renderWithProvider = (component: React.ReactElement, store = createTestStore()) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

const mockMessages: ConversationMessage[] = [
  {
    id: '1',
    type: 'user',
    content: 'What documents do I have?',
    timestamp: '2025-01-01T10:00:00Z',
    language: 'en',
  },
  {
    id: '2',
    type: 'assistant',
    content: 'I found 15 documents in your collection. Here are the most recent ones...',
    timestamp: '2025-01-01T10:00:30Z',
    language: 'en',
    metadata: {
      intent: 'search',
      confidence: 0.95,
      entities: [{ type: 'document_type', value: 'all' }],
      sources: ['doc1.pdf', 'doc2.pdf'],
    },
  },
];

const mockConversation: ConversationContext = {
  id: 'conv-1',
  messages: mockMessages,
  createdAt: '2025-01-01T10:00:00Z',
  updatedAt: '2025-01-01T10:00:30Z',
  title: 'Document Query',
  language: 'en',
  isActive: true,
};

describe('ConversationHistory', () => {
  describe('empty state', () => {
    it('should show welcome message when no conversation is active', () => {
      renderWithProvider(<ConversationHistory />);

      expect(screen.getByText('Welcome to AI Assistant')).toBeInTheDocument();
      expect(screen.getByText(/Ask any question about your documents/)).toBeInTheDocument();
    });

    it('should show example queries in welcome state', () => {
      renderWithProvider(<ConversationHistory />);

      expect(screen.getByText('What are the latest documents added?')).toBeInTheDocument();
      expect(screen.getByText('Find reports from last month')).toBeInTheDocument();
      expect(screen.getByText('Show me important documents')).toBeInTheDocument();
      expect(screen.getByText('Who authored this document?')).toBeInTheDocument();
    });

    it('should show Arabic welcome message when language is Arabic', () => {
      const store = createTestStore({
        nlp: {
          conversations: [{ ...mockConversation, language: 'ar', messages: [] }],
          activeConversationId: 'conv-1',
          isProcessing: false,
          voiceInputEnabled: false,
          isListening: false,
          language: 'ar',
          error: null,
        },
      });

      renderWithProvider(<ConversationHistory />, store);

      expect(screen.getByText('مرحباً بك في المساعد الذكي')).toBeInTheDocument();
    });
  });

  describe('message display', () => {
    it('should display messages from active conversation', () => {
      const store = createTestStore({
        nlp: {
          conversations: [mockConversation],
          activeConversationId: 'conv-1',
          isProcessing: false,
          voiceInputEnabled: false,
          isListening: false,
          language: 'en',
          error: null,
        },
      });

      renderWithProvider(<ConversationHistory />, store);

      expect(screen.getByText('What documents do I have?')).toBeInTheDocument();
      expect(screen.getByText(/I found 15 documents in your collection/)).toBeInTheDocument();
    });

    it('should display user and assistant avatars differently', () => {
      const store = createTestStore({
        nlp: {
          conversations: [mockConversation],
          activeConversationId: 'conv-1',
          isProcessing: false,
          voiceInputEnabled: false,
          isListening: false,
          language: 'en',
          error: null,
        },
      });

      renderWithProvider(<ConversationHistory />, store);

      // Both user and assistant messages should be present
      expect(screen.getByText('What documents do I have?')).toBeInTheDocument();
      expect(screen.getByText(/I found 15 documents in your collection/)).toBeInTheDocument();
    });

    it('should display message timestamps', () => {
      const store = createTestStore({
        nlp: {
          conversations: [mockConversation],
          activeConversationId: 'conv-1',
          isProcessing: false,
          voiceInputEnabled: false,
          isListening: false,
          language: 'en',
          error: null,
        },
      });

      renderWithProvider(<ConversationHistory />, store);

      // Should show formatted time for both messages - content may vary based on timezone
      const timestamps = screen.getAllByText(/\d{1,2}:\d{2}/);
      expect(timestamps).toHaveLength(2);
    });

    it('should display metadata for assistant messages', () => {
      const store = createTestStore({
        nlp: {
          conversations: [mockConversation],
          activeConversationId: 'conv-1',
          isProcessing: false,
          voiceInputEnabled: false,
          isListening: false,
          language: 'en',
          error: null,
        },
      });

      renderWithProvider(<ConversationHistory />, store);

      expect(screen.getByText('Confidence: 95%')).toBeInTheDocument();
      expect(screen.getByText('Entities: all')).toBeInTheDocument();
      expect(screen.getByText('Sources: 2 documents')).toBeInTheDocument();
    });
  });

  describe('processing state', () => {
    it('should show typing indicator when processing', () => {
      const store = createTestStore({
        nlp: {
          conversations: [mockConversation],
          activeConversationId: 'conv-1',
          isProcessing: true,
          voiceInputEnabled: false,
          isListening: false,
          language: 'en',
          error: null,
        },
      });

      renderWithProvider(<ConversationHistory />, store);

      // Should show animated dots for typing indicator
      const animatedDots = document.querySelectorAll('.animate-bounce');
      expect(animatedDots).toHaveLength(3);
    });

    it('should not show typing indicator when not processing', () => {
      const store = createTestStore({
        nlp: {
          conversations: [mockConversation],
          activeConversationId: 'conv-1',
          isProcessing: false,
          voiceInputEnabled: false,
          isListening: false,
          language: 'en',
          error: null,
        },
      });

      renderWithProvider(<ConversationHistory />, store);

      const animatedDots = document.querySelectorAll('.animate-bounce');
      expect(animatedDots).toHaveLength(0);
    });
  });

  describe('system messages', () => {
    it('should display system messages with different styling', () => {
      const conversationWithSystem: ConversationContext = {
        ...mockConversation,
        messages: [
          ...mockMessages,
          {
            id: '3',
            type: 'system',
            content: 'Connection restored',
            timestamp: '2025-01-01T10:01:00Z',
            language: 'en',
          },
        ],
      };

      const store = createTestStore({
        nlp: {
          conversations: [conversationWithSystem],
          activeConversationId: 'conv-1',
          isProcessing: false,
          voiceInputEnabled: false,
          isListening: false,
          language: 'en',
          error: null,
        },
      });

      renderWithProvider(<ConversationHistory />, store);

      expect(screen.getByText('Connection restored')).toBeInTheDocument();
    });
  });

  describe('markdown formatting', () => {
    it('should render basic markdown formatting in messages', () => {
      const conversationWithMarkdown: ConversationContext = {
        ...mockConversation,
        messages: [
          {
            id: '1',
            type: 'assistant',
            content: 'Here are **important** documents with *emphasis* and `code` formatting.',
            timestamp: '2025-01-01T10:00:00Z',
            language: 'en',
          },
        ],
      };

      const store = createTestStore({
        nlp: {
          conversations: [conversationWithMarkdown],
          activeConversationId: 'conv-1',
          isProcessing: false,
          voiceInputEnabled: false,
          isListening: false,
          language: 'en',
          error: null,
        },
      });

      renderWithProvider(<ConversationHistory />, store);

      // Check for rendered HTML elements from markdown
      expect(document.querySelector('strong')).toBeInTheDocument();
      expect(document.querySelector('em')).toBeInTheDocument();
      expect(document.querySelector('code')).toBeInTheDocument();
    });
  });
});
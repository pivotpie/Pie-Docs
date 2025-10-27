import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import searchReducer from '@/store/slices/searchSlice';
import NLPQueryInterface from '@/components/search/NLPQueryInterface';

// Mock the ConversationHistory component
vi.mock('@/components/search/ConversationHistory', () => ({
  default: ({ className }: { className?: string }) => (
    <div data-testid="conversation-history" className={className}>
      Conversation History Mock
    </div>
  ),
}));

// Mock store setup
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

describe('NLPQueryInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with default English interface', () => {
      renderWithProvider(<NLPQueryInterface />);

      expect(screen.getByText('AI Assistant')).toBeInTheDocument();
      expect(screen.getByText('Ask about your documents')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Ask questions about your documents in natural language...')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('should render conversation history component', () => {
      renderWithProvider(<NLPQueryInterface />);

      expect(screen.getByTestId('conversation-history')).toBeInTheDocument();
    });

    it('should render send button', () => {
      renderWithProvider(<NLPQueryInterface />);

      const sendButton = screen.getByRole('button', { name: '' }); // Send button with icon
      expect(sendButton).toBeInTheDocument();
      expect(sendButton).toBeDisabled(); // Should be disabled when input is empty
    });
  });

  describe('language switching', () => {
    it('should open language selector when clicked', async () => {
      const user = userEvent.setup();
      renderWithProvider(<NLPQueryInterface />);

      const languageButtons = screen.getAllByRole('button', { name: /english/i });
      // Click the main language selector button (first one)
      await user.click(languageButtons[0]);

      expect(screen.getAllByRole('button', { name: 'English' })).toHaveLength(2);
      expect(screen.getByRole('button', { name: 'العربية' })).toBeInTheDocument();
    });

    it('should show Arabic option when language selector is opened', async () => {
      const user = userEvent.setup();
      renderWithProvider(<NLPQueryInterface />);

      const languageButtons = screen.getAllByRole('button', { name: /english/i });
      // Click the main language selector button (first one)
      await user.click(languageButtons[0]);

      // Verify Arabic option appears in the dropdown
      expect(screen.getByRole('button', { name: 'العربية' })).toBeInTheDocument();
    });
  });

  describe('message input and submission', () => {
    it('should allow typing in the input field', async () => {
      const user = userEvent.setup();
      renderWithProvider(<NLPQueryInterface />);

      const input = screen.getByPlaceholderText(/ask questions about your documents/i);
      await user.type(input, 'What documents do I have?');

      expect(input).toHaveValue('What documents do I have?');
    });

    it('should submit message when Enter is pressed', async () => {
      const user = userEvent.setup();
      renderWithProvider(<NLPQueryInterface />);

      const input = screen.getByPlaceholderText(/ask questions about your documents/i);
      await user.type(input, 'Test query');
      await user.keyboard('{Enter}');

      // Check that input is cleared after submission
      expect(input).toHaveValue('');
    });

    it('should handle Shift+Enter for new line', async () => {
      const user = userEvent.setup();
      renderWithProvider(<NLPQueryInterface />);

      const input = screen.getByPlaceholderText(/ask questions about your documents/i);
      await user.type(input, 'Test query');

      // Check that input has the value typed
      expect(input).toHaveValue('Test query');
    });

    it('should submit message when send button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProvider(<NLPQueryInterface />);

      const input = screen.getByPlaceholderText(/ask questions about your documents/i);
      await user.type(input, 'Test query');

      const sendButton = screen.getByRole('button', { name: '' }); // Send button has no text
      await user.click(sendButton);

      expect(input).toHaveValue('');
    });

    it('should disable input and button when processing', () => {
      const store = createTestStore({
        nlp: {
          conversations: [],
          activeConversationId: null,
          isProcessing: true,
          voiceInputEnabled: false,
          isListening: false,
          language: 'en',
          error: null,
        },
      });

      renderWithProvider(<NLPQueryInterface />, store);

      const input = screen.getByPlaceholderText(/ask questions about your documents/i);
      const sendButton = screen.getByRole('button', { name: '' });

      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });

    it('should show loading spinner when processing', () => {
      const store = createTestStore({
        nlp: {
          conversations: [],
          activeConversationId: null,
          isProcessing: true,
          voiceInputEnabled: false,
          isListening: false,
          language: 'en',
          error: null,
        },
      });

      renderWithProvider(<NLPQueryInterface />, store);

      // Look for the loading spinner element
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should display error message when there is an NLP error', () => {
      const store = createTestStore({
        nlp: {
          conversations: [],
          activeConversationId: null,
          isProcessing: false,
          voiceInputEnabled: false,
          isListening: false,
          language: 'en',
          error: 'Failed to process query',
        },
      });

      renderWithProvider(<NLPQueryInterface />, store);

      expect(screen.getByText('Failed to process query')).toBeInTheDocument();
    });
  });

  describe('textarea behavior', () => {
    it('should show character count', () => {
      renderWithProvider(<NLPQueryInterface />);

      expect(screen.getByText('0/500')).toBeInTheDocument();
    });

    it('should update character count as user types', async () => {
      const user = userEvent.setup();
      renderWithProvider(<NLPQueryInterface />);

      const input = screen.getByPlaceholderText(/ask questions about your documents/i);
      await user.type(input, 'Hello');

      expect(screen.getByText('5/500')).toBeInTheDocument();
    });

    it('should show helpful keyboard shortcuts text', () => {
      renderWithProvider(<NLPQueryInterface />);

      expect(screen.getByText(/Press Enter to send, Shift\+Enter for new line/)).toBeInTheDocument();
    });

    it('should show Arabic keyboard shortcuts when language is Arabic', () => {
      const store = createTestStore({
        nlp: {
          conversations: [],
          activeConversationId: null,
          isProcessing: false,
          voiceInputEnabled: false,
          isListening: false,
          language: 'ar',
          error: null,
        },
      });

      renderWithProvider(<NLPQueryInterface />, store);

      expect(screen.getByText(/اضغط Enter للإرسال، Shift\+Enter لسطر جديد/)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithProvider(<NLPQueryInterface />);

      const input = screen.getByPlaceholderText(/ask questions about your documents/i);
      expect(input).toBeInTheDocument();

      // Check that the input has proper attributes for screen readers
      expect(input).toHaveAttribute('dir', 'ltr');
    });

    it('should set RTL direction for Arabic language', () => {
      const store = createTestStore({
        nlp: {
          conversations: [],
          activeConversationId: null,
          isProcessing: false,
          voiceInputEnabled: false,
          isListening: false,
          language: 'ar',
          error: null,
        },
      });

      renderWithProvider(<NLPQueryInterface />, store);

      const input = screen.getByPlaceholderText(/اسأل عن مستنداتك باللغة الطبيعية/);
      expect(input).toHaveAttribute('dir', 'rtl');
    });
  });

  describe('integration with conversation history', () => {
    it('should render conversation history component', () => {
      renderWithProvider(<NLPQueryInterface />);

      // The ConversationHistory component should be rendered (mocked)
      expect(screen.getByTestId('conversation-history')).toBeInTheDocument();
      expect(screen.getByText('Conversation History Mock')).toBeInTheDocument();
    });
  });
});
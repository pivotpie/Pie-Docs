import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConversationHistoryManager from '@/components/search/answers/ConversationHistoryManager';
import type { ConversationContext } from '@/types/domain/Answer';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('ConversationHistoryManager', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <ConversationHistoryManager
        {...props}
      />
    );
  };

  it('renders conversation history header', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Conversation History')).toBeInTheDocument();
    });

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('loads and displays sample conversations when none exist', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Document Management Workflow')).toBeInTheDocument();
      expect(screen.getByText('Search and AI Features')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    renderComponent();

    expect(screen.getByText('Loading conversation history...')).toBeInTheDocument();
  });

  it('displays conversation details with message and answer counts', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/2 messages • 1 answers/)).toBeInTheDocument();
      expect(screen.getByText(/2 messages • 0 answers/)).toBeInTheDocument();
    });
  });

  it('shows conversation tags', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('workflow')).toBeInTheDocument();
      expect(screen.getByText('automation')).toBeInTheDocument();
      expect(screen.getByText('approval')).toBeInTheDocument();
      expect(screen.getByText('search')).toBeInTheDocument();
      expect(screen.getByText('ai')).toBeInTheDocument();
    });
  });

  it('expands conversation to show messages when selected', async () => {
    renderComponent();

    await waitFor(() => {
      const conversation = screen.getByText('Document Management Workflow').closest('div');
      fireEvent.click(conversation!);
    });

    await waitFor(() => {
      expect(screen.getByText('How do I set up automated document approval workflows?')).toBeInTheDocument();
      expect(screen.getByText(/To set up automated document approval workflows/)).toBeInTheDocument();
    });
  });

  it('calls onConversationSelect when conversation is clicked', async () => {
    const onConversationSelect = vi.fn();
    renderComponent({ onConversationSelect });

    await waitFor(() => {
      const conversation = screen.getByText('Document Management Workflow').closest('div');
      fireEvent.click(conversation!);
    });

    expect(onConversationSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'conv-1',
        title: 'Document Management Workflow',
      })
    );
  });

  it('calls onMessageSelect when message is clicked', async () => {
    const onMessageSelect = vi.fn();
    renderComponent({ onMessageSelect });

    // First select conversation
    await waitFor(() => {
      const conversation = screen.getByText('Document Management Workflow').closest('div');
      fireEvent.click(conversation!);
    });

    // Then click on a message
    await waitFor(() => {
      const message = screen.getByText('How do I set up automated document approval workflows?').closest('div');
      fireEvent.click(message!);
    });

    expect(onMessageSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'msg-1',
        type: 'question',
        content: 'How do I set up automated document approval workflows?',
      })
    );
  });

  it('toggles filters panel when filters button is clicked', async () => {
    renderComponent();

    await waitFor(() => {
      const filtersButton = screen.getByText(/Filters/);
      fireEvent.click(filtersButton);
    });

    expect(screen.getByText('Time Range')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Has Answers')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('filters conversations by time range', async () => {
    renderComponent();

    // Open filters
    await waitFor(() => {
      const filtersButton = screen.getByText(/Filters/);
      fireEvent.click(filtersButton);
    });

    // Change to "Today" filter
    const timeRangeSelect = screen.getByDisplayValue('This Week');
    fireEvent.change(timeRangeSelect, { target: { value: 'today' } });

    await waitFor(() => {
      // Should only show conversations from today
      expect(screen.getByText('Document Management Workflow')).toBeInTheDocument();
      expect(screen.queryByText('Search and AI Features')).not.toBeInTheDocument();
    });
  });

  it('filters conversations by search query', async () => {
    renderComponent();

    // Open filters
    await waitFor(() => {
      const filtersButton = screen.getByText(/Filters/);
      fireEvent.click(filtersButton);
    });

    // Search for "AI"
    const searchInput = screen.getByPlaceholderText('Search conversations...');
    fireEvent.change(searchInput, { target: { value: 'AI' } });

    await waitFor(() => {
      // Should only show AI-related conversation
      expect(screen.getByText('Search and AI Features')).toBeInTheDocument();
      expect(screen.queryByText('Document Management Workflow')).not.toBeInTheDocument();
    });
  });

  it('filters conversations by answer presence', async () => {
    renderComponent();

    // Open filters
    await waitFor(() => {
      const filtersButton = screen.getByText(/Filters/);
      fireEvent.click(filtersButton);
    });

    // Filter to show only conversations with answers
    const hasAnswersSelect = screen.getByDisplayValue('All');
    fireEvent.change(hasAnswersSelect, { target: { value: 'true' } });

    await waitFor(() => {
      // Should only show conversations with answers
      expect(screen.getByText('Document Management Workflow')).toBeInTheDocument();
      expect(screen.queryByText('Search and AI Features')).not.toBeInTheDocument();
    });
  });

  it('filters conversations by tags', async () => {
    renderComponent();

    // Open filters
    await waitFor(() => {
      const filtersButton = screen.getByText(/Filters/);
      fireEvent.click(filtersButton);
    });

    // Click on "workflow" tag to filter
    await waitFor(() => {
      const workflowTag = screen.getAllByText('workflow').find(el =>
        el.closest('button')?.classList.contains('text-xs')
      );
      fireEvent.click(workflowTag!);
    });

    await waitFor(() => {
      // Should only show workflow-related conversation
      expect(screen.getByText('Document Management Workflow')).toBeInTheDocument();
      expect(screen.queryByText('Search and AI Features')).not.toBeInTheDocument();
    });
  });

  it('exports conversation data when export button is clicked', async () => {
    // Mock URL.createObjectURL and related functions
    const mockCreateObjectURL = vi.fn(() => 'mock-url');
    const mockRevokeObjectURL = vi.fn();
    const mockClick = vi.fn();
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();

    Object.defineProperty(URL, 'createObjectURL', {
      value: mockCreateObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: mockRevokeObjectURL,
    });

    const mockLink = {
      href: '',
      download: '',
      click: mockClick,
    };

    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

    renderComponent();

    await waitFor(() => {
      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);
    });

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('mock-url');
  });

  it('shows empty state when no conversations match filters', async () => {
    renderComponent();

    // Open filters and search for something that doesn't exist
    await waitFor(() => {
      const filtersButton = screen.getByText(/Filters/);
      fireEvent.click(filtersButton);
    });

    const searchInput = screen.getByPlaceholderText('Search conversations...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No conversations found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
    });
  });

  it('formats timestamps correctly', async () => {
    renderComponent();

    await waitFor(() => {
      // Should show relative timestamps
      expect(screen.getByText(/ago/)).toBeInTheDocument();
    });
  });

  it('renders with custom className', async () => {
    const { container } = renderComponent({ className: 'custom-class' });

    await waitFor(() => {
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  it('preselects conversation when conversationId is provided', async () => {
    renderComponent({ conversationId: 'conv-1' });

    await waitFor(() => {
      const selectedConversation = screen.getByText('Document Management Workflow').closest('div');
      expect(selectedConversation).toHaveClass('bg-blue-50');
    });
  });
});
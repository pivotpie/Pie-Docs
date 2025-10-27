import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SearchInput } from '@/components/search/SearchInput';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('SearchInput Component', () => {
  const mockOnSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders search input with placeholder', () => {
    render(
      <SearchInput
        value=""
        onSearch={mockOnSearch}
        placeholder="Search documents..."
      />
    );

    const input = screen.getByPlaceholderText('Search documents...');
    expect(input).toBeInTheDocument();
  });

  it('displays search value', () => {
    render(
      <SearchInput
        value="test query"
        onSearch={mockOnSearch}
      />
    );

    const input = screen.getByDisplayValue('test query');
    expect(input).toBeInTheDocument();
  });

  it('calls onSearch when Enter is pressed', async () => {
    render(
      <SearchInput
        value=""
        onSearch={mockOnSearch}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test search' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('test search');
    });
  });

  it('calls onSearch when search button is clicked', () => {
    render(
      <SearchInput
        value="test query"
        onSearch={mockOnSearch}
      />
    );

    const searchButton = screen.getByRole('button');
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith('test query');
  });

  it('shows loading state', () => {
    render(
      <SearchInput
        value=""
        onSearch={mockOnSearch}
        isLoading={true}
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();

    // Check for loading spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('handles empty search gracefully', () => {
    render(
      <SearchInput
        value=""
        onSearch={mockOnSearch}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter' });

    // Should not call onSearch for empty query
    expect(mockOnSearch).not.toHaveBeenCalled();
  });

  it('trims whitespace from search query', async () => {
    render(
      <SearchInput
        value=""
        onSearch={mockOnSearch}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '  test search  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('test search');
    });
  });

  it('saves search to history', async () => {
    render(
      <SearchInput
        value=""
        onSearch={mockOnSearch}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test search' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'search-history',
        expect.stringContaining('test search')
      );
    });
  });

  it('loads search history from localStorage', () => {
    const mockHistory = JSON.stringify([
      {
        id: '1',
        query: 'previous search',
        filters: {},
        timestamp: '2025-01-01T00:00:00Z',
        resultCount: 5
      }
    ]);

    localStorageMock.getItem.mockReturnValue(mockHistory);

    render(
      <SearchInput
        value=""
        onSearch={mockOnSearch}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    // Should show history when focused
    expect(screen.getByText('Recent Searches')).toBeInTheDocument();
    expect(screen.getByText('previous search')).toBeInTheDocument();
  });
});
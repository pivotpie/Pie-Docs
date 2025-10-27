import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import searchSliceReducer, {
  setQuery,
  setFilters,
  updateFilters,
  setPage,
  setPageSize,
  clearSearch,
  addToHistory,
  clearHistory,
  removeSavedSearch,
  setSuggestions,
  clearSuggestions,
  setInitialized,
  performSearch,
  fetchSuggestions,
  saveSearch,
  selectSearchState,
  selectSearchQuery,
  selectSearchFilters,
  selectSearchResults,
  selectSearchLoading,
  selectSearchError,
  selectSavedSearches,
  selectSearchHistory,
  selectSearchSuggestions,
} from '@/store/slices/searchSlice';
import type { SearchFilters, SearchResult, SearchSuggestion, SearchHistory } from '@/types/domain/Search';

// Mock the search service
vi.mock('@/services/api/searchService', () => ({
  searchService: {
    search: vi.fn(),
    getSuggestions: vi.fn(),
  },
}));

const createTestStore = () => {
  return configureStore({
    reducer: {
      search: searchSliceReducer,
    },
  });
};

describe('searchSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().search;

      expect(state).toEqual({
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
      });
    });
  });

  describe('synchronous actions', () => {
    it('should handle setQuery', () => {
      store.dispatch(setQuery('test query'));

      const state = store.getState().search;
      expect(state.query).toBe('test query');
    });

    it('should handle setFilters', () => {
      const filters: SearchFilters = {
        documentTypes: ['PDF', 'Word'],
        authors: ['John Doe'],
      };

      store.dispatch(setFilters(filters));

      const state = store.getState().search;
      expect(state.filters).toEqual(filters);
    });

    it('should handle updateFilters', () => {
      // Set initial filters
      store.dispatch(setFilters({ documentTypes: ['PDF'] }));

      // Update with additional filters
      store.dispatch(updateFilters({ authors: ['John Doe'] }));

      const state = store.getState().search;
      expect(state.filters).toEqual({
        documentTypes: ['PDF'],
        authors: ['John Doe'],
      });
    });

    it('should handle setPage', () => {
      store.dispatch(setPage(3));

      const state = store.getState().search;
      expect(state.page).toBe(3);
    });

    it('should handle setPageSize', () => {
      // Set initial page
      store.dispatch(setPage(5));

      // Change page size (should reset page to 1)
      store.dispatch(setPageSize(50));

      const state = store.getState().search;
      expect(state.pageSize).toBe(50);
      expect(state.page).toBe(1); // Should reset to first page
    });

    it('should handle clearSearch', () => {
      // Set some search state
      store.dispatch(setQuery('test'));
      store.dispatch(setFilters({ documentTypes: ['PDF'] }));
      store.dispatch(setPage(3));

      // Clear search
      store.dispatch(clearSearch());

      const state = store.getState().search;
      expect(state.query).toBe('');
      expect(state.filters).toEqual({});
      expect(state.results).toEqual([]);
      expect(state.totalResults).toBe(0);
      expect(state.page).toBe(1);
      expect(state.error).toBeNull();
    });

    it('should handle addToHistory', () => {
      const historyItem: SearchHistory = {
        id: '1',
        query: 'test search',
        filters: { documentTypes: ['PDF'] },
        timestamp: '2025-01-20T10:00:00Z',
        resultCount: 5,
      };

      store.dispatch(addToHistory(historyItem));

      const state = store.getState().search;
      expect(state.searchHistory).toHaveLength(1);
      expect(state.searchHistory[0]).toEqual(historyItem);
    });

    it('should handle duplicate history entries', () => {
      const historyItem1: SearchHistory = {
        id: '1',
        query: 'test search',
        filters: {},
        timestamp: '2025-01-20T10:00:00Z',
        resultCount: 5,
      };

      const historyItem2: SearchHistory = {
        id: '2',
        query: 'test search', // Same query
        filters: {},
        timestamp: '2025-01-20T11:00:00Z',
        resultCount: 3,
      };

      store.dispatch(addToHistory(historyItem1));
      store.dispatch(addToHistory(historyItem2));

      const state = store.getState().search;
      expect(state.searchHistory).toHaveLength(1);
      expect(state.searchHistory[0]).toEqual(historyItem2); // Should keep the latest
    });

    it('should limit search history to 10 items', () => {
      // Add 12 history items
      for (let i = 1; i <= 12; i++) {
        const historyItem: SearchHistory = {
          id: i.toString(),
          query: `search ${i}`,
          filters: {},
          timestamp: `2025-01-20T${i.toString().padStart(2, '0')}:00:00Z`,
          resultCount: i,
        };
        store.dispatch(addToHistory(historyItem));
      }

      const state = store.getState().search;
      expect(state.searchHistory).toHaveLength(10); // Should limit to 10
      expect(state.searchHistory[0].query).toBe('search 12'); // Latest should be first
    });

    it('should handle clearHistory', () => {
      // Add some history
      store.dispatch(addToHistory({
        id: '1',
        query: 'test',
        filters: {},
        timestamp: '2025-01-20T10:00:00Z',
        resultCount: 1,
      }));

      // Clear history
      store.dispatch(clearHistory());

      const state = store.getState().search;
      expect(state.searchHistory).toEqual([]);
    });

    it('should handle removeSavedSearch', () => {
      // Set initial state with saved searches
      const initialState = store.getState().search;
      const savedSearches = [
        {
          id: 'saved-1',
          name: 'Test Search',
          query: { text: 'test', filters: {} },
          createdAt: '2025-01-20T10:00:00Z',
          modifiedAt: '2025-01-20T10:00:00Z',
          author: 'user',
          isShared: false,
        },
        {
          id: 'saved-2',
          name: 'Another Search',
          query: { text: 'another', filters: {} },
          createdAt: '2025-01-20T11:00:00Z',
          modifiedAt: '2025-01-20T11:00:00Z',
          author: 'user',
          isShared: false,
        },
      ];

      // Manually set saved searches for this test
      store.dispatch({ type: 'search/setSavedSearches', payload: savedSearches });

      // Remove one saved search
      store.dispatch(removeSavedSearch('saved-1'));

      const state = store.getState().search;
      expect(state.savedSearches).toHaveLength(1);
      expect(state.savedSearches[0].id).toBe('saved-2');
    });

    it('should handle setSuggestions', () => {
      const suggestions: SearchSuggestion[] = [
        { text: 'test document', type: 'query', category: 'Recent', count: 5 },
        { text: 'document type', type: 'metadata', category: 'Fields', count: 3 },
      ];

      store.dispatch(setSuggestions(suggestions));

      const state = store.getState().search;
      expect(state.suggestions).toEqual(suggestions);
    });

    it('should handle clearSuggestions', () => {
      // Set some suggestions
      store.dispatch(setSuggestions([
        { text: 'test', type: 'query', category: 'Recent', count: 1 }
      ]));

      // Clear suggestions
      store.dispatch(clearSuggestions());

      const state = store.getState().search;
      expect(state.suggestions).toEqual([]);
    });

    it('should handle setInitialized', () => {
      store.dispatch(setInitialized(true));

      const state = store.getState().search;
      expect(state.isInitialized).toBe(true);
    });
  });

  describe('async thunks', () => {
    const { searchService } = await import('@/services/api/searchService');

    it('should handle performSearch.pending', () => {
      store.dispatch(performSearch.pending('requestId', {
        query: 'test',
        filters: {},
      }));

      const state = store.getState().search;
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle performSearch.fulfilled', () => {
      const mockResults: SearchResult[] = [
        {
          id: 'doc-1',
          title: 'Test Document',
          content: 'Test content',
          snippet: 'Test snippet',
          documentType: 'PDF',
          createdAt: '2025-01-20T10:00:00Z',
          modifiedAt: '2025-01-20T10:00:00Z',
          author: 'John Doe',
          metadata: {},
          tags: [],
          score: 0.95,
          highlights: [],
        },
      ];

      const payload = {
        results: mockResults,
        totalResults: 1,
        page: 1,
        facets: {},
        timeTaken: 45,
      };

      store.dispatch(performSearch.fulfilled(payload, 'requestId', {
        query: 'test',
        filters: {},
      }));

      const state = store.getState().search;
      expect(state.isLoading).toBe(false);
      expect(state.results).toEqual(mockResults);
      expect(state.totalResults).toBe(1);
      expect(state.page).toBe(1);
    });

    it('should handle performSearch.rejected', () => {
      const error = new Error('Search failed');

      store.dispatch(performSearch.rejected(error, 'requestId', {
        query: 'test',
        filters: {},
      }));

      const state = store.getState().search;
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Search failed');
    });

    it('should handle fetchSuggestions.fulfilled', () => {
      const mockSuggestions: SearchSuggestion[] = [
        { text: 'test query', type: 'query', category: 'Recent', count: 5 },
      ];

      store.dispatch(fetchSuggestions.fulfilled(mockSuggestions, 'requestId', 'test'));

      const state = store.getState().search;
      expect(state.suggestions).toEqual(mockSuggestions);
    });

    it('should handle saveSearch.fulfilled', () => {
      const savedSearch = {
        id: 'saved-1',
        name: 'Test Search',
        description: 'A test search',
        query: { text: 'test', filters: {} },
        createdAt: '2025-01-20T10:00:00Z',
        modifiedAt: '2025-01-20T10:00:00Z',
        author: 'user',
        isShared: false,
      };

      store.dispatch(saveSearch.fulfilled(savedSearch, 'requestId', {
        name: 'Test Search',
        description: 'A test search',
        query: 'test',
        filters: {},
      }));

      const state = store.getState().search;
      expect(state.savedSearches).toHaveLength(1);
      expect(state.savedSearches[0]).toEqual(savedSearch);
    });

    it('should handle saveSearch.rejected', () => {
      const error = new Error('Failed to save search');

      store.dispatch(saveSearch.rejected(error, 'requestId', {
        name: 'Test Search',
        query: 'test',
        filters: {},
      }));

      const state = store.getState().search;
      expect(state.error).toBe('Failed to save search');
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      // Set up some state for testing selectors
      store.dispatch(setQuery('test query'));
      store.dispatch(setFilters({ documentTypes: ['PDF'] }));
      store.dispatch(setSuggestions([
        { text: 'test', type: 'query', category: 'Recent', count: 1 }
      ]));
    });

    it('should select search state', () => {
      const state = store.getState();
      const searchState = selectSearchState(state);

      expect(searchState.query).toBe('test query');
      expect(searchState.filters).toEqual({ documentTypes: ['PDF'] });
    });

    it('should select search query', () => {
      const state = store.getState();
      const query = selectSearchQuery(state);

      expect(query).toBe('test query');
    });

    it('should select search filters', () => {
      const state = store.getState();
      const filters = selectSearchFilters(state);

      expect(filters).toEqual({ documentTypes: ['PDF'] });
    });

    it('should select search results', () => {
      const state = store.getState();
      const results = selectSearchResults(state);

      expect(results).toEqual([]);
    });

    it('should select search loading state', () => {
      const state = store.getState();
      const isLoading = selectSearchLoading(state);

      expect(isLoading).toBe(false);
    });

    it('should select search error', () => {
      const state = store.getState();
      const error = selectSearchError(state);

      expect(error).toBeNull();
    });

    it('should select saved searches', () => {
      const state = store.getState();
      const savedSearches = selectSavedSearches(state);

      expect(savedSearches).toEqual([]);
    });

    it('should select search history', () => {
      const state = store.getState();
      const history = selectSearchHistory(state);

      expect(history).toEqual([]);
    });

    it('should select search suggestions', () => {
      const state = store.getState();
      const suggestions = selectSearchSuggestions(state);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].text).toBe('test');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete search workflow', async () => {
      // 1. Set query
      store.dispatch(setQuery('test document'));

      // 2. Set filters
      store.dispatch(setFilters({ documentTypes: ['PDF'], authors: ['John Doe'] }));

      // 3. Perform search
      const mockResults: SearchResult[] = [
        {
          id: 'doc-1',
          title: 'Test Document',
          content: 'Test content',
          snippet: 'Test snippet',
          documentType: 'PDF',
          createdAt: '2025-01-20T10:00:00Z',
          modifiedAt: '2025-01-20T10:00:00Z',
          author: 'John Doe',
          metadata: {},
          tags: [],
          score: 0.95,
          highlights: [],
        },
      ];

      store.dispatch(performSearch.fulfilled({
        results: mockResults,
        totalResults: 1,
        page: 1,
        facets: {},
        timeTaken: 45,
      }, 'requestId', {
        query: 'test document',
        filters: { documentTypes: ['PDF'], authors: ['John Doe'] },
      }));

      // 4. Add to history
      store.dispatch(addToHistory({
        id: '1',
        query: 'test document',
        filters: { documentTypes: ['PDF'], authors: ['John Doe'] },
        timestamp: '2025-01-20T10:00:00Z',
        resultCount: 1,
      }));

      const state = store.getState().search;

      expect(state.query).toBe('test document');
      expect(state.filters).toEqual({ documentTypes: ['PDF'], authors: ['John Doe'] });
      expect(state.results).toEqual(mockResults);
      expect(state.totalResults).toBe(1);
      expect(state.searchHistory).toHaveLength(1);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle search error recovery', () => {
      // Start with a successful search
      store.dispatch(performSearch.fulfilled({
        results: [],
        totalResults: 0,
        page: 1,
        facets: {},
        timeTaken: 10,
      }, 'requestId1', { query: 'test', filters: {} }));

      expect(store.getState().search.error).toBeNull();

      // Then have an error
      store.dispatch(performSearch.rejected(
        new Error('Network error'),
        'requestId2',
        { query: 'test2', filters: {} }
      ));

      expect(store.getState().search.error).toBe('Network error');
      expect(store.getState().search.isLoading).toBe(false);

      // Then recover with another successful search
      store.dispatch(performSearch.pending('requestId3', { query: 'test3', filters: {} }));

      expect(store.getState().search.error).toBeNull(); // Error should be cleared
      expect(store.getState().search.isLoading).toBe(true);
    });
  });
});
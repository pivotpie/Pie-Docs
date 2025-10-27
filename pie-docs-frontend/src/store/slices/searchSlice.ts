import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type {
  SearchState,
  SearchFilters,
  SavedSearch,
  SearchHistory,
  SearchSuggestion,
  NLPQueryState,
  ConversationContext,
  ConversationMessage
} from '@/types/domain/Search';
import type {
  GeneratedAnswer,
  AnswerGenerationRequest,
  ConfidenceScore,
  AnswerValidation
} from '@/types/domain/Answer';
import { searchService } from '@/services/api/searchService';
import { answerGenerator } from '@/services/nlp/answerGeneration/AnswerGenerator';

interface AnswerGenerationState {
  currentAnswer: GeneratedAnswer | null;
  isGenerating: boolean;
  confidenceScore: ConfidenceScore | null;
  validation: AnswerValidation | null;
  generationHistory: GeneratedAnswer[];
  error: string | null;
}

interface SearchSliceState extends SearchState {
  savedSearches: SavedSearch[];
  searchHistory: SearchHistory[];
  suggestions: SearchSuggestion[];
  isInitialized: boolean;
  nlp: NLPQueryState;
  answers: AnswerGenerationState;
}

const initialState: SearchSliceState = {
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
  answers: {
    currentAnswer: null,
    isGenerating: false,
    confidenceScore: null,
    validation: null,
    generationHistory: [],
    error: null,
  },
};

// Async thunks for search operations
export const performSearch = createAsyncThunk(
  'search/performSearch',
  async ({ query, filters, page, sortBy }: {
    query: string;
    filters: SearchFilters;
    page?: number;
    sortBy?: string;
  }) => {
    try {
      const response = await searchService.search(
        query,
        filters,
        page || 1,
        20, // pageSize
        sortBy || 'relevance'
      );

      return {
        results: response.results,
        totalResults: response.totalResults,
        page: response.page,
        facets: response.facets,
        timeTaken: response.timeTaken,
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Search failed');
    }
  }
);

export const fetchSuggestions = createAsyncThunk(
  'search/fetchSuggestions',
  async (query: string) => {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      const suggestions = await searchService.getSuggestions(query, [
        'query', 'document', 'metadata'
      ]);

      return suggestions;
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      return [];
    }
  }
);

export const saveSearch = createAsyncThunk(
  'search/saveSearch',
  async ({ name, description, query, filters }: {
    name: string;
    description?: string;
    query: string;
    filters: SearchFilters;
  }) => {
    // TODO: Implement actual save search API call in Task 5
    const savedSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      description,
      query: { text: query, filters },
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      author: 'current-user', // TODO: Get from auth state
      isShared: false,
    };

    return savedSearch;
  }
);

export const generateAnswer = createAsyncThunk(
  'search/generateAnswer',
  async (request: AnswerGenerationRequest) => {
    try {
      const response = await answerGenerator.generateAnswer(request);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Answer generation failed');
    }
  }
);

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload;
    },

    setFilters: (state, action: PayloadAction<SearchFilters>) => {
      state.filters = action.payload;
    },

    updateFilters: (state, action: PayloadAction<Partial<SearchFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },

    setPageSize: (state, action: PayloadAction<number>) => {
      state.pageSize = action.payload;
      state.page = 1; // Reset to first page when page size changes
    },

    clearSearch: (state) => {
      state.query = '';
      state.filters = {};
      state.results = [];
      state.totalResults = 0;
      state.page = 1;
      state.error = null;
    },

    addToHistory: (state, action: PayloadAction<SearchHistory>) => {
      // Remove duplicate if exists and add to beginning
      state.searchHistory = [
        action.payload,
        ...state.searchHistory.filter(h => h.query !== action.payload.query).slice(0, 9)
      ];
    },

    clearHistory: (state) => {
      state.searchHistory = [];
    },

    removeSavedSearch: (state, action: PayloadAction<string>) => {
      state.savedSearches = state.savedSearches.filter(s => s.id !== action.payload);
    },

    setSuggestions: (state, action: PayloadAction<SearchSuggestion[]>) => {
      state.suggestions = action.payload;
    },

    clearSuggestions: (state) => {
      state.suggestions = [];
    },

    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },

    // NLP Query reducers
    createConversation: (state, action: PayloadAction<Omit<ConversationContext, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const conversation: ConversationContext = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...action.payload,
      };
      state.nlp.conversations.unshift(conversation);
      state.nlp.activeConversationId = conversation.id;
    },

    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.nlp.activeConversationId = action.payload;
    },

    addMessage: (state, action: PayloadAction<Omit<ConversationMessage, 'id' | 'timestamp'>>) => {
      const activeConversation = state.nlp.conversations.find(
        c => c.id === state.nlp.activeConversationId
      );
      if (activeConversation) {
        const message: ConversationMessage = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          ...action.payload,
        };
        activeConversation.messages.push(message);
        activeConversation.updatedAt = new Date().toISOString();
      }
    },

    updateMessage: (state, action: PayloadAction<{ messageId: string; updates: Partial<ConversationMessage> }>) => {
      const activeConversation = state.nlp.conversations.find(
        c => c.id === state.nlp.activeConversationId
      );
      if (activeConversation) {
        const messageIndex = activeConversation.messages.findIndex(m => m.id === action.payload.messageId);
        if (messageIndex !== -1) {
          activeConversation.messages[messageIndex] = {
            ...activeConversation.messages[messageIndex],
            ...action.payload.updates,
          };
          activeConversation.updatedAt = new Date().toISOString();
        }
      }
    },

    setNLPProcessing: (state, action: PayloadAction<boolean>) => {
      state.nlp.isProcessing = action.payload;
    },

    setNLPLanguage: (state, action: PayloadAction<'en' | 'ar'>) => {
      state.nlp.language = action.payload;
    },

    setVoiceInputEnabled: (state, action: PayloadAction<boolean>) => {
      state.nlp.voiceInputEnabled = action.payload;
    },

    setVoiceListening: (state, action: PayloadAction<boolean>) => {
      state.nlp.isListening = action.payload;
    },

    setNLPError: (state, action: PayloadAction<string | null>) => {
      state.nlp.error = action.payload;
    },

    clearConversations: (state) => {
      state.nlp.conversations = [];
      state.nlp.activeConversationId = null;
    },

    deleteConversation: (state, action: PayloadAction<string>) => {
      state.nlp.conversations = state.nlp.conversations.filter(c => c.id !== action.payload);
      if (state.nlp.activeConversationId === action.payload) {
        state.nlp.activeConversationId = state.nlp.conversations.length > 0 ? state.nlp.conversations[0].id : null;
      }
    },

    // Answer Generation reducers
    setAnswerGenerating: (state, action: PayloadAction<boolean>) => {
      state.answers.isGenerating = action.payload;
      if (action.payload) {
        state.answers.error = null;
      }
    },

    setCurrentAnswer: (state, action: PayloadAction<GeneratedAnswer | null>) => {
      state.answers.currentAnswer = action.payload;
      if (action.payload) {
        state.answers.generationHistory = [
          action.payload,
          ...state.answers.generationHistory.slice(0, 9) // Keep last 10
        ];
      }
    },

    setAnswerConfidence: (state, action: PayloadAction<ConfidenceScore | null>) => {
      state.answers.confidenceScore = action.payload;
    },

    setAnswerValidation: (state, action: PayloadAction<AnswerValidation | null>) => {
      state.answers.validation = action.payload;
    },

    setAnswerError: (state, action: PayloadAction<string | null>) => {
      state.answers.error = action.payload;
      if (action.payload) {
        state.answers.isGenerating = false;
      }
    },

    clearAnswers: (state) => {
      state.answers.currentAnswer = null;
      state.answers.confidenceScore = null;
      state.answers.validation = null;
      state.answers.error = null;
      state.answers.isGenerating = false;
    },

    clearAnswerHistory: (state) => {
      state.answers.generationHistory = [];
    },
  },

  extraReducers: (builder) => {
    builder
      // performSearch
      .addCase(performSearch.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(performSearch.fulfilled, (state, action) => {
        state.isLoading = false;
        state.results = action.payload.results;
        state.totalResults = action.payload.totalResults;
        state.page = action.payload.page;
      })
      .addCase(performSearch.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Search failed';
      })

      // fetchSuggestions
      .addCase(fetchSuggestions.fulfilled, (state, action) => {
        state.suggestions = action.payload;
      })

      // saveSearch
      .addCase(saveSearch.fulfilled, (state, action) => {
        state.savedSearches = [action.payload, ...state.savedSearches];
      })
      .addCase(saveSearch.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to save search';
      })

      // generateAnswer
      .addCase(generateAnswer.pending, (state) => {
        state.answers.isGenerating = true;
        state.answers.error = null;
      })
      .addCase(generateAnswer.fulfilled, (state, action) => {
        state.answers.isGenerating = false;
        state.answers.currentAnswer = action.payload.answer;
        state.answers.validation = action.payload.validation;
        state.answers.generationHistory = [
          action.payload.answer,
          ...state.answers.generationHistory.slice(0, 9)
        ];
      })
      .addCase(generateAnswer.rejected, (state, action) => {
        state.answers.isGenerating = false;
        state.answers.error = action.error.message || 'Answer generation failed';
      });
  },
});

export const {
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
  // NLP actions
  createConversation,
  setActiveConversation,
  addMessage,
  updateMessage,
  setNLPProcessing,
  setNLPLanguage,
  setVoiceInputEnabled,
  setVoiceListening,
  setNLPError,
  clearConversations,
  deleteConversation,
  // Answer Generation actions
  setAnswerGenerating,
  setCurrentAnswer,
  setAnswerConfidence,
  setAnswerValidation,
  setAnswerError,
  clearAnswers,
  clearAnswerHistory,
} = searchSlice.actions;

export default searchSlice.reducer;

// Selectors
export const selectSearchState = (state: { search: SearchSliceState }) => state.search;
export const selectSearchQuery = (state: { search: SearchSliceState }) => state.search.query;
export const selectSearchFilters = (state: { search: SearchSliceState }) => state.search.filters;
export const selectSearchResults = (state: { search: SearchSliceState }) => state.search.results;
export const selectSearchLoading = (state: { search: SearchSliceState }) => state.search.isLoading;
export const selectSearchError = (state: { search: SearchSliceState }) => state.search.error;
export const selectSavedSearches = (state: { search: SearchSliceState }) => state.search.savedSearches;
export const selectSearchHistory = (state: { search: SearchSliceState }) => state.search.searchHistory;
export const selectSearchSuggestions = (state: { search: SearchSliceState }) => state.search.suggestions;

// NLP Selectors
export const selectNLPState = (state: { search: SearchSliceState }) => state.search.nlp;
export const selectConversations = (state: { search: SearchSliceState }) => state.search.nlp.conversations;
export const selectActiveConversation = (state: { search: SearchSliceState }) => {
  const { conversations, activeConversationId } = state.search.nlp;
  return conversations.find(c => c.id === activeConversationId) || null;
};
export const selectNLPProcessing = (state: { search: SearchSliceState }) => state.search.nlp.isProcessing;
export const selectNLPLanguage = (state: { search: SearchSliceState }) => state.search.nlp.language;
export const selectVoiceInputEnabled = (state: { search: SearchSliceState }) => state.search.nlp.voiceInputEnabled;
export const selectVoiceListening = (state: { search: SearchSliceState }) => state.search.nlp.isListening;
export const selectNLPError = (state: { search: SearchSliceState }) => state.search.nlp.error;

// Answer Generation Selectors
export const selectAnswerState = (state: { search: SearchSliceState }) => state.search.answers;
export const selectCurrentAnswer = (state: { search: SearchSliceState }) => state.search.answers.currentAnswer;
export const selectAnswerGenerating = (state: { search: SearchSliceState }) => state.search.answers.isGenerating;
export const selectAnswerConfidence = (state: { search: SearchSliceState }) => state.search.answers.confidenceScore;
export const selectAnswerValidation = (state: { search: SearchSliceState }) => state.search.answers.validation;
export const selectAnswerError = (state: { search: SearchSliceState }) => state.search.answers.error;
export const selectAnswerHistory = (state: { search: SearchSliceState }) => state.search.answers.generationHistory;
export const selectCurrentQuery = (state: { search: SearchSliceState }) => state.search.query;
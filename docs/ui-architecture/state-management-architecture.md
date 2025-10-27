# State Management Architecture

## Store Structure (Redux Toolkit)

```
src/store/
├── store.ts                        # Root store configuration
├── rootReducer.ts                  # Combined reducers
├── middleware.ts                   # Custom middleware
├── slices/                         # Redux Toolkit slices
│   ├── authSlice.ts               # Authentication state
│   ├── documentsSlice.ts          # Document management state
│   ├── workflowsSlice.ts          # Workflow state
│   ├── physicalSlice.ts           # Physical document tracking
│   ├── searchSlice.ts             # Search and NLP state
│   ├── uiSlice.ts                 # UI state (modals, notifications)
│   ├── settingsSlice.ts           # User preferences and settings
│   └── index.ts                   # Slice exports
├── api/                           # RTK Query API slices
│   ├── baseApi.ts                 # Base API configuration
│   ├── authApi.ts                 # Authentication endpoints
│   ├── documentsApi.ts            # Document CRUD operations
│   ├── workflowsApi.ts            # Workflow management
│   ├── physicalApi.ts             # Physical tracking endpoints
│   ├── nlpApi.ts                  # RAG/NLP query endpoints
│   ├── usersApi.ts                # User management
│   ├── analyticsApi.ts            # Analytics and reporting
│   └── index.ts                   # API exports
├── selectors/                     # Reusable selectors
│   ├── authSelectors.ts
│   ├── documentsSelectors.ts
│   └── index.ts
├── types/                         # Store-specific types
│   ├── store.ts                   # RootState and AppDispatch
│   ├── api.ts                     # API response types
│   └── index.ts
└── utils/                         # Store utilities
    ├── persistConfig.ts           # Redux persist configuration
    ├── listeners.ts               # Middleware listeners
    └── index.ts
```

## Documents Slice Example

```typescript
// src/store/slices/documentsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../types/store';

interface DocumentsState {
  // List management
  selectedDocuments: string[];
  viewMode: 'grid' | 'list' | 'tree';
  sortBy: 'name' | 'date' | 'size' | 'relevance';
  sortOrder: 'asc' | 'desc';

  // Filtering and search
  filters: {
    documentType: string[];
    dateRange: { start: Date | null; end: Date | null };
    status: string[];
    tags: string[];
  };
  searchQuery: string;

  // Upload state
  uploadQueue: UploadItem[];
  uploadProgress: Record<string, number>;

  // UI state
  isLoading: boolean;
  error: string | null;
  notifications: Notification[];

  // Current document
  currentDocument: Document | null;
  documentHistory: string[];
}

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    selectDocument: (state, action: PayloadAction<string>) => {
      // Implementation with Immer immutable updates
    },
    setViewMode: (state, action: PayloadAction<'grid' | 'list' | 'tree'>) => {
      state.viewMode = action.payload;
    },
    // ... additional reducers
  },
});

export const { selectDocument, setViewMode } = documentsSlice.actions;
export default documentsSlice.reducer;
```

**Key State Management Principles:**
- **Predictable State Updates**: Immutable updates using Redux Toolkit
- **Type Safety**: Full TypeScript integration with proper typing
- **Performance**: Optimized selectors and memoization
- **Scalability**: Modular slice organization for different domains
- **Mockup-Ready**: State structure supports all 36 features demonstration
- **Backend Integration**: Clean separation for API state management

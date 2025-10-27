# 🔍 Semantic Search Implementation Plan

## 📋 Table of Contents
- [Overview](#overview)
- [Existing Components Analysis](#existing-components-analysis)
- [Phase 1: Search Results Display & Feedback](#phase-1-search-results-display--feedback)
- [Phase 2: Filter Integration](#phase-2-filter-integration)
- [Phase 3: Search Enhancements](#phase-3-search-enhancements)
- [Phase 4: Advanced Features](#phase-4-advanced-features)
- [Testing & Validation](#testing--validation)

---

## 🎯 Overview

**Goal:** Implement full semantic search functionality that displays search results with relevance scoring, integrates filters, and provides advanced search features.

**Strategy:** Maximize reuse of existing components, minimize code duplication, validate after each phase.

**Current State:**
- ✅ Search API integration complete
- ✅ Semantic/Keyword toggle working
- ✅ Basic search API call implemented
- ✅ FilterPanel component exists (not connected)
- ✅ DocumentSearchPanel component ready

---

## 🔍 Existing Components Analysis

### **Components to REUSE** ✅

| Component | Location | Purpose | Reuse Strategy |
|-----------|----------|---------|----------------|
| `FilterPanel.tsx` | `src/components/documents/FilterPanel.tsx` | Filter UI with types, status, tags, authors, date range | Use as-is, just wire up to search |
| `DocumentSearchPanel.tsx` | `src/components/documents/search/DocumentSearchPanel.tsx` | Search input with semantic/keyword toggle | Already integrated |
| `SearchBar.tsx` | `src/components/documents/SearchBar.tsx` | Simple search bar | Check if needed for autocomplete |

### **State to REUSE** ✅

| State Variable | Location | Purpose |
|----------------|----------|---------|
| `documents` | `AdvancedDocumentLibraryV3.tsx` | Document list display |
| `searchQuery` | `AdvancedDocumentLibraryV3.tsx` | Current search query |
| `searchType` | `AdvancedDocumentLibraryV3.tsx` | semantic/keyword toggle |
| `isLoading` | `AdvancedDocumentLibraryV3.tsx` | Loading indicator |
| `error` | `AdvancedDocumentLibraryV3.tsx` | Error messages |

### **Services to REUSE** ✅

| Service | Location | Methods Available |
|---------|----------|-------------------|
| `searchService` | `src/services/api/searchService.ts` | `search()`, `getSuggestions()`, `getSearchHistory()`, `ragQuery()`, `searchChunks()`, `findSimilarDocuments()` |

### **DO NOT CREATE** ❌
- ❌ New search components (reuse DocumentSearchPanel)
- ❌ New filter components (reuse FilterPanel)
- ❌ Duplicate state variables (use existing)
- ❌ New API service files (extend searchService if needed)

---

## 📦 Phase 1: Search Results Display & Feedback

**Goal:** Add visual feedback for search results with relevance scoring

**Duration:** 2-3 hours

### **Tasks**

#### **Task 1.1: Add Search Results State**
**File:** `pie-docs-frontend/src/pages/documents/AdvancedDocumentLibraryV3.tsx`

```typescript
// ADD this state (lines ~109-115)
const [searchResults, setSearchResults] = useState<{
  query: string;
  searchType: string;
  resultsCount: number;
  timeTaken: number;
  isActive: boolean;
} | null>(null);
```

**Why:** Track when we're in "search mode" vs "browse mode"

---

#### **Task 1.2: Update handleSearch to Set Search Results State**
**File:** `pie-docs-frontend/src/pages/documents/AdvancedDocumentLibraryV3.tsx`

```typescript
// MODIFY handleSearch (lines ~345-405)
const handleSearch = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!searchQuery.trim()) {
    // Clear search mode
    setSearchResults(null);
    loadDocuments();
    return;
  }

  setIsLoading(true);
  setError(null);

  try {
    const startTime = Date.now();

    const searchApiResults = await searchService.search(
      searchQuery,
      {}, // filters - will connect in Phase 2
      1,
      50,
      'relevance',
      searchType
    );

    const timeTaken = Date.now() - startTime;

    // Transform results (existing code)
    const transformedDocs = searchApiResults.results.map(...);

    setDocuments(transformedDocs);

    // SET search results state
    setSearchResults({
      query: searchQuery,
      searchType: searchType,
      resultsCount: searchApiResults.totalResults,
      timeTaken: timeTaken,
      isActive: true
    });

  } catch (error) {
    // ... existing error handling
  } finally {
    setIsLoading(false);
  }
};
```

**Why:** Captures search metadata for display

---

#### **Task 1.3: Add Clear Search Function**
**File:** `pie-docs-frontend/src/pages/documents/AdvancedDocumentLibraryV3.tsx`

```typescript
// ADD after handleSearch (line ~406)
const handleClearSearch = () => {
  setSearchQuery('');
  setSearchResults(null);
  loadDocuments(); // Reload all documents
};
```

**Why:** Allows users to exit search mode

---

#### **Task 1.4: Add Search Results Header**
**File:** `pie-docs-frontend/src/pages/documents/AdvancedDocumentLibraryV3.tsx`

```typescript
// ADD before document grid rendering (inside renderFolderView, renderGridView, etc.)
// Insert at line ~416 (in renderFolderView), line ~542 (in renderGridView), etc.

{searchResults?.isActive && (
  <div className="mb-4 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">
          🔍 Search Results: "{searchResults.query}"
        </h3>
        <p className="text-sm text-white/70">
          Found {searchResults.resultsCount} documents using{' '}
          <span className="font-medium text-indigo-300">
            {searchResults.searchType}
          </span>{' '}
          search in {searchResults.timeTaken}ms
        </p>
      </div>
      <button
        onClick={handleClearSearch}
        className="btn-glass px-4 py-2 text-sm flex items-center gap-2 hover:bg-white/20"
      >
        Clear Search ✕
      </button>
    </div>
  </div>
)}
```

**Why:** Provides clear visual indicator that search is active

---

#### **Task 1.5: Add Relevance Score Badge to Document Cards**
**File:** `pie-docs-frontend/src/pages/documents/AdvancedDocumentLibraryV3.tsx`

```typescript
// MODIFY document card rendering in all view modes
// In renderFolderView (line ~495), renderGridView (line ~596), renderListView (line ~704)

// ADD this inside each document card div (at the top):
{doc.confidenceScore && searchResults?.isActive && (
  <div className="absolute top-2 right-2 z-10">
    <span className={`px-2 py-1 rounded text-xs font-medium backdrop-blur-sm ${
      doc.confidenceScore >= 0.9
        ? 'bg-green-500/30 text-green-200 border border-green-400/50' :
      doc.confidenceScore >= 0.75
        ? 'bg-yellow-500/30 text-yellow-200 border border-yellow-400/50' :
      doc.confidenceScore >= 0.6
        ? 'bg-orange-500/30 text-orange-200 border border-orange-400/50'
        : 'bg-gray-500/30 text-gray-200 border border-gray-400/50'
    }`}>
      ⭐ {(doc.confidenceScore * 100).toFixed(0)}%
    </span>
  </div>
)}
```

**Why:** Shows relevance score visually on each document

---

### **Validation Checklist for Phase 1**

- [ ] Search results header appears when search is performed
- [ ] Header shows correct query, search type, and result count
- [ ] "Clear Search" button returns to normal document browsing
- [ ] Relevance badges appear on documents (only during search mode)
- [ ] Different colors for different relevance scores (90%+, 75-89%, 60-74%)
- [ ] Badges only show when search is active, not during normal browsing
- [ ] Loading spinner shows during search
- [ ] Error messages display if search fails
- [ ] Empty search query clears search mode

**Files Modified:** 1 file (`AdvancedDocumentLibraryV3.tsx`)
**New Components:** 0
**Breaking Changes:** None

---

## 🔗 Phase 2: Filter Integration

**Goal:** Connect existing FilterPanel to search functionality

**Duration:** 3-4 hours

### **Tasks**

#### **Task 2.1: Add Filter State**
**File:** `pie-docs-frontend/src/pages/documents/AdvancedDocumentLibraryV3.tsx`

```typescript
// ADD filter state (line ~116)
const [activeFilters, setActiveFilters] = useState<Partial<DocumentFilter>>({
  types: [],
  status: [],
  tags: [],
  authors: [],
  dateRange: undefined
});

const [showFilters, setShowFilters] = useState(false);
```

**Why:** Stores current filter selections

---

#### **Task 2.2: Extract Available Filter Options from Documents**
**File:** `pie-docs-frontend/src/pages/documents/AdvancedDocumentLibraryV3.tsx`

```typescript
// ADD useMemo hooks (line ~298 - after formatFileSize)
const availableDocumentTypes = useMemo(() => {
  const types = new Set<string>();
  documents.forEach(doc => {
    if (doc.document_type) types.add(doc.document_type);
  });
  return Array.from(types).sort();
}, [documents]);

const availableTags = useMemo(() => {
  const tags = new Set<string>();
  documents.forEach(doc => {
    doc.tags?.forEach(tag => tags.add(tag));
  });
  return Array.from(tags).sort();
}, [documents]);

const availableAuthors = useMemo(() => {
  const authors = new Set<string>();
  documents.forEach(doc => {
    if (doc.owner) authors.add(doc.owner);
  });
  return Array.from(authors).sort();
}, [documents]);
```

**Why:** Dynamically generates filter options from actual documents

---

#### **Task 2.3: Add Filter Button to View Mode Selector**
**File:** `pie-docs-frontend/src/pages/documents/AdvancedDocumentLibraryV3.tsx`

```typescript
// MODIFY view mode selector (line ~1030-1064)
// ADD filter button after view mode buttons:

<button
  onClick={() => setShowFilters(!showFilters)}
  className={`px-3 py-2 rounded text-sm font-medium transition-all ${
    showFilters ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60'
  }`}
  title="Filters"
>
  🔍 Filters {Object.keys(activeFilters).some(key =>
    Array.isArray(activeFilters[key]) ? activeFilters[key].length > 0 : activeFilters[key]
  ) && (
    <span className="ml-1 px-1.5 py-0.5 bg-indigo-500 text-white text-xs rounded-full">
      {[...activeFilters.types, ...activeFilters.status, ...activeFilters.tags, ...activeFilters.authors]
        .filter(Boolean).length}
    </span>
  )}
</button>
```

**Why:** Toggle to show/hide filter panel

---

#### **Task 2.4: Add FilterPanel Component to Layout**
**File:** `pie-docs-frontend/src/pages/documents/AdvancedDocumentLibraryV3.tsx`

```typescript
// IMPORT FilterPanel (add to imports at top)
import FilterPanel from '@/components/documents/FilterPanel';
import type { DocumentFilter } from '@/types/domain/Document';

// ADD FilterPanel in layout (line ~1113 - after DocumentSearchPanel)
{showFilters && (
  <FilterPanel
    filters={activeFilters}
    onFiltersChange={setActiveFilters}
    availableTypes={availableDocumentTypes}
    availableTags={availableTags}
    availableAuthors={availableAuthors}
    collapsed={false}
    onToggleCollapsed={() => setShowFilters(false)}
  />
)}
```

**Why:** Displays filter UI when toggled

---

#### **Task 2.5: Update handleSearch to Use Filters**
**File:** `pie-docs-frontend/src/pages/documents/AdvancedDocumentLibraryV3.tsx`

```typescript
// MODIFY handleSearch (line ~361 - filters parameter)
const searchApiResults = await searchService.search(
  searchQuery,
  {
    documentTypes: activeFilters.types,
    status: activeFilters.status,
    tags: activeFilters.tags,
    authors: activeFilters.authors,
    dateRange: activeFilters.dateRange
  }, // Pass filters instead of empty object
  1,
  50,
  'relevance',
  searchType
);
```

**Why:** Sends filter criteria to backend

---

#### **Task 2.6: Auto-Trigger Search When Filters Change**
**File:** `pie-docs-frontend/src/pages/documents/AdvancedDocumentLibraryV3.tsx`

```typescript
// ADD useEffect (line ~295 - near other useEffects)
useEffect(() => {
  // Only auto-search if we're in search mode
  if (searchResults?.isActive && searchQuery.trim()) {
    handleSearch({ preventDefault: () => {} } as React.FormEvent);
  }
}, [activeFilters]); // Re-run search when filters change
```

**Why:** Applies filters in real-time

---

#### **Task 2.7: Add Active Filters Display**
**File:** `pie-docs-frontend/src/pages/documents/AdvancedDocumentLibraryV3.tsx`

```typescript
// ADD after search results header (in renderFolderView, etc.)
{searchResults?.isActive && Object.keys(activeFilters).some(key =>
  Array.isArray(activeFilters[key]) ? activeFilters[key].length > 0 : activeFilters[key]
) && (
  <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-lg">
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-white/60 font-medium">Active Filters:</span>

      {activeFilters.types?.map(type => (
        <span key={type} className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-400/30 flex items-center gap-1">
          {type}
          <button
            onClick={() => setActiveFilters({
              ...activeFilters,
              types: activeFilters.types?.filter(t => t !== type)
            })}
            className="hover:text-purple-200"
          >✕</button>
        </span>
      ))}

      {activeFilters.status?.map(status => (
        <span key={status} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-400/30 flex items-center gap-1">
          {status}
          <button
            onClick={() => setActiveFilters({
              ...activeFilters,
              status: activeFilters.status?.filter(s => s !== status)
            })}
            className="hover:text-blue-200"
          >✕</button>
        </span>
      ))}

      {activeFilters.tags?.slice(0, 3).map(tag => (
        <span key={tag} className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-400/30 flex items-center gap-1">
          {tag}
          <button
            onClick={() => setActiveFilters({
              ...activeFilters,
              tags: activeFilters.tags?.filter(t => t !== tag)
            })}
            className="hover:text-green-200"
          >✕</button>
        </span>
      ))}

      {activeFilters.dateRange && (
        <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full border border-indigo-400/30 flex items-center gap-1">
          📅 {activeFilters.dateRange.start} - {activeFilters.dateRange.end}
          <button
            onClick={() => setActiveFilters({
              ...activeFilters,
              dateRange: undefined
            })}
            className="hover:text-indigo-200"
          >✕</button>
        </span>
      )}

      <button
        onClick={() => setActiveFilters({
          types: [],
          status: [],
          tags: [],
          authors: [],
          dateRange: undefined
        })}
        className="text-xs text-white/60 hover:text-white underline"
      >
        Clear all
      </button>
    </div>
  </div>
)}
```

**Why:** Shows active filters as removable badges

---

### **Validation Checklist for Phase 2**

- [ ] Filter button appears in view mode toolbar
- [ ] Filter badge shows count of active filters
- [ ] FilterPanel opens/closes when button clicked
- [ ] Filter options populated from actual documents
- [ ] Selecting filters triggers automatic re-search
- [ ] Active filters display as removable badges
- [ ] Clicking ✕ on filter badge removes that filter
- [ ] "Clear all" button removes all filters
- [ ] Search results update when filters change
- [ ] Filter panel can be collapsed/expanded

**Files Modified:** 1 file (`AdvancedDocumentLibraryV3.tsx`)
**Components Reused:** `FilterPanel.tsx` ✅
**Breaking Changes:** None

---

## 🚀 Phase 3: Search Enhancements

**Goal:** Add search suggestions, history, and improved UX

**Duration:** 4-5 hours

### **Tasks**

#### **Task 3.1: Add Search Suggestions State**
**File:** `pie-docs-frontend/src/pages/documents/AdvancedDocumentLibraryV3.tsx`

```typescript
// ADD state (line ~118)
const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
const [showSuggestions, setShowSuggestions] = useState(false);
```

---

#### **Task 3.2: Fetch Suggestions on Query Change**
**File:** `pie-docs-frontend/src/pages/documents/AdvancedDocumentLibraryV3.tsx`

```typescript
// ADD useEffect (line ~298)
useEffect(() => {
  const fetchSuggestions = async () => {
    if (searchQuery.length >= 2) {
      try {
        const suggestions = await searchService.getSuggestions(searchQuery, 5);
        setSearchSuggestions(suggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      }
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const debounceTimer = setTimeout(fetchSuggestions, 300);
  return () => clearTimeout(debounceTimer);
}, [searchQuery]);
```

**Why:** Provides autocomplete as user types

---

#### **Task 3.3: Add Suggestions Prop to DocumentSearchPanel**
**File:** `pie-docs-frontend/src/components/documents/search/DocumentSearchPanel.tsx`

```typescript
// MODIFY interface (line 7)
export interface DocumentSearchPanelProps {
  // ... existing props
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

// ADD suggestions dropdown (after textarea, line ~90)
{suggestions && suggestions.length > 0 && (
  <div className="absolute top-full left-0 right-0 mt-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
    {suggestions.map((suggestion, index) => (
      <button
        key={index}
        onClick={() => onSuggestionClick?.(suggestion)}
        className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/20 transition-colors border-b border-white/10 last:border-b-0"
      >
        🔍 {suggestion}
      </button>
    ))}
  </div>
)}
```

---

#### **Task 3.4: Pass Suggestions to DocumentSearchPanel**
**File:** `pie-docs-frontend/src/pages/documents/AdvancedDocumentLibraryV3.tsx`

```typescript
// MODIFY DocumentSearchPanel component usage (line ~1014)
<DocumentSearchPanel
  searchQuery={searchQuery}
  onSearchQueryChange={setSearchQuery}
  searchType={searchType}
  onSearchTypeChange={setSearchType}
  onSearch={handleSearch}
  suggestions={showSuggestions ? searchSuggestions : undefined}
  onSuggestionClick={(suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    // Auto-trigger search after selecting suggestion
    setTimeout(() => handleSearch({ preventDefault: () => {} } as React.FormEvent), 100);
  }}
  showPreview={showPreview}
  isCollapsed={isSearchPanelCollapsed}
  onClose={() => setIsSearchPanelCollapsed(true)}
/>
```

---

#### **Task 3.5: Add Search History Panel**
**File:** `pie-docs-frontend/src/components/documents/search/DocumentSearchPanel.tsx`

```typescript
// MODIFY interface (line 7)
export interface DocumentSearchPanelProps {
  // ... existing props
  searchHistory?: Array<{ query: string; timestamp: string }>;
}

// ADD history section (replace "Recent AI Insights" section, line ~164-185)
{searchHistory && searchHistory.length > 0 && (
  <div className="flex-1 overflow-y-auto p-4">
    <h3 className="text-sm font-semibold text-white/80 mb-3">Recent Searches</h3>
    <div className="space-y-2">
      {searchHistory.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            onSearchQueryChange(item.query);
            setTimeout(() => onSearch({ preventDefault: () => {} } as React.FormEvent), 100);
          }}
          className="w-full text-left p-2 bg-white/5 rounded text-xs text-white/70 hover:bg-white/10 hover:text-white transition-all"
        >
          <div className="flex items-center gap-2">
            <span>🕒</span>
            <span className="flex-1 truncate">{item.query}</span>
          </div>
          <div className="text-[10px] text-white/40 mt-1">
            {new Date(item.timestamp).toLocaleString()}
          </div>
        </button>
      ))}
    </div>
  </div>
)}
```

---

#### **Task 3.6: Fetch and Display Search History**
**File:** `pie-docs-frontend/src/pages/documents/AdvancedDocumentLibraryV3.tsx`

```typescript
// ADD state (line ~120)
const [searchHistory, setSearchHistory] = useState<Array<{ query: string; timestamp: string }>>([]);

// ADD useEffect (line ~300)
useEffect(() => {
  const fetchHistory = async () => {
    try {
      const history = await searchService.getSearchHistory(10);
      setSearchHistory(history.history || []);
    } catch (error) {
      console.error('Failed to fetch search history:', error);
    }
  };

  fetchHistory();
}, [searchResults]); // Refresh after each search

// MODIFY DocumentSearchPanel usage (line ~1014)
<DocumentSearchPanel
  // ... existing props
  searchHistory={searchHistory}
/>
```

---

### **Validation Checklist for Phase 3**

- [ ] Suggestions appear as user types (after 2 characters)
- [ ] Clicking suggestion populates search field and triggers search
- [ ] Suggestions are debounced (don't fire on every keystroke)
- [ ] Search history displays recent searches
- [ ] Clicking history item re-runs that search
- [ ] History updates after each new search
- [ ] Suggestions dropdown has proper z-index and styling

**Files Modified:** 2 files (`AdvancedDocumentLibraryV3.tsx`, `DocumentSearchPanel.tsx`)
**New Components:** 0
**Breaking Changes:** None

---

## 🎨 Phase 4: Advanced Features

**Goal:** Add similar documents, search stats, and RAG Q&A

**Duration:** 5-6 hours

### **Tasks**

#### **Task 4.1: Add "Similar Documents" Feature**
**File:** `pie-docs-frontend/src/components/documents/intelligence/DocumentIntelligencePanel.tsx`

```typescript
// ADD similar documents section (check if exists first, if not add)
const [similarDocuments, setSimilarDocuments] = useState<any[]>([]);
const [loadingSimilar, setLoadingSimilar] = useState(false);

useEffect(() => {
  const fetchSimilar = async () => {
    if (!document?.id) return;

    setLoadingSimilar(true);
    try {
      const similar = await searchService.findSimilarDocuments(document.id, 5);
      setSimilarDocuments(similar.similar_documents || []);
    } catch (error) {
      console.error('Failed to fetch similar documents:', error);
    } finally {
      setLoadingSimilar(false);
    }
  };

  fetchSimilar();
}, [document?.id]);

// ADD UI section
<div className="p-4 border-b border-white/10">
  <h3 className="text-sm font-semibold text-white/80 mb-3">
    Similar Documents
  </h3>
  {loadingSimilar ? (
    <div className="text-xs text-white/60">Loading...</div>
  ) : similarDocuments.length > 0 ? (
    <div className="space-y-2">
      {similarDocuments.map(doc => (
        <div key={doc.id} className="p-2 bg-white/5 rounded text-xs hover:bg-white/10 cursor-pointer">
          <div className="text-white/80 font-medium truncate">{doc.title}</div>
          <div className="text-white/40 mt-1">
            Similarity: {(doc.similarity * 100).toFixed(0)}%
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="text-xs text-white/60">No similar documents found</div>
  )}
</div>
```

---

#### **Task 4.2: Add Search Stats Dashboard**
**File:** Create new component `pie-docs-frontend/src/components/documents/search/SearchStatsPanel.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { searchService } from '@/services/api/searchService';

export const SearchStatsPanel: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await searchService.getSearchStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch search stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <div className="text-white/60 text-sm">Loading stats...</div>;
  if (!stats) return null;

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white/80 mb-2">Search Statistics</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-white/5 rounded">
            <div className="text-2xl font-bold text-white">{stats.total_searches}</div>
            <div className="text-xs text-white/60">Total Searches</div>
          </div>
          <div className="p-3 bg-white/5 rounded">
            <div className="text-2xl font-bold text-white">{stats.average_results?.toFixed(1)}</div>
            <div className="text-xs text-white/60">Avg Results</div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-white/70 mb-2">Top Queries</h4>
        <div className="space-y-1">
          {stats.top_queries?.slice(0, 5).map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-white/70 truncate flex-1">{item.query}</span>
              <span className="text-white/50 ml-2">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-white/70 mb-2">Search Types</h4>
        <div className="space-y-1">
          {stats.search_types?.map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-white/70 capitalize">{item.type}</span>
              <span className="text-white/50">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

**Then add to DocumentSearchPanel or as separate tab**

---

#### **Task 4.3: Add RAG Q&A Mode Toggle**
**File:** `pie-docs-frontend/src/components/documents/search/DocumentSearchPanel.tsx`

```typescript
// MODIFY interface (line 10)
export interface DocumentSearchPanelProps {
  // ... existing props
  searchMode?: 'document' | 'qa';
  onSearchModeChange?: (mode: 'document' | 'qa') => void;
}

// ADD mode toggle (after search type toggle, line ~70)
<div className="flex items-center gap-2 mb-3 p-1 bg-white/5 rounded-lg">
  <button
    onClick={() => onSearchModeChange?.('document')}
    className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
      searchMode === 'document' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/80'
    }`}
  >
    📄 Documents
  </button>
  <button
    onClick={() => onSearchModeChange?.('qa')}
    className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
      searchMode === 'qa' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/80'
    }`}
  >
    💬 Q&A
  </button>
</div>
```

---

#### **Task 4.4: Implement RAG Q&A Handler**
**File:** `pie-docs-frontend/src/pages/documents/AdvancedDocumentLibraryV3.tsx`

```typescript
// ADD state (line ~122)
const [searchMode, setSearchMode] = useState<'document' | 'qa'>('document');
const [ragResponse, setRagResponse] = useState<any>(null);

// ADD RAG handler
const handleRagQuery = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!searchQuery.trim()) return;

  setIsLoading(true);
  setError(null);

  try {
    const response = await searchService.ragQuery(searchQuery, 5);
    setRagResponse(response);

    // Also show the source documents
    const sourceDocIds = response.sources.map((s: any) => s.document_id);
    // Filter documents to show only sources
    // (Implementation depends on your needs)

  } catch (error) {
    console.error('RAG query error:', error);
    setError(error instanceof Error ? error.message : 'RAG query failed');
  } finally {
    setIsLoading(false);
  }
};

// MODIFY handleSearch to check mode
const handleSearch = async (e: React.FormEvent) => {
  e.preventDefault();

  if (searchMode === 'qa') {
    return handleRagQuery(e);
  }

  // ... existing document search logic
};
```

---

#### **Task 4.5: Add RAG Response Display**
**File:** `pie-docs-frontend/src/pages/documents/AdvancedDocumentLibraryV3.tsx`

```typescript
// ADD after search results header
{ragResponse && searchMode === 'qa' && (
  <div className="mb-4 p-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-400/30 rounded-lg">
    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
      <span>💬</span>
      AI Answer
    </h3>
    <div className="prose prose-invert max-w-none">
      <p className="text-white/90 text-sm leading-relaxed">{ragResponse.answer}</p>
    </div>

    <div className="mt-4 pt-4 border-t border-white/10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/60">Confidence: {(ragResponse.confidence * 100).toFixed(0)}%</span>
        <span className="text-xs text-white/60">{ragResponse.relevant_chunks?.length} sources</span>
      </div>

      <details className="text-xs">
        <summary className="cursor-pointer text-indigo-300 hover:text-indigo-200">
          View Sources
        </summary>
        <div className="mt-2 space-y-2">
          {ragResponse.sources?.map((source: any, i: number) => (
            <div key={i} className="p-2 bg-white/5 rounded">
              <div className="font-medium text-white/80">{source.title}</div>
              <div className="text-white/60 mt-1">{source.document_type}</div>
            </div>
          ))}
        </div>
      </details>
    </div>
  </div>
)}
```

---

### **Validation Checklist for Phase 4**

- [ ] Similar documents appear in DocumentIntelligencePanel
- [ ] Similarity percentages display correctly
- [ ] Search stats panel shows total searches, avg results
- [ ] Top queries display in stats
- [ ] Q&A mode toggle switches between document search and RAG
- [ ] RAG Q&A provides AI-generated answers
- [ ] RAG response shows confidence score
- [ ] Source documents listed under RAG answer
- [ ] "View Sources" details expand/collapse works

**Files Modified:** 3 files (`AdvancedDocumentLibraryV3.tsx`, `DocumentSearchPanel.tsx`, `DocumentIntelligencePanel.tsx`)
**New Components:** 1 (`SearchStatsPanel.tsx`)
**Breaking Changes:** None

---

## ✅ Testing & Validation

### **End-to-End Testing Scenarios**

#### **Scenario 1: Basic Semantic Search**
1. Navigate to Document Library
2. Type "vendor contracts" in search box
3. Select "Semantic" search type
4. Click "Search"
5. **Expected:**
   - Search results header appears with query, count, time
   - Documents display with relevance badges
   - Badges show 90%+ relevance in green
   - Clear Search button visible

#### **Scenario 2: Filter Integration**
1. Perform search from Scenario 1
2. Click "Filters" button
3. Select document type "Contract"
4. Select date range Q3 2024
5. **Expected:**
   - FilterPanel appears
   - Active filters show as badges below search header
   - Results automatically update
   - Result count decreases
   - Each filter has × to remove

#### **Scenario 3: Search Suggestions**
1. Clear any active search
2. Type "con" in search box
3. Wait 300ms
4. **Expected:**
   - Dropdown appears with suggestions
   - Contains "contracts", "confidential", etc.
   - Clicking suggestion populates search and triggers search
   - Suggestions hide after selection

#### **Scenario 4: Search History**
1. Perform 2-3 different searches
2. Scroll to bottom of DocumentSearchPanel
3. **Expected:**
   - Recent searches listed with timestamps
   - Clicking history item re-runs search
   - Most recent searches appear first

#### **Scenario 5: RAG Q&A Mode**
1. Switch to "Q&A" mode in search panel
2. Type "What are the payment terms in vendor contracts?"
3. Click Search
4. **Expected:**
   - AI-generated answer displays
   - Confidence score shows
   - Source documents listed
   - "View Sources" expandable section works

#### **Scenario 6: Similar Documents**
1. Open any document in preview
2. Look at DocumentIntelligencePanel
3. **Expected:**
   - "Similar Documents" section appears
   - 5 similar docs listed
   - Each shows similarity percentage
   - Clicking opens that document

#### **Scenario 7: Clear Search**
1. Perform any search with filters
2. Click "Clear Search" button
3. **Expected:**
   - Search results header disappears
   - Relevance badges disappear
   - All documents reload (normal browse mode)
   - Filters remain visible but inactive

---

### **Performance Testing**

- [ ] Search completes in <1s for typical queries
- [ ] Suggestions appear within 300ms of typing
- [ ] Filter changes trigger search in <500ms
- [ ] No UI freezing during search
- [ ] Large result sets (100+ docs) render smoothly

---

### **Regression Testing**

- [ ] Normal document browsing still works
- [ ] Folder navigation unaffected
- [ ] Document upload still works
- [ ] Document preview still works
- [ ] All existing tools (tags, metadata, etc.) still work
- [ ] View mode switching (grid/list/detail) still works

---

## 📊 Summary

### **Implementation Stats**

| Metric | Count |
|--------|-------|
| Total Phases | 4 |
| Total Tasks | 26 |
| Files Modified | 4 |
| New Components | 1 |
| Existing Components Reused | 3 |
| Estimated Total Time | 14-18 hours |

### **Components Reused** ✅
- `FilterPanel.tsx` - Full filter UI
- `DocumentSearchPanel.tsx` - Search input panel
- `DocumentIntelligencePanel.tsx` - Intelligence display
- Existing state in `AdvancedDocumentLibraryV3.tsx`

### **Risk Assessment**

| Risk | Mitigation |
|------|------------|
| Breaking existing features | Regression testing after each phase |
| Performance issues | Debouncing, pagination, memoization |
| Complex state management | Clear separation of search/browse modes |
| API failures | Error handling, fallback to basic search |

---

## 🎯 Next Steps

1. **Phase 1** - Start with search results display (lowest risk, immediate value)
2. **Validate** - Test thoroughly before moving to Phase 2
3. **Phase 2** - Add filters (builds on Phase 1)
4. **Validate** - Ensure filters work correctly
5. **Phase 3** - Enhancements (suggestions, history)
6. **Phase 4** - Advanced features (optional, can be done later)

**Ready to begin Phase 1?** Let me know and I'll start implementing!

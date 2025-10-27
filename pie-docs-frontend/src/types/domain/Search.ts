export interface SearchFilters {
  documentTypes?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  authors?: string[];
  status?: string[];
  customMetadata?: Record<string, any>;
  tags?: string[];
  folders?: string[];
}

export interface SearchQuery {
  text: string;
  filters: SearchFilters;
  boolean?: 'AND' | 'OR' | 'NOT';
  groups?: SearchQueryGroup[];
}

export interface SearchQueryGroup {
  operator: 'AND' | 'OR' | 'NOT';
  queries: SearchQuery[];
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  snippet: string;
  documentType: string;
  createdAt: string;
  modifiedAt: string;
  author: string;
  metadata: Record<string, any>;
  tags: string[];
  score: number;
  highlights: string[];
  thumbnailUrl?: string;
  previewUrl?: string;
  downloadUrl?: string;
}

export interface SearchState {
  query: string;
  filters: SearchFilters;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  totalResults: number;
  page: number;
  pageSize: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  query: SearchQuery;
  createdAt: string;
  modifiedAt: string;
  author: string;
  isShared: boolean;
}

export interface SearchSuggestion {
  text: string;
  type: 'query' | 'filter' | 'document' | 'metadata';
  category?: string;
  count?: number;
}

export interface SearchHistory {
  id: string;
  query: string;
  filters: SearchFilters;
  timestamp: string;
  resultCount: number;
}

export interface FacetValue {
  value: string;
  label: string;
  count: number;
  selected?: boolean;
}

export interface Facet {
  key: string;
  label: string;
  type: 'checkbox' | 'radio' | 'range' | 'date' | 'text';
  values: FacetValue[];
  isExpanded?: boolean;
}

export interface SearchExportOptions {
  format: 'csv' | 'pdf' | 'excel';
  includeContent: boolean;
  includeMetadata: boolean;
  selectedFields: string[];
  maxResults?: number;
}

export interface DocumentPreview {
  id: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
  thumbnailUrl?: string;
  previewUrl?: string;
  highlights: string[];
}

// NLP Query interfaces for Story 3.2
export interface ConversationMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  language?: 'en' | 'ar';
  metadata?: {
    intent?: string;
    confidence?: number;
    entities?: Array<{ type: string; value: string; }>;
    sources?: string[];
  };
}

export interface ConversationContext {
  id: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
  title?: string;
  language: 'en' | 'ar';
  isActive: boolean;
}

export interface NLPQueryState {
  conversations: ConversationContext[];
  activeConversationId: string | null;
  isProcessing: boolean;
  voiceInputEnabled: boolean;
  isListening: boolean;
  language: 'en' | 'ar';
  error: string | null;
}

export interface QueryIntent {
  type: 'search' | 'filter' | 'analytics' | 'action' | 'context';
  action: string;
  confidence: number;
  entities: Array<{
    type: 'document_type' | 'date' | 'author' | 'topic' | 'action';
    value: string;
    normalized?: string;
  }>;
  parameters?: Record<string, any>;
}

export interface QuestionTemplate {
  id: string;
  category: 'discovery' | 'status' | 'analytics' | 'action';
  title: string;
  description: string;
  template: string;
  parameters: Array<{
    name: string;
    type: 'text' | 'select' | 'date' | 'number';
    required: boolean;
    options?: string[];
  }>;
  language: 'en' | 'ar';
  examples: string[];
}

// Document search result with enhanced metadata
export interface DocumentSearchResult {
  id: string;
  title: string;
  content?: string;
  type: string;
  author?: string;
  createdAt?: string;
  modifiedAt?: string;
  tags?: string[];
  language?: string;
  metadata?: {
    accessCount?: number;
    lastAccessed?: string;
    size?: number;
    format?: string;
    [key: string]: any;
  };
  score?: number;
  highlights?: string[];
}
export interface VectorEmbedding {
  id: string;
  vector: number[];
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface SemanticSearchQuery {
  text: string;
  conceptualKeywords?: string[];
  semanticWeight?: number; // 0-1, how much to weight semantic vs keyword matching
  language?: 'en' | 'ar' | 'auto';
  includeRelated?: boolean;
  maxResults?: number;
}

import type { SearchResult } from './Search';

export interface SemanticSearchResult extends SearchResult {
  semanticScore: number; // 0-1 semantic similarity score
  conceptualRelevance: number; // 0-1 conceptual relevance score
  relatedConcepts: string[];
  conceptExplanation?: string; // Why this document is semantically relevant
  crossLanguageMatch?: boolean;
}

export interface DocumentSimilarity {
  documentId: string;
  similarityScore: number;
  sharedConcepts: string[];
  relationshipType: 'content' | 'topic' | 'citation' | 'temporal';
}

export interface ConceptCluster {
  id: string;
  name: string;
  concepts: string[];
  documentIds: string[];
  centroidVector: number[];
  coherenceScore: number; // How well documents in cluster relate
  subClusters?: ConceptCluster[];
  parentClusterId?: string;
}

export interface TopicHierarchy {
  id: string;
  name: string;
  level: number; // 0 = root, higher = more specific
  documentCount: number;
  children: TopicHierarchy[];
  parentId?: string;
  keywords: string[];
  confidence: number;
}

export interface SearchSuggestion {
  text: string;
  type: 'semantic' | 'conceptual' | 'related' | 'correction';
  confidence: number;
  reason?: string; // Why this suggestion was made
  conceptualBasis?: string[]; // Concepts that led to this suggestion
}

export interface FuzzyMatchResult {
  originalTerm: string;
  correctedTerm: string;
  confidence: number;
  correctionType: 'spelling' | 'ocr' | 'phonetic' | 'translation';
  alternatives: string[];
}

export interface SemanticSearchState {
  embeddings: Map<string, VectorEmbedding>;
  clusters: ConceptCluster[];
  topicHierarchy: TopicHierarchy[];
  isEmbeddingLoading: boolean;
  isClusteringLoading: boolean;
  semanticIndex: Map<string, number[]>; // document ID -> embedding
  conceptIndex: Map<string, string[]>; // concept -> document IDs
  lastIndexUpdate: string;
}

// API Response types
export interface SemanticSearchAPIResponse {
  results: SemanticSearchResult[];
  totalResults: number;
  semanticResults: number; // How many were found via semantic matching
  keywordResults: number; // How many were found via keyword matching
  processingTime: number;
  conceptsDetected: string[];
  suggestedQueries?: SearchSuggestion[];
}

export interface SimilarDocumentsAPIResponse {
  similarDocuments: DocumentSimilarity[];
  baseDocumentId: string;
  processingTime: number;
}

export interface ConceptClusterAPIResponse {
  clusters: ConceptCluster[];
  totalClusters: number;
  clusteringMethod: string;
  coherenceMetrics: Record<string, number>;
}

export interface TopicNavigationAPIResponse {
  hierarchy: TopicHierarchy[];
  totalTopics: number;
  detectionConfidence: number;
}
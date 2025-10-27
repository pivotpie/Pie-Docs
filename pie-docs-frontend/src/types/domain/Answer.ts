export interface Citation {
  id: string;
  documentId: string;
  documentTitle: string;
  sectionId?: string;
  sectionTitle?: string;
  pageNumber?: number;
  startOffset: number;
  endOffset: number;
  excerpt: string;
  confidence: number;
  url: string;
}

export interface GeneratedAnswer {
  id: string;
  query: string;
  content: string;
  citations: Citation[];
  confidence: number;
  confidenceExplanation: string;
  generatedAt: Date;
  processingTime: number;
  sources: string[];
  relatedQuestions: string[];
}

export interface AnswerValidation {
  isFactuallyAccurate: boolean;
  isComplete: boolean;
  hasContradictions: boolean;
  missingInformation: string[];
  qualityScore: number;
  validationNotes: string;
}

export interface AnswerFeedback {
  id: string;
  answerId: string;
  userId: string;
  rating: number; // 1-5 scale
  isHelpful: boolean;
  accuracy: number; // 1-5 scale
  completeness: number; // 1-5 scale
  clarity: number; // 1-5 scale
  comments: string;
  suggestedImprovements: string;
  createdAt: Date;
}

export interface ConversationContext {
  id: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  isArchived: boolean;
}

export interface ConversationMessage {
  id: string;
  type: 'question' | 'answer';
  content: string;
  timestamp: Date;
  answer?: GeneratedAnswer;
  references?: string[]; // IDs of previous messages this references
}

export interface AnswerGenerationRequest {
  query: string;
  conversationId?: string;
  searchResults: any[]; // From search results
  maxSources?: number;
  includeCitations?: boolean;
  confidenceThreshold?: number;
}

export interface AnswerGenerationResponse {
  answer: GeneratedAnswer;
  validation: AnswerValidation;
  processingMetadata: {
    documentsAnalyzed: number;
    totalTokens: number;
    modelUsed: string;
    processingSteps: string[];
  };
}

export interface ConfidenceScore {
  overall: number;
  factualAccuracy: number;
  sourceReliability: number;
  answerCompleteness: number;
  citationQuality: number;
  explanation: string;
}

export interface DocumentExcerpt {
  documentId: string;
  documentTitle: string;
  excerpt: string;
  relevanceScore: number;
  pageNumber?: number;
  sectionTitle?: string;
  highlightedTerms: string[];
}

export interface AnswerQualityMetrics {
  answerLength: number;
  sourceDiversity: number;
  citationDensity: number;
  readabilityScore: number;
  factualConsistency: number;
  completenessScore: number;
}
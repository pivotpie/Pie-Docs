import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnswerGenerator from '@/components/search/answers/AnswerGenerator';
import searchReducer from '@/store/slices/searchSlice';
import type { SearchResult } from '@/types/domain/Search';
import type { GeneratedAnswer } from '@/types/domain/Answer';

// Mock the answer generator service
vi.mock('@/services/nlp/answerGeneration/AnswerGenerator', () => ({
  answerGenerator: {
    generateAnswer: vi.fn(),
    streamAnswer: vi.fn(),
    cancelGeneration: vi.fn(),
    calculateConfidenceScore: vi.fn(),
  },
}));

const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    title: 'Test Document 1',
    content: 'This is test content about the query',
    snippet: 'This is test content about the query',
    score: 0.95,
    documentType: 'pdf',
    createdAt: '2024-01-01T00:00:00Z',
    modifiedAt: '2024-01-01T00:00:00Z',
    author: 'Test Author',
    tags: ['test', 'document'],
    highlights: ['test content'],
    metadata: {
      pageNumber: 1,
      sectionId: 'intro',
      sectionTitle: 'Introduction',
    },
  },
  {
    id: '2',
    title: 'Test Document 2',
    content: 'More relevant content for testing',
    snippet: 'More relevant content for testing',
    score: 0.88,
    documentType: 'docx',
    createdAt: '2024-01-02T00:00:00Z',
    modifiedAt: '2024-01-02T00:00:00Z',
    author: 'Test Author 2',
    tags: ['test', 'content'],
    highlights: ['relevant content'],
    metadata: {
      pageNumber: 5,
      sectionId: 'conclusion',
      sectionTitle: 'Conclusion',
    },
  },
];

const mockGeneratedAnswer: GeneratedAnswer = {
  id: 'answer-1',
  query: 'test query',
  content: 'This is a comprehensive answer based on the search results [1][2].',
  citations: [
    {
      id: 'citation-1',
      documentId: '1',
      documentTitle: 'Test Document 1',
      sectionId: 'intro',
      sectionTitle: 'Introduction',
      pageNumber: 1,
      startOffset: 0,
      endOffset: 100,
      snippet: 'This is test content about the query',
      confidence: 0.95,
      url: '/documents/1#section=intro',
    },
  ],
  confidence: 0.92,
  confidenceExplanation: 'High confidence based on reliable sources',
  generatedAt: new Date(),
  processingTime: 1500,
  sources: ['1', '2'],
  relatedQuestions: ['What is the main topic?', 'How does this relate to other documents?'],
};

describe('AnswerGenerator', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        search: searchReducer,
      },
      preloadedState: {
        search: {
          query: 'test query',
          results: mockSearchResults,
          isLoading: false,
          error: null,
          totalResults: 2,
          page: 1,
          pageSize: 20,
          filters: {},
          savedSearches: [],
          searchHistory: [],
          suggestions: [],
          isInitialized: true,
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
        },
      },
    });

    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <Provider store={store}>
        <AnswerGenerator
          query="test query"
          {...props}
        />
      </Provider>
    );
  };

  it('renders with empty query state', () => {
    renderComponent({ query: '' });

    expect(screen.getByText('🤖')).toBeInTheDocument();
    expect(screen.getByText('Enter a question to generate a comprehensive answer')).toBeInTheDocument();
  });

  it('shows search prompt when no search results available', () => {
    store = configureStore({
      reducer: {
        search: searchReducer,
      },
      preloadedState: {
        search: {
          query: 'test query',
          results: [],
          isLoading: false,
          error: null,
          totalResults: 0,
          page: 1,
          pageSize: 20,
          filters: {},
          savedSearches: [],
          searchHistory: [],
          suggestions: [],
          isInitialized: true,
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
        },
      },
    });

    render(
      <Provider store={store}>
        <AnswerGenerator query="test query" />
      </Provider>
    );

    expect(screen.getByText('🔍')).toBeInTheDocument();
    expect(screen.getByText('Run a search first to generate answers')).toBeInTheDocument();
  });

  it('displays generating state during answer generation', async () => {
    const { answerGenerator } = await import('@/services/nlp/answerGeneration/AnswerGenerator');

    // Mock streaming generator that yields slowly
    const mockStreamGenerator = async function* () {
      yield { content: 'Generating' };
      await new Promise(resolve => setTimeout(resolve, 100));
      yield { content: ' comprehensive' };
      await new Promise(resolve => setTimeout(resolve, 100));
      yield { content: ' answer...' };
    };

    vi.mocked(answerGenerator.streamAnswer).mockReturnValue(mockStreamGenerator());

    // Mock generateAnswer to resolve after streaming
    vi.mocked(answerGenerator.generateAnswer).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        answer: mockGeneratedAnswer,
        validation: {
          isFactuallyAccurate: true,
          isComplete: true,
          hasContradictions: false,
          missingInformation: [],
          qualityScore: 0.9,
          validationNotes: 'High quality answer',
        },
        processingMetadata: {
          documentsAnalyzed: 2,
          totalTokens: 150,
          modelUsed: 'test-model',
          processingSteps: ['retrieve', 'synthesize', 'validate'],
        },
      };
    });

    vi.mocked(answerGenerator.calculateConfidenceScore).mockReturnValue({
      overall: 0.92,
      factualAccuracy: 0.95,
      sourceReliability: 0.91,
      answerCompleteness: 0.88,
      citationQuality: 0.90,
      explanation: 'High confidence - comprehensive answer with reliable sources',
    });

    renderComponent();

    // Should show generating state initially
    await waitFor(() => {
      expect(screen.getByText('Generating comprehensive answer...')).toBeInTheDocument();
    }, { timeout: 1000 });

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  it('displays generated answer with confidence score', async () => {
    const { answerGenerator } = await import('@/services/nlp/answerGeneration/AnswerGenerator');

    // Mock immediate answer generation
    vi.mocked(answerGenerator.streamAnswer).mockReturnValue((async function* () {
      yield { content: mockGeneratedAnswer.content };
    })());

    vi.mocked(answerGenerator.generateAnswer).mockResolvedValue({
      answer: mockGeneratedAnswer,
      validation: {
        isFactuallyAccurate: true,
        isComplete: true,
        hasContradictions: false,
        missingInformation: [],
        qualityScore: 0.9,
        validationNotes: 'High quality answer',
      },
      processingMetadata: {
        documentsAnalyzed: 2,
        totalTokens: 150,
        modelUsed: 'test-model',
        processingSteps: ['retrieve', 'synthesize', 'validate'],
      },
    });

    vi.mocked(answerGenerator.calculateConfidenceScore).mockReturnValue({
      overall: 0.92,
      factualAccuracy: 0.95,
      sourceReliability: 0.91,
      answerCompleteness: 0.88,
      citationQuality: 0.90,
      explanation: 'High confidence - comprehensive answer with reliable sources',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Answer to: "test query"')).toBeInTheDocument();
    });

    // Wait for confidence score
    await waitFor(() => {
      expect(screen.getByText('92% Confidence')).toBeInTheDocument();
    });

    // Check for answer content
    expect(screen.getByText(/comprehensive answer based on the search results/)).toBeInTheDocument();

    // Check for source information
    expect(screen.getByText('Generated from 2 sources')).toBeInTheDocument();
    expect(screen.getByText('1.5s')).toBeInTheDocument();
  });

  it('handles answer generation errors', async () => {
    const { answerGenerator } = await import('@/services/nlp/answerGeneration/AnswerGenerator');

    vi.mocked(answerGenerator.streamAnswer).mockImplementation(async function* () {
      throw new Error('Network error');
    });

    vi.mocked(answerGenerator.generateAnswer).mockRejectedValue(new Error('Network error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('⚠️ Network error')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('allows cancelling answer generation', async () => {
    const { answerGenerator } = await import('@/services/nlp/answerGeneration/AnswerGenerator');

    // Mock streaming generator that never completes
    const mockStreamGenerator = async function* () {
      yield { content: 'Generating' };
      // Simulate long-running process
      await new Promise(resolve => setTimeout(resolve, 5000));
    };

    vi.mocked(answerGenerator.streamAnswer).mockReturnValue(mockStreamGenerator());

    renderComponent();

    // Wait for generating state
    await waitFor(() => {
      expect(screen.getByText('Generating comprehensive answer...')).toBeInTheDocument();
    });

    // Click cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(answerGenerator.cancelGeneration).toHaveBeenCalled();
  });

  it('calls onAnswerGenerated callback when answer is generated', async () => {
    const onAnswerGenerated = vi.fn();
    const { answerGenerator } = await import('@/services/nlp/answerGeneration/AnswerGenerator');

    vi.mocked(answerGenerator.streamAnswer).mockReturnValue((async function* () {
      yield { content: mockGeneratedAnswer.content };
    })());

    vi.mocked(answerGenerator.generateAnswer).mockResolvedValue({
      answer: mockGeneratedAnswer,
      validation: {
        isFactuallyAccurate: true,
        isComplete: true,
        hasContradictions: false,
        missingInformation: [],
        qualityScore: 0.9,
        validationNotes: 'High quality answer',
      },
      processingMetadata: {
        documentsAnalyzed: 2,
        totalTokens: 150,
        modelUsed: 'test-model',
        processingSteps: ['retrieve', 'synthesize', 'validate'],
      },
    });

    vi.mocked(answerGenerator.calculateConfidenceScore).mockReturnValue({
      overall: 0.92,
      factualAccuracy: 0.95,
      sourceReliability: 0.91,
      answerCompleteness: 0.88,
      citationQuality: 0.90,
      explanation: 'High confidence - comprehensive answer with reliable sources',
    });

    renderComponent({ onAnswerGenerated });

    await waitFor(() => {
      expect(onAnswerGenerated).toHaveBeenCalledWith(mockGeneratedAnswer);
    });
  });

  it('displays different confidence level colors', async () => {
    const { answerGenerator } = await import('@/services/nlp/answerGeneration/AnswerGenerator');

    vi.mocked(answerGenerator.streamAnswer).mockReturnValue((async function* () {
      yield { content: mockGeneratedAnswer.content };
    })());

    vi.mocked(answerGenerator.generateAnswer).mockResolvedValue({
      answer: mockGeneratedAnswer,
      validation: {
        isFactuallyAccurate: true,
        isComplete: true,
        hasContradictions: false,
        missingInformation: [],
        qualityScore: 0.9,
        validationNotes: 'High quality answer',
      },
      processingMetadata: {
        documentsAnalyzed: 2,
        totalTokens: 150,
        modelUsed: 'test-model',
        processingSteps: ['retrieve', 'synthesize', 'validate'],
      },
    });

    // Test high confidence (green)
    vi.mocked(answerGenerator.calculateConfidenceScore).mockReturnValue({
      overall: 0.92,
      factualAccuracy: 0.95,
      sourceReliability: 0.91,
      answerCompleteness: 0.88,
      citationQuality: 0.90,
      explanation: 'High confidence',
    });

    renderComponent();

    await waitFor(() => {
      const confidenceElement = screen.getByText('92% Confidence');
      expect(confidenceElement).toHaveClass('text-green-600', 'bg-green-100');
    });

    expect(screen.getByText('🟢')).toBeInTheDocument();
  });
});
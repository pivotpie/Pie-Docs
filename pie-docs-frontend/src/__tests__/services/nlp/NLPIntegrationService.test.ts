import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { NLPIntegrationService, NLPConfiguration, NLPProcessingResult } from '../../../services/nlp/NLPIntegrationService';
import { QueryProcessor } from '../../../services/nlp/QueryProcessor';
import { QueryExpander } from '../../../services/nlp/QueryExpander';
import { MultilingualProcessor } from '../../../services/nlp/MultilingualProcessor';
import { QuestionTemplateLibrary } from '../../../services/nlp/QuestionTemplateLibrary';
import { QueryRefinementEngine } from '../../../services/nlp/QueryRefinementEngine';
import { SpeechRecognitionService } from '../../../services/voice/SpeechRecognitionService';

// Mock all dependencies
vi.mock('../../../services/nlp/QueryProcessor', () => ({
  QueryProcessor: {
    getInstance: vi.fn(() => ({
      processQuery: vi.fn().mockResolvedValue({
        text: 'processed query',
        intent: 'search',
        entities: [],
        confidence: 0.8,
        language: 'en',
        timestamp: new Date()
      }),
      warmUp: vi.fn()
    }))
  }
}));

vi.mock('../../../services/nlp/QueryExpander', () => ({
  QueryExpander: {
    getInstance: vi.fn(() => ({
      expandQuery: vi.fn().mockResolvedValue({
        originalQuery: 'test query',
        expandedTerms: [],
        rankedVariations: [{ query: 'expanded test query', score: 0.9, explanation: 'synonym expansion' }],
        suggestedFilters: []
      }),
      warmUp: vi.fn()
    }))
  }
}));

vi.mock('../../../services/nlp/MultilingualProcessor', () => ({
  MultilingualProcessor: {
    getInstance: vi.fn(() => ({
      processQuery: vi.fn().mockResolvedValue({
        originalQuery: 'test query',
        detectedLanguage: 'en',
        confidence: 0.9,
        translatedQueries: {},
        processedEntities: [],
        crossLanguageMatches: []
      })
    }))
  }
}));

vi.mock('../../../services/nlp/QuestionTemplateLibrary', () => ({
  QuestionTemplateLibrary: {
    getInstance: vi.fn(() => ({
      searchTemplates: vi.fn().mockResolvedValue([{
        id: 'template1',
        name: 'Test Template',
        patterns: ['test pattern {param}'],
        description: 'Test template',
        category: 'test',
        language: 'en',
        parameters: [{ name: 'param', type: 'string', required: true }],
        query: 'SELECT * WHERE {param}',
        enabled: true
      }]),
      executeTemplate: vi.fn().mockResolvedValue({
        template: {
          id: 'template1',
          name: 'Test Template',
          patterns: ['test pattern {param}'],
          description: 'Test template',
          category: 'test',
          language: 'en',
          parameters: [{ name: 'param', type: 'string', required: true }],
          query: 'SELECT * WHERE {param}',
          enabled: true
        },
        parameters: { param: 'value' },
        generatedQuery: 'SELECT * WHERE value',
        suggestedFilters: {}
      }),
      preloadTemplates: vi.fn()
    }))
  }
}));

vi.mock('../../../services/nlp/QueryRefinementEngine', () => ({
  QueryRefinementEngine: {
    getInstance: vi.fn(() => ({
      getCurrentSession: vi.fn().mockReturnValue({
        id: 'session1',
        queries: [],
        currentQuery: 'test',
        refinements: [],
        followUpQuestions: []
      }),
      startSession: vi.fn().mockReturnValue('session1'),
      generateRefinements: vi.fn().mockResolvedValue([{
        originalQuery: 'test',
        suggestedQuery: 'refined test',
        reason: 'clarity improvement',
        confidence: 0.8,
        category: 'clarification'
      }])
    }))
  }
}));

vi.mock('../../../services/voice/SpeechRecognitionService', () => ({
  SpeechRecognitionService: {
    getInstance: vi.fn(() => ({
      processVoiceInput: vi.fn().mockResolvedValue({
        recognized: true,
        confidence: 0.9,
        parameters: {},
        suggestions: []
      })
    }))
  }
}));

describe('NLPIntegrationService', () => {
  let service: NLPIntegrationService;
  let mockQueryProcessor: any;
  let mockQueryExpander: any;
  let mockMultilingualProcessor: any;
  let mockTemplateLibrary: any;
  let mockRefinementEngine: any;
  let mockSpeechService: any;

  beforeEach(() => {
    // Reset singleton
    (NLPIntegrationService as any).instance = null;

    // Get mocked instances
    mockQueryProcessor = (QueryProcessor.getInstance as Mock)();
    mockQueryExpander = (QueryExpander.getInstance as Mock)();
    mockMultilingualProcessor = (MultilingualProcessor.getInstance as Mock)();
    mockTemplateLibrary = (QuestionTemplateLibrary.getInstance as Mock)();
    mockRefinementEngine = (QueryRefinementEngine.getInstance as Mock)();
    mockSpeechService = (SpeechRecognitionService.getInstance as Mock)();

    service = NLPIntegrationService.getInstance();
  });

  afterEach(() => {
    service.cleanup();
    vi.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should return singleton instance', () => {
      const instance1 = NLPIntegrationService.getInstance();
      const instance2 = NLPIntegrationService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with default configuration', () => {
      const config = service.getConfiguration();
      expect(config).toEqual({
        enableQueryExpansion: true,
        enableMultilingualSupport: true,
        enableTemplateSystem: true,
        enableQueryRefinement: true,
        enableVoiceInput: true,
        cacheEnabled: true,
        cacheTTL: 300000,
        maxCacheSize: 1000,
        performanceOptimization: 'basic',
        debugMode: false
      });
    });

    it('should initialize all NLP services', () => {
      expect(QueryProcessor.getInstance).toHaveBeenCalled();
      expect(QueryExpander.getInstance).toHaveBeenCalled();
      expect(MultilingualProcessor.getInstance).toHaveBeenCalled();
      expect(QuestionTemplateLibrary.getInstance).toHaveBeenCalled();
      expect(QueryRefinementEngine.getInstance).toHaveBeenCalled();
      expect(SpeechRecognitionService.getInstance).toHaveBeenCalled();
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig: Partial<NLPConfiguration> = {
        enableQueryExpansion: false,
        debugMode: true,
        performanceOptimization: 'aggressive'
      };

      service.updateConfiguration(newConfig);
      const config = service.getConfiguration();

      expect(config.enableQueryExpansion).toBe(false);
      expect(config.debugMode).toBe(true);
      expect(config.performanceOptimization).toBe('aggressive');
    });

    it('should maintain other configuration values when updating', () => {
      service.updateConfiguration({ debugMode: true });
      const config = service.getConfiguration();

      expect(config.enableMultilingualSupport).toBe(true);
      expect(config.cacheEnabled).toBe(true);
    });
  });

  describe('Query Processing Pipeline', () => {
    it('should process query through complete pipeline', async () => {
      const result = await service.processQuery('test query');

      expect(result).toMatchObject({
        originalQuery: 'test query',
        processedQuery: expect.objectContaining({
          text: 'processed query',
          intent: 'search',
          confidence: 0.8
        }),
        expandedQuery: expect.objectContaining({
          originalQuery: 'test query'
        }),
        multilingualResult: expect.objectContaining({
          originalQuery: 'test query'
        }),
        templateMatch: expect.objectContaining({
          generatedQuery: 'SELECT * WHERE value'
        }),
        refinementSuggestions: expect.arrayContaining([
          expect.objectContaining({
            suggestedQuery: 'refined test'
          })
        ]),
        searchResults: expect.any(Array),
        confidence: expect.any(Number),
        processingTime: expect.any(Number)
      });

      expect(result.metadata.usedComponents).toContain('QueryProcessor');
      expect(result.metadata.usedComponents).toContain('QueryExpander');
      expect(result.metadata.usedComponents).toContain('MultilingualProcessor');
      expect(result.metadata.usedComponents).toContain('QuestionTemplateLibrary');
      expect(result.metadata.usedComponents).toContain('QueryRefinementEngine');
    });

    it('should call all service methods with correct parameters', async () => {
      await service.processQuery('test query', { context: 'test' });

      expect(mockQueryProcessor.processQuery).toHaveBeenCalledWith('test query', { context: 'test' });
      expect(mockQueryExpander.expandQuery).toHaveBeenCalledWith('test query', expect.objectContaining({
        useCorpusAnalysis: true,
        includeSynonyms: true,
        includeAcronyms: true
      }));
      expect(mockMultilingualProcessor.processQuery).toHaveBeenCalledWith('test query', expect.objectContaining({
        targetLanguages: ['en', 'ar'],
        enableTranslation: true
      }));
      expect(mockTemplateLibrary.searchTemplates).toHaveBeenCalledWith('test query', expect.any(Object));
      expect(mockRefinementEngine.generateRefinements).toHaveBeenCalledWith('test query', expect.any(Object));
    });

    it('should skip disabled components', async () => {
      service.updateConfiguration({
        enableQueryExpansion: false,
        enableMultilingualSupport: false,
        enableTemplateSystem: false,
        enableQueryRefinement: false
      });

      const result = await service.processQuery('test query');

      expect(mockQueryExpander.expandQuery).not.toHaveBeenCalled();
      expect(mockMultilingualProcessor.processQuery).not.toHaveBeenCalled();
      expect(mockTemplateLibrary.searchTemplates).not.toHaveBeenCalled();
      expect(mockRefinementEngine.generateRefinements).not.toHaveBeenCalled();

      expect(result.metadata.usedComponents).toContain('QueryProcessor');
      expect(result.metadata.usedComponents).not.toContain('QueryExpander');
    });

    it('should handle processing errors gracefully', async () => {
      mockQueryProcessor.processQuery.mockRejectedValue(new Error('Processing failed'));

      const result = await service.processQuery('test query');

      expect(result.confidence).toBe(0.3);
      expect(result.metadata.errorOccurred).toBe(true);
      expect(result.metadata.usedComponents).toContain('fallback');
    });
  });

  describe('Caching System', () => {
    it('should cache successful results', async () => {
      const result1 = await service.processQuery('cache test');
      const result2 = await service.processQuery('cache test');

      expect(result1.metadata.cacheHit).toBe(false);
      expect(result2.metadata.cacheHit).toBe(true);

      // Processor should only be called once
      expect(mockQueryProcessor.processQuery).toHaveBeenCalledTimes(1);
    });

    it('should skip cache when requested', async () => {
      await service.processQuery('skip cache test');
      const result = await service.processQuery('skip cache test', {}, { skipCache: true });

      expect(result.metadata.cacheHit).toBe(false);
      expect(mockQueryProcessor.processQuery).toHaveBeenCalledTimes(2);
    });

    it('should respect cache TTL', async () => {
      service.updateConfiguration({ cacheTTL: 1 }); // 1ms TTL

      await service.processQuery('ttl test');

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await service.processQuery('ttl test');
      expect(result.metadata.cacheHit).toBe(false);
    });

    it('should clean cache when at capacity', async () => {
      service.updateConfiguration({ maxCacheSize: 2 });

      await service.processQuery('query1');
      await service.processQuery('query2');
      await service.processQuery('query3'); // Should trigger cleanup

      const cacheStats = service.getCacheStatistics();
      expect(cacheStats.size).toBeLessThanOrEqual(2);
    });

    it('should provide cache statistics', () => {
      const stats = service.getCacheStatistics();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRatio');
      expect(stats).toHaveProperty('memoryUsage');
    });
  });

  describe('Performance Optimization', () => {
    it('should track performance metrics', async () => {
      await service.processQuery('metrics test');

      const metrics = service.getPerformanceMetrics();
      expect(metrics.totalQueries).toBeGreaterThan(0);
      expect(metrics.avgProcessingTime).toBeGreaterThan(0);
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
    });

    it('should handle queue processing for non-high priority', async () => {
      service.updateConfiguration({ performanceOptimization: 'basic' });

      const promise1 = service.processQuery('queue test 1', {}, { priorityLevel: 'normal' });
      const promise2 = service.processQuery('queue test 2', {}, { priorityLevel: 'normal' });

      const results = await Promise.all([promise1, promise2]);

      expect(results).toHaveLength(2);
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
    });

    it('should bypass queue for high priority requests', async () => {
      service.updateConfiguration({ performanceOptimization: 'aggressive' });

      const result = await service.processQuery('priority test', {}, { priorityLevel: 'high' });

      expect(result).toBeDefined();
      expect(mockQueryProcessor.processQuery).toHaveBeenCalled();
    });

    it('should enable aggressive optimizations', () => {
      service.updateConfiguration({ performanceOptimization: 'aggressive' });

      expect(mockTemplateLibrary.preloadTemplates).toHaveBeenCalled();
      expect(mockQueryProcessor.warmUp).toHaveBeenCalled();
      expect(mockQueryExpander.warmUp).toHaveBeenCalled();
    });
  });

  describe('Voice Integration', () => {
    it('should process voice queries', async () => {
      const result = await service.processVoiceQuery('voice test query');

      expect(mockSpeechService.processVoiceInput).toHaveBeenCalledWith('voice test query');
      expect(result.voiceResult).toEqual({
        recognized: true,
        confidence: 0.9,
        parameters: {},
        suggestions: []
      });
    });

    it('should throw error when voice input is disabled', async () => {
      service.updateConfiguration({ enableVoiceInput: false });

      await expect(service.processVoiceQuery('test')).rejects.toThrow('Voice input is disabled');
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple queries in batches', async () => {
      const queries = ['query1', 'query2', 'query3', 'query4', 'query5'];
      const results = await service.processQueryBatch(queries);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.originalQuery).toBe(queries[index]);
      });
    });

    it('should respect batch size for aggressive optimization', async () => {
      service.updateConfiguration({ performanceOptimization: 'aggressive' });

      const queries = Array.from({ length: 25 }, (_, i) => `query${i}`);
      const results = await service.processQueryBatch(queries);

      expect(results).toHaveLength(25);
    });
  });

  describe('Query Result Combination', () => {
    it('should prefer template generated query', async () => {
      const result = await service.processQuery('template test');

      // The final search should use the template generated query
      expect(result.searchResults[0].title).toContain('SELECT * WHERE value');
    });

    it('should fall back to expanded query when no template match', async () => {
      mockTemplateLibrary.searchTemplates.mockResolvedValue([]);

      const result = await service.processQuery('expansion test');

      expect(result.searchResults[0].title).toContain('expanded test query');
    });

    it('should calculate confidence from multiple components', async () => {
      const result = await service.processQuery('confidence test');

      expect(result.confidence).toBeGreaterThan(0.8); // Should be high with good components
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Error Handling', () => {
    it('should handle service initialization errors', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (QueryProcessor.getInstance as Mock).mockImplementation(() => {
        throw new Error('Service initialization failed');
      });

      expect(() => {
        (NLPIntegrationService as any).instance = null;
        NLPIntegrationService.getInstance();
      }).not.toThrow();

      consoleErrorSpy.mockRestore();
    });

    it('should provide fallback result on complete pipeline failure', async () => {
      mockQueryProcessor.processQuery.mockRejectedValue(new Error('Complete failure'));

      const result = await service.processQuery('error test');

      expect(result.confidence).toBe(0.3);
      expect(result.metadata.errorOccurred).toBe(true);
      expect(result.processedQuery.intent).toBe('search');
    });

    it('should handle individual component failures gracefully', async () => {
      mockQueryExpander.expandQuery.mockRejectedValue(new Error('Expansion failed'));

      const result = await service.processQuery('partial error test');

      expect(result.processedQuery).toBeDefined();
      expect(result.expandedQuery).toBeUndefined();
      expect(result.metadata.usedComponents).toContain('QueryProcessor');
    });
  });

  describe('Memory Management', () => {
    it('should cleanup resources', () => {
      const cacheStats = service.getCacheStatistics();
      const initialSize = cacheStats.size;

      service.cleanup();

      const finalStats = service.getCacheStatistics();
      expect(finalStats.size).toBe(0);
    });

    it('should monitor memory usage', () => {
      const metrics = service.getPerformanceMetrics();
      expect(metrics).toHaveProperty('memoryUsage');
      expect(typeof metrics.memoryUsage).toBe('number');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complex multi-component queries', async () => {
      const result = await service.processQuery('Find all documents about machine learning from last month');

      expect(result.processedQuery).toBeDefined();
      expect(result.expandedQuery).toBeDefined();
      expect(result.multilingualResult).toBeDefined();
      expect(result.templateMatch).toBeDefined();
      expect(result.refinementSuggestions).toBeDefined();
      expect(result.searchResults).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should maintain session context across queries', async () => {
      await service.processQuery('What is machine learning?');
      await service.processQuery('Tell me more about that');

      expect(mockRefinementEngine.getCurrentSession).toHaveBeenCalled();
      expect(mockRefinementEngine.generateRefinements).toHaveBeenCalledTimes(2);
    });

    it('should handle multilingual queries efficiently', async () => {
      const result = await service.processQuery('البحث عن المستندات');

      expect(mockMultilingualProcessor.processQuery).toHaveBeenCalledWith(
        'البحث عن المستندات',
        expect.objectContaining({
          targetLanguages: ['en', 'ar']
        })
      );
      expect(result.multilingualResult).toBeDefined();
    });
  });
});
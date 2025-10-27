import { describe, it, expect, beforeEach } from 'vitest';
import { QueryRefinementEngine } from '@/services/nlp/QueryRefinementEngine';
import type { QueryIntent, DocumentSearchResult } from '@/types/domain/Search';
import type { UserContext } from '@/services/nlp/ContextManager';

describe('QueryRefinementEngine', () => {
  let engine: QueryRefinementEngine;
  let mockUserContext: UserContext;
  let mockIntent: QueryIntent;
  let mockResults: DocumentSearchResult[];

  beforeEach(() => {
    engine = QueryRefinementEngine.getInstance();

    mockUserContext = {
      id: 'test-user',
      role: 'admin',
      department: 'it',
      permissions: ['read', 'write'],
      recentActivity: {
        queries: ['database management', 'server configuration'],
        documents: [
          { id: 'doc1', title: 'Database Guide', type: 'manual' },
          { id: 'doc2', title: 'Server Setup', type: 'guide' }
        ],
        topics: ['database', 'server', 'configuration']
      },
      preferences: {
        language: 'en',
        documentTypes: ['manual', 'guide'],
        searchHistory: ['database backup', 'server monitoring']
      }
    };

    mockIntent = {
      type: 'search',
      action: 'find',
      confidence: 0.8,
      entities: [
        { type: 'topic', value: 'database', normalized: 'database' }
      ],
      parameters: {}
    };

    mockResults = [
      {
        id: 'result1',
        title: 'Database Administration Guide',
        content: 'Complete guide for database administration',
        type: 'manual',
        language: 'en',
        author: 'John Smith',
        score: 0.9
      },
      {
        id: 'result2',
        title: 'SQL Tutorial',
        content: 'Learning SQL database queries',
        type: 'tutorial',
        language: 'en',
        author: 'Jane Doe',
        score: 0.8
      },
      {
        id: 'result3',
        title: 'Database Backup Procedures',
        content: 'How to backup databases',
        type: 'guide',
        language: 'en',
        author: 'John Smith',
        score: 0.7
      }
    ];
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = QueryRefinementEngine.getInstance();
      const instance2 = QueryRefinementEngine.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('session management', () => {
    it('should create a new session', () => {
      const sessionId = engine.createSession('user123', mockUserContext);

      expect(sessionId).toContain('session_user123_');
      expect(sessionId.length).toBeGreaterThan(20);

      const session = engine.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.id).toBe(sessionId);
      expect(session?.userContext).toEqual(mockUserContext);
      expect(session?.queries).toEqual([]);
    });

    it('should update session context', () => {
      const sessionId = engine.createSession('user123');

      engine.updateSessionContext(sessionId, mockUserContext);

      const session = engine.getSession(sessionId);
      expect(session?.userContext).toEqual(mockUserContext);
    });

    it('should handle non-existent session', () => {
      const session = engine.getSession('non-existent');
      expect(session).toBeUndefined();
    });
  });

  describe('query processing', () => {
    it('should add query to session and generate refinements', () => {
      const sessionId = engine.createSession('user123', mockUserContext);

      engine.addQueryToSession(sessionId, 'database administration', mockIntent, mockResults);

      const session = engine.getSession(sessionId);
      expect(session?.queries).toHaveLength(1);
      expect(session?.queries[0].text).toBe('database administration');
      expect(session?.queries[0].intent).toEqual(mockIntent);
      expect(session?.queries[0].results).toEqual(mockResults);
      expect(session?.sessionMetrics.totalQueries).toBe(1);
    });

    it('should throw error for non-existent session', () => {
      expect(() => {
        engine.addQueryToSession('non-existent', 'test query', mockIntent, mockResults);
      }).toThrow('Session not found: non-existent');
    });

    it('should update session metrics correctly', () => {
      const sessionId = engine.createSession('user123');

      engine.addQueryToSession(sessionId, 'first query', mockIntent, mockResults);
      engine.addQueryToSession(sessionId, 'second query', mockIntent, []);

      const session = engine.getSession(sessionId);
      expect(session?.sessionMetrics.totalQueries).toBe(2);
      expect(session?.currentQuery).toBe('second query');
    });
  });

  describe('refinement suggestions', () => {
    let sessionId: string;

    beforeEach(() => {
      sessionId = engine.createSession('user123', mockUserContext);
      engine.addQueryToSession(sessionId, 'database', mockIntent, mockResults);
    });

    it('should generate refinement suggestions', () => {
      const refinements = engine.getRefinementSuggestions(sessionId);

      expect(refinements.length).toBeGreaterThan(0);
      expect(refinements[0]).toHaveProperty('id');
      expect(refinements[0]).toHaveProperty('type');
      expect(refinements[0]).toHaveProperty('title');
      expect(refinements[0]).toHaveProperty('confidence');
    });

    it('should sort refinements by confidence', () => {
      const refinements = engine.getRefinementSuggestions(sessionId);

      for (let i = 1; i < refinements.length; i++) {
        expect(refinements[i-1].confidence).toBeGreaterThanOrEqual(refinements[i].confidence);
      }
    });

    it('should generate filter refinements for multiple document types', () => {
      const refinements = engine.getRefinementSuggestions(sessionId);

      const filterRefinements = refinements.filter(r => r.type === 'filter');
      expect(filterRefinements.length).toBeGreaterThan(0);

      const typeFilters = filterRefinements.filter(r => r.title.includes('Filter by'));
      expect(typeFilters.length).toBeGreaterThan(0);
    });

    it('should generate expansion refinements for few results', () => {
      // Test with fewer results
      engine.addQueryToSession(sessionId, 'very specific query', mockIntent, [mockResults[0]]);

      const refinements = engine.getRefinementSuggestions(sessionId);
      const expandRefinements = refinements.filter(r => r.type === 'expand');

      expect(expandRefinements.length).toBeGreaterThan(0);
    });

    it('should generate narrowing refinements for many results', () => {
      // Create many mock results
      const manyResults = Array.from({ length: 25 }, (_, i) => ({
        ...mockResults[0],
        id: `result${i}`,
        title: `Document ${i}`
      }));

      engine.addQueryToSession(sessionId, 'broad query', mockIntent, manyResults);

      const refinements = engine.getRefinementSuggestions(sessionId);
      const narrowRefinements = refinements.filter(r => r.type === 'narrow');

      expect(narrowRefinements.length).toBeGreaterThan(0);
    });

    it('should generate alternative query suggestions', () => {
      const refinements = engine.getRefinementSuggestions(sessionId);
      const alternativeRefinements = refinements.filter(r => r.type === 'alternative');

      expect(alternativeRefinements.length).toBeGreaterThan(0);
      expect(alternativeRefinements[0]).toHaveProperty('newQuery');
    });

    it('should generate clarification suggestions for ambiguous queries', () => {
      // Add an ambiguous query
      const ambiguousIntent = { ...mockIntent, confidence: 0.4 };
      engine.addQueryToSession(sessionId, 'it', ambiguousIntent, []);

      const refinements = engine.getRefinementSuggestions(sessionId);
      const clarifyRefinements = refinements.filter(r => r.type === 'clarify');

      expect(clarifyRefinements.length).toBeGreaterThan(0);
    });
  });

  describe('follow-up questions', () => {
    let sessionId: string;

    beforeEach(() => {
      sessionId = engine.createSession('user123', mockUserContext);
    });

    it('should generate follow-up questions', () => {
      engine.addQueryToSession(sessionId, 'database', mockIntent, mockResults);

      const followUps = engine.getFollowUpQuestions(sessionId);

      expect(followUps.length).toBeGreaterThan(0);
      expect(followUps[0]).toHaveProperty('id');
      expect(followUps[0]).toHaveProperty('text');
      expect(followUps[0]).toHaveProperty('type');
      expect(followUps[0]).toHaveProperty('priority');
    });

    it('should sort follow-up questions by priority', () => {
      engine.addQueryToSession(sessionId, 'database', mockIntent, mockResults);

      const followUps = engine.getFollowUpQuestions(sessionId);

      for (let i = 1; i < followUps.length; i++) {
        expect(followUps[i-1].priority).toBeGreaterThanOrEqual(followUps[i].priority);
      }
    });

    it('should generate no results clarification', () => {
      engine.addQueryToSession(sessionId, 'nonexistent topic', mockIntent, []);

      const followUps = engine.getFollowUpQuestions(sessionId);
      const noResultsQuestion = followUps.find(q => q.id === 'no_results_clarify');

      expect(noResultsQuestion).toBeDefined();
      expect(noResultsQuestion?.type).toBe('clarification');
      expect(noResultsQuestion?.priority).toBe(9);
    });

    it('should generate too many results question', () => {
      const manyResults = Array.from({ length: 60 }, (_, i) => ({
        ...mockResults[0],
        id: `result${i}`
      }));

      engine.addQueryToSession(sessionId, 'broad query', mockIntent, manyResults);

      const followUps = engine.getFollowUpQuestions(sessionId);
      const tooManyQuestion = followUps.find(q => q.id === 'too_many_results');

      expect(tooManyQuestion).toBeDefined();
      expect(tooManyQuestion?.type).toBe('suggestion');
    });

    it('should generate document type preference question', () => {
      engine.addQueryToSession(sessionId, 'database', mockIntent, mockResults);

      const followUps = engine.getFollowUpQuestions(sessionId);
      const typeQuestion = followUps.find(q => q.id === 'document_type_preference');

      expect(typeQuestion).toBeDefined();
      expect(typeQuestion?.suggestedAnswers).toBeDefined();
      expect(typeQuestion?.context?.documentTypes).toBeDefined();
    });

    it('should generate related topics question based on user context', () => {
      engine.addQueryToSession(sessionId, 'administration', mockIntent, mockResults);

      const followUps = engine.getFollowUpQuestions(sessionId);
      const relatedQuestion = followUps.find(q => q.id === 'related_topics');

      expect(relatedQuestion).toBeDefined();
      expect(relatedQuestion?.type).toBe('expansion');
    });

    it('should generate satisfaction check for multiple queries', () => {
      engine.addQueryToSession(sessionId, 'first query', mockIntent, mockResults);
      engine.addQueryToSession(sessionId, 'second query', mockIntent, mockResults);

      const followUps = engine.getFollowUpQuestions(sessionId);
      const satisfactionQuestion = followUps.find(q => q.id === 'satisfaction_check');

      expect(satisfactionQuestion).toBeDefined();
      expect(satisfactionQuestion?.type).toBe('validation');
    });
  });

  describe('refinement application', () => {
    let sessionId: string;

    beforeEach(() => {
      sessionId = engine.createSession('user123', mockUserContext);
      engine.addQueryToSession(sessionId, 'database', mockIntent, mockResults);
    });

    it('should apply filter refinement', () => {
      const refinements = engine.getRefinementSuggestions(sessionId);
      const filterRefinement = refinements.find(r => r.type === 'filter');

      if (filterRefinement) {
        const refinedQuery = engine.applyRefinement(sessionId, filterRefinement.id);
        expect(refinedQuery).toContain('database');
        expect(refinedQuery.length).toBeGreaterThan('database'.length);
      }
    });

    it('should apply expansion refinement', () => {
      // First create a session with few results
      engine.addQueryToSession(sessionId, 'very specific', mockIntent, [mockResults[0]]);

      const refinements = engine.getRefinementSuggestions(sessionId);
      const expandRefinement = refinements.find(r => r.type === 'expand');

      if (expandRefinement) {
        const refinedQuery = engine.applyRefinement(sessionId, expandRefinement.id);
        expect(refinedQuery).toBeDefined();
        expect(typeof refinedQuery).toBe('string');
      }
    });

    it('should apply alternative refinement', () => {
      const refinements = engine.getRefinementSuggestions(sessionId);
      const alternativeRefinement = refinements.find(r => r.type === 'alternative');

      if (alternativeRefinement) {
        const refinedQuery = engine.applyRefinement(sessionId, alternativeRefinement.id);
        expect(refinedQuery).toBe(alternativeRefinement.newQuery);
      }
    });

    it('should throw error for non-existent refinement', () => {
      expect(() => {
        engine.applyRefinement(sessionId, 'non-existent-refinement');
      }).toThrow('Refinement not found: non-existent-refinement');
    });

    it('should update refinement count in metrics', () => {
      const initialMetrics = engine.getSessionAnalytics(sessionId);
      const initialCount = initialMetrics.refinementCount;

      const refinements = engine.getRefinementSuggestions(sessionId);
      if (refinements.length > 0) {
        engine.applyRefinement(sessionId, refinements[0].id);

        const updatedMetrics = engine.getSessionAnalytics(sessionId);
        expect(updatedMetrics.refinementCount).toBe(initialCount + 1);
      }
    });
  });

  describe('satisfaction tracking', () => {
    let sessionId: string;

    beforeEach(() => {
      sessionId = engine.createSession('user123', mockUserContext);
      engine.addQueryToSession(sessionId, 'database', mockIntent, mockResults);
    });

    it('should record satisfaction score', () => {
      engine.recordSatisfaction(sessionId, 0, 0.8);

      const session = engine.getSession(sessionId);
      expect(session?.queries[0].userSatisfaction).toBe(0.8);
    });

    it('should update average satisfaction in metrics', () => {
      engine.addQueryToSession(sessionId, 'second query', mockIntent, mockResults);

      engine.recordSatisfaction(sessionId, 0, 0.8);
      engine.recordSatisfaction(sessionId, 1, 0.6);

      const metrics = engine.getSessionAnalytics(sessionId);
      expect(metrics.averageSatisfaction).toBe(0.7);
    });

    it('should track successful searches', () => {
      engine.recordSatisfaction(sessionId, 0, 0.8); // Successful (>= 0.7)

      const metrics = engine.getSessionAnalytics(sessionId);
      expect(metrics.successfulSearches).toBe(1);
    });

    it('should not count low satisfaction as successful', () => {
      engine.recordSatisfaction(sessionId, 0, 0.5); // Not successful (< 0.7)

      const metrics = engine.getSessionAnalytics(sessionId);
      expect(metrics.successfulSearches).toBe(0);
    });

    it('should handle invalid query index gracefully', () => {
      expect(() => {
        engine.recordSatisfaction(sessionId, 10, 0.8);
      }).not.toThrow();
    });
  });

  describe('session analytics', () => {
    let sessionId: string;

    beforeEach(() => {
      sessionId = engine.createSession('user123', mockUserContext);
    });

    it('should return session metrics', () => {
      const metrics = engine.getSessionAnalytics(sessionId);

      expect(metrics).toHaveProperty('totalQueries');
      expect(metrics).toHaveProperty('refinementCount');
      expect(metrics).toHaveProperty('averageSatisfaction');
      expect(metrics).toHaveProperty('successfulSearches');
    });

    it('should throw error for non-existent session', () => {
      expect(() => {
        engine.getSessionAnalytics('non-existent');
      }).toThrow('Session not found: non-existent');
    });

    it('should track metrics correctly', () => {
      engine.addQueryToSession(sessionId, 'query1', mockIntent, mockResults);
      engine.addQueryToSession(sessionId, 'query2', mockIntent, mockResults);

      const metrics = engine.getSessionAnalytics(sessionId);
      expect(metrics.totalQueries).toBe(2);
    });
  });

  describe('session cleanup', () => {
    it('should clean up old sessions', () => {
      const sessionId = engine.createSession('user123');

      // Add a query to make the session have activity
      engine.addQueryToSession(sessionId, 'test', mockIntent, mockResults);

      // Manually set old timestamp for testing
      const session = engine.getSession(sessionId);
      if (session) {
        session.queries[0].timestamp = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      }

      engine.cleanupOldSessions(24 * 60 * 60 * 1000); // 24 hours

      const cleanedSession = engine.getSession(sessionId);
      expect(cleanedSession).toBeUndefined();
    });

    it('should keep recent sessions', () => {
      const sessionId = engine.createSession('user123');
      engine.addQueryToSession(sessionId, 'test', mockIntent, mockResults);

      engine.cleanupOldSessions(24 * 60 * 60 * 1000); // 24 hours

      const session = engine.getSession(sessionId);
      expect(session).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty results gracefully', () => {
      const sessionId = engine.createSession('user123');

      expect(() => {
        engine.addQueryToSession(sessionId, 'empty query', mockIntent, []);
      }).not.toThrow();

      const refinements = engine.getRefinementSuggestions(sessionId);
      expect(refinements).toBeDefined();
      expect(Array.isArray(refinements)).toBe(true);
    });

    it('should handle very short queries', () => {
      const sessionId = engine.createSession('user123');

      engine.addQueryToSession(sessionId, 'a', mockIntent, mockResults);

      const refinements = engine.getRefinementSuggestions(sessionId);
      const clarifyRefinements = refinements.filter(r => r.type === 'clarify');

      expect(clarifyRefinements.length).toBeGreaterThan(0);
    });

    it('should handle single result', () => {
      const sessionId = engine.createSession('user123');

      engine.addQueryToSession(sessionId, 'specific query', mockIntent, [mockResults[0]]);

      const refinements = engine.getRefinementSuggestions(sessionId);
      expect(refinements).toBeDefined();

      const followUps = engine.getFollowUpQuestions(sessionId);
      expect(followUps).toBeDefined();
    });

    it('should handle user context without recent activity', () => {
      const emptyUserContext: UserContext = {
        ...mockUserContext,
        recentActivity: {
          queries: [],
          documents: [],
          topics: []
        }
      };

      const sessionId = engine.createSession('user123', emptyUserContext);
      engine.addQueryToSession(sessionId, 'test query', mockIntent, mockResults);

      const refinements = engine.getRefinementSuggestions(sessionId);
      const followUps = engine.getFollowUpQuestions(sessionId);

      expect(refinements).toBeDefined();
      expect(followUps).toBeDefined();
    });

    it('should handle queries with quotes', () => {
      const sessionId = engine.createSession('user123');

      engine.addQueryToSession(sessionId, '"exact phrase"', mockIntent, mockResults);

      const refinements = engine.getRefinementSuggestions(sessionId);
      expect(refinements).toBeDefined();

      // Should not suggest exact phrase refinement if already using quotes
      const exactPhraseRefinement = refinements.find(r => r.id === 'narrow_exact_phrase');
      expect(exactPhraseRefinement).toBeUndefined();
    });
  });
});
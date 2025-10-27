import { describe, it, expect, beforeEach } from 'vitest';
import {
  ContextManager,
  type OrganizationalContext,
  type UserContext,
  type DocumentCollectionContext
} from '@/services/nlp/ContextManager';
import type { DocumentSearchResult, QueryIntent } from '@/types/domain/Search';

describe('ContextManager', () => {
  let contextManager: ContextManager;

  beforeEach(() => {
    contextManager = ContextManager.getInstance();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ContextManager.getInstance();
      const instance2 = ContextManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('organizational contexts', () => {
    it('should initialize with default organizational contexts', () => {
      const contexts = contextManager.getAllOrganizationalContexts();
      expect(contexts.length).toBeGreaterThan(0);

      const itContext = contexts.find(c => c.id === 'it');
      expect(itContext).toBeDefined();
      expect(itContext?.name).toBe('Information Technology');
      expect(itContext?.type).toBe('department');
      expect(itContext?.terminology).toHaveProperty('server');
    });

    it('should add new organizational context', () => {
      const newContext: OrganizationalContext = {
        id: 'finance',
        name: 'Finance Department',
        type: 'department',
        terminology: {
          'budget': ['allocation', 'funding', 'expense'],
          'invoice': ['bill', 'receipt', 'payment']
        },
        commonQueries: ['budget reports', 'financial statements'],
        documentTypes: ['reports', 'invoices', 'budgets']
      };

      contextManager.addOrganizationalContext(newContext);
      const contexts = contextManager.getAllOrganizationalContexts();
      const financeContext = contexts.find(c => c.id === 'finance');

      expect(financeContext).toBeDefined();
      expect(financeContext?.name).toBe('Finance Department');
    });

    it('should get relevant contexts based on query content', () => {
      const query = 'find server maintenance documents';
      const relevantContexts = contextManager.getRelevantContexts(query);

      expect(relevantContexts.length).toBeGreaterThan(0);
      const itContext = relevantContexts.find(c => c.id === 'it');
      expect(itContext).toBeDefined();
    });

    it('should get relevant contexts based on user department', () => {
      const userContext: UserContext = {
        id: 'user1',
        role: 'admin',
        department: 'hr',
        permissions: ['read', 'write'],
        recentActivity: {
          queries: [],
          documents: [],
          topics: []
        },
        preferences: {
          language: 'en',
          documentTypes: [],
          searchHistory: []
        }
      };

      contextManager.setUserContext(userContext);
      const query = 'show me documents';
      const relevantContexts = contextManager.getRelevantContexts(query, userContext);

      const hrContext = relevantContexts.find(c => c.id === 'hr');
      expect(hrContext).toBeDefined();
    });
  });

  describe('user context', () => {
    it('should set and get current user context', () => {
      const userContext: UserContext = {
        id: 'user1',
        role: 'manager',
        department: 'it',
        permissions: ['read', 'write', 'admin'],
        recentActivity: {
          queries: ['server status', 'backup reports'],
          documents: ['doc1', 'doc2'],
          topics: ['infrastructure', 'security']
        },
        preferences: {
          language: 'en',
          documentTypes: ['reports', 'manuals'],
          searchHistory: ['server status', 'network configuration']
        }
      };

      contextManager.setUserContext(userContext);
      const retrievedContext = contextManager.getCurrentUserContext();

      expect(retrievedContext).toEqual(userContext);
      expect(retrievedContext?.role).toBe('manager');
      expect(retrievedContext?.department).toBe('it');
    });

    it('should update user activity context', () => {
      const userContext: UserContext = {
        id: 'user1',
        role: 'user',
        permissions: ['read'],
        recentActivity: {
          queries: [],
          documents: [],
          topics: []
        },
        preferences: {
          language: 'en',
          documentTypes: [],
          searchHistory: []
        }
      };

      contextManager.setUserContext(userContext);

      // Update with new query
      contextManager.updateUserActivity('user1', {
        query: 'find security documents',
        documentId: 'doc123',
        topic: 'security'
      });

      const updatedContext = contextManager.getCurrentUserContext();
      expect(updatedContext?.recentActivity.queries).toContain('find security documents');
      expect(updatedContext?.recentActivity.documents).toContain('doc123');
      expect(updatedContext?.recentActivity.topics).toContain('security');
      expect(updatedContext?.preferences.searchHistory).toContain('find security documents');
    });

    it('should limit recent activity history', () => {
      const userContext: UserContext = {
        id: 'user1',
        role: 'user',
        permissions: ['read'],
        recentActivity: {
          queries: [],
          documents: [],
          topics: []
        },
        preferences: {
          language: 'en',
          documentTypes: [],
          searchHistory: []
        }
      };

      contextManager.setUserContext(userContext);

      // Add more than 10 queries to test limit
      for (let i = 1; i <= 15; i++) {
        contextManager.updateUserActivity('user1', {
          query: `query ${i}`
        });
      }

      const updatedContext = contextManager.getCurrentUserContext();
      expect(updatedContext?.recentActivity.queries.length).toBe(10);
      expect(updatedContext?.recentActivity.queries[0]).toBe('query 15'); // Most recent first
    });
  });

  describe('document collection context', () => {
    it('should update document collection context', () => {
      const mockDocuments: DocumentSearchResult[] = [
        {
          id: 'doc1',
          title: 'Server Configuration Guide',
          content: 'This document covers server setup and configuration procedures.',
          type: 'manual',
          author: 'John Doe',
          createdAt: '2024-01-01T00:00:00Z',
          language: 'en',
          tags: ['server', 'configuration'],
          metadata: { accessCount: 10 }
        },
        {
          id: 'doc2',
          title: 'Security Audit Report',
          content: 'Annual security audit findings and recommendations.',
          type: 'report',
          author: 'Jane Smith',
          createdAt: '2024-02-01T00:00:00Z',
          language: 'en',
          tags: ['security', 'audit'],
          metadata: { accessCount: 25 }
        },
        {
          id: 'doc3',
          title: 'دليل المستخدم',
          content: 'دليل شامل لاستخدام النظام',
          type: 'manual',
          author: 'Ahmad Ali',
          createdAt: '2024-03-01T00:00:00Z',
          language: 'ar',
          tags: ['user guide']
        }
      ];

      contextManager.updateDocumentCollectionContext(mockDocuments);
      const collectionContext = contextManager.getDocumentCollectionContext();

      expect(collectionContext).toBeDefined();
      expect(collectionContext?.totalDocuments).toBe(3);
      expect(collectionContext?.documentTypes.manual).toBe(2);
      expect(collectionContext?.documentTypes.report).toBe(1);
      expect(collectionContext?.authors).toContain('John Doe');
      expect(collectionContext?.authors).toContain('Jane Smith');
      expect(collectionContext?.topics).toContain('server');
      expect(collectionContext?.topics).toContain('security');
      expect(collectionContext?.languageDistribution.en).toBe(2);
      expect(collectionContext?.languageDistribution.ar).toBe(1);
      expect(collectionContext?.mostAccessedDocuments).toContain('doc2'); // Highest access count
    });

    it('should extract common terms from documents', () => {
      const mockDocuments: DocumentSearchResult[] = [
        {
          id: 'doc1',
          title: 'Database Administration Guide',
          content: 'This guide covers database administration, backup procedures, and performance monitoring.',
          type: 'guide',
          author: 'Admin User'
        },
        {
          id: 'doc2',
          title: 'Database Performance Tuning',
          content: 'Performance optimization techniques for database systems.',
          type: 'guide',
          author: 'Admin User'
        }
      ];

      contextManager.updateDocumentCollectionContext(mockDocuments);
      const collectionContext = contextManager.getDocumentCollectionContext();

      expect(collectionContext?.commonTerms).toHaveProperty('database');
      expect(collectionContext?.commonTerms).toHaveProperty('performance');
      expect(collectionContext?.commonTerms.database).toBeGreaterThan(1); // Appears in multiple docs
    });
  });

  describe('query enhancement', () => {
    it('should enhance query with contextual information', () => {
      const userContext: UserContext = {
        id: 'user1',
        role: 'admin',
        department: 'it',
        permissions: ['read', 'write'],
        recentActivity: {
          queries: ['server status'],
          documents: [],
          topics: ['infrastructure']
        },
        preferences: {
          language: 'en',
          documentTypes: ['manuals'],
          searchHistory: []
        }
      };

      const queryIntent: QueryIntent = {
        type: 'search',
        action: 'find',
        confidence: 0.8,
        entities: [],
        parameters: {}
      };

      contextManager.setUserContext(userContext);
      const enhanced = contextManager.enhanceQuery('find server documents', queryIntent, userContext);

      expect(enhanced.originalQuery).toBe('find server documents');
      expect(enhanced.context.user.department).toBe('it');
      expect(enhanced.context.organizational.length).toBeGreaterThan(0);
      expect(enhanced.suggestedTerms.length).toBeGreaterThan(0);

      // Should include IT-related terms
      const itContext = enhanced.context.organizational.find(c => c.id === 'it');
      expect(itContext).toBeDefined();
    });

    it('should provide disambiguation for low confidence queries', () => {
      const queryIntent: QueryIntent = {
        type: 'search',
        action: 'find',
        confidence: 0.4, // Low confidence
        entities: [],
        parameters: {}
      };

      const enhanced = contextManager.enhanceQuery('find documents', queryIntent);

      expect(enhanced.disambiguation.clarifications.length).toBeGreaterThan(0);
    });

    it('should suggest alternative queries with synonyms', () => {
      const queryIntent: QueryIntent = {
        type: 'search',
        action: 'find',
        confidence: 0.8,
        entities: [],
        parameters: {}
      };

      const enhanced = contextManager.enhanceQuery('find server information', queryIntent);

      expect(enhanced.suggestedTerms.length).toBeGreaterThan(0);
      expect(enhanced.disambiguation.alternatives.length).toBeGreaterThan(0);

      // Should include synonyms like 'infrastructure', 'hardware', 'system'
      const hasServerSynonyms = enhanced.suggestedTerms.some(term =>
        ['infrastructure', 'hardware', 'system'].includes(term)
      );
      expect(hasServerSynonyms).toBe(true);
    });
  });

  describe('query suggestions', () => {
    it('should provide query suggestions based on user context', () => {
      const userContext: UserContext = {
        id: 'user1',
        role: 'user',
        permissions: ['read'],
        recentActivity: {
          queries: [],
          documents: [],
          topics: []
        },
        preferences: {
          language: 'en',
          documentTypes: [],
          searchHistory: ['server maintenance', 'backup procedures']
        }
      };

      contextManager.setUserContext(userContext);
      const suggestions = contextManager.getQuerySuggestions('server', userContext);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('server maintenance');
    });

    it('should provide suggestions from organizational contexts', () => {
      const suggestions = contextManager.getQuerySuggestions('security');

      expect(suggestions.length).toBeGreaterThan(0);
      // Should include IT security-related suggestions
      const hasSecuritySuggestions = suggestions.some(suggestion =>
        suggestion.toLowerCase().includes('security')
      );
      expect(hasSecuritySuggestions).toBe(true);
    });

    it('should limit suggestions to reasonable number', () => {
      const suggestions = contextManager.getQuerySuggestions('document');

      expect(suggestions.length).toBeLessThanOrEqual(8);
    });

    it('should provide suggestions based on document collection', () => {
      // First update collection context with some documents
      const mockDocuments: DocumentSearchResult[] = [
        {
          id: 'doc1',
          title: 'Network Configuration',
          type: 'manual',
          tags: ['networking', 'configuration']
        },
        {
          id: 'doc2',
          title: 'Network Security Guide',
          type: 'guide',
          tags: ['networking', 'security']
        }
      ];

      contextManager.updateDocumentCollectionContext(mockDocuments);
      const suggestions = contextManager.getQuerySuggestions('network');

      expect(suggestions.length).toBeGreaterThan(0);
      const hasNetworkSuggestions = suggestions.some(suggestion =>
        suggestion.toLowerCase().includes('network')
      );
      expect(hasNetworkSuggestions).toBe(true);
    });
  });

  describe('Arabic language support', () => {
    it('should handle Arabic organizational contexts', () => {
      const arabicContext: OrganizationalContext = {
        id: 'arabic_dept',
        name: 'القسم العربي',
        type: 'department',
        terminology: {
          'مستند': ['وثيقة', 'ملف'],
          'تقرير': ['بيان', 'إحصائية']
        },
        commonQueries: ['البحث عن المستندات', 'عرض التقارير'],
        documentTypes: ['تقارير', 'مستندات']
      };

      contextManager.addOrganizationalContext(arabicContext);
      const contexts = contextManager.getAllOrganizationalContexts();
      const arabicDept = contexts.find(c => c.id === 'arabic_dept');

      expect(arabicDept).toBeDefined();
      expect(arabicDept?.name).toBe('القسم العربي');
    });

    it('should provide Arabic query suggestions', () => {
      const userContext: UserContext = {
        id: 'user1',
        role: 'user',
        permissions: ['read'],
        recentActivity: {
          queries: [],
          documents: [],
          topics: []
        },
        preferences: {
          language: 'ar',
          documentTypes: [],
          searchHistory: ['البحث عن المستندات']
        }
      };

      const suggestions = contextManager.getQuerySuggestions('البحث', userContext);
      expect(suggestions).toContain('البحث عن المستندات');
    });
  });
});
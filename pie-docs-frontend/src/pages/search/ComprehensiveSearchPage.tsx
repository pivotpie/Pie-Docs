import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';

// Import all search components
import { SearchInput } from '@/components/search/SearchInput';
import { FacetedFilterPanel } from '@/components/search/FacetedFilterPanel';
import { SearchResults } from '@/components/search/SearchResults';
import { AdvancedSearchBuilder } from '@/components/search/AdvancedSearchBuilder';
import { SavedSearchManager } from '@/components/search/SavedSearchManager';
import { DocumentPreviewModal } from '@/components/search/DocumentPreviewModal';
import { SearchResultsExporter } from '@/components/search/SearchResultsExporter';
import { NLPQueryInterface } from '@/components/search/NLPQueryInterface';
import { ConversationHistory } from '@/components/search/ConversationHistory';

// Import semantic search components if they exist
// import { SemanticSearchInterface } from '@/components/search/SemanticSearchInterface';

import type { SearchState, SearchFilters, SearchQuery } from '@/types/domain/Search';

// Mock data for components that need them
const mockDocuments = [
  {
    id: '1',
    title: 'Financial Report Q3 2024',
    author: 'Finance Team',
    createdAt: new Date('2024-09-01'),
    modifiedAt: new Date('2024-09-15'),
    fileType: 'pdf',
    tags: ['financial', 'quarterly'],
    content: 'Financial report content...',
    path: '/documents/financial/Q3-2024.pdf',
    size: 2048576,
    topics: ['Finance', 'Performance', 'Revenue'],
    entities: ['Company Name', 'Q3 2024', 'Revenue'],
    summary: 'Quarterly financial performance report'
  },
  {
    id: '2',
    title: 'Employee Handbook 2024',
    author: 'HR Department',
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-08-15'),
    fileType: 'pdf',
    tags: ['hr', 'policies'],
    content: 'Employee handbook content...',
    path: '/documents/hr/Employee-Handbook.pdf',
    size: 1024768,
    topics: ['HR', 'Policies', 'Benefits'],
    entities: ['Company Policy', 'Employee Benefits', 'Procedures'],
    summary: 'Complete employee handbook with policies'
  }
];

const mockSearchQueries = [
  {
    id: '1',
    query: 'financial report',
    timestamp: new Date(),
    userId: 'user1',
    responseTime: 850,
    resultCount: 5,
    clicked: true,
    clickedResultId: '1',
    searchType: 'simple' as const,
    filters: [],
    sessionId: 'session1'
  },
  {
    id: '2',
    query: 'employee handbook',
    timestamp: new Date(),
    userId: 'user2',
    responseTime: 650,
    resultCount: 3,
    clicked: true,
    clickedResultId: '2',
    searchType: 'advanced' as const,
    filters: [],
    sessionId: 'session2'
  }
];

export const ComprehensiveSearchPage: React.FC = () => {
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Parse URL params to determine active tab
  const params = new URLSearchParams(location.search);
  const initialTab = params.get('tab') || 'quick';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    filters: {},
    results: [],
    isLoading: false,
    error: null,
    totalResults: 0,
    page: 1,
    pageSize: 20,
  });

  const [previewDocument, setPreviewDocument] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState(null);

  // Update URL when tab changes
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    const newParams = new URLSearchParams(location.search);
    newParams.set('tab', tabId);
    navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
  }, [location, navigate]);

  const handleSearch = useCallback((query: string, filters: SearchFilters = {}) => {
    setSearchState(prev => ({
      ...prev,
      query,
      filters,
      isLoading: true,
      error: null,
    }));

    // Mock search results
    setTimeout(() => {
      const mockResults = mockDocuments.filter(doc =>
        doc.title.toLowerCase().includes(query.toLowerCase()) ||
        doc.content.toLowerCase().includes(query.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );

      setSearchState(prev => ({
        ...prev,
        isLoading: false,
        results: mockResults.map(doc => ({
          ...doc,
          snippet: `${doc.summary.slice(0, 150)}...`,
          relevanceScore: Math.random() * 0.5 + 0.5,
          highlights: [
            {
              field: 'content',
              fragments: [`${doc.content.slice(0, 50)}...`],
              matchCount: 1
            }
          ],
          metadata: { department: doc.author },
          downloadUrl: `/api/documents/${doc.id}/download`,
          previewUrl: `/api/documents/${doc.id}/preview`
        })),
        totalResults: mockResults.length,
      }));
    }, 1000);
  }, []);

  const handleAdvancedQuery = useCallback((advancedQuery: SearchQuery) => {
    handleSearch(advancedQuery.text, advancedQuery.filters);
  }, [handleSearch]);

  const handleDocumentPreview = useCallback((documentId: string) => {
    setPreviewDocument(documentId);
  }, []);

  const handleDocumentSelect = useCallback((document: any) => {
    setSelectedDocument(document);
  }, []);

  const searchTabs = [
    {
      id: 'quick',
      label: 'Quick Search',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      id: 'advanced',
      label: 'Advanced Search',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      ),
    },
    {
      id: 'semantic',
      label: 'Semantic Search',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
    {
      id: 'ai',
      label: 'AI-Powered Search',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      id: 'saved',
      label: 'Saved Searches',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
    },
    {
      id: 'relationships',
      label: 'Document Relationships',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    },
    {
      id: 'analytics',
      label: 'Search Analytics',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'export',
      label: 'Export Results',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'quick':
        return (
          <div className="space-y-6">
            {/* Quick Search Interface */}
            <div className="glass-card p-6">
              <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                Quick Document Search
              </h2>
              <SearchInput
                value={searchState.query}
                onSearch={handleSearch}
                isLoading={searchState.isLoading}
                placeholder="Search documents, content, and metadata..."
              />
            </div>

            {/* Search Results and Filters */}
            <div className="flex gap-6">
              <div className="w-80 flex-shrink-0">
                <FacetedFilterPanel
                  filters={searchState.filters}
                  onFiltersChange={(filters) => handleSearch(searchState.query, filters)}
                  isLoading={searchState.isLoading}
                />
              </div>
              <div className="flex-1">
                <SearchResults
                  results={searchState.results}
                  query={searchState.query}
                  totalResults={searchState.totalResults}
                  isLoading={searchState.isLoading}
                  error={searchState.error}
                  page={searchState.page}
                  pageSize={searchState.pageSize}
                  onPageChange={(page) => setSearchState(prev => ({ ...prev, page }))}
                  onDocumentPreview={handleDocumentPreview}
                />
              </div>
            </div>
          </div>
        );

      case 'advanced':
        return (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                Advanced Search Builder
              </h2>
              <AdvancedSearchBuilder
                onQueryChange={handleAdvancedQuery}
                onClose={() => {}}
              />
            </div>

            {searchState.results.length > 0 && (
              <div className="glass-card p-6">
                <SearchResults
                  results={searchState.results}
                  query={searchState.query}
                  totalResults={searchState.totalResults}
                  isLoading={searchState.isLoading}
                  error={searchState.error}
                  page={searchState.page}
                  pageSize={searchState.pageSize}
                  onPageChange={(page) => setSearchState(prev => ({ ...prev, page }))}
                  onDocumentPreview={handleDocumentPreview}
                />
              </div>
            )}
          </div>
        );

      case 'semantic':
        return (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                Semantic Document Search
              </h2>
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-lg font-medium mb-2">Semantic Search</p>
                <p className="text-sm">Find documents by meaning and context, not just keywords</p>
                <div className="mt-4 text-left max-w-md mx-auto">
                  <h4 className="font-medium mb-2">Features:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Concept-based document discovery</li>
                    <li>• Intelligent query understanding</li>
                    <li>• Related document suggestions</li>
                    <li>• Contextual search results</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                AI-Powered Natural Language Search
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className={`text-lg font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                    Ask Questions About Your Documents
                  </h3>
                  <NLPQueryInterface
                    onResultsUpdate={(results) => {
                      setSearchState(prev => ({
                        ...prev,
                        results,
                        totalResults: results.length,
                        isLoading: false
                      }));
                    }}
                  />
                </div>
                <div>
                  <h3 className={`text-lg font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                    Conversation History
                  </h3>
                  <ConversationHistory />
                </div>
              </div>
            </div>

            {/* AI-Generated Answers */}
            <div className="glass-card p-6">
              <h3 className={`text-lg font-medium mb-4 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                Intelligent Answer Generation
              </h3>
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-sm">AI-powered answers will appear here based on your queries</p>
              </div>
            </div>
          </div>
        );

      case 'saved':
        return (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                Saved Searches
              </h2>
              <SavedSearchManager
                onSearchSelect={handleSearch}
                onClose={() => {}}
              />
            </div>
          </div>
        );

      case 'relationships':
        return (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                Document Relationships & Semantic Analysis
              </h2>
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <p className="text-lg font-medium mb-2">Document Relationship Mapping</p>
                <p className="text-sm mb-4">Discover connections between your documents</p>
                <div className="text-left max-w-md mx-auto">
                  <h4 className="font-medium mb-2">Features:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Semantic similarity detection</li>
                    <li>• Topic-based clustering</li>
                    <li>• Citation and reference tracking</li>
                    <li>• Visual relationship maps</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                Search Analytics & Optimization
              </h2>
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-lg font-medium mb-2">Search Performance Analytics</p>
                <p className="text-sm mb-4">Monitor and optimize search experience</p>
                <div className="grid grid-cols-2 gap-4 text-left max-w-lg mx-auto">
                  <div>
                    <h4 className="font-medium mb-2">Metrics:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Search volume tracking</li>
                      <li>• Success rate analysis</li>
                      <li>• Response time monitoring</li>
                      <li>• User behavior patterns</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Optimization:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Query suggestions</li>
                      <li>• Index optimization</li>
                      <li>• Performance tuning</li>
                      <li>• Search improvements</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'export':
        return (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                Export Search Results
              </h2>
              {searchState.results.length > 0 ? (
                <SearchResultsExporter
                  results={searchState.results}
                  searchQuery={searchState.query}
                  filters={searchState.filters}
                  onClose={() => {}}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg font-medium mb-2">No Search Results to Export</p>
                  <p className="text-sm">Perform a search first to export results in various formats</p>
                  <button
                    onClick={() => handleTabChange('quick')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Go to Quick Search
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen glass">
      {/* Header */}
      <div className="glass-card border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
              Advanced Document Search
            </h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
              Search through your documents using advanced filtering, semantic search, and AI-powered queries.
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="glass-card border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex flex-wrap gap-2">
              {searchTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'glass-panel border-blue-400 text-white shadow-lg'
                      : `border border-white/20 hover:border-white/40 ${theme === 'dark' ? 'text-white/80 hover:text-white' : 'text-white/80 hover:text-white'}`
                  }`}
                >
                  {tab.icon}
                  <span className="ml-2">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderTabContent()}
      </div>

      {/* Modals */}
      {previewDocument && (
        <DocumentPreviewModal
          documentId={previewDocument}
          onClose={() => setPreviewDocument(null)}
          searchQuery={searchState.query}
        />
      )}
    </div>
  );
};

export default ComprehensiveSearchPage;
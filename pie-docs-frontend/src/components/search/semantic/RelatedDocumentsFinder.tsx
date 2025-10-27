import React, { useState, useEffect, useCallback } from 'react';
import { Link, ExternalLink, Network, Clock, Bookmark, Star, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  DocumentSimilarity,
  DocumentRelationship
} from '@/types/domain/SemanticSearch';
import type { SearchResult } from '@/types/domain/Search';
import { RelatedDocumentsFinder as RelatedService } from '@/services/semantic/RelatedDocumentsFinder';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { Progress } from '@/components/ui/Progress';

interface RelatedDocumentsFinderProps {
  documentId?: string;
  searchResults?: SearchResult[];
  onDocumentSelect?: (documentId: string) => void;
  showPersonalized?: boolean;
  userId?: string;
  className?: string;
}

export const RelatedDocumentsFinderComponent: React.FC<RelatedDocumentsFinderProps> = ({
  documentId,
  searchResults,
  onDocumentSelect,
  showPersonalized = false,
  userId,
  className = ''
}) => {
  const { t } = useTranslation();
  const [relatedService] = useState(() => new RelatedService());

  // State
  const [relatedDocuments, setRelatedDocuments] = useState<DocumentSimilarity[]>([]);
  const [relationships, setRelationships] = useState<DocumentRelationship[]>([]);
  const [personalizedDocs, setPersonalizedDocs] = useState<DocumentSimilarity[]>([]);
  const [citationNetwork, setCitationNetwork] = useState<{
    nodes: Array<{ id: string; title: string; type: string }>;
    edges: Array<{ source: string; target: string; type: string }>;
  }>({ nodes: [], edges: [] });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configuration
  const [minSimilarityScore, setMinSimilarityScore] = useState(0.3);
  const [maxResults, setMaxResults] = useState(8);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeTopics, setIncludeTopics] = useState(true);
  const [includeCitations, setIncludeCitations] = useState(true);
  const [includeTemporal, setIncludeTemporal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<'similar' | 'relationships' | 'network' | 'personalized'>('similar');

  /**
   * Find related documents
   */
  const findRelatedDocuments = useCallback(async () => {
    if (!documentId && !searchResults?.length) return;

    setIsLoading(true);
    setError(null);

    try {
      let related: DocumentSimilarity[];

      if (documentId) {
        // Find documents related to specific document
        related = await relatedService.findRelatedDocuments(documentId, {
          maxResults,
          minSimilarityScore,
          includeMetadataSimilarity: includeMetadata,
          includeTopicSimilarity: includeTopics,
          includeCitationNetwork: includeCitations,
          includeTemporalRelations: includeTemporal,
          weightContentSimilarity: 0.6,
          weightMetadataSimilarity: 0.2,
          weightTopicSimilarity: 0.2
        });
      } else if (searchResults) {
        // Find documents similar to search result set
        related = await relatedService.findSimilarToResultSet(searchResults, {
          maxResults,
          minSimilarityScore,
          includeMetadataSimilarity: includeMetadata,
          includeTopicSimilarity: includeTopics,
          includeCitationNetwork: includeCitations,
          includeTemporalRelations: includeTemporal
        });
      } else {
        related = [];
      }

      setRelatedDocuments(related);

    } catch (error) {
      console.error('Failed to find related documents:', error);
      setError(error instanceof Error ? error.message : 'Failed to find related documents');
    } finally {
      setIsLoading(false);
    }
  }, [
    documentId,
    searchResults,
    relatedService,
    maxResults,
    minSimilarityScore,
    includeMetadata,
    includeTopics,
    includeCitations,
    includeTemporal
  ]);

  /**
   * Discover document relationships
   */
  const discoverRelationships = useCallback(async () => {
    if (!documentId) return;

    try {
      const relationships = await relatedService.discoverDocumentRelationships(documentId);
      setRelationships(relationships);
    } catch (error) {
      console.error('Failed to discover relationships:', error);
    }
  }, [documentId, relatedService]);

  /**
   * Build citation network
   */
  const buildCitationNetwork = useCallback(async () => {
    if (!documentId && !searchResults?.length) return;

    try {
      const documentIds = documentId ? [documentId] : searchResults!.map(r => r.id);
      const network = await relatedService.buildCitationNetwork(documentIds);
      setCitationNetwork(network);
    } catch (error) {
      console.error('Failed to build citation network:', error);
    }
  }, [documentId, searchResults, relatedService]);

  /**
   * Get personalized recommendations
   */
  const getPersonalizedRecommendations = useCallback(async () => {
    if (!userId) return;

    try {
      const recommendations = await relatedService.getPersonalizedRecommendations(userId, {
        basedOnRecentViews: true,
        basedOnBookmarks: true,
        basedOnSearchHistory: true,
        maxResults: 10
      });
      setPersonalizedDocs(recommendations);
    } catch (error) {
      console.error('Failed to get personalized recommendations:', error);
    }
  }, [userId, relatedService]);

  /**
   * Handle document selection
   */
  const handleDocumentSelect = (docId: string) => {
    onDocumentSelect?.(docId);
  };

  /**
   * Get similarity color based on score
   */
  const getSimilarityColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-blue-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-gray-600';
  };

  /**
   * Get relationship type icon
   */
  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case 'content': return <Link className="w-4 h-4" />;
      case 'topic': return <TrendingUp className="w-4 h-4" />;
      case 'citation': return <ExternalLink className="w-4 h-4" />;
      case 'temporal': return <Clock className="w-4 h-4" />;
      case 'metadata': return <Star className="w-4 h-4" />;
      default: return <Network className="w-4 h-4" />;
    }
  };

  // Load initial data
  useEffect(() => {
    if (activeTab === 'similar') {
      findRelatedDocuments();
    } else if (activeTab === 'relationships') {
      discoverRelationships();
    } else if (activeTab === 'network') {
      buildCitationNetwork();
    } else if (activeTab === 'personalized') {
      getPersonalizedRecommendations();
    }
  }, [activeTab, findRelatedDocuments, discoverRelationships, buildCitationNetwork, getPersonalizedRecommendations]);

  // Refresh when configuration changes
  useEffect(() => {
    if (activeTab === 'similar') {
      findRelatedDocuments();
    }
  }, [minSimilarityScore, maxResults, includeMetadata, includeTopics, includeCitations, includeTemporal]);

  if (!documentId && !searchResults?.length && !showPersonalized) {
    return (
      <Card className={`p-4 ${className}`}>
        <p className="text-gray-500 text-center">
          {t('search.related.noDocumentSelected')}
        </p>
      </Card>
    );
  }

  return (
    <div className={`related-documents-finder ${className}`}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Network className="w-5 h-5" />
          {t('search.related.title')}
        </h3>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === 'similar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('similar')}
          >
            {t('search.related.similar')}
          </Button>
          {documentId && (
            <Button
              variant={activeTab === 'relationships' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('relationships')}
            >
              {t('search.related.relationships')}
            </Button>
          )}
          <Button
            variant={activeTab === 'network' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('network')}
          >
            {t('search.related.network')}
          </Button>
          {showPersonalized && userId && (
            <Button
              variant={activeTab === 'personalized' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('personalized')}
            >
              <Bookmark className="w-4 h-4 mr-1" />
              {t('search.related.personalized')}
            </Button>
          )}
        </div>

        {/* Advanced Configuration */}
        {activeTab === 'similar' && (
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {t('search.related.advancedOptions')}
            </Button>

            {showAdvanced && (
              <Card className="mt-2 p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Similarity Threshold */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('search.related.similarityThreshold')}: {Math.round(minSimilarityScore * 100)}%
                    </label>
                    <Slider
                      value={[minSimilarityScore]}
                      onValueChange={([value]) => setMinSimilarityScore(value)}
                      min={0.1}
                      max={0.9}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  {/* Max Results */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('search.related.maxResults')}: {maxResults}
                    </label>
                    <Slider
                      value={[maxResults]}
                      onValueChange={([value]) => setMaxResults(value)}
                      min={3}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  {/* Include Options */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('search.related.includeMetadata')}</span>
                    <Switch
                      checked={includeMetadata}
                      onCheckedChange={setIncludeMetadata}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('search.related.includeTopics')}</span>
                    <Switch
                      checked={includeTopics}
                      onCheckedChange={setIncludeTopics}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('search.related.includeCitations')}</span>
                    <Switch
                      checked={includeCitations}
                      onCheckedChange={setIncludeCitations}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('search.related.includeTemporal')}</span>
                    <Switch
                      checked={includeTemporal}
                      onCheckedChange={setIncludeTemporal}
                    />
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Card className="mb-4 p-3 border-red-200 bg-red-50">
          <p className="text-red-600 text-sm">{error}</p>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">{t('search.related.loading')}</span>
          </div>
        </Card>
      )}

      {/* Content based on active tab */}
      {!isLoading && (
        <>
          {/* Similar Documents Tab */}
          {activeTab === 'similar' && (
            <div className="space-y-3">
              {relatedDocuments.length === 0 ? (
                <Card className="p-4">
                  <p className="text-gray-500 text-center">
                    {t('search.related.noSimilarDocuments')}
                  </p>
                </Card>
              ) : (
                relatedDocuments.map((doc) => (
                  <Card
                    key={doc.documentId}
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleDocumentSelect(doc.documentId)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-blue-600 hover:text-blue-800">
                        Document {doc.documentId}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getSimilarityColor(doc.similarityScore)}>
                          {Math.round(doc.similarityScore * 100)}% similar
                        </Badge>
                        <Badge variant="secondary">
                          {doc.relationshipType}
                        </Badge>
                      </div>
                    </div>

                    {/* Shared Concepts */}
                    {doc.sharedConcepts.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          {t('search.related.sharedConcepts')}:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {doc.sharedConcepts.slice(0, 5).map((concept, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {concept}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Similarity Progress */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>{t('search.related.similarity')}</span>
                        <span>{Math.round(doc.similarityScore * 100)}%</span>
                      </div>
                      <Progress value={doc.similarityScore * 100} className="h-2" />
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Relationships Tab */}
          {activeTab === 'relationships' && (
            <div className="space-y-3">
              {relationships.length === 0 ? (
                <Card className="p-4">
                  <p className="text-gray-500 text-center">
                    {t('search.related.noRelationships')}
                  </p>
                </Card>
              ) : (
                relationships.map((rel, index) => (
                  <Card
                    key={index}
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleDocumentSelect(rel.documentId)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded">
                        {getRelationshipIcon(rel.relationshipType)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Document {rel.documentId}</h4>
                          <Badge variant="outline">
                            {Math.round(rel.score * 100)}% {rel.relationshipType}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{rel.explanation}</p>
                        {rel.sharedElements.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {rel.sharedElements.map((element, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {element}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Citation Network Tab */}
          {activeTab === 'network' && (
            <div>
              <Card className="p-4">
                <h4 className="font-medium mb-3">{t('search.related.citationNetwork')}</h4>
                {citationNetwork.nodes.length === 0 ? (
                  <p className="text-gray-500 text-center">
                    {t('search.related.noCitationNetwork')}
                  </p>
                ) : (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium">{t('search.related.documents')}</p>
                        <p className="text-2xl font-bold text-blue-600">{citationNetwork.nodes.length}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t('search.related.connections')}</p>
                        <p className="text-2xl font-bold text-green-600">{citationNetwork.edges.length}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {citationNetwork.nodes.slice(0, 10).map((node) => (
                        <div
                          key={node.id}
                          className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                          onClick={() => handleDocumentSelect(node.id)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{node.title}</span>
                            <Badge variant="outline">{node.type}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Personalized Tab */}
          {activeTab === 'personalized' && (
            <div className="space-y-3">
              {personalizedDocs.length === 0 ? (
                <Card className="p-4">
                  <p className="text-gray-500 text-center">
                    {t('search.related.noPersonalizedRecommendations')}
                  </p>
                </Card>
              ) : (
                personalizedDocs.map((doc) => (
                  <Card
                    key={doc.documentId}
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleDocumentSelect(doc.documentId)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-blue-600 hover:text-blue-800">
                        Document {doc.documentId}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Bookmark className="w-4 h-4 text-blue-500" />
                        <Badge variant="outline">
                          {Math.round(doc.similarityScore * 100)}% match
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
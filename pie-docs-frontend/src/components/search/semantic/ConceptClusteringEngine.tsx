import React, { useState, useEffect, useCallback } from 'react';
import { Layers, TrendingUp, BarChart3, Settings, RefreshCw, Zap, Network } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  ConceptCluster,
  ClusterAnalytics,
  ClusterUpdateResult
} from '@/types/domain/SemanticSearch';
import { ConceptClusteringEngine as ClusteringService } from '@/services/semantic/ConceptClusteringEngine';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Slider } from '@/components/ui/Slider';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Progress } from '@/components/ui/Progress';

interface ConceptClusteringEngineProps {
  documentIds?: string[];
  onClusterSelect?: (cluster: ConceptCluster) => void;
  onDocumentSelect?: (documentId: string) => void;
  autoUpdate?: boolean;
  className?: string;
}

export const ConceptClusteringEngineComponent: React.FC<ConceptClusteringEngineProps> = ({
  documentIds = [],
  onClusterSelect,
  onDocumentSelect,
  autoUpdate = false,
  className = ''
}) => {
  const { t } = useTranslation();
  const [clusteringService] = useState(() => new ClusteringService());

  // State
  const [clusters, setClusters] = useState<ConceptCluster[]>([]);
  const [analytics, setAnalytics] = useState<ClusterAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clustering configuration
  const [clusteringMethod, setClusteringMethod] = useState<'kmeans' | 'hierarchical' | 'auto'>('auto');
  const [maxClusters, setMaxClusters] = useState(15);
  const [minClusterSize, setMinClusterSize] = useState(3);
  const [coherenceThreshold, setCoherenceThreshold] = useState(0.4);
  const [includeSubClusters, setIncludeSubClusters] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // View options
  const [viewMode, setViewMode] = useState<'grid' | 'hierarchy' | 'network'>('grid');
  const [sortBy, setSortBy] = useState<'size' | 'coherence' | 'concepts'>('coherence');
  const [filterMinSize, setFilterMinSize] = useState(0);

  // Analytics
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [optimalK, setOptimalK] = useState<{
    optimalK: number;
    scores: Array<{ k: number; score: number; method: string }>;
    recommendation: string;
  } | null>(null);

  /**
   * Perform document clustering
   */
  const performClustering = useCallback(async () => {
    if (documentIds.length === 0) {
      setClusters([]);
      setAnalytics(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let clusterResult: ConceptCluster[];

      if (clusteringMethod === 'auto') {
        const autoResult = await clusteringService.autoCluster(documentIds);
        clusterResult = autoResult.clusters;
      } else {
        clusterResult = await clusteringService.clusterDocuments(documentIds, {
          method: clusteringMethod,
          maxClusters,
          minClusterSize,
          coherenceThreshold,
          includeSubClusters
        });
      }

      setClusters(clusterResult);

      // Get analytics
      if (clusterResult.length > 0) {
        const analyticsData = await clusteringService.analyzeClusterQuality(clusterResult);
        setAnalytics(analyticsData);
      }

    } catch (error) {
      console.error('Clustering failed:', error);
      setError(error instanceof Error ? error.message : 'Clustering failed');
    } finally {
      setIsLoading(false);
    }
  }, [
    documentIds,
    clusteringService,
    clusteringMethod,
    maxClusters,
    minClusterSize,
    coherenceThreshold,
    includeSubClusters
  ]);

  /**
   * Find optimal number of clusters
   */
  const findOptimalClusters = useCallback(async () => {
    if (documentIds.length === 0) return;

    try {
      const result = await clusteringService.findOptimalClusterCount(documentIds, 20);
      setOptimalK(result);
      setMaxClusters(result.optimalK);
    } catch (error) {
      console.error('Failed to find optimal clusters:', error);
    }
  }, [documentIds, clusteringService]);

  /**
   * Handle cluster selection
   */
  const handleClusterSelect = (cluster: ConceptCluster) => {
    onClusterSelect?.(cluster);
  };

  /**
   * Handle document selection
   */
  const handleDocumentSelect = (documentId: string) => {
    onDocumentSelect?.(documentId);
  };

  /**
   * Get filtered and sorted clusters
   */
  const getDisplayClusters = (): ConceptCluster[] => {
    const filtered = clusters.filter(cluster => cluster.documentIds.length >= filterMinSize);

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'size':
          return b.documentIds.length - a.documentIds.length;
        case 'coherence':
          return b.coherenceScore - a.coherenceScore;
        case 'concepts':
          return b.concepts.length - a.concepts.length;
        default:
          return 0;
      }
    });
  };

  /**
   * Get cluster color based on coherence score
   */
  const getClusterColor = (coherence: number): string => {
    if (coherence >= 0.8) return 'border-green-200 bg-green-50';
    if (coherence >= 0.6) return 'border-blue-200 bg-blue-50';
    if (coherence >= 0.4) return 'border-yellow-200 bg-yellow-50';
    return 'border-gray-200 bg-gray-50';
  };

  /**
   * Render cluster in grid view
   */
  const renderClusterGrid = (cluster: ConceptCluster) => (
    <Card
      key={cluster.id}
      className={`p-4 cursor-pointer hover:shadow-lg transition-all ${getClusterColor(cluster.coherenceScore)}`}
      onClick={() => handleClusterSelect(cluster)}
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-lg">{cluster.name}</h4>
        <Badge variant="outline">
          {cluster.documentIds.length} docs
        </Badge>
      </div>

      {/* Coherence Score */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">{t('clustering.coherence')}</span>
          <span className="font-medium">{Math.round(cluster.coherenceScore * 100)}%</span>
        </div>
        <Progress value={cluster.coherenceScore * 100} className="h-2" />
      </div>

      {/* Top Concepts */}
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-600 mb-2">
          {t('clustering.topConcepts')}:
        </p>
        <div className="flex flex-wrap gap-1">
          {cluster.concepts.slice(0, 5).map((concept, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {concept}
            </Badge>
          ))}
          {cluster.concepts.length > 5 && (
            <Badge variant="outline" className="text-xs">
              +{cluster.concepts.length - 5} more
            </Badge>
          )}
        </div>
      </div>

      {/* Document List */}
      <div>
        <p className="text-sm font-medium text-gray-600 mb-2">
          {t('clustering.documents')}:
        </p>
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {cluster.documentIds.slice(0, 3).map((docId) => (
            <button
              key={docId}
              onClick={(e) => {
                e.stopPropagation();
                handleDocumentSelect(docId);
              }}
              className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 truncate"
            >
              Document {docId}
            </button>
          ))}
          {cluster.documentIds.length > 3 && (
            <p className="text-xs text-gray-500">
              +{cluster.documentIds.length - 3} more documents
            </p>
          )}
        </div>
      </div>
    </Card>
  );

  /**
   * Render cluster hierarchy
   */
  const renderClusterHierarchy = (cluster: ConceptCluster, level: number = 0) => (
    <div key={cluster.id} className={`ml-${level * 4}`}>
      <Card className="p-3 mb-2 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-center gap-3" onClick={() => handleClusterSelect(cluster)}>
          <Layers className="w-4 h-4 text-gray-500" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h5 className="font-medium">{cluster.name}</h5>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  {cluster.documentIds.length}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {Math.round(cluster.coherenceScore * 100)}%
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {cluster.concepts.slice(0, 3).map((concept, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {concept}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>
      {cluster.subClusters?.map(subCluster => renderClusterHierarchy(subCluster, level + 1))}
    </div>
  );

  // Auto-cluster when documentIds change
  useEffect(() => {
    if (documentIds.length > 0) {
      performClustering();
    }
  }, [documentIds, performClustering]);

  // Auto-update if enabled
  useEffect(() => {
    if (autoUpdate && clusters.length > 0) {
      const interval = setInterval(() => {
        performClustering();
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [autoUpdate, clusters.length, performClustering]);

  return (
    <div className={`concept-clustering-engine ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Network className="w-6 h-6" />
            {t('clustering.title')}
          </h3>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={findOptimalClusters}
              disabled={isLoading || documentIds.length === 0}
            >
              <Zap className="w-4 h-4 mr-1" />
              {t('clustering.optimize')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={performClustering}
              disabled={isLoading || documentIds.length === 0}
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {t('clustering.refresh')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Analytics Summary */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Card className="p-3">
              <p className="text-sm text-gray-600">{t('clustering.totalClusters')}</p>
              <p className="text-2xl font-bold text-blue-600">{analytics.totalClusters}</p>
            </Card>
            <Card className="p-3">
              <p className="text-sm text-gray-600">{t('clustering.avgSize')}</p>
              <p className="text-2xl font-bold text-green-600">{Math.round(analytics.averageClusterSize)}</p>
            </Card>
            <Card className="p-3">
              <p className="text-sm text-gray-600">{t('clustering.coherenceScore')}</p>
              <p className="text-2xl font-bold text-purple-600">{Math.round(analytics.coherenceScore * 100)}%</p>
            </Card>
            <Card className="p-3">
              <p className="text-sm text-gray-600">{t('clustering.silhouetteScore')}</p>
              <p className="text-2xl font-bold text-orange-600">{Math.round(analytics.silhouetteScore * 100)}%</p>
            </Card>
          </div>
        )}

        {/* Advanced Configuration */}
        {showAdvanced && (
          <Card className="p-4 mb-4">
            <h4 className="font-medium mb-4">{t('clustering.advancedSettings')}</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Clustering Method */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('clustering.method')}
                </label>
                <Select
                  value={clusteringMethod}
                  onValueChange={(value: 'kmeans' | 'hierarchical' | 'auto') => setClusteringMethod(value)}
                >
                  <option value="auto">{t('clustering.auto')}</option>
                  <option value="kmeans">{t('clustering.kmeans')}</option>
                  <option value="hierarchical">{t('clustering.hierarchical')}</option>
                </Select>
              </div>

              {/* Max Clusters */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('clustering.maxClusters')}: {maxClusters}
                </label>
                <Slider
                  value={[maxClusters]}
                  onValueChange={([value]) => setMaxClusters(value)}
                  min={3}
                  max={30}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Min Cluster Size */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('clustering.minSize')}: {minClusterSize}
                </label>
                <Slider
                  value={[minClusterSize]}
                  onValueChange={([value]) => setMinClusterSize(value)}
                  min={2}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Coherence Threshold */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('clustering.coherenceThreshold')}: {Math.round(coherenceThreshold * 100)}%
                </label>
                <Slider
                  value={[coherenceThreshold]}
                  onValueChange={([value]) => setCoherenceThreshold(value)}
                  min={0.1}
                  max={0.9}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Include Sub-clusters */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('clustering.includeSubClusters')}</span>
                <Switch
                  checked={includeSubClusters}
                  onCheckedChange={setIncludeSubClusters}
                />
              </div>
            </div>

            {/* Optimal K Recommendation */}
            {optimalK && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-1">
                  {t('clustering.recommendation')}:
                </p>
                <p className="text-sm text-blue-700">
                  {optimalK.recommendation} (Optimal K: {optimalK.optimalK})
                </p>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* View Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            {t('clustering.gridView')}
          </Button>
          <Button
            variant={viewMode === 'hierarchy' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('hierarchy')}
          >
            {t('clustering.hierarchyView')}
          </Button>
          <Button
            variant={viewMode === 'network' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('network')}
          >
            {t('clustering.networkView')}
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">{t('clustering.sortBy')}:</span>
            <Select
              value={sortBy}
              onValueChange={(value: 'size' | 'coherence' | 'concepts') => setSortBy(value)}
            >
              <option value="coherence">{t('clustering.coherence')}</option>
              <option value="size">{t('clustering.size')}</option>
              <option value="concepts">{t('clustering.concepts')}</option>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm">{t('clustering.minSize')}:</span>
            <Slider
              value={[filterMinSize]}
              onValueChange={([value]) => setFilterMinSize(value)}
              min={0}
              max={20}
              step={1}
              className="w-20"
            />
            <span className="text-sm w-6">{filterMinSize}</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="mb-4 p-4 border-red-200 bg-red-50">
          <p className="text-red-600 text-sm">{error}</p>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="p-8">
          <div className="flex items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span>{t('clustering.processing')}</span>
          </div>
        </Card>
      )}

      {/* Clusters Display */}
      {!isLoading && (
        <>
          {clusters.length === 0 ? (
            <Card className="p-8">
              <p className="text-gray-500 text-center">
                {documentIds.length === 0
                  ? t('clustering.noDocuments')
                  : t('clustering.noClusters')
                }
              </p>
            </Card>
          ) : (
            <div>
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getDisplayClusters().map(renderClusterGrid)}
                </div>
              )}

              {viewMode === 'hierarchy' && (
                <div className="space-y-2">
                  {getDisplayClusters().map(cluster => renderClusterHierarchy(cluster))}
                </div>
              )}

              {viewMode === 'network' && (
                <Card className="p-8">
                  <p className="text-gray-500 text-center">
                    {t('clustering.networkViewComingSoon')}
                  </p>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
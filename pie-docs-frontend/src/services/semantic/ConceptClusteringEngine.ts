import type {
  ConceptCluster,
  ConceptClusterAPIResponse,
  VectorEmbedding
} from '@/types/domain/SemanticSearch';
import {
  kMeansCluster,
  hierarchicalCluster,
  calculateCentroid,
  calculateSilhouetteScore
} from '@/utils/semantic/vectorUtils';
import { ConceptExtractor } from '@/utils/semantic/conceptExtractor';

export interface ClusteringOptions {
  method: 'kmeans' | 'hierarchical' | 'dbscan' | 'auto';
  minClusterSize?: number;
  maxClusters?: number;
  coherenceThreshold?: number;
  includeSubClusters?: boolean;
  dynamicOptimization?: boolean;
}

export interface ClusterAnalytics {
  totalClusters: number;
  averageClusterSize: number;
  silhouetteScore: number;
  coherenceScore: number;
  clusterDistribution: Record<string, number>;
  topConcepts: string[];
}

export interface ClusterUpdateResult {
  clustersModified: number;
  clustersCreated: number;
  clustersRemoved: number;
  documentsReassigned: number;
  newCoherenceScore: number;
}

export class ConceptClusteringEngine {
  private baseUrl: string;
  private conceptExtractor: ConceptExtractor;
  private clusterCache: Map<string, ConceptCluster[]> = new Map();

  constructor(baseUrl: string = '/api/semantic-search') {
    this.baseUrl = baseUrl;
    this.conceptExtractor = new ConceptExtractor();
  }

  /**
   * Cluster documents by concepts and themes
   */
  async clusterDocuments(
    documentIds: string[],
    options: ClusteringOptions = {}
  ): Promise<ConceptCluster[]> {
    const {
      method = 'auto',
      minClusterSize = 2,
      maxClusters = 20,
      coherenceThreshold = 0.4,
      includeSubClusters = true,
      dynamicOptimization = true
    } = options;

    const cacheKey = `${JSON.stringify(documentIds)}_${JSON.stringify(options)}`;

    if (this.clusterCache.has(cacheKey)) {
      return this.clusterCache.get(cacheKey)!;
    }

    try {
      const response = await fetch(`${this.baseUrl}/clusters/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds,
          method,
          minClusterSize,
          maxClusters,
          coherenceThreshold,
          includeSubClusters,
          dynamicOptimization
        }),
      });

      if (!response.ok) {
        throw new Error(`Document clustering failed: ${response.statusText}`);
      }

      const data: ConceptClusterAPIResponse = await response.json();

      // Cache the results
      this.clusterCache.set(cacheKey, data.clusters);

      return data.clusters;
    } catch (error) {
      console.error('Failed to cluster documents:', error);
      throw error;
    }
  }

  /**
   * Auto-determine optimal clustering method and parameters
   */
  async autoCluster(documentIds: string[]): Promise<{
    clusters: ConceptCluster[];
    method: string;
    parameters: Record<string, any>;
    quality: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/clusters/auto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentIds }),
      });

      if (!response.ok) {
        throw new Error(`Auto clustering failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to auto cluster documents:', error);
      throw error;
    }
  }

  /**
   * Create concept-based clusters from document content
   */
  async createConceptClusters(
    documents: Array<{
      id: string;
      content: string;
      metadata?: Record<string, any>;
    }>,
    options: ClusteringOptions = {}
  ): Promise<ConceptCluster[]> {
    const {
      method = 'kmeans',
      maxClusters = 15,
      coherenceThreshold = 0.3
    } = options;

    try {
      // Extract concepts from all documents
      const documentConcepts = await Promise.all(
        documents.map(async (doc) => {
          const concepts = await this.conceptExtractor.extractConcepts(doc.content);
          return {
            documentId: doc.id,
            concepts: concepts.concepts,
            metadata: doc.metadata
          };
        })
      );

      // Build concept vectors for clustering
      const allConcepts = new Set<string>();
      documentConcepts.forEach(doc => {
        doc.concepts.forEach(concept => allConcepts.add(concept));
      });

      const conceptArray = Array.from(allConcepts);
      const vectorizedDocs = documentConcepts.map(doc => ({
        id: doc.documentId,
        vector: this.vectorizeConcepts(doc.concepts, conceptArray),
        metadata: doc.metadata
      }));

      // Perform clustering
      let clusters: Array<{
        centroid: number[];
        members: Array<{ id: string; vector: number[]; metadata?: any }>;
        coherence: number;
      }>;

      if (method === 'kmeans') {
        clusters = kMeansCluster(vectorizedDocs, Math.min(maxClusters, vectorizedDocs.length));
      } else if (method === 'hierarchical') {
        clusters = hierarchicalCluster(vectorizedDocs, maxClusters);
      } else {
        // Auto-select best method
        const kmeansResult = kMeansCluster(vectorizedDocs, Math.min(maxClusters, vectorizedDocs.length));
        const hierarchicalResult = hierarchicalCluster(vectorizedDocs, maxClusters);

        const kmeansScore = this.calculateClusterQuality(kmeansResult);
        const hierarchicalScore = this.calculateClusterQuality(hierarchicalResult);

        clusters = kmeansScore > hierarchicalScore ? kmeansResult : hierarchicalResult;
      }

      // Convert to ConceptCluster format
      const conceptClusters: ConceptCluster[] = clusters
        .filter(cluster => cluster.members.length >= (options.minClusterSize || 2))
        .map((cluster, index) => {
          const clusterConcepts = this.extractClusterConcepts(cluster.members, conceptArray, cluster.centroid);

          return {
            id: `cluster_${index}`,
            name: this.generateClusterName(clusterConcepts),
            concepts: clusterConcepts.slice(0, 10), // Top 10 concepts
            documentIds: cluster.members.map(m => m.id),
            centroidVector: cluster.centroid,
            coherenceScore: cluster.coherence
          };
        });

      return conceptClusters.filter(cluster => cluster.coherenceScore >= coherenceThreshold);

    } catch (error) {
      console.error('Failed to create concept clusters:', error);
      throw error;
    }
  }

  /**
   * Build hierarchical concept clusters
   */
  async buildHierarchicalClusters(
    documentIds: string[],
    maxLevels: number = 3
  ): Promise<ConceptCluster[]> {
    try {
      const response = await fetch(`${this.baseUrl}/clusters/hierarchical`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds,
          maxLevels
        }),
      });

      if (!response.ok) {
        throw new Error(`Hierarchical clustering failed: ${response.statusText}`);
      }

      const data: ConceptClusterAPIResponse = await response.json();
      return data.clusters;
    } catch (error) {
      console.error('Failed to build hierarchical clusters:', error);
      throw error;
    }
  }

  /**
   * Update clusters dynamically as new documents are added
   */
  async updateClusters(
    newDocumentIds: string[],
    existingClusters: ConceptCluster[]
  ): Promise<ClusterUpdateResult> {
    try {
      const response = await fetch(`${this.baseUrl}/clusters/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newDocumentIds,
          existingClusters
        }),
      });

      if (!response.ok) {
        throw new Error(`Cluster update failed: ${response.statusText}`);
      }

      const result: ClusterUpdateResult = await response.json();

      // Clear cache to force refresh
      this.clearCache();

      return result;
    } catch (error) {
      console.error('Failed to update clusters:', error);
      throw error;
    }
  }

  /**
   * Analyze cluster quality and characteristics
   */
  async analyzeClusterQuality(clusters: ConceptCluster[]): Promise<ClusterAnalytics> {
    try {
      const response = await fetch(`${this.baseUrl}/clusters/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clusters }),
      });

      if (!response.ok) {
        throw new Error(`Cluster analysis failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to analyze clusters:', error);
      throw error;
    }
  }

  /**
   * Find optimal number of clusters using elbow method
   */
  async findOptimalClusterCount(
    documentIds: string[],
    maxK: number = 20
  ): Promise<{
    optimalK: number;
    scores: Array<{ k: number; score: number; method: string }>;
    recommendation: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/clusters/optimal-k`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds,
          maxK
        }),
      });

      if (!response.ok) {
        throw new Error(`Optimal cluster count detection failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to find optimal cluster count:', error);
      throw error;
    }
  }

  /**
   * Merge similar clusters based on concept overlap
   */
  async mergeSimilarClusters(
    clusters: ConceptCluster[],
    similarityThreshold: number = 0.7
  ): Promise<ConceptCluster[]> {
    try {
      const response = await fetch(`${this.baseUrl}/clusters/merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clusters,
          similarityThreshold
        }),
      });

      if (!response.ok) {
        throw new Error(`Cluster merging failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.mergedClusters;
    } catch (error) {
      console.error('Failed to merge clusters:', error);
      throw error;
    }
  }

  /**
   * Split large clusters into smaller, more coherent ones
   */
  async splitLargeClusters(
    clusters: ConceptCluster[],
    maxClusterSize: number = 50
  ): Promise<ConceptCluster[]> {
    try {
      const response = await fetch(`${this.baseUrl}/clusters/split`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clusters,
          maxClusterSize
        }),
      });

      if (!response.ok) {
        throw new Error(`Cluster splitting failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.splitClusters;
    } catch (error) {
      console.error('Failed to split clusters:', error);
      throw error;
    }
  }

  /**
   * Get cluster trends over time
   */
  async getClusterTrends(
    timeRange: {
      start: string;
      end: string;
      interval: 'day' | 'week' | 'month';
    }
  ): Promise<Array<{
    timestamp: string;
    clusterCount: number;
    averageSize: number;
    topConcepts: string[];
    qualityScore: number;
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/clusters/trends`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(timeRange),
      });

      if (!response.ok) {
        throw new Error(`Cluster trends retrieval failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get cluster trends:', error);
      throw error;
    }
  }

  /**
   * Vectorize concepts for clustering
   */
  private vectorizeConcepts(concepts: string[], allConcepts: string[]): number[] {
    return allConcepts.map(concept => concepts.includes(concept) ? 1 : 0);
  }

  /**
   * Extract concepts from cluster centroid
   */
  private extractClusterConcepts(
    members: Array<{ id: string; vector: number[]; metadata?: any }>,
    conceptArray: string[],
    centroid: number[]
  ): string[] {
    // Sort concepts by their weight in the centroid
    const conceptWeights = centroid.map((weight, index) => ({
      concept: conceptArray[index],
      weight
    })).sort((a, b) => b.weight - a.weight);

    return conceptWeights
      .filter(cw => cw.weight > 0.1) // Only include significant concepts
      .map(cw => cw.concept);
  }

  /**
   * Generate a meaningful name for a cluster
   */
  private generateClusterName(concepts: string[]): string {
    if (concepts.length === 0) return 'Miscellaneous';

    // Use the most significant concept as the cluster name
    return concepts[0].replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Calculate cluster quality score
   */
  private calculateClusterQuality(
    clusters: Array<{
      centroid: number[];
      members: Array<{ id: string; vector: number[] }>;
      coherence: number;
    }>
  ): number {
    if (clusters.length === 0) return 0;

    const avgCoherence = clusters.reduce((sum, cluster) => sum + cluster.coherence, 0) / clusters.length;
    const sizeVariance = this.calculateSizeVariance(clusters);

    // Quality score balances coherence and size consistency
    return avgCoherence * (1 - sizeVariance);
  }

  /**
   * Calculate variance in cluster sizes
   */
  private calculateSizeVariance(
    clusters: Array<{ members: Array<any> }>
  ): number {
    if (clusters.length <= 1) return 0;

    const sizes = clusters.map(c => c.members.length);
    const avgSize = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;
    const variance = sizes.reduce((sum, size) => sum + Math.pow(size - avgSize, 2), 0) / sizes.length;

    return Math.sqrt(variance) / avgSize; // Coefficient of variation
  }

  /**
   * Clear clustering cache
   */
  clearCache(): void {
    this.clusterCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    cacheSize: number;
    cachedQueries: string[];
  } {
    return {
      cacheSize: this.clusterCache.size,
      cachedQueries: Array.from(this.clusterCache.keys())
    };
  }
}
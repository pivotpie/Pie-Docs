// Vector utility functions for semantic search operations

/**
 * Vector utility functions for semantic search operations
 */

/**
 * Calculate cosine similarity between two vectors
 *
 * Cosine similarity measures the cosine of the angle between two non-zero vectors.
 * Formula: cos(θ) = (A · B) / (||A|| × ||B||)
 *
 * @param vector1 - First vector as array of numbers
 * @param vector2 - Second vector as array of numbers
 * @returns Similarity score between -1 and 1, where 1 = identical direction, 0 = perpendicular, -1 = opposite
 * @throws Error if vectors have different lengths
 */
export function cosineSimilarity(vector1: number[], vector2: number[]): number {
  if (vector1.length !== vector2.length) {
    throw new Error('Vectors must have the same length');
  }

  const dotProduct = vector1.reduce((sum, a, i) => sum + a * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, a) => sum + a * a, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, a) => sum + a * a, 0));

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Calculate Euclidean distance between two vectors
 *
 * Euclidean distance is the straight-line distance between two points in space.
 * Formula: √(Σ(ai - bi)²) for i=1 to n
 *
 * @param vector1 - First vector as array of numbers
 * @param vector2 - Second vector as array of numbers
 * @returns Distance value (always positive), where 0 = identical vectors
 * @throws Error if vectors have different lengths
 */
export function euclideanDistance(vector1: number[], vector2: number[]): number {
  if (vector1.length !== vector2.length) {
    throw new Error('Vectors must have the same length');
  }

  const sumSquaredDifferences = vector1.reduce(
    (sum, a, i) => sum + Math.pow(a - vector2[i], 2),
    0
  );

  return Math.sqrt(sumSquaredDifferences);
}

/**
 * Calculate Manhattan distance between two vectors
 */
export function manhattanDistance(vector1: number[], vector2: number[]): number {
  if (vector1.length !== vector2.length) {
    throw new Error('Vectors must have the same length');
  }

  return vector1.reduce((sum, a, i) => sum + Math.abs(a - vector2[i]), 0);
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, a) => sum + a * a, 0));

  if (magnitude === 0) {
    return vector.slice(); // Return copy of original if zero vector
  }

  return vector.map(component => component / magnitude);
}

/**
 * Calculate the centroid of multiple vectors
 */
export function calculateCentroid(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    return [];
  }

  const dimensions = vectors[0].length;
  const centroid = new Array(dimensions).fill(0);

  vectors.forEach(vector => {
    vector.forEach((component, i) => {
      centroid[i] += component;
    });
  });

  return centroid.map(component => component / vectors.length);
}

/**
 * Find the k most similar vectors to a query vector
 */
export function findMostSimilar(
  queryVector: number[],
  candidateVectors: Array<{ id: string; vector: number[]; metadata?: unknown }>,
  k: number = 10,
  similarityFunction: (v1: number[], v2: number[]) => number = cosineSimilarity
): Array<{ id: string; score: number; metadata?: unknown }> {
  const similarities = candidateVectors.map(candidate => ({
    id: candidate.id,
    score: similarityFunction(queryVector, candidate.vector),
    metadata: candidate.metadata,
  }));

  // Sort by similarity score (descending for cosine similarity)
  similarities.sort((a, b) => b.score - a.score);

  return similarities.slice(0, k);
}

/**
 * Cluster vectors using K-means algorithm
 *
 * K-means clustering partitions vectors into k clusters by minimizing within-cluster sum of squares.
 * Algorithm: 1) Initialize centroids, 2) Assign vectors to closest centroid, 3) Update centroids, 4) Repeat until convergence
 *
 * @param vectors - Array of vectors with id and vector data
 * @param k - Number of clusters to create
 * @param maxIterations - Maximum iterations before stopping (default: 100)
 * @param tolerance - Convergence threshold for centroid movement (default: 1e-6)
 * @returns Array of clusters with centroids, members, and coherence scores
 */
export function kMeansCluster(
  vectors: Array<{ id: string; vector: number[] }>,
  k: number,
  maxIterations: number = 100,
  tolerance: number = 1e-6
): Array<{
  centroid: number[];
  members: Array<{ id: string; vector: number[] }>;
  coherence: number;
}> {
  if (vectors.length === 0 || k <= 0) {
    return [];
  }

  const dimensions = vectors[0].vector.length;

  // Initialize centroids randomly
  let centroids = Array.from({ length: k }, () =>
    Array.from({ length: dimensions }, () => Math.random() * 2 - 1)
  );

  let clusters: Array<{
    centroid: number[];
    members: Array<{ id: string; vector: number[] }>;
    coherence: number;
  }> = [];

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Assign vectors to closest centroids
    const newClusters = centroids.map(centroid => ({
      centroid: centroid.slice(),
      members: [] as Array<{ id: string; vector: number[] }>,
      coherence: 0,
    }));

    vectors.forEach(vectorData => {
      let bestCluster = 0;
      let bestDistance = Infinity;

      centroids.forEach((centroid, i) => {
        const distance = euclideanDistance(vectorData.vector, centroid);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestCluster = i;
        }
      });

      newClusters[bestCluster].members.push(vectorData);
    });

    // Calculate new centroids
    const newCentroids = newClusters.map(cluster => {
      if (cluster.members.length === 0) {
        return cluster.centroid;
      }
      return calculateCentroid(cluster.members.map(m => m.vector));
    });

    // Check for convergence
    const centroidChanged = centroids.some((oldCentroid, i) =>
      euclideanDistance(oldCentroid, newCentroids[i]) > tolerance
    );

    centroids = newCentroids;
    clusters = newClusters;

    // Calculate coherence for each cluster
    clusters.forEach(cluster => {
      if (cluster.members.length > 1) {
        const distances = cluster.members.map(member =>
          euclideanDistance(member.vector, cluster.centroid)
        );
        cluster.coherence = 1 / (1 + distances.reduce((sum, d) => sum + d, 0) / distances.length);
      } else {
        cluster.coherence = 1;
      }
    });

    if (!centroidChanged) {
      break;
    }
  }

  return clusters.filter(cluster => cluster.members.length > 0);
}

/**
 * Perform hierarchical clustering using single linkage
 */
export function hierarchicalCluster(
  vectors: Array<{ id: string; vector: number[] }>,
  maxClusters: number = 10
): Array<{
  level: number;
  members: Array<{ id: string; vector: number[] }>;
  centroid: number[];
  children?: Array<{ id: string; vector: number[] }[]>;
}> {
  if (vectors.length <= maxClusters) {
    return vectors.map((v, _i) => ({
      level: 0,
      members: [v],
      centroid: v.vector.slice(),
    }));
  }

  // Start with each vector as its own cluster
  let clusters = vectors.map(v => [v]);

  while (clusters.length > maxClusters) {
    let minDistance = Infinity;
    let mergeIndices = [0, 1];

    // Find the two closest clusters
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const centroid1 = calculateCentroid(clusters[i].map(v => v.vector));
        const centroid2 = calculateCentroid(clusters[j].map(v => v.vector));
        const distance = euclideanDistance(centroid1, centroid2);

        if (distance < minDistance) {
          minDistance = distance;
          mergeIndices = [i, j];
        }
      }
    }

    // Merge the closest clusters
    const [i, j] = mergeIndices;
    const mergedCluster = [...clusters[i], ...clusters[j]];
    clusters = clusters.filter((_, index) => index !== i && index !== j);
    clusters.push(mergedCluster);
  }

  return clusters.map((cluster, _level) => ({
    level: _level,
    members: cluster,
    centroid: calculateCentroid(cluster.map(v => v.vector)),
  }));
}

/**
 * Calculate silhouette score for cluster quality assessment
 *
 * Silhouette analysis measures how well-separated clusters are. For each point:
 * s = (b - a) / max(a, b) where a = avg distance to same cluster, b = avg distance to nearest cluster
 *
 * @param vectors - Array of all vectors being evaluated
 * @param clusters - Array of clusters (each cluster is array of vectors)
 * @returns Average silhouette score: 1 = well-separated, 0 = overlapping, -1 = misclassified
 */
export function calculateSilhouetteScore(
  vectors: Array<{ id: string; vector: number[] }>,
  clusters: Array<Array<{ id: string; vector: number[] }>>
): number {
  if (clusters.length <= 1) {
    return 0;
  }

  const silhouetteScores: number[] = [];

  vectors.forEach(vector => {
    // Find which cluster this vector belongs to
    let clusterIndex = -1;
    for (let i = 0; i < clusters.length; i++) {
      if (clusters[i].some(v => v.id === vector.id)) {
        clusterIndex = i;
        break;
      }
    }

    if (clusterIndex === -1) return;

    const currentCluster = clusters[clusterIndex];

    // Calculate average distance to points in same cluster
    const aScore = currentCluster.length > 1
      ? currentCluster
          .filter(v => v.id !== vector.id)
          .reduce((sum, v) => sum + euclideanDistance(vector.vector, v.vector), 0) /
        (currentCluster.length - 1)
      : 0;

    // Calculate minimum average distance to points in other clusters
    const bScores = clusters
      .filter((_, i) => i !== clusterIndex)
      .map(cluster =>
        cluster.reduce((sum, v) => sum + euclideanDistance(vector.vector, v.vector), 0) /
        cluster.length
      );

    const bScore = Math.min(...bScores);

    // Calculate silhouette score for this point
    const silhouette = (bScore - aScore) / Math.max(aScore, bScore);
    silhouetteScores.push(silhouette);
  });

  return silhouetteScores.reduce((sum, score) => sum + score, 0) / silhouetteScores.length;
}

/**
 * Reduce vector dimensionality using PCA (simplified version)
 */
export function reduceDimensionality(
  vectors: number[][],
  targetDimensions: number
): number[][] {
  if (vectors.length === 0 || targetDimensions <= 0) {
    return [];
  }

  const originalDimensions = vectors[0].length;
  if (targetDimensions >= originalDimensions) {
    return vectors.map(v => v.slice()); // Return copies
  }

  // Center the data
  const means = Array.from({ length: originalDimensions }, (_, i) =>
    vectors.reduce((sum, v) => sum + v[i], 0) / vectors.length
  );

  const centeredVectors = vectors.map(v =>
    v.map((val, i) => val - means[i])
  );

  // For simplicity, just take the first targetDimensions
  // In a real implementation, you'd compute eigenvectors of covariance matrix
  return centeredVectors.map(v => v.slice(0, targetDimensions));
}
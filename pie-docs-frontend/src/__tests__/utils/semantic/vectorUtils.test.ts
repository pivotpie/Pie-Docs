import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  euclideanDistance,
  manhattanDistance,
  normalizeVector,
  calculateCentroid,
  findMostSimilar,
  kMeansCluster,
  hierarchicalCluster,
  calculateSilhouetteScore,
  reduceDimensionality
} from '@/utils/semantic/vectorUtils';

describe('vectorUtils', () => {
  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      // Test identical vectors
      expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);

      // Test orthogonal vectors
      expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBe(0);

      // Test opposite vectors
      expect(cosineSimilarity([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1, 10);

      // Test known similarity
      expect(cosineSimilarity([1, 0], [1, 1])).toBeCloseTo(Math.sqrt(2) / 2, 10);
    });

    it('should throw error for different length vectors', () => {
      expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow('Vectors must have the same length');
    });

    it('should handle zero vectors', () => {
      expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
      expect(cosineSimilarity([1, 2, 3], [0, 0, 0])).toBe(0);
    });
  });

  describe('euclideanDistance', () => {
    it('should calculate Euclidean distance correctly', () => {
      // Test identical vectors
      expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0);

      // Test simple distance
      expect(euclideanDistance([0, 0], [3, 4])).toBe(5);

      // Test 3D distance
      expect(euclideanDistance([1, 1, 1], [2, 2, 2])).toBeCloseTo(Math.sqrt(3), 10);
    });

    it('should throw error for different length vectors', () => {
      expect(() => euclideanDistance([1, 2], [1, 2, 3])).toThrow('Vectors must have the same length');
    });
  });

  describe('manhattanDistance', () => {
    it('should calculate Manhattan distance correctly', () => {
      // Test identical vectors
      expect(manhattanDistance([1, 2, 3], [1, 2, 3])).toBe(0);

      // Test simple distance
      expect(manhattanDistance([0, 0], [3, 4])).toBe(7);

      // Test with negative values
      expect(manhattanDistance([1, -2], [-1, 2])).toBe(6);
    });

    it('should throw error for different length vectors', () => {
      expect(() => manhattanDistance([1, 2], [1, 2, 3])).toThrow('Vectors must have the same length');
    });
  });

  describe('normalizeVector', () => {
    it('should normalize vector to unit length', () => {
      const normalized = normalizeVector([3, 4]);
      expect(normalized).toEqual([0.6, 0.8]);

      // Check unit length
      const magnitude = Math.sqrt(normalized.reduce((sum, x) => sum + x * x, 0));
      expect(magnitude).toBeCloseTo(1, 10);
    });

    it('should handle zero vector', () => {
      const normalized = normalizeVector([0, 0, 0]);
      expect(normalized).toEqual([0, 0, 0]);
    });

    it('should not modify original vector', () => {
      const original = [3, 4];
      const normalized = normalizeVector(original);
      expect(original).toEqual([3, 4]);
      expect(normalized).not.toBe(original);
    });
  });

  describe('calculateCentroid', () => {
    it('should calculate centroid correctly', () => {
      const vectors = [
        [1, 2],
        [3, 4],
        [5, 6]
      ];
      const centroid = calculateCentroid(vectors);
      expect(centroid).toEqual([3, 4]);
    });

    it('should handle single vector', () => {
      const vectors = [[1, 2, 3]];
      const centroid = calculateCentroid(vectors);
      expect(centroid).toEqual([1, 2, 3]);
    });

    it('should handle empty array', () => {
      const centroid = calculateCentroid([]);
      expect(centroid).toEqual([]);
    });
  });

  describe('findMostSimilar', () => {
    it('should find most similar vectors', () => {
      const queryVector = [1, 0];
      const candidates = [
        { id: 'a', vector: [1, 0] },
        { id: 'b', vector: [0, 1] },
        { id: 'c', vector: [0.7, 0.7] },
        { id: 'd', vector: [-1, 0] }
      ];

      const result = findMostSimilar(queryVector, candidates, 3);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('a'); // Most similar (identical)
      expect(result[0].score).toBeCloseTo(1, 10);
      expect(result[1].id).toBe('c'); // Second most similar
      expect(result[2].id).toBe('b'); // Third most similar
    });

    it('should respect k parameter', () => {
      const queryVector = [1, 0];
      const candidates = [
        { id: 'a', vector: [1, 0] },
        { id: 'b', vector: [0, 1] },
        { id: 'c', vector: [0.7, 0.7] }
      ];

      const result = findMostSimilar(queryVector, candidates, 2);
      expect(result).toHaveLength(2);
    });

    it('should include metadata', () => {
      const queryVector = [1, 0];
      const candidates = [
        { id: 'a', vector: [1, 0], metadata: { type: 'document' } }
      ];

      const result = findMostSimilar(queryVector, candidates, 1);
      expect(result[0].metadata).toEqual({ type: 'document' });
    });
  });

  describe('kMeansCluster', () => {
    it('should cluster vectors', () => {
      const vectors = [
        { id: '1', vector: [1, 1] },
        { id: '2', vector: [1.1, 1.1] },
        { id: '3', vector: [5, 5] },
        { id: '4', vector: [5.1, 5.1] }
      ];

      const clusters = kMeansCluster(vectors, 2);

      expect(clusters).toHaveLength(2);
      expect(clusters[0].members.length + clusters[1].members.length).toBe(4);

      // Each cluster should have coherence score
      clusters.forEach(cluster => {
        expect(cluster.coherence).toBeGreaterThan(0);
        expect(cluster.coherence).toBeLessThanOrEqual(1);
      });
    });

    it('should handle edge cases', () => {
      // Empty vectors
      expect(kMeansCluster([], 2)).toEqual([]);

      // k <= 0
      expect(kMeansCluster([{ id: '1', vector: [1, 1] }], 0)).toEqual([]);

      // Single vector
      const singleResult = kMeansCluster([{ id: '1', vector: [1, 1] }], 1);
      expect(singleResult).toHaveLength(1);
      expect(singleResult[0].members).toHaveLength(1);
    });
  });

  describe('hierarchicalCluster', () => {
    it('should perform hierarchical clustering', () => {
      const vectors = [
        { id: '1', vector: [1, 1] },
        { id: '2', vector: [2, 2] },
        { id: '3', vector: [5, 5] },
        { id: '4', vector: [6, 6] }
      ];

      const clusters = hierarchicalCluster(vectors, 2);

      expect(clusters).toHaveLength(2);
      clusters.forEach(cluster => {
        expect(cluster.level).toBeGreaterThanOrEqual(0);
        expect(cluster.members.length).toBeGreaterThan(0);
        expect(cluster.centroid).toHaveLength(2);
      });
    });

    it('should handle small datasets', () => {
      const vectors = [
        { id: '1', vector: [1, 1] },
        { id: '2', vector: [2, 2] }
      ];

      const clusters = hierarchicalCluster(vectors, 5);
      expect(clusters).toHaveLength(2); // Should return individual clusters
    });
  });

  describe('calculateSilhouetteScore', () => {
    it('should calculate silhouette score', () => {
      const vectors = [
        { id: '1', vector: [1, 1] },
        { id: '2', vector: [1.1, 1.1] },
        { id: '3', vector: [5, 5] },
        { id: '4', vector: [5.1, 5.1] }
      ];

      const clusters = [
        [{ id: '1', vector: [1, 1] }, { id: '2', vector: [1.1, 1.1] }],
        [{ id: '3', vector: [5, 5] }, { id: '4', vector: [5.1, 5.1] }]
      ];

      const score = calculateSilhouetteScore(vectors, clusters);

      expect(score).toBeGreaterThan(0); // Should be positive for well-separated clusters
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle single cluster', () => {
      const vectors = [
        { id: '1', vector: [1, 1] },
        { id: '2', vector: [2, 2] }
      ];

      const clusters = [vectors];
      const score = calculateSilhouetteScore(vectors, clusters);

      expect(score).toBe(0); // Single cluster should have score of 0
    });
  });

  describe('reduceDimensionality', () => {
    it('should reduce dimensionality', () => {
      const vectors = [
        [1, 2, 3, 4],
        [2, 3, 4, 5],
        [3, 4, 5, 6]
      ];

      const reduced = reduceDimensionality(vectors, 2);

      expect(reduced).toHaveLength(3);
      reduced.forEach(vector => {
        expect(vector).toHaveLength(2);
      });
    });

    it('should handle edge cases', () => {
      // Empty vectors
      expect(reduceDimensionality([], 2)).toEqual([]);

      // Target dimensions <= 0
      expect(reduceDimensionality([[1, 2]], 0)).toEqual([]);

      // Target dimensions >= original
      const original = [[1, 2, 3]];
      const result = reduceDimensionality(original, 5);
      expect(result[0]).toEqual([1, 2, 3]);
    });

    it('should center the data', () => {
      const vectors = [
        [1, 1],
        [3, 3],
        [5, 5]
      ];

      const reduced = reduceDimensionality(vectors, 1);

      // The mean should be subtracted from each vector
      // Mean is [3, 3], so centered vectors should be [-2, -2], [0, 0], [2, 2]
      expect(reduced[0][0]).toBeCloseTo(-2, 10);
      expect(reduced[1][0]).toBeCloseTo(0, 10);
      expect(reduced[2][0]).toBeCloseTo(2, 10);
    });
  });
});
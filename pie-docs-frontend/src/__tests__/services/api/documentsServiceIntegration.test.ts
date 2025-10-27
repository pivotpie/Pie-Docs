import { describe, it, expect, vi, beforeEach } from 'vitest';

// Simple integration tests to verify the service methods exist and have correct signatures
describe('DocumentsService Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have required cabinet methods', async () => {
    // Dynamic import to avoid circular dependency issues
    const { documentsService } = await import('@/services/api/documentsService');

    expect(typeof documentsService.getCabinets).toBe('function');
    expect(typeof documentsService.getCabinetDocuments).toBe('function');
    expect(typeof documentsService.getDocumentThumbnailUrl).toBe('function');
    expect(typeof documentsService.getDocumentFiles).toBe('function');
  });

  it('should generate correct thumbnail URL format', async () => {
    const { documentsService } = await import('@/services/api/documentsService');

    const url = documentsService.getDocumentThumbnailUrl('123');

    // Should contain the expected URL structure
    expect(url).toMatch(/\/documents\/123\/files\/\d+\/pages\/\d+\/image\/$/);
  });

  it('should handle different thumbnail URL parameters', async () => {
    const { documentsService } = await import('@/services/api/documentsService');

    const url1 = documentsService.getDocumentThumbnailUrl('123');
    const url2 = documentsService.getDocumentThumbnailUrl('123', '2');
    const url3 = documentsService.getDocumentThumbnailUrl('123', '2', '3');

    expect(url1).toContain('/documents/123/files/1/pages/1/image/');
    expect(url2).toContain('/documents/123/files/2/pages/1/image/');
    expect(url3).toContain('/documents/123/files/2/pages/3/image/');
  });

  it('should have correct method signatures for cabinet operations', async () => {
    const { documentsService } = await import('@/services/api/documentsService');

    // Verify methods exist and don't throw on basic calls
    expect(documentsService.getCabinets).toBeDefined();
    expect(documentsService.getCabinetDocuments).toBeDefined();

    // Test that methods accept expected parameter types
    const mockParams = { page: 1, limit: 10 };

    // These should not throw immediately (they will make network calls in actual usage)
    expect(() => documentsService.getCabinetDocuments('1', mockParams)).not.toThrow();
  });
});
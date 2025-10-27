import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BarcodeGenerator, barcodeGenerator } from '@/utils/barcodeGenerator';

// Mock canvas and QR code libraries
vi.mock('jsbarcode', () => {
  return { default: vi.fn((canvas, code, options) => {
    // Mock JsBarcode behavior
    const context = canvas.getContext('2d');
    context.fillRect(0, 0, 100, 50);
  })};
});

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(() => Promise.resolve('data:image/png;base64,mock-qr-code')),
  },
  toDataURL: vi.fn(() => Promise.resolve('data:image/png;base64,mock-qr-code')),
}));

// Mock canvas
const mockCanvas = {
  getContext: vi.fn(() => ({
    fillRect: vi.fn(),
  })),
  toDataURL: vi.fn(() => 'data:image/png;base64,mock-barcode'),
};

Object.defineProperty(document, 'createElement', {
  value: vi.fn(() => mockCanvas),
});

describe('BarcodeGenerator', () => {
  let generator: BarcodeGenerator;

  beforeEach(() => {
    generator = BarcodeGenerator.getInstance();
    generator.clearCache();
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = BarcodeGenerator.getInstance();
      const instance2 = BarcodeGenerator.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('generateUniqueId', () => {
    it('generates unique IDs with default prefix', () => {
      const id1 = generator.generateUniqueId();
      const id2 = generator.generateUniqueId();

      expect(id1).toMatch(/^DOC\d+[A-Z0-9]+$/);
      expect(id2).toMatch(/^DOC\d+[A-Z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('generates unique IDs with custom prefix and suffix', () => {
      const id = generator.generateUniqueId('TEST', 'END');
      expect(id).toMatch(/^TEST\d+[A-Z0-9]+END$/);
    });

    it('ensures uniqueness even with collisions', () => {
      // Force collision by generating same ID twice
      const originalId = generator.generateUniqueId('TEST');
      generator.clearCache(); // Clear to test collision handling

      // Mock to ensure we get collision detection
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.123456);

      const id1 = generator.generateUniqueId('TEST');
      const id2 = generator.generateUniqueId('TEST');

      expect(id1).not.toBe(id2);
      // The second ID should be different due to uniqueness check

      spy.mockRestore();
    });
  });

  describe('generateChecksum', () => {
    it('generates consistent checksums', () => {
      const checksum1 = generator.generateChecksum('TEST123');
      const checksum2 = generator.generateChecksum('TEST123');
      expect(checksum1).toBe(checksum2);
      expect(checksum1).toMatch(/^\d{2}$/);
    });

    it('generates different checksums for different inputs', () => {
      const checksum1 = generator.generateChecksum('TEST123');
      const checksum2 = generator.generateChecksum('TEST456');
      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe('validateBarcodeFormat', () => {
    it('validates CODE128 format correctly', () => {
      expect(generator.validateBarcodeFormat('ABC123', 'CODE128')).toBe(true);
      expect(generator.validateBarcodeFormat('!@#$%', 'CODE128')).toBe(true); // CODE128 accepts all printable ASCII
      expect(generator.validateBarcodeFormat('A'.repeat(81), 'CODE128')).toBe(false);
    });

    it('validates CODE39 format correctly', () => {
      expect(generator.validateBarcodeFormat('ABC123', 'CODE39')).toBe(true);
      expect(generator.validateBarcodeFormat('ABC-123 $.', 'CODE39')).toBe(true);
      expect(generator.validateBarcodeFormat('abc123', 'CODE39')).toBe(false); // lowercase not allowed
      expect(generator.validateBarcodeFormat('A'.repeat(44), 'CODE39')).toBe(false);
    });

    it('validates QR format correctly', () => {
      expect(generator.validateBarcodeFormat('Any text here!', 'QR')).toBe(true);
      expect(generator.validateBarcodeFormat('A'.repeat(4297), 'QR')).toBe(false);
    });

    it('validates DATAMATRIX format correctly', () => {
      expect(generator.validateBarcodeFormat('Any text here!', 'DATAMATRIX')).toBe(true);
      expect(generator.validateBarcodeFormat('A'.repeat(3117), 'DATAMATRIX')).toBe(false);
    });

    it('returns false for unknown formats', () => {
      expect(generator.validateBarcodeFormat('TEST', 'UNKNOWN')).toBe(false);
    });
  });

  describe('generateBarcodeImage', () => {
    it('generates linear barcode image', async () => {
      const options = {
        format: 'CODE128' as const,
        width: 2,
        height: 50,
        displayValue: true,
      };

      const image = await generator.generateBarcodeImage('TEST123', options);
      expect(image).toBe('data:image/png;base64,mock-barcode');
      expect(document.createElement).toHaveBeenCalledWith('canvas');
    });

    it('generates QR code image', async () => {
      const options = {
        format: 'QR' as const,
        width: 256,
      };

      const image = await generator.generateBarcodeImage('TEST123', options);
      expect(image).toBe('data:image/png;base64,mock-qr-code');
    });

    it('throws error for invalid code format combination', async () => {
      const options = {
        format: 'CODE39' as const,
      };

      await expect(
        generator.generateBarcodeImage('invalid!code', options)
      ).rejects.toThrow('Invalid code for format CODE39');
    });
  });

  describe('generateQRCodeWithMetadata', () => {
    it('generates QR code with embedded metadata', async () => {
      const metadata = {
        documentId: 'doc123',
        documentType: 'PDF',
        createdDate: '2023-01-01',
        checksum: 'abc123',
        version: '1.0',
      };

      const qrCode = await generator.generateQRCodeWithMetadata(metadata);
      expect(qrCode).toBe('data:image/png;base64,mock-qr-code');
    });
  });

  describe('decodeQRMetadata', () => {
    it('decodes valid JSON metadata', () => {
      const metadata = {
        documentId: 'doc123',
        documentType: 'PDF',
        createdDate: '2023-01-01',
        checksum: 'abc123',
        version: '1.0',
      };

      const jsonString = JSON.stringify(metadata);
      const decoded = generator.decodeQRMetadata(jsonString);
      expect(decoded).toEqual(metadata);
    });

    it('returns null for invalid JSON', () => {
      const decoded = generator.decodeQRMetadata('invalid json');
      expect(decoded).toBeNull();
    });
  });

  describe('batchGenerate', () => {
    it('generates multiple barcodes with progress tracking', async () => {
      const options = {
        format: 'CODE128' as const,
        prefix: 'BATCH',
      };

      const progressCallback = vi.fn();
      const barcodes = await generator.generateBatch(3, options, progressCallback);

      expect(barcodes).toHaveLength(3);
      expect(progressCallback).toHaveBeenCalledTimes(3);

      // Check that progress values are approximately correct (floating point precision)
      const calls = progressCallback.mock.calls;
      expect(calls[0][0]).toBeCloseTo(33.33, 2);
      expect(calls[1][0]).toBeCloseTo(66.67, 2);
      expect(calls[2][0]).toBe(100);

      barcodes.forEach(barcode => {
        expect(barcode.code).toMatch(/^BATCH\d+[A-Z0-9]+$/);
        expect(barcode.image).toBe('data:image/png;base64,mock-barcode');
      });
    });
  });

  describe('regenerateBarcode', () => {
    it('generates new barcode and removes old from cache', async () => {
      const originalCode = 'DOC123456789';
      const options = {
        format: 'CODE128' as const,
        prefix: 'DOC',
      };

      // First add the original code to cache
      generator.generateUniqueId('DOC');

      const newBarcode = await generator.regenerateBarcode(originalCode, options);

      expect(newBarcode.code).toMatch(/^DOC\d+[A-Z0-9]+$/);
      expect(newBarcode.code).not.toBe(originalCode);
      expect(newBarcode.image).toBe('data:image/png;base64,mock-barcode');
    });
  });

  describe('validateBarcodeIntegrity', () => {
    it('validates barcode with checksum', () => {
      const code = 'TEST123';
      const checksum = generator.generateChecksum(code);

      expect(generator.validateBarcodeIntegrity(code, checksum)).toBe(true);
      expect(generator.validateBarcodeIntegrity(code, 'wrong')).toBe(false);
    });

    it('returns true when no checksum provided', () => {
      expect(generator.validateBarcodeIntegrity('TEST123')).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('clears the generated codes cache', () => {
      const id1 = generator.generateUniqueId('TEST');
      const id2 = generator.generateUniqueId('TEST');

      // Should be different due to cache
      expect(id1).not.toBe(id2);

      // Clear cache
      generator.clearCache();

      // After clearing, cache should be empty
      // Test by checking that we can generate many IDs without collision
      const ids = [];
      for (let i = 0; i < 5; i++) {
        ids.push(generator.generateUniqueId('CLEAR'));
      }

      // All IDs should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});

describe('barcodeGenerator singleton', () => {
  it('exports the singleton instance', () => {
    expect(barcodeGenerator).toBeInstanceOf(BarcodeGenerator);
    expect(barcodeGenerator).toBe(BarcodeGenerator.getInstance());
  });
});
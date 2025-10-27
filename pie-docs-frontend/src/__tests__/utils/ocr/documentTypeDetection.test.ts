import { describe, it, expect } from 'vitest';
import {
  isDocumentOCRCompatible,
  getOptimalOCRSettings
} from '@/utils/ocr/documentTypeDetection';
import type { DocumentType } from '@/types/domain/Document';

describe('Document Type Detection for OCR', () => {
  describe('OCR Compatibility Detection (AC1: Automatic OCR)', () => {
    it('should detect PDF documents as OCR compatible', () => {
      const result = isDocumentOCRCompatible('pdf', 'application/pdf', 'document.pdf');

      expect(result.isCompatible).toBe(true);
      expect(result.confidence).toBeGreaterThan(90);
      expect(result.recommendedSettings?.languageDetection).toBe(true);
    });

    it('should detect image documents as OCR compatible', () => {
      const imageTypes: Array<{ type: DocumentType; mime: string; filename: string }> = [
        { type: 'image', mime: 'image/jpeg', filename: 'scan.jpg' },
        { type: 'image', mime: 'image/png', filename: 'screenshot.png' },
        { type: 'image', mime: 'image/tiff', filename: 'scan.tiff' },
        { type: 'image', mime: 'image/bmp', filename: 'scan.bmp' },
      ];

      imageTypes.forEach(({ type, mime, filename }) => {
        const result = isDocumentOCRCompatible(type, mime, filename);
        expect(result.isCompatible).toBe(true);
        expect(result.confidence).toBeGreaterThan(85);
        expect(result.recommendedSettings?.imagePreprocessing).toBe(true);
      });
    });

    it('should detect incompatible document types', () => {
      const incompatibleTypes: Array<{ type: DocumentType; mime?: string; filename: string }> = [
        { type: 'text', mime: 'text/plain', filename: 'document.txt' },
        { type: 'spreadsheet', mime: 'application/vnd.ms-excel', filename: 'data.xlsx' },
        { type: 'presentation', mime: 'application/vnd.ms-powerpoint', filename: 'slides.pptx' },
        { type: 'video', mime: 'video/mp4', filename: 'video.mp4' },
        { type: 'audio', mime: 'audio/mp3', filename: 'audio.mp3' },
      ];

      incompatibleTypes.forEach(({ type, mime, filename }) => {
        const result = isDocumentOCRCompatible(type, mime, filename);
        expect(result.isCompatible).toBe(false);
        expect(result.confidence).toBeLessThan(50);
        expect(result.reasons).toContain('Document type not supported for OCR');
      });
    });

    it('should handle unknown file extensions gracefully', () => {
      const result = isDocumentOCRCompatible('other', undefined, 'unknown.xyz');

      expect(result.isCompatible).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.reasons).toContain('Unknown or unsupported file extension');
    });

    it('should validate by MIME type when document type is ambiguous', () => {
      // Test MIME type validation for supported formats
      const supportedMimes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/tiff',
        'image/bmp',
        'image/gif',
        'image/webp'
      ];

      supportedMimes.forEach(mime => {
        const result = isDocumentOCRCompatible('other', mime, 'file.unknown');
        expect(result.isCompatible).toBe(true);
      });

      // Test unsupported MIME types
      const unsupportedMimes = [
        'text/plain',
        'application/json',
        'video/mp4',
        'audio/mp3'
      ];

      unsupportedMimes.forEach(mime => {
        const result = isDocumentOCRCompatible('other', mime, 'file.unknown');
        expect(result.isCompatible).toBe(false);
      });
    });

    it('should validate by file extension when MIME type is unavailable', () => {
      const supportedExtensions = [
        '.pdf',
        '.jpg', '.jpeg',
        '.png',
        '.tiff', '.tif',
        '.bmp',
        '.gif',
        '.webp'
      ];

      supportedExtensions.forEach(ext => {
        const result = isDocumentOCRCompatible('other', undefined, `document${ext}`);
        expect(result.isCompatible).toBe(true);
      });

      const unsupportedExtensions = [
        '.txt',
        '.doc', '.docx',
        '.xls', '.xlsx',
        '.mp4',
        '.mp3'
      ];

      unsupportedExtensions.forEach(ext => {
        const result = isDocumentOCRCompatible('other', undefined, `document${ext}`);
        expect(result.isCompatible).toBe(false);
      });
    });
  });

  describe('Optimal OCR Settings Generation', () => {
    it('should generate optimal settings for PDF documents', () => {
      const settings = getOptimalOCRSettings('pdf', 'application/pdf', 'document.pdf');

      expect(settings).toEqual(
        expect.objectContaining({
          imagePreprocessing: expect.objectContaining({
            enhanceContrast: false, // PDFs usually have good contrast
            denoiseImage: true,
            deskewImage: true,
            resolutionDPI: 300
          }),
          textProcessing: expect.objectContaining({
            preserveFormatting: true,
            extractTables: true,
            extractHeaders: true
          })
        })
      );
    });

    it('should generate optimal settings for scanned images', () => {
      const settings = getOptimalOCRSettings('image', 'image/jpeg', 'scan.jpg');

      expect(settings).toEqual(
        expect.objectContaining({
          imagePreprocessing: expect.objectContaining({
            enhanceContrast: true, // Scanned images may need contrast enhancement
            denoiseImage: true,
            deskewImage: true,
            resolutionDPI: 400 // Higher resolution for images
          }),
          textProcessing: expect.objectContaining({
            preserveFormatting: false, // Images might not have structured formatting
            extractTables: false,
            extractHeaders: false
          })
        })
      );
    });

    it('should return null for incompatible document types', () => {
      const settings = getOptimalOCRSettings('text', 'text/plain', 'document.txt');
      expect(settings).toBeNull();
    });

    it('should adjust settings based on file size hints', () => {
      // Large files might need different settings
      const settingsLarge = getOptimalOCRSettings('pdf', 'application/pdf', 'large-document.pdf');
      const settingsSmall = getOptimalOCRSettings('pdf', 'application/pdf', 'small-document.pdf');

      // Both should be valid but might have different optimization parameters
      expect(settingsLarge).toBeTruthy();
      expect(settingsSmall).toBeTruthy();
    });
  });

  describe('File Extension Analysis', () => {
    it('should correctly extract and analyze file extensions', () => {
      const testCases = [
        { filename: 'document.PDF', expected: '.pdf' }, // Case insensitive
        { filename: 'scan.JPEG', expected: '.jpeg' },
        { filename: 'image.Png', expected: '.png' },
        { filename: 'file.with.multiple.dots.pdf', expected: '.pdf' },
        { filename: 'no-extension', expected: null },
        { filename: '', expected: null },
      ];

      testCases.forEach(({ filename, expected }) => {
        const result = isDocumentOCRCompatible('other', undefined, filename);

        if (expected && ['.pdf', '.jpeg', '.png'].includes(expected)) {
          expect(result.isCompatible).toBe(true);
        } else {
          expect(result.isCompatible).toBe(false);
        }
      });
    });
  });

  describe('Quality Assessment Integration', () => {
    it('should provide quality recommendations for different document types', () => {
      const pdfResult = isDocumentOCRCompatible('pdf', 'application/pdf', 'document.pdf');
      expect(pdfResult.recommendedSettings?.languageDetection).toBe(true);

      const imageResult = isDocumentOCRCompatible('image', 'image/jpeg', 'scan.jpg');
      expect(imageResult.recommendedSettings?.imagePreprocessing).toBe(true);
    });

    it('should indicate confidence levels appropriately', () => {
      // High confidence for well-supported formats
      const pdfResult = isDocumentOCRCompatible('pdf', 'application/pdf', 'document.pdf');
      expect(pdfResult.confidence).toBeGreaterThan(90);

      // Medium confidence for images (quality can vary)
      const imageResult = isDocumentOCRCompatible('image', 'image/jpeg', 'scan.jpg');
      expect(imageResult.confidence).toBeGreaterThan(80);
      expect(imageResult.confidence).toBeLessThan(95);

      // Zero confidence for unsupported types
      const textResult = isDocumentOCRCompatible('text', 'text/plain', 'document.txt');
      expect(textResult.confidence).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined inputs gracefully', () => {
      const result1 = isDocumentOCRCompatible('pdf', undefined, undefined);
      expect(result1.isCompatible).toBe(true); // PDF type is supported regardless

      const result2 = isDocumentOCRCompatible('other', undefined, undefined);
      expect(result2.isCompatible).toBe(false);
      expect(result2.reasons).toContain('No filename or MIME type provided');
    });

    it('should handle malformed file names', () => {
      const malformedNames = [
        '.',
        '..',
        '...',
        '.pdf', // Just extension
        'file.', // Trailing dot
      ];

      malformedNames.forEach(filename => {
        const result = isDocumentOCRCompatible('other', undefined, filename);
        // Should handle gracefully without throwing
        expect(typeof result.isCompatible).toBe('boolean');
        expect(Array.isArray(result.reasons)).toBe(true);
      });
    });

    it('should provide meaningful error messages for unsupported types', () => {
      const result = isDocumentOCRCompatible('video', 'video/mp4', 'movie.mp4');

      expect(result.isCompatible).toBe(false);
      expect(result.reasons).toContain('Document type not supported for OCR');
      expect(result.reasons).toContain('MIME type not supported for OCR');
      expect(result.reasons).toContain('File extension not supported for OCR');
    });
  });
});
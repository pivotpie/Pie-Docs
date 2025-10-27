import { describe, it, expect } from 'vitest';
import { validateFileNameSecurity, isDocumentOCRCompatible } from '@/utils/ocr/documentTypeDetection';

describe('OCR Security Validation (SEC-001)', () => {
  describe('File Name Security Validation', () => {
    it('should block files with malicious extensions', () => {
      const maliciousFiles = [
        'document.exe',
        'report.bat',
        'script.cmd',
        'virus.scr',
        'malware.vbs',
        'trojan.js',
        'backdoor.jar'
      ];

      maliciousFiles.forEach(fileName => {
        const result = validateFileNameSecurity(fileName);
        expect(result.isBlocked).toBe(true);
        expect(result.warnings).toContain(
          expect.stringContaining('is not allowed for security reasons')
        );
      });
    });

    it('should block files with double extensions (masquerading)', () => {
      const masqueradingFiles = [
        'document.pdf.exe',
        'image.jpg.bat',
        'report.txt.scr',
        'scan.png.js'
      ];

      masqueradingFiles.forEach(fileName => {
        const result = validateFileNameSecurity(fileName);
        expect(result.isBlocked).toBe(true);
        expect(result.warnings).toContain('File appears to be masquerading with double extension');
      });
    });

    it('should block files with directory traversal patterns', () => {
      const traversalFiles = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\file.pdf',
        'document../file.pdf',
        'file..pdf'
      ];

      traversalFiles.forEach(fileName => {
        const result = validateFileNameSecurity(fileName);
        expect(result.isBlocked).toBe(true);
        expect(result.warnings).toContain(
          'Filename contains suspicious patterns that could pose security risks'
        );
      });
    });

    it('should block files with invalid filename characters', () => {
      const invalidFiles = [
        'document<script>.pdf',
        'file>redirect.pdf',
        'pipe|command.pdf',
        'quote"file.pdf',
        'colon:file.pdf',
        'question?file.pdf',
        'asterisk*file.pdf'
      ];

      invalidFiles.forEach(fileName => {
        const result = validateFileNameSecurity(fileName);
        expect(result.isBlocked).toBe(true);
        expect(result.warnings).toContain(
          'Filename contains suspicious patterns that could pose security risks'
        );
      });
    });

    it('should block reserved Windows filenames', () => {
      const reservedNames = [
        'CON.pdf',
        'PRN.jpg',
        'AUX.png',
        'NUL.pdf',
        'COM1.jpg',
        'COM9.pdf',
        'LPT1.png',
        'LPT9.pdf'
      ];

      reservedNames.forEach(fileName => {
        const result = validateFileNameSecurity(fileName);
        expect(result.isBlocked).toBe(true);
        expect(result.warnings).toContain(
          'Filename contains suspicious patterns that could pose security risks'
        );
      });
    });

    it('should block files with excessive filename length', () => {
      const longFileName = 'a'.repeat(300) + '.pdf';

      const result = validateFileNameSecurity(longFileName);
      expect(result.isBlocked).toBe(true);
      expect(result.warnings).toContain(
        'Filename exceeds maximum length of 255 characters'
      );
    });

    it('should block files with null bytes', () => {
      const nullByteFile = 'document\0.pdf';

      const result = validateFileNameSecurity(nullByteFile);
      expect(result.isBlocked).toBe(true);
      expect(result.warnings).toContain('Filename contains null bytes');
    });

    it('should block files with excessive consecutive dots', () => {
      const excessiveDotsFiles = [
        'document....pdf',
        'file.......jpg',
        'scan...png'
      ];

      excessiveDotsFiles.forEach(fileName => {
        const result = validateFileNameSecurity(fileName);
        expect(result.isBlocked).toBe(true);
        expect(result.warnings).toContain('Filename contains excessive consecutive dots');
      });
    });

    it('should block files with trailing whitespace', () => {
      const trailingWhitespaceFiles = [
        'document.pdf ',
        'image.jpg\t',
        'scan.png   '
      ];

      trailingWhitespaceFiles.forEach(fileName => {
        const result = validateFileNameSecurity(fileName);
        expect(result.isBlocked).toBe(true);
        expect(result.warnings).toContain(
          'Filename contains suspicious patterns that could pose security risks'
        );
      });
    });

    it('should allow safe document files', () => {
      const safeFiles = [
        'document.pdf',
        'scan.jpg',
        'image.png',
        'report.tiff',
        'photo.bmp',
        'graphic.gif',
        'web-image.webp',
        'multi-word-document.pdf',
        'document_with_underscores.jpg',
        'document-with-hyphens.png'
      ];

      safeFiles.forEach(fileName => {
        const result = validateFileNameSecurity(fileName);
        expect(result.isBlocked).toBe(false);
        expect(result.warnings).toHaveLength(0);
      });
    });
  });

  describe('OCR Compatibility with Security Checks', () => {
    it('should block OCR processing for malicious files', () => {
      const maliciousFile = 'document.pdf.exe';

      const result = isDocumentOCRCompatible('pdf', 'application/pdf', maliciousFile);

      expect(result.isCompatible).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.reasons).toContain('File blocked due to security concerns');
      expect(result.securityWarnings).toContain('File appears to be masquerading with double extension');
    });

    it('should allow OCR processing for safe files with security warnings cleared', () => {
      const safeFile = 'legitimate-document.pdf';

      const result = isDocumentOCRCompatible('pdf', 'application/pdf', safeFile);

      expect(result.isCompatible).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.securityWarnings).toBeUndefined();
    });

    it('should handle compressed files appropriately', () => {
      const compressedFiles = [
        'documents.zip',
        'archive.rar',
        'backup.7z',
        'files.tar.gz'
      ];

      compressedFiles.forEach(fileName => {
        const result = isDocumentOCRCompatible('other', undefined, fileName);
        expect(result.isCompatible).toBe(false);
        expect(result.reasons).toContain('File blocked due to security concerns');
      });
    });

    it('should provide detailed security warnings for suspicious files', () => {
      const suspiciousFile = '../../../malicious.pdf.exe';

      const result = isDocumentOCRCompatible('pdf', 'application/pdf', suspiciousFile);

      expect(result.isCompatible).toBe(false);
      expect(result.securityWarnings).toBeDefined();
      expect(result.securityWarnings!.length).toBeGreaterThan(0);
      expect(result.securityWarnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('suspicious patterns'),
          expect.stringContaining('masquerading with double extension')
        ])
      );
    });
  });

  describe('MIME Type Security Validation', () => {
    it('should validate MIME types against filename extensions', () => {
      // Test cases where MIME type doesn't match extension
      const mismatchedFiles = [
        { filename: 'document.pdf', mimeType: 'application/x-executable' },
        { filename: 'image.jpg', mimeType: 'application/octet-stream' },
        { filename: 'scan.png', mimeType: 'text/html' }
      ];

      mismatchedFiles.forEach(({ filename, mimeType }) => {
        const result = isDocumentOCRCompatible('other', mimeType, filename);

        // Should still work if individual components are valid, but may have lower confidence
        if (result.isCompatible) {
          expect(result.confidence).toBeLessThan(0.9); // Lower confidence due to mismatch
        }
      });
    });

    it('should handle missing MIME type gracefully', () => {
      const result = isDocumentOCRCompatible('pdf', undefined, 'document.pdf');
      expect(result.isCompatible).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle missing filename gracefully', () => {
      const result = isDocumentOCRCompatible('pdf', 'application/pdf', undefined);
      expect(result.isCompatible).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle empty filename', () => {
      const result = validateFileNameSecurity('');
      expect(result.isBlocked).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle filename with only extension', () => {
      const result = validateFileNameSecurity('.pdf');
      expect(result.isBlocked).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle filename without extension', () => {
      const result = validateFileNameSecurity('document');
      expect(result.isBlocked).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle Unicode filenames', () => {
      const unicodeFiles = [
        'документ.pdf', // Cyrillic
        '文档.pdf',     // Chinese
        'مستند.pdf',    // Arabic
        'דוקומנט.pdf'   // Hebrew
      ];

      unicodeFiles.forEach(fileName => {
        const result = validateFileNameSecurity(fileName);
        expect(result.isBlocked).toBe(false);
        expect(result.warnings).toHaveLength(0);
      });
    });

    it('should handle mixed case extensions consistently', () => {
      const mixedCaseFiles = [
        'document.PDF',
        'image.JPG',
        'scan.PnG',
        'file.TiFf'
      ];

      mixedCaseFiles.forEach(fileName => {
        const result = isDocumentOCRCompatible('other', undefined, fileName);
        expect(result.isCompatible).toBe(true);
      });
    });
  });

  describe('Performance and DoS Protection', () => {
    it('should handle extremely long filenames efficiently', () => {
      const longFileName = 'a'.repeat(1000) + '.pdf';

      const startTime = Date.now();
      const result = validateFileNameSecurity(longFileName);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
      expect(result.isBlocked).toBe(true);
    });

    it('should handle complex regex patterns efficiently', () => {
      const complexFileName = '../'.repeat(100) + 'document.pdf';

      const startTime = Date.now();
      const result = validateFileNameSecurity(complexFileName);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(50); // Should complete quickly
      expect(result.isBlocked).toBe(true);
    });

    it('should handle many dots efficiently', () => {
      const dotsFileName = '.'.repeat(500) + 'pdf';

      const startTime = Date.now();
      const result = validateFileNameSecurity(dotsFileName);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(50); // Should complete quickly
      expect(result.isBlocked).toBe(true);
    });
  });
});
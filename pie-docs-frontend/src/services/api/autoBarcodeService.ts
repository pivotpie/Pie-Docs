import { barcodeGenerator } from '@/utils/barcodeGenerator';

export interface AutoBarcodeResult {
  success: boolean;
  barcode?: {
    id: string;
    code: string;
    format_name: string;
    format_id: string;
  };
  error?: string;
}

export class AutoBarcodeService {
  private static instance: AutoBarcodeService;
  private defaultFormatId: string | null = null;
  private barcodeFormats: any[] = [];

  static getInstance(): AutoBarcodeService {
    if (!AutoBarcodeService.instance) {
      AutoBarcodeService.instance = new AutoBarcodeService();
    }
    return AutoBarcodeService.instance;
  }

  /**
   * Initialize service by loading barcode formats
   */
  async initialize(): Promise<void> {
    try {
      const response = await fetch('http://localhost:8001/api/v1/physical/barcodes/formats');
      if (response.ok) {
        this.barcodeFormats = await response.json();
        // Default to CODE128 for document tracking if available
        const code128Format = this.barcodeFormats.find(f => f.name === 'CODE128');
        this.defaultFormatId = code128Format?.id || this.barcodeFormats[0]?.id || null;
      }
    } catch (error) {
      console.error('Failed to load barcode formats:', error);
    }
  }

  /**
   * Generate a unique barcode code for a document
   */
  generateBarcodeCode(fileName: string, documentType?: string): string {
    // Create prefix based on document type or use generic DOC
    let prefix = 'DOC';

    if (documentType) {
      // Extract abbreviation from document type (e.g., "Invoice" -> "INV")
      const words = documentType.split(/[\s-_]+/);
      prefix = words
        .map(w => w.substring(0, 3))
        .join('')
        .toUpperCase()
        .substring(0, 6);
    }

    // Use barcode generator utility
    return barcodeGenerator.generateUniqueId(prefix, '');
  }

  /**
   * Create a new barcode record in the backend
   */
  async createBarcodeRecord(code: string, formatId?: string): Promise<AutoBarcodeResult> {
    try {
      const selectedFormatId = formatId || this.defaultFormatId;

      if (!selectedFormatId) {
        return {
          success: false,
          error: 'No barcode format available. Please configure barcode formats first.'
        };
      }

      const response = await fetch('http://localhost:8001/api/v1/physical/barcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          format_id: selectedFormatId,
          metadata: {
            auto_generated: true,
            generated_at: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        const barcode = await response.json();
        const format = this.barcodeFormats.find(f => f.id === selectedFormatId);

        return {
          success: true,
          barcode: {
            id: barcode.id,
            code: barcode.code,
            format_name: format?.name || 'CODE128',
            format_id: selectedFormatId
          }
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.detail || 'Failed to create barcode'
        };
      }
    } catch (error) {
      console.error('Auto barcode creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate and create a barcode for a document file
   */
  async generateAndCreateBarcode(
    fileName: string,
    documentType?: string,
    formatId?: string
  ): Promise<AutoBarcodeResult> {
    // Ensure formats are loaded
    if (this.barcodeFormats.length === 0) {
      await this.initialize();
    }

    // Generate unique code
    const code = this.generateBarcodeCode(fileName, documentType);

    // Create barcode record
    return await this.createBarcodeRecord(code, formatId);
  }

  /**
   * Batch generate barcodes for multiple files
   */
  async generateBatch(
    files: Array<{ fileName: string; documentType?: string }>,
    formatId?: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<AutoBarcodeResult[]> {
    const results: AutoBarcodeResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await this.generateAndCreateBarcode(
        file.fileName,
        file.documentType,
        formatId
      );

      results.push(result);

      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    }

    return results;
  }

  /**
   * Get available barcode formats
   */
  getFormats(): any[] {
    return this.barcodeFormats;
  }

  /**
   * Get default format ID
   */
  getDefaultFormatId(): string | null {
    return this.defaultFormatId;
  }
}

// Export singleton instance
export const autoBarcodeService = AutoBarcodeService.getInstance();

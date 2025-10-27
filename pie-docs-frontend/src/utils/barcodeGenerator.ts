import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

export interface BarcodeGenerationOptions {
  format: 'CODE128' | 'CODE39' | 'CODE93' | 'EAN13' | 'EAN8' | 'UPC' | 'UPCE' | 'ITF' | 'ITF14' | 'MSI' | 'pharmacode' | 'codabar' | 'QR' | 'DATAMATRIX';
  prefix?: string;
  suffix?: string;
  includeChecksum?: boolean;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  textPosition?: 'bottom' | 'top';
  textMargin?: number;
  backgroundColor?: string;
  lineColor?: string;
}

export interface QRCodeMetadata {
  documentId: string;
  documentType: string;
  createdDate: string;
  location?: string;
  checksum: string;
  version: string;
}

export class BarcodeGenerator {
  private static instance: BarcodeGenerator;
  private generatedCodes: Set<string> = new Set();

  static getInstance(): BarcodeGenerator {
    if (!BarcodeGenerator.instance) {
      BarcodeGenerator.instance = new BarcodeGenerator();
    }
    return BarcodeGenerator.instance;
  }

  /**
   * Generate a unique barcode ID using timestamp and random components
   */
  generateUniqueId(prefix: string = 'DOC', suffix: string = ''): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const baseId = `${prefix}${timestamp}${random}${suffix}`;

    // Ensure uniqueness
    let uniqueId = baseId;
    let counter = 1;

    while (this.generatedCodes.has(uniqueId)) {
      uniqueId = `${baseId}${counter.toString().padStart(2, '0')}`;
      counter++;
    }

    this.generatedCodes.add(uniqueId);
    return uniqueId;
  }

  /**
   * Generate checksum for barcode validation
   */
  generateChecksum(data: string): string {
    let checksum = 0;
    for (let i = 0; i < data.length; i++) {
      checksum += data.charCodeAt(i) * (i + 1);
    }
    return (checksum % 97).toString().padStart(2, '0');
  }

  /**
   * Calculate EAN-13 check digit
   */
  calculateEAN13CheckDigit(code: string): string {
    if (code.length !== 12) {
      throw new Error('EAN-13 code must be 12 digits');
    }

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
  }

  /**
   * Calculate EAN-8 check digit
   */
  calculateEAN8CheckDigit(code: string): string {
    if (code.length !== 7) {
      throw new Error('EAN-8 code must be 7 digits');
    }

    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const digit = parseInt(code[i]);
      sum += i % 2 === 0 ? digit * 3 : digit;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
  }

  /**
   * Calculate UPC-A check digit
   */
  calculateUPCCheckDigit(code: string): string {
    if (code.length !== 11) {
      throw new Error('UPC-A code must be 11 digits');
    }

    let sum = 0;
    for (let i = 0; i < 11; i++) {
      const digit = parseInt(code[i]);
      sum += i % 2 === 0 ? digit * 3 : digit;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
  }

  /**
   * Generate valid EAN-13 code with check digit
   */
  generateEAN13(productCode: string): string {
    // Pad or truncate to 12 digits
    const normalizedCode = productCode.padStart(12, '0').substring(0, 12);
    const checkDigit = this.calculateEAN13CheckDigit(normalizedCode);
    return normalizedCode + checkDigit;
  }

  /**
   * Generate valid EAN-8 code with check digit
   */
  generateEAN8(productCode: string): string {
    // Pad or truncate to 7 digits
    const normalizedCode = productCode.padStart(7, '0').substring(0, 7);
    const checkDigit = this.calculateEAN8CheckDigit(normalizedCode);
    return normalizedCode + checkDigit;
  }

  /**
   * Generate valid UPC-A code with check digit
   */
  generateUPC(productCode: string): string {
    // Pad or truncate to 11 digits
    const normalizedCode = productCode.padStart(11, '0').substring(0, 11);
    const checkDigit = this.calculateUPCCheckDigit(normalizedCode);
    return normalizedCode + checkDigit;
  }

  /**
   * Get barcode format metadata and specifications
   */
  getBarcodeFormatInfo(format: string): {
    name: string;
    type: 'linear' | '2d';
    category: 'retail' | 'industrial' | 'pharmaceutical' | 'postal' | 'document';
    description: string;
    useCases: string[];
    maxLength?: number;
    charset?: string;
    hasCheckDigit: boolean;
  } {
    const formats = {
      'CODE128': {
        name: 'Code 128',
        type: 'linear' as const,
        category: 'industrial' as const,
        description: 'High-density linear barcode supporting full ASCII character set',
        useCases: ['Supply chain', 'Inventory management', 'Document tracking'],
        maxLength: 80,
        charset: 'Full ASCII (0-127)',
        hasCheckDigit: true,
      },
      'CODE39': {
        name: 'Code 39',
        type: 'linear' as const,
        category: 'industrial' as const,
        description: 'Self-checking barcode supporting alphanumeric characters',
        useCases: ['Asset tracking', 'Inventory', 'ID cards'],
        maxLength: 43,
        charset: '0-9, A-Z, -, ., space, $, /, +, %',
        hasCheckDigit: false,
      },
      'CODE93': {
        name: 'Code 93',
        type: 'linear' as const,
        category: 'industrial' as const,
        description: 'Compact barcode with better density than Code 39',
        useCases: ['Postal services', 'Inventory', 'Asset tracking'],
        maxLength: 47,
        charset: '0-9, A-Z, -, ., space, $, /, +, %',
        hasCheckDigit: true,
      },
      'EAN13': {
        name: 'EAN-13',
        type: 'linear' as const,
        category: 'retail' as const,
        description: 'European Article Number for retail products',
        useCases: ['Retail products', 'Point of sale', 'Inventory'],
        maxLength: 13,
        charset: 'Numeric (0-9)',
        hasCheckDigit: true,
      },
      'EAN8': {
        name: 'EAN-8',
        type: 'linear' as const,
        category: 'retail' as const,
        description: 'Shortened version of EAN-13 for small products',
        useCases: ['Small retail products', 'Cosmetics', 'Pharmaceuticals'],
        maxLength: 8,
        charset: 'Numeric (0-9)',
        hasCheckDigit: true,
      },
      'UPC': {
        name: 'UPC-A',
        type: 'linear' as const,
        category: 'retail' as const,
        description: 'Universal Product Code for North American retail',
        useCases: ['Retail products', 'Grocery stores', 'Point of sale'],
        maxLength: 12,
        charset: 'Numeric (0-9)',
        hasCheckDigit: true,
      },
      'UPCE': {
        name: 'UPC-E',
        type: 'linear' as const,
        category: 'retail' as const,
        description: 'Compressed version of UPC-A for small products',
        useCases: ['Small retail products', 'Coupons', 'Magazines'],
        maxLength: 8,
        charset: 'Numeric (0-9)',
        hasCheckDigit: true,
      },
      'ITF': {
        name: 'ITF (Interleaved 2 of 5)',
        type: 'linear' as const,
        category: 'industrial' as const,
        description: 'Numeric-only barcode for cartons and cases',
        useCases: ['Shipping cartons', 'Distribution', 'Warehousing'],
        maxLength: 30,
        charset: 'Numeric (0-9), even length',
        hasCheckDigit: false,
      },
      'ITF14': {
        name: 'ITF-14',
        type: 'linear' as const,
        category: 'industrial' as const,
        description: 'ITF barcode for trade items (GTIN-14)',
        useCases: ['Shipping containers', 'Cases', 'Pallets'],
        maxLength: 14,
        charset: 'Numeric (0-9)',
        hasCheckDigit: true,
      },
      'MSI': {
        name: 'MSI Plessey',
        type: 'linear' as const,
        category: 'industrial' as const,
        description: 'Numeric barcode for inventory and marking',
        useCases: ['Inventory control', 'Warehouse marking', 'Libraries'],
        maxLength: 55,
        charset: 'Numeric (0-9)',
        hasCheckDigit: true,
      },
      'pharmacode': {
        name: 'Pharmacode',
        type: 'linear' as const,
        category: 'pharmaceutical' as const,
        description: 'Pharmaceutical industry barcode for drug packaging',
        useCases: ['Pharmaceutical packaging', 'Drug identification', 'Healthcare'],
        maxLength: 6,
        charset: 'Numeric (3-131070)',
        hasCheckDigit: false,
      },
      'codabar': {
        name: 'Codabar',
        type: 'linear' as const,
        category: 'industrial' as const,
        description: 'Self-checking barcode for libraries and blood banks',
        useCases: ['Libraries', 'Blood banks', 'Photo labs', 'FedEx airbills'],
        maxLength: 60,
        charset: '0-9, -, $, :, ., /, +, start/stop chars A-D',
        hasCheckDigit: false,
      },
      'QR': {
        name: 'QR Code',
        type: '2d' as const,
        category: 'document' as const,
        description: '2D matrix barcode with high data capacity and error correction',
        useCases: ['URLs', 'Contact info', 'WiFi credentials', 'Document metadata'],
        maxLength: 4296,
        charset: 'Full Unicode support',
        hasCheckDigit: true,
      },
      'DATAMATRIX': {
        name: 'Data Matrix',
        type: '2d' as const,
        category: 'industrial' as const,
        description: '2D matrix barcode for small items and direct marking',
        useCases: ['Electronics', 'Aerospace', 'Medical devices', 'Small parts'],
        maxLength: 3116,
        charset: 'Full ASCII + extended',
        hasCheckDigit: true,
      },
    };

    return formats[format as keyof typeof formats] || {
      name: 'Unknown',
      type: 'linear' as const,
      category: 'industrial' as const,
      description: 'Unknown barcode format',
      useCases: [],
      charset: 'Unknown',
      hasCheckDigit: false,
    };
  }

  /**
   * Validate barcode format and content
   */
  validateBarcodeFormat(code: string, format: string): boolean {
    switch (format) {
      case 'CODE128':
        return /^[\x20-\x7E]*$/.test(code) && code.length <= 80;
      case 'CODE39':
        return /^[0-9A-Z\-. $/+%]*$/.test(code) && code.length <= 43;
      case 'CODE93':
        return /^[0-9A-Z\-. $/+%]*$/.test(code) && code.length <= 47;
      case 'EAN13':
        return /^[0-9]{12,13}$/.test(code);
      case 'EAN8':
        return /^[0-9]{7,8}$/.test(code);
      case 'UPC':
        return /^[0-9]{11,12}$/.test(code);
      case 'UPCE':
        return /^[0-9]{6,8}$/.test(code);
      case 'ITF':
        return /^[0-9]*$/.test(code) && code.length % 2 === 0 && code.length <= 30;
      case 'ITF14':
        return /^[0-9]{13,14}$/.test(code);
      case 'MSI':
        return /^[0-9]*$/.test(code) && code.length <= 55;
      case 'pharmacode':
        return /^[0-9]*$/.test(code) && parseInt(code) >= 3 && parseInt(code) <= 131070;
      case 'codabar':
        return /^[A-D][0-9\-$:./+]*[A-D]$/.test(code) && code.length <= 60;
      case 'QR':
        return code.length <= 4296; // Maximum QR code capacity
      case 'DATAMATRIX':
        return code.length <= 3116; // Maximum Data Matrix capacity
      default:
        return false;
    }
  }

  /**
   * Generate barcode image as base64 data URL
   */
  async generateBarcodeImage(
    code: string,
    options: BarcodeGenerationOptions
  ): Promise<string> {
    if (!this.validateBarcodeFormat(code, options.format)) {
      throw new Error(`Invalid code for format ${options.format}`);
    }

    if (options.format === 'QR') {
      return this.generateQRCode(code, options);
    } else {
      return this.generateLinearBarcode(code, options);
    }
  }

  /**
   * Generate QR code with embedded metadata
   */
  async generateQRCodeWithMetadata(metadata: QRCodeMetadata): Promise<string> {
    const jsonData = JSON.stringify(metadata);
    return QRCode.toDataURL(jsonData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      width: 256,
    });
  }

  /**
   * Decode QR code metadata
   */
  decodeQRMetadata(qrData: string): QRCodeMetadata | null {
    try {
      return JSON.parse(qrData) as QRCodeMetadata;
    } catch {
      return null;
    }
  }

  /**
   * Generate linear barcode (CODE128, CODE39)
   */
  private generateLinearBarcode(
    code: string,
    options: BarcodeGenerationOptions
  ): string {
    const canvas = document.createElement('canvas');

    try {
      JsBarcode(canvas, code, {
        format: options.format,
        width: options.width || 2,
        height: options.height || 50,
        displayValue: options.displayValue ?? true,
        fontSize: options.fontSize || 14,
        textAlign: options.textAlign || 'center',
        textPosition: options.textPosition || 'bottom',
        textMargin: options.textMargin || 2,
        background: options.backgroundColor || '#ffffff',
        lineColor: options.lineColor || '#000000',
      });

      return canvas.toDataURL('image/png');
    } catch (error) {
      throw new Error(`Failed to generate barcode: ${error}`);
    }
  }

  /**
   * Generate QR code
   */
  private async generateQRCode(
    code: string,
    options: BarcodeGenerationOptions
  ): Promise<string> {
    try {
      return await QRCode.toDataURL(code, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: options.lineColor || '#000000',
          light: options.backgroundColor || '#ffffff',
        },
        width: options.width || 256,
      });
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error}`);
    }
  }

  /**
   * Batch generate barcodes
   */
  async generateBatch(
    count: number,
    options: BarcodeGenerationOptions,
    onProgress?: (progress: number) => void
  ): Promise<Array<{ code: string; image: string }>> {
    const barcodes: Array<{ code: string; image: string }> = [];

    for (let i = 0; i < count; i++) {
      const code = this.generateUniqueId(options.prefix, options.suffix);
      const image = await this.generateBarcodeImage(code, options);

      barcodes.push({ code, image });

      if (onProgress) {
        onProgress((i + 1) / count * 100);
      }
    }

    return barcodes;
  }

  /**
   * Regenerate corrupted barcode
   */
  async regenerateBarcode(
    originalCode: string,
    options: BarcodeGenerationOptions
  ): Promise<{ code: string; image: string }> {
    // Mark original as corrupted and remove from generated set
    this.generatedCodes.delete(originalCode);

    // Generate new code with similar pattern
    const newCode = this.generateUniqueId(options.prefix, options.suffix);
    const image = await this.generateBarcodeImage(newCode, options);

    return { code: newCode, image };
  }

  /**
   * Validate barcode integrity
   */
  validateBarcodeIntegrity(code: string, expectedChecksum?: string): boolean {
    if (expectedChecksum) {
      const calculatedChecksum = this.generateChecksum(code);
      return calculatedChecksum === expectedChecksum;
    }
    return true; // If no checksum provided, assume valid
  }

  /**
   * Export barcode data for printing
   */
  exportForPrinting(barcodes: Array<{ code: string; image: string }>): {
    svg: string[];
    png: string[];
    pdf: Blob;
  } {
    // This would be implemented with actual export logic
    // For now, return the basic structure
    return {
      svg: barcodes.map(b => b.image), // Convert to SVG format
      png: barcodes.map(b => b.image),
      pdf: new Blob(), // Generate PDF with jsPDF
    };
  }

  /**
   * Generate enhanced QR code with advanced options
   */
  async generateEnhancedQRCode(
    data: string,
    options: {
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
      width?: number;
      margin?: number;
      color?: {
        dark: string;
        light: string;
      };
    } = {}
  ): Promise<string> {
    try {
      return await QRCode.toDataURL(data, {
        errorCorrectionLevel: options.errorCorrectionLevel || 'M',
        type: 'image/png',
        margin: options.margin || 1,
        color: {
          dark: options.color?.dark || '#000000',
          light: options.color?.light || '#ffffff',
        },
        width: options.width || 256,
      });
    } catch (error) {
      throw new Error(`Failed to generate enhanced QR code: ${error}`);
    }
  }

  /**
   * Generate QR code with custom logo/branding
   */
  async generateBrandedQRCode(
    data: string,
    logoUrl: string,
    options: {
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
      width?: number;
      logoSize?: number;
    } = {}
  ): Promise<string> {
    try {
      // Generate base QR code
      const qrCanvas = document.createElement('canvas');
      const qrCtx = qrCanvas.getContext('2d');
      if (!qrCtx) throw new Error('Canvas context not available');

      const qrSize = options.width || 256;
      qrCanvas.width = qrSize;
      qrCanvas.height = qrSize;

      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(data, {
        errorCorrectionLevel: options.errorCorrectionLevel || 'H', // Use high correction for logo overlay
        margin: 1,
        width: qrSize,
      });

      // Load QR code image
      const qrImage = new Image();
      await new Promise((resolve, reject) => {
        qrImage.onload = resolve;
        qrImage.onerror = reject;
        qrImage.src = qrDataUrl;
      });

      // Draw QR code
      qrCtx.drawImage(qrImage, 0, 0, qrSize, qrSize);

      // Load and draw logo
      const logoImage = new Image();
      await new Promise((resolve, reject) => {
        logoImage.onload = resolve;
        logoImage.onerror = reject;
        logoImage.src = logoUrl;
      });

      const logoSize = options.logoSize || Math.floor(qrSize * 0.2);
      const logoX = (qrSize - logoSize) / 2;
      const logoY = (qrSize - logoSize) / 2;

      // Draw white background for logo
      qrCtx.fillStyle = '#ffffff';
      qrCtx.fillRect(logoX - 2, logoY - 2, logoSize + 4, logoSize + 4);

      // Draw logo
      qrCtx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);

      return qrCanvas.toDataURL('image/png');
    } catch (error) {
      throw new Error(`Failed to generate branded QR code: ${error}`);
    }
  }

  /**
   * Validate QR code readability and integrity
   */
  async validateQRCode(data: string): Promise<boolean> {
    try {
      // Try to generate QR code to validate data
      await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'L',
        margin: 0,
        width: 64,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Estimate QR code capacity for different error correction levels
   */
  estimateQRCapacity(errorLevel: 'L' | 'M' | 'Q' | 'H'): {
    numeric: number;
    alphanumeric: number;
    binary: number;
    kanji: number;
  } {
    const capacities = {
      L: { numeric: 7089, alphanumeric: 4296, binary: 2953, kanji: 1817 },
      M: { numeric: 5596, alphanumeric: 3391, binary: 2331, kanji: 1435 },
      Q: { numeric: 3993, alphanumeric: 2420, binary: 1663, kanji: 1024 },
      H: { numeric: 3057, alphanumeric: 1852, binary: 1273, kanji: 784 },
    };
    return capacities[errorLevel];
  }

  /**
   * Analyze QR code data and suggest optimal settings
   */
  analyzeQRData(data: string): {
    dataType: 'numeric' | 'alphanumeric' | 'binary' | 'kanji';
    size: number;
    recommendedErrorLevel: 'L' | 'M' | 'Q' | 'H';
    estimatedVersion: number;
  } {
    const size = data.length;

    // Determine data type
    let dataType: 'numeric' | 'alphanumeric' | 'binary' | 'kanji' = 'binary';
    if (/^[0-9]*$/.test(data)) {
      dataType = 'numeric';
    } else if (/^[0-9A-Z $%*+\-./:]*$/.test(data)) {
      dataType = 'alphanumeric';
    } else if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(data)) {
      dataType = 'kanji';
    }

    // Recommend error correction level based on use case
    let recommendedErrorLevel: 'L' | 'M' | 'Q' | 'H' = 'M';
    if (size < 100) {
      recommendedErrorLevel = 'H'; // Small data, can afford high correction
    } else if (size < 1000) {
      recommendedErrorLevel = 'Q';
    } else if (size < 2000) {
      recommendedErrorLevel = 'M';
    } else {
      recommendedErrorLevel = 'L';
    }

    // Estimate QR version (rough calculation)
    const estimatedVersion = Math.min(40, Math.ceil(size / 100) + 1);

    return {
      dataType,
      size,
      recommendedErrorLevel,
      estimatedVersion,
    };
  }

  /**
   * Generate QR code batch for multiple data entries
   */
  async generateQRBatch(
    dataEntries: string[],
    options: {
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
      width?: number;
      format?: 'png' | 'svg';
    } = {},
    onProgress?: (progress: number) => void
  ): Promise<Array<{ data: string; image: string; analysis: ReturnType<typeof this.analyzeQRData> }>> {
    const results: Array<{ data: string; image: string; analysis: ReturnType<typeof this.analyzeQRData> }> = [];

    for (let i = 0; i < dataEntries.length; i++) {
      const data = dataEntries[i];
      const analysis = this.analyzeQRData(data);

      const image = await this.generateEnhancedQRCode(data, {
        errorCorrectionLevel: options.errorCorrectionLevel || analysis.recommendedErrorLevel,
        width: options.width || 256,
      });

      results.push({ data, image, analysis });

      if (onProgress) {
        onProgress((i + 1) / dataEntries.length * 100);
      }
    }

    return results;
  }

  /**
   * Export QR codes for different use cases
   */
  async exportQRCodes(
    qrCodes: Array<{ data: string; image: string }>,
    format: 'pdf' | 'zip' | 'print'
  ): Promise<Blob> {
    // Use qrCodes parameter for future implementation
    const codeCount = qrCodes.length;

    switch (format) {
      case 'pdf':
        // Would integrate with jsPDF for PDF generation
        return new Blob([`PDF content for ${codeCount} QR codes would go here`], { type: 'application/pdf' });

      case 'zip':
        // Would integrate with JSZip for ZIP generation
        return new Blob([`ZIP content for ${codeCount} QR codes would go here`], { type: 'application/zip' });

      case 'print':
        // Generate print-optimized format
        return new Blob([`Print content for ${codeCount} QR codes would go here`], { type: 'text/html' });

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Clear generated codes cache (for testing or reset)
   */
  clearCache(): void {
    this.generatedCodes.clear();
  }
}

// Export singleton instance
export const barcodeGenerator = BarcodeGenerator.getInstance();
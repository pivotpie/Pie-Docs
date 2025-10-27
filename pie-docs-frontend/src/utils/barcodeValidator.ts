export interface ValidationResult {
  isValid: boolean;
  format: string;
  data: string;
  checksum?: string;
  errors?: string[];
  metadata: {
    length: number;
    encoding: string;
    [key: string]: unknown;
  };
}

export interface BatchValidationResult extends ValidationResult {
  code: string;
}

export class BarcodeValidationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'BarcodeValidationError';
  }
}

export const BARCODE_FORMATS = {
  CODE128: 'CODE128',
  CODE39: 'CODE39',
  EAN13: 'EAN13',
  EAN8: 'EAN8',
  UPC_A: 'UPC_A',
  UPC_E: 'UPC_E',
  QR_CODE: 'QR_CODE',
  DATA_MATRIX: 'DATA_MATRIX',
  PDF417: 'PDF417',
  AZTEC: 'AZTEC',
} as const;

const CODE128_PATTERN = /^[!-~ ]+$/;
const CODE39_PATTERN = /^[A-Z0-9\-.$/+% ]*$/;
const EAN13_PATTERN = /^\d{13}$/;
const EAN8_PATTERN = /^\d{8}$/;
const UPC_A_PATTERN = /^\d{12}$/;
const UPC_E_PATTERN = /^\d{8}$/;

export const validateBarcode = async (
  data: string,
  format: string = 'auto'
): Promise<ValidationResult> => {
  if (!data || data.trim() === '') {
    throw new BarcodeValidationError('Barcode data cannot be empty', 'EMPTY_DATA');
  }

  const trimmedData = data.trim();
  const detectedFormat = format === 'auto' ? detectFormat(trimmedData) : format;

  const result: ValidationResult = {
    isValid: false,
    format: detectedFormat,
    data: trimmedData,
    errors: [],
    metadata: {
      length: trimmedData.length,
      encoding: 'ascii',
    },
  };

  try {
    switch (detectedFormat) {
      case 'CODE128':
        return validateCode128(trimmedData, result);
      case 'CODE39':
        return validateCode39(trimmedData, result);
      case 'EAN13':
        return validateEAN13(trimmedData, result);
      case 'EAN8':
        return validateEAN8(trimmedData, result);
      case 'UPC_A':
        return validateUPC_A(trimmedData, result);
      case 'UPC_E':
        return validateUPC_E(trimmedData, result);
      case 'QR_CODE':
        return validateQRCode(trimmedData, result);
      default:
        result.errors = [`Unsupported or unrecognized format: ${detectedFormat}`];
        return result;
    }
  } catch (error) {
    if (error instanceof BarcodeValidationError) {
      throw error;
    }
    throw new BarcodeValidationError(
      `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'VALIDATION_ERROR'
    );
  }
};

export const validateBatch = async (
  codes: string[],
  format: string = 'auto'
): Promise<BatchValidationResult[]> => {
  const results: BatchValidationResult[] = [];

  for (const code of codes) {
    try {
      const validation = await validateBarcode(code, format);
      results.push({
        code,
        ...validation,
      });
    } catch (error) {
      results.push({
        code,
        isValid: false,
        format: 'unknown',
        data: code,
        errors: [error instanceof Error ? error.message : 'Validation failed'],
        metadata: {
          length: code.length,
          encoding: 'unknown',
        },
      });
    }
  }

  return results;
};

function detectFormat(data: string): string {
  // EAN/UPC checks first (most specific)
  if (EAN13_PATTERN.test(data)) return 'EAN13';
  if (UPC_A_PATTERN.test(data)) return 'UPC_A';
  if (EAN8_PATTERN.test(data) || UPC_E_PATTERN.test(data)) {
    return data.length === 8 ? (data.startsWith('0') ? 'UPC_E' : 'EAN8') : 'EAN8';
  }

  // Code39 (uppercase letters, numbers, and specific symbols)
  if (CODE39_PATTERN.test(data)) return 'CODE39';

  // Code128 (most general, supports all ASCII)
  if (CODE128_PATTERN.test(data)) return 'CODE128';

  // Check if it looks like QR code data (URLs, complex strings, etc.)
  if (data.includes('http') || data.includes('@') || data.includes('\n') || data.length > 100) {
    return 'QR_CODE';
  }

  // Default to CODE128 for most cases
  return 'CODE128';
}

function validateCode128(data: string, result: ValidationResult): ValidationResult {
  if (!CODE128_PATTERN.test(data)) {
    result.errors = ['Invalid characters for CODE128. Must be printable ASCII characters.'];
    return result;
  }

  if (data.length === 0) {
    result.errors = ['CODE128 data cannot be empty'];
    return result;
  }

  if (data.length > 80) {
    result.errors = ['CODE128 data too long (maximum 80 characters)'];
    return result;
  }

  result.isValid = true;
  result.checksum = calculateCode128Checksum(data);
  result.metadata.encoding = 'ascii';

  return result;
}

function validateCode39(data: string, result: ValidationResult): ValidationResult {
  if (!CODE39_PATTERN.test(data)) {
    result.errors = ['Invalid characters for CODE39. Only A-Z, 0-9, and -.$/ +% are allowed.'];
    return result;
  }

  if (data.length === 0) {
    result.errors = ['CODE39 data cannot be empty'];
    return result;
  }

  if (data.length > 43) {
    result.errors = ['CODE39 data too long (maximum 43 characters)'];
    return result;
  }

  result.isValid = true;
  result.checksum = calculateCode39Checksum(data);
  result.metadata.encoding = 'code39';

  return result;
}

function validateEAN13(data: string, result: ValidationResult): ValidationResult {
  if (!EAN13_PATTERN.test(data)) {
    result.errors = ['EAN13 must be exactly 13 digits'];
    return result;
  }

  const checkDigit = parseInt(data[12]);
  const calculatedCheck = calculateEAN13Checksum(data.substring(0, 12));

  if (checkDigit !== calculatedCheck) {
    result.errors = [`Invalid EAN13 checksum. Expected ${calculatedCheck}, got ${checkDigit}`];
    return result;
  }

  result.isValid = true;
  result.checksum = checkDigit.toString();
  result.metadata.encoding = 'ean13';
  result.metadata.countryCode = data.substring(0, 3);

  return result;
}

function validateEAN8(data: string, result: ValidationResult): ValidationResult {
  if (!EAN8_PATTERN.test(data)) {
    result.errors = ['EAN8 must be exactly 8 digits'];
    return result;
  }

  const checkDigit = parseInt(data[7]);
  const calculatedCheck = calculateEAN8Checksum(data.substring(0, 7));

  if (checkDigit !== calculatedCheck) {
    result.errors = [`Invalid EAN8 checksum. Expected ${calculatedCheck}, got ${checkDigit}`];
    return result;
  }

  result.isValid = true;
  result.checksum = checkDigit.toString();
  result.metadata.encoding = 'ean8';

  return result;
}

function validateUPC_A(data: string, result: ValidationResult): ValidationResult {
  if (!UPC_A_PATTERN.test(data)) {
    result.errors = ['UPC-A must be exactly 12 digits'];
    return result;
  }

  const checkDigit = parseInt(data[11]);
  const calculatedCheck = calculateUPCAChecksum(data.substring(0, 11));

  if (checkDigit !== calculatedCheck) {
    result.errors = [`Invalid UPC-A checksum. Expected ${calculatedCheck}, got ${checkDigit}`];
    return result;
  }

  result.isValid = true;
  result.checksum = checkDigit.toString();
  result.metadata.encoding = 'upc_a';

  return result;
}

function validateUPC_E(data: string, result: ValidationResult): ValidationResult {
  if (!UPC_E_PATTERN.test(data)) {
    result.errors = ['UPC-E must be exactly 8 digits'];
    return result;
  }

  const checkDigit = parseInt(data[7]);
  const calculatedCheck = calculateUPCEChecksum(data.substring(0, 7));

  if (checkDigit !== calculatedCheck) {
    result.errors = [`Invalid UPC-E checksum. Expected ${calculatedCheck}, got ${checkDigit}`];
    return result;
  }

  result.isValid = true;
  result.checksum = checkDigit.toString();
  result.metadata.encoding = 'upc_e';

  return result;
}

function validateQRCode(data: string, result: ValidationResult): ValidationResult {
  // QR codes are very flexible, basic validation
  if (data.length === 0) {
    result.errors = ['QR code data cannot be empty'];
    return result;
  }

  if (data.length > 4296) {
    result.errors = ['QR code data too long (maximum 4296 characters)'];
    return result;
  }

  result.isValid = true;
  result.metadata.encoding = 'utf8';
  result.metadata.capacity = getQRCodeCapacity(data);

  return result;
}

// Checksum calculation functions
function calculateCode128Checksum(data: string): string {
  // Simplified checksum for demo purposes
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data.charCodeAt(i) * (i + 1);
  }
  return (sum % 103).toString();
}

function calculateCode39Checksum(data: string): string {
  // Simplified checksum for demo purposes
  let sum = 0;
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%";
  for (const char of data) {
    sum += chars.indexOf(char);
  }
  return chars[sum % 43];
}

function calculateEAN13Checksum(data: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(data[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

function calculateEAN8Checksum(data: string): number {
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(data[i]);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

function calculateUPCAChecksum(data: string): number {
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(data[i]);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

function calculateUPCEChecksum(data: string): number {
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(data[i]);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

function getQRCodeCapacity(_data: string): { numeric: number; alphanumeric: number; byte: number } {
  // Simplified capacity calculation
  return {
    numeric: 7089,
    alphanumeric: 4296,
    byte: 2953,
  };
}

export const getBarcodeFormatInfo = (format: string) => {
  const formatInfo = {
    'CODE128': {
      name: 'Code 128',
      description: 'High-density linear barcode, supports full ASCII character set',
      maxLength: 80,
      checksum: true,
      applications: ['Shipping', 'Packaging', 'General purpose'],
    },
    'CODE39': {
      name: 'Code 39',
      description: 'Alphanumeric barcode, widely used in automotive and defense',
      maxLength: 43,
      checksum: false,
      applications: ['Automotive', 'Defense', 'Healthcare'],
    },
    'EAN13': {
      name: 'EAN-13',
      description: 'European Article Number, standard retail barcode',
      maxLength: 13,
      checksum: true,
      applications: ['Retail', 'Point of Sale', 'Product identification'],
    },
    'EAN8': {
      name: 'EAN-8',
      description: 'Compact version of EAN-13 for small products',
      maxLength: 8,
      checksum: true,
      applications: ['Small products', 'Retail', 'Pharmaceuticals'],
    },
    'UPC_A': {
      name: 'UPC-A',
      description: 'Universal Product Code, standard in North America',
      maxLength: 12,
      checksum: true,
      applications: ['Retail', 'Grocery', 'Point of Sale'],
    },
    'UPC_E': {
      name: 'UPC-E',
      description: 'Compressed version of UPC-A for small products',
      maxLength: 8,
      checksum: true,
      applications: ['Small products', 'Retail', 'Cosmetics'],
    },
    'QR_CODE': {
      name: 'QR Code',
      description: '2D matrix code with high data capacity and error correction',
      maxLength: 4296,
      checksum: true,
      applications: ['Mobile apps', 'Marketing', 'Payments', 'Contact info'],
    },
  };

  return formatInfo[format as keyof typeof formatInfo] || {
    name: format,
    description: 'Unknown barcode format',
    maxLength: 0,
    checksum: false,
    applications: [],
  };
};
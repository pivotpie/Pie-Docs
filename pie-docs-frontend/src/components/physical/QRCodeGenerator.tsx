import React, { useState, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { generateBarcode } from '@/store/slices/physicalDocsSlice';
import { barcodeGenerator } from '@/utils/barcodeGenerator';
import type { QRCodeMetadata } from '@/utils/barcodeGenerator';

interface QRCodeGeneratorProps {
  documentId?: string;
  assetId?: string;
  onQRGenerated?: (qr: { code: string; image: string; metadata?: QRCodeMetadata }) => void;
  className?: string;
}

type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';
type QRDataType = 'text' | 'url' | 'email' | 'phone' | 'wifi' | 'location' | 'vcard' | 'metadata';

interface QRGenerationOptions {
  dataType: QRDataType;
  errorCorrection: ErrorCorrectionLevel;
  size: number;
  margin: number;
  darkColor: string;
  lightColor: string;
  includeMetadata: boolean;
  customData?: Record<string, any>;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  documentId,
  assetId,
  onQRGenerated,
  className = '',
}) => {
  const dispatch = useAppDispatch();
  const { loading, errors } = useAppSelector(state => state.physicalDocs);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [options, setOptions] = useState<QRGenerationOptions>({
    dataType: 'text',
    errorCorrection: 'M',
    size: 256,
    margin: 1,
    darkColor: '#000000',
    lightColor: '#ffffff',
    includeMetadata: false,
    customData: {},
  });

  const [inputData, setInputData] = useState('');
  const [generatedQR, setGeneratedQR] = useState<{ code: string; image: string; metadata?: QRCodeMetadata } | null>(null);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; message: string } | null>(null);

  const errorCorrectionOptions = [
    { value: 'L', label: 'Low (7%)', description: 'Can recover from up to 7% data loss' },
    { value: 'M', label: 'Medium (15%)', description: 'Can recover from up to 15% data loss' },
    { value: 'Q', label: 'Quartile (25%)', description: 'Can recover from up to 25% data loss' },
    { value: 'H', label: 'High (30%)', description: 'Can recover from up to 30% data loss' },
  ];

  const dataTypeOptions = [
    { value: 'text', label: 'Plain Text', placeholder: 'Enter any text...' },
    { value: 'url', label: 'Website URL', placeholder: 'https://example.com' },
    { value: 'email', label: 'Email Address', placeholder: 'user@example.com' },
    { value: 'phone', label: 'Phone Number', placeholder: '+1-555-123-4567' },
    { value: 'wifi', label: 'WiFi Network', placeholder: 'SSID:password:security' },
    { value: 'location', label: 'GPS Location', placeholder: 'lat,lng' },
    { value: 'vcard', label: 'Contact Card', placeholder: 'Name:Email:Phone' },
    { value: 'metadata', label: 'Document Metadata', placeholder: 'Auto-generated' },
  ];

  const validateInput = useCallback((data: string, type: QRDataType): { isValid: boolean; message: string } => {
    if (!data.trim()) {
      return { isValid: false, message: 'Input data is required' };
    }

    switch (type) {
      case 'url':
        try {
          new URL(data);
          return { isValid: true, message: 'Valid URL format' };
        } catch {
          return { isValid: false, message: 'Invalid URL format' };
        }

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(data)
          ? { isValid: true, message: 'Valid email format' }
          : { isValid: false, message: 'Invalid email format' };

      case 'phone':
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        const cleanPhone = data.replace(/[\s\-\(\)]/g, '');
        return phoneRegex.test(cleanPhone)
          ? { isValid: true, message: 'Valid phone format' }
          : { isValid: false, message: 'Invalid phone format' };

      case 'location':
        const locationRegex = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
        return locationRegex.test(data)
          ? { isValid: true, message: 'Valid GPS coordinates' }
          : { isValid: false, message: 'Invalid GPS format (use lat,lng)' };

      case 'wifi':
        const parts = data.split(':');
        return parts.length >= 2
          ? { isValid: true, message: 'Valid WiFi format' }
          : { isValid: false, message: 'Invalid WiFi format (use SSID:password:security)' };

      default:
        return data.length <= 4296
          ? { isValid: true, message: 'Valid input data' }
          : { isValid: false, message: 'Data too long for QR code' };
    }
  }, []);

  const formatDataForQR = useCallback((data: string, type: QRDataType): string => {
    switch (type) {
      case 'url':
        return data.startsWith('http') ? data : `https://${data}`;

      case 'email':
        return `mailto:${data}`;

      case 'phone':
        return `tel:${data}`;

      case 'wifi':
        const [ssid, password, security = 'WPA'] = data.split(':');
        return `WIFI:T:${security};S:${ssid};P:${password};;`;

      case 'location':
        const [lat, lng] = data.split(',');
        return `geo:${lat},${lng}`;

      case 'vcard':
        const [name, email, phone] = data.split(':');
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nEMAIL:${email}\nTEL:${phone}\nEND:VCARD`;

      default:
        return data;
    }
  }, []);

  const generateMetadata = useCallback((): QRCodeMetadata => {
    const now = new Date().toISOString();
    const documentType = assetId ? 'asset' : 'document';
    const baseData = documentId || assetId || 'unknown';

    return {
      documentId: documentId || assetId || barcodeGenerator.generateUniqueId('QR'),
      documentType,
      createdDate: now,
      location: navigator.geolocation ? 'available' : 'unavailable',
      checksum: barcodeGenerator.generateChecksum(baseData + now),
      version: '1.0',
    };
  }, [documentId, assetId]);

  const handleGenerateQR = async () => {
    try {
      let dataToEncode = inputData;
      let metadata: QRCodeMetadata | undefined;

      // Handle metadata type
      if (options.dataType === 'metadata') {
        metadata = generateMetadata();
        dataToEncode = JSON.stringify({
          ...metadata,
          ...options.customData,
        });
      } else {
        // Validate and format input data
        const validation = validateInput(inputData, options.dataType);
        if (!validation.isValid) {
          setValidationResult(validation);
          return;
        }
        dataToEncode = formatDataForQR(inputData, options.dataType);

        // Include metadata if requested
        if (options.includeMetadata) {
          metadata = generateMetadata();
          dataToEncode = JSON.stringify({
            data: dataToEncode,
            metadata,
            ...options.customData,
          });
        }
      }

      // Generate QR code with enhanced options
      const qrImage = await barcodeGenerator.generateEnhancedQRCode(dataToEncode, {
        errorCorrectionLevel: options.errorCorrection,
        width: options.size,
        margin: options.margin,
        color: {
          dark: options.darkColor,
          light: options.lightColor,
        },
      });

      const qrData = {
        code: dataToEncode,
        image: qrImage,
        metadata,
      };

      setGeneratedQR(qrData);
      setValidationResult({ isValid: true, message: 'QR code generated successfully!' });

      // Dispatch to Redux store
      await dispatch(generateBarcode({
        documentId,
        assetId,
        format: 'qr',
        prefix: 'QR',
        suffix: '',
      }));

      // Notify parent component
      onQRGenerated?.(qrData);

    } catch (error) {
      console.error('Failed to generate QR code:', error);
      setValidationResult({
        isValid: false,
        message: error instanceof Error ? error.message : 'Failed to generate QR code',
      });
    }
  };

  const handleDownloadQR = () => {
    if (!generatedQR) return;

    const link = document.createElement('a');
    link.download = `qrcode_${Date.now()}.png`;
    link.href = generatedQR.image;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTestQR = async () => {
    if (!generatedQR) return;

    try {
      // Simulate QR code scanning/validation
      const isValid = await barcodeGenerator.validateQRCode(generatedQR.code);
      setValidationResult({
        isValid,
        message: isValid ? 'QR code validation successful!' : 'QR code validation failed',
      });
    } catch (error) {
      setValidationResult({
        isValid: false,
        message: 'QR code test failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
      });
    }
  };

  const getCurrentDataTypeOption = () => {
    return dataTypeOptions.find(opt => opt.value === options.dataType);
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          QR Code Generator
        </h2>

        {/* Data Type Selection */}
        <div className="mb-4">
          <label htmlFor="data-type" className="block text-sm font-medium text-gray-700 mb-2">
            Data Type
          </label>
          <select
            id="data-type"
            value={options.dataType}
            onChange={(e) => setOptions(prev => ({ ...prev, dataType: e.target.value as QRDataType }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {dataTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Data Input */}
        {options.dataType !== 'metadata' && (
          <div className="mb-4">
            <label htmlFor="qr-data" className="block text-sm font-medium text-gray-700 mb-2">
              Data to Encode
            </label>
            <textarea
              id="qr-data"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              placeholder={getCurrentDataTypeOption()?.placeholder || 'Enter data...'}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Error Correction Level */}
        <div className="mb-4">
          <label htmlFor="error-correction" className="block text-sm font-medium text-gray-700 mb-2">
            Error Correction Level
          </label>
          <select
            id="error-correction"
            value={options.errorCorrection}
            onChange={(e) => setOptions(prev => ({ ...prev, errorCorrection: e.target.value as ErrorCorrectionLevel }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {errorCorrectionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {errorCorrectionOptions.find(opt => opt.value === options.errorCorrection)?.description}
          </p>
        </div>

        {/* Appearance Options */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="qr-size" className="block text-sm font-medium text-gray-700 mb-2">
              Size (px)
            </label>
            <input
              id="qr-size"
              type="number"
              min="128"
              max="512"
              step="32"
              value={options.size}
              onChange={(e) => setOptions(prev => ({ ...prev, size: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="qr-margin" className="block text-sm font-medium text-gray-700 mb-2">
              Margin
            </label>
            <input
              id="qr-margin"
              type="number"
              min="0"
              max="4"
              value={options.margin}
              onChange={(e) => setOptions(prev => ({ ...prev, margin: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Color Options */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="dark-color" className="block text-sm font-medium text-gray-700 mb-2">
              Dark Color
            </label>
            <input
              id="dark-color"
              type="color"
              value={options.darkColor}
              onChange={(e) => setOptions(prev => ({ ...prev, darkColor: e.target.value }))}
              className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="light-color" className="block text-sm font-medium text-gray-700 mb-2">
              Light Color
            </label>
            <input
              id="light-color"
              type="color"
              value={options.lightColor}
              onChange={(e) => setOptions(prev => ({ ...prev, lightColor: e.target.value }))}
              className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Advanced Options */}
        <div className="mb-6">
          {options.dataType !== 'metadata' && (
            <label htmlFor="include-metadata" className="flex items-center mb-2">
              <input
                id="include-metadata"
                type="checkbox"
                checked={options.includeMetadata}
                onChange={(e) => setOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Include document metadata</span>
            </label>
          )}
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateQR}
          disabled={loading.generating || (!inputData.trim() && options.dataType !== 'metadata')}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading.generating ? 'Generating...' : 'Generate QR Code'}
        </button>
      </div>

      {/* Validation Result */}
      {validationResult && (
        <div className={`mb-4 p-3 rounded-md ${
          validationResult.isValid
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {validationResult.message}
        </div>
      )}

      {/* Error Display */}
      {errors.generation && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md">
          {errors.generation}
        </div>
      )}

      {/* Generated QR Code Display */}
      {generatedQR && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-3">Generated QR Code</h3>

          {/* QR Code Image */}
          <div className="flex justify-center mb-4">
            <div className="bg-white p-4 rounded border">
              <img
                src={generatedQR.image}
                alt="Generated QR Code"
                className="max-w-full h-auto"
                style={{ width: options.size, height: options.size }}
              />
            </div>
          </div>

          {/* QR Code Info */}
          <div className="space-y-2 mb-4">
            <div className="text-sm">
              <span className="font-medium text-gray-600">Type:</span>
              <span className="ml-2 text-gray-800 capitalize">{options.dataType}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-600">Error Correction:</span>
              <span className="ml-2 text-gray-800">{options.errorCorrection}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-600">Size:</span>
              <span className="ml-2 text-gray-800">{options.size}x{options.size}px</span>
            </div>
          </div>

          {/* Metadata Display */}
          {generatedQR.metadata && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Metadata</h4>
              <div className="text-xs text-blue-700 space-y-1">
                <div>Document ID: {generatedQR.metadata.documentId}</div>
                <div>Type: {generatedQR.metadata.documentType}</div>
                <div>Created: {new Date(generatedQR.metadata.createdDate).toLocaleString()}</div>
                <div>Checksum: {generatedQR.metadata.checksum}</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleDownloadQR}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Download PNG
            </button>
            <button
              onClick={handleTestQR}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            >
              Test QR Code
            </button>
          </div>
        </div>
      )}

      {/* Usage Examples */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Usage Examples</h4>
        <div className="text-xs text-blue-700 space-y-1">
          <div><strong>URL:</strong> https://company.com/documents/doc123</div>
          <div><strong>Email:</strong> support@company.com</div>
          <div><strong>Phone:</strong> +1-555-123-4567</div>
          <div><strong>WiFi:</strong> OfficeWiFi:password123:WPA2</div>
          <div><strong>Location:</strong> 40.7128,-74.0060</div>
          <div><strong>Contact:</strong> John Doe:john@company.com:+1-555-123-4567</div>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};
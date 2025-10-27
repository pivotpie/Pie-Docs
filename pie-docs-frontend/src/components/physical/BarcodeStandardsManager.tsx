import React, { useState, useCallback } from 'react';
import { useAppSelector } from '@/hooks/redux';
import { barcodeGenerator } from '@/utils/barcodeGenerator';

interface BarcodeStandardsManagerProps {
  onFormatSelected?: (format: string) => void;
  className?: string;
}

export const BarcodeStandardsManager: React.FC<BarcodeStandardsManagerProps> = ({
  onFormatSelected,
  className = '',
}) => {
  const { configuration } = useAppSelector(state => state.physicalDocs);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [previewCode, setPreviewCode] = useState<string>('123456789');
  const [previewImages, setPreviewImages] = useState<Record<string, string>>({});
  const [showComparison, setShowComparison] = useState<boolean>(false);

  // Group formats by category
  const formatsByCategory = React.useMemo(() => {
    const categories: Record<string, typeof configuration.barcodeFormats> = {
      retail: [],
      industrial: [],
      pharmaceutical: [],
      document: [],
      all: configuration.barcodeFormats,
    };

    configuration.barcodeFormats.forEach(format => {
      const info = barcodeGenerator.getBarcodeFormatInfo(format.standard);
      categories[info.category].push(format);
    });

    return categories;
  }, [configuration.barcodeFormats]);

  // Generate preview for selected formats
  const generatePreviews = useCallback(async () => {
    if (!previewCode) return;

    const previews: Record<string, string> = {};
    const formatsToPreview = selectedCategory === 'all'
      ? configuration.barcodeFormats.slice(0, 4) // Limit to first 4 for performance
      : formatsByCategory[selectedCategory];

    for (const format of formatsToPreview) {
      try {
        // Use appropriate code generation for format
        let codeToGenerate = previewCode;

        switch (format.standard) {
          case 'EAN13':
            codeToGenerate = barcodeGenerator.generateEAN13(previewCode);
            break;
          case 'EAN8':
            codeToGenerate = barcodeGenerator.generateEAN8(previewCode);
            break;
          case 'UPC':
            codeToGenerate = barcodeGenerator.generateUPC(previewCode);
            break;
          case 'pharmacode':
            // Ensure it's within valid range
            const pharmacodeValue = Math.min(131070, Math.max(3, parseInt(previewCode) || 123));
            codeToGenerate = pharmacodeValue.toString();
            break;
          case 'codabar':
            codeToGenerate = `A${previewCode}A`;
            break;
          case 'ITF':
            // Ensure even length
            codeToGenerate = previewCode.length % 2 === 0 ? previewCode : previewCode + '0';
            break;
        }

        if (barcodeGenerator.validateBarcodeFormat(codeToGenerate, format.standard)) {
          const image = await barcodeGenerator.generateBarcodeImage(codeToGenerate, {
            format: format.standard as any,
            width: format.configuration.width || 2,
            height: format.configuration.height || 50,
            displayValue: format.configuration.displayValue ?? true,
          });
          previews[format.id] = image;
        }
      } catch (error) {
        console.warn(`Failed to generate preview for ${format.name}:`, error);
      }
    }

    setPreviewImages(previews);
  }, [previewCode, selectedCategory, configuration.barcodeFormats, formatsByCategory]);

  React.useEffect(() => {
    generatePreviews();
  }, [generatePreviews]);

  const handleFormatSelect = (formatId: string) => {
    setSelectedFormat(formatId);
    if (onFormatSelected) {
      onFormatSelected(formatId);
    }
  };

  const getFormatInfo = (standard: string) => {
    return barcodeGenerator.getBarcodeFormatInfo(standard);
  };

  const categories = [
    { id: 'all', name: 'All Standards', icon: '📊' },
    { id: 'retail', name: 'Retail', icon: '🛒' },
    { id: 'industrial', name: 'Industrial', icon: '🏭' },
    { id: 'pharmaceutical', name: 'Pharmaceutical', icon: '💊' },
    { id: 'document', name: 'Document', icon: '📄' },
  ];

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            Barcode Standards Manager
          </h3>
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200"
          >
            {showComparison ? 'Hide Comparison' : 'Compare Standards'}
          </button>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Filter by Category</h4>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
                <span className="text-xs text-gray-500">
                  ({selectedCategory === category.id ? formatsByCategory[category.id].length : ''})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview Code Input */}
        <div className="mb-6">
          <label htmlFor="preview-code" className="block text-sm font-medium text-gray-700 mb-2">
            Preview Code
          </label>
          <div className="flex space-x-3">
            <input
              id="preview-code"
              type="text"
              value={previewCode}
              onChange={(e) => setPreviewCode(e.target.value)}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter code to preview..."
            />
            <button
              onClick={generatePreviews}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Generate Previews
            </button>
          </div>
        </div>

        {/* Standards Grid */}
        <div className="space-y-6">
          {(selectedCategory === 'all' ? ['retail', 'industrial', 'pharmaceutical', 'document'] : [selectedCategory]).map(categoryId => {
            const categoryFormats = formatsByCategory[categoryId];
            if (!categoryFormats || categoryFormats.length === 0) return null;

            const categoryInfo = categories.find(c => c.id === categoryId);

            return (
              <div key={categoryId}>
                {selectedCategory === 'all' && (
                  <h5 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">{categoryInfo?.icon}</span>
                    {categoryInfo?.name} Standards
                  </h5>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryFormats.map(format => {
                    const info = getFormatInfo(format.standard);
                    const isSelected = selectedFormat === format.id;

                    return (
                      <div
                        key={format.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => handleFormatSelect(format.id)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h6 className="font-medium text-gray-900">{format.name}</h6>
                            <p className="text-xs text-gray-500 mt-1">{info.description}</p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            format.type === '2d'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {format.type === '2d' ? '2D' : 'Linear'}
                          </span>
                        </div>

                        {/* Format Details */}
                        <div className="space-y-2 mb-4">
                          <div className="text-xs text-gray-600">
                            <strong>Character Set:</strong> {info.charset}
                          </div>
                          {info.maxLength && (
                            <div className="text-xs text-gray-600">
                              <strong>Max Length:</strong> {info.maxLength}
                            </div>
                          )}
                          <div className="text-xs text-gray-600">
                            <strong>Check Digit:</strong> {info.hasCheckDigit ? 'Yes' : 'No'}
                          </div>
                        </div>

                        {/* Use Cases */}
                        <div className="mb-4">
                          <div className="text-xs font-medium text-gray-700 mb-1">Common Uses:</div>
                          <div className="flex flex-wrap gap-1">
                            {info.useCases.slice(0, 3).map(useCase => (
                              <span
                                key={useCase}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                              >
                                {useCase}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Preview */}
                        {previewImages[format.id] && (
                          <div className="border-t pt-3">
                            <div className="text-xs font-medium text-gray-700 mb-2">Preview:</div>
                            <img
                              src={previewImages[format.id]}
                              alt={`${format.name} preview`}
                              className="max-w-full h-auto bg-white border rounded"
                              style={{ maxHeight: '60px' }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison View */}
        {showComparison && (
          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h4 className="text-md font-medium text-gray-900 mb-4">Standards Comparison</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Standard
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Max Length
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check Digit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Primary Use
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formatsByCategory[selectedCategory].map(format => {
                    const info = getFormatInfo(format.standard);
                    return (
                      <tr key={format.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {format.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            format.type === '2d'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {format.type === '2d' ? '2D' : 'Linear'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {info.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {info.maxLength || 'Variable'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {info.hasCheckDigit ? '✅' : '❌'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {info.useCases[0] || 'General'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Selected Format Info */}
        {selectedFormat && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Selected: {configuration.barcodeFormats.find(f => f.id === selectedFormat)?.name}
            </h4>
            <p className="text-sm text-blue-800">
              Ready to use this format for barcode generation. The format has been optimized
              for its specific use case and includes appropriate validation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
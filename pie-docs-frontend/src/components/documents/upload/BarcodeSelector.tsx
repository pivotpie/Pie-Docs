import React, { useState, useEffect } from 'react';
import {
  QrCodeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '@/contexts/ThemeContext';

interface Barcode {
  id: string;
  code: string;
  format_name: string;
  format_type: string;
  is_active: boolean;
  created_at: string;
}

interface BarcodeSelectorProps {
  selectedBarcodeId?: string;
  onBarcodeSelect: (barcodeId: string, barcodeCode: string) => void;
  onCreateNew?: () => void;
  className?: string;
}

export const BarcodeSelector: React.FC<BarcodeSelectorProps> = ({
  selectedBarcodeId,
  onBarcodeSelect,
  onCreateNew,
  className = ''
}) => {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodes, setBarcodes] = useState<Barcode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewBarcodeModal, setShowNewBarcodeModal] = useState(false);
  const [newBarcodeCode, setNewBarcodeCode] = useState('');
  const [newBarcodeFormat, setNewBarcodeFormat] = useState('');
  const [barcodeFormats, setBarcodeFormats] = useState<any[]>([]);

  // Load available barcodes
  useEffect(() => {
    loadBarcodes();
    loadBarcodeFormats();
  }, []);

  const loadBarcodes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/physical/barcodes?is_active=true&page=1&page_size=100');
      const data = await response.json();
      setBarcodes(data.barcodes || []);
    } catch (error) {
      console.error('Failed to load barcodes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBarcodeFormats = async () => {
    try {
      const response = await fetch('/api/v1/physical/barcodes/formats');
      const data = await response.json();
      setBarcodeFormats(data || []);
      if (data && data.length > 0) {
        setNewBarcodeFormat(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load barcode formats:', error);
    }
  };

  const handleCreateBarcode = async () => {
    if (!newBarcodeCode || !newBarcodeFormat) {
      alert('Please enter barcode code and select format');
      return;
    }

    try {
      const response = await fetch('/api/v1/physical/barcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newBarcodeCode,
          format_id: newBarcodeFormat,
          metadata: {}
        })
      });

      if (response.ok) {
        const newBarcode = await response.json();
        setBarcodes([newBarcode, ...barcodes]);
        onBarcodeSelect(newBarcode.id, newBarcode.code);
        setShowNewBarcodeModal(false);
        setNewBarcodeCode('');
      } else {
        const error = await response.json();
        alert(`Failed to create barcode: ${error.detail}`);
      }
    } catch (error) {
      console.error('Failed to create barcode:', error);
      alert('Failed to create barcode');
    }
  };

  const filteredBarcodes = barcodes.filter(barcode =>
    barcode.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    barcode.format_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white">Barcode Selection</h4>
        <button
          onClick={() => onCreateNew ? onCreateNew() : setShowNewBarcodeModal(true)}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Create New
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search barcodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          }`}
        />
      </div>

      {/* Barcode List */}
      <div className={`border rounded-lg max-h-64 overflow-y-auto ${
        theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'
      }`}>
        {isLoading ? (
          <div className={`p-4 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Loading barcodes...
          </div>
        ) : filteredBarcodes.length === 0 ? (
          <div className="p-4 text-center">
            <QrCodeIcon className="mx-auto h-12 w-12 text-gray-400 mb-2" />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              No barcodes found
            </p>
            <button
              onClick={() => setShowNewBarcodeModal(true)}
              className="mt-2 text-sm text-blue-500 hover:text-blue-400"
            >
              Create your first barcode
            </button>
          </div>
        ) : (
          <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {filteredBarcodes.map((barcode) => (
              <div
                key={barcode.id}
                onClick={() => onBarcodeSelect(barcode.id, barcode.code)}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedBarcodeId === barcode.id
                    ? theme === 'dark'
                      ? 'bg-blue-900/30 border-l-4 border-blue-500'
                      : 'bg-blue-50 border-l-4 border-blue-500'
                    : theme === 'dark'
                    ? 'hover:bg-gray-700'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <QrCodeIcon className={`h-5 w-5 ${
                      selectedBarcodeId === barcode.id
                        ? 'text-blue-400'
                        : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`} />
                    <div>
                      <p className={`text-sm font-medium ${
                        selectedBarcodeId === barcode.id
                          ? theme === 'dark' ? 'text-blue-300' : 'text-blue-900'
                          : theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {barcode.code}
                      </p>
                      <p className={`text-xs ${
                        selectedBarcodeId === barcode.id
                          ? theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
                          : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {barcode.format_name} • {barcode.format_type}
                      </p>
                    </div>
                  </div>
                  {selectedBarcodeId === barcode.id && (
                    <CheckIcon className={`h-5 w-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Barcode Modal */}
      {showNewBarcodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 ${
            theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Create New Barcode
              </h3>
              <button
                onClick={() => setShowNewBarcodeModal(false)}
                className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Barcode Code *
                </label>
                <input
                  type="text"
                  value={newBarcodeCode}
                  onChange={(e) => setNewBarcodeCode(e.target.value)}
                  placeholder="Enter barcode code (e.g., DOC-2024-001)"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Barcode Format *
                </label>
                <select
                  value={newBarcodeFormat}
                  onChange={(e) => setNewBarcodeFormat(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  {barcodeFormats.map((format) => (
                    <option key={format.id} value={format.id}>
                      {format.name} ({format.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowNewBarcodeModal(false)}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBarcode}
                  disabled={!newBarcodeCode || !newBarcodeFormat}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-gray-400"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeSelector;

import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { submitPrintJob, updatePrintJobStatus } from '@/store/slices/physicalDocsSlice';

interface PrintManagerProps {
  barcodeIds: string[];
  onPrintComplete?: (jobId: string) => void;
  className?: string;
}

export const PrintManager: React.FC<PrintManagerProps> = ({
  barcodeIds,
  onPrintComplete,
  className = '',
}) => {
  const dispatch = useAppDispatch();
  const { printing, barcodes, loading, errors } = useAppSelector(state => state.physicalDocs);

  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [copies, setCopies] = useState<number>(1);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Mock printer detection on component mount
  useEffect(() => {
    // Simulate printer detection
    const mockPrinters = [
      {
        id: 'zebra_zd620',
        name: 'Zebra ZD620',
        type: 'label' as const,
        model: 'ZD620',
        status: 'online' as const,
        capabilities: ['ZPL', 'EPL', 'PDF'],
        isDefault: true,
      },
      {
        id: 'dymo_450',
        name: 'DYMO LabelWriter 450',
        type: 'label' as const,
        model: 'LabelWriter 450',
        status: 'online' as const,
        capabilities: ['DYMO', 'PDF'],
        isDefault: false,
      },
      {
        id: 'brother_ql800',
        name: 'Brother QL-800',
        type: 'label' as const,
        model: 'QL-800',
        status: 'offline' as const,
        capabilities: ['P-touch', 'PDF'],
        isDefault: false,
      },
    ];

    // Set first available printer as default
    const defaultPrinter = mockPrinters.find(p => p.isDefault) || mockPrinters[0];
    if (defaultPrinter) {
      setSelectedPrinter(defaultPrinter.id);
    }
  }, []);

  // Mock templates
  const mockTemplates = [
    { id: 'small_label', name: 'Small Label (25x10mm)', width: 25, height: 10 },
    { id: 'medium_label', name: 'Medium Label (50x25mm)', width: 50, height: 25 },
    { id: 'large_label', name: 'Large Label (100x50mm)', width: 100, height: 50 },
    { id: 'asset_tag', name: 'Asset Tag (60x30mm)', width: 60, height: 30 },
  ];

  useEffect(() => {
    if (mockTemplates.length > 0) {
      setSelectedTemplate(mockTemplates[0].id);
    }
  }, []);

  const selectedBarcodes = barcodes.generated.filter(b => barcodeIds.includes(b.id));
  const availablePrinters = printing.availablePrinters.length > 0
    ? printing.availablePrinters
    : [
        {
          id: 'zebra_zd620',
          name: 'Zebra ZD620',
          type: 'label' as const,
          model: 'ZD620',
          status: 'online' as const,
          capabilities: ['ZPL', 'EPL', 'PDF'],
          isDefault: true,
        },
        {
          id: 'dymo_450',
          name: 'DYMO LabelWriter 450',
          type: 'label' as const,
          model: 'LabelWriter 450',
          status: 'online' as const,
          capabilities: ['DYMO', 'PDF'],
          isDefault: false,
        },
      ];

  const handlePrint = async () => {
    if (!selectedPrinter || !selectedTemplate || barcodeIds.length === 0) {
      return;
    }

    try {
      const result = await dispatch(submitPrintJob({
        barcodeIds,
        templateId: selectedTemplate,
        printerId: selectedPrinter,
        copies,
      })).unwrap();

      // Simulate print job processing
      setTimeout(() => {
        dispatch(updatePrintJobStatus({
          jobId: result.id,
          status: 'printing',
        }));

        // Simulate completion
        setTimeout(() => {
          dispatch(updatePrintJobStatus({
            jobId: result.id,
            status: 'completed',
          }));
          onPrintComplete?.(result.id);
        }, 2000);
      }, 1000);

    } catch (error) {
      console.error('Print job failed:', error);
    }
  };

  const generatePreview = () => {
    const template = mockTemplates.find(t => t.id === selectedTemplate);
    if (!template || selectedBarcodes.length === 0) return null;

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Print Preview</h4>
        <div className="grid grid-cols-2 gap-4 max-h-60 overflow-y-auto">
          {selectedBarcodes.slice(0, 6).map((barcode, index) => (
            <div
              key={barcode.id}
              className="bg-white border border-gray-300 rounded p-2 text-center"
              style={{
                width: `${template.width * 2}px`,
                height: `${template.height * 2}px`,
                minWidth: '120px',
                minHeight: '60px',
              }}
            >
              <div className="text-xs text-gray-600 mb-1">{template.name}</div>
              <div className="flex flex-col items-center justify-center h-full">
                <div className="bg-black text-white text-xs px-1 mb-1">
                  |||||| |||| |||||| ||||
                </div>
                <div className="text-xs font-mono">{barcode.code}</div>
              </div>
              {index === 5 && selectedBarcodes.length > 6 && (
                <div className="text-xs text-gray-500 mt-1">
                  +{selectedBarcodes.length - 6} more
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Print Manager
        </h2>

        {/* Printer Selection */}
        <div className="mb-4">
          <label htmlFor="printer-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Printer
          </label>
          <select
            id="printer-select"
            value={selectedPrinter}
            onChange={(e) => setSelectedPrinter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose a printer...</option>
            {availablePrinters.map((printer) => (
              <option key={printer.id} value={printer.id}>
                {printer.name} ({printer.status})
              </option>
            ))}
          </select>
        </div>

        {/* Template Selection */}
        <div className="mb-4">
          <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 mb-2">
            Label Template
          </label>
          <select
            id="template-select"
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose a template...</option>
            {mockTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        {/* Copies */}
        <div className="mb-4">
          <label htmlFor="copies-input" className="block text-sm font-medium text-gray-700 mb-2">
            Number of Copies
          </label>
          <input
            id="copies-input"
            type="number"
            min="1"
            max="100"
            value={copies}
            onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Print Summary */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Print Summary</h4>
          <div className="text-sm text-blue-800">
            <p>Barcodes to print: {selectedBarcodes.length}</p>
            <p>Total labels: {selectedBarcodes.length * copies}</p>
            {selectedBarcodes.length > 0 && (
              <p className="mt-1 text-xs">
                Codes: {selectedBarcodes.slice(0, 3).map(b => b.code).join(', ')}
                {selectedBarcodes.length > 3 && ` +${selectedBarcodes.length - 3} more`}
              </p>
            )}
          </div>
        </div>

        {/* Preview Toggle */}
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showPreview}
              onChange={(e) => setShowPreview(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Show print preview</span>
          </label>
        </div>

        {/* Print Preview */}
        {showPreview && generatePreview()}

        {/* Error Display */}
        {errors.printing && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md">
            {errors.printing}
          </div>
        )}

        {/* Print Button */}
        <button
          onClick={handlePrint}
          disabled={loading.printing || !selectedPrinter || !selectedTemplate || barcodeIds.length === 0}
          className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading.printing ? 'Printing...' : 'Print Labels'}
        </button>
      </div>

      {/* Print Queue Status */}
      {printing.printQueue.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Print Queue</h3>
          <div className="space-y-2">
            {printing.printQueue.slice(-5).map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Print Job #{job.id.slice(-6)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {job.barcodeIds.length} labels × {job.copies} copies
                  </div>
                </div>
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    job.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : job.status === 'printing'
                      ? 'bg-blue-100 text-blue-800'
                      : job.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {job.status === 'pending' && '⏳'}
                    {job.status === 'printing' && '🖨️'}
                    {job.status === 'completed' && '✅'}
                    {job.status === 'failed' && '❌'}
                    {' '}
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
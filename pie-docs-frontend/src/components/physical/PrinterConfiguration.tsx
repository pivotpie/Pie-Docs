import React, { useState, useEffect } from 'react';
import { useAppSelector } from '@/hooks/redux';

interface PrinterConfigurationProps {
  onPrinterSelected?: (printerId: string) => void;
  className?: string;
}

interface PrinterSettings {
  printerId: string;
  resolution: number;
  paperSize: string;
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number };
  printDensity: number;
  printSpeed: number;
}

export const PrinterConfiguration: React.FC<PrinterConfigurationProps> = ({
  onPrinterSelected,
  className = '',
}) => {
  const { printing } = useAppSelector(state => state.physicalDocs);

  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [settings, setSettings] = useState<PrinterSettings>({
    printerId: '',
    resolution: 203,
    paperSize: '50x25mm',
    orientation: 'portrait',
    margins: { top: 2, right: 2, bottom: 2, left: 2 },
    printDensity: 8,
    printSpeed: 4,
  });

  const [printerStatus, setPrinterStatus] = useState<{[key: string]: {
    isConnected: boolean;
    lastCheck: string;
    errorMessage?: string;
  }}>({});

  const [testPrinting, setTestPrinting] = useState<boolean>(false);

  // Mock printer data with realistic printer types
  const mockPrinters = [
    {
      id: 'zebra_zd620',
      name: 'Zebra ZD620',
      type: 'label' as const,
      model: 'ZD620',
      status: 'online' as const,
      capabilities: ['ZPL', 'EPL', 'PDF'],
      isDefault: true,
      driver: 'zebra-universal',
      connection: 'USB',
      resolution: [203, 300],
      maxWidth: 108, // mm
    },
    {
      id: 'dymo_450',
      name: 'DYMO LabelWriter 450',
      type: 'label' as const,
      model: 'LabelWriter 450',
      status: 'online' as const,
      capabilities: ['DYMO', 'PDF'],
      isDefault: false,
      driver: 'dymo-labelwriter',
      connection: 'USB',
      resolution: [300],
      maxWidth: 56, // mm
    },
    {
      id: 'brother_ql800',
      name: 'Brother QL-800',
      type: 'label' as const,
      model: 'QL-800',
      status: 'offline' as const,
      capabilities: ['P-touch', 'PDF'],
      isDefault: false,
      driver: 'brother-ptouch',
      connection: 'USB/Wireless',
      resolution: [300, 600],
      maxWidth: 62, // mm
    },
    {
      id: 'generic_pdf',
      name: 'PDF Export',
      type: 'standard' as const,
      model: 'Virtual',
      status: 'online' as const,
      capabilities: ['PDF'],
      isDefault: false,
      driver: 'pdf-export',
      connection: 'Virtual',
      resolution: [300, 600, 1200],
      maxWidth: 210, // A4 width
    },
  ];

  const paperSizes = [
    { id: '25x10mm', name: 'Small (25×10mm)', width: 25, height: 10 },
    { id: '50x25mm', name: 'Medium (50×25mm)', width: 50, height: 25 },
    { id: '100x50mm', name: 'Large (100×50mm)', width: 100, height: 50 },
    { id: '60x30mm', name: 'Asset Tag (60×30mm)', width: 60, height: 30 },
    { id: 'custom', name: 'Custom', width: 0, height: 0 },
  ];

  const availablePrinters = printing.availablePrinters.length > 0
    ? printing.availablePrinters
    : mockPrinters;

  useEffect(() => {
    // Auto-select first available printer
    if (availablePrinters.length > 0 && !selectedPrinter) {
      const defaultPrinter = availablePrinters.find(p => p.isDefault) || availablePrinters[0];
      setSelectedPrinter(defaultPrinter.id);
      setSettings(prev => ({ ...prev, printerId: defaultPrinter.id }));
    }
  }, [availablePrinters, selectedPrinter]);

  // Check printer status
  const checkPrinterStatus = async (printerId: string) => {
    setPrinterStatus(prev => ({
      ...prev,
      [printerId]: { isConnected: false, lastCheck: 'Checking...' }
    }));

    // Simulate status check
    await new Promise(resolve => setTimeout(resolve, 1000));

    const printer = availablePrinters.find(p => p.id === printerId);
    const isConnected = printer?.status === 'online';

    setPrinterStatus(prev => ({
      ...prev,
      [printerId]: {
        isConnected,
        lastCheck: new Date().toLocaleTimeString(),
        errorMessage: isConnected ? undefined : 'Printer not responding'
      }
    }));
  };

  const handlePrinterSelect = (printerId: string) => {
    setSelectedPrinter(printerId);
    setSettings(prev => ({ ...prev, printerId }));
    onPrinterSelected?.(printerId);
    checkPrinterStatus(printerId);
  };

  const runTestPrint = async () => {
    if (!selectedPrinter) return;

    setTestPrinting(true);

    try {
      // Simulate test print
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Test print completed successfully!');
    } catch (error) {
      alert('Test print failed: ' + error);
    } finally {
      setTestPrinting(false);
    }
  };

  const selectedPrinterData = availablePrinters.find(p => p.id === selectedPrinter);
  const status = printerStatus[selectedPrinter];

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Printer Configuration
        </h2>

        {/* Printer Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Available Printers
          </label>
          <div className="space-y-3">
            {availablePrinters.map((printer) => (
              <div
                key={printer.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedPrinter === printer.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => handlePrinterSelect(printer.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      checked={selectedPrinter === printer.id}
                      onChange={() => handlePrinterSelect(printer.id)}
                      className="mr-3"
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">{printer.name}</h3>
                      <p className="text-sm text-gray-500">
                        {printer.model} • {printer.connection}
                      </p>
                      <div className="flex gap-2 mt-1">
                        {printer.capabilities.map(cap => (
                          <span key={cap} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      printer.status === 'online'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {printer.status === 'online' ? '🟢 Online' : '🔴 Offline'}
                    </span>
                    {printer.isDefault && (
                      <div className="text-xs text-blue-600 mt-1">Default</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Printer Settings */}
        {selectedPrinterData && (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Print Settings</h3>

              {/* Resolution */}
              <div className="mb-4">
                <label htmlFor="resolution" className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution (DPI)
                </label>
                <select
                  id="resolution"
                  value={settings.resolution}
                  onChange={(e) => setSettings(prev => ({ ...prev, resolution: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {selectedPrinterData.resolution.map(res => (
                    <option key={res} value={res}>{res} DPI</option>
                  ))}
                </select>
              </div>

              {/* Paper Size */}
              <div className="mb-4">
                <label htmlFor="paper-size" className="block text-sm font-medium text-gray-700 mb-2">
                  Paper Size
                </label>
                <select
                  id="paper-size"
                  value={settings.paperSize}
                  onChange={(e) => setSettings(prev => ({ ...prev, paperSize: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {paperSizes.map(size => (
                    <option key={size.id} value={size.id}>{size.name}</option>
                  ))}
                </select>
              </div>

              {/* Orientation */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Orientation
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="portrait"
                      checked={settings.orientation === 'portrait'}
                      onChange={(e) => setSettings(prev => ({ ...prev, orientation: e.target.value as 'portrait' }))}
                      className="mr-2"
                    />
                    Portrait
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="landscape"
                      checked={settings.orientation === 'landscape'}
                      onChange={(e) => setSettings(prev => ({ ...prev, orientation: e.target.value as 'landscape' }))}
                      className="mr-2"
                    />
                    Landscape
                  </label>
                </div>
              </div>

              {/* Print Quality Settings */}
              {selectedPrinterData.type === 'label' && (
                <>
                  <div className="mb-4">
                    <label htmlFor="print-density" className="block text-sm font-medium text-gray-700 mb-2">
                      Print Density: {settings.printDensity}
                    </label>
                    <input
                      id="print-density"
                      type="range"
                      min="1"
                      max="15"
                      value={settings.printDensity}
                      onChange={(e) => setSettings(prev => ({ ...prev, printDensity: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Light</span>
                      <span>Dark</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="print-speed" className="block text-sm font-medium text-gray-700 mb-2">
                      Print Speed: {settings.printSpeed}
                    </label>
                    <input
                      id="print-speed"
                      type="range"
                      min="1"
                      max="10"
                      value={settings.printSpeed}
                      onChange={(e) => setSettings(prev => ({ ...prev, printSpeed: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Slow/High Quality</span>
                      <span>Fast/Standard</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Status & Diagnostics</h3>

              {/* Connection Status */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Connection Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`text-sm font-medium ${
                      status?.isConnected ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {status?.isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Check:</span>
                    <span className="text-sm text-gray-900">{status?.lastCheck || 'Never'}</span>
                  </div>
                  {status?.errorMessage && (
                    <div className="text-sm text-red-600 mt-2">
                      Error: {status.errorMessage}
                    </div>
                  )}
                </div>
              </div>

              {/* Printer Information */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Printer Information</h4>
                <div className="space-y-1 text-sm">
                  <div><span className="text-gray-600">Model:</span> {selectedPrinterData.model}</div>
                  <div><span className="text-gray-600">Driver:</span> {selectedPrinterData.driver}</div>
                  <div><span className="text-gray-600">Max Width:</span> {selectedPrinterData.maxWidth}mm</div>
                  <div><span className="text-gray-600">Supported Formats:</span> {selectedPrinterData.capabilities.join(', ')}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => checkPrinterStatus(selectedPrinter)}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Check Status
                </button>

                <button
                  onClick={runTestPrint}
                  disabled={testPrinting || !status?.isConnected}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testPrinting ? 'Printing Test Page...' : 'Print Test Page'}
                </button>

                <button
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Configure Driver
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Margins Settings */}
        {selectedPrinterData && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Margins (mm)</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label htmlFor="margin-top" className="block text-sm font-medium text-gray-700 mb-1">
                  Top
                </label>
                <input
                  id="margin-top"
                  type="number"
                  min="0"
                  step="0.5"
                  value={settings.margins.top}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    margins: { ...prev.margins, top: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="margin-right" className="block text-sm font-medium text-gray-700 mb-1">
                  Right
                </label>
                <input
                  id="margin-right"
                  type="number"
                  min="0"
                  step="0.5"
                  value={settings.margins.right}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    margins: { ...prev.margins, right: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="margin-bottom" className="block text-sm font-medium text-gray-700 mb-1">
                  Bottom
                </label>
                <input
                  id="margin-bottom"
                  type="number"
                  min="0"
                  step="0.5"
                  value={settings.margins.bottom}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    margins: { ...prev.margins, bottom: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="margin-left" className="block text-sm font-medium text-gray-700 mb-1">
                  Left
                </label>
                <input
                  id="margin-left"
                  type="number"
                  min="0"
                  step="0.5"
                  value={settings.margins.left}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    margins: { ...prev.margins, left: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
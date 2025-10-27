import React, { useState, useEffect } from 'react';
import { BatchGenerator } from '@/components/physical/BatchGenerator';
import { BarcodeValidator } from '@/components/physical/BarcodeValidator';
import { BarcodeStandardsManager } from '@/components/physical/BarcodeStandardsManager';
import { AssetTaggingSystem } from '@/components/physical/AssetTaggingSystem';
import { PrintManager } from '@/components/physical/PrintManager';
import { PrintTemplateSystem } from '@/components/physical/PrintTemplateSystem';
import { PrinterConfiguration } from '@/components/physical/PrinterConfiguration';
import { GenerateTab } from '@/components/physical/tabs/GenerateTab';
import { QRCodeTab } from '@/components/physical/tabs/QRCodeTab';
import { HistoryTab } from '@/components/physical/tabs/HistoryTab';
import { useAppSelector } from '@/hooks/redux';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export const BarcodeManagement: React.FC = () => {
  const { barcodes, loading } = useAppSelector(state => state.physicalDocs);
  const [activeTab, setActiveTab] = useState<'generate' | 'qrcode' | 'history' | 'batch' | 'validate' | 'standards' | 'assets' | 'print' | 'templates' | 'printers'>('generate');
  const [selectedBarcodes, setSelectedBarcodes] = useState<string[]>([]);

  // State for mobile components
  const [locationManagerVisible, setLocationManagerVisible] = useState(true);
  const [imageEnhancerVisible, setImageEnhancerVisible] = useState(true);
  const [barcodeValidatorVisible, setBarcodeValidatorVisible] = useState(true);

  const tabs = [
    { id: 'generate', label: 'Generate Barcode', icon: '📊' },
    { id: 'qrcode', label: 'QR Code Generator', icon: '📱' },
    { id: 'history', label: 'Generated Barcodes', icon: '📋' },
    { id: 'batch', label: 'Batch Operations', icon: '📦' },
    { id: 'validate', label: 'Validate Barcodes', icon: '🔍' },
    { id: 'standards', label: 'Barcode Standards', icon: '📋' },
    { id: 'assets', label: 'Asset Tagging', icon: '🏷️' },
    { id: 'print', label: 'Print Labels', icon: '🖨️' },
    { id: 'templates', label: 'Label Designer', icon: '🎨' },
    { id: 'printers', label: 'Printer Setup', icon: '⚙️' },
  ];

  const handleBarcodeGenerated = (barcode: { code: string; image: string }) => {
    console.log('New barcode generated:', barcode);
    // Could show notification or redirect to history
  };

  const handleQRGenerated = (qr: { code: string; image: string; metadata?: any }) => {
    console.log('New QR code generated:', qr);
    // Could show notification or redirect to history
  };

  const handleBatchGenerated = (barcodes: Array<{ code: string; image: string }>) => {
    console.log('Batch generated:', barcodes.length, 'barcodes');
    // Could show notification or redirect to history
    setActiveTab('history');
  };

  const handleValidationComplete = (result: any) => {
    console.log('Validation complete:', result);
    // Could show notification or update validation history
  };

  const handleFormatSelected = (format: string) => {
    console.log('Format selected:', format);
    // Could update default format or switch to generation tab
  };

  const handleTemplateSelected = (templateId: string) => {
    console.log('Template selected:', templateId);
    // Could switch to print tab with selected template
  };

  const handleAssetTagged = (asset: any, barcode: any) => {
    console.log('Asset tagged:', asset, barcode);
    // Could show notification and update asset list
  };

  const handleBarcodeSelect = (barcodeId: string, selected: boolean) => {
    if (selected) {
      setSelectedBarcodes(prev => [...prev, barcodeId]);
    } else {
      setSelectedBarcodes(prev => prev.filter(id => id !== barcodeId));
    }
  };

  const handlePrintComplete = (jobId: string) => {
    console.log('Print job completed:', jobId);
    // Show success notification
  };

  // Mobile component handlers
  const handleLocationCaptured = (location: any) => {
    console.log('Location captured:', location);
  };

  const handleLocationError = (error: string) => {
    console.error('Location error:', error);
  };

  const handleEnhancementComplete = (enhancedImage: any) => {
    console.log('Enhancement complete:', enhancedImage);
  };

  const handleMobileValidationComplete = (result: any) => {
    console.log('Mobile validation complete:', result);
  };

  const handleRetryRequested = () => {
    console.log('Retry requested');
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Barcode Management</h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600">
              Generate, manage, and print barcodes for physical documents and assets
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">📊</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Barcodes
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {barcodes.generated.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">✅</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Barcodes
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {barcodes.generated.filter(b => b.isActive).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">🖨️</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Print Jobs
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {barcodes.printJobs.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

          {/* Navigation Tabs */}
          <div className="mb-6 bg-white border-b border-gray-200 -mx-4 sm:-mx-6 lg:-mx-8">
            <div className="px-4 sm:px-6 lg:px-8">
              <nav
                className="flex space-x-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                aria-label="Tabs"
                style={{ scrollBehavior: 'smooth' }}
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-2 px-3 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200 flex-shrink-0`}
                  >
                    <span>{tab.icon}</span>
                    <span className="hidden sm:block">{tab.label}</span>
                    <span className="block sm:hidden">{tab.label.split(' ')[0]}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'generate' && (
              <GenerateTab
                onBarcodeGenerated={handleBarcodeGenerated}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'qrcode' && (
              <QRCodeTab
                onQRGenerated={handleQRGenerated}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'history' && (
              <HistoryTab
                barcodes={barcodes.generated}
                selectedBarcodes={selectedBarcodes}
                onBarcodeSelect={handleBarcodeSelect}
                onNavigateTab={setActiveTab}
              />
            )}

          {activeTab === 'batch' && (
            <BatchGenerator onBatchGenerated={handleBatchGenerated} />
          )}

          {activeTab === 'validate' && (
            <BarcodeValidator onValidationComplete={handleValidationComplete} />
          )}

          {activeTab === 'standards' && (
            <BarcodeStandardsManager onFormatSelected={handleFormatSelected} />
          )}

          {activeTab === 'assets' && (
            <AssetTaggingSystem onAssetTagged={handleAssetTagged} />
          )}

          {activeTab === 'print' && (
            <PrintManager
              barcodeIds={selectedBarcodes.length > 0 ? selectedBarcodes : barcodes.generated.map(b => b.id)}
              onPrintComplete={handlePrintComplete}
            />
          )}

          {activeTab === 'templates' && (
            <PrintTemplateSystem
              onTemplateSelected={handleTemplateSelected}
            />
          )}

          {activeTab === 'printers' && (
            <PrinterConfiguration
              onPrinterSelected={(printerId) => {
                console.log('Printer selected:', printerId);
              }}
            />
          )}

          {/* Mobile Scanner Functions */}
          {activeTab === 'mobile-scanner' && (
            <div className="bg-white rounded-lg shadow p-6">
              <MobileScanner />
            </div>
          )}

          {activeTab === 'mobile-capture' && (
            <div className="bg-white rounded-lg shadow p-6">
              <MobileDocumentCapture />
            </div>
          )}

          {activeTab === 'mobile-batch' && (
            <div className="bg-white rounded-lg shadow p-6">
              <MobileBatchScanning />
            </div>
          )}

          {activeTab === 'camera-scanner' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Camera Scanner</h3>
              <CameraScanner
                isActive={true}
                onScanSuccess={() => console.log('Scan success')}
                onScanError={(error) => console.log('Scan error:', error)}
              />
            </div>
          )}

          {activeTab === 'document-capture' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Capture</h3>
              <DocumentCapture
                isActive={true}
                onCaptureSuccess={(documentId) => console.log('Capture success:', documentId)}
                onCaptureError={(error) => console.log('Capture error:', error)}
              />
            </div>
          )}

          {activeTab === 'batch-scanner' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Batch Scanner</h3>
              <BatchScanner
                mode="barcode"
                onBatchComplete={(batchId) => console.log('Batch complete:', batchId)}
                onBatchError={(error) => console.log('Batch error:', error)}
              />
            </div>
          )}

          {activeTab === 'mobile-location' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Mobile Location Manager</h3>
              <MobileLocationManager
                onLocationCaptured={handleLocationCaptured}
                onLocationError={handleLocationError}
                isVisible={locationManagerVisible}
                onClose={() => setLocationManagerVisible(false)}
              />
            </div>
          )}

          {activeTab === 'image-enhancer' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Image Enhancer</h3>
              <ImageEnhancer
                originalImage=""
                onEnhancementComplete={handleEnhancementComplete}
                onCancel={() => setImageEnhancerVisible(false)}
                isVisible={imageEnhancerVisible}
              />
            </div>
          )}

          {activeTab === 'mobile-validator' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Mobile Barcode Validator</h3>
              <MobileBarcodeValidator
                barcode=""
                format={BarcodeFormat.CODE_128}
                onValidationComplete={handleMobileValidationComplete}
                onRetryRequested={handleRetryRequested}
                isVisible={barcodeValidatorVisible}
              />
            </div>
          )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};
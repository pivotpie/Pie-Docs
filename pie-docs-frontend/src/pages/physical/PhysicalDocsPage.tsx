import React, { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { BarcodeFormat } from '@zxing/library';
import { BarcodeManagement } from './BarcodeManagement';
import { LocationManager } from '@/components/physical/LocationManager';
import { LocationHierarchy } from '@/components/physical/LocationHierarchy';
import { PrintManager } from '@/components/physical/PrintManager';
import { PrintTemplateSystem } from '@/components/physical/PrintTemplateSystem';
import { PrinterConfiguration } from '@/components/physical/PrinterConfiguration';
import { AssetTaggingSystem } from '@/components/physical/AssetTaggingSystem';
import MobileScanner from '../mobile/MobileScanner';
import MobileDocumentCapture from '../mobile/MobileDocumentCapture';
import MobileBatchScanning from '../mobile/MobileBatchScanning';
import CameraScanner from '@/components/mobile/CameraScanner';
import DocumentCapture from '@/components/mobile/DocumentCapture';
import BatchScanner from '@/components/mobile/BatchScanner';
import { default as MobileLocationManager } from '@/components/mobile/LocationManager';
import ImageEnhancer from '@/components/mobile/ImageEnhancer';
import { default as MobileBarcodeValidator } from '@/components/mobile/BarcodeValidator';

const PhysicalDocsPage: React.FC = () => {
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get active tab from URL params
  const activeTab = searchParams.get('tab') || 'overview';

  // Tab navigation handler
  const handleTabChange = useCallback((tab: string) => {
    setSearchParams({ tab });
  }, [setSearchParams]);

  // State for mobile components
  const [locationManagerVisible, setLocationManagerVisible] = useState(true);
  const [imageEnhancerVisible, setImageEnhancerVisible] = useState(true);
  const [barcodeValidatorVisible, setBarcodeValidatorVisible] = useState(true);

  // Callback handlers for mobile components
  const handleLocationCaptured = (location: any) => {
    console.log('Location captured:', location);
  };

  const handleLocationError = (error: string) => {
    console.error('Location error:', error);
  };

  const handleEnhancementComplete = (enhancedImage: any) => {
    console.log('Enhancement complete:', enhancedImage);
  };

  const handleValidationComplete = (result: any) => {
    console.log('Validation complete:', result);
  };

  const handleRetryRequested = () => {
    console.log('Retry requested');
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'barcode-management', label: 'Barcode Management', icon: '📊' },
    { id: 'location-manager', label: 'Location Manager', icon: '📍' },
    { id: 'asset-tagging', label: 'Asset Tagging', icon: '🏷️' },
    { id: 'print-manager', label: 'Print Manager', icon: '🖨️' },
    { id: 'print-templates', label: 'Print Templates', icon: '🎨' },
    { id: 'printer-config', label: 'Printer Configuration', icon: '⚙️' },
    { id: 'mobile-scanner', label: 'Mobile Scanner', icon: '📱' },
    { id: 'mobile-capture', label: 'Mobile Document Capture', icon: '📷' },
    { id: 'mobile-batch', label: 'Mobile Batch Scanning', icon: '📦' },
    { id: 'camera-scanner', label: 'Camera Scanner', icon: '📸' },
    { id: 'document-capture', label: 'Document Capture', icon: '📄' },
    { id: 'batch-scanner', label: 'Batch Scanner', icon: '🔄' },
    { id: 'mobile-location', label: 'Mobile Location', icon: '📍' },
    { id: 'image-enhancer', label: 'Image Enhancer', icon: '✨' },
    { id: 'mobile-validator', label: 'Mobile Barcode Validator', icon: '✅' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 glass-strong">
        <div className="px-6 py-4">
          <div className="flex flex-col space-y-4">
            {/* Top Row: Title and Tab Navigation */}
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              {/* Title */}
              <div className="flex items-center space-x-4">
                <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                  Physical Documents & Mobile
                </h1>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center space-x-1 bg-white/10 rounded-lg p-1 max-w-full overflow-x-auto">
                {tabs.slice(0, 3).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`
                      flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap
                      ${activeTab === tab.id
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                      }
                    `}
                  >
                    <span>{tab.icon}</span>
                    <span className="hidden md:block">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Secondary Tab Navigation for Mobile and Advanced Components */}
            {activeTab !== 'overview' && activeTab !== 'barcode-management' && activeTab !== 'location-manager' && (
              <div className="flex items-center space-x-1 bg-white/5 rounded-lg p-1 max-w-full overflow-x-auto">
                {tabs.slice(3).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`
                      flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 whitespace-nowrap
                      ${activeTab === tab.id
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                      }
                    `}
                  >
                    <span>{tab.icon}</span>
                    <span className="hidden lg:block">{tab.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="p-6">
            <div className="max-w-6xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Physical Documents & Mobile Overview</h2>
                <p className="text-white/70">Manage physical documents, barcodes, locations, and mobile scanning capabilities.</p>
              </div>

              <div className="glass-panel rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Physical Document Management */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">📊</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Barcode Management</h3>
                    <p className="text-white/60 text-sm mb-4">Generate, validate, and manage barcodes for physical documents</p>
                    <button
                      onClick={() => handleTabChange('barcode-management')}
                      className="btn-glass px-4 py-2 text-sm text-white rounded-md hover:scale-105 transition-all duration-300"
                    >
                      Manage Barcodes
                    </button>
                  </div>

                  {/* Location Management */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">📍</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Location Management</h3>
                    <p className="text-white/60 text-sm mb-4">Track and organize physical document locations</p>
                    <button
                      onClick={() => handleTabChange('location-manager')}
                      className="btn-glass px-4 py-2 text-sm text-white rounded-md hover:scale-105 transition-all duration-300"
                    >
                      Manage Locations
                    </button>
                  </div>

                  {/* Mobile Scanning */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">📱</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Mobile Scanning</h3>
                    <p className="text-white/60 text-sm mb-4">Scan barcodes and capture documents on mobile devices</p>
                    <button
                      onClick={() => handleTabChange('mobile-scanner')}
                      className="btn-glass px-4 py-2 text-sm text-white rounded-md hover:scale-105 transition-all duration-300"
                    >
                      Start Scanning
                    </button>
                  </div>

                  {/* Print Management */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🖨️</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Print Management</h3>
                    <p className="text-white/60 text-sm mb-4">Design templates and manage label printing</p>
                    <button
                      onClick={() => handleTabChange('print-manager')}
                      className="btn-glass px-4 py-2 text-sm text-white rounded-md hover:scale-105 transition-all duration-300"
                    >
                      Manage Printing
                    </button>
                  </div>

                  {/* Asset Tagging */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🏷️</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Asset Tagging</h3>
                    <p className="text-white/60 text-sm mb-4">Tag and track physical assets with barcodes</p>
                    <button
                      onClick={() => handleTabChange('asset-tagging')}
                      className="btn-glass px-4 py-2 text-sm text-white rounded-md hover:scale-105 transition-all duration-300"
                    >
                      Manage Assets
                    </button>
                  </div>

                  {/* Batch Operations */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">📦</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Batch Operations</h3>
                    <p className="text-white/60 text-sm mb-4">Process multiple barcodes and documents at once</p>
                    <button
                      onClick={() => handleTabChange('barcode-management')}
                      className="btn-glass px-4 py-2 text-sm text-white rounded-md hover:scale-105 transition-all duration-300"
                    >
                      Batch Process
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Barcode Management Tab */}
        {activeTab === 'barcode-management' && (
          <div className="h-full">
            <BarcodeManagement />
          </div>
        )}






        {/* Location Manager Tab */}
        {activeTab === 'location-manager' && (
          <div className="h-full">
            <LocationManager />
          </div>
        )}


        {/* Asset Tagging Tab */}
        {activeTab === 'asset-tagging' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Asset Tagging System</h2>
                <p className="text-white/70">Tag and track physical assets with barcodes.</p>
              </div>
              <div className="glass-panel rounded-lg p-6">
                <AssetTaggingSystem onAssetTagged={(asset, barcode) => console.log('Asset tagged:', asset, barcode)} />
              </div>
            </div>
          </div>
        )}

        {/* Print Manager Tab */}
        {activeTab === 'print-manager' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Print Manager</h2>
                <p className="text-white/70">Manage label and barcode printing jobs.</p>
              </div>
              <div className="glass-panel rounded-lg p-6">
                <PrintManager
                  barcodeIds={[]}
                  onPrintComplete={(jobId) => console.log('Print complete:', jobId)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Print Templates Tab */}
        {activeTab === 'print-templates' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Print Template System</h2>
                <p className="text-white/70">Design and manage print templates for labels.</p>
              </div>
              <div className="glass-panel rounded-lg p-6">
                <PrintTemplateSystem onTemplateSelected={(templateId) => console.log('Template selected:', templateId)} />
              </div>
            </div>
          </div>
        )}

        {/* Printer Configuration Tab */}
        {activeTab === 'printer-config' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Printer Configuration</h2>
                <p className="text-white/70">Configure and manage printer settings.</p>
              </div>
              <div className="glass-panel rounded-lg p-6">
                <PrinterConfiguration onPrinterSelected={(printerId) => console.log('Printer selected:', printerId)} />
              </div>
            </div>
          </div>
        )}

        {/* Mobile Scanner Tab */}
        {activeTab === 'mobile-scanner' && (
          <div className="h-full">
            <MobileScanner />
          </div>
        )}

        {/* Mobile Document Capture Tab */}
        {activeTab === 'mobile-capture' && (
          <div className="h-full">
            <MobileDocumentCapture />
          </div>
        )}

        {/* Mobile Batch Scanning Tab */}
        {activeTab === 'mobile-batch' && (
          <div className="h-full">
            <MobileBatchScanning />
          </div>
        )}

        {/* Camera Scanner Tab */}
        {activeTab === 'camera-scanner' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Camera Scanner</h2>
                <p className="text-white/70">Advanced camera scanning component.</p>
              </div>
              <div className="glass-panel rounded-lg p-6">
                <CameraScanner
                  isActive={true}
                  onScanSuccess={() => console.log('Scan success')}
                  onScanError={(error) => console.log('Scan error:', error)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Document Capture Tab */}
        {activeTab === 'document-capture' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Document Capture</h2>
                <p className="text-white/70">Advanced document capture with edge detection.</p>
              </div>
              <div className="glass-panel rounded-lg p-6">
                <DocumentCapture
                  isActive={true}
                  onCaptureSuccess={(documentId) => console.log('Capture success:', documentId)}
                  onCaptureError={(error) => console.log('Capture error:', error)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Batch Scanner Tab */}
        {activeTab === 'batch-scanner' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Batch Scanner</h2>
                <p className="text-white/70">Batch scanning component for mobile devices.</p>
              </div>
              <div className="glass-panel rounded-lg p-6">
                <BatchScanner
                  mode="barcode"
                  onBatchComplete={(batchId) => console.log('Batch complete:', batchId)}
                  onBatchError={(error) => console.log('Batch error:', error)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Mobile Location Tab */}
        {activeTab === 'mobile-location' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Mobile Location Manager</h2>
                <p className="text-white/70">Location management for mobile devices.</p>
              </div>
              <div className="glass-panel rounded-lg p-6">
                <MobileLocationManager
                  onLocationCaptured={handleLocationCaptured}
                  onLocationError={handleLocationError}
                  isVisible={locationManagerVisible}
                  onClose={() => setLocationManagerVisible(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Image Enhancer Tab */}
        {activeTab === 'image-enhancer' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Image Enhancer</h2>
                <p className="text-white/70">Enhance captured images for better recognition.</p>
              </div>
              <div className="glass-panel rounded-lg p-6">
                <ImageEnhancer
                  originalImage=""
                  onEnhancementComplete={handleEnhancementComplete}
                  onCancel={() => setImageEnhancerVisible(false)}
                  isVisible={imageEnhancerVisible}
                />
              </div>
            </div>
          </div>
        )}

        {/* Mobile Barcode Validator Tab */}
        {activeTab === 'mobile-validator' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Mobile Barcode Validator</h2>
                <p className="text-white/70">Validate barcodes on mobile devices.</p>
              </div>
              <div className="glass-panel rounded-lg p-6">
                <MobileBarcodeValidator
                  barcode=""
                  format={BarcodeFormat.CODE_128}
                  onValidationComplete={handleValidationComplete}
                  onRetryRequested={handleRetryRequested}
                  isVisible={barcodeValidatorVisible}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhysicalDocsPage;
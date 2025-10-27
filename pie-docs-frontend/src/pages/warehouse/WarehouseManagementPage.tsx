import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { warehouseServices } from '@/services/warehouseService';
import type { Location, EntityCounts, CapacityStats } from '@/types/warehouse';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import LocationManagement from '@/components/warehouse/LocationManagement';
import WarehouseManagement from '@/components/warehouse/WarehouseManagement';
import ZoneManagement from '@/components/warehouse/ZoneManagement';
import ShelfManagement from '@/components/warehouse/ShelfManagement';
import RackManagement from '@/components/warehouse/RackManagement';
import PhysicalDocumentManagement from '@/components/warehouse/PhysicalDocumentManagement';
import WarehouseHierarchyViewer from '@/components/warehouse/WarehouseHierarchyViewer';
import BarcodeScannerIntegration from '@/components/warehouse/BarcodeScannerIntegration';
import DocumentMovementManager from '@/components/warehouse/DocumentMovementManager';
import WarehousePrintManager from '@/components/warehouse/WarehousePrintManager';
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
import { LocationManager } from '@/components/physical/LocationManager';
import MobileScanner from '@/pages/mobile/MobileScanner';
import MobileDocumentCapture from '@/pages/mobile/MobileDocumentCapture';
import MobileBatchScanning from '@/pages/mobile/MobileBatchScanning';
import CameraScanner from '@/components/mobile/CameraScanner';
import DocumentCapture from '@/components/mobile/DocumentCapture';
import BatchScanner from '@/components/mobile/BatchScanner';
import { default as MobileLocationManager } from '@/components/mobile/LocationManager';
import ImageEnhancer from '@/components/mobile/ImageEnhancer';
import { default as MobileBarcodeValidator } from '@/components/mobile/BarcodeValidator';
import { BarcodeFormat } from '@zxing/library';

type TabType = 'overview' | 'locations' | 'warehouses' | 'zones' | 'shelves' | 'racks' | 'documents' | 'hierarchy' | 'assignments' | 'movements' | 'utilities';

export const WarehouseManagementPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'overview');
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [entityCounts, setEntityCounts] = useState<EntityCounts | null>(null);
  const [capacityStats, setCapacityStats] = useState<CapacityStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [utilitiesView, setUtilitiesView] = useState<'generate' | 'qrcode' | 'history' | 'batch' | 'validate' | 'standards' | 'assets' | 'print' | 'templates' | 'printers' | 'location-manager' | 'mobile-scanner' | 'mobile-capture' | 'mobile-batch' | 'camera-scanner' | 'document-capture' | 'batch-scanner' | 'mobile-location' | 'image-enhancer' | 'mobile-validator' | 'warehouse-scanner' | 'warehouse-print'>('generate');
  const [selectedBarcodes, setSelectedBarcodes] = useState<string[]>([]);
  const { barcodes } = useAppSelector(state => state.physicalDocs);
  const [locationManagerVisible, setLocationManagerVisible] = useState(true);
  const [imageEnhancerVisible, setImageEnhancerVisible] = useState(true);
  const [barcodeValidatorVisible, setBarcodeValidatorVisible] = useState(true);

  // Update active tab when URL param changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Fetch initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Fetch capacity stats when location changes
  useEffect(() => {
    if (selectedLocation) {
      loadCapacityStats();
    }
  }, [selectedLocation]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load locations
      const locationsData = await warehouseServices.locations.list({ status: 'active' });
      setLocations(locationsData);

      // Select first location if available
      if (locationsData.length > 0) {
        setSelectedLocation(locationsData[0]);
      }

      // Load entity counts
      const counts = await warehouseServices.stats.getCounts();
      setEntityCounts(counts);

    } catch (err: any) {
      setError(err.message || 'Failed to load warehouse data');
      console.error('Error loading warehouse data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCapacityStats = async () => {
    if (!selectedLocation) return;

    try {
      const stats = await warehouseServices.stats.getCapacityStats();
      setCapacityStats(stats);
    } catch (err) {
      console.error('Error loading capacity stats:', err);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'locations', label: 'Locations', icon: '🌍' },
    { id: 'warehouses', label: 'Warehouses', icon: '🏭' },
    { id: 'zones', label: 'Zones', icon: '📦' },
    { id: 'shelves', label: 'Shelves', icon: '📚' },
    { id: 'racks', label: 'Racks', icon: '🗄️' },
    { id: 'documents', label: 'Documents', icon: '📄' },
    { id: 'movements', label: 'Movements', icon: '🔄' },
    { id: 'hierarchy', label: 'Hierarchy', icon: '🌳' },
    { id: 'assignments', label: 'Assignments', icon: '👥' },
    { id: 'utilities', label: 'Utilities', icon: '🔧' }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">🌍</div>
            <div>
              <p className="text-sm text-gray-300">Locations</p>
              <p className="text-2xl font-bold text-white">{entityCounts?.locations || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">🏭</div>
            <div>
              <p className="text-sm text-gray-300">Warehouses</p>
              <p className="text-2xl font-bold text-white">{entityCounts?.warehouses || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">📦</div>
            <div>
              <p className="text-sm text-gray-300">Zones</p>
              <p className="text-2xl font-bold text-white">{entityCounts?.zones || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">📚</div>
            <div>
              <p className="text-sm text-gray-300">Shelves</p>
              <p className="text-2xl font-bold text-white">{entityCounts?.shelves || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">🗄️</div>
            <div>
              <p className="text-sm text-gray-300">Racks</p>
              <p className="text-2xl font-bold text-white">{entityCounts?.racks || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">📄</div>
            <div>
              <p className="text-sm text-gray-300">Documents</p>
              <p className="text-2xl font-bold text-white">{entityCounts?.documents || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Capacity Overview */}
      <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg border border-white/20">
        <div className="px-6 py-4 border-b border-white/20">
          <h3 className="text-lg font-semibold text-white">Capacity Utilization</h3>
        </div>
        <div className="p-6">
          {capacityStats.length === 0 ? (
            <p className="text-gray-300 text-center py-8">No capacity data available</p>
          ) : (
            <div className="space-y-4">
              {capacityStats.slice(0, 10).map((stat) => (
                <div key={stat.entity_id} className="border-b border-white/10 pb-4 last:border-0">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-white">{stat.entity_name}</span>
                      <span className="text-xs text-gray-300 uppercase">{stat.entity_type}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-white">
                        {stat.current_capacity} / {stat.max_capacity}
                      </span>
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        stat.status === 'full' ? 'bg-red-500/30 text-red-200 border border-red-400/50' :
                        stat.status === 'high' ? 'bg-orange-500/30 text-orange-200 border border-orange-400/50' :
                        stat.status === 'normal' ? 'bg-blue-500/30 text-blue-200 border border-blue-400/50' :
                        'bg-green-500/30 text-green-200 border border-green-400/50'
                      }`}>
                        {stat.utilization_percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        stat.status === 'full' ? 'bg-red-500' :
                        stat.status === 'high' ? 'bg-orange-500' :
                        stat.status === 'normal' ? 'bg-blue-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(stat.utilization_percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveTab('locations')}
          className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all text-left"
        >
          <div className="text-3xl mb-2">🌍</div>
          <h3 className="text-lg font-semibold text-white mb-1">Manage Locations</h3>
          <p className="text-sm text-gray-300">Add or edit physical locations</p>
        </button>

        <button
          onClick={() => setActiveTab('warehouses')}
          className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all text-left"
        >
          <div className="text-3xl mb-2">🏭</div>
          <h3 className="text-lg font-semibold text-white mb-1">Manage Warehouses</h3>
          <p className="text-sm text-gray-300">Configure warehouse facilities</p>
        </button>

        <button
          onClick={() => setActiveTab('racks')}
          className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all text-left"
        >
          <div className="text-3xl mb-2">🗄️</div>
          <h3 className="text-lg font-semibold text-white mb-1">Manage Racks</h3>
          <p className="text-sm text-gray-300">Organize storage racks</p>
        </button>

        <button
          onClick={() => setActiveTab('hierarchy')}
          className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all text-left"
        >
          <div className="text-3xl mb-2">🌳</div>
          <h3 className="text-lg font-semibold text-white mb-1">View Hierarchy</h3>
          <p className="text-sm text-gray-300">Explore warehouse structure</p>
        </button>
      </div>
    </div>
  );

  const handleBarcodeGenerated = (barcode: { code: string; image: string }) => {
    console.log('New barcode generated:', barcode);
  };

  const handleQRGenerated = (qr: { code: string; image: string; metadata?: any }) => {
    console.log('New QR code generated:', qr);
  };

  const handleBarcodeSelect = (barcodeId: string, selected: boolean) => {
    if (selected) {
      setSelectedBarcodes(prev => [...prev, barcodeId]);
    } else {
      setSelectedBarcodes(prev => prev.filter(id => id !== barcodeId));
    }
  };

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

  const renderUtilitiesContent = () => {
    switch (utilitiesView) {
      case 'generate':
        return (
          <GenerateTab
            onBarcodeGenerated={handleBarcodeGenerated}
            onNavigateTab={(tab) => console.log('Navigate to', tab)}
          />
        );
      case 'qrcode':
        return (
          <QRCodeTab
            onQRGenerated={handleQRGenerated}
            onNavigateTab={(tab) => console.log('Navigate to', tab)}
          />
        );
      case 'history':
        return (
          <HistoryTab
            barcodes={barcodes.generated}
            selectedBarcodes={selectedBarcodes}
            onBarcodeSelect={handleBarcodeSelect}
            onNavigateTab={(tab) => console.log('Navigate to', tab)}
          />
        );
      case 'batch':
        return <BatchGenerator onBatchGenerated={(codes) => { console.log('Batch generated', codes); setUtilitiesView('history'); }} />;
      case 'validate':
        return <BarcodeValidator onValidationComplete={(result) => console.log('Validation complete', result)} />;
      case 'standards':
        return <BarcodeStandardsManager onFormatSelected={(format) => console.log('Format selected', format)} />;
      case 'assets':
        return <AssetTaggingSystem onAssetTagged={(asset, barcode) => console.log('Asset tagged', asset, barcode)} />;
      case 'print':
        return (
          <PrintManager
            barcodeIds={selectedBarcodes.length > 0 ? selectedBarcodes : barcodes.generated.map(b => b.id)}
            onPrintComplete={(jobId) => console.log('Print complete', jobId)}
          />
        );
      case 'templates':
        return <PrintTemplateSystem onTemplateSelected={(templateId) => console.log('Template selected', templateId)} />;
      case 'printers':
        return <PrinterConfiguration onPrinterSelected={(printerId) => console.log('Printer selected', printerId)} />;
      case 'location-manager':
        return <LocationManager />;
      case 'mobile-scanner':
        return <MobileScanner />;
      case 'mobile-capture':
        return <MobileDocumentCapture />;
      case 'mobile-batch':
        return <MobileBatchScanning />;
      case 'camera-scanner':
        return (
          <CameraScanner
            isActive={true}
            onScanSuccess={() => console.log('Scan success')}
            onScanError={(error) => console.log('Scan error:', error)}
          />
        );
      case 'document-capture':
        return (
          <DocumentCapture
            isActive={true}
            onCaptureSuccess={(documentId) => console.log('Capture success:', documentId)}
            onCaptureError={(error) => console.log('Capture error:', error)}
          />
        );
      case 'batch-scanner':
        return (
          <BatchScanner
            mode="barcode"
            onBatchComplete={(batchId) => console.log('Batch complete:', batchId)}
            onBatchError={(error) => console.log('Batch error:', error)}
          />
        );
      case 'mobile-location':
        return (
          <MobileLocationManager
            onLocationCaptured={handleLocationCaptured}
            onLocationError={handleLocationError}
            isVisible={locationManagerVisible}
            onClose={() => setLocationManagerVisible(false)}
          />
        );
      case 'image-enhancer':
        return (
          <ImageEnhancer
            originalImage=""
            onEnhancementComplete={handleEnhancementComplete}
            onCancel={() => setImageEnhancerVisible(false)}
            isVisible={imageEnhancerVisible}
          />
        );
      case 'mobile-validator':
        return (
          <MobileBarcodeValidator
            barcode=""
            format={BarcodeFormat.CODE_128}
            onValidationComplete={handleMobileValidationComplete}
            onRetryRequested={handleRetryRequested}
            isVisible={barcodeValidatorVisible}
          />
        );
      case 'warehouse-scanner':
        return <BarcodeScannerIntegration />;
      case 'warehouse-print':
        return <WarehousePrintManager />;
      default:
        return null;
    }
  };

  const renderUtilities = () => {
    const utilityTools = [
      { id: 'generate' as const, label: 'Generate Barcode', icon: '📊', category: 'Barcode' },
      { id: 'qrcode' as const, label: 'QR Code Generator', icon: '📱', category: 'Barcode' },
      { id: 'history' as const, label: 'Generated Barcodes', icon: '📋', category: 'Barcode' },
      { id: 'batch' as const, label: 'Batch Operations', icon: '📦', category: 'Barcode' },
      { id: 'validate' as const, label: 'Validate Barcodes', icon: '🔍', category: 'Barcode' },
      { id: 'standards' as const, label: 'Barcode Standards', icon: '📋', category: 'Barcode' },
      { id: 'assets' as const, label: 'Asset Tagging', icon: '🏷️', category: 'Management' },
      { id: 'location-manager' as const, label: 'Location Manager', icon: '📍', category: 'Management' },
      { id: 'print' as const, label: 'Print Labels', icon: '🖨️', category: 'Printing' },
      { id: 'templates' as const, label: 'Label Designer', icon: '🎨', category: 'Printing' },
      { id: 'printers' as const, label: 'Printer Setup', icon: '⚙️', category: 'Printing' },
      { id: 'warehouse-print' as const, label: 'Warehouse Print Manager', icon: '🖨️', category: 'Printing' },
      { id: 'mobile-scanner' as const, label: 'Mobile Scanner', icon: '📱', category: 'Mobile' },
      { id: 'mobile-capture' as const, label: 'Mobile Document Capture', icon: '📷', category: 'Mobile' },
      { id: 'mobile-batch' as const, label: 'Mobile Batch Scanning', icon: '📦', category: 'Mobile' },
      { id: 'camera-scanner' as const, label: 'Camera Scanner', icon: '📸', category: 'Scanners' },
      { id: 'document-capture' as const, label: 'Document Capture', icon: '📄', category: 'Scanners' },
      { id: 'batch-scanner' as const, label: 'Batch Scanner', icon: '🔄', category: 'Scanners' },
      { id: 'warehouse-scanner' as const, label: 'Warehouse Scanner', icon: '📷', category: 'Scanners' },
      { id: 'mobile-location' as const, label: 'Mobile Location', icon: '📍', category: 'Mobile' },
      { id: 'image-enhancer' as const, label: 'Image Enhancer', icon: '✨', category: 'Tools' },
      { id: 'mobile-validator' as const, label: 'Mobile Barcode Validator', icon: '✅', category: 'Mobile' },
    ];

    // Group tools by category
    const categories = Array.from(new Set(utilityTools.map(t => t.category)));
    const groupedTools = categories.map(category => ({
      category,
      tools: utilityTools.filter(t => t.category === category)
    }));

    return (
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-4 sticky top-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Utility Tools</h3>
            <nav className="space-y-4">
              {groupedTools.map(({ category, tools }) => (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 px-2">{category}</h4>
                  <div className="space-y-1">
                    {tools.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => setUtilitiesView(tool.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center space-x-2 ${
                          utilitiesView === tool.id
                            ? 'bg-white/20 text-white border border-white/30'
                            : 'text-gray-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className="text-lg">{tool.icon}</span>
                        <span className="text-xs font-medium">{tool.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {renderUtilitiesContent()}
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'locations':
        return <LocationManagement />;
      case 'warehouses':
        return <WarehouseManagement />;
      case 'zones':
        return <ZoneManagement />;
      case 'shelves':
        return <ShelfManagement />;
      case 'racks':
        return <RackManagement />;
      case 'documents':
        return <PhysicalDocumentManagement />;
      case 'movements':
        return <DocumentMovementManager />;
      case 'hierarchy':
        return selectedLocation ? (
          <WarehouseHierarchyViewer locationId={selectedLocation.id} />
        ) : (
          <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-6">
            <p className="text-gray-300 text-center">Please select a location to view hierarchy</p>
          </div>
        );
      case 'utilities':
        return renderUtilities();
      case 'assignments':
        return (
          <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Customer Rack Assignments</h3>
            <p className="text-gray-300">Customer assignment component will be implemented next</p>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading warehouse data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-8 max-w-md">
          <div className="text-red-400 text-5xl mb-4 text-center">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2 text-center">Error Loading Data</h2>
          <p className="text-gray-300 text-center mb-4">{error}</p>
          <button
            onClick={loadInitialData}
            className="w-full bg-blue-500/30 backdrop-blur-sm text-white border border-blue-400/50 px-4 py-2 rounded-md hover:bg-blue-500/50 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  Warehouse Management System
                </h1>
                <p className="mt-2 text-sm sm:text-base text-gray-300">
                  Physical document archiving and storage management
                </p>
              </div>

              {/* Location Selector */}
              {locations.length > 0 && (
                <div className="mt-4 sm:mt-0">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Active Location
                  </label>
                  <select
                    value={selectedLocation?.id || ''}
                    onChange={(e) => {
                      const location = locations.find(l => l.id === e.target.value);
                      setSelectedLocation(location || null);
                    }}
                    className="block w-full pl-3 pr-10 py-2 text-base bg-white/10 backdrop-blur-md border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 sm:text-sm rounded-md"
                  >
                    {locations.map(location => (
                      <option key={location.id} value={location.id} className="bg-gray-800">
                        {location.name} ({location.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-6 bg-white/10 backdrop-blur-md border-b border-white/20 rounded-t-lg">
            <nav className="flex space-x-1 overflow-x-auto px-4" style={{ scrollBehavior: 'smooth' }}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-400 text-white'
                      : 'border-transparent text-gray-300 hover:text-white hover:border-gray-400'
                  } whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="pb-8">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default WarehouseManagementPage;

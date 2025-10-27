import React, { useState, useEffect, useRef } from 'react';
import {
  ScanLine,
  Search,
  AlertCircle,
  CheckCircle,
  X,
  MapPin,
  Building2,
  Package,
  Layers,
  Archive,
  FileText,
  History,
  Camera,
  Zap
} from 'lucide-react';
import warehouseServices from '@/services/warehouseService';
import type {
  Zone,
  Shelf,
  Rack,
  PhysicalDocument
} from '@/types/warehouse';

interface ScanResult {
  type: 'zone' | 'shelf' | 'rack' | 'document' | 'unknown';
  barcode: string;
  entity?: Zone | Shelf | Rack | PhysicalDocument;
  timestamp: Date;
  success: boolean;
  error?: string;
}

interface BarcodeScannerIntegrationProps {
  onEntityFound?: (type: string, entity: any) => void;
  autoNavigate?: boolean;
  bulkMode?: boolean;
}

const BarcodeScannerIntegration: React.FC<BarcodeScannerIntegrationProps> = ({
  onEntityFound,
  autoNavigate = false,
  bulkMode = false
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus the input field when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const detectBarcodeType = (barcode: string): 'zone' | 'shelf' | 'rack' | 'document' | 'unknown' => {
    const upperBarcode = barcode.toUpperCase();

    if (upperBarcode.startsWith('ZN-') || upperBarcode.includes('ZONE')) {
      return 'zone';
    } else if (upperBarcode.startsWith('SH-') || upperBarcode.includes('SHELF')) {
      return 'shelf';
    } else if (upperBarcode.startsWith('RK-') || upperBarcode.includes('RACK')) {
      return 'rack';
    } else if (upperBarcode.startsWith('DOC-') || upperBarcode.includes('DOCUMENT')) {
      return 'document';
    }

    // Try to detect by pattern if prefix doesn't match
    if (/^[A-Z]{2,4}-\d{8}-[A-Z0-9]{4}$/.test(upperBarcode)) {
      return 'rack'; // Default to rack for standard pattern
    }

    return 'unknown';
  };

  const lookupEntity = async (barcode: string, type: 'zone' | 'shelf' | 'rack' | 'document'): Promise<any> => {
    try {
      switch (type) {
        case 'zone':
          const zones = await warehouseServices.zones.getZones({ barcode });
          return zones.length > 0 ? zones[0] : null;

        case 'shelf':
          const shelves = await warehouseServices.shelves.getShelves({ barcode });
          return shelves.length > 0 ? shelves[0] : null;

        case 'rack':
          return await warehouseServices.racks.getRackByBarcode(barcode);

        case 'document':
          return await warehouseServices.documents.getDocumentByBarcode(barcode);

        default:
          return null;
      }
    } catch (error) {
      console.error(`Error looking up ${type}:`, error);
      return null;
    }
  };

  const handleScan = async () => {
    if (!barcodeInput.trim()) {
      return;
    }

    setScanning(true);
    const barcode = barcodeInput.trim();
    const detectedType = detectBarcodeType(barcode);

    const result: ScanResult = {
      type: detectedType,
      barcode,
      timestamp: new Date(),
      success: false
    };

    if (detectedType === 'unknown') {
      result.error = 'Unable to determine barcode type';
      setCurrentResult(result);
      setScanHistory([result, ...scanHistory]);
      setScanning(false);

      if (!bulkMode) {
        setBarcodeInput('');
      }
      return;
    }

    try {
      const entity = await lookupEntity(barcode, detectedType);

      if (entity) {
        result.entity = entity;
        result.success = true;
        setCurrentResult(result);
        setScanHistory([result, ...scanHistory]);

        // Update barcode status to 'scanned' if needed
        try {
          switch (detectedType) {
            case 'zone':
              if (entity.barcode_status !== 'scanned') {
                await warehouseServices.zones.updateZone(entity.id, { barcode_status: 'scanned' });
              }
              break;
            case 'shelf':
              if (entity.barcode_status !== 'scanned') {
                await warehouseServices.shelves.updateShelf(entity.id, { barcode_status: 'scanned' });
              }
              break;
            case 'rack':
              if (entity.barcode_status !== 'scanned') {
                await warehouseServices.racks.updateRack(entity.id, { barcode_status: 'scanned' });
              }
              break;
            case 'document':
              if (entity.barcode_status !== 'scanned') {
                await warehouseServices.documents.updateDocument(entity.id, { barcode_status: 'scanned' });
              }
              break;
          }
        } catch (updateError) {
          console.error('Error updating barcode status:', updateError);
        }

        if (onEntityFound) {
          onEntityFound(detectedType, entity);
        }
      } else {
        result.error = `${detectedType.charAt(0).toUpperCase() + detectedType.slice(1)} not found`;
        setCurrentResult(result);
        setScanHistory([result, ...scanHistory]);
      }
    } catch (error) {
      result.error = `Error scanning barcode: ${error}`;
      setCurrentResult(result);
      setScanHistory([result, ...scanHistory]);
    }

    setScanning(false);

    if (!bulkMode) {
      setBarcodeInput('');
    }

    // Refocus input for next scan
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'zone':
        return <Package className="h-5 w-5 text-purple-500" />;
      case 'shelf':
        return <Layers className="h-5 w-5 text-blue-500" />;
      case 'rack':
        return <Archive className="h-5 w-5 text-green-500" />;
      case 'document':
        return <FileText className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getEntityDetails = (result: ScanResult) => {
    if (!result.entity) return null;

    const entity = result.entity as any;

    switch (result.type) {
      case 'zone':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Name:</span>
              <span className="text-sm font-medium">{entity.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Zone Type:</span>
              <span className="text-sm font-medium">{entity.zone_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Capacity:</span>
              <span className="text-sm font-medium">{entity.current_capacity}/{entity.max_capacity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`text-sm font-medium ${entity.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>
                {entity.status}
              </span>
            </div>
          </div>
        );

      case 'shelf':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Name:</span>
              <span className="text-sm font-medium">{entity.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Position:</span>
              <span className="text-sm font-medium">
                Row {entity.position.row}, Col {entity.position.column}, Level {entity.position.level}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Type:</span>
              <span className="text-sm font-medium">{entity.shelf_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Weight Capacity:</span>
              <span className="text-sm font-medium">{entity.weight_capacity_kg} kg</span>
            </div>
          </div>
        );

      case 'rack':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Name:</span>
              <span className="text-sm font-medium">{entity.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Position:</span>
              <span className="text-sm font-medium">{entity.position_on_shelf}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Documents:</span>
              <span className="text-sm font-medium">{entity.current_document_count}/{entity.max_document_capacity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Assignment:</span>
              <span className="text-sm font-medium">{entity.rack_assignment_type}</span>
            </div>
          </div>
        );

      case 'document':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Document Type:</span>
              <span className="text-sm font-medium">{entity.document_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Condition:</span>
              <span className="text-sm font-medium">{entity.physical_condition}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`text-sm font-medium ${entity.status === 'stored' ? 'text-green-600' : 'text-orange-600'}`}>
                {entity.status}
              </span>
            </div>
            {entity.conservation_priority && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Priority:</span>
                <span className={`text-sm font-medium ${
                  entity.conservation_priority === 'critical' ? 'text-red-600' :
                  entity.conservation_priority === 'high' ? 'text-orange-600' :
                  'text-gray-600'
                }`}>
                  {entity.conservation_priority}
                </span>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const clearHistory = () => {
    setScanHistory([]);
    setCurrentResult(null);
  };

  const activateCamera = () => {
    // Placeholder for camera integration
    setCameraActive(!cameraActive);
    alert('Camera barcode scanning will be implemented with a barcode scanning library (e.g., QuaggaJS, ZXing)');
  };

  return (
    <div className="space-y-6">
      {/* Scanner Input Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <ScanLine className="h-6 w-6 text-indigo-600" />
          <h2 className="text-xl font-semibold">Barcode Scanner</h2>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                ref={inputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Scan or enter barcode..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={scanning}
              />
            </div>
            <button
              onClick={handleScan}
              disabled={scanning || !barcodeInput.trim()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {scanning ? (
                <>
                  <Zap className="h-5 w-5 animate-pulse" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  Scan
                </>
              )}
            </button>
            <button
              onClick={activateCamera}
              className={`px-4 py-2 ${cameraActive ? 'bg-green-600' : 'bg-gray-600'} text-white rounded-lg hover:bg-opacity-80 flex items-center gap-2`}
            >
              <Camera className="h-5 w-5" />
              Camera
            </button>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-500" />
              <span>Zone (ZN-)</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-500" />
              <span>Shelf (SH-)</span>
            </div>
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-green-500" />
              <span>Rack (RK-)</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-500" />
              <span>Document (DOC-)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Scan Result */}
      {currentResult && (
        <div className={`p-6 rounded-lg shadow-md ${
          currentResult.success ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {currentResult.success ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-600" />
              )}
              <div>
                <h3 className="text-lg font-semibold">
                  {currentResult.success ? 'Scan Successful' : 'Scan Failed'}
                </h3>
                <p className="text-sm text-gray-600">
                  Barcode: <span className="font-mono font-medium">{currentResult.barcode}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setCurrentResult(null)}
              className="text-gray-300 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {currentResult.success && currentResult.entity ? (
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                {getEntityIcon(currentResult.type)}
                <span className="font-semibold capitalize">{currentResult.type} Details</span>
              </div>
              {getEntityDetails(currentResult)}
            </div>
          ) : (
            <div className="text-red-700">
              <p className="font-medium">{currentResult.error}</p>
            </div>
          )}
        </div>
      )}

      {/* Scan History */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-gray-600" />
            <h3 className="text-lg font-semibold">Scan History</h3>
            <span className="text-sm text-gray-500">({scanHistory.length} scans)</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              {showHistory ? 'Hide' : 'Show'}
            </button>
            {scanHistory.length > 0 && (
              <button
                onClick={clearHistory}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {showHistory && scanHistory.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {scanHistory.map((scan, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  scan.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getEntityIcon(scan.type)}
                    <span className="font-mono text-sm">{scan.barcode}</span>
                    <span className="text-xs text-gray-500 capitalize">({scan.type})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      {scan.timestamp.toLocaleTimeString()}
                    </span>
                    {scan.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </div>
                {scan.error && (
                  <p className="text-xs text-red-600 mt-1">{scan.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {showHistory && scanHistory.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <ScanLine className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No scans yet. Start scanning barcodes above.</p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {scanHistory.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-md text-center">
            <div className="text-2xl font-bold text-indigo-600">{scanHistory.length}</div>
            <div className="text-sm text-gray-600">Total Scans</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md text-center">
            <div className="text-2xl font-bold text-green-600">
              {scanHistory.filter(s => s.success).length}
            </div>
            <div className="text-sm text-gray-600">Successful</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md text-center">
            <div className="text-2xl font-bold text-red-600">
              {scanHistory.filter(s => !s.success).length}
            </div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md text-center">
            <div className="text-2xl font-bold text-purple-600">
              {new Set(scanHistory.filter(s => s.success).map(s => s.barcode)).size}
            </div>
            <div className="text-sm text-gray-600">Unique Items</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeScannerIntegration;

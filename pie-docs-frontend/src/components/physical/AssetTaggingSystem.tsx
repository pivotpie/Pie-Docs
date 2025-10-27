import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { barcodeGenerator } from '@/utils/barcodeGenerator';
import type { PhysicalAsset, StorageLocation, BarcodeRecord } from '@/store/slices/physicalDocsSlice';

interface AssetTaggingSystemProps {
  onAssetTagged?: (asset: PhysicalAsset, barcode: BarcodeRecord) => void;
  className?: string;
}

interface AssetData {
  id?: string;
  name: string;
  type: string;
  category: string;
  serialNumber: string;
  model: string;
  manufacturer: string;
  purchaseDate: string;
  purchasePrice: number;
  condition: 'new' | 'good' | 'fair' | 'poor';
  status: 'active' | 'maintenance' | 'retired';
  location: string;
  department: string;
  assignedTo: string;
  description: string;
  customFields: Record<string, string>;
}

export const AssetTaggingSystem: React.FC<AssetTaggingSystemProps> = ({
  onAssetTagged,
  className = '',
}) => {
  const dispatch = useAppDispatch();
  const { assets, configuration } = useAppSelector(state => state.physicalDocs);

  const [activeView, setActiveView] = useState<'register' | 'manage' | 'locations' | 'reports'>('register');
  const [assetData, setAssetData] = useState<AssetData>({
    name: '',
    type: '',
    category: '',
    serialNumber: '',
    model: '',
    manufacturer: '',
    purchaseDate: '',
    purchasePrice: 0,
    condition: 'new',
    status: 'active',
    location: '',
    department: '',
    assignedTo: '',
    description: '',
    customFields: {},
  });
  const [tagFormat, setTagFormat] = useState<string>('qr');
  const [previewImage, setPreviewImage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [newLocation, setNewLocation] = useState<Partial<StorageLocation>>({
    name: '',
    description: '',
    type: 'shelf',
  });

  const assetTypes = [
    { id: 'computer', name: 'Computer Equipment', icon: '💻' },
    { id: 'furniture', name: 'Office Furniture', icon: '🪑' },
    { id: 'vehicle', name: 'Vehicles', icon: '🚗' },
    { id: 'machinery', name: 'Machinery', icon: '⚙️' },
    { id: 'electronics', name: 'Electronics', icon: '📱' },
    { id: 'tools', name: 'Tools & Equipment', icon: '🔧' },
    { id: 'other', name: 'Other Assets', icon: '📦' },
  ];

  const categories = [
    'Hardware', 'Software', 'Furniture', 'Vehicles', 'Tools',
    'Electronics', 'Machinery', 'Infrastructure', 'Other'
  ];

  const departments = [
    'IT', 'Finance', 'HR', 'Operations', 'Marketing',
    'Sales', 'Administration', 'Maintenance', 'Security'
  ];

  // Generate asset tag preview
  useEffect(() => {
    if (assetData.name && assetData.type) {
      generateTagPreview();
    }
  }, [assetData.name, assetData.type, assetData.serialNumber, tagFormat]);

  const generateTagPreview = async () => {
    try {
      setIsGenerating(true);

      // Generate asset ID
      const assetId = `${assetData.type.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}`;

      // Create tag data based on format
      let tagData = '';
      if (tagFormat === 'qr') {
        const metadata = {
          assetId,
          name: assetData.name,
          type: assetData.type,
          serialNumber: assetData.serialNumber || '',
          location: assetData.location || '',
          assignedTo: assetData.assignedTo || '',
          lastUpdated: new Date().toISOString(),
        };
        tagData = JSON.stringify(metadata);
      } else {
        tagData = assetId;
      }

      const image = await barcodeGenerator.generateBarcodeImage(tagData, {
        format: tagFormat as any,
        width: tagFormat === 'qr' ? 256 : 2,
        height: tagFormat === 'qr' ? 256 : 50,
        displayValue: true,
      });

      setPreviewImage(image);
    } catch (error) {
      console.error('Failed to generate tag preview:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegisterAsset = async () => {
    if (!assetData.name || !assetData.type) {
      alert('Please fill in required fields (Name and Type)');
      return;
    }

    try {
      setIsGenerating(true);

      // Generate unique asset ID
      const assetId = `${assetData.type.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}`;

      // Generate barcode/tag
      let tagData = '';
      if (tagFormat === 'qr') {
        const metadata = {
          assetId,
          name: assetData.name,
          type: assetData.type,
          serialNumber: assetData.serialNumber || '',
          location: assetData.location || '',
          assignedTo: assetData.assignedTo || '',
          registeredDate: new Date().toISOString(),
        };
        tagData = JSON.stringify(metadata);
      } else {
        tagData = assetId;
      }

      const barcodeImage = await barcodeGenerator.generateBarcodeImage(tagData, {
        format: tagFormat as any,
        width: tagFormat === 'qr' ? 256 : 2,
        height: tagFormat === 'qr' ? 256 : 50,
        displayValue: true,
      });

      // Create barcode record
      const barcodeRecord: BarcodeRecord = {
        id: `barcode_${Date.now()}`,
        code: tagData,
        format: configuration.barcodeFormats.find(f => f.id === tagFormat) || configuration.barcodeFormats[0],
        assetId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        metadata: {
          assetType: assetData.type,
          assetName: assetData.name,
          imageData: barcodeImage,
        },
      };

      // Create asset record
      const asset: PhysicalAsset = {
        id: assetId,
        name: assetData.name,
        type: assetData.type,
        barcodeId: barcodeRecord.id,
        location: assetData.location,
        status: assetData.status,
        metadata: {
          category: assetData.category,
          serialNumber: assetData.serialNumber,
          model: assetData.model,
          manufacturer: assetData.manufacturer,
          purchaseDate: assetData.purchaseDate,
          purchasePrice: assetData.purchasePrice,
          condition: assetData.condition,
          department: assetData.department,
          assignedTo: assetData.assignedTo,
          description: assetData.description,
          customFields: assetData.customFields,
          registeredDate: new Date().toISOString(),
        },
      };

      if (onAssetTagged) {
        onAssetTagged(asset, barcodeRecord);
      }

      // Reset form
      setAssetData({
        name: '',
        type: '',
        category: '',
        serialNumber: '',
        model: '',
        manufacturer: '',
        purchaseDate: '',
        purchasePrice: 0,
        condition: 'new',
        status: 'active',
        location: '',
        department: '',
        assignedTo: '',
        description: '',
        customFields: {},
      });
      setPreviewImage('');

      alert('Asset registered successfully!');

    } catch (error) {
      console.error('Failed to register asset:', error);
      alert('Failed to register asset. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddLocation = () => {
    if (!newLocation.name) {
      alert('Please enter a location name');
      return;
    }

    const location: StorageLocation = {
      id: `location_${Date.now()}`,
      name: newLocation.name,
      description: newLocation.description,
      type: newLocation.type as 'shelf' | 'cabinet' | 'room' | 'building',
      parentId: newLocation.parentId,
    };

    // In a real app, this would dispatch to add the location
    console.log('Adding location:', location);

    setNewLocation({
      name: '',
      description: '',
      type: 'shelf',
    });

    alert('Location added successfully!');
  };

  const filteredAssets = assets.equipment.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Asset Tagging System</h3>
          <div className="text-sm text-gray-500">
            Total Assets: {assets.equipment.length}
          </div>
        </div>

        {/* Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'register', name: 'Register Asset', icon: '➕' },
              { id: 'manage', name: 'Manage Assets', icon: '📋' },
              { id: 'locations', name: 'Locations', icon: '📍' },
              { id: 'reports', name: 'Reports', icon: '📊' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Register Asset View */}
        {activeView === 'register' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Asset Information Form */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Asset Information</h4>

              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Asset Name *
                    </label>
                    <input
                      type="text"
                      value={assetData.name}
                      onChange={(e) => setAssetData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter asset name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type *
                    </label>
                    <select
                      value={assetData.type}
                      onChange={(e) => setAssetData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select type</option>
                      {assetTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.icon} {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={assetData.category}
                      onChange={(e) => setAssetData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Serial Number
                    </label>
                    <input
                      type="text"
                      value={assetData.serialNumber}
                      onChange={(e) => setAssetData(prev => ({ ...prev, serialNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter serial number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      value={assetData.manufacturer}
                      onChange={(e) => setAssetData(prev => ({ ...prev, manufacturer: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter manufacturer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model
                    </label>
                    <input
                      type="text"
                      value={assetData.model}
                      onChange={(e) => setAssetData(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter model"
                    />
                  </div>
                </div>

                {/* Location & Assignment */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <select
                      value={assetData.location}
                      onChange={(e) => setAssetData(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select location</option>
                      {assets.locations.map(location => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      value={assetData.department}
                      onChange={(e) => setAssetData(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select department</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned To
                    </label>
                    <input
                      type="text"
                      value={assetData.assignedTo}
                      onChange={(e) => setAssetData(prev => ({ ...prev, assignedTo: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter person's name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={assetData.status}
                      onChange={(e) => setAssetData(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="retired">Retired</option>
                    </select>
                  </div>
                </div>

                {/* Financial Info */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      value={assetData.purchaseDate}
                      onChange={(e) => setAssetData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Purchase Price
                    </label>
                    <input
                      type="number"
                      value={assetData.purchasePrice}
                      onChange={(e) => setAssetData(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Condition
                    </label>
                    <select
                      value={assetData.condition}
                      onChange={(e) => setAssetData(prev => ({ ...prev, condition: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="new">New</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={assetData.description}
                    onChange={(e) => setAssetData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter asset description..."
                  />
                </div>
              </div>
            </div>

            {/* Tag Generation */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Generate Asset Tag</h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tag Format
                  </label>
                  <select
                    value={tagFormat}
                    onChange={(e) => setTagFormat(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {configuration.barcodeFormats.map(format => (
                      <option key={format.id} value={format.id}>
                        {format.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tag Preview */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Tag Preview</h5>

                  {isGenerating ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-gray-500">Generating preview...</div>
                    </div>
                  ) : previewImage ? (
                    <div className="flex justify-center">
                      <img
                        src={previewImage}
                        alt="Asset tag preview"
                        className="max-w-full h-auto bg-white border rounded"
                        style={{ maxHeight: '200px' }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-gray-400">
                      Fill in asset details to see preview
                    </div>
                  )}
                </div>

                {/* Asset Tag Info */}
                {assetData.name && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h5 className="text-sm font-medium text-blue-900 mb-2">Tag Information</h5>
                    <div className="space-y-1 text-sm text-blue-800">
                      <div><strong>Asset Name:</strong> {assetData.name}</div>
                      <div><strong>Type:</strong> {assetData.type}</div>
                      {assetData.serialNumber && (
                        <div><strong>Serial:</strong> {assetData.serialNumber}</div>
                      )}
                      <div><strong>Format:</strong> {configuration.barcodeFormats.find(f => f.id === tagFormat)?.name}</div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleRegisterAsset}
                  disabled={isGenerating || !assetData.name || !assetData.type}
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Registering...' : 'Register Asset & Generate Tag'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage Assets View */}
        {activeView === 'manage' && (
          <div>
            {/* Search and Filter */}
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
            </div>

            {/* Assets List */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Asset
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No assets found. Register your first asset to get started.
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                            <div className="text-sm text-gray-500">{asset.id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {asset.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {asset.location || 'Not assigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            asset.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : asset.status === 'maintenance'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {asset.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-900">
                              View
                            </button>
                            <button className="text-green-600 hover:text-green-900">
                              Edit
                            </button>
                            <button className="text-purple-600 hover:text-purple-900">
                              Print Tag
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Locations View */}
        {activeView === 'locations' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add Location */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Add New Location</h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    value={newLocation.name || ''}
                    onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter location name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={newLocation.type || 'shelf'}
                    onChange={(e) => setNewLocation(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="shelf">Shelf</option>
                    <option value="cabinet">Cabinet</option>
                    <option value="room">Room</option>
                    <option value="building">Building</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newLocation.description || ''}
                    onChange={(e) => setNewLocation(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter location description..."
                  />
                </div>

                <button
                  onClick={handleAddLocation}
                  disabled={!newLocation.name}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Add Location
                </button>
              </div>
            </div>

            {/* Existing Locations */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Existing Locations</h4>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {assets.locations.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No locations defined yet.
                  </div>
                ) : (
                  assets.locations.map(location => (
                    <div key={location.id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900">{location.name}</h5>
                          <p className="text-sm text-gray-500 capitalize">{location.type}</p>
                          {location.description && (
                            <p className="text-sm text-gray-600 mt-1">{location.description}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-900 text-sm">
                            Edit
                          </button>
                          <button className="text-red-600 hover:text-red-900 text-sm">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reports View */}
        {activeView === 'reports' && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-6">Asset Reports</h4>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">{assets.equipment.length}</div>
                <div className="text-sm text-blue-700">Total Assets</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-900">
                  {assets.equipment.filter(a => a.status === 'active').length}
                </div>
                <div className="text-sm text-green-700">Active Assets</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-900">
                  {assets.equipment.filter(a => a.status === 'maintenance').length}
                </div>
                <div className="text-sm text-yellow-700">In Maintenance</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-900">
                  {assets.equipment.filter(a => a.status === 'retired').length}
                </div>
                <div className="text-sm text-red-700">Retired</div>
              </div>
            </div>

            {/* Asset Distribution by Type */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h5 className="text-md font-medium text-gray-900 mb-4">Asset Distribution by Type</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {assetTypes.map(type => {
                  const count = assets.equipment.filter(a => a.type === type.id).length;
                  return (
                    <div key={type.id} className="text-center">
                      <div className="text-2xl mb-1">{type.icon}</div>
                      <div className="text-lg font-semibold">{count}</div>
                      <div className="text-xs text-gray-600">{type.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
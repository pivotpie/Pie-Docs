import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '@/hooks/redux';
import { createLocation, updateLocation } from '@/store/slices/locationSlice';
import type {
  LocationRecord,
  LocationType,
  RoomType,
  LockType,
  CapacityConfig,
  EnvironmentalConfig
} from '@/types/location';
import { createError, getErrorMessage } from '@/types/errors';

interface LocationFormProps {
  location?: LocationRecord; // For editing
  parentId?: string; // For creating
  type?: LocationType; // For creating
  onSuccess?: (location: LocationRecord) => void;
  onCancel?: () => void;
  className?: string;
}

interface FormData {
  name: string;
  description: string;
  type: LocationType;
  parentId?: string;

  // Building specific
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  contactInfo?: {
    manager: string;
    phone: string;
    email: string;
  };

  // Floor specific
  level?: number;
  totalArea?: number;
  accessRestricted?: boolean;

  // Room specific
  roomType?: RoomType;
  area?: number;
  accessCode?: string;
  securityLevel?: number;

  // Cabinet specific
  lockType?: LockType;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;

  // Shelf specific
  position?: number;

  // Capacity configuration
  capacity?: CapacityConfig;

  // Environmental configuration
  environmental?: EnvironmentalConfig;

  // Metadata
  metadata: Record<string, string>;
}

const initialFormData: FormData = {
  name: '',
  description: '',
  type: 'building',
  capacity: {
    maxDocuments: 1000,
    alertThreshold: 80,
    criticalThreshold: 95
  },
  environmental: {
    temperatureMin: 18,
    temperatureMax: 24,
    humidityMin: 40,
    humidityMax: 60,
    monitoringEnabled: false
  },
  metadata: {}
};

export const LocationForm: React.FC<LocationFormProps> = ({
  location,
  parentId,
  type,
  onSuccess,
  onCancel,
  className = ''
}) => {
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadataKey, setMetadataKey] = useState('');
  const [metadataValue, setMetadataValue] = useState('');

  const isEditing = !!location;
  const title = isEditing ? `Edit ${location.name}` : `Create New ${type || 'Location'}`;

  // Initialize form data
  useEffect(() => {
    if (location) {
      // Editing existing location
      setFormData({
        name: location.name,
        description: location.description || '',
        type: location.type,
        parentId: location.parentId,

        // Extract type-specific data
        ...(location.type === 'building' && {
          address: (location as any).address,
          coordinates: (location as any).coordinates,
          contactInfo: (location as any).contactInfo
        }),

        ...(location.type === 'floor' && {
          level: (location as any).level,
          totalArea: (location as any).totalArea,
          accessRestricted: (location as any).accessRestricted
        }),

        ...(location.type === 'room' && {
          roomType: (location as any).roomType,
          area: (location as any).area,
          accessCode: (location as any).accessCode,
          securityLevel: (location as any).securityLevel
        }),

        ...(location.type === 'cabinet' && {
          lockType: (location as any).lockType,
          manufacturer: (location as any).manufacturer,
          model: (location as any).model,
          serialNumber: (location as any).serialNumber
        }),

        ...(location.type === 'shelf' && {
          position: (location as any).position
        }),

        capacity: (location as any).capacity || initialFormData.capacity,
        environmental: (location as any).environmental || initialFormData.environmental,
        metadata: location.metadata || {}
      });
    } else if (parentId && type) {
      // Creating new location
      setFormData({
        ...initialFormData,
        type,
        parentId
      });
    }
  }, [location, parentId, type]);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedChange = (
    parent: keyof FormData,
    field: string,
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as any),
        [field]: value
      }
    }));
  };

  const handleAddMetadata = () => {
    if (metadataKey.trim() && metadataValue.trim()) {
      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          [metadataKey.trim()]: metadataValue.trim()
        }
      }));
      setMetadataKey('');
      setMetadataValue('');
    }
  };

  const handleRemoveMetadata = (key: string) => {
    setFormData(prev => {
      const newMetadata = { ...prev.metadata };
      delete newMetadata[key];
      return {
        ...prev,
        metadata: newMetadata
      };
    });
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Name is required';
    }

    if (formData.type === 'floor' && (formData.level === undefined || formData.level < 0)) {
      return 'Floor level must be a non-negative number';
    }

    if (formData.type === 'room' && !formData.roomType) {
      return 'Room type is required';
    }

    if (formData.type === 'cabinet' && !formData.lockType) {
      return 'Lock type is required';
    }

    if (formData.type === 'shelf' && (formData.position === undefined || formData.position < 1)) {
      return 'Shelf position must be a positive number';
    }

    if (formData.capacity && formData.capacity.maxDocuments <= 0) {
      return 'Maximum documents must be greater than 0';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const locationData: Partial<LocationRecord> = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        parentId: formData.parentId,
        metadata: formData.metadata
      };

      // Add type-specific fields
      switch (formData.type) {
        case 'building':
          Object.assign(locationData, {
            address: formData.address,
            coordinates: formData.coordinates,
            contactInfo: formData.contactInfo,
            capacity: formData.capacity,
            environmental: formData.environmental
          });
          break;

        case 'floor':
          Object.assign(locationData, {
            level: formData.level,
            totalArea: formData.totalArea,
            accessRestricted: formData.accessRestricted
          });
          break;

        case 'room':
          Object.assign(locationData, {
            roomType: formData.roomType,
            area: formData.area,
            accessCode: formData.accessCode,
            securityLevel: formData.securityLevel
          });
          break;

        case 'cabinet':
          Object.assign(locationData, {
            lockType: formData.lockType,
            manufacturer: formData.manufacturer,
            model: formData.model,
            serialNumber: formData.serialNumber,
            capacity: formData.capacity
          });
          break;

        case 'shelf':
          Object.assign(locationData, {
            position: formData.position,
            capacity: formData.capacity
          });
          break;
      }

      let result;
      if (isEditing) {
        result = await dispatch(updateLocation({
          id: location.id,
          updates: locationData
        })).unwrap();
      } else {
        result = await dispatch(createLocation(locationData)).unwrap();
      }

      onSuccess?.(result);
    } catch (err: any) {
      const errorMessage = getErrorMessage(
        createError.generic('LOCATION_FORM_ERROR', err.message || 'Failed to save location')
      );
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderTypeSpecificFields = () => {
    switch (formData.type) {
      case 'building':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={3}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Building address..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.coordinates?.latitude || ''}
                  onChange={(e) => handleNestedChange('coordinates', 'latitude', parseFloat(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.coordinates?.longitude || ''}
                  onChange={(e) => handleNestedChange('coordinates', 'longitude', parseFloat(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manager
                </label>
                <input
                  type="text"
                  value={formData.contactInfo?.manager || ''}
                  onChange={(e) => handleNestedChange('contactInfo', 'manager', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.contactInfo?.phone || ''}
                  onChange={(e) => handleNestedChange('contactInfo', 'phone', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.contactInfo?.email || ''}
                  onChange={(e) => handleNestedChange('contactInfo', 'email', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        );

      case 'floor':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Floor Level *
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.level || ''}
                  onChange={(e) => handleInputChange('level', parseInt(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Area (m²)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.totalArea || ''}
                  onChange={(e) => handleInputChange('totalArea', parseFloat(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="accessRestricted"
                checked={formData.accessRestricted || false}
                onChange={(e) => handleInputChange('accessRestricted', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <label htmlFor="accessRestricted" className="ml-2 text-sm text-gray-700">
                Access Restricted
              </label>
            </div>
          </div>
        );

      case 'room':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Type *
                </label>
                <select
                  value={formData.roomType || ''}
                  onChange={(e) => handleInputChange('roomType', e.target.value as RoomType)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Select room type</option>
                  <option value="archive">Archive</option>
                  <option value="office">Office</option>
                  <option value="storage">Storage</option>
                  <option value="secure">Secure</option>
                  <option value="climate_controlled">Climate Controlled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Area (m²)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.area || ''}
                  onChange={(e) => handleInputChange('area', parseFloat(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Code
                </label>
                <input
                  type="text"
                  value={formData.accessCode || ''}
                  onChange={(e) => handleInputChange('accessCode', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Optional access code"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Security Level (1-5)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.securityLevel || 1}
                  onChange={(e) => handleInputChange('securityLevel', parseInt(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        );

      case 'cabinet':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lock Type *
              </label>
              <select
                value={formData.lockType || ''}
                onChange={(e) => handleInputChange('lockType', e.target.value as LockType)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Select lock type</option>
                <option value="none">No Lock</option>
                <option value="key">Key Lock</option>
                <option value="digital">Digital Lock</option>
                <option value="biometric">Biometric Lock</option>
                <option value="combination">Combination Lock</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manufacturer
                </label>
                <input
                  type="text"
                  value={formData.manufacturer || ''}
                  onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <input
                  type="text"
                  value={formData.model || ''}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={formData.serialNumber || ''}
                  onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        );

      case 'shelf':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shelf Position *
            </label>
            <input
              type="number"
              min="1"
              value={formData.position || ''}
              onChange={(e) => handleInputChange('position', parseInt(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Position number (1, 2, 3...)"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Position of the shelf (1 = top, 2 = second from top, etc.)
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-red-600">⚠️</span>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Basic fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Location name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Optional description"
            />
          </div>
        </div>

        {/* Type-specific fields */}
        {renderTypeSpecificFields()}

        {/* Capacity configuration (for applicable types) */}
        {['building', 'cabinet', 'shelf'].includes(formData.type) && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Capacity Configuration</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Documents *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.capacity?.maxDocuments || ''}
                  onChange={(e) => handleNestedChange('capacity', 'maxDocuments', parseInt(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alert Threshold (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.capacity?.alertThreshold || ''}
                  onChange={(e) => handleNestedChange('capacity', 'alertThreshold', parseInt(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Critical Threshold (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.capacity?.criticalThreshold || ''}
                  onChange={(e) => handleNestedChange('capacity', 'criticalThreshold', parseInt(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Environmental configuration (for buildings) */}
        {formData.type === 'building' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Environmental Configuration</h4>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="monitoringEnabled"
                  checked={formData.environmental?.monitoringEnabled || false}
                  onChange={(e) => handleNestedChange('environmental', 'monitoringEnabled', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <label htmlFor="monitoringEnabled" className="ml-2 text-sm text-gray-700">
                  Enable Monitoring
                </label>
              </div>
            </div>

            {formData.environmental?.monitoringEnabled && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.environmental?.temperatureMin || ''}
                    onChange={(e) => handleNestedChange('environmental', 'temperatureMin', parseFloat(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.environmental?.temperatureMax || ''}
                    onChange={(e) => handleNestedChange('environmental', 'temperatureMax', parseFloat(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Humidity (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.environmental?.humidityMin || ''}
                    onChange={(e) => handleNestedChange('environmental', 'humidityMin', parseInt(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Humidity (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.environmental?.humidityMax || ''}
                    onChange={(e) => handleNestedChange('environmental', 'humidityMax', parseInt(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Metadata</h4>

          {/* Add metadata */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={metadataKey}
              onChange={(e) => setMetadataKey(e.target.value)}
              placeholder="Key"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <input
              type="text"
              value={metadataValue}
              onChange={(e) => setMetadataValue(e.target.value)}
              placeholder="Value"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddMetadata}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>

          {/* Existing metadata */}
          {Object.entries(formData.metadata).length > 0 && (
            <div className="space-y-2">
              {Object.entries(formData.metadata).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">
                    <strong>{key}:</strong> {value}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMetadata(key)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>{isEditing ? 'Update' : 'Create'} Location</span>
          </button>
        </div>
      </form>
    </div>
  );
};
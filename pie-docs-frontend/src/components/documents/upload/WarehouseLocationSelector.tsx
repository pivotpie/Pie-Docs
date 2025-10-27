import React, { useState, useEffect } from 'react';
import {
  BuildingOfficeIcon,
  MapPinIcon,
  SquaresPlusIcon,
  ChevronRightIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '@/contexts/ThemeContext';

interface Location {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
  warehouse_type: string;
  location_id: string;
}

interface Zone {
  id: string;
  name: string;
  code: string;
  zone_type: string;
  warehouse_id: string;
}

interface Shelf {
  id: string;
  name: string;
  code: string;
  shelf_type: string;
  zone_id: string;
}

interface Rack {
  id: string;
  name: string;
  code: string;
  rack_type: string;
  shelf_id: string;
  current_documents: number;
  max_documents: number;
  customer_id?: string;
  assignment_type: string;
}

interface WarehouseLocationSelectorProps {
  selectedRackId?: string;
  onRackSelect: (rackId: string, locationPath: string) => void;
  className?: string;
}

export const WarehouseLocationSelector: React.FC<WarehouseLocationSelectorProps> = ({
  selectedRackId,
  onRackSelect,
  className = ''
}) => {
  const { theme } = useTheme();
  const [locations, setLocations] = useState<Location[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);

  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [selectedShelfId, setSelectedShelfId] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);

  // Load locations on mount
  useEffect(() => {
    loadLocations();
  }, []);

  // Load warehouses when location selected
  useEffect(() => {
    if (selectedLocationId) {
      loadWarehouses(selectedLocationId);
    } else {
      setWarehouses([]);
      setSelectedWarehouseId('');
    }
  }, [selectedLocationId]);

  // Load zones when warehouse selected
  useEffect(() => {
    if (selectedWarehouseId) {
      loadZones(selectedWarehouseId);
    } else {
      setZones([]);
      setSelectedZoneId('');
    }
  }, [selectedWarehouseId]);

  // Load shelves when zone selected
  useEffect(() => {
    if (selectedZoneId) {
      loadShelves(selectedZoneId);
    } else {
      setShelves([]);
      setSelectedShelfId('');
    }
  }, [selectedZoneId]);

  // Load racks when shelf selected
  useEffect(() => {
    if (selectedShelfId) {
      loadRacks(selectedShelfId);
    } else {
      setRacks([]);
    }
  }, [selectedShelfId]);

  const loadLocations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/warehouse/locations?status=active');
      const data = await response.json();
      // API returns array directly, not wrapped in {data: [...]}
      setLocations(Array.isArray(data) ? data : (data.data || []));
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWarehouses = async (locationId: string) => {
    try {
      const response = await fetch(`/api/v1/warehouse/warehouses?location_id=${locationId}&status=active`);
      const data = await response.json();
      // API returns array directly, not wrapped in {data: [...]}
      setWarehouses(Array.isArray(data) ? data : (data.data || []));
    } catch (error) {
      console.error('Failed to load warehouses:', error);
    }
  };

  const loadZones = async (warehouseId: string) => {
    try {
      const response = await fetch(`/api/v1/warehouse/zones?warehouse_id=${warehouseId}&status=active`);
      const data = await response.json();
      // API returns array directly, not wrapped in {data: [...]}
      setZones(Array.isArray(data) ? data : (data.data || []));
    } catch (error) {
      console.error('Failed to load zones:', error);
    }
  };

  const loadShelves = async (zoneId: string) => {
    try {
      const response = await fetch(`/api/v1/warehouse/shelves?zone_id=${zoneId}&status=active`);
      const data = await response.json();
      // API returns array directly, not wrapped in {data: [...]}
      setShelves(Array.isArray(data) ? data : (data.data || []));
    } catch (error) {
      console.error('Failed to load shelves:', error);
    }
  };

  const loadRacks = async (shelfId: string) => {
    try {
      const response = await fetch(`/api/v1/warehouse/racks?shelf_id=${shelfId}&status=active`);
      const data = await response.json();
      // API returns array directly, not wrapped in {data: [...]}
      setRacks(Array.isArray(data) ? data : (data.data || []));
    } catch (error) {
      console.error('Failed to load racks:', error);
    }
  };

  const handleRackSelection = (rack: Rack) => {
    // Build location path
    const location = locations.find(l => l.id === selectedLocationId);
    const warehouse = warehouses.find(w => w.id === selectedWarehouseId);
    const zone = zones.find(z => z.id === selectedZoneId);
    const shelf = shelves.find(s => s.id === selectedShelfId);

    const locationPath = `${location?.code} > ${warehouse?.code} > ${zone?.code} > ${shelf?.code} > ${rack.code}`;
    onRackSelect(rack.id, locationPath);
  };

  const getRackUtilization = (rack: Rack) => {
    const percentage = (rack.current_documents / rack.max_documents) * 100;
    return {
      percentage: Math.round(percentage),
      color: percentage >= 90 ? 'red' : percentage >= 70 ? 'yellow' : 'green'
    };
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <h4 className="text-sm font-medium text-white">Warehouse Location (Rack Level)</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Location Selection */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-200">
            <MapPinIcon className="inline h-4 w-4 mr-1" />
            Location
          </label>
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">Select Location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.code} - {location.name} ({location.city}, {location.country})
              </option>
            ))}
          </select>
        </div>

        {/* Warehouse Selection */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-200">
            <BuildingOfficeIcon className="inline h-4 w-4 mr-1" />
            Warehouse
          </label>
          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            disabled={!selectedLocationId}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="">Select Warehouse</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} - {warehouse.name} ({warehouse.warehouse_type})
              </option>
            ))}
          </select>
        </div>

        {/* Zone Selection */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-200">
            Zone
          </label>
          <select
            value={selectedZoneId}
            onChange={(e) => setSelectedZoneId(e.target.value)}
            disabled={!selectedWarehouseId}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="">Select Zone</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.code} - {zone.name} ({zone.zone_type})
              </option>
            ))}
          </select>
        </div>

        {/* Shelf Selection */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-200">
            Shelf
          </label>
          <select
            value={selectedShelfId}
            onChange={(e) => setSelectedShelfId(e.target.value)}
            disabled={!selectedZoneId}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="">Select Shelf</option>
            {shelves.map((shelf) => (
              <option key={shelf.id} value={shelf.id}>
                {shelf.code} - {shelf.name} ({shelf.shelf_type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Rack Selection */}
      {selectedShelfId && (
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2 text-gray-200">
            <SquaresPlusIcon className="inline h-4 w-4 mr-1" />
            Select Rack
          </label>
          <div className={`border rounded-lg max-h-64 overflow-y-auto ${
            theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'
          }`}>
            {racks.length === 0 ? (
              <div className={`p-4 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                No racks available in this shelf
              </div>
            ) : (
              <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {racks.map((rack) => {
                  const utilization = getRackUtilization(rack);
                  const isSelected = selectedRackId === rack.id;
                  const isFull = rack.current_documents >= rack.max_documents;

                  return (
                    <div
                      key={rack.id}
                      onClick={() => !isFull && handleRackSelection(rack)}
                      className={`p-3 transition-colors ${
                        isFull
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer'
                      } ${
                        isSelected
                          ? theme === 'dark'
                            ? 'bg-blue-900/30 border-l-4 border-blue-500'
                            : 'bg-blue-50 border-l-4 border-blue-500'
                          : theme === 'dark'
                          ? 'hover:bg-gray-700'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className={`text-sm font-medium ${
                              isSelected
                                ? theme === 'dark' ? 'text-blue-300' : 'text-blue-900'
                                : theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              {rack.code} - {rack.name}
                            </p>
                            {isFull && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                                FULL
                              </span>
                            )}
                          </div>
                          <p className={`text-xs mt-1 ${
                            isSelected
                              ? theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
                              : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {rack.rack_type} • {rack.assignment_type}
                          </p>
                          <div className="mt-2">
                            <div className={`flex items-center justify-between text-xs mb-1 ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              <span>Capacity</span>
                              <span>{rack.current_documents} / {rack.max_documents}</span>
                            </div>
                            <div className={`w-full rounded-full h-2 ${
                              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                            }`}>
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  utilization.color === 'red' ? 'bg-red-500' :
                                  utilization.color === 'yellow' ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${utilization.percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckIcon className={`h-5 w-5 ml-3 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Path Display */}
      {selectedRackId && (
        <div className={`mt-4 p-3 rounded-lg ${
          theme === 'dark' ? 'bg-gray-700' : 'bg-blue-50'
        }`}>
          <p className="text-xs font-medium text-gray-600 mb-1">Selected Location Path:</p>
          <p className={`text-sm font-medium ${
            theme === 'dark' ? 'text-blue-300' : 'text-blue-900'
          }`}>
            {locations.find(l => l.id === selectedLocationId)?.code}
            <ChevronRightIcon className="inline h-3 w-3 mx-1" />
            {warehouses.find(w => w.id === selectedWarehouseId)?.code}
            <ChevronRightIcon className="inline h-3 w-3 mx-1" />
            {zones.find(z => z.id === selectedZoneId)?.code}
            <ChevronRightIcon className="inline h-3 w-3 mx-1" />
            {shelves.find(s => s.id === selectedShelfId)?.code}
            <ChevronRightIcon className="inline h-3 w-3 mx-1" />
            {racks.find(r => r.id === selectedRackId)?.code}
          </p>
        </div>
      )}
    </div>
  );
};

export default WarehouseLocationSelector;

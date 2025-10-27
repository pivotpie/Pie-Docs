import React, { useState, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { searchLocations, clearSearch } from '@/store/slices/locationSlice';
import type {
  LocationType,
  LocationSearchCriteria,
  LocationSearchResult,
  LocationRecord
} from '@/types/location';

interface LocationSearchProps {
  onSelectLocation?: (location: LocationRecord) => void;
  onViewLocation?: (location: LocationRecord) => void;
  placeholder?: string;
  showFilters?: boolean;
  className?: string;
}

const LOCATION_TYPE_OPTIONS: { value: LocationType; label: string }[] = [
  { value: 'building', label: 'Building' },
  { value: 'floor', label: 'Floor' },
  { value: 'room', label: 'Room' },
  { value: 'cabinet', label: 'Cabinet' },
  { value: 'shelf', label: 'Shelf' }
];

const ENVIRONMENTAL_STATUS_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' }
];

export const LocationSearch: React.FC<LocationSearchProps> = ({
  onSelectLocation,
  onViewLocation,
  placeholder = 'Search locations...',
  showFilters = true,
  className = ''
}) => {
  const dispatch = useAppDispatch();
  const {
    searchResults,
    searchLoading,
    searchError,
    hierarchy
  } = useAppSelector(state => state.location.locations);

  const [query, setQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<LocationSearchCriteria>({});
  const [selectedResult, setSelectedResult] = useState<string | null>(null);

  // Building options for parent filters
  const buildingOptions = useMemo(() => {
    return hierarchy.buildings.map(building => ({
      value: building.id,
      label: building.name
    }));
  }, [hierarchy.buildings]);

  // Floor options based on selected building
  const floorOptions = useMemo(() => {
    if (!filters.buildingId) return [];
    const building = hierarchy.buildings.find(b => b.id === filters.buildingId);
    return building?.floors?.map(floor => ({
      value: floor.id,
      label: `Floor ${floor.level}: ${floor.name}`
    })) || [];
  }, [filters.buildingId, hierarchy.buildings]);

  // Room options based on selected floor
  const roomOptions = useMemo(() => {
    if (!filters.floorId) return [];
    const building = hierarchy.buildings.find(b => b.id === filters.buildingId);
    const floor = building?.floors?.find(f => f.id === filters.floorId);
    return floor?.rooms?.map(room => ({
      value: room.id,
      label: `${room.name} (${room.roomType})`
    })) || [];
  }, [filters.buildingId, filters.floorId, hierarchy.buildings]);

  // Cabinet options based on selected room
  const cabinetOptions = useMemo(() => {
    if (!filters.roomId) return [];
    const building = hierarchy.buildings.find(b => b.id === filters.buildingId);
    const floor = building?.floors?.find(f => f.id === filters.floorId);
    const room = floor?.rooms?.find(r => r.id === filters.roomId);
    return room?.cabinets?.map(cabinet => ({
      value: cabinet.id,
      label: `${cabinet.name} (${cabinet.lockType})`
    })) || [];
  }, [filters.buildingId, filters.floorId, filters.roomId, hierarchy.buildings]);

  const handleSearch = useCallback(async () => {
    if (!query.trim() && Object.keys(filters).length === 0) {
      dispatch(clearSearch());
      return;
    }

    const searchCriteria: LocationSearchCriteria = {
      ...filters,
      query: query.trim() || undefined
    };

    await dispatch(searchLocations(searchCriteria));
  }, [query, filters, dispatch]);

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    if (!newQuery.trim()) {
      dispatch(clearSearch());
    }
  };

  const handleFilterChange = (key: keyof LocationSearchCriteria, value: any) => {
    setFilters(prev => {
      const newFilters = { ...prev };

      if (value === '' || value === undefined) {
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }

      // Clear dependent filters when parent changes
      if (key === 'buildingId') {
        delete newFilters.floorId;
        delete newFilters.roomId;
        delete newFilters.cabinetId;
      } else if (key === 'floorId') {
        delete newFilters.roomId;
        delete newFilters.cabinetId;
      } else if (key === 'roomId') {
        delete newFilters.cabinetId;
      }

      return newFilters;
    });
  };

  const handleClearFilters = () => {
    setFilters({});
    setQuery('');
    dispatch(clearSearch());
  };

  const handleSelectResult = (result: LocationSearchResult) => {
    setSelectedResult(result.location.id);
    onSelectLocation?.(result.location);
  };

  const handleViewResult = (result: LocationSearchResult) => {
    onViewLocation?.(result.location);
  };

  const getLocationPath = (result: LocationSearchResult): string => {
    return result.path;
  };

  const getLocationIcon = (type: LocationType): string => {
    switch (type) {
      case 'building': return '🏢';
      case 'floor': return '🏬';
      case 'room': return '🚪';
      case 'cabinet': return '🗄️';
      case 'shelf': return '📚';
      default: return '📍';
    }
  };

  const getLocationTypeColor = (type: LocationType): string => {
    switch (type) {
      case 'building': return 'bg-blue-100 text-blue-800';
      case 'floor': return 'bg-green-100 text-green-800';
      case 'room': return 'bg-red-100 text-red-800';
      case 'cabinet': return 'bg-yellow-100 text-yellow-800';
      case 'shelf': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-6">
        {/* Search input */}
        <div className="flex space-x-3 mb-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={placeholder}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={searchLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {searchLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Searching...</span>
              </div>
            ) : (
              'Search'
            )}
          </button>

          {showFilters && (
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Filters {showAdvancedFilters ? '▲' : '▼'}
            </button>
          )}
        </div>

        {/* Advanced filters */}
        {showFilters && showAdvancedFilters && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Advanced Filters</h4>
              <button
                onClick={handleClearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Location Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Type
                </label>
                <select
                  value={filters.type || ''}
                  onChange={(e) => handleFilterChange('type', e.target.value as LocationType)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {LOCATION_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Building */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Building
                </label>
                <select
                  value={filters.buildingId || ''}
                  onChange={(e) => handleFilterChange('buildingId', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">All Buildings</option>
                  {buildingOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Floor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Floor
                </label>
                <select
                  value={filters.floorId || ''}
                  onChange={(e) => handleFilterChange('floorId', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={!filters.buildingId}
                >
                  <option value="">All Floors</option>
                  {floorOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Room */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room
                </label>
                <select
                  value={filters.roomId || ''}
                  onChange={(e) => handleFilterChange('roomId', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={!filters.floorId}
                >
                  <option value="">All Rooms</option>
                  {roomOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cabinet */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cabinet
                </label>
                <select
                  value={filters.cabinetId || ''}
                  onChange={(e) => handleFilterChange('cabinetId', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={!filters.roomId}
                >
                  <option value="">All Cabinets</option>
                  {cabinetOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Environmental Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Environmental Status
                </label>
                <select
                  value={filters.environmentalStatus || ''}
                  onChange={(e) => handleFilterChange('environmentalStatus', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  {ENVIRONMENTAL_STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Additional filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Has Capacity */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasCapacity"
                  checked={filters.hasCapacity || false}
                  onChange={(e) => handleFilterChange('hasCapacity', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <label htmlFor="hasCapacity" className="ml-2 text-sm text-gray-700">
                  Has Available Capacity
                </label>
              </div>

              {/* Capacity Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Available Capacity (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.capacityThreshold || ''}
                  onChange={(e) => handleFilterChange('capacityThreshold', parseInt(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="0-100"
                />
              </div>

              {/* Access Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Access Level
                </label>
                <select
                  value={filters.accessLevel || ''}
                  onChange={(e) => handleFilterChange('accessLevel', parseInt(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Any Level</option>
                  <option value="1">Level 1</option>
                  <option value="2">Level 2</option>
                  <option value="3">Level 3</option>
                  <option value="4">Level 4</option>
                  <option value="5">Level 5</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Search error */}
        {searchError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-red-600">⚠️</span>
              <span className="text-red-800">{searchError}</span>
            </div>
          </div>
        )}

        {/* Search results */}
        {searchResults.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-900">
                Search Results ({searchResults.length})
              </h4>
              <button
                onClick={() => dispatch(clearSearch())}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear Results
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map((result) => (
                <div
                  key={result.location.id}
                  className={`
                    p-4 border rounded-lg cursor-pointer transition-all duration-200
                    hover:shadow-md hover:border-blue-300
                    ${selectedResult === result.location.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white'
                    }
                  `}
                  onClick={() => handleSelectResult(result)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      {/* Location icon */}
                      <span className="text-xl">
                        {getLocationIcon(result.location.type)}
                      </span>

                      {/* Location info */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {result.location.name}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getLocationTypeColor(result.location.type)}`}>
                            {result.location.type}
                          </span>
                        </div>

                        <div className="text-sm text-gray-600 mt-1">
                          {getLocationPath(result)}
                        </div>

                        {result.location.description && (
                          <div className="text-sm text-gray-500 mt-1">
                            {result.location.description}
                          </div>
                        )}

                        {/* Additional info */}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>Relevance: {Math.round(result.relevanceScore * 100)}%</span>
                          <span>Documents: {result.documentCount}</span>
                          {result.availableCapacity !== undefined && (
                            <span>Available: {result.availableCapacity}%</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {onViewLocation && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewResult(result);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="View details"
                        >
                          👁️
                        </button>
                      )}

                      <span className="text-gray-300">→</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {searchResults.length === 0 && (query.trim() || Object.keys(filters).length > 0) && !searchLoading && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">🔍</div>
            <div className="text-lg font-medium mb-2">No locations found</div>
            <div className="text-sm">
              Try adjusting your search criteria or filters
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
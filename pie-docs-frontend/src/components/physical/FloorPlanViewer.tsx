import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MapContainer, ImageOverlay, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { LatLngBounds, LatLng, Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RootState } from '@/store';
import { updateFloorPlan, setSelectedLocation } from '@/store/slices/locationSlice';

// Fix for default marker icons in react-leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface FloorPlan {
  id: string;
  buildingId: string;
  floorId: string;
  name: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  scale: number; // meters per pixel
  locations: FloorPlanLocation[];
  created: Date;
  updated: Date;
}

interface FloorPlanLocation {
  id: string;
  locationId: string;
  name: string;
  type: 'room' | 'cabinet' | 'shelf' | 'equipment' | 'entrance' | 'stairs' | 'elevator';
  coordinates: {
    x: number; // pixel coordinates on the floor plan
    y: number;
  };
  bounds?: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  metadata: {
    capacity?: number;
    currentUtilization?: number;
    documentCount?: number;
    accessLevel?: string;
    notes?: string;
  };
  status: 'active' | 'inactive' | 'maintenance';
}

interface MapInteraction {
  id: string;
  type: 'click' | 'search' | 'navigation';
  locationId?: string;
  coordinates: { x: number; y: number };
  timestamp: Date;
  userId: string;
}

// Custom hook for handling map interactions
const MapEventHandler: React.FC<{
  onMapClick: (coords: { x: number; y: number }) => void;
}> = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      const map = e.target;
      const bounds = map.getBounds();
      const size = map.getSize();

      // Convert lat/lng to pixel coordinates
      const x = ((e.latlng.lng - bounds.getWest()) / (bounds.getEast() - bounds.getWest())) * size.x;
      const y = ((bounds.getNorth() - e.latlng.lat) / (bounds.getNorth() - bounds.getSouth())) * size.y;

      onMapClick({ x, y });
    },
  });

  return null;
};

// Component for search highlighting
const SearchHighlight: React.FC<{
  searchResults: FloorPlanLocation[];
  selectedResult?: string;
}> = ({ searchResults, selectedResult }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedResult) {
      const location = searchResults.find(loc => loc.id === selectedResult);
      if (location) {
        // Convert pixel coordinates to lat/lng and pan to location
        const bounds = map.getBounds();
        const size = map.getSize();

        const lng = bounds.getWest() + (location.coordinates.x / size.x) * (bounds.getEast() - bounds.getWest());
        const lat = bounds.getNorth() - (location.coordinates.y / size.y) * (bounds.getNorth() - bounds.getSouth());

        map.panTo(new LatLng(lat, lng));
      }
    }
  }, [selectedResult, searchResults, map]);

  return null;
};

export const FloorPlanViewer: React.FC = () => {
  const dispatch = useDispatch();
  const {
    mapping: { floorPlans, currentMap, mapInteractions }
  } = useSelector((state: RootState) => state.location);

  const [selectedFloorPlan, setSelectedFloorPlan] = useState<FloorPlan | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<FloorPlanLocation[]>([]);
  const [selectedSearchResult, setSelectedSearchResult] = useState<string>('');
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [selectedLocation, setSelectedLocationState] = useState<FloorPlanLocation | null>(null);
  const [mapMode, setMapMode] = useState<'view' | 'edit' | 'search'>('view');
  const [zoomLevel, setZoomLevel] = useState(0);

  const mapRef = useRef<any>(null);

  // Mock floor plan data
  const mockFloorPlan: FloorPlan = {
    id: 'fp-001',
    buildingId: 'bld-001',
    floorId: 'flr-001-01',
    name: 'Floor 1 - Main Building',
    imageUrl: '/api/floorplans/fp-001/image', // This would be a real floor plan image
    imageWidth: 1200,
    imageHeight: 800,
    scale: 0.1, // 10cm per pixel
    locations: [
      {
        id: 'loc-001',
        locationId: 'room-001-a',
        name: 'Room A - Archives',
        type: 'room',
        coordinates: { x: 200, y: 150 },
        bounds: { x1: 150, y1: 100, x2: 350, y2: 250 },
        metadata: {
          capacity: 500,
          currentUtilization: 425,
          documentCount: 212,
          accessLevel: 'restricted',
          notes: 'High-security document storage'
        },
        status: 'active'
      },
      {
        id: 'loc-002',
        locationId: 'cab-001-15',
        name: 'Cabinet 15A',
        type: 'cabinet',
        coordinates: { x: 250, y: 180 },
        metadata: {
          capacity: 50,
          currentUtilization: 48,
          documentCount: 24,
          accessLevel: 'standard'
        },
        status: 'active'
      },
      {
        id: 'loc-003',
        locationId: 'room-001-b',
        name: 'Room B - General Storage',
        type: 'room',
        coordinates: { x: 500, y: 200 },
        bounds: { x1: 450, y1: 150, x2: 650, y2: 300 },
        metadata: {
          capacity: 750,
          currentUtilization: 600,
          documentCount: 300,
          accessLevel: 'public'
        },
        status: 'active'
      },
      {
        id: 'loc-004',
        locationId: 'entrance-main',
        name: 'Main Entrance',
        type: 'entrance',
        coordinates: { x: 100, y: 400 },
        metadata: {
          accessLevel: 'public',
          notes: 'Primary building access point'
        },
        status: 'active'
      }
    ],
    created: new Date('2024-01-15'),
    updated: new Date('2024-09-20')
  };

  useEffect(() => {
    setSelectedFloorPlan(mockFloorPlan);
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }

    const results = selectedFloorPlan?.locations.filter(location =>
      location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.type.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    setSearchResults(results);
  }, [searchTerm, selectedFloorPlan]);

  const handleMapClick = (coords: { x: number; y: number }) => {
    if (!selectedFloorPlan) return;

    // Find location at clicked coordinates
    const clickedLocation = selectedFloorPlan.locations.find(location => {
      if (location.bounds) {
        return coords.x >= location.bounds.x1 && coords.x <= location.bounds.x2 &&
               coords.y >= location.bounds.y1 && coords.y <= location.bounds.y2;
      } else {
        // Check if click is within 20 pixels of location coordinates
        const distance = Math.sqrt(
          Math.pow(coords.x - location.coordinates.x, 2) +
          Math.pow(coords.y - location.coordinates.y, 2)
        );
        return distance <= 20;
      }
    });

    if (clickedLocation) {
      setSelectedLocationState(clickedLocation);
      setShowLocationDetails(true);
      dispatch(setSelectedLocation(clickedLocation.locationId));
    } else {
      setSelectedLocationState(null);
      setShowLocationDetails(false);
    }

    // Log interaction
    const interaction: MapInteraction = {
      id: `int-${Date.now()}`,
      type: 'click',
      locationId: clickedLocation?.locationId,
      coordinates: coords,
      timestamp: new Date(),
      userId: 'current-user' // This would come from auth context
    };
  };

  const handleSearchResultSelect = (locationId: string) => {
    setSelectedSearchResult(locationId);
    const location = searchResults.find(loc => loc.id === locationId);
    if (location) {
      setSelectedLocationState(location);
      setShowLocationDetails(true);
    }
  };

  const getLocationIcon = (type: string): string => {
    switch (type) {
      case 'room': return '🏠';
      case 'cabinet': return '🗄️';
      case 'shelf': return '📚';
      case 'equipment': return '⚙️';
      case 'entrance': return '🚪';
      case 'stairs': return '🪜';
      case 'elevator': return '🛗';
      default: return '📍';
    }
  };

  const getUtilizationColor = (utilization?: number, capacity?: number): string => {
    if (!utilization || !capacity) return '#6B7280';

    const percentage = (utilization / capacity) * 100;
    if (percentage >= 90) return '#DC2626'; // red
    if (percentage >= 75) return '#D97706'; // amber
    return '#059669'; // green
  };

  // Create map bounds based on floor plan dimensions
  const imageBounds = selectedFloorPlan ? new LatLngBounds([
    [0, 0],
    [selectedFloorPlan.imageHeight / 100, selectedFloorPlan.imageWidth / 100]
  ]) : new LatLngBounds([[0, 0], [8, 12]]);

  // Convert pixel coordinates to lat/lng for markers
  const pixelToLatLng = (x: number, y: number): [number, number] => {
    if (!selectedFloorPlan) return [0, 0];

    const lat = (selectedFloorPlan.imageHeight - y) / 100;
    const lng = x / 100;
    return [lat, lng];
  };

  return (
    <div className="floor-plan-viewer h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Floor Plan Viewer</h1>
            {selectedFloorPlan && (
              <p className="text-gray-600">{selectedFloorPlan.name}</p>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search locations..."
                className="w-64 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                  {searchResults.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => handleSearchResultSelect(location.id)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <span>{getLocationIcon(location.type)}</span>
                      <div>
                        <div className="font-medium text-gray-900">{location.name}</div>
                        <div className="text-sm text-gray-500 capitalize">{location.type}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mode selector */}
            <select
              value={mapMode}
              onChange={(e) => setMapMode(e.target.value as 'view' | 'edit' | 'search')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="view">View Mode</option>
              <option value="edit">Edit Mode</option>
              <option value="search">Search Mode</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Map */}
        <div className="flex-1 relative">
          {selectedFloorPlan ? (
            <MapContainer
              ref={mapRef}
              bounds={imageBounds}
              className="h-full w-full"
              crs={undefined} // Use simple CRS for floor plans
              zoomControl={true}
              attributionControl={false}
            >
              {/* Floor plan image overlay */}
              <ImageOverlay
                url="/placeholder-floorplan.svg" // This would be the actual floor plan image
                bounds={imageBounds}
              />

              {/* Location markers */}
              {selectedFloorPlan.locations.map((location) => {
                const [lat, lng] = pixelToLatLng(location.coordinates.x, location.coordinates.y);
                return (
                  <Marker
                    key={location.id}
                    position={[lat, lng]}
                    icon={new Icon({
                      iconUrl: `data:image/svg+xml;base64,${btoa(`
                        <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="20" cy="20" r="15" fill="${getUtilizationColor(location.metadata.currentUtilization, location.metadata.capacity)}" stroke="white" stroke-width="3"/>
                          <text x="20" y="25" text-anchor="middle" fill="white" font-size="16">${getLocationIcon(location.type)}</text>
                        </svg>
                      `)}`,
                      iconSize: [40, 40],
                      iconAnchor: [20, 20],
                    })}
                  >
                    <Popup>
                      <div className="min-w-64">
                        <h3 className="font-semibold text-gray-900 mb-2">{location.name}</h3>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Type:</span>
                            <span className="capitalize font-medium">{location.type}</span>
                          </div>
                          {location.metadata.capacity && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Capacity:</span>
                              <span className="font-medium">{location.metadata.capacity}</span>
                            </div>
                          )}
                          {location.metadata.currentUtilization && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Used:</span>
                              <span className="font-medium">
                                {location.metadata.currentUtilization}
                                ({Math.round((location.metadata.currentUtilization / (location.metadata.capacity || 1)) * 100)}%)
                              </span>
                            </div>
                          )}
                          {location.metadata.documentCount && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Documents:</span>
                              <span className="font-medium">{location.metadata.documentCount}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className={`font-medium capitalize ${
                              location.status === 'active' ? 'text-green-600' :
                              location.status === 'maintenance' ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {location.status}
                            </span>
                          </div>
                        </div>
                        {location.metadata.notes && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-600">{location.metadata.notes}</p>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Event handlers */}
              <MapEventHandler onMapClick={handleMapClick} />
              <SearchHighlight searchResults={searchResults} selectedResult={selectedSearchResult} />
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <p className="text-gray-500 mb-4">No floor plan selected</p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Upload Floor Plan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {showLocationDetails && selectedLocation && (
          <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Location Details</h2>
              <button
                onClick={() => setShowLocationDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">{selectedLocation.name}</h3>
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-2xl">{getLocationIcon(selectedLocation.type)}</span>
                  <span className="text-sm text-gray-500 capitalize">{selectedLocation.type}</span>
                </div>
              </div>

              {selectedLocation.metadata.capacity && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Capacity Utilization</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Used:</span>
                      <span>{selectedLocation.metadata.currentUtilization || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total:</span>
                      <span>{selectedLocation.metadata.capacity}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${((selectedLocation.metadata.currentUtilization || 0) / selectedLocation.metadata.capacity) * 100}%`,
                          backgroundColor: getUtilizationColor(selectedLocation.metadata.currentUtilization, selectedLocation.metadata.capacity),
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.round(((selectedLocation.metadata.currentUtilization || 0) / selectedLocation.metadata.capacity) * 100)}% utilized
                    </div>
                  </div>
                </div>
              )}

              {selectedLocation.metadata.documentCount && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Documents</h4>
                  <p className="text-sm text-gray-600">
                    {selectedLocation.metadata.documentCount} documents stored
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Access Level</h4>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  selectedLocation.metadata.accessLevel === 'restricted'
                    ? 'bg-red-100 text-red-800'
                    : selectedLocation.metadata.accessLevel === 'standard'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {selectedLocation.metadata.accessLevel?.toUpperCase() || 'PUBLIC'}
                </span>
              </div>

              {selectedLocation.metadata.notes && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600">{selectedLocation.metadata.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mb-2">
                  View Documents
                </button>
                <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                  Edit Location
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloorPlanViewer;
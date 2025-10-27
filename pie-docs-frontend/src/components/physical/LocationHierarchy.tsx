import React, { useState, useCallback, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import {
  fetchLocationHierarchy,
  selectLocation,
  updateLocation,
  deleteLocation,
  createLocation
} from '@/store/slices/locationSlice';
import type {
  LocationRecord,
  Building,
  Floor,
  Room,
  Cabinet,
  Shelf,
  LocationType
} from '@/types/location';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// Drag and drop item types
const ItemTypes = {
  LOCATION: 'location'
};

interface DragItem {
  id: string;
  type: string;
  locationRecord: LocationRecord;
}

interface LocationNodeProps {
  location: LocationRecord;
  level: number;
  canEdit: boolean;
  onEdit: (location: LocationRecord) => void;
  onDelete: (id: string) => void;
  onAdd: (parentId: string, type: LocationType) => void;
}

const getLocationIcon = (type: LocationType): string => {
  switch (type) {
    case 'building': return '🏢'; // Warehouse
    case 'floor': return '📍'; // Zone
    case 'room': return '📚'; // Shelf
    case 'cabinet': return '🗄️'; // Rack
    case 'shelf': return '📚';
    default: return '📍';
  }
};

const getLocationColor = (type: LocationType): string => {
  switch (type) {
    case 'building': return 'bg-blue-100 border-blue-200 text-blue-800'; // Warehouse
    case 'floor': return 'bg-green-100 border-green-200 text-green-800'; // Zone
    case 'room': return 'bg-orange-100 border-orange-200 text-orange-800'; // Shelf
    case 'cabinet': return 'bg-purple-100 border-purple-200 text-purple-800'; // Rack
    case 'shelf': return 'bg-purple-100 border-purple-200 text-purple-800';
    default: return 'bg-gray-100 border-gray-200 text-gray-800';
  }
};

const getAllowedChildTypes = (parentType: LocationType): LocationType[] => {
  switch (parentType) {
    case 'building': return ['floor']; // Warehouse can have Zones
    case 'floor': return ['room']; // Zone can have Shelves
    case 'room': return ['cabinet']; // Shelf can have Racks
    case 'cabinet': return []; // Rack is the lowest level
    case 'shelf': return [];
    default: return [];
  }
};

const LocationNode: React.FC<LocationNodeProps> = ({
  location,
  level,
  canEdit,
  onEdit,
  onDelete,
  onAdd
}) => {
  const dispatch = useAppDispatch();
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const [showActions, setShowActions] = useState(false);

  // Get children based on location type
  const getChildren = (): LocationRecord[] => {
    switch (location.type) {
      case 'building':
        return (location as Building).floors || [];
      case 'floor':
        return (location as Floor).rooms || [];
      case 'room':
        return (location as Room).cabinets || [];
      case 'cabinet':
        return (location as Cabinet).shelves || [];
      default:
        return [];
    }
  };

  const children = getChildren();
  const hasChildren = children.length > 0;
  const allowedChildTypes = getAllowedChildTypes(location.type);

  // Drag source
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.LOCATION,
    item: { id: location.id, type: ItemTypes.LOCATION, locationRecord: location },
    canDrag: canEdit && location.type !== 'building', // Can't drag buildings
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  // Drop target
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.LOCATION,
    canDrop: (item: DragItem) => {
      // Can't drop on itself or its children
      if (item.id === location.id) return false;

      // Check if the dragged item can be a child of this location
      const allowedTypes = getAllowedChildTypes(location.type);
      return allowedTypes.includes(item.locationRecord.type);
    },
    drop: (item: DragItem) => {
      if (item.id !== location.id) {
        // Update the dragged location's parent
        dispatch(updateLocation({
          id: item.id,
          updates: { parentId: location.id }
        }));
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const handleSelect = () => {
    dispatch(selectLocation(location));
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(location);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete ${location.name}?`)) {
      onDelete(location.id);
    }
  };

  const handleAddChild = (e: React.MouseEvent, childType: LocationType) => {
    e.stopPropagation();
    onAdd(location.id, childType);
  };

  // Combine drag and drop refs
  const dragDropRef = (node: HTMLDivElement | null) => {
    drag(drop(node));
  };

  const dropBackgroundColor = isOver && canDrop ? 'bg-green-50' :
                              isOver && !canDrop ? 'bg-red-50' : '';

  return (
    <div
      ref={dragDropRef}
      className={`
        relative transition-all duration-200
        ${isDragging ? 'opacity-50' : ''}
        ${dropBackgroundColor}
      `}
      style={{ marginLeft: level * 20 }}
    >
      <div
        className={`
          flex items-center justify-between p-3 border rounded-lg cursor-pointer
          hover:shadow-md transition-all duration-200
          ${getLocationColor(location.type)}
          ${isOver && canDrop ? 'ring-2 ring-green-300' : ''}
          ${isOver && !canDrop ? 'ring-2 ring-red-300' : ''}
        `}
        onClick={handleSelect}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="flex items-center space-x-3 flex-1">
          {/* Expand/collapse button */}
          {hasChildren && (
            <button
              onClick={handleToggleExpand}
              className="p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
            >
              <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                ▶
              </span>
            </button>
          )}

          {/* Location icon and name */}
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getLocationIcon(location.type)}</span>
            <div>
              <div className="font-medium text-sm">{location.name}</div>
              {location.description && (
                <div className="text-xs opacity-75">{location.description}</div>
              )}
            </div>
          </div>

          {/* Location type badge */}
          <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded-full">
            {location.type === 'building' ? 'Warehouse' :
             location.type === 'floor' ? 'Zone' :
             location.type === 'room' ? 'Shelf' :
             location.type === 'cabinet' ? 'Rack' : location.type}
          </span>

          {/* Children count */}
          {hasChildren && (
            <span className="text-xs px-2 py-1 bg-white bg-opacity-30 rounded-full">
              {children.length} {children.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {/* Actions */}
        {canEdit && showActions && (
          <div className="flex items-center space-x-1">
            {/* Add child buttons */}
            {allowedChildTypes.map(childType => {
              const childLabel = childType === 'floor' ? 'Zone' :
                               childType === 'room' ? 'Shelf' :
                               childType === 'cabinet' ? 'Rack' : childType;
              return (
                <button
                  key={childType}
                  onClick={(e) => handleAddChild(e, childType)}
                  className="p-1 hover:bg-white hover:bg-opacity-30 rounded text-xs"
                  title={`Add ${childLabel}`}
                >
                  ➕ {childLabel}
                </button>
              );
            })}

            {/* Edit button */}
            <button
              onClick={handleEdit}
              className="p-1 hover:bg-white hover:bg-opacity-30 rounded"
              title="Edit location"
            >
              ✏️
            </button>

            {/* Delete button (not for buildings) */}
            {location.type !== 'building' && (
              <button
                onClick={handleDelete}
                className="p-1 hover:bg-white hover:bg-opacity-30 rounded text-red-600"
                title="Delete location"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>

      {/* Drop indicator */}
      {isOver && canDrop && (
        <div className="absolute inset-0 border-2 border-green-300 border-dashed rounded-lg pointer-events-none" />
      )}

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="mt-2 space-y-2">
          {children.map(child => (
            <LocationNode
              key={child.id}
              location={child}
              level={level + 1}
              canEdit={canEdit}
              onEdit={onEdit}
              onDelete={onDelete}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface LocationHierarchyProps {
  canEdit?: boolean;
  onEditLocation?: (location: LocationRecord) => void;
  onCreateLocation?: (parentId: string, type: LocationType) => void;
  className?: string;
  hierarchyData?: {
    buildings: any[];
    totalLocations: number;
    lastUpdated: string;
  };
}

export const LocationHierarchy: React.FC<LocationHierarchyProps> = ({
  canEdit = true,
  onEditLocation,
  onCreateLocation,
  className = '',
  hierarchyData
}) => {
  const dispatch = useAppDispatch();
  const { hierarchy: reduxHierarchy, loading, error, selectedLocation } = useAppSelector(
    state => state.location.locations
  );

  // Use provided hierarchyData if available, otherwise use Redux store
  const hierarchy = hierarchyData || reduxHierarchy;

  useEffect(() => {
    // Only fetch from Redux if no hierarchyData is provided
    if (!hierarchyData) {
      dispatch(fetchLocationHierarchy());
    }
  }, [dispatch, hierarchyData]);

  const handleEdit = useCallback((location: LocationRecord) => {
    if (onEditLocation) {
      onEditLocation(location);
    }
  }, [onEditLocation]);

  const handleDelete = useCallback((id: string) => {
    dispatch(deleteLocation(id));
  }, [dispatch]);

  const handleAdd = useCallback((parentId: string, type: LocationType) => {
    if (onCreateLocation) {
      onCreateLocation(parentId, type);
    }
  }, [onCreateLocation]);

  const handleAddBuilding = () => {
    if (onCreateLocation) {
      onCreateLocation('', 'building');
    }
  };

  // Only show loading/error states if using Redux store
  if (!hierarchyData && loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading location hierarchy...</span>
        </div>
      </div>
    );
  }

  if (!hierarchyData && error) {
    return (
      <div className={`p-6 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          <span className="text-red-600">⚠️</span>
          <div>
            <div className="font-medium text-red-900">Failed to load location hierarchy</div>
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
        <button
          onClick={() => dispatch(fetchLocationHierarchy())}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <DndProvider backend={HTML5Backend}>
        <div className={`bg-white rounded-lg shadow-md ${className}`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Location Hierarchy</h3>

              {/* Stats */}
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Total: {hierarchy?.totalLocations || 0}</span>
                <span>Buildings: {hierarchy?.buildings?.length || 0}</span>
                {selectedLocation && (
                  <span className="text-blue-600">
                    Selected: {selectedLocation.name}
                  </span>
                )}
              </div>

              {/* Add warehouse button */}
              {canEdit && (
                <button
                  onClick={handleAddBuilding}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <span>➕</span>
                  <span>Add Warehouse</span>
                </button>
              )}
            </div>

            {/* Instructions */}
            {canEdit && hierarchy?.buildings?.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> Drag and drop locations to reorganize the hierarchy.
                  Hover over locations to see available actions.
                </div>
              </div>
            )}

            {/* Hierarchy tree */}
            <div className="space-y-3">
              {(!hierarchy?.buildings || hierarchy.buildings.length === 0) ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">🏢</div>
                  <div className="text-lg font-medium mb-2">No warehouses found</div>
                  <div className="text-sm">
                    {canEdit ? 'Go to Location Management to add warehouses' : 'No locations have been created yet'}
                  </div>
                </div>
              ) : (
                hierarchy.buildings.map(building => (
                  <LocationNode
                    key={building.id}
                    location={building}
                    level={0}
                    canEdit={canEdit}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onAdd={handleAdd}
                  />
                ))
              )}
            </div>

            {/* Last updated */}
            {hierarchy?.lastUpdated && (
              <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
                Last updated: {new Date(hierarchy.lastUpdated).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </DndProvider>
    </ErrorBoundary>
  );
};
import React, { useState, useEffect } from 'react';
import { warehouseServices } from '@/services/warehouseService';
import type { Location, WarehouseHierarchy } from '@/types/warehouse';

interface WarehouseHierarchyViewerProps {
  selectedLocation?: Location;
}

interface LocationHierarchy {
  location: Location;
  hierarchy: WarehouseHierarchy;
}

export const WarehouseHierarchyViewer: React.FC<WarehouseHierarchyViewerProps> = () => {
  const [locationHierarchies, setLocationHierarchies] = useState<LocationHierarchy[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'compact'>('tree');
  const [stats, setStats] = useState({
    totalLocations: 0,
    totalWarehouses: 0,
    totalZones: 0,
    totalDocuments: 0
  });

  useEffect(() => {
    loadAllHierarchies();
  }, []);

  const loadAllHierarchies = async () => {
    try {
      setLoading(true);
      const locations = await warehouseServices.locations.list({ status: 'active' });

      const hierarchies = await Promise.all(
        locations.map(async (location) => {
          try {
            const hierarchy = await warehouseServices.stats.getHierarchy(location.id);
            return { location, hierarchy };
          } catch (error) {
            console.error(`Failed to load hierarchy for ${location.name}:`, error);
            return null;
          }
        })
      );

      const validHierarchies = hierarchies.filter((h): h is LocationHierarchy => h !== null);
      setLocationHierarchies(validHierarchies);

      // Auto-expand first location
      if (validHierarchies.length > 0) {
        setExpandedLocations(new Set([validHierarchies[0].location.id]));
      }

      // Calculate stats
      const totalStats = validHierarchies.reduce((acc, { hierarchy }) => ({
        totalLocations: acc.totalLocations + 1,
        totalWarehouses: acc.totalWarehouses + (hierarchy.warehouses?.length || 0),
        totalZones: acc.totalZones + (hierarchy.warehouses?.reduce((sum, wh) => sum + (wh.zones?.length || 0), 0) || 0),
        totalDocuments: acc.totalDocuments + (hierarchy.warehouses?.reduce((sum, wh) =>
          sum + (wh.zones?.reduce((zSum, z) =>
            zSum + (z.shelves?.reduce((sSum, s) =>
              sSum + (s.racks?.reduce((rSum, r) =>
                rSum + (r.documents?.length || 0), 0) || 0), 0) || 0), 0) || 0), 0) || 0)
      }), { totalLocations: 0, totalWarehouses: 0, totalZones: 0, totalDocuments: 0 });

      setStats(totalStats);
    } catch (error) {
      console.error('Failed to load hierarchies:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLocation = (locationId: string) => {
    const newExpanded = new Set(expandedLocations);
    if (newExpanded.has(locationId)) {
      newExpanded.delete(locationId);
    } else {
      newExpanded.add(locationId);
    }
    setExpandedLocations(newExpanded);
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const isLocationExpanded = (locationId: string) => expandedLocations.has(locationId);
  const isExpanded = (nodeId: string) => expandedNodes.has(nodeId);

  const expandAll = () => {
    const allLocationIds = new Set(locationHierarchies.map(h => h.location.id));
    const allNodeIds = new Set<string>();

    locationHierarchies.forEach(({ hierarchy }) => {
      hierarchy.warehouses?.forEach(wh => {
        allNodeIds.add(`warehouse-${wh.id}`);
        wh.zones?.forEach(z => {
          allNodeIds.add(`zone-${z.id}`);
          z.shelves?.forEach(s => {
            allNodeIds.add(`shelf-${s.id}`);
            s.racks?.forEach(r => allNodeIds.add(`rack-${r.id}`));
          });
        });
      });
    });

    setExpandedLocations(allLocationIds);
    setExpandedNodes(allNodeIds);
  };

  const collapseAll = () => {
    setExpandedLocations(new Set());
    setExpandedNodes(new Set());
  };

  const getCapacityColor = (current: number, max: number) => {
    const percent = (current / max) * 100;
    if (percent >= 100) return 'text-red-400';
    if (percent >= 90) return 'text-orange-400';
    if (percent >= 70) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getCapacityBar = (current: number, max: number) => {
    const percent = Math.min((current / max) * 100, 100);
    let colorClass = 'bg-green-500';
    if (percent >= 100) colorClass = 'bg-red-500';
    else if (percent >= 90) colorClass = 'bg-orange-500';
    else if (percent >= 70) colorClass = 'bg-yellow-500';

    return (
      <div className="w-full bg-white/10 rounded-full h-2 mt-1">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    );
  };

  const matchesSearch = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const renderDocument = (doc: any) => {
    if (!matchesSearch(doc.title) && !matchesSearch(doc.barcode || '')) {
      return null;
    }

    return (
      <div key={doc.id} className="ml-16 py-2 pl-6 border-l-2 border-white/10 hover:border-blue-400/50 transition-colors">
        <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
          <span className="text-2xl">📄</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-white text-sm">{doc.title}</span>
              <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                doc.status === 'stored' ? 'bg-green-500/30 text-green-200 border border-green-400/50' :
                doc.status === 'retrieved' ? 'bg-blue-500/30 text-blue-200 border border-blue-400/50' :
                'bg-yellow-500/30 text-yellow-200 border border-yellow-400/50'
              }`}>
                {doc.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {doc.barcode && (
                <span className="font-mono text-xs bg-blue-500/20 text-blue-200 px-2 py-0.5 rounded border border-blue-400/30">
                  {doc.barcode}
                </span>
              )}
              {doc.document_category && (
                <span className="text-xs text-gray-400">{doc.document_category}</span>
              )}
              {doc.physical_condition && (
                <span className="text-xs text-gray-400 capitalize">
                  {doc.physical_condition}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRack = (rack: any) => {
    const rackId = `rack-${rack.id}`;
    const expanded = isExpanded(rackId);
    const hasDocuments = rack.documents && rack.documents.length > 0;

    const visibleDocuments = rack.documents?.filter((doc: any) =>
      matchesSearch(doc.title) || matchesSearch(doc.barcode || '')
    ) || [];

    if (searchQuery && visibleDocuments.length === 0 && !matchesSearch(rack.name) && !matchesSearch(rack.code)) {
      return null;
    }

    return (
      <div key={rack.id} className="ml-7 py-0.5">
        <div
          className={`flex items-center space-x-1.5 p-1.5 rounded-sm cursor-pointer transition-all ${
            expanded ? 'bg-white/10' : 'hover:bg-white/5'
          }`}
          onClick={() => hasDocuments && toggleNode(rackId)}
        >
          {hasDocuments && (
            <span className="text-gray-400 text-xs transition-transform duration-200" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
          )}
          <span className="text-base">🗄️</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-medium text-white text-xs">{rack.name}</span>
              <span className="text-xs text-gray-400">({rack.code})</span>
              {rack.barcode && (
                <span className="font-mono text-xs bg-purple-500/20 text-purple-200 px-1 py-0.5 rounded border border-purple-400/30">
                  {rack.barcode}
                </span>
              )}
              {rack.assignment_type !== 'general' && (
                <span className="text-xs px-1 py-0.5 bg-purple-500/30 text-purple-200 border border-purple-400/50 rounded">
                  {rack.assignment_type === 'customer_dedicated' ? 'C' : 'S'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs">
              <span className={`font-medium ${getCapacityColor(rack.current_documents, rack.max_documents)}`}>
                {rack.current_documents}/{rack.max_documents}
              </span>
              {rack.position && <span className="text-gray-400">{rack.position}</span>}
            </div>
          </div>
          {hasDocuments && (
            <span className="text-xs text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">
              {visibleDocuments.length}
            </span>
          )}
        </div>
        {expanded && hasDocuments && (
          <div className="mt-0.5 space-y-0.5">
            {visibleDocuments.map((doc: any) => renderDocument(doc))}
          </div>
        )}
      </div>
    );
  };

  const renderShelf = (shelf: any) => {
    const shelfId = `shelf-${shelf.id}`;
    const expanded = isExpanded(shelfId);
    const hasRacks = shelf.racks && shelf.racks.length > 0;

    const visibleRacks = shelf.racks?.filter((rack: any) => {
      if (!searchQuery) return true;
      return matchesSearch(rack.name) || matchesSearch(rack.code) ||
        rack.documents?.some((doc: any) => matchesSearch(doc.title) || matchesSearch(doc.barcode || ''));
    }) || [];

    if (searchQuery && visibleRacks.length === 0 && !matchesSearch(shelf.name) && !matchesSearch(shelf.code)) {
      return null;
    }

    return (
      <div key={shelf.id} className="ml-6 py-0.5">
        <div
          className={`flex items-center space-x-1.5 p-1.5 rounded-sm cursor-pointer transition-all ${
            expanded ? 'bg-white/10' : 'hover:bg-white/5'
          }`}
          onClick={() => hasRacks && toggleNode(shelfId)}
        >
          {hasRacks && (
            <span className="text-gray-400 text-xs transition-transform duration-200" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
          )}
          <span className="text-lg">📚</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-white text-xs">{shelf.name}</span>
              <span className="text-xs text-gray-400">({shelf.code})</span>
              {shelf.barcode && (
                <span className="font-mono text-xs bg-indigo-500/20 text-indigo-200 px-1 py-0.5 rounded border border-indigo-400/30">
                  {shelf.barcode}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs">
              <span className={`font-medium ${getCapacityColor(shelf.current_racks, shelf.max_racks)}`}>
                {shelf.current_racks}/{shelf.max_racks}
              </span>
            </div>
          </div>
          {hasRacks && (
            <span className="text-xs text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">
              {visibleRacks.length}
            </span>
          )}
        </div>
        {expanded && hasRacks && (
          <div className="mt-0.5 space-y-0.5">
            {visibleRacks.map((rack: any) => renderRack(rack))}
          </div>
        )}
      </div>
    );
  };

  const renderZone = (zone: any) => {
    const zoneId = `zone-${zone.id}`;
    const expanded = isExpanded(zoneId);
    const hasShelves = zone.shelves && zone.shelves.length > 0;

    return (
      <div key={zone.id} className="ml-4 py-0.5">
        <div
          className={`flex items-center space-x-1.5 p-2 rounded-md cursor-pointer transition-all ${
            expanded ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5 border border-transparent'
          }`}
          onClick={() => hasShelves && toggleNode(zoneId)}
        >
          {hasShelves && (
            <span className="text-white text-sm transition-transform duration-200" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
          )}
          <span className="text-xl">📦</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-white text-sm">{zone.name}</span>
              <span className="text-xs text-gray-400">({zone.code})</span>
              {zone.barcode && (
                <span className="font-mono text-xs bg-cyan-500/20 text-cyan-200 px-1.5 py-0.5 rounded border border-cyan-400/30">
                  {zone.barcode}
                </span>
              )}
              <span className="text-xs px-1.5 py-0.5 bg-blue-500/30 text-blue-200 border border-blue-400/50 rounded capitalize">
                {zone.zone_type}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs">
              <span className={`font-semibold ${getCapacityColor(zone.current_capacity, zone.max_capacity)}`}>
                {zone.current_capacity}/{zone.max_capacity}
              </span>
              <span className="text-gray-400">{zone.area}m²</span>
              {zone.access_level && (
                <span className="text-gray-400">L{zone.access_level}</span>
              )}
            </div>
            <div className="w-32 mt-0.5">
              {getCapacityBar(zone.current_capacity, zone.max_capacity)}
            </div>
          </div>
          {hasShelves && (
            <span className="text-xs text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">
              {zone.shelves.length}
            </span>
          )}
        </div>
        {expanded && hasShelves && (
          <div className="mt-1 space-y-0.5">
            {zone.shelves.map((shelf: any) => renderShelf(shelf))}
          </div>
        )}
      </div>
    );
  };

  const renderWarehouse = (warehouse: any) => {
    const warehouseId = `warehouse-${warehouse.id}`;
    const expanded = isExpanded(warehouseId);
    const hasZones = warehouse.zones && warehouse.zones.length > 0;

    return (
      <div key={warehouse.id} className="ml-3 py-0.5">
        <div
          className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all ${
            expanded
              ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/50'
              : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20'
          }`}
          onClick={() => hasZones && toggleNode(warehouseId)}
        >
          {hasZones && (
            <span className="text-white text-sm transition-transform duration-200" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
          )}
          <span className="text-2xl">🏭</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-white text-sm">{warehouse.name}</span>
              <span className="text-xs text-gray-400">({warehouse.code})</span>
              {warehouse.barcode && (
                <span className="font-mono text-xs bg-gray-500/30 text-gray-200 px-1.5 py-0.5 rounded border border-gray-400/30">
                  {warehouse.barcode}
                </span>
              )}
              <span className="text-xs px-1.5 py-0.5 bg-green-500/30 text-green-200 border border-green-400/50 rounded capitalize">
                {warehouse.warehouse_type?.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-300">
              <span>{warehouse.total_area}m²</span>
              <span>{warehouse.zones?.length || 0}Z</span>
            </div>
          </div>
          {hasZones && (
            <span className="text-xs text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">
              {warehouse.zones.length}
            </span>
          )}
        </div>
        {expanded && hasZones && (
          <div className="mt-1 space-y-1">
            {warehouse.zones.map((zone: any) => renderZone(zone))}
          </div>
        )}
      </div>
    );
  };

  const renderLocation = (locationHierarchy: LocationHierarchy) => {
    const { location, hierarchy } = locationHierarchy;
    const expanded = isLocationExpanded(location.id);
    const hasWarehouses = hierarchy.warehouses && hierarchy.warehouses.length > 0;

    return (
      <div key={location.id} className="mb-3">
        <div
          className={`flex items-center space-x-2 p-3 rounded-lg cursor-pointer transition-all ${
            expanded
              ? 'bg-gradient-to-br from-indigo-600/30 via-purple-600/30 to-pink-600/30 border border-indigo-400/50 shadow-lg'
              : 'bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/30'
          }`}
          onClick={() => toggleLocation(location.id)}
        >
          <span className="text-white text-sm transition-transform duration-300" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            ▶
          </span>
          <span className="text-2xl">🌍</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white">{location.name}</span>
              <span className="text-xs text-gray-300">({location.code})</span>
              <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                location.status === 'active'
                  ? 'bg-green-500/30 text-green-200 border border-green-400/50'
                  : 'bg-gray-500/30 text-gray-200 border border-gray-400/50'
              }`}>
                {location.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-300">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {location.city}, {location.country}
              </span>
              {hasWarehouses && (
                <span className="font-semibold">
                  {hierarchy.warehouses.length} WH
                </span>
              )}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLocation(location.id);
            }}
            className={`px-3 py-1.5 text-xs rounded-md font-semibold transition-all ${
              expanded
                ? 'bg-white/20 text-white border border-white/30'
                : 'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/15 hover:text-white'
            }`}
          >
            {expanded ? '−' : '+'}
          </button>
        </div>

        {expanded && hasWarehouses && (
          <div className="mt-2 pl-2 space-y-1 animate-fadeIn">
            {hierarchy.warehouses.map((warehouse: any) => renderWarehouse(warehouse))}
          </div>
        )}

        {expanded && !hasWarehouses && (
          <div className="mt-2 ml-3 p-4 text-center bg-white/5 rounded-md border border-white/10">
            <span className="text-3xl mb-1 block">🏭</span>
            <p className="text-xs text-gray-400">No warehouses</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600/30 to-blue-800/30 backdrop-blur-md border border-blue-400/30 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-200 font-medium">Locations</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.totalLocations}</p>
            </div>
            <span className="text-5xl">🌍</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600/30 to-purple-800/30 backdrop-blur-md border border-purple-400/30 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-200 font-medium">Warehouses</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.totalWarehouses}</p>
            </div>
            <span className="text-5xl">🏭</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600/30 to-green-800/30 backdrop-blur-md border border-green-400/30 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-200 font-medium">Zones</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.totalZones}</p>
            </div>
            <span className="text-5xl">📦</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-600/30 to-orange-800/30 backdrop-blur-md border border-orange-400/30 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-200 font-medium">Documents</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.totalDocuments}</p>
            </div>
            <span className="text-5xl">📄</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <div className="relative">
              <input
                type="text"
                placeholder="Search warehouses, zones, shelves, racks, or documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 bg-white/10 backdrop-blur-md border border-white/30 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 rounded-lg"
              />
              <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={expandAll}
              className="px-6 py-3 bg-green-500/30 text-green-200 border border-green-400/50 rounded-lg hover:bg-green-500/40 transition-colors font-medium"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-6 py-3 bg-red-500/30 text-red-200 border border-red-400/50 rounded-lg hover:bg-red-500/40 transition-colors font-medium"
            >
              Collapse All
            </button>
            <button
              onClick={loadAllHierarchies}
              className="px-6 py-3 bg-blue-500/30 text-blue-200 border border-blue-400/50 rounded-lg hover:bg-blue-500/40 transition-colors font-medium"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Hierarchy Tree */}
      <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl p-6">
        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-400 mx-auto mb-6"></div>
            <p className="text-xl text-gray-300 font-medium">Loading warehouse hierarchy...</p>
            <p className="text-sm text-gray-400 mt-2">Fetching data from all locations</p>
          </div>
        ) : locationHierarchies.length === 0 ? (
          <div className="py-20 text-center">
            <span className="text-7xl mb-6 block">🏭</span>
            <p className="text-xl text-gray-300 font-medium">No locations found</p>
            <p className="text-sm text-gray-400 mt-2">Start by creating a location in the Locations tab</p>
          </div>
        ) : (
          <div className="space-y-4">
            {locationHierarchies.map(locationHierarchy => renderLocation(locationHierarchy))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Legend
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <span className="text-3xl">🌍</span>
            <span className="text-sm font-medium text-white">Location</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <span className="text-3xl">🏭</span>
            <span className="text-sm font-medium text-white">Warehouse</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <span className="text-3xl">📦</span>
            <span className="text-sm font-medium text-white">Zone</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <span className="text-3xl">📚</span>
            <span className="text-sm font-medium text-white">Shelf</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <span className="text-3xl">🗄️</span>
            <span className="text-sm font-medium text-white">Rack</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <span className="text-3xl">📄</span>
            <span className="text-sm font-medium text-white">Document</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <div className="w-6 h-6 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-300">&lt; 70% Full</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <div className="w-6 h-6 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-gray-300">70-90% Full</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <div className="w-6 h-6 bg-orange-500 rounded-full"></div>
            <span className="text-sm text-gray-300">90-99% Full</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <div className="w-6 h-6 bg-red-500 rounded-full"></div>
            <span className="text-sm text-gray-300">100% Full</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseHierarchyViewer;

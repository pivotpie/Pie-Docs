import React, { useState } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LocationHierarchy } from '@/components/physical/LocationHierarchy';
import type { LocationRecord, LocationType } from '@/types/location';

interface LocationManagerProps {
  className?: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  manager: string;
  status: 'Active' | 'Inactive';
}

interface Zone {
  id: string;
  name: string;
  code: string;
  warehouseId: string;
  description: string;
  status: 'Active' | 'Inactive';
}

interface Shelf {
  id: string;
  name: string;
  code: string;
  zoneId: string;
  capacity: number;
  status: 'Active' | 'Inactive';
}

interface Rack {
  id: string;
  name: string;
  code: string;
  shelfId: string;
  position: string;
  barcode: string;
  status: 'Active' | 'Inactive';
}

interface DocumentRackAssignment {
  id: string;
  documentId: string;
  documentName: string;
  rackId: string;
  rackCode: string;
  assignedDate: string;
  assignedBy: string;
  status: 'Active' | 'Moved' | 'Retrieved';
}

interface CustomerRackAssignment {
  id: string;
  customerId: string;
  customerName: string;
  rackId: string;
  rackCode: string;
  assignedDate: string;
  expiryDate?: string;
  status: 'Active' | 'Expired' | 'Released';
}

type LocationTab = 'location-tree' | 'location-management' | 'rack-assignment';
type ManagementTab = 'warehouses' | 'zones' | 'shelves' | 'racks';
type RackAssignmentTab = 'rack-assignment-docs' | 'assigned-racks' | 'customer-rack-assignment';

export const LocationManager: React.FC<LocationManagerProps> = ({
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<LocationTab>('location-tree');
  const [managementTab, setManagementTab] = useState<ManagementTab>('warehouses');
  const [rackAssignmentTab, setRackAssignmentTab] = useState<RackAssignmentTab>('rack-assignment-docs');

  // Sample data
  const [warehouses, setWarehouses] = useState<Warehouse[]>([
    {
      id: '1',
      name: 'Jabel Ali',
      code: 'DXBJA',
      address: '-',
      manager: 'Ajay',
      status: 'Active'
    },
    {
      id: '2',
      name: 'Jumeirah',
      code: 'DXBJM',
      address: '-',
      manager: 'Ajay',
      status: 'Active'
    }
  ]);

  const [zones, setZones] = useState<Zone[]>([
    {
      id: '1',
      name: 'Zone A',
      code: 'ZA001',
      warehouseId: '1',
      description: 'Primary storage zone',
      status: 'Active'
    },
    {
      id: '2',
      name: 'Zone B',
      code: 'ZB001',
      warehouseId: '1',
      description: 'Secondary storage zone',
      status: 'Active'
    }
  ]);

  const [shelves, setShelves] = useState<Shelf[]>([
    {
      id: '1',
      name: 'Shelf 1',
      code: 'S001',
      zoneId: '1',
      capacity: 100,
      status: 'Active'
    },
    {
      id: '2',
      name: 'Shelf 2',
      code: 'S002',
      zoneId: '1',
      capacity: 150,
      status: 'Active'
    }
  ]);

  const [racks, setRacks] = useState<Rack[]>([
    {
      id: '1',
      name: 'Rack A1',
      code: 'R001',
      shelfId: '1',
      position: 'Left',
      barcode: 'RC001234567890',
      status: 'Active'
    },
    {
      id: '2',
      name: 'Rack A2',
      code: 'R002',
      shelfId: '1',
      position: 'Right',
      barcode: 'RC002234567891',
      status: 'Active'
    }
  ]);

  // Rack Assignment sample data
  const [documentRackAssignments, setDocumentRackAssignments] = useState<DocumentRackAssignment[]>([
    {
      id: '1',
      documentId: 'DOC001',
      documentName: 'Contract Agreement - ABC Corp',
      rackId: '1',
      rackCode: 'R001',
      assignedDate: '2024-09-01',
      assignedBy: 'John Smith',
      status: 'Active'
    },
    {
      id: '2',
      documentId: 'DOC002',
      documentName: 'Invoice #INV-2024-001',
      rackId: '2',
      rackCode: 'R002',
      assignedDate: '2024-09-15',
      assignedBy: 'Sarah Jones',
      status: 'Active'
    }
  ]);

  const [customerRackAssignments, setCustomerRackAssignments] = useState<CustomerRackAssignment[]>([
    {
      id: '1',
      customerId: 'CUST001',
      customerName: 'ABC Corporation',
      rackId: '1',
      rackCode: 'R001',
      assignedDate: '2024-08-01',
      expiryDate: '2024-12-01',
      status: 'Active'
    },
    {
      id: '2',
      customerId: 'CUST002',
      customerName: 'XYZ Ltd',
      rackId: '2',
      rackCode: 'R002',
      assignedDate: '2024-09-01',
      expiryDate: '2025-01-01',
      status: 'Active'
    }
  ]);

  const handleAddWarehouse = () => {
    const newWarehouse: Warehouse = {
      id: (warehouses.length + 1).toString(),
      name: `Warehouse ${warehouses.length + 1}`,
      code: `WH${(warehouses.length + 1).toString().padStart(3, '0')}`,
      address: 'To be updated',
      manager: 'To be assigned',
      status: 'Active'
    };
    setWarehouses([...warehouses, newWarehouse]);
  };

  const handleAddZone = () => {
    const newZone: Zone = {
      id: (zones.length + 1).toString(),
      name: `Zone ${String.fromCharCode(65 + zones.length)}`,
      code: `Z${String.fromCharCode(65 + zones.length)}${(zones.length + 1).toString().padStart(3, '0')}`,
      warehouseId: warehouses[0]?.id || '1',
      description: 'New zone',
      status: 'Active'
    };
    setZones([...zones, newZone]);
  };

  const handleAddShelf = () => {
    const newShelf: Shelf = {
      id: (shelves.length + 1).toString(),
      name: `Shelf ${shelves.length + 1}`,
      code: `S${(shelves.length + 1).toString().padStart(3, '0')}`,
      zoneId: zones[0]?.id || '1',
      capacity: 100,
      status: 'Active'
    };
    setShelves([...shelves, newShelf]);
  };

  const generateBarcode = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RC${timestamp}${random}`;
  };

  const handleAddRack = () => {
    const newRack: Rack = {
      id: (racks.length + 1).toString(),
      name: `Rack ${String.fromCharCode(65 + racks.length)}${racks.length + 1}`,
      code: `R${(racks.length + 1).toString().padStart(3, '0')}`,
      shelfId: shelves[0]?.id || '1',
      position: racks.length % 2 === 0 ? 'Left' : 'Right',
      barcode: generateBarcode(),
      status: 'Active'
    };
    setRacks([...racks, newRack]);
  };

  const handleEditWarehouse = (warehouseId: string) => {
    console.log('Edit warehouse:', warehouseId);
  };

  const handleDeleteWarehouse = (warehouseId: string) => {
    setWarehouses(warehouses.filter(w => w.id !== warehouseId));
  };

  const handleEditZone = (zoneId: string) => {
    console.log('Edit zone:', zoneId);
  };

  const handleDeleteZone = (zoneId: string) => {
    setZones(zones.filter(z => z.id !== zoneId));
  };

  const handleEditShelf = (shelfId: string) => {
    console.log('Edit shelf:', shelfId);
  };

  const handleDeleteShelf = (shelfId: string) => {
    setShelves(shelves.filter(s => s.id !== shelfId));
  };

  const handleEditRack = (rackId: string) => {
    console.log('Edit rack:', rackId);
  };

  const handleDeleteRack = (rackId: string) => {
    setRacks(racks.filter(r => r.id !== rackId));
  };

  const handleEditLocation = (location: LocationRecord) => {
    console.log('Edit location:', location);
  };

  const handleCreateLocation = (parentId: string, type: LocationType) => {
    console.log('Create location:', { parentId, type });
  };

  // Convert location management data to hierarchy structure
  const convertToHierarchy = () => {
    // Map warehouses to buildings
    const buildings = warehouses.map(warehouse => {
      // Find zones for this warehouse and map to floors
      const floors = zones
        .filter(zone => zone.warehouseId === warehouse.id)
        .map(zone => {
          // Find shelves for this zone and map to rooms
          const rooms = shelves
            .filter(shelf => shelf.zoneId === zone.id)
            .map(shelf => {
              // Find racks for this shelf and map to cabinets
              const cabinets = racks
                .filter(rack => rack.shelfId === shelf.id)
                .map(rack => ({
                  id: `rack-${rack.id}`,
                  name: rack.name,
                  code: rack.code,
                  type: 'cabinet' as LocationType,
                  description: `Position: ${rack.position}`,
                  parentId: `shelf-${shelf.id}`,
                  status: rack.status,
                  shelves: [] // Racks don't have children in our hierarchy
                }));

              return {
                id: `shelf-${shelf.id}`,
                name: shelf.name,
                code: shelf.code,
                type: 'room' as LocationType,
                description: `Capacity: ${shelf.capacity}`,
                parentId: `zone-${zone.id}`,
                status: shelf.status,
                cabinets
              };
            });

          return {
            id: `zone-${zone.id}`,
            name: zone.name,
            code: zone.code,
            type: 'floor' as LocationType,
            description: zone.description,
            parentId: `warehouse-${warehouse.id}`,
            status: zone.status,
            rooms
          };
        });

      return {
        id: `warehouse-${warehouse.id}`,
        name: warehouse.name,
        code: warehouse.code,
        type: 'building' as LocationType,
        description: `Manager: ${warehouse.manager}`,
        parentId: '',
        status: warehouse.status,
        floors
      };
    });

    return {
      buildings,
      totalLocations: warehouses.length + zones.length + shelves.length + racks.length,
      lastUpdated: new Date().toISOString()
    };
  };

  const renderRackAssignmentContent = () => {
    switch (rackAssignmentTab) {
      case 'rack-assignment-docs':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Documents to Racks</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Document Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Document</label>
                  <select className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <option>Select a document...</option>
                    <option>Contract Agreement - ABC Corp</option>
                    <option>Invoice #INV-2024-001</option>
                    <option>Legal Document - XYZ Case</option>
                  </select>
                </div>
                {/* Rack Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Rack</label>
                  <select className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <option>Select a rack...</option>
                    {racks.map(rack => (
                      <option key={rack.id} value={rack.id}>{rack.code} - {rack.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Assign Document to Rack
                </button>
              </div>
            </div>
          </div>
        );

      case 'assigned-racks':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Currently Assigned Racks</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rack</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {documentRackAssignments.map(assignment => (
                      <tr key={assignment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assignment.documentName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assignment.rackCode}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assignment.assignedDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assignment.assignedBy}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            assignment.status === 'Active' ? 'bg-green-100 text-green-800' :
                            assignment.status === 'Moved' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {assignment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                          <button className="text-red-600 hover:text-red-900">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'customer-rack-assignment':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Racks to Customers</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Customer Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Customer</label>
                  <select className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <option>Select a customer...</option>
                    <option>ABC Corporation</option>
                    <option>XYZ Ltd</option>
                    <option>DEF Industries</option>
                  </select>
                </div>
                {/* Rack Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Rack</label>
                  <select className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <option>Select a rack...</option>
                    {racks.map(rack => (
                      <option key={rack.id} value={rack.id}>{rack.code} - {rack.name}</option>
                    ))}
                  </select>
                </div>
                {/* Expiry Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="mt-4">
                <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                  Assign Rack to Customer
                </button>
              </div>
            </div>

            {/* Customer Assignments Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Customer Rack Assignments</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rack</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customerRackAssignments.map(assignment => (
                      <tr key={assignment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assignment.customerName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assignment.rackCode}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assignment.assignedDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assignment.expiryDate || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            assignment.status === 'Active' ? 'bg-green-100 text-green-800' :
                            assignment.status === 'Expired' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {assignment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                          <button className="text-red-600 hover:text-red-900">Release</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'location-tree':
        return (
          <div className="h-full">
            <LocationHierarchy
              canEdit={true}
              onEditLocation={handleEditLocation}
              onCreateLocation={handleCreateLocation}
              className="h-full"
              hierarchyData={convertToHierarchy()}
            />
          </div>
        );

      case 'location-management':
        return (
          <div className="h-full flex flex-col">
            {/* Sub-tabs for different location types */}
            <div className="bg-white border-b border-gray-200">
              <div className="px-6">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setManagementTab('warehouses')}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      managementTab === 'warehouses'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>Warehouses</span>
                  </button>
                  <button
                    onClick={() => setManagementTab('zones')}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      managementTab === 'zones'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Zones</span>
                  </button>
                  <button
                    onClick={() => setManagementTab('shelves')}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      managementTab === 'shelves'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>Shelves</span>
                  </button>
                  <button
                    onClick={() => setManagementTab('racks')}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      managementTab === 'racks'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    <span>Racks</span>
                  </button>
                </nav>
              </div>
            </div>

            {/* Management Tab Content */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full p-6">
                {managementTab === 'warehouses' && (
                  <div className="bg-white rounded-lg shadow h-full flex flex-col">
                    <div className="flex justify-between items-center p-6 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Warehouses</h2>
                      <button
                        onClick={handleAddWarehouse}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Warehouse
                      </button>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {warehouses.map((warehouse) => (
                            <tr key={warehouse.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{warehouse.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{warehouse.code}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{warehouse.address}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{warehouse.manager}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  warehouse.status === 'Active' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {warehouse.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex space-x-2">
                                  <button onClick={() => handleEditWarehouse(warehouse.id)} className="text-gray-400 hover:text-gray-600 transition-colors" title="Edit">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button onClick={() => handleDeleteWarehouse(warehouse.id)} className="text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {managementTab === 'zones' && (
                  <div className="bg-white rounded-lg shadow h-full flex flex-col">
                    <div className="flex justify-between items-center p-6 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Zones</h2>
                      <button
                        onClick={handleAddZone}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Zone
                      </button>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {zones.map((zone) => (
                            <tr key={zone.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{zone.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{zone.code}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {warehouses.find(w => w.id === zone.warehouseId)?.name || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{zone.description}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  zone.status === 'Active' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {zone.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex space-x-2">
                                  <button onClick={() => handleEditZone(zone.id)} className="text-gray-400 hover:text-gray-600 transition-colors" title="Edit">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button onClick={() => handleDeleteZone(zone.id)} className="text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {managementTab === 'shelves' && (
                  <div className="bg-white rounded-lg shadow h-full flex flex-col">
                    <div className="flex justify-between items-center p-6 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Shelves</h2>
                      <button
                        onClick={handleAddShelf}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Shelf
                      </button>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zone</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {shelves.map((shelf) => (
                            <tr key={shelf.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{shelf.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{shelf.code}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {zones.find(z => z.id === shelf.zoneId)?.name || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{shelf.capacity}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  shelf.status === 'Active' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {shelf.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex space-x-2">
                                  <button onClick={() => handleEditShelf(shelf.id)} className="text-gray-400 hover:text-gray-600 transition-colors" title="Edit">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button onClick={() => handleDeleteShelf(shelf.id)} className="text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {managementTab === 'racks' && (
                  <div className="bg-white rounded-lg shadow h-full flex flex-col">
                    <div className="flex justify-between items-center p-6 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Racks</h2>
                      <button
                        onClick={handleAddRack}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Rack
                      </button>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shelf</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {racks.map((rack) => (
                            <tr key={rack.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rack.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rack.code}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {shelves.find(s => s.id === rack.shelfId)?.name || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rack.position}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{rack.barcode}</span>
                                  <button
                                    onClick={() => navigator.clipboard.writeText(rack.barcode)}
                                    className="text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Copy barcode"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  rack.status === 'Active' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {rack.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex space-x-2">
                                  <button onClick={() => handleEditRack(rack.id)} className="text-gray-400 hover:text-gray-600 transition-colors" title="Edit">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button onClick={() => handleDeleteRack(rack.id)} className="text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'rack-assignment':
        return (
          <div className="h-full flex flex-col">
            {/* Sub-tabs for Rack Assignment */}
            <div className="bg-white border-b border-gray-200">
              <div className="px-6">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setRackAssignmentTab('rack-assignment-docs')}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                      rackAssignmentTab === 'rack-assignment-docs'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Rack Assignment
                  </button>
                  <button
                    onClick={() => setRackAssignmentTab('assigned-racks')}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                      rackAssignmentTab === 'assigned-racks'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Assigned Racks
                  </button>
                  <button
                    onClick={() => setRackAssignmentTab('customer-rack-assignment')}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                      rackAssignmentTab === 'customer-rack-assignment'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Customer Rack Assignment
                  </button>
                </nav>
              </div>
            </div>

            {/* Rack Assignment Content */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full p-6">
                {renderRackAssignmentContent()}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
      <div className={`h-full flex flex-col bg-gray-50 ${className}`}>
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">Location Manager</h1>
        </div>

        {/* Tab navigation for Location Manager */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('location-tree')}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'location-tree'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                </svg>
                <span>Location Tree</span>
              </button>

              <button
                onClick={() => setActiveTab('location-management')}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'location-management'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Location Management</span>
              </button>
              <button
                onClick={() => setActiveTab('rack-assignment')}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'rack-assignment'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span>Rack Assignment</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};
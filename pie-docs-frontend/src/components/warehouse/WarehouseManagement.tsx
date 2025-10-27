import React, { useState, useEffect } from 'react';
import { warehouseServices } from '@/services/warehouseService';
import type { Warehouse, WarehouseCreate, WarehouseUpdate, Location } from '@/types/warehouse';

interface WarehouseManagementProps {
  selectedLocation?: Location;
  onWarehouseSelected?: (warehouse: Warehouse) => void;
}

export const WarehouseManagement: React.FC<WarehouseManagementProps> = ({
  selectedLocation,
  onWarehouseSelected
}) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState<WarehouseCreate>({
    location_id: selectedLocation?.id || '',
    code: '',
    barcode: '',
    name: '',
    description: '',
    warehouse_type: 'standard',
    total_area: 0,
    operational_hours: undefined,
    contact: {
      supervisor: '',
      phone: '',
      email: ''
    }
  });

  useEffect(() => {
    loadLocations();
    loadWarehouses();
  }, [selectedLocation, statusFilter]);

  const loadLocations = async () => {
    try {
      const data = await warehouseServices.locations.list({ status: 'active' });
      setLocations(data);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (selectedLocation) {
        filters.location_id = selectedLocation.id;
      }
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      const data = await warehouseServices.warehouses.list(filters);
      setWarehouses(data);
    } catch (error) {
      console.error('Failed to load warehouses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // TODO: Get from auth context - using a valid UUID format for now
      const userId = '00000000-0000-0000-0000-000000000001';

      // Convert empty barcode to null
      const dataToSubmit = {
        ...formData,
        barcode: formData.barcode?.trim() || null
      };

      if (editingWarehouse) {
        // Update existing warehouse
        const updated = await warehouseServices.warehouses.update(
          editingWarehouse.id,
          dataToSubmit as WarehouseUpdate,
          userId
        );
        setWarehouses(prev => prev.map(wh => wh.id === updated.id ? updated : wh));
      } else {
        // Create new warehouse
        const newWarehouse = await warehouseServices.warehouses.create(dataToSubmit, userId);
        setWarehouses(prev => [...prev, newWarehouse]);
      }

      resetForm();
      setShowForm(false);
    } catch (error: any) {
      console.error('Failed to save warehouse:', error);
      console.error('Error response:', error.response);
      console.error('Form data submitted:', formData);

      // Handle specific error cases
      if (error.response?.status === 409) {
        // Display the specific conflict error from backend
        const errorMsg = error.response.data.detail || 'Warehouse code or barcode already exists';
        console.error('Conflict error detail:', errorMsg);
        alert(errorMsg);
      } else if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      } else {
        alert(error.message || 'Failed to save warehouse');
      }
    }
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      location_id: warehouse.location_id,
      code: warehouse.code,
      barcode: warehouse.barcode,
      name: warehouse.name,
      description: warehouse.description,
      warehouse_type: warehouse.warehouse_type,
      total_area: warehouse.total_area,
      operational_hours: warehouse.operational_hours,
      contact: warehouse.contact
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      location_id: selectedLocation?.id || '',
      code: '',
      barcode: '',
      name: '',
      description: '',
      warehouse_type: 'standard',
      total_area: 0,
      operational_hours: undefined,
      contact: {
        supervisor: '',
        phone: '',
        email: ''
      }
    });
    setEditingWarehouse(null);
  };

  const generateBarcode = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    setFormData({ ...formData, barcode: `WH-${timestamp}-${random}` });
  };

  const filteredWarehouses = warehouses.filter(warehouse =>
    warehouse.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    warehouse.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (warehouse.barcode && warehouse.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search warehouses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Maintenance</option>
          </select>

          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-500/30 backdrop-blur-sm text-white border border-blue-400/50 rounded-md hover:bg-blue-500/50 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Warehouse
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">
                {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-gray-300 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Location Selection */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Location *
                </label>
                <select
                  required
                  value={formData.location_id}
                  onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                >
                  <option value="" className="bg-gray-800 text-white">Select a location...</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id} className="bg-gray-800 text-white">
                      {location.name} ({location.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Warehouse Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                    placeholder="WH-DXBJA-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Barcode (Optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.barcode || ''}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="WH-12345678-ABCD"
                    />
                    <button
                      type="button"
                      onClick={generateBarcode}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                      title="Generate Barcode"
                    >
                      🔄
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Warehouse Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                  placeholder="Main Storage Facility"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                  placeholder="Warehouse description..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Warehouse Type *
                  </label>
                  <select
                    required
                    value={formData.warehouse_type}
                    onChange={(e) => setFormData({ ...formData, warehouse_type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                  >
                    <option value="standard">Standard</option>
                    <option value="climate_controlled">Climate Controlled</option>
                    <option value="secure">Secure</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Total Area (m²) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.total_area}
                    onChange={(e) => setFormData({ ...formData, total_area: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                    placeholder="1000"
                  />
                </div>
              </div>

              <div className="border-t border-white/20 pt-4">
                <h4 className="text-sm font-medium text-white mb-3">Contact Information</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Supervisor Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.contact.supervisor || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        contact: { ...formData.contact, supervisor: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-1">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.contact.phone}
                        onChange={(e) => setFormData({
                          ...formData,
                          contact: { ...formData.contact, phone: e.target.value }
                        })}
                        className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.contact.email}
                        onChange={(e) => setFormData({
                          ...formData,
                          contact: { ...formData.contact, email: e.target.value }
                        })}
                        className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-gray-300 rounded-md hover:bg-white/20 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500/30 backdrop-blur-sm text-white border border-blue-400/50 rounded-md hover:bg-blue-500/50 transition-colors"
                >
                  {editingWarehouse ? 'Update Warehouse' : 'Create Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warehouses Table */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-white">Loading warehouses...</p>
          </div>
        ) : filteredWarehouses.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-300">No warehouses found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/20">
              <thead className="bg-white/10 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Area (m²)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Barcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/5 divide-y divide-white/20">
                {filteredWarehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="hover:bg-white/10">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {warehouse.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {warehouse.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span className="capitalize">{warehouse.warehouse_type.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {warehouse.total_area.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {warehouse.barcode ? (
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {warehouse.barcode}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        warehouse.status === 'active' ? 'bg-green-500/30 text-green-200 border border-green-400/50' :
                        warehouse.status === 'inactive' ? 'bg-gray-500/30 text-gray-200 border border-gray-400/50' :
                        'bg-yellow-500/30 text-yellow-200 border border-yellow-400/50'
                      }`}>
                        {warehouse.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(warehouse)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Edit
                        </button>
                        {onWarehouseSelected && (
                          <button
                            onClick={() => onWarehouseSelected(warehouse)}
                            className="text-green-400 hover:text-green-300"
                          >
                            Select
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarehouseManagement;

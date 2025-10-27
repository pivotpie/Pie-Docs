import React, { useState, useEffect } from 'react';
import { warehouseServices } from '@/services/warehouseService';
import type { Zone, ZoneCreate, ZoneUpdate, Warehouse } from '@/types/warehouse';

interface ZoneManagementProps {
  selectedWarehouse?: Warehouse;
  onZoneSelected?: (zone: Zone) => void;
}

export const ZoneManagement: React.FC<ZoneManagementProps> = ({
  selectedWarehouse,
  onZoneSelected
}) => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState<ZoneCreate>({
    warehouse_id: selectedWarehouse?.id || '',
    code: '',
    barcode: '',
    name: '',
    description: '',
    zone_type: 'storage',
    area: 0,
    max_capacity: 10,
    environmental_control: {
      temperature_min: 18,
      temperature_max: 24,
      humidity_min: 40,
      humidity_max: 60,
      monitoring_enabled: false
    },
    access_level: 1
  });

  useEffect(() => {
    loadWarehouses();
    loadZones();
  }, [selectedWarehouse, statusFilter]);

  const loadWarehouses = async () => {
    try {
      const data = await warehouseServices.warehouses.list({ status: 'active' });
      setWarehouses(data);
    } catch (error) {
      console.error('Failed to load warehouses:', error);
    }
  };

  const loadZones = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (selectedWarehouse) {
        filters.warehouse_id = selectedWarehouse.id;
      }
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      const data = await warehouseServices.zones.list(filters);
      setZones(data);
    } catch (error) {
      console.error('Failed to load zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate barcode is provided
    if (!formData.barcode || formData.barcode.trim() === '') {
      alert('Barcode is required for zones');
      return;
    }

    try {
      // TODO: Get from auth context - using a valid UUID format for now
      const userId = '00000000-0000-0000-0000-000000000001';

      if (editingZone) {
        // Update existing zone
        const updated = await warehouseServices.zones.update(
          editingZone.id,
          formData as ZoneUpdate,
          userId
        );
        setZones(prev => prev.map(z => z.id === updated.id ? updated : z));
      } else {
        // Create new zone
        const newZone = await warehouseServices.zones.create(formData, userId);
        setZones(prev => [...prev, newZone]);
      }

      resetForm();
      setShowForm(false);
    } catch (error: any) {
      console.error('Failed to save zone:', error);
      // Handle specific error cases
      if (error.response?.status === 409) {
        alert(error.response.data.detail || 'Zone code or barcode already exists');
      } else if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      } else {
        alert(error.message || 'Failed to save zone');
      }
    }
  };

  const handleEdit = (zone: Zone) => {
    setEditingZone(zone);
    setFormData({
      warehouse_id: zone.warehouse_id,
      code: zone.code,
      barcode: zone.barcode,
      name: zone.name,
      description: zone.description,
      zone_type: zone.zone_type,
      area: zone.area,
      max_capacity: zone.max_capacity,
      environmental_control: zone.environmental_control,
      access_level: zone.access_level
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      warehouse_id: selectedWarehouse?.id || '',
      code: '',
      barcode: '',
      name: '',
      description: '',
      zone_type: 'storage',
      area: 0,
      max_capacity: 10,
      environmental_control: {
        temperature_min: 18,
        temperature_max: 24,
        humidity_min: 40,
        humidity_max: 60,
        monitoring_enabled: false
      },
      access_level: 1
    });
    setEditingZone(null);
  };

  const generateBarcode = async () => {
    try {
      const barcode = await warehouseServices.barcode.generateBarcode('zone', 'ZN');
      setFormData({ ...formData, barcode });
    } catch (error) {
      console.error('Failed to generate barcode:', error);
    }
  };

  const filteredZones = zones.filter(zone =>
    zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    zone.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    zone.barcode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCapacityColor = (zone: Zone) => {
    const utilizationPercent = (zone.current_capacity / zone.max_capacity) * 100;
    if (utilizationPercent >= 100) return 'text-red-300';
    if (utilizationPercent >= 90) return 'text-orange-300';
    if (utilizationPercent >= 70) return 'text-yellow-300';
    return 'text-green-300';
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search zones by name, code, or barcode..."
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
            <option className="bg-gray-800" value="all">All Status</option>
            <option className="bg-gray-800" value="active">Active</option>
            <option className="bg-gray-800" value="inactive">Inactive</option>
            <option className="bg-gray-800" value="maintenance">Maintenance</option>
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
            Add Zone
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center sticky top-0 bg-purple-900/95 backdrop-blur-md z-10">
              <h3 className="text-lg font-semibold text-white">
                {editingZone ? 'Edit Zone' : 'Add New Zone'}
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

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Warehouse Selection */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Warehouse *
                </label>
                <select
                  required
                  value={formData.warehouse_id}
                  onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                >
                  <option className="bg-gray-800 text-white" value="">Select a warehouse...</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id} className="bg-gray-800 text-white">
                      {warehouse.name} ({warehouse.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Zone Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                    placeholder="ZN-A-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Barcode * <span className="text-red-400">(Required)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="flex-1 px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                      placeholder="ZN-12345678-ABCD"
                    />
                    <button
                      type="button"
                      onClick={generateBarcode}
                      className="px-3 py-2 bg-green-500/20 text-green-200 border border-green-400/50 rounded-md hover:bg-green-500/30 transition-colors text-sm"
                      title="Generate Barcode"
                    >
                      🔄 Generate
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-300">Barcode is required for zone tracking</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Zone Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                  placeholder="Zone A - Storage"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                  placeholder="Zone description..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Zone Type *
                  </label>
                  <select
                    required
                    value={formData.zone_type}
                    onChange={(e) => setFormData({ ...formData, zone_type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                  >
                    <option className="bg-gray-800" value="storage">Storage</option>
                    <option className="bg-gray-800" value="receiving">Receiving</option>
                    <option className="bg-gray-800" value="dispatch">Dispatch</option>
                    <option className="bg-gray-800" value="processing">Processing</option>
                    <option className="bg-gray-800" value="archive">Archive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Area (m²) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                    placeholder="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Max Shelves *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.max_capacity}
                    onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Access Level * (1-5, 5 being highest security)
                </label>
                <select
                  required
                  value={formData.access_level}
                  onChange={(e) => setFormData({ ...formData, access_level: parseInt(e.target.value) as any })}
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                >
                  <option className="bg-gray-800" value={1}>Level 1 - Public</option>
                  <option className="bg-gray-800" value={2}>Level 2 - Staff</option>
                  <option className="bg-gray-800" value={3}>Level 3 - Management</option>
                  <option className="bg-gray-800" value={4}>Level 4 - Restricted</option>
                  <option className="bg-gray-800" value={5}>Level 5 - Maximum Security</option>
                </select>
              </div>

              {/* Environmental Control */}
              <div className="border-t border-white/20 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-white">Environmental Control</h4>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.environmental_control?.monitoring_enabled || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        environmental_control: {
                          ...formData.environmental_control!,
                          monitoring_enabled: e.target.checked
                        }
                      })}
                      className="rounded border-white/20 text-blue-500 focus:ring-blue-500 bg-white/10"
                    />
                    <span className="text-sm text-gray-200">Enable Monitoring</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Temperature Range (°C)
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        step="0.1"
                        value={formData.environmental_control?.temperature_min || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          environmental_control: {
                            ...formData.environmental_control!,
                            temperature_min: parseFloat(e.target.value)
                          }
                        })}
                        className="flex-1 px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                        placeholder="Min"
                      />
                      <span className="text-gray-300">to</span>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.environmental_control?.temperature_max || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          environmental_control: {
                            ...formData.environmental_control!,
                            temperature_max: parseFloat(e.target.value)
                          }
                        })}
                        className="flex-1 px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                        placeholder="Max"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Humidity Range (%)
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.environmental_control?.humidity_min || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          environmental_control: {
                            ...formData.environmental_control!,
                            humidity_min: parseFloat(e.target.value)
                          }
                        })}
                        className="flex-1 px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                        placeholder="Min"
                      />
                      <span className="text-gray-300">to</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.environmental_control?.humidity_max || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          environmental_control: {
                            ...formData.environmental_control!,
                            humidity_max: parseFloat(e.target.value)
                          }
                        })}
                        className="flex-1 px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                        placeholder="Max"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/20">
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
                  {editingZone ? 'Update Zone' : 'Create Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zones Table */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-white">Loading zones...</p>
          </div>
        ) : filteredZones.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-300">No zones found</p>
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
                    Warehouse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Barcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Access Level
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
                {filteredZones.map((zone) => (
                  <tr key={zone.id} className="hover:bg-white/10">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {zone.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {zone.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {(zone as any).warehouse_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs bg-blue-500/20 text-blue-200 px-2 py-1 rounded border border-blue-400/50">
                          {zone.barcode}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${
                          zone.barcode_status === 'scanned' ? 'bg-green-500/30 text-green-200 border border-green-400/50' :
                          zone.barcode_status === 'printed' ? 'bg-blue-500/30 text-blue-200 border border-blue-400/50' :
                          'bg-gray-500/30 text-gray-200 border border-gray-400/50'
                        }`}>
                          {zone.barcode_status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span className="capitalize">{zone.zone_type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${getCapacityColor(zone)}`}>
                        {zone.current_capacity} / {zone.max_capacity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      Level {zone.access_level}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        zone.status === 'active' ? 'bg-green-500/30 text-green-200 border border-green-400/50' :
                        zone.status === 'inactive' ? 'bg-gray-500/30 text-gray-200 border border-gray-400/50' :
                        'bg-yellow-500/30 text-yellow-200 border border-yellow-400/50'
                      }`}>
                        {zone.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(zone)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Edit
                        </button>
                        {onZoneSelected && (
                          <button
                            onClick={() => onZoneSelected(zone)}
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

export default ZoneManagement;

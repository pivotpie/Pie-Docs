import React, { useState, useEffect } from 'react';
import { warehouseServices } from '@/services/warehouseService';
import type { Shelf, ShelfCreate, ShelfUpdate, Zone } from '@/types/warehouse';

interface ShelfManagementProps {
  selectedZone?: Zone;
  onShelfSelected?: (shelf: Shelf) => void;
}

export const ShelfManagement: React.FC<ShelfManagementProps> = ({
  selectedZone,
  onShelfSelected
}) => {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState<ShelfCreate>({
    zone_id: selectedZone?.id || '',
    code: '',
    barcode: '',
    name: '',
    description: '',
    shelf_type: 'standard',
    dimensions: {
      width: 100,
      depth: 50,
      height: 200
    },
    weight_capacity: 500,
    max_racks: 10,
    position: {
      row: 'A',
      column: 1,
      level: 1
    }
  });

  useEffect(() => {
    loadZones();
    loadShelves();
  }, [selectedZone, statusFilter]);

  const loadZones = async () => {
    try {
      const data = await warehouseServices.zones.list({ status: 'active' });
      setZones(data);
    } catch (error) {
      console.error('Failed to load zones:', error);
    }
  };

  const loadShelves = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (selectedZone) {
        filters.zone_id = selectedZone.id;
      }
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      const data = await warehouseServices.shelves.list(filters);
      setShelves(data);
    } catch (error) {
      console.error('Failed to load shelves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.barcode || formData.barcode.trim() === '') {
      alert('Barcode is required for shelves');
      return;
    }

    try {
      // TODO: Get from auth context - using a valid UUID format for now
      const userId = '00000000-0000-0000-0000-000000000001';

      if (editingShelf) {
        const updated = await warehouseServices.shelves.update(
          editingShelf.id,
          formData as ShelfUpdate,
          userId
        );
        setShelves(prev => prev.map(s => s.id === updated.id ? updated : s));
      } else {
        const newShelf = await warehouseServices.shelves.create(formData, userId);
        setShelves(prev => [...prev, newShelf]);
      }

      resetForm();
      setShowForm(false);
    } catch (error: any) {
      console.error('Failed to save shelf:', error);
      // Handle specific error cases
      if (error.response?.status === 409) {
        alert(error.response.data.detail || 'Shelf code or barcode already exists');
      } else if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      } else {
        alert(error.message || 'Failed to save shelf');
      }
    }
  };

  const handleEdit = (shelf: Shelf) => {
    setEditingShelf(shelf);
    setFormData({
      zone_id: shelf.zone_id,
      code: shelf.code,
      barcode: shelf.barcode,
      name: shelf.name,
      description: shelf.description,
      shelf_type: shelf.shelf_type,
      dimensions: shelf.dimensions,
      weight_capacity: shelf.weight_capacity,
      max_racks: shelf.max_racks,
      position: shelf.position
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      zone_id: selectedZone?.id || '',
      code: '',
      barcode: '',
      name: '',
      description: '',
      shelf_type: 'standard',
      dimensions: {
        width: 100,
        depth: 50,
        height: 200
      },
      weight_capacity: 500,
      max_racks: 10,
      position: {
        row: 'A',
        column: 1,
        level: 1
      }
    });
    setEditingShelf(null);
  };

  const generateBarcode = async () => {
    try {
      const barcode = await warehouseServices.barcode.generateBarcode('shelf', 'SH');
      setFormData({ ...formData, barcode });
    } catch (error) {
      console.error('Failed to generate barcode:', error);
    }
  };

  const filteredShelves = shelves.filter(shelf =>
    shelf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shelf.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shelf.barcode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCapacityColor = (shelf: Shelf) => {
    const utilizationPercent = (shelf.current_racks / shelf.max_racks) * 100;
    if (utilizationPercent >= 100) return 'text-red-300';
    if (utilizationPercent >= 90) return 'text-orange-300';
    if (utilizationPercent >= 70) return 'text-yellow-300';
    return 'text-green-300';
  };

  const formatPosition = (position: any) => {
    if (!position) return 'N/A';
    return `${position.row || '?'}${position.column || '?'}-L${position.level || '?'}`;
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search shelves by name, code, or barcode..."
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
            Add Shelf
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center sticky top-0 bg-purple-900/95 backdrop-blur-md z-10">
              <h3 className="text-lg font-semibold text-white">
                {editingShelf ? 'Edit Shelf' : 'Add New Shelf'}
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
              {/* Zone Selection */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Zone *
                </label>
                <select
                  required
                  value={formData.zone_id}
                  onChange={(e) => setFormData({ ...formData, zone_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                >
                  <option className="bg-gray-800 text-white" value="">Select a zone...</option>
                  {zones.map(zone => (
                    <option key={zone.id} value={zone.id} className="bg-gray-800 text-white">
                      {zone.name} ({zone.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Shelf Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                    placeholder="SH-A-001"
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
                      placeholder="SH-12345678-ABCD"
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
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Shelf Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                  placeholder="Shelf A1"
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
                  placeholder="Shelf description..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Shelf Type *
                  </label>
                  <select
                    required
                    value={formData.shelf_type}
                    onChange={(e) => setFormData({ ...formData, shelf_type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                  >
                    <option className="bg-gray-800" value="standard">Standard</option>
                    <option className="bg-gray-800" value="heavy_duty">Heavy Duty</option>
                    <option className="bg-gray-800" value="mobile">Mobile</option>
                    <option className="bg-gray-800" value="compact">Compact</option>
                    <option className="bg-gray-800" value="archive">Archive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Max Racks *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.max_racks}
                    onChange={(e) => setFormData({ ...formData, max_racks: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                    placeholder="10"
                  />
                </div>
              </div>

              {/* Dimensions */}
              <div className="border-t border-white/20 pt-4">
                <h4 className="text-sm font-medium text-white mb-3">Dimensions (cm)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Width *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.1"
                      value={formData.dimensions.width}
                      onChange={(e) => setFormData({
                        ...formData,
                        dimensions: { ...formData.dimensions, width: parseFloat(e.target.value) }
                      })}
                      className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Depth *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.1"
                      value={formData.dimensions.depth}
                      onChange={(e) => setFormData({
                        ...formData,
                        dimensions: { ...formData.dimensions, depth: parseFloat(e.target.value) }
                      })}
                      className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                      placeholder="50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Height *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.1"
                      value={formData.dimensions.height}
                      onChange={(e) => setFormData({
                        ...formData,
                        dimensions: { ...formData.dimensions, height: parseFloat(e.target.value) }
                      })}
                      className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                      placeholder="200"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-medium text-white mb-1">
                    Weight Capacity (kg) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.1"
                    value={formData.weight_capacity}
                    onChange={(e) => setFormData({ ...formData, weight_capacity: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                    placeholder="500"
                  />
                </div>
              </div>

              {/* Position */}
              <div className="border-t border-white/20 pt-4">
                <h4 className="text-sm font-medium text-white mb-3">Position in Zone</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Row *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.position.row}
                      onChange={(e) => setFormData({
                        ...formData,
                        position: { ...formData.position, row: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                      placeholder="A, B, C..."
                      maxLength={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Column *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.position.column}
                      onChange={(e) => setFormData({
                        ...formData,
                        position: { ...formData.position, column: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                      placeholder="1, 2, 3..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Level *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.position.level}
                      onChange={(e) => setFormData({
                        ...formData,
                        position: { ...formData.position, level: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                      placeholder="1, 2, 3..."
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-300">
                  Example: Row A, Column 1, Level 2 = A1-L2
                </p>
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
                  {editingShelf ? 'Update Shelf' : 'Create Shelf'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shelves Table */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-white">Loading shelves...</p>
          </div>
        ) : filteredShelves.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-300">No shelves found</p>
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
                    Zone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Barcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Dimensions
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
                {filteredShelves.map((shelf) => (
                  <tr key={shelf.id} className="hover:bg-white/10">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {shelf.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {shelf.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {(shelf as any).zone_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span className="font-mono text-xs bg-blue-500/20 text-blue-200 px-2 py-1 rounded border border-blue-400/50">
                        {shelf.barcode}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span className="font-semibold">{formatPosition(shelf.position)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span className="capitalize">{shelf.shelf_type.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${getCapacityColor(shelf)}`}>
                        {shelf.current_racks} / {shelf.max_racks}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span className="text-xs">
                        {shelf.dimensions.width}×{shelf.dimensions.depth}×{shelf.dimensions.height}cm
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        shelf.status === 'active' ? 'bg-green-500/30 text-green-200 border border-green-400/50' :
                        shelf.status === 'inactive' ? 'bg-gray-500/30 text-gray-200 border border-gray-400/50' :
                        'bg-yellow-500/30 text-yellow-200 border border-yellow-400/50'
                      }`}>
                        {shelf.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(shelf)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Edit
                        </button>
                        {onShelfSelected && (
                          <button
                            onClick={() => onShelfSelected(shelf)}
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

export default ShelfManagement;

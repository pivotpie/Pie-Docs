import React, { useState, useEffect } from 'react';
import { warehouseServices } from '@/services/warehouseService';
import type { Location, LocationCreate, LocationUpdate } from '@/types/warehouse';

interface LocationManagementProps {
  onLocationSelected?: (location: Location) => void;
}

export const LocationManagement: React.FC<LocationManagementProps> = ({
  onLocationSelected
}) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState<LocationCreate>({
    code: '',
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    contact: {
      manager: '',
      phone: '',
      email: ''
    },
    timezone: 'UTC'
  });

  useEffect(() => {
    loadLocations();
  }, [statusFilter]);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      const data = await warehouseServices.locations.list(filters);
      setLocations(data);
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // TODO: Get from auth context - using a valid UUID format for now
      const userId = '00000000-0000-0000-0000-000000000001';

      if (editingLocation) {
        // Update existing location
        const updated = await warehouseServices.locations.update(
          editingLocation.id,
          formData as LocationUpdate,
          userId
        );
        setLocations(prev => prev.map(loc => loc.id === updated.id ? updated : loc));
      } else {
        // Create new location
        const newLocation = await warehouseServices.locations.create(formData, userId);
        setLocations(prev => [...prev, newLocation]);
      }

      resetForm();
      setShowForm(false);
    } catch (error: any) {
      console.error('Failed to save location:', error);
      // Handle specific error cases
      if (error.response?.status === 409) {
        alert(`Location code "${formData.code}" already exists. Please use a different code.`);
      } else if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      } else {
        alert(error.message || 'Failed to save location');
      }
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      code: location.code,
      name: location.name,
      address: location.address,
      city: location.city,
      state: location.state,
      country: location.country,
      postal_code: location.postal_code,
      contact: location.contact,
      timezone: location.timezone,
      coordinates: location.coordinates
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postal_code: '',
      contact: {
        manager: '',
        phone: '',
        email: ''
      },
      timezone: 'UTC'
    });
    setEditingLocation(null);
  };

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search locations..."
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
            Add Location
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">
                {editingLocation ? 'Edit Location' : 'Add New Location'}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Location Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                    placeholder="LOC-DXB-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                    placeholder="Dubai Jebel Ali"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                    placeholder="Dubai"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    State/Province
                  </label>
                  <input
                    type="text"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Country *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                    placeholder="UAE"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.postal_code || ''}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Timezone *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white focus:ring-blue-400 focus:border-blue-400 rounded-md placeholder-gray-300"
                    placeholder="Asia/Dubai"
                  />
                </div>
              </div>

              <div className="border-t border-white/20 pt-4">
                <h4 className="text-sm font-medium text-white mb-3">Contact Information</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Manager Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.contact.manager}
                      onChange={(e) => setFormData({
                        ...formData,
                        contact: { ...formData.contact, manager: e.target.value }
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
                  {editingLocation ? 'Update Location' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Locations Table */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-white">Loading locations...</p>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-300">No locations found</p>
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
                    City
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Manager
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
                {filteredLocations.map((location) => (
                  <tr key={location.id} className="hover:bg-white/10">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {location.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {location.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {location.city}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {location.country}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {location.contact.manager}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        location.status === 'active' ? 'bg-green-500/30 text-green-200 border border-green-400/50' :
                        location.status === 'inactive' ? 'bg-gray-500/30 text-gray-200 border border-gray-400/50' :
                        'bg-yellow-500/30 text-yellow-200 border border-yellow-400/50'
                      }`}>
                        {location.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(location)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Edit
                        </button>
                        {onLocationSelected && (
                          <button
                            onClick={() => onLocationSelected(location)}
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

export default LocationManagement;

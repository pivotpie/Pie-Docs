import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { RootState } from '@/store';
import { updateCapacityData, setCapacityAlert } from '@/store/slices/locationSlice';

interface CapacityUtilization {
  locationId: string;
  locationName: string;
  locationLevel: 'building' | 'floor' | 'room' | 'cabinet' | 'shelf';
  totalCapacity: number;
  currentUtilization: number;
  utilizationPercentage: number;
  documentCount: number;
  status: 'optimal' | 'warning' | 'critical';
}

interface CapacityAlert {
  id: string;
  locationId: string;
  locationName: string;
  alertType: 'approaching_limit' | 'over_limit' | 'optimization_needed';
  severity: 'low' | 'medium' | 'high';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
}

interface PlacementRecommendation {
  id: string;
  documentId: string;
  documentName: string;
  currentLocation: string;
  recommendedLocation: string;
  reason: string;
  impactScore: number;
  estimatedSavings: {
    accessTime: number;
    movementCost: number;
  };
}

export const CapacityDashboard: React.FC = () => {
  const dispatch = useDispatch();
  const {
    capacity: { utilizationData, alerts, optimizations }
  } = useSelector((state: RootState) => state.location);

  const [selectedTimeframe, setSelectedTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [showAlerts, setShowAlerts] = useState(true);

  // Mock data for development
  const mockUtilizationData: CapacityUtilization[] = [
    {
      locationId: 'bld-001',
      locationName: 'Main Building',
      locationLevel: 'building',
      totalCapacity: 10000,
      currentUtilization: 7500,
      utilizationPercentage: 75,
      documentCount: 3750,
      status: 'optimal'
    },
    {
      locationId: 'flr-001-01',
      locationName: 'Floor 1',
      locationLevel: 'floor',
      totalCapacity: 2500,
      currentUtilization: 2200,
      utilizationPercentage: 88,
      documentCount: 1100,
      status: 'warning'
    },
    {
      locationId: 'flr-001-02',
      locationName: 'Floor 2',
      locationLevel: 'floor',
      totalCapacity: 2500,
      currentUtilization: 2400,
      utilizationPercentage: 96,
      documentCount: 1200,
      status: 'critical'
    }
  ];

  const mockAlerts: CapacityAlert[] = [
    {
      id: 'alert-001',
      locationId: 'flr-001-02',
      locationName: 'Floor 2',
      alertType: 'approaching_limit',
      severity: 'high',
      message: 'Floor 2 is at 96% capacity. Consider relocating documents or expanding storage.',
      threshold: 90,
      currentValue: 96,
      timestamp: new Date()
    },
    {
      id: 'alert-002',
      locationId: 'cab-001-15',
      locationName: 'Cabinet 15A',
      alertType: 'optimization_needed',
      severity: 'medium',
      message: 'Cabinet 15A contains rarely accessed documents. Consider moving to lower-cost storage.',
      threshold: 30,
      currentValue: 15,
      timestamp: new Date()
    }
  ];

  useEffect(() => {
    // Simulate API call to fetch capacity data
    dispatch(updateCapacityData(mockUtilizationData));
  }, [dispatch, selectedTimeframe]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'optimal': return '#059669'; // green
      case 'warning': return '#D97706'; // amber
      case 'critical': return '#DC2626'; // red
      default: return '#6B7280'; // gray
    }
  };

  const getUtilizationColor = (percentage: number): string => {
    if (percentage >= 90) return '#DC2626'; // red
    if (percentage >= 75) return '#D97706'; // amber
    return '#059669'; // green
  };

  const filteredData = selectedLevel === 'all'
    ? mockUtilizationData
    : mockUtilizationData.filter(item => item.locationLevel === selectedLevel);

  const pieData = filteredData.map(item => ({
    name: item.locationName,
    value: item.utilizationPercentage,
    fill: getUtilizationColor(item.utilizationPercentage)
  }));

  const handleDismissAlert = (alertId: string) => {
    // Implementation for dismissing alerts
    console.log('Dismissing alert:', alertId);
  };

  const handleGenerateRecommendations = () => {
    // Implementation for generating optimization recommendations
    console.log('Generating placement recommendations...');
  };

  return (
    <div className="capacity-dashboard p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Storage Capacity Dashboard</h1>
        <p className="text-gray-600">Monitor storage utilization and optimize document placement</p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <label htmlFor="timeframe" className="text-sm font-medium text-gray-700">
            Timeframe:
          </label>
          <select
            id="timeframe"
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as 'day' | 'week' | 'month')}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="level" className="text-sm font-medium text-gray-700">
            Location Level:
          </label>
          <select
            id="level"
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="building">Buildings</option>
            <option value="floor">Floors</option>
            <option value="room">Rooms</option>
            <option value="cabinet">Cabinets</option>
            <option value="shelf">Shelves</option>
          </select>
        </div>

        <button
          onClick={handleGenerateRecommendations}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          Generate Recommendations
        </button>
      </div>

      {/* Alerts Section */}
      {showAlerts && mockAlerts.length > 0 && (
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Capacity Alerts</h2>
            <button
              onClick={() => setShowAlerts(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3">
            {mockAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border-l-4 ${
                  alert.severity === 'high'
                    ? 'bg-red-50 border-red-500'
                    : alert.severity === 'medium'
                    ? 'bg-yellow-50 border-yellow-500'
                    : 'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{alert.locationName}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        alert.severity === 'high'
                          ? 'bg-red-100 text-red-800'
                          : alert.severity === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Current: {alert.currentValue}% | Threshold: {alert.threshold}%
                    </p>
                  </div>
                  <button
                    onClick={() => handleDismissAlert(alert.id)}
                    className="ml-4 text-gray-400 hover:text-gray-600"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Utilization Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Utilization by Location</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="locationName"
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                formatter={(value: number) => [`${value}%`, 'Utilization']}
                labelFormatter={(label) => `Location: ${label}`}
              />
              <Bar
                dataKey="utilizationPercentage"
                fill={(entry) => getUtilizationColor(entry.utilizationPercentage)}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Utilization Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value}%`, 'Utilization']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Detailed Capacity Information</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documents
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr key={item.locationId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.locationName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {item.locationLevel}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.totalCapacity.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.currentUtilization.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${item.utilizationPercentage}%`,
                            backgroundColor: getUtilizationColor(item.utilizationPercentage),
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-900">{item.utilizationPercentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.documentCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                      style={{
                        backgroundColor: `${getStatusColor(item.status)}20`,
                        color: getStatusColor(item.status),
                      }}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CapacityDashboard;
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  ReferenceLine
} from 'recharts';
import { RootState } from '@/store';
import { updateEnvironmentalData, setEnvironmentalAlert } from '@/store/slices/locationSlice';

interface EnvironmentalReading {
  id: string;
  locationId: string;
  locationName: string;
  locationPath: string;
  timestamp: Date;
  temperature: number; // Celsius
  humidity: number; // Percentage
  airQuality?: number; // AQI
  lightLevel?: number; // Lux
  pressure?: number; // hPa
  status: 'normal' | 'warning' | 'critical';
  sensorId: string;
  batteryLevel?: number; // Percentage
}

interface EnvironmentalAlert {
  id: string;
  locationId: string;
  locationName: string;
  alertType: 'temperature_high' | 'temperature_low' | 'humidity_high' | 'humidity_low' | 'air_quality_poor' | 'sensor_offline';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  currentValue: number;
  threshold: number;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  autoResolution: boolean;
}

interface PreservationAdvice {
  id: string;
  locationId: string;
  locationName: string;
  adviceType: 'temperature_adjustment' | 'humidity_control' | 'air_circulation' | 'document_protection' | 'equipment_maintenance';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  actionRequired: string;
  estimatedCost?: number;
  implementationTime?: string;
  impactOnDocuments: 'none' | 'low' | 'medium' | 'high' | 'critical';
  generatedAt: Date;
  validUntil?: Date;
  status: 'new' | 'reviewing' | 'approved' | 'implemented' | 'rejected';
}

interface EnvironmentalThresholds {
  locationId: string;
  locationName: string;
  temperature: {
    min: number;
    max: number;
    optimal: { min: number; max: number };
  };
  humidity: {
    min: number;
    max: number;
    optimal: { min: number; max: number };
  };
  airQuality: {
    good: number;
    moderate: number;
    poor: number;
  };
  documentType?: 'standard' | 'archival' | 'digital_media' | 'photographs' | 'manuscripts';
}

export const EnvironmentalMonitor: React.FC = () => {
  const dispatch = useDispatch();
  const {
    environmental: { sensorData, alerts, preservationRecommendations }
  } = useSelector((state: RootState) => state.location);

  const [activeTab, setActiveTab] = useState<'overview' | 'readings' | 'alerts' | 'preservation' | 'thresholds'>('overview');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h');
  const [selectedMetric, setSelectedMetric] = useState<'temperature' | 'humidity' | 'airQuality'>('temperature');
  const [showThresholds, setShowThresholds] = useState(true);

  // Mock environmental data
  const generateMockReadings = (hours: number): EnvironmentalReading[] => {
    const readings: EnvironmentalReading[] = [];
    const now = new Date();
    const locations = [
      { id: 'room-001-a', name: 'Archive Room A', path: 'Building 1 > Floor 1 > Archive Room A' },
      { id: 'room-001-b', name: 'Archive Room B', path: 'Building 1 > Floor 1 > Archive Room B' },
      { id: 'room-002-a', name: 'Storage Room', path: 'Building 1 > Floor 2 > Storage Room' }
    ];

    for (let i = 0; i < hours; i++) {
      locations.forEach((location, locationIndex) => {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);

        // Generate realistic environmental data with some variance
        const baseTemp = 20 + locationIndex * 2 + Math.sin(i / 24 * 2 * Math.PI) * 3;
        const baseHumidity = 45 + locationIndex * 5 + Math.sin(i / 12 * 2 * Math.PI) * 10;
        const temperature = baseTemp + (Math.random() - 0.5) * 2;
        const humidity = Math.max(0, Math.min(100, baseHumidity + (Math.random() - 0.5) * 10));

        let status: 'normal' | 'warning' | 'critical' = 'normal';
        if (temperature < 18 || temperature > 24 || humidity < 40 || humidity > 60) {
          status = 'warning';
        }
        if (temperature < 15 || temperature > 27 || humidity < 30 || humidity > 70) {
          status = 'critical';
        }

        readings.push({
          id: `reading-${location.id}-${i}`,
          locationId: location.id,
          locationName: location.name,
          locationPath: location.path,
          timestamp,
          temperature: Math.round(temperature * 10) / 10,
          humidity: Math.round(humidity),
          airQuality: Math.round(50 + (Math.random() - 0.5) * 30),
          lightLevel: Math.round(300 + (Math.random() - 0.5) * 200),
          pressure: Math.round(1013 + (Math.random() - 0.5) * 10),
          status,
          sensorId: `sensor-${location.id}`,
          batteryLevel: Math.round(85 + (Math.random() - 0.5) * 30)
        });
      });
    }

    return readings.reverse(); // Most recent first
  };

  const mockReadings = generateMockReadings(timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720);

  const mockAlerts: EnvironmentalAlert[] = [
    {
      id: 'alert-001',
      locationId: 'room-001-a',
      locationName: 'Archive Room A',
      alertType: 'humidity_high',
      severity: 'high',
      message: 'Humidity level exceeds safe range for document preservation',
      currentValue: 68,
      threshold: 60,
      triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'active',
      autoResolution: false
    },
    {
      id: 'alert-002',
      locationId: 'room-002-a',
      locationName: 'Storage Room',
      alertType: 'temperature_low',
      severity: 'medium',
      message: 'Temperature below optimal range, documents may be at risk',
      currentValue: 16.5,
      threshold: 18,
      triggeredAt: new Date(Date.now() - 30 * 60 * 1000),
      status: 'active',
      autoResolution: false
    },
    {
      id: 'alert-003',
      locationId: 'room-001-b',
      locationName: 'Archive Room B',
      alertType: 'sensor_offline',
      severity: 'critical',
      message: 'Environmental sensor has gone offline, monitoring compromised',
      currentValue: 0,
      threshold: 0,
      triggeredAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      acknowledgedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      acknowledgedBy: 'John Smith',
      status: 'acknowledged',
      autoResolution: false
    }
  ];

  const mockPreservationAdvice: PreservationAdvice[] = [
    {
      id: 'advice-001',
      locationId: 'room-001-a',
      locationName: 'Archive Room A',
      adviceType: 'humidity_control',
      priority: 'high',
      title: 'Install Dehumidification System',
      description: 'Persistent high humidity levels are creating conditions favorable for mold growth and document deterioration.',
      actionRequired: 'Install commercial-grade dehumidifier with automatic humidity control and monitoring capabilities.',
      estimatedCost: 3500,
      implementationTime: '2-3 business days',
      impactOnDocuments: 'high',
      generatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'new'
    },
    {
      id: 'advice-002',
      locationId: 'room-002-a',
      locationName: 'Storage Room',
      adviceType: 'temperature_adjustment',
      priority: 'medium',
      title: 'Improve HVAC Performance',
      description: 'Temperature variations outside optimal range for long-term document storage.',
      actionRequired: 'Service HVAC system and consider installing zone-specific temperature controls.',
      estimatedCost: 1200,
      implementationTime: '1 business day',
      impactOnDocuments: 'medium',
      generatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'reviewing'
    },
    {
      id: 'advice-003',
      locationId: 'room-001-b',
      locationName: 'Archive Room B',
      adviceType: 'equipment_maintenance',
      priority: 'urgent',
      title: 'Replace Failed Environmental Sensor',
      description: 'Primary environmental sensor has failed, leaving critical storage area unmonitored.',
      actionRequired: 'Replace sensor immediately and install backup monitoring solution.',
      estimatedCost: 450,
      implementationTime: '4 hours',
      impactOnDocuments: 'critical',
      generatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      status: 'approved'
    }
  ];

  const mockThresholds: EnvironmentalThresholds[] = [
    {
      locationId: 'room-001-a',
      locationName: 'Archive Room A',
      temperature: { min: 18, max: 24, optimal: { min: 20, max: 22 } },
      humidity: { min: 40, max: 60, optimal: { min: 45, max: 55 } },
      airQuality: { good: 50, moderate: 100, poor: 150 },
      documentType: 'archival'
    },
    {
      locationId: 'room-001-b',
      locationName: 'Archive Room B',
      temperature: { min: 18, max: 24, optimal: { min: 20, max: 22 } },
      humidity: { min: 40, max: 60, optimal: { min: 45, max: 55 } },
      airQuality: { good: 50, moderate: 100, poor: 150 },
      documentType: 'archival'
    },
    {
      locationId: 'room-002-a',
      locationName: 'Storage Room',
      temperature: { min: 16, max: 26, optimal: { min: 18, max: 24 } },
      humidity: { min: 35, max: 65, optimal: { min: 40, max: 60 } },
      airQuality: { good: 50, moderate: 100, poor: 150 },
      documentType: 'standard'
    }
  ];

  useEffect(() => {
    // Simulate API call to fetch environmental data
    dispatch(updateEnvironmentalData(mockReadings));
  }, [dispatch, timeRange, selectedLocation]);

  const handleAcknowledgeAlert = (alertId: string) => {
    console.log('Acknowledging alert:', alertId);
    // Implementation for acknowledging alert
  };

  const handleResolveAlert = (alertId: string) => {
    console.log('Resolving alert:', alertId);
    // Implementation for resolving alert
  };

  const handleImplementAdvice = (adviceId: string) => {
    console.log('Implementing advice:', adviceId);
    // Implementation for implementing preservation advice
  };

  const getAlertColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'normal': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      case 'active': return 'bg-red-100 text-red-800';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'reviewing': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'implemented': return 'bg-gray-100 text-gray-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getCurrentStats = () => {
    const recentReadings = mockReadings.slice(0, 3); // Most recent readings
    const averageTemp = recentReadings.reduce((sum, r) => sum + r.temperature, 0) / recentReadings.length;
    const averageHumidity = recentReadings.reduce((sum, r) => sum + r.humidity, 0) / recentReadings.length;
    const averageAirQuality = recentReadings.reduce((sum, r) => sum + (r.airQuality || 0), 0) / recentReadings.length;

    return {
      temperature: Math.round(averageTemp * 10) / 10,
      humidity: Math.round(averageHumidity),
      airQuality: Math.round(averageAirQuality),
      activeAlerts: mockAlerts.filter(a => a.status === 'active').length,
      totalSensors: 3,
      onlineSensors: mockAlerts.filter(a => a.alertType === 'sensor_offline' && a.status === 'active').length === 0 ? 3 : 2
    };
  };

  const stats = getCurrentStats();

  // Prepare chart data
  const chartData = mockReadings
    .filter(reading => selectedLocation === 'all' || reading.locationId === selectedLocation)
    .slice(0, timeRange === '1h' ? 12 : timeRange === '6h' ? 36 : timeRange === '24h' ? 48 : timeRange === '7d' ? 168 : 720)
    .map(reading => ({
      time: formatDateTime(reading.timestamp),
      temperature: reading.temperature,
      humidity: reading.humidity,
      airQuality: reading.airQuality,
      location: reading.locationName
    }));

  return (
    <div className="environmental-monitor p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Environmental Monitor</h1>
        <p className="text-gray-600">Monitor storage conditions and preserve document integrity</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8 border-b border-gray-200">
          {[
            { key: 'overview', label: 'Overview', count: 0 },
            { key: 'readings', label: 'Live Readings', count: 0 },
            { key: 'alerts', label: 'Alerts', count: mockAlerts.filter(a => a.status === 'active').length },
            { key: 'preservation', label: 'Preservation Advice', count: mockPreservationAdvice.filter(a => a.status === 'new').length },
            { key: 'thresholds', label: 'Thresholds', count: 0 }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'overview' | 'readings' | 'alerts' | 'preservation' | 'thresholds')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 bg-red-100 text-red-800 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Temperature</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.temperature}°C</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  🌡️
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Humidity</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.humidity}%</p>
                </div>
                <div className="h-12 w-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                  💧
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Air Quality</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.airQuality} AQI</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  🌬️
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.activeAlerts}</p>
                  <p className="text-xs text-gray-500">{stats.onlineSensors}/{stats.totalSensors} sensors online</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                  🚨
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Locations</option>
                  <option value="room-001-a">Archive Room A</option>
                  <option value="room-001-b">Archive Room B</option>
                  <option value="room-002-a">Storage Room</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as '1h' | '6h' | '24h' | '7d' | '30d')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1h">Last Hour</option>
                  <option value="6h">Last 6 Hours</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metric</label>
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value as 'temperature' | 'humidity' | 'airQuality')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="temperature">Temperature</option>
                  <option value="humidity">Humidity</option>
                  <option value="airQuality">Air Quality</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showThresholds}
                    onChange={(e) => setShowThresholds(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Show Thresholds</span>
                </label>
              </div>
            </div>
          </div>

          {/* Environmental Chart */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedMetric === 'temperature' ? 'Temperature' : selectedMetric === 'humidity' ? 'Humidity' : 'Air Quality'} Trends
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  domain={selectedMetric === 'humidity' ? [0, 100] : ['auto', 'auto']}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Legend />

                {showThresholds && selectedMetric === 'temperature' && (
                  <>
                    <ReferenceLine y={18} stroke="#fbbf24" strokeDasharray="5 5" label="Min Safe" />
                    <ReferenceLine y={24} stroke="#fbbf24" strokeDasharray="5 5" label="Max Safe" />
                    <ReferenceLine y={20} stroke="#10b981" strokeDasharray="3 3" label="Optimal Min" />
                    <ReferenceLine y={22} stroke="#10b981" strokeDasharray="3 3" label="Optimal Max" />
                  </>
                )}

                {showThresholds && selectedMetric === 'humidity' && (
                  <>
                    <ReferenceLine y={40} stroke="#fbbf24" strokeDasharray="5 5" label="Min Safe" />
                    <ReferenceLine y={60} stroke="#fbbf24" strokeDasharray="5 5" label="Max Safe" />
                    <ReferenceLine y={45} stroke="#10b981" strokeDasharray="3 3" label="Optimal Min" />
                    <ReferenceLine y={55} stroke="#10b981" strokeDasharray="3 3" label="Optimal Max" />
                  </>
                )}

                <Area
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke={selectedMetric === 'temperature' ? '#ef4444' : selectedMetric === 'humidity' ? '#3b82f6' : '#10b981'}
                  fill={selectedMetric === 'temperature' ? '#fef2f2' : selectedMetric === 'humidity' ? '#eff6ff' : '#f0fdf4'}
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Alerts */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
            </div>
            <div className="p-6">
              {mockAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className={`p-4 rounded-lg border mb-4 last:mb-0 ${getAlertColor(alert.severity)}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{alert.locationName}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(alert.status)}`}>
                          {alert.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{alert.message}</p>
                      <div className="text-xs text-gray-600">
                        Current: {alert.currentValue}{selectedMetric === 'temperature' ? '°C' : '%'} |
                        Threshold: {alert.threshold}{selectedMetric === 'temperature' ? '°C' : '%'} |
                        {formatDateTime(alert.triggeredAt)}
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      {alert.status === 'active' && (
                        <button
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add other tab content for readings, alerts, preservation, and thresholds */}
      {activeTab === 'alerts' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Environmental Alerts</h3>
          </div>
          <div className="p-6 space-y-4">
            {mockAlerts.map((alert) => (
              <div key={alert.id} className={`p-4 rounded-lg border ${getAlertColor(alert.severity)}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{alert.locationName}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(alert.status)}`}>
                        {alert.status.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getAlertColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm mb-2">{alert.message}</p>
                    <div className="text-xs text-gray-600">
                      <div>Alert Type: {alert.alertType.replace('_', ' ').toUpperCase()}</div>
                      <div>Current: {alert.currentValue} | Threshold: {alert.threshold}</div>
                      <div>Triggered: {formatDateTime(alert.triggeredAt)}</div>
                      {alert.acknowledgedAt && (
                        <div>Acknowledged: {formatDateTime(alert.acknowledgedAt)} by {alert.acknowledgedBy}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    {alert.status === 'active' && (
                      <>
                        <button
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                        >
                          Acknowledge
                        </button>
                        <button
                          onClick={() => handleResolveAlert(alert.id)}
                          className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                        >
                          Resolve
                        </button>
                      </>
                    )}
                    {alert.status === 'acknowledged' && (
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'preservation' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Preservation Recommendations</h3>
          </div>
          <div className="p-6 space-y-6">
            {mockPreservationAdvice.map((advice) => (
              <div key={advice.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900">{advice.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(advice.priority)}`}>
                        {advice.priority.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(advice.status)}`}>
                        {advice.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{advice.locationName}</p>
                    <p className="text-sm mb-4">{advice.description}</p>

                    <div className="bg-gray-50 p-3 rounded mb-4">
                      <h5 className="font-medium text-sm text-gray-900 mb-1">Recommended Action:</h5>
                      <p className="text-sm text-gray-700">{advice.actionRequired}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {advice.estimatedCost && (
                        <div>
                          <span className="text-gray-600">Cost:</span>
                          <span className="ml-1 font-medium">${advice.estimatedCost.toLocaleString()}</span>
                        </div>
                      )}
                      {advice.implementationTime && (
                        <div>
                          <span className="text-gray-600">Time:</span>
                          <span className="ml-1 font-medium">{advice.implementationTime}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">Impact:</span>
                        <span className={`ml-1 font-medium ${advice.impactOnDocuments === 'critical' || advice.impactOnDocuments === 'high' ? 'text-red-600' : advice.impactOnDocuments === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                          {advice.impactOnDocuments.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Generated:</span>
                        <span className="ml-1 font-medium">{formatDateTime(advice.generatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {advice.status === 'new' && (
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleImplementAdvice(advice.id)}
                        className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                      >
                        Approve
                      </button>
                      <button className="px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200">
                        Review
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnvironmentalMonitor;
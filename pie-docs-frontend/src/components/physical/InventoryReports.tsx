import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { generateInventoryReport, scheduleInventoryReport, updateInventoryReports } from '@/store/slices/locationSlice';

interface InventoryReport {
  id: string;
  name: string;
  type: 'full' | 'partial' | 'discrepancy' | 'missing';
  locationScope: {
    type: 'all' | 'building' | 'floor' | 'room' | 'cabinet';
    locationId?: string;
    locationName?: string;
  };
  generatedAt: Date;
  generatedBy: string;
  status: 'generating' | 'completed' | 'failed' | 'scheduled';
  summary: {
    totalLocations: number;
    totalDocuments: number;
    missingDocuments: number;
    discrepancies: number;
    lastInventoryDate?: Date;
  };
  exportOptions: {
    formats: Array<'pdf' | 'excel' | 'csv'>;
    includeImages: boolean;
    includeLocationPhotos: boolean;
  };
  downloadUrl?: string;
  fileSize?: number;
}

interface ReportSchedule {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:MM format
  locationScope: {
    type: 'all' | 'building' | 'floor' | 'room' | 'cabinet';
    locationId?: string;
    locationName?: string;
  };
  reportType: 'full' | 'discrepancy' | 'missing';
  isActive: boolean;
  lastRun?: Date;
  nextRun: Date;
  recipients: string[];
  autoExport: {
    enabled: boolean;
    formats: Array<'pdf' | 'excel' | 'csv'>;
  };
}

interface InventoryDiscrepancy {
  id: string;
  documentId: string;
  documentName: string;
  expectedLocation: {
    id: string;
    name: string;
    fullPath: string;
  };
  actualLocation?: {
    id: string;
    name: string;
    fullPath: string;
  };
  discrepancyType: 'missing' | 'misplaced' | 'duplicate' | 'unauthorized';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  notes?: string;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
}

export const InventoryReports: React.FC = () => {
  const dispatch = useDispatch();
  const {
    inventory: { reports, scheduledReports, discrepancies, currentInventory }
  } = useSelector((state: RootState) => state.location);

  const [activeTab, setActiveTab] = useState<'reports' | 'scheduled' | 'discrepancies' | 'generate'>('reports');
  const [selectedReport, setSelectedReport] = useState<InventoryReport | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'status' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // New report generation form state
  const [newReportForm, setNewReportForm] = useState({
    name: '',
    type: 'full' as 'full' | 'partial' | 'discrepancy' | 'missing',
    locationScope: {
      type: 'all' as 'all' | 'building' | 'floor' | 'room' | 'cabinet',
      locationId: '',
      locationName: ''
    },
    exportFormats: ['pdf'] as Array<'pdf' | 'excel' | 'csv'>,
    includeImages: false,
    includeLocationPhotos: false,
    scheduleNow: true,
    scheduleOptions: {
      frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'quarterly',
      time: '09:00',
      recipients: ['']
    }
  });

  // Mock data for development
  const mockReports: InventoryReport[] = [
    {
      id: 'rpt-001',
      name: 'Monthly Inventory - September 2024',
      type: 'full',
      locationScope: { type: 'all' },
      generatedAt: new Date(),
      generatedBy: 'John Smith',
      status: 'completed',
      summary: {
        totalLocations: 45,
        totalDocuments: 2847,
        missingDocuments: 12,
        discrepancies: 5,
        lastInventoryDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      },
      exportOptions: {
        formats: ['pdf', 'excel'],
        includeImages: true,
        includeLocationPhotos: false
      },
      downloadUrl: '/api/reports/download/rpt-001',
      fileSize: 2487552 // 2.4MB
    },
    {
      id: 'rpt-002',
      name: 'Discrepancy Report - Floor 2',
      type: 'discrepancy',
      locationScope: {
        type: 'floor',
        locationId: 'flr-001-02',
        locationName: 'Floor 2'
      },
      generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      generatedBy: 'Sarah Johnson',
      status: 'completed',
      summary: {
        totalLocations: 8,
        totalDocuments: 340,
        missingDocuments: 3,
        discrepancies: 7
      },
      exportOptions: {
        formats: ['pdf'],
        includeImages: false,
        includeLocationPhotos: true
      },
      downloadUrl: '/api/reports/download/rpt-002',
      fileSize: 156789
    },
    {
      id: 'rpt-003',
      name: 'Weekly Missing Documents',
      type: 'missing',
      locationScope: { type: 'all' },
      generatedAt: new Date(Date.now() - 10 * 60 * 1000),
      generatedBy: 'System Scheduler',
      status: 'generating',
      summary: {
        totalLocations: 45,
        totalDocuments: 2847,
        missingDocuments: 8,
        discrepancies: 0
      },
      exportOptions: {
        formats: ['csv'],
        includeImages: false,
        includeLocationPhotos: false
      }
    }
  ];

  const mockScheduledReports: ReportSchedule[] = [
    {
      id: 'sched-001',
      name: 'Monthly Full Inventory',
      frequency: 'monthly',
      dayOfMonth: 1,
      time: '09:00',
      locationScope: { type: 'all' },
      reportType: 'full',
      isActive: true,
      lastRun: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      nextRun: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
      recipients: ['admin@company.com', 'inventory@company.com'],
      autoExport: {
        enabled: true,
        formats: ['pdf', 'excel']
      }
    },
    {
      id: 'sched-002',
      name: 'Weekly Discrepancy Check',
      frequency: 'weekly',
      dayOfWeek: 1, // Monday
      time: '08:00',
      locationScope: { type: 'all' },
      reportType: 'discrepancy',
      isActive: true,
      lastRun: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      nextRun: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      recipients: ['warehouse@company.com'],
      autoExport: {
        enabled: true,
        formats: ['csv']
      }
    }
  ];

  const mockDiscrepancies: InventoryDiscrepancy[] = [
    {
      id: 'disc-001',
      documentId: 'doc-12345',
      documentName: 'Contract_ABC_2024.pdf',
      expectedLocation: {
        id: 'shelf-001-a-1',
        name: 'Shelf A1',
        fullPath: 'Main Building > Floor 1 > Room A > Cabinet 1 > Shelf A1'
      },
      actualLocation: {
        id: 'shelf-002-b-3',
        name: 'Shelf B3',
        fullPath: 'Main Building > Floor 2 > Room B > Cabinet 2 > Shelf B3'
      },
      discrepancyType: 'misplaced',
      severity: 'medium',
      detectedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      status: 'open',
      notes: 'Document found in wrong location during routine check'
    },
    {
      id: 'disc-002',
      documentId: 'doc-67890',
      documentName: 'Report_Q4_2024.pdf',
      expectedLocation: {
        id: 'shelf-001-a-2',
        name: 'Shelf A2',
        fullPath: 'Main Building > Floor 1 > Room A > Cabinet 1 > Shelf A2'
      },
      discrepancyType: 'missing',
      severity: 'high',
      detectedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'investigating',
      notes: 'Document not found in expected location, checking with last user'
    }
  ];

  useEffect(() => {
    // Simulate API call to fetch inventory reports
    dispatch(updateInventoryReports(mockReports));
  }, [dispatch]);

  const handleGenerateReport = () => {
    if (!newReportForm.name.trim()) {
      alert('Please enter a report name');
      return;
    }

    const reportData = {
      name: newReportForm.name,
      type: newReportForm.type,
      locationScope: newReportForm.locationScope,
      exportOptions: {
        formats: newReportForm.exportFormats,
        includeImages: newReportForm.includeImages,
        includeLocationPhotos: newReportForm.includeLocationPhotos
      }
    };

    dispatch(generateInventoryReport(reportData));
    setShowReportModal(false);
    setActiveTab('reports');
  };

  const handleDownloadReport = (report: InventoryReport) => {
    if (report.downloadUrl) {
      window.open(report.downloadUrl, '_blank');
    }
  };

  const handleResolveDiscrepancy = (discrepancyId: string) => {
    console.log('Resolving discrepancy:', discrepancyId);
    // Implementation for resolving discrepancy
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'generating': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'full': return 'bg-blue-100 text-blue-800';
      case 'partial': return 'bg-purple-100 text-purple-800';
      case 'discrepancy': return 'bg-orange-100 text-orange-800';
      case 'missing': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatDateTime = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const filteredReports = mockReports.filter(report => {
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
    const matchesType = filterType === 'all' || report.type === filterType;
    return matchesStatus && matchesType;
  });

  return (
    <div className="inventory-reports p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Reports</h1>
        <p className="text-gray-600">Generate, schedule, and manage inventory reports with discrepancy tracking</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8 border-b border-gray-200">
          {[
            { key: 'reports', label: 'Reports', count: mockReports.length },
            { key: 'scheduled', label: 'Scheduled', count: mockScheduledReports.length },
            { key: 'discrepancies', label: 'Discrepancies', count: mockDiscrepancies.length },
            { key: 'generate', label: 'Generate New', count: 0 }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'reports' | 'scheduled' | 'discrepancies' | 'generate')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div>
          {/* Filters */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="generating">Generating</option>
                  <option value="failed">Failed</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="full">Full Inventory</option>
                  <option value="partial">Partial</option>
                  <option value="discrepancy">Discrepancy</option>
                  <option value="missing">Missing Documents</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'status' | 'type')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date">Date</option>
                  <option value="name">Name</option>
                  <option value="status">Status</option>
                  <option value="type">Type</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => setShowReportModal(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Generate Report
                </button>
              </div>
            </div>
          </div>

          {/* Reports Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Report
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Summary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Generated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{report.name}</span>
                          <span className="text-xs text-gray-500">
                            Scope: {report.locationScope.locationName || 'All Locations'}
                          </span>
                          {report.fileSize && (
                            <span className="text-xs text-gray-500">
                              Size: {formatFileSize(report.fileSize)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(report.type)}`}>
                          {report.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                          {report.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div>Locations: {report.summary.totalLocuments.toLocaleString()}</div>
                          <div>Documents: {report.summary.totalDocuments.toLocaleString()}</div>
                          {report.summary.missingDocuments > 0 && (
                            <div className="text-red-600">Missing: {report.summary.missingDocuments}</div>
                          )}
                          {report.summary.discrepancies > 0 && (
                            <div className="text-orange-600">Discrepancies: {report.summary.discrepancies}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDateTime(report.generatedAt)}</div>
                        <div className="text-xs text-gray-500">by {report.generatedBy}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {report.status === 'completed' && report.downloadUrl && (
                            <button
                              onClick={() => handleDownloadReport(report)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Download
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedReport(report)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Generate New Report Tab */}
      {activeTab === 'generate' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Generate New Inventory Report</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Name</label>
              <input
                type="text"
                value={newReportForm.name}
                onChange={(e) => setNewReportForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter report name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
              <select
                value={newReportForm.type}
                onChange={(e) => setNewReportForm(prev => ({ ...prev, type: e.target.value as 'full' | 'partial' | 'discrepancy' | 'missing' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="full">Full Inventory</option>
                <option value="partial">Partial Inventory</option>
                <option value="discrepancy">Discrepancy Report</option>
                <option value="missing">Missing Documents</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location Scope</label>
              <select
                value={newReportForm.locationScope.type}
                onChange={(e) => setNewReportForm(prev => ({
                  ...prev,
                  locationScope: { ...prev.locationScope, type: e.target.value as 'all' | 'building' | 'floor' | 'room' | 'cabinet' }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Locations</option>
                <option value="building">Specific Building</option>
                <option value="floor">Specific Floor</option>
                <option value="room">Specific Room</option>
                <option value="cabinet">Specific Cabinet</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Export Formats</label>
              <div className="space-y-2">
                {['pdf', 'excel', 'csv'].map(format => (
                  <label key={format} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newReportForm.exportFormats.includes(format as 'pdf' | 'excel' | 'csv')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewReportForm(prev => ({
                            ...prev,
                            exportFormats: [...prev.exportFormats, format as 'pdf' | 'excel' | 'csv']
                          }));
                        } else {
                          setNewReportForm(prev => ({
                            ...prev,
                            exportFormats: prev.exportFormats.filter(f => f !== format)
                          }));
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 capitalize">{format}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setNewReportForm({
                  name: '',
                  type: 'full',
                  locationScope: { type: 'all', locationId: '', locationName: '' },
                  exportFormats: ['pdf'],
                  includeImages: false,
                  includeLocationPhotos: false,
                  scheduleNow: true,
                  scheduleOptions: { frequency: 'monthly', time: '09:00', recipients: [''] }
                })}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Reset
              </button>
              <button
                onClick={handleGenerateReport}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add other tab content here for scheduled reports and discrepancies */}
      {activeTab === 'discrepancies' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Inventory Discrepancies</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expected Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actual Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mockDiscrepancies.map((discrepancy) => (
                  <tr key={discrepancy.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{discrepancy.documentName}</span>
                        <span className="text-xs text-gray-500">ID: {discrepancy.documentId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(discrepancy.discrepancyType)}`}>
                        {discrepancy.discrepancyType.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(discrepancy.severity)}`}>
                        {discrepancy.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{discrepancy.expectedLocation.name}</div>
                      <div className="text-xs text-gray-500">{discrepancy.expectedLocation.fullPath}</div>
                    </td>
                    <td className="px-6 py-4">
                      {discrepancy.actualLocation ? (
                        <div>
                          <div className="text-sm text-gray-900">{discrepancy.actualLocation.name}</div>
                          <div className="text-xs text-gray-500">{discrepancy.actualLocation.fullPath}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-red-600">Not Found</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(discrepancy.status)}`}>
                        {discrepancy.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {discrepancy.status === 'open' && (
                        <button
                          onClick={() => handleResolveDiscrepancy(discrepancy.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryReports;
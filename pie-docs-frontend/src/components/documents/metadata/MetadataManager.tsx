import React, { useState, useEffect } from 'react';
import { metadataSchemaService } from '../../../services/api/metadataSchemaService';
import type { MetadataField, MetadataSchema } from '../../../services/api/metadataSchemaService';
import { documentTypesService } from '../../../services/api/documentTypesService';

// Metadata Manager Types
export interface MetadataFieldDefinition {
  id: string;
  name: string;
  internalName: string;
  documentType: string;
  type: 'text' | 'multiline' | 'richtext' | 'number' | 'decimal' | 'date' | 'datetime' | 'dropdown' | 'multiselect' | 'boolean' | 'user' | 'file' | 'url' | 'email' | 'calculated';
  description?: string;
  helpText?: string;
  required: boolean;
  defaultValue?: string;
  options?: string[];
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    custom?: string;
  };
  conditionalVisibility?: {
    field: string;
    operator: string;
    value: string;
  };
  order: number;
  usageCount: number;
  createdDate: string;
  modifiedDate: string;
  status: 'active' | 'inactive';
  group?: string;
}

export interface MetadataTemplate {
  id: string;
  name: string;
  description: string;
  fields: string[];
  icon: string;
  color: string;
  usageCount: number;
}

export type MetadataViewMode = 'schema' | 'fields' | 'templates' | 'analytics';

interface MetadataManagerProps {
  // No props needed initially since it manages its own state
}

const MetadataManager: React.FC<MetadataManagerProps> = () => {
  // State
  const [metadataViewMode, setMetadataViewMode] = useState<MetadataViewMode>('schema');
  const [selectedField, setSelectedField] = useState<MetadataFieldDefinition | null>(null);
  const [showNewFieldDialog, setShowNewFieldDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MetadataTemplate | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('Invoice');

  // API Data State
  const [schemas, setSchemas] = useState<MetadataSchema[]>([]);
  const [currentSchema, setCurrentSchema] = useState<MetadataSchema | null>(null);
  const [apiFields, setApiFields] = useState<MetadataField[]>([]);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock Metadata Fields Data - Grouped by Document Type
  const mockMetadataFields: MetadataFieldDefinition[] = [
    // Invoice Fields
    { id: 'inv1', name: 'Invoice Number', internalName: 'invoice_number', documentType: 'Invoice', type: 'text', required: true, order: 1, usageCount: 267, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', description: 'Unique invoice identifier', helpText: 'Enter the invoice number (e.g., INV-2024-001)' },
    { id: 'inv2', name: 'Invoice Date', internalName: 'invoice_date', documentType: 'Invoice', type: 'date', required: true, order: 2, usageCount: 267, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', description: 'Date when invoice was issued' },
    { id: 'inv3', name: 'Invoice Amount', internalName: 'invoice_amount', documentType: 'Invoice', type: 'decimal', required: true, order: 3, usageCount: 267, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', description: 'Total invoice amount', validation: { min: 0 } },
    { id: 'inv4', name: 'Currency', internalName: 'currency', documentType: 'Invoice', type: 'dropdown', required: true, options: ['USD', 'EUR', 'GBP', 'AED'], order: 4, usageCount: 267, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', defaultValue: 'USD' },
    { id: 'inv5', name: 'Due Date', internalName: 'due_date', documentType: 'Invoice', type: 'date', required: true, order: 5, usageCount: 267, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', description: 'Payment due date' },
    { id: 'inv6', name: 'Vendor Name', internalName: 'vendor_name', documentType: 'Invoice', type: 'text', required: true, order: 6, usageCount: 267, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', description: 'Name of the vendor' },
    { id: 'inv7', name: 'Payment Status', internalName: 'payment_status', documentType: 'Invoice', type: 'dropdown', required: true, options: ['Pending', 'Paid', 'Overdue', 'Cancelled'], order: 7, usageCount: 267, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', defaultValue: 'Pending' },
    { id: 'inv8', name: 'Tax Amount', internalName: 'tax_amount', documentType: 'Invoice', type: 'decimal', required: false, order: 8, usageCount: 220, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', validation: { min: 0 } },

    // Contract Fields
    { id: 'con1', name: 'Contract Number', internalName: 'contract_number', documentType: 'Contract', type: 'text', required: true, order: 1, usageCount: 145, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', description: 'Unique contract identifier' },
    { id: 'con2', name: 'Contract Title', internalName: 'contract_title', documentType: 'Contract', type: 'text', required: true, order: 2, usageCount: 145, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', description: 'Title of the contract' },
    { id: 'con3', name: 'Parties Involved', internalName: 'parties', documentType: 'Contract', type: 'multiline', required: true, order: 3, usageCount: 145, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', description: 'All parties in the contract' },
    { id: 'con4', name: 'Start Date', internalName: 'start_date', documentType: 'Contract', type: 'date', required: true, order: 4, usageCount: 145, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', description: 'Contract start date' },
    { id: 'con5', name: 'End Date', internalName: 'end_date', documentType: 'Contract', type: 'date', required: true, order: 5, usageCount: 145, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', description: 'Contract end date' },
    { id: 'con6', name: 'Contract Value', internalName: 'contract_value', documentType: 'Contract', type: 'decimal', required: true, order: 6, usageCount: 145, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', validation: { min: 0 } },
    { id: 'con7', name: 'Renewal Terms', internalName: 'renewal_terms', documentType: 'Contract', type: 'multiline', required: false, order: 7, usageCount: 120, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active' },
    { id: 'con8', name: 'Contract Status', internalName: 'contract_status', documentType: 'Contract', type: 'dropdown', required: true, options: ['Draft', 'Under Review', 'Active', 'Expired', 'Terminated'], order: 8, usageCount: 145, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', defaultValue: 'Draft' },

    // Report Fields
    { id: 'rep1', name: 'Report Title', internalName: 'report_title', documentType: 'Report', type: 'text', required: true, order: 1, usageCount: 89, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', description: 'Title of the report' },
    { id: 'rep2', name: 'Report Type', internalName: 'report_type', documentType: 'Report', type: 'dropdown', required: true, options: ['Financial', 'Operational', 'Compliance', 'Performance', 'Audit'], order: 2, usageCount: 89, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active' },
    { id: 'rep3', name: 'Reporting Period', internalName: 'reporting_period', documentType: 'Report', type: 'text', required: true, order: 3, usageCount: 89, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', description: 'Period covered by the report (e.g., Q3 2024)' },
    { id: 'rep4', name: 'Prepared By', internalName: 'prepared_by', documentType: 'Report', type: 'user', required: true, order: 4, usageCount: 89, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active' },
    { id: 'rep5', name: 'Report Date', internalName: 'report_date', documentType: 'Report', type: 'date', required: true, order: 5, usageCount: 89, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active' },
    { id: 'rep6', name: 'Executive Summary', internalName: 'exec_summary', documentType: 'Report', type: 'richtext', required: false, order: 6, usageCount: 75, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', validation: { max: 1000 } },
    { id: 'rep7', name: 'Key Findings', internalName: 'key_findings', documentType: 'Report', type: 'multiline', required: false, order: 7, usageCount: 82, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active' },

    // Policy Fields
    { id: 'pol1', name: 'Policy Title', internalName: 'policy_title', documentType: 'Policy', type: 'text', required: true, order: 1, usageCount: 56, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active' },
    { id: 'pol2', name: 'Policy Number', internalName: 'policy_number', documentType: 'Policy', type: 'text', required: true, order: 2, usageCount: 56, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active' },
    { id: 'pol3', name: 'Effective Date', internalName: 'effective_date', documentType: 'Policy', type: 'date', required: true, order: 3, usageCount: 56, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active' },
    { id: 'pol4', name: 'Review Date', internalName: 'review_date', documentType: 'Policy', type: 'date', required: true, order: 4, usageCount: 56, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', description: 'Next scheduled review date' },
    { id: 'pol5', name: 'Policy Owner', internalName: 'policy_owner', documentType: 'Policy', type: 'user', required: true, order: 5, usageCount: 56, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active' },
    { id: 'pol6', name: 'Approval Status', internalName: 'approval_status', documentType: 'Policy', type: 'dropdown', required: true, options: ['Draft', 'Pending Approval', 'Approved', 'Archived'], order: 6, usageCount: 56, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', defaultValue: 'Draft' },
    { id: 'pol7', name: 'Applicable To', internalName: 'applicable_to', documentType: 'Policy', type: 'multiselect', required: false, order: 7, usageCount: 45, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', description: 'Departments or groups this policy applies to' },

    // Patent Fields
    { id: 'pat1', name: 'Patent Title', internalName: 'patent_title', documentType: 'Patent', type: 'text', required: true, order: 1, usageCount: 23, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active' },
    { id: 'pat2', name: 'Patent Number', internalName: 'patent_number', documentType: 'Patent', type: 'text', required: false, order: 2, usageCount: 18, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', description: 'Official patent number (if granted)' },
    { id: 'pat3', name: 'Application Number', internalName: 'application_number', documentType: 'Patent', type: 'text', required: true, order: 3, usageCount: 23, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active' },
    { id: 'pat4', name: 'Filing Date', internalName: 'filing_date', documentType: 'Patent', type: 'date', required: true, order: 4, usageCount: 23, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active' },
    { id: 'pat5', name: 'Inventors', internalName: 'inventors', documentType: 'Patent', type: 'multiline', required: true, order: 5, usageCount: 23, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active' },
    { id: 'pat6', name: 'Patent Status', internalName: 'patent_status', documentType: 'Patent', type: 'dropdown', required: true, options: ['Draft', 'Filed', 'Under Review', 'Granted', 'Rejected'], order: 6, usageCount: 23, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', defaultValue: 'Draft' },
    { id: 'pat7', name: 'Classifications', internalName: 'classifications', documentType: 'Patent', type: 'text', required: false, order: 7, usageCount: 20, createdDate: '2024-01-10', modifiedDate: '2024-01-10', status: 'active', description: 'Patent classification codes' },
  ];

  // Mock Metadata Templates
  const mockMetadataTemplates: MetadataTemplate[] = [
    { id: 't1', name: 'Contract Template', description: 'Standard fields for contract documents', fields: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f9', 'f10'], icon: '📄', color: 'bg-blue-500/20 text-blue-300', usageCount: 145 },
    { id: 't2', name: 'Invoice Template', description: 'Fields for invoice and billing documents', fields: ['f1', 'f2', 'f3', 'f4', 'f5', 'f10'], icon: '📊', color: 'bg-green-500/20 text-green-300', usageCount: 267 },
    { id: 't3', name: 'Report Template', description: 'Standard report document fields', fields: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'], icon: '📈', color: 'bg-purple-500/20 text-purple-300', usageCount: 89 },
    { id: 't4', name: 'Policy Template', description: 'Policy and procedure document fields', fields: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f11', 'f13'], icon: '📋', color: 'bg-amber-500/20 text-amber-300', usageCount: 56 },
    { id: 't5', name: 'Patent Template', description: 'Intellectual property and patent fields', fields: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f8', 'f12'], icon: '⚖️', color: 'bg-red-500/20 text-red-300', usageCount: 23 },
  ];

  // Load data from API
  useEffect(() => {
    loadSchemas();
    loadDocumentTypes();
  }, []);

  const loadSchemas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await metadataSchemaService.listSchemas({ include_fields: true });
      setSchemas(data);
      console.log('Loaded metadata schemas:', data);
    } catch (err: any) {
      console.error('Error loading metadata schemas:', err);
      setError(err.message);
      // Fallback to mock data already defined
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentTypes = async () => {
    try {
      const response = await documentTypesService.listDocumentTypes({ page: 1, page_size: 100 });
      setDocumentTypes(response.document_types || []);
      console.log('Loaded document types:', response.document_types);
    } catch (err: any) {
      console.error('Error loading document types:', err);
      // Continue with default document type options
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        {/* API Status Banner */}
        {schemas.length > 0 && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <div className="text-green-300 font-semibold">Live API Data Connected</div>
                <div className="text-sm text-green-200/80">
                  {schemas.length} metadata schemas loaded from database
                  {schemas.map((s, i) => (
                    <span key={s.id}> • {s.name} ({s.fields?.length || 0} fields)</span>
                  ))}
                </div>
                <div className="text-xs text-green-200/60 mt-1">
                  Note: This view shows mock UI. See <a href="/documents/metadata-upload" className="underline">Metadata Upload Demo</a> for live integration.
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="mb-4 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
            <div className="text-blue-300">Loading metadata schemas from API...</div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
            <div className="text-yellow-300 font-semibold">API Connection Issue</div>
            <div className="text-sm text-yellow-200/80">{error}</div>
            <div className="text-xs text-yellow-200/60 mt-1">Showing mock data for demonstration</div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Metadata Manager</h2>
          <div className="flex gap-3">
            <select
              value={selectedDocumentType}
              onChange={(e) => setSelectedDocumentType(e.target.value)}
              className="bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white text-sm"
            >
              <option value="Invoice" className="bg-slate-800 text-white">📄 Invoice</option>
              <option value="Contract" className="bg-slate-800 text-white">📝 Contract</option>
              <option value="Report" className="bg-slate-800 text-white">📊 Report</option>
              <option value="Policy" className="bg-slate-800 text-white">📋 Policy</option>
              <option value="Patent" className="bg-slate-800 text-white">⚖️ Patent</option>
            </select>
            <button
              onClick={() => setShowNewFieldDialog(true)}
              className="btn-glass px-4 py-2 flex items-center gap-2"
            >
              <span>➕</span>
              New Field
            </button>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setMetadataViewMode('schema')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              metadataViewMode === 'schema'
                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/50'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            🏗️ Schema Builder
          </button>
          <button
            onClick={() => setMetadataViewMode('fields')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              metadataViewMode === 'fields'
                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/50'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            📋 Fields List
          </button>
          <button
            onClick={() => setMetadataViewMode('templates')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              metadataViewMode === 'templates'
                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/50'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            📦 Templates
          </button>
          <button
            onClick={() => setMetadataViewMode('analytics')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              metadataViewMode === 'analytics'
                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/50'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            📊 Analytics
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Main Area */}
        <div className="flex-1 p-6">
          {/* Schema Builder View */}
          {metadataViewMode === 'schema' && (
            <div className="space-y-4">
              <div className="glass-panel p-4 rounded-lg">
                <div className="text-sm text-white/60 mb-3">
                  {selectedDocumentType} Fields • Drag to reorder • Click to configure
                </div>
                <div className="space-y-2">
                  {mockMetadataFields
                    .filter(field => field.documentType === selectedDocumentType)
                    .sort((a, b) => a.order - b.order)
                    .map(field => (
                      <div
                        key={field.id}
                        onClick={() => setSelectedField(field)}
                        className={`p-4 bg-white/5 rounded-lg cursor-pointer transition-all border-2 ${
                          selectedField?.id === field.id ? 'border-indigo-500/50' : 'border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="cursor-grab text-white/40">⋮⋮</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="text-white font-medium">{field.name}</span>
                                {field.required && <span className="text-red-400 text-xs">* Required</span>}
                              </div>
                              <div className="text-sm text-white/60">
                                {field.type} • {field.internalName}
                                {field.description && ` • ${field.description}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              field.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                            }`}>
                              {field.status}
                            </span>
                            <span className="text-xs text-white/40">{field.usageCount} uses</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Fields List View */}
          {metadataViewMode === 'fields' && (
            <div className="glass-panel rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Field Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Document Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Required</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Usage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {mockMetadataFields
                    .filter(field => field.documentType === selectedDocumentType)
                    .map(field => (
                    <tr
                      key={field.id}
                      onClick={() => setSelectedField(field)}
                      className={`cursor-pointer transition-colors ${
                        selectedField?.id === field.id ? 'bg-indigo-500/20' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm text-white font-medium">{field.name}</div>
                        <div className="text-xs text-white/60">{field.internalName}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/70 capitalize">{field.type}</td>
                      <td className="px-6 py-4 text-sm text-white/70">{field.documentType}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          field.required ? 'bg-red-500/20 text-red-300' : 'bg-gray-500/20 text-gray-300'
                        }`}>
                          {field.required ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white">{field.usageCount}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          field.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                        }`}>
                          {field.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Templates View */}
          {metadataViewMode === 'templates' && (
            <div className="grid grid-cols-2 gap-4">
              {mockMetadataTemplates.map(template => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`glass-panel p-6 rounded-lg cursor-pointer transition-all ${
                    selectedTemplate?.id === template.id ? 'ring-2 ring-indigo-500/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="text-4xl">{template.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">{template.name}</h3>
                      <p className="text-sm text-white/60">{template.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`${template.color} px-3 py-1 rounded-full text-sm font-medium`}>
                      {template.fields.length} fields
                    </span>
                    <span className="text-xs text-white/60">{template.usageCount} uses</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 btn-glass py-2 text-xs">Preview</button>
                    <button className="flex-1 btn-glass py-2 text-xs">Apply</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Analytics View */}
          {metadataViewMode === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="glass-panel p-6 rounded-lg">
                  <div className="text-sm text-white/60 mb-1">Total Fields</div>
                  <div className="text-3xl font-bold text-white">{mockMetadataFields.length}</div>
                </div>
                <div className="glass-panel p-6 rounded-lg">
                  <div className="text-sm text-white/60 mb-1">Required Fields</div>
                  <div className="text-3xl font-bold text-white">
                    {mockMetadataFields.filter(f => f.required).length}
                  </div>
                </div>
                <div className="glass-panel p-6 rounded-lg">
                  <div className="text-sm text-white/60 mb-1">Field Groups</div>
                  <div className="text-3xl font-bold text-white">
                    {new Set(mockMetadataFields.filter(f => f.group).map(f => f.group)).size}
                  </div>
                </div>
                <div className="glass-panel p-6 rounded-lg">
                  <div className="text-sm text-white/60 mb-1">Templates</div>
                  <div className="text-3xl font-bold text-white">{mockMetadataTemplates.length}</div>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-4">Most Used Fields</h3>
                <div className="space-y-3">
                  {mockMetadataFields
                    .sort((a, b) => b.usageCount - a.usageCount)
                    .slice(0, 8)
                    .map((field, index) => (
                      <div key={field.id} className="flex items-center gap-4">
                        <div className="text-xl font-bold text-white/40 w-8">#{index + 1}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-medium">{field.name}</span>
                            <span className="text-xs text-white/60 capitalize">{field.type}</span>
                            {field.required && <span className="text-xs text-red-400">Required</span>}
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500"
                              style={{ width: `${(field.usageCount / mockMetadataFields[0].usageCount) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-lg font-bold text-white w-16 text-right">{field.usageCount}</div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="glass-panel p-6 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-4">Field Type Distribution</h3>
                <div className="space-y-3">
                  {Array.from(new Set(mockMetadataFields.map(f => f.type))).map(type => {
                    const typeFields = mockMetadataFields.filter(f => f.type === type);
                    return (
                      <div key={type} className="flex items-center gap-4">
                        <div className="w-24 text-sm text-white font-medium capitalize">{type}</div>
                        <div className="flex-1">
                          <div className="h-8 bg-white/10 rounded-lg overflow-hidden flex">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium"
                              style={{ width: `${(typeFields.length / mockMetadataFields.length) * 100}%` }}
                            >
                              {typeFields.length > 0 ? typeFields.length : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-white font-medium w-16 text-right">{typeFields.length}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Field Details */}
        {selectedField && metadataViewMode !== 'analytics' && metadataViewMode !== 'templates' && (
          <div className="w-96 border-l border-white/10">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">{selectedField.name}</h3>
                  <div className="text-sm text-white/60">{selectedField.internalName}</div>
                </div>
                <button onClick={() => setSelectedField(null)} className="btn-glass p-2 text-sm">✕</button>
              </div>

              <div className="space-y-4">
                {selectedField.description && (
                  <div>
                    <div className="text-xs text-white/60 mb-1">Description</div>
                    <p className="text-sm text-white/80">{selectedField.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-panel p-3 rounded-lg">
                    <div className="text-xs text-white/60">Type</div>
                    <div className="text-sm font-medium text-white capitalize mt-1">{selectedField.type}</div>
                  </div>
                  <div className="glass-panel p-3 rounded-lg">
                    <div className="text-xs text-white/60">Usage Count</div>
                    <div className="text-xl font-bold text-white mt-1">{selectedField.usageCount}</div>
                  </div>
                </div>

                {selectedField.options && selectedField.options.length > 0 && (
                  <div>
                    <div className="text-xs text-white/60 mb-2">Options</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedField.options.map((opt, i) => (
                        <span key={i} className="px-2 py-1 bg-white/10 text-white text-xs rounded">
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedField.defaultValue && (
                  <div>
                    <div className="text-xs text-white/60 mb-1">Default Value</div>
                    <div className="p-2 bg-white/5 rounded text-sm text-white">{selectedField.defaultValue}</div>
                  </div>
                )}

                {selectedField.helpText && (
                  <div>
                    <div className="text-xs text-white/60 mb-1">Help Text</div>
                    <div className="p-2 bg-white/5 rounded text-sm text-white/70">{selectedField.helpText}</div>
                  </div>
                )}

                {selectedField.validation && (
                  <div>
                    <div className="text-xs text-white/60 mb-2">Validation Rules</div>
                    <div className="space-y-2">
                      {selectedField.validation.pattern && (
                        <div className="p-2 bg-white/5 rounded text-xs">
                          <span className="text-white/60">Pattern: </span>
                          <span className="text-indigo-300">{selectedField.validation.pattern}</span>
                        </div>
                      )}
                      {selectedField.validation.min !== undefined && (
                        <div className="p-2 bg-white/5 rounded text-xs">
                          <span className="text-white/60">Min: </span>
                          <span className="text-white">{selectedField.validation.min}</span>
                        </div>
                      )}
                      {selectedField.validation.max !== undefined && (
                        <div className="p-2 bg-white/5 rounded text-xs">
                          <span className="text-white/60">Max: </span>
                          <span className="text-white">{selectedField.validation.max}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedField.conditionalVisibility && (
                  <div>
                    <div className="text-xs text-white/60 mb-2">Conditional Visibility</div>
                    <div className="p-2 bg-white/5 rounded text-xs">
                      <div className="text-white/80">
                        Show when <span className="text-indigo-300">{selectedField.conditionalVisibility.field}</span>
                        {' '}{selectedField.conditionalVisibility.operator}{' '}
                        <span className="text-green-300">{selectedField.conditionalVisibility.value}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">Required</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      selectedField.required ? 'bg-red-500/20 text-red-300' : 'bg-gray-500/20 text-gray-300'
                    }`}>
                      {selectedField.required ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">Document Type</span>
                    <span className="text-sm text-indigo-300">{selectedField.documentType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">Status</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      selectedField.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                    }`}>
                      {selectedField.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">Created</span>
                    <span className="text-sm text-white">{selectedField.createdDate}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/10">
                  <button className="w-full btn-glass py-2 text-sm flex items-center justify-center gap-2">
                    <span>✏️</span>
                    Edit Field
                  </button>
                  <button className="w-full btn-glass py-2 text-sm flex items-center justify-center gap-2">
                    <span>📋</span>
                    Duplicate
                  </button>
                  <button className="w-full btn-glass py-2 text-sm flex items-center justify-center gap-2">
                    <span>⚙️</span>
                    Configure Validation
                  </button>
                  <button className="w-full btn-glass py-2 text-sm flex items-center justify-center gap-2 text-red-400">
                    <span>🗑️</span>
                    Delete Field
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Panel - Template Details */}
        {selectedTemplate && metadataViewMode === 'templates' && (
          <div className="w-96 border-l border-white/10">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{selectedTemplate.icon}</span>
                    <div>
                      <h3 className="text-lg font-bold text-white">{selectedTemplate.name}</h3>
                      <div className="text-sm text-white/60">{selectedTemplate.description}</div>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedTemplate(null)} className="btn-glass p-2 text-sm">✕</button>
              </div>

              <div className="space-y-4">
                <div className="glass-panel p-4 rounded-lg">
                  <div className="text-xs text-white/60 mb-1">Usage</div>
                  <div className="text-2xl font-bold text-white">{selectedTemplate.usageCount} documents</div>
                </div>

                <div>
                  <div className="text-xs text-white/60 mb-2">Included Fields ({selectedTemplate.fields.length})</div>
                  <div className="space-y-2">
                    {selectedTemplate.fields.map(fieldId => {
                      const field = mockMetadataFields.find(f => f.id === fieldId);
                      return field ? (
                        <div key={fieldId} className="p-2 bg-white/5 rounded">
                          <div className="text-sm text-white font-medium">{field.name}</div>
                          <div className="text-xs text-white/60 capitalize">{field.type}</div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/10">
                  <button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-lg font-medium">
                    Apply Template
                  </button>
                  <button className="w-full btn-glass py-2 text-sm flex items-center justify-center gap-2">
                    <span>✏️</span>
                    Edit Template
                  </button>
                  <button className="w-full btn-glass py-2 text-sm flex items-center justify-center gap-2">
                    <span>📋</span>
                    Duplicate
                  </button>
                  <button className="w-full btn-glass py-2 text-sm flex items-center justify-center gap-2 text-red-400">
                    <span>🗑️</span>
                    Delete Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Field Dialog */}
      {showNewFieldDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-strong p-6 rounded-lg w-[500px] max-h-[80vh] overflow-auto">
            <h3 className="text-xl font-bold text-white mb-4">Create New Field</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/70 mb-2 block">Field Name</label>
                <input
                  type="text"
                  placeholder="Enter field name..."
                  className="w-full bg-white/5 border border-white/20 rounded px-4 py-2 text-white placeholder-white/40"
                />
              </div>
              <div>
                <label className="text-sm text-white/70 mb-2 block">Internal Name</label>
                <input
                  type="text"
                  placeholder="field_internal_name"
                  className="w-full bg-white/5 border border-white/20 rounded px-4 py-2 text-white placeholder-white/40"
                />
              </div>
              <div>
                <label className="text-sm text-white/70 mb-2 block">Field Type</label>
                <select className="w-full bg-white/5 border border-white/20 rounded px-4 py-2 text-white">
                  <option value="text" className="bg-slate-800 text-white">Text</option>
                  <option value="multiline" className="bg-slate-800 text-white">Multi-line Text</option>
                  <option value="richtext" className="bg-slate-800 text-white">Rich Text</option>
                  <option value="number" className="bg-slate-800 text-white">Number</option>
                  <option value="decimal" className="bg-slate-800 text-white">Decimal</option>
                  <option value="date" className="bg-slate-800 text-white">Date</option>
                  <option value="datetime" className="bg-slate-800 text-white">Date/Time</option>
                  <option value="dropdown" className="bg-slate-800 text-white">Dropdown</option>
                  <option value="multiselect" className="bg-slate-800 text-white">Multi-select</option>
                  <option value="boolean" className="bg-slate-800 text-white">Boolean</option>
                  <option value="user" className="bg-slate-800 text-white">User Picker</option>
                  <option value="file" className="bg-slate-800 text-white">File</option>
                  <option value="url" className="bg-slate-800 text-white">URL</option>
                  <option value="email" className="bg-slate-800 text-white">Email</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-white/70 mb-2 block">Description</label>
                <textarea
                  placeholder="Field description..."
                  className="w-full bg-white/5 border border-white/20 rounded px-4 py-2 text-white placeholder-white/40 h-20"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="text-sm text-white">Required Field</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowNewFieldDialog(false)}
                  className="flex-1 btn-glass py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowNewFieldDialog(false)}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-lg font-medium"
                >
                  Create Field
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetadataManager;

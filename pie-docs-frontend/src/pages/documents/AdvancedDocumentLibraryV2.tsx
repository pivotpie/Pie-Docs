import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

// Realistic data types based on current technology
interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  modified: string;
  tags: string[];
  relationships: string[];
  confidenceScore?: number;
  extractedText?: string;
  ocrQuality?: number;
}

interface AuditRecord {
  timestamp: string;
  action: string;
  user: string;
  userEmail: string;
  ipAddress: string;
  details: string;
}

interface PhysicalLocation {
  building: string;
  floor: string;
  room: string;
  shelf: string;
  box: string;
  barcodeId: string;
  lastScanned: string;
}

interface SmartSuggestion {
  type: 'tag' | 'folder' | 'action' | 'related';
  label: string;
  confidence: number;
  reason: string;
}

const AdvancedDocumentLibraryV2: React.FC = () => {
  const { theme } = useTheme();
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRelationshipView, setShowRelationshipView] = useState(false);
  const [searchType, setSearchType] = useState<'keyword' | 'semantic'>('keyword');

  // Mock data with realistic features
  const mockDocuments: Document[] = [
    {
      id: '1',
      name: 'Q3-2025-Vendor-Contract-Acme-Corp.pdf',
      type: 'Contract',
      size: '2.4 MB',
      modified: '2025-09-15',
      tags: ['vendor', 'Q3', 'legal-review', 'London'],
      relationships: ['invoice-2023-001', 'vendor-profile-acme', 'payment-schedule-q3'],
      confidenceScore: 0.92,
      extractedText: 'Contract Agreement between Company and Acme Corp...',
      ocrQuality: 98
    },
    {
      id: '2',
      name: 'Invoice-2023-001.pdf',
      type: 'Invoice',
      size: '1.1 MB',
      modified: '2025-09-20',
      tags: ['finance', 'Q3', 'approved', 'acme-corp'],
      relationships: ['q3-vendor-contract', 'po-12345', 'payment-receipt-001'],
      confidenceScore: 0.95,
      extractedText: 'Invoice #2023-001, Amount: $52,450.00...',
      ocrQuality: 99
    },
    {
      id: '3',
      name: 'Patent-Application-Blueprint-v2.pdf',
      type: 'Patent',
      size: '15.7 MB',
      modified: '2025-09-28',
      tags: ['patent', 'confidential', 'physical-archive'],
      relationships: ['blueprint-v1', 'patent-filing-2025', 'legal-review-patent'],
      confidenceScore: 0.88,
      extractedText: 'Patent Application for...',
      ocrQuality: 85
    }
  ];

  const mockAuditRecords: AuditRecord[] = [
    {
      timestamp: '2025-09-28 14:23:11',
      action: 'Document Accessed',
      user: 'John Doe',
      userEmail: 'john.doe@company.com',
      ipAddress: '192.168.1.105',
      details: 'Viewed document in read-only mode'
    },
    {
      timestamp: '2025-09-28 14:45:22',
      action: 'Metadata Updated',
      user: 'Jane Smith',
      userEmail: 'jane.smith@company.com',
      ipAddress: '192.168.1.112',
      details: 'Added tags: legal-review, Q3'
    },
    {
      timestamp: '2025-09-28 16:12:08',
      action: 'Document Downloaded',
      user: 'John Doe',
      userEmail: 'john.doe@company.com',
      ipAddress: '192.168.1.105',
      details: 'Downloaded PDF (encrypted copy)'
    },
    {
      timestamp: '2025-09-27 10:30:15',
      action: 'Version Created',
      user: 'System',
      userEmail: 'system@company.com',
      ipAddress: 'internal',
      details: 'Auto-versioning triggered by edit'
    }
  ];

  const mockPhysicalLocation: PhysicalLocation = {
    building: 'HQ East Wing',
    floor: '3',
    room: 'Archive Room B',
    shelf: 'A-12',
    box: 'BOX-2023-PAT-0042',
    barcodeId: 'BAR-2023-000428',
    lastScanned: '2025-09-28 09:15:00'
  };

  const mockSmartSuggestions: SmartSuggestion[] = [
    {
      type: 'tag',
      label: 'Add tag: "financial-audit"',
      confidence: 0.87,
      reason: 'Similar documents have this tag'
    },
    {
      type: 'related',
      label: 'Link to: Purchase Order #12345',
      confidence: 0.91,
      reason: 'Referenced in document text'
    },
    {
      type: 'action',
      label: 'Send for approval',
      confidence: 0.84,
      reason: 'Document type requires approval'
    },
    {
      type: 'folder',
      label: 'Move to: Q3-2025-Contracts',
      confidence: 0.79,
      reason: 'Based on document metadata'
    }
  ];

  const handleDocumentSelect = (doc: Document) => {
    setSelectedDocument(doc);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Search:', searchQuery, 'Type:', searchType);
  };

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'tag': return 'purple';
      case 'folder': return 'blue';
      case 'action': return 'green';
      case 'related': return 'amber';
      default: return 'gray';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 glass-strong">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">📚</span>
                Intelligent Document Library
                <span className="text-sm font-normal text-indigo-300 bg-indigo-500/20 px-3 py-1 rounded-full">
                  Production Ready
                </span>
              </h1>
              <p className="text-sm text-white/60 mt-1">
                Smart Search • Advanced Classification • Comprehensive Audit Trail
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn-glass text-sm px-4 py-2">
                <span className="mr-2">🔄</span>
                Refresh Index
              </button>
              <button className="btn-glass text-sm px-4 py-2">
                <span className="mr-2">📊</span>
                Analytics
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Three-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Panel A: Smart Search & Navigation (Left Panel) */}
        <div className="w-80 border-r border-white/10 glass-panel flex flex-col">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>🔍</span>
              Smart Search
            </h2>

            {/* Search Type Toggle */}
            <div className="flex items-center gap-2 mb-3 p-1 bg-white/5 rounded-lg">
              <button
                onClick={() => setSearchType('keyword')}
                className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  searchType === 'keyword'
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Keyword
              </button>
              <button
                onClick={() => setSearchType('semantic')}
                className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  searchType === 'semantic'
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Semantic
              </button>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="relative">
                <textarea
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    searchType === 'keyword'
                      ? 'Search by keywords, tags, or document properties...'
                      : 'Describe what you\'re looking for... e.g., "vendor contracts from Q3 pending review"'
                  }
                  className="w-full h-24 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="absolute bottom-2 right-2 btn-glass text-xs px-3 py-1"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Search Features Info */}
            <div className="mt-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <div className="text-xs font-medium text-indigo-300 mb-2">
                {searchType === 'keyword' ? '📑 Keyword Search' : '🧠 Semantic Search'}
              </div>
              <div className="space-y-1 text-xs text-white/70">
                {searchType === 'keyword' ? (
                  <>
                    <div>• Full-text search across all documents</div>
                    <div>• Tag and metadata filtering</div>
                    <div>• Boolean operators (AND, OR, NOT)</div>
                    <div>• Wildcard support (*)</div>
                  </>
                ) : (
                  <>
                    <div>• Natural language queries</div>
                    <div>• Vector similarity matching</div>
                    <div>• Context-aware results</div>
                    <div>• Finds related concepts</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white/80 mb-3">Filters</h3>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-white/60 mb-1 block">Document Type</label>
                <select className="w-full text-sm bg-white/5 border border-white/20 rounded px-2 py-1.5 text-white">
                  <option>All Types</option>
                  <option>Contracts</option>
                  <option>Invoices</option>
                  <option>Patents</option>
                  <option>Reports</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1 block">Date Range</label>
                <select className="w-full text-sm bg-white/5 border border-white/20 rounded px-2 py-1.5 text-white">
                  <option>All Time</option>
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last Quarter</option>
                  <option>Last Year</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1 block">Status</label>
                <select className="w-full text-sm bg-white/5 border border-white/20 rounded px-2 py-1.5 text-white">
                  <option>All Status</option>
                  <option>Pending Review</option>
                  <option>Approved</option>
                  <option>Archived</option>
                </select>
              </div>
            </div>
          </div>

          {/* Saved Searches & Quick Filters */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold text-white/80 mb-3">Saved Searches</h3>
            <div className="space-y-2">
              {[
                { name: 'Pending Approvals', count: 12, icon: '⏳' },
                { name: 'Expiring Soon', count: 8, icon: '⚠️' },
                { name: 'High Value Contracts', count: 24, icon: '💰' },
                { name: 'Recently Modified', count: 45, icon: '📝' }
              ].map((search) => (
                <button
                  key={search.name}
                  className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/70 hover:text-white transition-all flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span>{search.icon}</span>
                    <span>{search.name}</span>
                  </span>
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded">{search.count}</span>
                </button>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-white/80 mb-3 mt-6">Recent Insights</h3>
            <div className="space-y-2">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs">
                <div className="font-medium text-blue-300 mb-1">📊 Classification Complete</div>
                <div className="text-white/60">156 documents auto-tagged today</div>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs">
                <div className="font-medium text-amber-300 mb-1">⚠️ Retention Alert</div>
                <div className="text-white/60">12 documents reach retention date in 30 days</div>
              </div>
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-xs">
                <div className="font-medium text-green-300 mb-1">✅ OCR Processing</div>
                <div className="text-white/60">All pending scans processed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel B: Content & Action Hub (Center Panel) */}
        <div className="flex-1 flex flex-col">
          {/* View Toggle */}
          <div className="p-4 border-b border-white/10 glass-panel">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRelationshipView(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    !showRelationshipView
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  📋 Document List
                </button>
                <button
                  onClick={() => setShowRelationshipView(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    showRelationshipView
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  🔗 Relationship Map
                </button>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/60">
                <span>{mockDocuments.length} documents</span>
                <span>•</span>
                <span>42 relationships mapped</span>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {!showRelationshipView ? (
              /* Document List View with Enhanced Metadata */
              <div className="space-y-3">
                {mockDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleDocumentSelect(doc)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      selectedDocument?.id === doc.id
                        ? 'bg-indigo-500/20 border-indigo-500/40'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">📄</span>
                          <h3 className="text-white font-medium">{doc.name}</h3>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-white/60">
                          <span>{doc.type}</span>
                          <span>•</span>
                          <span>{doc.size}</span>
                          <span>•</span>
                          <span>Modified {doc.modified}</span>
                        </div>
                      </div>
                      {doc.confidenceScore && (
                        <div className="ml-4">
                          <div className="text-xs text-white/60 mb-1">Classification</div>
                          <div className="text-sm font-medium text-green-300">
                            {(doc.confidenceScore * 100).toFixed(0)}% confident
                          </div>
                        </div>
                      )}
                    </div>

                    {/* OCR Quality & Text Extraction */}
                    {doc.ocrQuality && (
                      <div className="mt-3 p-2 bg-black/20 rounded border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-indigo-300">📝 Text Extraction</span>
                          <span className="text-xs text-white/70">OCR Quality: {doc.ocrQuality}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-400 to-green-400"
                            style={{ width: `${doc.ocrQuality}%` }}
                          />
                        </div>
                        {doc.extractedText && (
                          <div className="mt-2 text-xs text-white/60 italic truncate">
                            "{doc.extractedText}"
                          </div>
                        )}
                      </div>
                    )}

                    {/* Smart Extracted Info */}
                    <div className="mt-3 p-2 bg-black/20 rounded border border-white/10">
                      <div className="text-xs font-medium text-purple-300 mb-2">🔎 Extracted Information</div>
                      <div className="space-y-1 text-xs text-white/70">
                        {doc.type === 'Contract' && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-white/50">Contract Value:</span>
                              <span className="text-white">$52,450.00</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/50">Parties:</span>
                              <span className="text-white">Company, Acme Corp</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/50">Term Length:</span>
                              <span className="text-white">12 months</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/50">Payment Terms:</span>
                              <span className="text-white">Net 30 days</span>
                            </div>
                          </>
                        )}
                        {doc.type === 'Invoice' && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-white/50">Invoice Number:</span>
                              <span className="text-white font-mono">#2023-001</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/50">Amount:</span>
                              <span className="text-white">$52,450.00</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/50">Due Date:</span>
                              <span className="text-amber-300">Oct 5, 2025</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/50">Status:</span>
                              <span className="text-green-300">Approved</span>
                            </div>
                          </>
                        )}
                        {doc.type === 'Patent' && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-white/50">Patent ID:</span>
                              <span className="text-white font-mono">US-2025-0042</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/50">Status:</span>
                              <span className="text-blue-300">Under Review</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/50">Classification:</span>
                              <span className="text-white">High Confidentiality</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {doc.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-white/10 rounded text-xs text-white/80 hover:bg-white/20 cursor-pointer transition-all"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Relationships */}
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/60">
                          🔗 {doc.relationships.length} related documents
                        </span>
                        <button className="text-indigo-300 hover:text-indigo-200 underline">
                          View relationships →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Relationship Map View */
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4 max-w-2xl">
                  <div className="relative w-full h-96">
                    {/* Central Selected Document */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                      <div className="w-32 h-32 bg-indigo-500/30 border-2 border-indigo-400 rounded-lg flex items-center justify-center shadow-lg">
                        <div className="text-center p-2">
                          <div className="text-3xl mb-1">📄</div>
                          <div className="text-xs text-white font-medium">Q3 Vendor</div>
                          <div className="text-xs text-white font-medium">Contract</div>
                        </div>
                      </div>
                    </div>

                    {/* Related Documents */}
                    {[
                      { angle: 0, icon: '💰', label: 'Invoice\n#2023-001', color: 'green', type: 'Financial' },
                      { angle: 60, icon: '👤', label: 'Vendor\nProfile', color: 'blue', type: 'Reference' },
                      { angle: 120, icon: '📅', label: 'Payment\nSchedule', color: 'amber', type: 'Related' },
                      { angle: 180, icon: '📋', label: 'Purchase\nOrder', color: 'purple', type: 'Source' },
                      { angle: 240, icon: '✍️', label: 'Amendment\nv1', color: 'pink', type: 'Version' },
                      { angle: 300, icon: '⚖️', label: 'Legal\nReview', color: 'red', type: 'Workflow' }
                    ].map((node, i) => {
                      const radius = 160;
                      const x = Math.cos((node.angle * Math.PI) / 180) * radius;
                      const y = Math.sin((node.angle * Math.PI) / 180) * radius;

                      return (
                        <div
                          key={i}
                          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 group"
                          style={{
                            marginLeft: `${x}px`,
                            marginTop: `${y}px`
                          }}
                        >
                          <div className={`w-20 h-20 bg-${node.color}-500/20 border border-${node.color}-400/40 rounded-lg flex items-center justify-center hover:scale-110 transition-all cursor-pointer`}>
                            <div className="text-center">
                              <div className="text-xl mb-0.5">{node.icon}</div>
                              <div className="text-[9px] text-white/80 whitespace-pre-line leading-tight">{node.label}</div>
                            </div>
                          </div>
                          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="text-[10px] bg-black/80 text-white px-2 py-1 rounded whitespace-nowrap">
                              {node.type}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Connection Lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                        const radius = 160;
                        const centerX = '50%';
                        const centerY = '50%';
                        const x2 = `calc(50% + ${Math.cos((angle * Math.PI) / 180) * radius}px)`;
                        const y2 = `calc(50% + ${Math.sin((angle * Math.PI) / 180) * radius}px)`;

                        return (
                          <line
                            key={i}
                            x1={centerX}
                            y1={centerY}
                            x2={x2}
                            y2={y2}
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="2"
                            strokeDasharray="4"
                          />
                        );
                      })}
                    </svg>
                  </div>

                  <div className="space-y-2">
                    <div className="text-white font-medium">Document Relationship Map</div>
                    <div className="text-white/60 text-sm">
                      Showing connections based on metadata, references, and workflow associations
                    </div>
                    <div className="flex items-center justify-center gap-4 text-xs text-white/50 mt-4">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span>Financial</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span>Reference</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                        <span>Related</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        <span>Source</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel C: Intelligence & Actions (Right Panel) */}
        <div className="w-96 border-l border-white/10 glass-panel flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span>🎯</span>
              Document Intelligence
            </h2>
            <p className="text-xs text-white/60 mt-1">
              {selectedDocument ? `Analyzing: ${selectedDocument.name}` : 'Select a document to view details'}
            </p>
          </div>

          {selectedDocument ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Smart Suggestions */}
              <div className="glass-panel p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span>💡</span>
                  Smart Suggestions
                </h3>
                <div className="space-y-2">
                  {mockSmartSuggestions.map((suggestion, i) => {
                    const color = getSuggestionColor(suggestion.type);
                    return (
                      <button
                        key={i}
                        className={`w-full text-left px-3 py-2 bg-${color}-500/10 hover:bg-${color}-500/20 border border-${color}-500/30 rounded-lg transition-all group`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className={`text-sm text-white`}>{suggestion.label}</span>
                          <span className={`text-xs text-${color}-300 font-medium`}>
                            {(suggestion.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-xs text-white/50">{suggestion.reason}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Version History with Semantic Understanding */}
              <div className="glass-panel p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span>📚</span>
                  Version History
                </h3>
                <div className="space-y-2">
                  {[
                    {
                      version: 'v3.2',
                      changeType: 'Major',
                      changeDescription: 'Liability terms revised',
                      affectedSections: ['Section 5.2', 'Section 7.1'],
                      date: '2025-09-28',
                      user: 'Legal Team'
                    },
                    {
                      version: 'v3.1',
                      changeType: 'Minor',
                      changeDescription: 'Scope definition clarified',
                      affectedSections: ['Section 2.3'],
                      date: '2025-09-25',
                      user: 'Project Manager'
                    },
                    {
                      version: 'v3.0',
                      changeType: 'Major',
                      changeDescription: 'Auto-renewal clause added',
                      affectedSections: ['Section 9'],
                      date: '2025-09-20',
                      user: 'Legal Team'
                    }
                  ].map((v) => (
                    <div key={v.version} className="p-3 bg-white/5 hover:bg-white/10 rounded border border-white/10 cursor-pointer transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white text-sm">{v.version}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          v.changeType === 'Major' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {v.changeType}
                        </span>
                      </div>
                      <div className="text-xs text-white/80 mb-2">{v.changeDescription}</div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {v.affectedSections.map((section) => (
                          <span key={section} className="text-[10px] bg-white/10 text-white/70 px-1.5 py-0.5 rounded">
                            {section}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-white/50">
                        <span>{v.user}</span>
                        <span>{v.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-3 text-xs text-indigo-300 hover:text-indigo-200 underline">
                  View full version history →
                </button>
              </div>

              {/* Comprehensive Audit Trail */}
              <div className="glass-panel p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span>📋</span>
                  Audit Trail
                </h3>
                <div className="space-y-2">
                  {mockAuditRecords.map((record, i) => (
                    <div key={i} className="p-2 bg-white/5 rounded text-xs border-l-2 border-indigo-400/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-indigo-300">{record.action}</span>
                        <span className="text-white/50 text-[10px]">{record.timestamp}</span>
                      </div>
                      <div className="space-y-0.5 text-[10px] text-white/60">
                        <div className="flex items-center justify-between">
                          <span>User:</span>
                          <span className="text-white/80">{record.user}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Email:</span>
                          <span className="text-white/80 font-mono">{record.userEmail}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>IP:</span>
                          <span className="text-white/80 font-mono">{record.ipAddress}</span>
                        </div>
                      </div>
                      <div className="text-white/50 text-[10px] mt-1 italic">{record.details}</div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-3 text-xs text-indigo-300 hover:text-indigo-200 underline">
                  Export audit log →
                </button>
              </div>

              {/* Physical Asset Tracking (for Patent document) */}
              {selectedDocument.type === 'Patent' && (
                <div className="glass-panel p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <span>📍</span>
                    Physical Location
                  </h3>

                  {/* Barcode Tracking Info */}
                  <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                    <div className="text-xs font-medium text-blue-300 mb-2">Barcode Tracking</div>
                    <div className="font-mono text-lg text-white text-center py-2 bg-white/10 rounded">
                      {mockPhysicalLocation.barcodeId}
                    </div>
                    <div className="text-[10px] text-white/50 text-center mt-1">
                      Last scanned: {mockPhysicalLocation.lastScanned}
                    </div>
                  </div>

                  {/* Location Details */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-2 bg-white/5 rounded">
                      <span className="text-white/60">Building:</span>
                      <span className="text-white font-medium">{mockPhysicalLocation.building}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-white/5 rounded">
                      <span className="text-white/60">Floor:</span>
                      <span className="text-white font-medium">{mockPhysicalLocation.floor}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-white/5 rounded">
                      <span className="text-white/60">Room:</span>
                      <span className="text-white font-medium">{mockPhysicalLocation.room}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-white/5 rounded">
                      <span className="text-white/60">Shelf:</span>
                      <span className="text-white font-medium">{mockPhysicalLocation.shelf}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-white/5 rounded">
                      <span className="text-white/60">Box:</span>
                      <span className="text-white font-mono text-[10px]">{mockPhysicalLocation.box}</span>
                    </div>
                  </div>

                  <button className="w-full mt-3 btn-glass text-xs py-2">
                    📱 Generate Location QR Code
                  </button>
                </div>
              )}

              {/* Retention Policy & Compliance */}
              <div className="glass-panel p-4 rounded-lg border-2 border-amber-500/30">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span>⏱️</span>
                  Retention & Compliance
                </h3>

                <div className="space-y-3">
                  {/* Retention Schedule */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/60">Retention Period</span>
                      <span className="text-xs text-white font-medium">7 years (Legal)</span>
                    </div>
                    <div className="text-center py-3">
                      <div className="text-2xl font-bold text-amber-300 mb-1">
                        847 days
                      </div>
                      <div className="text-xs text-white/60 mb-3">
                        remaining until eligible for review
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-amber-400"
                          style={{ width: '72%' }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-white/50 mt-1">
                        <span>Created</span>
                        <span>72% elapsed</span>
                        <span>Review Date</span>
                      </div>
                    </div>
                  </div>

                  {/* Compliance Status */}
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded">
                    <div className="text-xs font-medium text-green-300 mb-2">✓ Compliance Status</div>
                    <div className="space-y-1 text-[10px] text-white/70">
                      <div className="flex items-center justify-between">
                        <span>Metadata Complete:</span>
                        <span className="text-green-300">Yes</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Access Controls:</span>
                        <span className="text-green-300">Configured</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Audit Trail:</span>
                        <span className="text-green-300">Active</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Backup Status:</span>
                        <span className="text-green-300">Current</span>
                      </div>
                    </div>
                  </div>

                  <button className="w-full btn-glass text-xs py-2">
                    📋 View Retention Policy
                  </button>
                </div>
              </div>

              {/* Content Analysis & Classification */}
              <div className="glass-panel p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span>🔬</span>
                  Content Analysis
                </h3>
                <div className="space-y-3">
                  {/* Document Classification */}
                  <div>
                    <div className="text-xs text-white/60 mb-2">Auto-Classification Results</div>
                    <div className="space-y-2">
                      {[
                        { label: 'Document Type: Contract', confidence: 92 },
                        { label: 'Category: Vendor Agreement', confidence: 88 },
                        { label: 'Sensitivity: Business Confidential', confidence: 85 }
                      ].map((item, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1 text-xs">
                            <span className="text-white/80">{item.label}</span>
                            <span className="text-green-300">{item.confidence}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-400 to-green-400"
                              style={{ width: `${item.confidence}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Extracted Entities */}
                  <div>
                    <div className="text-xs text-white/60 mb-2">Extracted Entities</div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { type: 'Company', value: 'Acme Corp' },
                        { type: 'Date', value: 'Sep 15, 2025' },
                        { type: 'Amount', value: '$52,450' },
                        { type: 'Person', value: 'John Smith' },
                        { type: 'Location', value: 'London' }
                      ].map((entity, i) => (
                        <div key={i} className="text-[10px] bg-white/10 text-white/80 px-2 py-1 rounded">
                          <span className="text-white/50">{entity.type}:</span> {entity.value}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Language & Page Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-white/5 rounded text-center">
                      <div className="text-white/50 text-[10px]">Language</div>
                      <div className="text-white font-medium">English</div>
                    </div>
                    <div className="p-2 bg-white/5 rounded text-center">
                      <div className="text-white/50 text-[10px]">Pages</div>
                      <div className="text-white font-medium">47</div>
                    </div>
                    <div className="p-2 bg-white/5 rounded text-center">
                      <div className="text-white/50 text-[10px]">Word Count</div>
                      <div className="text-white font-medium">12,458</div>
                    </div>
                    <div className="p-2 bg-white/5 rounded text-center">
                      <div className="text-white/50 text-[10px]">Readability</div>
                      <div className="text-white font-medium">Grade 12</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center text-white/40">
                <div className="text-4xl mb-3">👈</div>
                <div className="text-sm">Select a document to view intelligence and actions</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedDocumentLibraryV2;

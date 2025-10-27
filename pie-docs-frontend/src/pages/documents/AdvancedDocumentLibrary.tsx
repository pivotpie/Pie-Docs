import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

// Mock data types for the concept
interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  modified: string;
  tags: string[];
  relationships: string[];
}

interface BlockchainRecord {
  timestamp: string;
  action: string;
  user: string;
  hash: string;
}

interface PhysicalLocation {
  building: string;
  floor: string;
  room: string;
  shelf: string;
  box: string;
  coordinates: { x: number; y: number; z: number };
}

const AdvancedDocumentLibrary: React.FC = () => {
  const { theme } = useTheme();
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false);

  // Mock data
  const mockDocuments: Document[] = [
    {
      id: '1',
      name: 'Q3 Vendor Contract - Acme Corp',
      type: 'Contract',
      size: '2.4 MB',
      modified: '2025-09-15',
      tags: ['vendor', 'Q3', 'legal', 'London'],
      relationships: ['invoice-2023-001', 'vendor-profile-acme', 'payment-schedule-q3']
    },
    {
      id: '2',
      name: 'Invoice #2023-001',
      type: 'Invoice',
      size: '1.1 MB',
      modified: '2025-09-20',
      tags: ['finance', 'Q3', 'pending'],
      relationships: ['q3-vendor-contract', 'po-12345']
    },
    {
      id: '3',
      name: 'Patent Application - Blueprint v2',
      type: 'Patent',
      size: '15.7 MB',
      modified: '2025-09-28',
      tags: ['patent', 'high-value', 'physical-tracked'],
      relationships: ['blueprint-v1', 'patent-office-filing', 'legal-review']
    }
  ];

  const mockBlockchainRecords: BlockchainRecord[] = [
    { timestamp: '2025-09-28 14:23:11', action: 'Checked Out', user: 'john.doe@company.com', hash: '0x7a9b3c...' },
    { timestamp: '2025-09-28 16:45:22', action: 'Viewed', user: 'john.doe@company.com', hash: '0x8c4d2e...' },
    { timestamp: '2025-09-28 17:12:08', action: 'Checked In', user: 'john.doe@company.com', hash: '0x9f5e1a...' }
  ];

  const mockPhysicalLocation: PhysicalLocation = {
    building: 'HQ East Wing',
    floor: '3',
    room: 'Archive Room B',
    shelf: 'A-12',
    box: 'BOX-2023-PAT-0042',
    coordinates: { x: 45.2, y: 12.8, z: 3.5 }
  };

  const handleDocumentSelect = (doc: Document) => {
    setSelectedDocument(doc);
  };

  const handleCognitiveSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate AI-powered search
    console.log('Cognitive search for:', searchQuery);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 glass-strong">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">🚀</span>
                Advanced Document Library
                <span className="text-sm font-normal text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full">
                  Concept Preview
                </span>
              </h1>
              <p className="text-sm text-white/60 mt-1">
                AI-Powered • Blockchain-Secured • Real-Time Intelligence
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn-glass text-sm px-4 py-2">
                <span className="mr-2">🔄</span>
                Sync Physical Assets
              </button>
              <button className="btn-glass text-sm px-4 py-2">
                <span className="mr-2">⛓️</span>
                Verify Chain
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Three-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Panel A: AI Search & Navigation (Left Panel) */}
        <div className="w-80 border-r border-white/10 glass-panel flex flex-col">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>🧠</span>
              Cognitive Search
            </h2>

            {/* Natural Language Query Engine */}
            <form onSubmit={handleCognitiveSearch} className="space-y-3">
              <div className="relative">
                <textarea
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ask anything... e.g., 'Show me all Q3 vendor contracts over $50k that are still pending legal review in the London office'"
                  className="w-full h-24 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  className="absolute bottom-2 right-2 btn-glass text-xs px-3 py-1"
                >
                  Search
                </button>
              </div>
            </form>

            {/* AI Search Insights */}
            <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="text-xs font-medium text-purple-300 mb-2">🤖 AI Understands:</div>
              <div className="space-y-1 text-xs text-white/70">
                <div>• Document Type: <span className="text-white">Contracts</span></div>
                <div>• Time Period: <span className="text-white">Q3 2025</span></div>
                <div>• Value Filter: <span className="text-white">&gt; $50,000</span></div>
                <div>• Status: <span className="text-white">Pending Legal Review</span></div>
                <div>• Location: <span className="text-white">London Office</span></div>
              </div>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white/80 mb-3">Smart Filters</h3>
            <div className="space-y-2">
              {['High Value Assets', 'Pending Review', 'Expiring Soon', 'Physical Tracked', 'AI Annotated'].map((filter) => (
                <button
                  key={filter}
                  className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/70 hover:text-white transition-all"
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Recent AI Insights */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold text-white/80 mb-3">Recent AI Insights</h3>
            <div className="space-y-2">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs">
                <div className="font-medium text-blue-300 mb-1">📊 Anomaly Detected</div>
                <div className="text-white/60">3 contracts missing penalty clauses</div>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs">
                <div className="font-medium text-amber-300 mb-1">⚠️ Retention Alert</div>
                <div className="text-white/60">12 documents scheduled for destruction in 30 days</div>
              </div>
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-xs">
                <div className="font-medium text-green-300 mb-1">✅ Compliance Check</div>
                <div className="text-white/60">All Q3 invoices verified on blockchain</div>
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
                  onClick={() => setShowKnowledgeGraph(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    !showKnowledgeGraph
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  📋 List View
                </button>
                <button
                  onClick={() => setShowKnowledgeGraph(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    showKnowledgeGraph
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  🕸️ Knowledge Graph
                </button>
              </div>
              <div className="text-sm text-white/60">
                {mockDocuments.length} documents • 24 relationships
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {!showKnowledgeGraph ? (
              /* List View with AI Annotations */
              <div className="space-y-3">
                {mockDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleDocumentSelect(doc)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      selectedDocument?.id === doc.id
                        ? 'bg-purple-500/20 border-purple-500/40'
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
                    </div>

                    {/* AI Annotation Preview */}
                    <div className="mt-3 p-2 bg-black/20 rounded border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-purple-300">🤖 AI Insights</span>
                      </div>
                      <div className="space-y-1 text-xs text-white/70">
                        {doc.type === 'Contract' && (
                          <>
                            <div>• <span className="text-yellow-300">Penalty clause</span> found on page 7</div>
                            <div>• <span className="text-green-300">Payment terms</span>: Net 30 days</div>
                            <div>• <span className="text-blue-300">Auto-renewal</span> clause detected</div>
                          </>
                        )}
                        {doc.type === 'Invoice' && (
                          <>
                            <div>• Linked to <span className="text-purple-300">PO #12345</span> (live status: Approved)</div>
                            <div>• Payment due in <span className="text-amber-300">5 days</span></div>
                          </>
                        )}
                        {doc.type === 'Patent' && (
                          <>
                            <div>• <span className="text-red-300">High-value asset</span> with physical tracking</div>
                            <div>• Current location: <span className="text-green-300">Archive Room B, Shelf A-12</span></div>
                            <div>• IoT status: <span className="text-green-300">Active</span> • Last ping: 2 min ago</div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {doc.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-white/10 rounded text-xs text-white/80"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Relationships */}
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="text-xs text-white/60 mb-1">
                        🔗 {doc.relationships.length} related items
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Knowledge Graph View */
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="relative w-96 h-96 mx-auto">
                    {/* Central Node */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                      <div className="w-24 h-24 bg-purple-500/30 border-2 border-purple-400 rounded-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl mb-1">📄</div>
                          <div className="text-xs text-white font-medium">Contract</div>
                        </div>
                      </div>
                    </div>

                    {/* Related Nodes */}
                    {[
                      { angle: 0, icon: '💰', label: 'Invoice', color: 'green' },
                      { angle: 72, icon: '👤', label: 'Vendor', color: 'blue' },
                      { angle: 144, icon: '📅', label: 'Schedule', color: 'amber' },
                      { angle: 216, icon: '✍️', label: 'Signature', color: 'pink' },
                      { angle: 288, icon: '⚖️', label: 'Legal', color: 'red' }
                    ].map((node, i) => {
                      const radius = 140;
                      const x = Math.cos((node.angle * Math.PI) / 180) * radius;
                      const y = Math.sin((node.angle * Math.PI) / 180) * radius;

                      return (
                        <div
                          key={i}
                          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                          style={{
                            marginLeft: `${x}px`,
                            marginTop: `${y}px`
                          }}
                        >
                          <div className={`w-16 h-16 bg-${node.color}-500/20 border border-${node.color}-400/40 rounded-full flex items-center justify-center`}>
                            <div className="text-center">
                              <div className="text-xl">{node.icon}</div>
                              <div className="text-[10px] text-white/70">{node.label}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Connection Lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      {[0, 72, 144, 216, 288].map((angle, i) => {
                        const radius = 140;
                        const x1 = 192; // center
                        const y1 = 192; // center
                        const x2 = x1 + Math.cos((angle * Math.PI) / 180) * radius;
                        const y2 = y1 + Math.sin((angle * Math.PI) / 180) * radius;

                        return (
                          <line
                            key={i}
                            x1={x1}
                            y1={y1}
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
                  <div className="text-white/60 text-sm">
                    Interactive Knowledge Graph
                    <br />
                    <span className="text-xs">Showing relationships between documents, people, and projects</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel C: Contextual Intelligence Panel (Right Panel) */}
        <div className="w-96 border-l border-white/10 glass-panel flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span>🎯</span>
              Contextual Intelligence
            </h2>
            <p className="text-xs text-white/60 mt-1">
              {selectedDocument ? `Analyzing: ${selectedDocument.name}` : 'Select a document to view insights'}
            </p>
          </div>

          {selectedDocument ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* AI Assistant Predictions */}
              <div className="glass-panel p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span>🤖</span>
                  AI Assistant
                </h3>
                <div className="space-y-2">
                  <div className="text-xs text-white/70 mb-3">
                    Based on your activity, you might want to:
                  </div>
                  <button className="w-full text-left px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 rounded-lg text-sm text-white transition-all">
                    📝 Generate vendor agreement for new client
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-sm text-white transition-all">
                    🔍 Compare with similar Q2 contracts
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-sm text-white transition-all">
                    ✅ Send for legal review
                  </button>
                </div>
              </div>

              {/* Semantic Version Control */}
              <div className="glass-panel p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span>📚</span>
                  Version History
                </h3>
                <div className="space-y-2">
                  {[
                    { version: 'v3.2', change: 'Major revision of liability clause', date: '2025-09-28', type: 'major' },
                    { version: 'v3.1', change: 'Minor adjustment to scope definition', date: '2025-09-25', type: 'minor' },
                    { version: 'v3.0', change: 'Added auto-renewal terms', date: '2025-09-20', type: 'major' }
                  ].map((v) => (
                    <div key={v.version} className="p-2 bg-white/5 rounded text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white">{v.version}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          v.type === 'major' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {v.type}
                        </span>
                      </div>
                      <div className="text-white/70">{v.change}</div>
                      <div className="text-white/50 text-[10px] mt-1">{v.date}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blockchain Chain of Custody */}
              <div className="glass-panel p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span>⛓️</span>
                  Blockchain Custody
                </h3>
                <div className="space-y-2">
                  {mockBlockchainRecords.map((record, i) => (
                    <div key={i} className="p-2 bg-white/5 rounded text-xs border-l-2 border-green-400/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-green-300">{record.action}</span>
                        <span className="text-white/50 text-[10px]">{record.timestamp}</span>
                      </div>
                      <div className="text-white/60 text-[10px]">{record.user}</div>
                      <div className="text-white/40 text-[10px] font-mono mt-1 truncate">
                        Hash: {record.hash}...
                      </div>
                    </div>
                  ))}
                  <button className="w-full mt-2 text-xs text-purple-300 hover:text-purple-200 underline">
                    Verify on blockchain explorer →
                  </button>
                </div>
              </div>

              {/* Physical Asset Tracking (for Patent document) */}
              {selectedDocument.type === 'Patent' && (
                <div className="glass-panel p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <span>📍</span>
                    Physical Location
                  </h3>

                  {/* 3D Visualization Placeholder */}
                  <div className="relative h-40 bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-lg mb-3 overflow-hidden border border-white/10">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-2">🏢</div>
                        <div className="text-xs text-white/60">3D Digital Twin View</div>
                      </div>
                    </div>
                    {/* Simulated 3D Grid */}
                    <div className="absolute inset-0 opacity-20">
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute h-px bg-white"
                          style={{ top: `${(i + 1) * 12.5}%`, left: 0, right: 0 }}
                        />
                      ))}
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-px bg-white"
                          style={{ left: `${(i + 1) * 12.5}%`, top: 0, bottom: 0 }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Location Details */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/60">Building:</span>
                      <span className="text-white">{mockPhysicalLocation.building}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Floor:</span>
                      <span className="text-white">{mockPhysicalLocation.floor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Room:</span>
                      <span className="text-white">{mockPhysicalLocation.room}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Shelf:</span>
                      <span className="text-white">{mockPhysicalLocation.shelf}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Box:</span>
                      <span className="text-white font-mono text-[10px]">{mockPhysicalLocation.box}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/10">
                      <span className="text-white/60">IoT Status:</span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        <span className="text-green-300">Active</span>
                      </span>
                    </div>
                    <div className="text-[10px] text-white/50 font-mono">
                      Coordinates: ({mockPhysicalLocation.coordinates.x}, {mockPhysicalLocation.coordinates.y}, {mockPhysicalLocation.coordinates.z})
                    </div>
                  </div>

                  <button className="w-full mt-3 btn-glass text-xs py-2">
                    📱 View in AR
                  </button>
                </div>
              )}

              {/* Auto-Destruction Policy */}
              <div className="glass-panel p-4 rounded-lg border-2 border-amber-500/30">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span>⏱️</span>
                  Retention Policy
                </h3>
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-amber-300 mb-2">
                    847
                  </div>
                  <div className="text-xs text-white/60 mb-4">
                    days until mandatory destruction
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400"
                      style={{ width: '72%' }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-white/50 mt-2">
                    <span>Created</span>
                    <span>72% elapsed</span>
                    <span>Destroy</span>
                  </div>
                </div>
                <button className="w-full mt-3 btn-glass text-xs py-2 border border-amber-500/40">
                  📋 View Destruction Workflow
                </button>
              </div>

              {/* Multi-Modal Analysis */}
              <div className="glass-panel p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span>🎬</span>
                  Multi-Modal Content
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="p-2 bg-white/5 rounded">
                    <div className="text-white/70 mb-1">📄 Text extracted: 47 pages</div>
                    <div className="text-white/50 text-[10px]">Key terms identified: 124</div>
                  </div>
                  <div className="p-2 bg-white/5 rounded">
                    <div className="text-white/70 mb-1">🎤 Audio transcribed: 12:34</div>
                    <div className="text-white/50 text-[10px]">Meeting notes generated</div>
                  </div>
                  <div className="p-2 bg-white/5 rounded">
                    <div className="text-white/70 mb-1">📊 3 charts detected</div>
                    <div className="text-white/50 text-[10px]">Data extracted to structured format</div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center text-white/40">
                <div className="text-4xl mb-3">👈</div>
                <div className="text-sm">Select a document to view contextual intelligence</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedDocumentLibrary;

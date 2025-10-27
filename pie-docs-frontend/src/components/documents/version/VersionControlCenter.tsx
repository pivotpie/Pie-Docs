import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  EyeIcon,
  TrashIcon,
  TagIcon,
  CodeBracketIcon,
  CheckIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';

interface DocumentVersion {
  id: string;
  version: string;
  title: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    email: string;
  };
  createdAt: Date;
  size: number;
  status: 'draft' | 'review' | 'approved' | 'archived' | 'rejected';
  changes: {
    type: 'created' | 'modified' | 'deleted' | 'renamed' | 'moved';
    description: string;
    linesAdded?: number;
    linesRemoved?: number;
    filesChanged?: number;
  }[];
  metadata: {
    comments?: string;
    tags?: string[];
    approver?: {
      id: string;
      name: string;
      approvedAt: Date;
    };
    checksum?: string;
  };
  parentVersionId?: string;
  branches?: string[];
  isCurrentVersion: boolean;
  canRevert: boolean;
  canDelete: boolean;
}

interface VersionBranch {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
  };
  versions: DocumentVersion[];
  isActive: boolean;
  isMerged: boolean;
  mergedAt?: Date;
  mergedBy?: {
    id: string;
    name: string;
  };
}

interface VersionControlCenterProps {
  documentId: string;
  onVersionSelect: (version: DocumentVersion) => void;
  onVersionRevert: (versionId: string) => void;
  onVersionDelete: (versionId: string) => void;
  onVersionCompare: (version1Id: string, version2Id: string) => void;
  onBranchCreate: (name: string, fromVersionId: string) => void;
  onBranchMerge: (branchId: string, targetBranchId: string) => void;
  className?: string;
}

// Mock data - In real implementation, this would come from backend
const mockVersions: DocumentVersion[] = [
  {
    id: 'v1.0.0',
    version: '1.0.0',
    title: 'Initial version',
    author: {
      id: 'user1',
      name: 'John Doe',
      email: 'john@company.com',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'
    },
    createdAt: new Date('2024-01-15T10:30:00Z'),
    size: 2048576,
    status: 'approved',
    changes: [
      {
        type: 'created',
        description: 'Initial document creation',
        linesAdded: 150,
        filesChanged: 1
      }
    ],
    metadata: {
      comments: 'Initial draft of the policy document',
      tags: ['policy', 'initial'],
      approver: {
        id: 'manager1',
        name: 'Jane Smith',
        approvedAt: new Date('2024-01-16T14:00:00Z')
      },
      checksum: 'sha256:abc123...'
    },
    isCurrentVersion: false,
    canRevert: true,
    canDelete: false
  },
  {
    id: 'v1.1.0',
    version: '1.1.0',
    title: 'Updated compliance requirements',
    author: {
      id: 'user2',
      name: 'Alice Johnson',
      email: 'alice@company.com'
    },
    createdAt: new Date('2024-02-10T16:45:00Z'),
    size: 2156032,
    status: 'approved',
    changes: [
      {
        type: 'modified',
        description: 'Updated section 3.2 with new compliance requirements',
        linesAdded: 25,
        linesRemoved: 8,
        filesChanged: 1
      },
      {
        type: 'modified',
        description: 'Added appendix B with regulatory references',
        linesAdded: 45,
        filesChanged: 1
      }
    ],
    metadata: {
      comments: 'Updated to reflect Q1 2024 regulatory changes',
      tags: ['compliance', 'regulatory', 'update'],
      approver: {
        id: 'manager1',
        name: 'Jane Smith',
        approvedAt: new Date('2024-02-12T09:30:00Z')
      }
    },
    parentVersionId: 'v1.0.0',
    isCurrentVersion: false,
    canRevert: true,
    canDelete: true
  },
  {
    id: 'v2.0.0-beta',
    version: '2.0.0-beta',
    title: 'Major restructure (Beta)',
    author: {
      id: 'user1',
      name: 'John Doe',
      email: 'john@company.com'
    },
    createdAt: new Date('2024-03-05T11:20:00Z'),
    size: 2891264,
    status: 'review',
    changes: [
      {
        type: 'modified',
        description: 'Complete restructure of document sections',
        linesAdded: 120,
        linesRemoved: 89,
        filesChanged: 1
      },
      {
        type: 'created',
        description: 'Added new section on data privacy',
        linesAdded: 67,
        filesChanged: 1
      }
    ],
    metadata: {
      comments: 'Major overhaul to improve readability and compliance coverage',
      tags: ['restructure', 'beta', 'privacy']
    },
    parentVersionId: 'v1.1.0',
    branches: ['feature/privacy-updates'],
    isCurrentVersion: true,
    canRevert: false,
    canDelete: true
  }
];

const mockBranches: VersionBranch[] = [
  {
    id: 'main',
    name: 'main',
    description: 'Main production branch',
    createdAt: new Date('2024-01-15T10:30:00Z'),
    createdBy: {
      id: 'system',
      name: 'System'
    },
    versions: mockVersions.filter(v => !v.branches?.length),
    isActive: true,
    isMerged: false
  },
  {
    id: 'feature/privacy-updates',
    name: 'feature/privacy-updates',
    description: 'Feature branch for privacy policy updates',
    createdAt: new Date('2024-03-01T09:00:00Z'),
    createdBy: {
      id: 'user1',
      name: 'John Doe'
    },
    versions: mockVersions.filter(v => v.branches?.includes('feature/privacy-updates')),
    isActive: false,
    isMerged: false
  }
];

export const VersionControlCenter: React.FC<VersionControlCenterProps> = ({
  documentId,
  onVersionSelect,
  onVersionRevert,
  onVersionDelete,
  onVersionCompare,
  onBranchCreate,
  onBranchMerge,
  className = ''
}) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [branches, setBranches] = useState<VersionBranch[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'timeline' | 'branches' | 'comparison'>('timeline');
  const [loading, setLoading] = useState(true);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  // Load versions and branches
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setVersions(mockVersions);
      setBranches(mockBranches);
      setLoading(false);
    };

    loadData();
  }, [documentId]);

  // Timeline view with version hierarchy
  const versionTimeline = useMemo(() => {
    const timeline = [...versions].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return timeline.map(version => ({
      ...version,
      children: versions.filter(v => v.parentVersionId === version.id)
    }));
  }, [versions]);

  const handleVersionToggle = useCallback((versionId: string) => {
    setExpandedVersions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(versionId)) {
        newSet.delete(versionId);
      } else {
        newSet.add(versionId);
      }
      return newSet;
    });
  }, []);

  const handleVersionSelection = useCallback((versionId: string, isMultiSelect = false) => {
    if (isMultiSelect) {
      setSelectedVersions(prev => {
        if (prev.includes(versionId)) {
          return prev.filter(id => id !== versionId);
        } else {
          return prev.length >= 2 ? [prev[1], versionId] : [...prev, versionId];
        }
      });
    } else {
      setSelectedVersions([versionId]);
      onVersionSelect(versions.find(v => v.id === versionId)!);
    }
  }, [versions, onVersionSelect]);

  const handleBranchCreate = useCallback(() => {
    if (newBranchName.trim() && selectedVersions.length === 1) {
      onBranchCreate(newBranchName.trim(), selectedVersions[0]);
      setNewBranchName('');
      setShowCreateBranch(false);
    }
  }, [newBranchName, selectedVersions, onBranchCreate]);

  const getStatusColor = (status: DocumentVersion['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'review': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'approved': return 'bg-green-100 text-green-800 border-green-300';
      case 'archived': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Render version card
  const renderVersionCard = (version: DocumentVersion, level = 0) => {
    const isExpanded = expandedVersions.has(version.id);
    const isSelected = selectedVersions.includes(version.id);
    const hasChildren = versions.some(v => v.parentVersionId === version.id);

    return (
      <div key={version.id} className={`ml-${level * 4}`}>
        <div
          className={`relative border rounded-lg p-4 mb-3 transition-all hover:shadow-md ${
            isSelected
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
          }`}
        >
          {/* Version Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => handleVersionSelection(version.id, e.shiftKey)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="flex-shrink-0">
                {version.author.avatar ? (
                  <img
                    src={version.author.avatar}
                    alt={version.author.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    v{version.version}
                  </h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(version.status)}`}>
                    {version.status}
                  </span>
                  {version.isCurrentVersion && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                      Current
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-900 dark:text-white font-medium mb-1">
                  {version.title}
                </p>

                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center space-x-1">
                    <UserIcon className="w-4 h-4" />
                    <span>{version.author.name}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <ClockIcon className="w-4 h-4" />
                    <span>{formatDate(version.createdAt)}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>{formatFileSize(version.size)}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {hasChildren && (
                <button
                  onClick={() => handleVersionToggle(version.id)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="w-4 h-4" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4" />
                  )}
                </button>
              )}

              <button
                onClick={() => onVersionSelect(version)}
                className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                title="View version"
              >
                <EyeIcon className="w-4 h-4" />
              </button>

              {version.canRevert && (
                <button
                  onClick={() => onVersionRevert(version.id)}
                  className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                  title="Revert to this version"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                </button>
              )}

              {version.canDelete && (
                <button
                  onClick={() => onVersionDelete(version.id)}
                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  title="Delete version"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Changes Summary */}
          <div className="mb-3">
            <div className="space-y-1">
              {version.changes.map((change, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${
                    change.type === 'created' ? 'bg-green-500' :
                    change.type === 'modified' ? 'bg-blue-500' :
                    change.type === 'deleted' ? 'bg-red-500' :
                    'bg-gray-500'
                  }`} />
                  <span className="text-gray-700 dark:text-gray-300">{change.description}</span>
                  {change.linesAdded !== undefined && (
                    <span className="text-green-600 text-xs">+{change.linesAdded}</span>
                  )}
                  {change.linesRemoved !== undefined && (
                    <span className="text-red-600 text-xs">-{change.linesRemoved}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Metadata */}
          {version.metadata.comments && (
            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                "{version.metadata.comments}"
              </p>
            </div>
          )}

          {/* Tags */}
          {version.metadata.tags && version.metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {version.metadata.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                >
                  <TagIcon className="w-3 h-3 mr-1" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Approval Info */}
          {version.metadata.approver && (
            <div className="flex items-center space-x-2 text-sm text-green-700 dark:text-green-400">
              <CheckIcon className="w-4 h-4" />
              <span>
                Approved by {version.metadata.approver.name} on {formatDate(version.metadata.approver.approvedAt)}
              </span>
            </div>
          )}

          {/* Timeline Connection */}
          {level > 0 && (
            <div className="absolute left-0 top-0 w-px h-full bg-gray-300 dark:bg-gray-600 -ml-2" />
          )}
        </div>

        {/* Child Versions */}
        {isExpanded && hasChildren && (
          <div className="ml-8 border-l border-gray-200 dark:border-gray-700 pl-4">
            {versions
              .filter(v => v.parentVersionId === version.id)
              .map(childVersion => renderVersionCard(childVersion, level + 1))
            }
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton height={40} width={200} />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-start space-x-3 mb-3">
              <LoadingSkeleton variant="circular" width={32} height={32} />
              <div className="flex-1 space-y-2">
                <LoadingSkeleton height={20} width="60%" />
                <LoadingSkeleton height={16} width="80%" />
                <LoadingSkeleton height={14} width="40%" />
              </div>
            </div>
            <LoadingSkeleton height={60} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`version-control-center ${className}`} dir="ltr">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Version Control Center
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Manage document versions, branches, and history
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {selectedVersions.length === 2 && (
            <button
              onClick={() => onVersionCompare(selectedVersions[0], selectedVersions[1])}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Compare Versions
            </button>
          )}

          {selectedVersions.length === 1 && (
            <button
              onClick={() => setShowCreateBranch(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Create Branch
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'timeline', label: 'Timeline View', icon: ClockIcon },
            { id: 'branches', label: 'Branches', icon: CodeBracketIcon },
            { id: 'comparison', label: 'Version Comparison', icon: DocumentTextIcon },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-5 h-5 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'timeline' && (
          <div className="space-y-1">
            {versionTimeline.map(version => renderVersionCard(version))}
          </div>
        )}

        {activeTab === 'branches' && (
          <div className="space-y-4">
            {branches.map(branch => (
              <div key={branch.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      branch.isActive ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {branch.name}
                    </h4>
                    {branch.isMerged && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                        Merged
                      </span>
                    )}
                  </div>

                  {!branch.isMerged && branch.id !== 'main' && (
                    <button
                      onClick={() => onBranchMerge(branch.id, 'main')}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Merge to Main
                    </button>
                  )}
                </div>

                {branch.description && (
                  <p className="text-gray-600 dark:text-gray-300 mb-3">{branch.description}</p>
                )}

                <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Created by {branch.createdBy.name} on {formatDate(branch.createdAt)}
                  {branch.isMerged && branch.mergedBy && (
                    <span> • Merged by {branch.mergedBy.name} on {formatDate(branch.mergedAt!)}</span>
                  )}
                </div>

                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {branch.versions.length} version{branch.versions.length !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'comparison' && (
          <div className="text-center py-12">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Compare Versions
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Select two versions from the timeline to compare their differences
            </p>
            {selectedVersions.length === 2 && (
              <button
                onClick={() => onVersionCompare(selectedVersions[0], selectedVersions[1])}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Compare Selected Versions
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Branch Modal */}
      {showCreateBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create New Branch
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="feature/new-feature"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From Version
                </label>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {versions.find(v => v.id === selectedVersions[0])?.version}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateBranch(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBranchCreate}
                disabled={!newBranchName.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Create Branch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionControlCenter;
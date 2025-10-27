import React, { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type {
  SmartFolderCriteria,
  DocumentType,
  DocumentStatus,
  FolderCreationRequest
} from '@/types/domain/Document';
import { createFolder, selectAvailableFilterOptions } from '@/store/slices/documentsSlice';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { DatePicker } from '@/components/ui/DatePicker';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

interface SmartFolderBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  parentId?: string;
  onFolderCreated?: (folderId: string) => void;
}

interface CriteriaPreview {
  expectedCount: number;
  sampleDocuments: string[];
  isLoading: boolean;
}

const DOCUMENT_TYPES: DocumentType[] = ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'md', 'html', 'image', 'video', 'audio', 'other'];
const DOCUMENT_STATUSES: DocumentStatus[] = ['draft', 'published', 'archived', 'processing', 'failed'];

export const SmartFolderBuilder: React.FC<SmartFolderBuilderProps> = ({
  isOpen,
  onClose,
  parentId,
  onFolderCreated
}) => {
  const dispatch = useDispatch();
  const availableOptions = useSelector(selectAvailableFilterOptions);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [criteria, setCriteria] = useState<SmartFolderCriteria>({});
  const [preview, setPreview] = useState<CriteriaPreview>({
    expectedCount: 0,
    sampleDocuments: [],
    isLoading: false
  });
  const [isCreating, setIsCreating] = useState(false);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setAutoRefresh(true);
      setCriteria({});
      setPreview({ expectedCount: 0, sampleDocuments: [], isLoading: false });
    }
  }, [isOpen]);

  // Generate preview when criteria changes
  const generatePreview = useCallback(async () => {
    if (!hasCriteria()) {
      setPreview({ expectedCount: 0, sampleDocuments: [], isLoading: false });
      return;
    }

    setPreview(prev => ({ ...prev, isLoading: true }));

    try {
      // Simulate API call to preview smart folder content
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock preview data based on criteria
      const mockCount = Math.floor(Math.random() * 50) + 1;
      const mockSamples = Array.from({ length: Math.min(3, mockCount) }, (_, i) =>
        `Document ${i + 1} matching criteria`
      );

      setPreview({
        expectedCount: mockCount,
        sampleDocuments: mockSamples,
        isLoading: false
      });
    } catch (error) {
      setPreview({ expectedCount: 0, sampleDocuments: [], isLoading: false });
    }
  }, [criteria]);

  useEffect(() => {
    const timer = setTimeout(generatePreview, 300);
    return () => clearTimeout(timer);
  }, [generatePreview]);

  const hasCriteria = () => {
    return !!(
      criteria.documentTypes?.length ||
      criteria.tags?.length ||
      criteria.authors?.length ||
      criteria.status?.length ||
      criteria.dateRange ||
      criteria.sizeRange ||
      criteria.contentKeywords?.length
    );
  };

  const handleDocumentTypesChange = (types: DocumentType[]) => {
    setCriteria(prev => ({ ...prev, documentTypes: types.length ? types : undefined }));
  };

  const handleTagsChange = (tags: string[]) => {
    setCriteria(prev => ({ ...prev, tags: tags.length ? tags : undefined }));
  };

  const handleAuthorsChange = (authors: string[]) => {
    setCriteria(prev => ({ ...prev, authors: authors.length ? authors : undefined }));
  };

  const handleStatusChange = (statuses: DocumentStatus[]) => {
    setCriteria(prev => ({ ...prev, status: statuses.length ? statuses : undefined }));
  };

  const handleDateRangeChange = (start: string, end: string) => {
    if (start && end) {
      setCriteria(prev => ({ ...prev, dateRange: { start, end } }));
    } else {
      setCriteria(prev => ({ ...prev, dateRange: undefined }));
    }
  };

  const handleSizeRangeChange = (min: number, max: number) => {
    if (min >= 0 && max > 0 && max > min) {
      setCriteria(prev => ({ ...prev, sizeRange: { min, max } }));
    } else {
      setCriteria(prev => ({ ...prev, sizeRange: undefined }));
    }
  };

  const handleKeywordsChange = (keywords: string) => {
    const keywordArray = keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    setCriteria(prev => ({
      ...prev,
      contentKeywords: keywordArray.length ? keywordArray : undefined
    }));
  };

  const handleCreate = async () => {
    if (!name.trim() || !hasCriteria()) return;

    setIsCreating(true);
    try {
      const folderRequest: FolderCreationRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        parentId,
        type: 'smart',
        smartCriteria: criteria,
        autoRefresh,
        permissions: {
          canView: true,
          canEdit: true,
          canDelete: true,
          canCreateChild: false, // Smart folders typically don't allow children
          canManagePermissions: true,
          inheritPermissions: true
        }
      };

      // Create the smart folder
      const newFolder = {
        id: `smart_${Date.now()}`,
        name: folderRequest.name,
        description: folderRequest.description,
        path: parentId ? `/parent/${folderRequest.name}` : `/${folderRequest.name}`,
        type: folderRequest.type,
        parentId: folderRequest.parentId,
        childFolders: [],
        documentCount: preview.expectedCount,
        totalSize: 0,
        dateCreated: new Date().toISOString(),
        dateModified: new Date().toISOString(),
        smartCriteria: folderRequest.smartCriteria,
        autoRefresh: folderRequest.autoRefresh,
        lastRefreshed: new Date().toISOString(),
        documentRefs: [],
        permissions: folderRequest.permissions!,
        statistics: {
          documentCount: preview.expectedCount,
          totalSize: 0,
          averageFileSize: 0,
          lastActivity: new Date().toISOString(),
          fileTypeDistribution: {}
        }
      };

      dispatch(createFolder(newFolder));

      if (onFolderCreated) {
        onFolderCreated(newFolder.id);
      }

      onClose();
    } catch (error) {
      console.error('Failed to create smart folder:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const renderCriteriaTab = () => (
    <div className="space-y-6">
      {/* Document Types */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Document Types</Label>
        <div className="grid grid-cols-3 gap-2">
          {DOCUMENT_TYPES.map(type => (
            <label key={type} className="flex items-center space-x-2">
              <Checkbox
                checked={criteria.documentTypes?.includes(type) || false}
                onChange={(checked) => {
                  const current = criteria.documentTypes || [];
                  const updated = checked
                    ? [...current, type]
                    : current.filter(t => t !== type);
                  handleDocumentTypesChange(updated);
                }}
              />
              <span className="text-sm capitalize">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Tags</Label>
        <div className="space-y-2">
          {availableOptions.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {availableOptions.tags.map(tag => (
                <Badge
                  key={tag}
                  variant={criteria.tags?.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    const current = criteria.tags || [];
                    const updated = current.includes(tag)
                      ? current.filter(t => t !== tag)
                      : [...current, tag];
                    handleTagsChange(updated);
                  }}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No tags available</p>
          )}
        </div>
      </div>

      {/* Authors */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Authors</Label>
        <Select
          multiple
          value={criteria.authors || []}
          onChange={handleAuthorsChange}
          options={availableOptions.authors.map(author => ({ value: author, label: author }))}
          placeholder="Select authors..."
        />
      </div>

      {/* Status */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Document Status</Label>
        <div className="grid grid-cols-2 gap-2">
          {DOCUMENT_STATUSES.map(status => (
            <label key={status} className="flex items-center space-x-2">
              <Checkbox
                checked={criteria.status?.includes(status) || false}
                onChange={(checked) => {
                  const current = criteria.status || [];
                  const updated = checked
                    ? [...current, status]
                    : current.filter(s => s !== status);
                  handleStatusChange(updated);
                }}
              />
              <span className="text-sm capitalize">{status}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAdvancedTab = () => (
    <div className="space-y-6">
      {/* Date Range */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Date Range</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-500">From</Label>
            <DatePicker
              value={criteria.dateRange?.start || ''}
              onChange={(date) => handleDateRangeChange(date, criteria.dateRange?.end || '')}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500">To</Label>
            <DatePicker
              value={criteria.dateRange?.end || ''}
              onChange={(date) => handleDateRangeChange(criteria.dateRange?.start || '', date)}
            />
          </div>
        </div>
      </div>

      {/* Size Range */}
      <div>
        <Label className="text-sm font-medium mb-2 block">File Size Range (MB)</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-500">Min Size</Label>
            <Input
              type="number"
              min="0"
              value={criteria.sizeRange?.min ? (criteria.sizeRange.min / (1024 * 1024)).toFixed(2) : ''}
              onChange={(e) => {
                const minMB = parseFloat(e.target.value) || 0;
                const maxMB = criteria.sizeRange?.max ? criteria.sizeRange.max / (1024 * 1024) : 100;
                handleSizeRangeChange(minMB * 1024 * 1024, maxMB * 1024 * 1024);
              }}
              placeholder="0"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Max Size</Label>
            <Input
              type="number"
              min="0"
              value={criteria.sizeRange?.max ? (criteria.sizeRange.max / (1024 * 1024)).toFixed(2) : ''}
              onChange={(e) => {
                const maxMB = parseFloat(e.target.value) || 100;
                const minMB = criteria.sizeRange?.min ? criteria.sizeRange.min / (1024 * 1024) : 0;
                handleSizeRangeChange(minMB * 1024 * 1024, maxMB * 1024 * 1024);
              }}
              placeholder="100"
            />
          </div>
        </div>
      </div>

      {/* Content Keywords */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Content Keywords</Label>
        <Input
          value={criteria.contentKeywords?.join(', ') || ''}
          onChange={(e) => handleKeywordsChange(e.target.value)}
          placeholder="Enter keywords separated by commas..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Documents containing these keywords in their content will be included
        </p>
      </div>
    </div>
  );

  const renderPreviewTab = () => (
    <div className="space-y-4">
      {preview.isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Generating preview...</p>
        </div>
      ) : hasCriteria() ? (
        <div>
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium text-blue-900">Preview Results</h4>
            <p className="text-blue-700 text-sm">
              This smart folder will contain approximately <strong>{preview.expectedCount}</strong> documents
            </p>
          </div>

          {preview.sampleDocuments.length > 0 && (
            <div>
              <h5 className="font-medium mb-2">Sample Documents:</h5>
              <ul className="space-y-1">
                {preview.sampleDocuments.map((doc, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>Add criteria to see preview</p>
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Create Smart Folder</h2>
          <p className="text-sm text-gray-600">
            Smart folders automatically organize documents based on criteria
          </p>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Folder Name*</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Smart Folder"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this smart folder contains..."
              />
            </div>

            <label className="flex items-center space-x-2">
              <Checkbox
                checked={autoRefresh}
                onChange={setAutoRefresh}
              />
              <span className="text-sm">Auto-refresh folder contents</span>
            </label>
          </div>

          {/* Criteria Tabs */}
          <Card className="p-4">
            <Tabs defaultValue="criteria">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="criteria">Criteria</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="criteria" className="mt-4">
                {renderCriteriaTab()}
              </TabsContent>

              <TabsContent value="advanced" className="mt-4">
                {renderAdvancedTab()}
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                {renderPreviewTab()}
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || !hasCriteria() || isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Smart Folder'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SmartFolderBuilder;
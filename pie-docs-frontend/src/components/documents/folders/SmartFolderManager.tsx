import React, { useState, useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import {
  SmartFolder,
  FolderRule,
  LogicOperator,
  SmartFolderTemplate,
  FolderHierarchy,
  RuleOperator
} from '../../../types/domain/SmartFolder';
import {
  createSmartFolder,
  updateSmartFolder,
  deleteSmartFolder,
  evaluateSmartFolder,
  getSmartFolders,
  getSmartFolderTemplates,
  getSmartFolderAnalytics
} from '../../../store/slices/smartFolderSlice';
import SmartFolderList from './SmartFolderList';
import RuleBuilder from './RuleBuilder';
import FolderAnalytics from './FolderAnalytics';
import TemplateGallery from './TemplateGallery';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Alert, AlertDescription } from '../../ui/alert';
import {
  Plus,
  Settings,
  BarChart3,
  Template,
  Folder,
  FolderOpen,
  Zap,
  Filter,
  Play,
  Pause,
  RefreshCw,
  Copy,
  Trash2,
  Edit,
  Eye
} from 'lucide-react';

interface SmartFolderManagerProps {
  parentFolderId?: string;
  onFolderSelect?: (folder: SmartFolder) => void;
  onDocumentCountChange?: (folderId: string, count: number) => void;
}

const SmartFolderManager: React.FC<SmartFolderManagerProps> = ({
  parentFolderId,
  onFolderSelect,
  onDocumentCountChange
}) => {
  const dispatch = useAppDispatch();
  const {
    folders,
    templates,
    currentFolder,
    analytics,
    loading,
    error
  } = useAppSelector(state => state.smartFolder);

  const [selectedFolder, setSelectedFolder] = useState<SmartFolder | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeTab, setActiveTab] = useState('folders');
  const [searchQuery, setSearchQuery] = useState('');

  const [newFolder, setNewFolder] = useState<Partial<SmartFolder>>({
    name: '',
    description: '',
    rules: [],
    logic: 'AND',
    isActive: true,
    isTemplate: false,
    settings: {
      autoRefresh: true,
      refreshInterval: 15,
      maxDocuments: 1000,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      includeSubfolders: false,
      enableNotifications: true,
      cacheResults: true,
      cacheDuration: 60
    }
  });

  useEffect(() => {
    dispatch(getSmartFolders());
    dispatch(getSmartFolderTemplates());
  }, [dispatch]);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolder.name) return;

    try {
      const folderData: Omit<SmartFolder, 'id' | 'createdAt' | 'updatedAt' | 'lastEvaluated' | 'documentCount' | 'performance'> = {
        name: newFolder.name,
        description: newFolder.description || '',
        icon: newFolder.icon || 'folder',
        color: newFolder.color || '#3b82f6',
        rules: newFolder.rules || [],
        logic: newFolder.logic || 'AND',
        isActive: newFolder.isActive ?? true,
        isTemplate: false,
        parentId: parentFolderId,
        order: folders.length,
        createdBy: 'current-user',
        settings: newFolder.settings!
      };

      await dispatch(createSmartFolder(folderData)).unwrap();
      setIsCreating(false);
      setNewFolder({
        name: '',
        description: '',
        rules: [],
        logic: 'AND',
        isActive: true,
        isTemplate: false,
        settings: {
          autoRefresh: true,
          refreshInterval: 15,
          maxDocuments: 1000,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
          includeSubfolders: false,
          enableNotifications: true,
          cacheResults: true,
          cacheDuration: 60
        }
      });
    } catch (error) {
      console.error('Failed to create smart folder:', error);
    }
  }, [newFolder, parentFolderId, folders.length, dispatch]);

  const handleUpdateFolder = useCallback(async (folder: SmartFolder) => {
    try {
      await dispatch(updateSmartFolder(folder)).unwrap();
      setIsEditing(false);
      setSelectedFolder(null);
    } catch (error) {
      console.error('Failed to update smart folder:', error);
    }
  }, [dispatch]);

  const handleDeleteFolder = useCallback(async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this smart folder?')) return;

    try {
      await dispatch(deleteSmartFolder(folderId)).unwrap();
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(null);
      }
    } catch (error) {
      console.error('Failed to delete smart folder:', error);
    }
  }, [dispatch, selectedFolder]);

  const handleEvaluateFolder = useCallback(async (folderId: string) => {
    try {
      const result = await dispatch(evaluateSmartFolder(folderId)).unwrap();
      onDocumentCountChange?.(folderId, result.totalCount);
    } catch (error) {
      console.error('Failed to evaluate smart folder:', error);
    }
  }, [dispatch, onDocumentCountChange]);

  const handleToggleFolderActive = useCallback(async (folder: SmartFolder) => {
    const updatedFolder = { ...folder, isActive: !folder.isActive };
    await handleUpdateFolder(updatedFolder);
  }, [handleUpdateFolder]);

  const handleDuplicateFolder = useCallback(async (folder: SmartFolder) => {
    const duplicatedFolder = {
      ...folder,
      name: `${folder.name} (Copy)`,
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      lastEvaluated: undefined,
      documentCount: 0,
      performance: undefined
    };

    try {
      await dispatch(createSmartFolder(duplicatedFolder as any)).unwrap();
    } catch (error) {
      console.error('Failed to duplicate smart folder:', error);
    }
  }, [dispatch]);

  const handleCreateFromTemplate = useCallback(async (template: SmartFolderTemplate) => {
    const folderFromTemplate: Partial<SmartFolder> = {
      name: template.name,
      description: template.description,
      icon: template.icon,
      color: template.color,
      rules: template.rules,
      logic: template.logic,
      isActive: true,
      isTemplate: false,
      parentId: parentFolderId,
      order: folders.length,
      settings: {
        autoRefresh: true,
        refreshInterval: 15,
        maxDocuments: 1000,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        includeSubfolders: false,
        enableNotifications: true,
        cacheResults: true,
        cacheDuration: 60
      }
    };

    setNewFolder(folderFromTemplate);
    setIsCreating(true);
    setShowTemplates(false);
  }, [parentFolderId, folders.length]);

  const handleRuleUpdate = useCallback((folderId: string, rules: FolderRule[], logic: LogicOperator) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      const updatedFolder = { ...folder, rules, logic };
      handleUpdateFolder(updatedFolder);
    }
  }, [folders, handleUpdateFolder]);

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folder.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeFolders = filteredFolders.filter(folder => folder.isActive);
  const inactiveFolders = filteredFolders.filter(folder => !folder.isActive);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Zap className="h-6 w-6 text-blue-600" />
              Smart Folders
            </h1>
            <p className="text-sm text-gray-500">
              Automatically organize documents with dynamic rules
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />

            <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Template className="h-4 w-4 mr-2" />
                  Templates
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Smart Folder Templates</DialogTitle>
                </DialogHeader>
                <TemplateGallery
                  templates={templates}
                  onSelectTemplate={handleCreateFromTemplate}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Smart Folder
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Smart Folder</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Folder Name
                    </label>
                    <Input
                      value={newFolder.name}
                      onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
                      placeholder="Enter folder name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <Input
                      value={newFolder.description}
                      onChange={(e) => setNewFolder({ ...newFolder, description: e.target.value })}
                      placeholder="Describe the folder's purpose"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={() => setShowRuleBuilder(true)}
                      variant="outline"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Add Rules ({newFolder.rules?.length || 0})
                    </Button>
                    <span className="text-sm text-gray-500">
                      Logic: {newFolder.logic}
                    </span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreating(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateFolder}
                      disabled={!newFolder.name}
                    >
                      Create Folder
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Folder List */}
        <div className="w-80 border-r bg-gray-50 p-4 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="folders">Folders</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="folders" className="mt-4">
              <SmartFolderList
                folders={activeFolders}
                selectedFolder={selectedFolder}
                onFolderSelect={(folder) => {
                  setSelectedFolder(folder);
                  onFolderSelect?.(folder);
                }}
                onFolderToggle={handleToggleFolderActive}
                onFolderEvaluate={handleEvaluateFolder}
                onFolderDuplicate={handleDuplicateFolder}
                onFolderEdit={(folder) => {
                  setSelectedFolder(folder);
                  setIsEditing(true);
                }}
                onFolderDelete={handleDeleteFolder}
              />

              {inactiveFolders.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Inactive Folders</h3>
                  <SmartFolderList
                    folders={inactiveFolders}
                    selectedFolder={selectedFolder}
                    onFolderSelect={setSelectedFolder}
                    onFolderToggle={handleToggleFolderActive}
                    onFolderEvaluate={handleEvaluateFolder}
                    onFolderDuplicate={handleDuplicateFolder}
                    onFolderEdit={(folder) => {
                      setSelectedFolder(folder);
                      setIsEditing(true);
                    }}
                    onFolderDelete={handleDeleteFolder}
                    inactive
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="mt-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Folders:</span>
                        <span className="font-semibold">{folders.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Active:</span>
                        <span className="font-semibold text-green-600">{activeFolders.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Inactive:</span>
                        <span className="font-semibold text-gray-500">{inactiveFolders.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Documents:</span>
                        <span className="font-semibold">
                          {folders.reduce((sum, folder) => sum + folder.documentCount, 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedFolder && analytics[selectedFolder.id] && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">{selectedFolder.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FolderAnalytics
                        analytics={analytics[selectedFolder.id]}
                        compact
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Center - Folder Details */}
        <div className="flex-1 p-6">
          {selectedFolder ? (
            <div className="space-y-6">
              {/* Folder Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: selectedFolder.color }}
                  >
                    <Folder className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedFolder.name}</h2>
                    {selectedFolder.description && (
                      <p className="text-sm text-gray-500">{selectedFolder.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedFolder.isActive ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      {selectedFolder.documentCount} documents
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEvaluateFolder(selectedFolder.id)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>

              {/* Folder Content */}
              <Tabs defaultValue="rules">
                <TabsList>
                  <TabsTrigger value="rules">Rules</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="rules" className="mt-4">
                  <RuleBuilder
                    folderId={selectedFolder.id}
                    rules={selectedFolder.rules}
                    logic={selectedFolder.logic}
                    onRuleUpdate={handleRuleUpdate}
                    readonly={!isEditing}
                  />
                </TabsContent>

                <TabsContent value="documents" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Matched Documents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-500">
                        {selectedFolder.documentCount} documents match the current rules
                      </p>
                      {/* Document list would be implemented here */}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="analytics" className="mt-4">
                  {analytics[selectedFolder.id] ? (
                    <FolderAnalytics analytics={analytics[selectedFolder.id]} />
                  ) : (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No analytics data available</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => dispatch(getSmartFolderAnalytics(selectedFolder.id))}
                          >
                            Load Analytics
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="settings" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Folder Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Auto Refresh
                            </label>
                            <select
                              value={selectedFolder.settings.autoRefresh ? 'true' : 'false'}
                              className="w-full rounded-md border border-gray-300 px-3 py-2"
                              disabled={!isEditing}
                            >
                              <option value="true">Enabled</option>
                              <option value="false">Disabled</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Refresh Interval (minutes)
                            </label>
                            <Input
                              type="number"
                              value={selectedFolder.settings.refreshInterval}
                              disabled={!isEditing}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Max Documents
                            </label>
                            <Input
                              type="number"
                              value={selectedFolder.settings.maxDocuments}
                              disabled={!isEditing}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Sort By
                            </label>
                            <select
                              value={selectedFolder.settings.sortBy}
                              className="w-full rounded-md border border-gray-300 px-3 py-2"
                              disabled={!isEditing}
                            >
                              <option value="name">Name</option>
                              <option value="createdAt">Created Date</option>
                              <option value="updatedAt">Modified Date</option>
                              <option value="size">Size</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No folder selected
                </h3>
                <p className="text-sm text-gray-500">
                  Select a smart folder from the list to view its details and configure rules
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rule Builder Modal */}
      {showRuleBuilder && (
        <Dialog open={showRuleBuilder} onOpenChange={setShowRuleBuilder}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Rule Builder</DialogTitle>
            </DialogHeader>
            <RuleBuilder
              folderId={newFolder.name || 'new'}
              rules={newFolder.rules || []}
              logic={newFolder.logic || 'AND'}
              onRuleUpdate={(_, rules, logic) => {
                setNewFolder({ ...newFolder, rules, logic });
                setShowRuleBuilder(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default SmartFolderManager;
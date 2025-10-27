import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardBuilder from '@/components/dashboard-builder/DashboardBuilder';
import DashboardTemplateGrid from '@/components/dashboard-builder/DashboardTemplateGrid';
import {
  DashboardLayout,
  DashboardTemplate
} from '@/types/domain/DashboardBuilder';

type BuilderMode = 'templates' | 'builder' | 'import';

const DashboardBuilderPage: React.FC = () => {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { dashboardId } = useParams();

  const [mode, setMode] = useState<BuilderMode>('templates');
  const [currentDashboard, setCurrentDashboard] = useState<DashboardLayout | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing dashboard if editing
  useEffect(() => {
    if (dashboardId && dashboardId !== 'new') {
      loadDashboard(dashboardId);
    }
  }, [dashboardId]);

  const loadDashboard = async (id: string) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock dashboard for demonstration
      const mockDashboard: DashboardLayout = {
        id,
        name: 'My Custom Dashboard',
        description: 'Custom dashboard created with the builder',
        isTemplate: false,
        isPublic: false,
        owner: 'current-user',
        widgets: [],
        gridProps: {
          cols: 12,
          rowHeight: 60,
          margin: [16, 16],
          containerPadding: [16, 16]
        },
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };

      setCurrentDashboard(mockDashboard);
      setMode('builder');
    } catch (err) {
      setError('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (template: DashboardTemplate) => {
    setSelectedTemplate(template.id);

    // Create new dashboard from template
    const newDashboard: DashboardLayout = {
      id: `dashboard-${Date.now()}`,
      name: `${template.name} - Copy`,
      description: template.description,
      isTemplate: false,
      isPublic: false,
      owner: 'current-user',
      widgets: template.layout.widgets.map(widget => ({
        ...widget,
        id: `${widget.id}-${Date.now()}`
      })),
      gridProps: template.layout.gridProps,
      tags: template.layout.tags,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    setCurrentDashboard(newDashboard);
    setMode('builder');
  };

  const handleCreateBlank = () => {
    const blankDashboard: DashboardLayout = {
      id: `dashboard-${Date.now()}`,
      name: 'Untitled Dashboard',
      description: '',
      isTemplate: false,
      isPublic: false,
      owner: 'current-user',
      widgets: [],
      gridProps: {
        cols: 12,
        rowHeight: 60,
        margin: [16, 16],
        containerPadding: [16, 16]
      },
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    setCurrentDashboard(blankDashboard);
    setMode('builder');
  };

  const handleSave = async (dashboard: DashboardLayout) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Saving dashboard:', dashboard);

      // Navigate to saved dashboard
      navigate(`/dashboard-builder/${dashboard.id}`);
    } catch (err) {
      throw new Error('Failed to save dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = (dashboard: DashboardLayout) => {
    // TODO: Implement preview functionality
    console.log('Previewing dashboard:', dashboard);
  };

  const handleImport = () => {
    setMode('import');
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedDashboard = JSON.parse(content) as DashboardLayout;

        // Validate and sanitize imported dashboard
        const dashboard: DashboardLayout = {
          ...importedDashboard,
          id: `dashboard-${Date.now()}`,
          owner: 'current-user',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        setCurrentDashboard(dashboard);
        setMode('builder');
      } catch (err) {
        setError('Invalid dashboard file');
      }
    };
    reader.readAsText(file);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <svg className="w-8 h-8 animate-spin mx-auto mb-2 text-primary-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Error Loading Dashboard
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {error}
        </p>
        <button
          onClick={() => {
            setError(null);
            setMode('templates');
          }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Start Over
        </button>
      </div>
    );
  }

  // Render based on current mode
  switch (mode) {
    case 'builder':
      return (
        <DashboardBuilder
          initialDashboard={currentDashboard || undefined}
          onSave={handleSave}
          onPreview={handlePreview}
          onClose={() => navigate('/dashboard')}
        />
      );

    case 'import':
      return (
        <div className="max-w-2xl mx-auto py-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Import Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Upload a JSON file to import an existing dashboard configuration
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Upload Dashboard File
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Drag and drop your JSON file here, or click to browse
              </p>
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Choose File
              </label>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setMode('templates')}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ← Back to Templates
              </button>
            </div>
          </div>
        </div>
      );

    default: // templates mode
      return (
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Create Your Dashboard
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Build powerful, customizable dashboards with our intuitive drag-and-drop builder.
              Start with a template or create your own from scratch.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleCreateBlank}
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Start from Blank
            </button>

            <button
              onClick={handleImport}
              className="inline-flex items-center px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import Dashboard
            </button>
          </div>

          {/* Templates Grid */}
          <DashboardTemplateGrid
            onTemplateSelect={handleTemplateSelect}
            selectedTemplate={selectedTemplate}
            showCategories={true}
          />

          {/* Features Section */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 mt-16">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
              Dashboard Builder Features
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Drag & Drop Interface
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Easily add, move, and resize widgets with our intuitive drag-and-drop interface
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Rich Widget Library
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Choose from a comprehensive library of pre-built widgets for analytics, monitoring, and more
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Full Customization
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Configure every aspect of your widgets with detailed settings and real-time preview
                </p>
              </div>
            </div>
          </div>
        </div>
      );
  }
};

export default DashboardBuilderPage;
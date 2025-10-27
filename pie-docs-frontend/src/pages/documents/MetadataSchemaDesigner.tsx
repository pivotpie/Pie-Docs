import React, { useState, useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import {
  MetadataSchema,
  MetadataField,
  FieldType,
  SchemaDesignerState,
  FieldGroup
} from '../../types/domain/MetadataSchema';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  createMetadataSchema,
  updateMetadataSchema,
  getMetadataSchemas,
  validateSchema,
  getSchemaAnalytics
} from '../../store/slices/metadataSchemaSlice';
import FieldPalette from '../../components/documents/metadata/FieldPalette';
import SchemaCanvas from '../../components/documents/metadata/SchemaCanvas';
import FieldConfigurationPanel from '../../components/documents/metadata/FieldConfigurationPanel';
import SchemaToolbar from '../../components/documents/metadata/SchemaToolbar';
import SchemaPreview from '../../components/documents/metadata/SchemaPreview';
import ValidationPanel from '../../components/documents/metadata/ValidationPanel';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Save,
  Eye,
  Settings,
  BarChart3,
  Upload,
  Download,
  Undo,
  Redo,
  Copy,
  Trash2
} from 'lucide-react';

interface MetadataSchemaDesignerProps {
  schemaId?: string;
  onSave?: (schema: MetadataSchema) => void;
  onCancel?: () => void;
}

const MetadataSchemaDesigner: React.FC<MetadataSchemaDesignerProps> = ({
  schemaId,
  onSave,
  onCancel
}) => {
  const dispatch = useAppDispatch();
  const {
    currentSchema,
    schemas,
    loading,
    error,
    analytics
  } = useAppSelector(state => state.metadataSchema);

  const [designerState, setDesignerState] = useState<SchemaDesignerState>({
    currentSchema: null,
    selectedField: null,
    draggedField: null,
    isDirty: false,
    isValidating: false,
    validationErrors: [],
    previewMode: false
  });

  const [activeTab, setActiveTab] = useState('design');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (schemaId) {
      // Load existing schema
      dispatch(getMetadataSchemas()).then(() => {
        const schema = schemas.find(s => s.id === schemaId);
        if (schema) {
          setDesignerState(prev => ({
            ...prev,
            currentSchema: schema
          }));
        }
      });
    } else {
      // Create new schema
      const newSchema: MetadataSchema = {
        id: `new-schema-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        name: 'New Schema',
        description: '',
        version: '1.0.0',
        documentTypes: [],
        fields: [],
        groups: [
          {
            id: 'default',
            name: 'default',
            label: 'General Information',
            description: 'Basic document metadata',
            collapsible: false,
            order: 0
          }
        ],
        relationships: [],
        template: false,
        isActive: true,
        createdBy: 'current-user',
        createdAt: new Date(),
        updatedAt: new Date(),
        usage: {
          documentsCount: 0,
          fieldsUsage: {},
          lastUsed: new Date(),
          performanceMetrics: {
            avgFillTime: 0,
            completionRate: 0,
            errorRate: 0
          }
        }
      };

      setDesignerState(prev => ({
        ...prev,
        currentSchema: newSchema
      }));
    }
  }, [schemaId, dispatch, schemas]);

  const handleFieldAdd = useCallback((fieldType: FieldType, position?: { x: number; y: number }) => {
    if (!designerState.currentSchema) return;

    const newField: MetadataField = {
      id: `field_${Date.now()}`,
      name: `${fieldType}_${designerState.currentSchema.fields.length + 1}`,
      label: `${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} Field`,
      type: fieldType,
      required: false,
      validation: [],
      order: designerState.currentSchema.fields.length,
      groupId: 'default',
      isCustom: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedSchema = {
      ...designerState.currentSchema,
      fields: [...designerState.currentSchema.fields, newField],
      updatedAt: new Date()
    };

    setDesignerState(prev => ({
      ...prev,
      currentSchema: updatedSchema,
      selectedField: newField,
      isDirty: true
    }));
  }, [designerState.currentSchema]);

  const handleFieldUpdate = useCallback((fieldId: string, updates: Partial<MetadataField>) => {
    if (!designerState.currentSchema) return;

    const updatedFields = designerState.currentSchema.fields.map(field =>
      field.id === fieldId
        ? { ...field, ...updates, updatedAt: new Date() }
        : field
    );

    const updatedSchema = {
      ...designerState.currentSchema,
      fields: updatedFields,
      updatedAt: new Date()
    };

    setDesignerState(prev => ({
      ...prev,
      currentSchema: updatedSchema,
      isDirty: true
    }));
  }, [designerState.currentSchema]);

  const handleFieldDelete = useCallback((fieldId: string) => {
    if (!designerState.currentSchema) return;

    const updatedFields = designerState.currentSchema.fields.filter(field => field.id !== fieldId);

    const updatedSchema = {
      ...designerState.currentSchema,
      fields: updatedFields,
      updatedAt: new Date()
    };

    setDesignerState(prev => ({
      ...prev,
      currentSchema: updatedSchema,
      selectedField: prev.selectedField?.id === fieldId ? null : prev.selectedField,
      isDirty: true
    }));
  }, [designerState.currentSchema]);

  const handleFieldSelect = useCallback((field: MetadataField | null) => {
    setDesignerState(prev => ({
      ...prev,
      selectedField: field
    }));
  }, []);

  const handleSchemaUpdate = useCallback((updates: Partial<MetadataSchema>) => {
    if (!designerState.currentSchema) return;

    const updatedSchema = {
      ...designerState.currentSchema,
      ...updates,
      updatedAt: new Date()
    };

    setDesignerState(prev => ({
      ...prev,
      currentSchema: updatedSchema,
      isDirty: true
    }));
  }, [designerState.currentSchema]);

  const handleValidateSchema = useCallback(async () => {
    if (!designerState.currentSchema) return;

    setDesignerState(prev => ({ ...prev, isValidating: true }));

    try {
      const result = await dispatch(validateSchema(designerState.currentSchema)).unwrap();
      setDesignerState(prev => ({
        ...prev,
        validationErrors: result.errors || [],
        isValidating: false
      }));
    } catch (error) {
      setDesignerState(prev => ({
        ...prev,
        validationErrors: ['Validation failed'],
        isValidating: false
      }));
    }
  }, [designerState.currentSchema, dispatch]);

  const handleSaveSchema = useCallback(async () => {
    if (!designerState.currentSchema) return;

    try {
      const result = schemaId
        ? await dispatch(updateMetadataSchema(designerState.currentSchema)).unwrap()
        : await dispatch(createMetadataSchema(designerState.currentSchema)).unwrap();

      setDesignerState(prev => ({
        ...prev,
        currentSchema: result,
        isDirty: false
      }));

      onSave?.(result);
    } catch (error) {
      console.error('Failed to save schema:', error);
    }
  }, [designerState.currentSchema, schemaId, dispatch, onSave]);

  const handlePreviewToggle = useCallback(() => {
    setShowPreview(!showPreview);
    setDesignerState(prev => ({
      ...prev,
      previewMode: !prev.previewMode
    }));
  }, [showPreview]);

  const loadAnalytics = useCallback(async () => {
    if (schemaId) {
      dispatch(getSchemaAnalytics(schemaId));
    }
  }, [schemaId, dispatch]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [activeTab, loadAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading schema designer: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {designerState.currentSchema?.name || 'Schema Designer'}
              </h1>
              <p className="text-sm text-gray-500">
                Design custom metadata schemas for your documents
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleValidateSchema}
                disabled={designerState.isValidating}
              >
                <Settings className="h-4 w-4 mr-2" />
                Validate
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviewToggle}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Edit' : 'Preview'}
              </Button>

              <Button
                onClick={handleSaveSchema}
                disabled={!designerState.isDirty}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Schema
              </Button>

              {onCancel && (
                <Button
                  variant="outline"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {designerState.validationErrors.length > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {designerState.validationErrors.map((error, index) => (
                    <li key={`error-${index}-${error.slice(0, 20)}`}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {!showPreview ? (
            <>
              {/* Left Sidebar - Field Palette */}
              <div className="w-64 border-r bg-gray-50 p-4">
                <FieldPalette onFieldDrag={handleFieldAdd} />
              </div>

              {/* Center - Schema Canvas */}
              <div className="flex-1 p-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="design">Design</TabsTrigger>
                    <TabsTrigger value="validation">Validation</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  </TabsList>

                  <TabsContent value="design" className="h-full">
                    <SchemaCanvas
                      schema={designerState.currentSchema}
                      selectedField={designerState.selectedField}
                      onFieldAdd={handleFieldAdd}
                      onFieldUpdate={handleFieldUpdate}
                      onFieldDelete={handleFieldDelete}
                      onFieldSelect={handleFieldSelect}
                      onSchemaUpdate={handleSchemaUpdate}
                    />
                  </TabsContent>

                  <TabsContent value="validation">
                    <ValidationPanel
                      schema={designerState.currentSchema}
                      validationErrors={designerState.validationErrors}
                      onValidate={handleValidateSchema}
                    />
                  </TabsContent>

                  <TabsContent value="analytics">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Usage Statistics</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Documents:</span>
                              <span className="font-semibold">
                                {designerState.currentSchema?.usage.documentsCount || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Completion Rate:</span>
                              <span className="font-semibold">
                                {Math.round((designerState.currentSchema?.usage.performanceMetrics.completionRate || 0) * 100)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Error Rate:</span>
                              <span className="font-semibold text-red-600">
                                {Math.round((designerState.currentSchema?.usage.performanceMetrics.errorRate || 0) * 100)}%
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {analytics && (
                        <>
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-sm font-medium">Field Usage</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {analytics.metrics.mostUsedFields.slice(0, 5).map((field) => (
                                  <div key={field.fieldId} className="flex justify-between">
                                    <span className="text-sm text-gray-600 truncate">
                                      {field.fieldName}
                                    </span>
                                    <span className="font-semibold text-green-600">
                                      {field.usageCount}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="text-sm font-medium">Optimization</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {analytics.recommendations.slice(0, 3).map((rec, index) => (
                                  <div key={`rec-${index}-${rec.field}`} className="text-sm">
                                    <div className="font-medium text-gray-900">{rec.field}</div>
                                    <div className="text-gray-600">{rec.reason}</div>
                                    <div className={`text-xs mt-1 ${
                                      rec.impact === 'high' ? 'text-red-600' :
                                      rec.impact === 'medium' ? 'text-yellow-600' :
                                      'text-green-600'
                                    }`}>
                                      {rec.impact.toUpperCase()} impact
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right Sidebar - Field Configuration */}
              <div className="w-80 border-l bg-gray-50 p-4">
                <FieldConfigurationPanel
                  field={designerState.selectedField}
                  schema={designerState.currentSchema}
                  onFieldUpdate={handleFieldUpdate}
                  onFieldDelete={handleFieldDelete}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 p-4">
              <SchemaPreview
                schema={designerState.currentSchema}
                onClose={() => setShowPreview(false)}
              />
            </div>
          )}
        </div>

        {/* Toolbar */}
        <SchemaToolbar
          schema={designerState.currentSchema}
          isDirty={designerState.isDirty}
          onSave={handleSaveSchema}
          onValidate={handleValidateSchema}
          onExport={() => {}}
          onImport={() => {}}
        />
      </div>
    </DndProvider>
  );
};

export default MetadataSchemaDesigner;
export interface MetadataField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  description?: string;
  required: boolean;
  validation: ValidationRule[];
  defaultValue?: any;
  options?: FieldOption[];
  order: number;
  groupId?: string;
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetadataSchema {
  id: string;
  name: string;
  description?: string;
  version: string;
  documentTypes: string[];
  fields: MetadataField[];
  groups: FieldGroup[];
  relationships: SchemaRelationship[];
  template?: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  usage: SchemaUsage;
}

export interface FieldGroup {
  id: string;
  name: string;
  label: string;
  description?: string;
  collapsible: boolean;
  collapsed?: boolean;
  order: number;
}

export interface FieldOption {
  value: string;
  label: string;
  description?: string;
  color?: string;
  icon?: string;
  order: number;
}

export interface ValidationRule {
  id: string;
  type: ValidationType;
  value?: any;
  message: string;
  customRule?: string;
}

export interface SchemaRelationship {
  id: string;
  name: string;
  type: RelationshipType;
  sourceField: string;
  targetSchema?: string;
  targetField?: string;
  required: boolean;
  cascade: boolean;
}

export interface SchemaUsage {
  documentsCount: number;
  fieldsUsage: Record<string, number>;
  lastUsed: Date;
  performanceMetrics: {
    avgFillTime: number;
    completionRate: number;
    errorRate: number;
  };
}

export interface SchemaVersion {
  version: string;
  changes: SchemaChange[];
  migrationScript?: string;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

export interface SchemaChange {
  type: 'add' | 'remove' | 'modify' | 'rename';
  field: string;
  oldValue?: any;
  newValue?: any;
  description: string;
}

export interface MetadataTemplate {
  id: string;
  name: string;
  description?: string;
  schemaId: string;
  prefilledValues: Record<string, any>;
  documentType: string;
  category: string;
  usage: number;
  createdBy: string;
  createdAt: Date;
  isPublic: boolean;
}

export interface BulkMetadataOperation {
  id: string;
  type: 'import' | 'export' | 'update';
  schemaId: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalRecords: number;
  processedRecords: number;
  errors: BulkOperationError[];
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface BulkOperationError {
  row: number;
  field: string;
  value: any;
  error: string;
}

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'decimal'
  | 'date'
  | 'datetime'
  | 'time'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'image'
  | 'url'
  | 'email'
  | 'phone'
  | 'color'
  | 'json'
  | 'reference';

export type ValidationType =
  | 'required'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'min'
  | 'max'
  | 'email'
  | 'url'
  | 'phone'
  | 'custom';

export type RelationshipType =
  | 'oneToOne'
  | 'oneToMany'
  | 'manyToOne'
  | 'manyToMany';

export interface SchemaDesignerState {
  currentSchema: MetadataSchema | null;
  selectedField: MetadataField | null;
  draggedField: FieldType | null;
  isDirty: boolean;
  isValidating: boolean;
  validationErrors: string[];
  previewMode: boolean;
}

export interface SchemaAnalytics {
  schemaId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalDocuments: number;
    averageFieldsPerDocument: number;
    mostUsedFields: Array<{
      fieldId: string;
      fieldName: string;
      usageCount: number;
      completionRate: number;
    }>;
    leastUsedFields: Array<{
      fieldId: string;
      fieldName: string;
      usageCount: number;
      completionRate: number;
    }>;
    validationErrors: Array<{
      fieldId: string;
      errorType: string;
      count: number;
    }>;
    performanceMetrics: {
      averageFillTime: number;
      schemaLoadTime: number;
      validationTime: number;
    };
  };
  recommendations: Array<{
    type: 'remove' | 'modify' | 'reorder' | 'simplify';
    field: string;
    reason: string;
    impact: 'low' | 'medium' | 'high';
  }>;
}

export interface FieldRenderer {
  type: FieldType;
  component: React.ComponentType<FieldRendererProps>;
  icon: string;
  label: string;
  description: string;
  defaultValidation: ValidationRule[];
  supportsOptions: boolean;
  supportsValidation: ValidationType[];
}

export interface FieldRendererProps {
  field: MetadataField;
  value: any;
  onChange: (value: any) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  readonly?: boolean;
  compact?: boolean;
}

export interface SchemaExportFormat {
  format: 'json' | 'excel' | 'csv' | 'xml';
  includeData: boolean;
  includeValidation: boolean;
  includeRelationships: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface SchemaImportResult {
  success: boolean;
  schemaId?: string;
  errors: Array<{
    field: string;
    error: string;
    line?: number;
  }>;
  warnings: Array<{
    field: string;
    warning: string;
    line?: number;
  }>;
  statistics: {
    fieldsImported: number;
    validationRulesImported: number;
    relationshipsImported: number;
  };
}
export interface SmartFolder {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  rules: FolderRule[];
  logic: LogicOperator;
  isActive: boolean;
  isTemplate: boolean;
  parentId?: string;
  order: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastEvaluated: Date;
  documentCount: number;
  performance: FolderPerformance;
  settings: SmartFolderSettings;
}

export interface FolderRule {
  id: string;
  field: string;
  operator: RuleOperator;
  value: any;
  valueType: ValueType;
  caseSensitive?: boolean;
  negate?: boolean;
  groupId?: string;
  order: number;
  isActive: boolean;
}

export interface FolderRuleGroup {
  id: string;
  name: string;
  logic: LogicOperator;
  rules: FolderRule[];
  groups: FolderRuleGroup[];
  order: number;
}

export interface SmartFolderSettings {
  autoRefresh: boolean;
  refreshInterval: number; // minutes
  maxDocuments: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  includeSubfolders: boolean;
  enableNotifications: boolean;
  cacheResults: boolean;
  cacheDuration: number; // minutes
}

export interface FolderPerformance {
  averageEvaluationTime: number; // milliseconds
  lastEvaluationTime: number;
  totalEvaluations: number;
  successRate: number;
  errorCount: number;
  lastError?: string;
  indexUtilization: number;
  cacheHitRate: number;
}

export interface SmartFolderTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  rules: FolderRule[];
  logic: LogicOperator;
  icon: string;
  color: string;
  tags: string[];
  usageCount: number;
  rating: number;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  id: string;
  name: string;
  label: string;
  type: ValueType;
  required: boolean;
  defaultValue?: any;
  description?: string;
  options?: string[];
}

export interface SmartFolderAnalytics {
  folderId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    documentCount: number;
    averageDocuments: number;
    documentFlow: Array<{
      date: Date;
      added: number;
      removed: number;
      total: number;
    }>;
    topDocumentTypes: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
    accessFrequency: number;
    lastAccessed: Date;
    userInteractions: number;
  };
  performance: {
    averageLoadTime: number;
    cacheEfficiency: number;
    ruleComplexity: number;
    optimizationScore: number;
  };
  recommendations: Array<{
    type: 'rule' | 'performance' | 'organization';
    priority: 'low' | 'medium' | 'high';
    message: string;
    action?: string;
  }>;
}

export interface DocumentEvaluation {
  documentId: string;
  folderId: string;
  matches: boolean;
  ruleResults: Array<{
    ruleId: string;
    matches: boolean;
    evaluationTime: number;
    error?: string;
  }>;
  evaluationTime: number;
  evaluatedAt: Date;
  confidence: number;
}

export interface FolderContentChange {
  folderId: string;
  changeType: 'added' | 'removed' | 'updated';
  documentId: string;
  timestamp: Date;
  reason: string;
  ruleId?: string;
}

export interface RuleValidationResult {
  isValid: boolean;
  errors: Array<{
    ruleId: string;
    field: string;
    message: string;
  }>;
  warnings: Array<{
    ruleId: string;
    field: string;
    message: string;
  }>;
  suggestions: Array<{
    ruleId: string;
    suggestion: string;
    impact: 'performance' | 'accuracy' | 'maintenance';
  }>;
}

export interface SmartFolderQuery {
  folderId: string;
  rules: FolderRule[];
  logic: LogicOperator;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeMetadata?: boolean;
  useCache?: boolean;
}

export interface SmartFolderResult {
  documents: Array<{
    id: string;
    metadata: Record<string, any>;
    matchedRules: string[];
    confidence: number;
  }>;
  totalCount: number;
  evaluationTime: number;
  cacheUsed: boolean;
  query: SmartFolderQuery;
  executedAt: Date;
}

export type LogicOperator = 'AND' | 'OR' | 'NOT';

export type RuleOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'between'
  | 'notBetween'
  | 'in'
  | 'notIn'
  | 'regex'
  | 'exists'
  | 'notExists';

export type ValueType =
  | 'static'
  | 'dynamic'
  | 'reference'
  | 'function'
  | 'variable'
  | 'calculation';

export type TemplateCategory =
  | 'document-type'
  | 'date-based'
  | 'workflow'
  | 'department'
  | 'project'
  | 'compliance'
  | 'security'
  | 'custom';

export interface RuleOperatorDefinition {
  operator: RuleOperator;
  label: string;
  description: string;
  valueRequired: boolean;
  valueCount: number; // 0, 1, or 2 (for between operations)
  supportedTypes: string[];
  examples: string[];
}

export interface FieldDefinition {
  field: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  description?: string;
  searchable: boolean;
  indexed: boolean;
  supportedOperators: RuleOperator[];
  autoComplete?: boolean;
  options?: Array<{
    value: string;
    label: string;
  }>;
}

export interface SmartFolderState {
  folders: SmartFolder[];
  templates: SmartFolderTemplate[];
  currentFolder: SmartFolder | null;
  selectedDocuments: string[];
  ruleBuilder: {
    isOpen: boolean;
    editingRule: FolderRule | null;
    availableFields: FieldDefinition[];
    operators: RuleOperatorDefinition[];
  };
  analytics: Record<string, SmartFolderAnalytics>;
  loading: boolean;
  error: string | null;
}

export interface FolderHierarchy {
  id: string;
  name: string;
  type: 'folder' | 'smart-folder';
  icon?: string;
  color?: string;
  documentCount: number;
  children: FolderHierarchy[];
  isExpanded: boolean;
  isActive: boolean;
  hasChanges?: boolean;
  lastUpdated?: Date;
}

export interface BulkFolderOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'evaluate';
  folderIds: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalFolders: number;
  processedFolders: number;
  errors: Array<{
    folderId: string;
    error: string;
  }>;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
  result?: {
    successful: number;
    failed: number;
    skipped: number;
  };
}
export interface EmailAccount {
  id: string;
  name: string;
  type: EmailProvider;
  email: string;
  configuration: EmailConfiguration;
  status: ConnectionStatus;
  isActive: boolean;
  lastSync: Date;
  syncFrequency: number; // minutes
  totalEmails: number;
  processedEmails: number;
  errorCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailConfiguration {
  provider: EmailProvider;
  server?: string;
  port?: number;
  encryption?: EncryptionType;
  authentication: AuthenticationType;
  credentials: EmailCredentials;
  folders: string[];
  maxEmailAge?: number; // days
  batchSize: number;
  timeout: number; // seconds
}

export interface EmailCredentials {
  username?: string;
  password?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  tokenExpiresAt?: Date;
}

export interface EmailImportRule {
  id: string;
  name: string;
  description?: string;
  accountId: string;
  isActive: boolean;
  priority: number;
  conditions: EmailCondition[];
  logic: LogicOperator;
  actions: EmailAction[];
  statistics: RuleStatistics;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailCondition {
  id: string;
  field: EmailField;
  operator: ComparisonOperator;
  value: any;
  caseSensitive?: boolean;
  negate?: boolean;
}

export interface EmailAction {
  type: ActionType;
  parameters: Record<string, any>;
  order: number;
}

export interface RuleStatistics {
  matchedEmails: number;
  importedDocuments: number;
  errors: number;
  lastMatch: Date;
  averageProcessingTime: number;
}

export interface EmailMessage {
  id: string;
  messageId: string;
  accountId: string;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress;
  date: Date;
  receivedDate: Date;
  bodyText?: string;
  bodyHtml?: string;
  attachments: EmailAttachment[];
  headers: Record<string, string>;
  folder: string;
  threadId?: string;
  conversationId?: string;
  size: number;
  hasAttachments: boolean;
  isRead: boolean;
  importance: ImportanceLevel;
  flags: string[];
  categories: string[];
  internetMessageId: string;
  inReplyTo?: string;
  references?: string[];
}

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface EmailAttachment {
  id: string;
  name: string;
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
  isInline: boolean;
  content?: ArrayBuffer;
  downloadUrl?: string;
  documentId?: string; // After processing
  processingStatus: AttachmentProcessingStatus;
  processingError?: string;
}

export interface EmailThread {
  id: string;
  subject: string;
  participants: EmailAddress[];
  messageCount: number;
  messages: EmailMessage[];
  firstMessage: Date;
  lastMessage: Date;
  hasAttachments: boolean;
  totalAttachments: number;
  documentIds: string[];
  tags: string[];
  isArchived: boolean;
}

export interface EmailImportJob {
  id: string;
  accountId: string;
  type: ImportJobType;
  status: JobStatus;
  startTime: Date;
  endTime?: Date;
  progress: JobProgress;
  configuration: ImportConfiguration;
  results: ImportResults;
  error?: string;
  createdBy: string;
}

export interface JobProgress {
  totalEmails: number;
  processedEmails: number;
  importedDocuments: number;
  errors: number;
  currentStep: string;
  percentage: number;
}

export interface ImportConfiguration {
  dateRange?: {
    start: Date;
    end: Date;
  };
  folders: string[];
  includeAttachments: boolean;
  processOCR: boolean;
  applyRules: boolean;
  ruleIds?: string[];
  batchSize: number;
  maxConcurrency: number;
}

export interface ImportResults {
  totalEmailsScanned: number;
  emailsMatched: number;
  documentsCreated: number;
  attachmentsProcessed: number;
  ocrJobsCreated: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  performance: {
    totalTime: number;
    averageEmailProcessingTime: number;
    averageAttachmentProcessingTime: number;
  };
}

export interface ImportError {
  messageId: string;
  error: string;
  type: ErrorType;
  timestamp: Date;
  retry: boolean;
}

export interface ImportWarning {
  messageId: string;
  warning: string;
  type: WarningType;
  timestamp: Date;
}

export interface EmailSecurity {
  spamScore: number;
  isSpam: boolean;
  virusScanResult: VirusScanResult;
  suspiciousSender: boolean;
  phishingScore: number;
  attachmentSecurity: AttachmentSecurity[];
  quarantined: boolean;
  quarantineReason?: string;
}

export interface VirusScanResult {
  isClean: boolean;
  threats: string[];
  scanner: string;
  scanTime: Date;
  signature?: string;
}

export interface AttachmentSecurity {
  attachmentId: string;
  isClean: boolean;
  threats: string[];
  fileTypeAllowed: boolean;
  sizeWithinLimits: boolean;
  virusScanResult: VirusScanResult;
}

export interface EmailMetadata {
  messageId: string;
  extractedData: Record<string, any>;
  keywords: string[];
  entities: ExtractedEntity[];
  sentiment: SentimentAnalysis;
  language: string;
  importance: ImportanceLevel;
  category: string;
  businessContext: BusinessContext;
}

export interface ExtractedEntity {
  type: EntityType;
  text: string;
  confidence: number;
  startPosition: number;
  endPosition: number;
  metadata?: Record<string, any>;
}

export interface SentimentAnalysis {
  score: number;
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface BusinessContext {
  department?: string;
  project?: string;
  customer?: string;
  contract?: string;
  invoice?: string;
  priority: string;
}

export interface FolderMapping {
  id: string;
  accountId: string;
  emailFolder: string;
  documentFolder: string;
  createIfMissing: boolean;
  preserveHierarchy: boolean;
  isActive: boolean;
  statistics: {
    emailsProcessed: number;
    documentsCreated: number;
    lastSync: Date;
  };
}

export interface EmailMonitoring {
  accountId: string;
  isActive: boolean;
  monitoringType: MonitoringType;
  webhookUrl?: string;
  pollingInterval: number; // minutes
  lastCheck: Date;
  nextCheck: Date;
  errors: MonitoringError[];
  performance: MonitoringPerformance;
}

export interface MonitoringError {
  timestamp: Date;
  error: string;
  type: string;
  resolved: boolean;
  retryCount: number;
}

export interface MonitoringPerformance {
  averageResponseTime: number;
  successRate: number;
  totalChecks: number;
  uptime: number; // percentage
}

export interface EmailAnalytics {
  accountId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalEmails: number;
    processedEmails: number;
    importedDocuments: number;
    errors: number;
    topSenders: Array<{
      email: string;
      count: number;
    }>;
    topSubjects: Array<{
      subject: string;
      count: number;
    }>;
    attachmentTypes: Array<{
      type: string;
      count: number;
      size: number;
    }>;
    hourlyDistribution: Array<{
      hour: number;
      count: number;
    }>;
    processingTimes: {
      average: number;
      median: number;
      p95: number;
    };
  };
}

export type EmailProvider =
  | 'exchange'
  | 'office365'
  | 'gmail'
  | 'imap'
  | 'pop3'
  | 'outlook';

export type EncryptionType = 'none' | 'ssl' | 'tls' | 'starttls';

export type AuthenticationType =
  | 'basic'
  | 'oauth2'
  | 'ntlm'
  | 'modern'
  | 'certificate';

export type ConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'configuring'
  | 'testing';

export type EmailField =
  | 'from'
  | 'to'
  | 'cc'
  | 'bcc'
  | 'subject'
  | 'body'
  | 'date'
  | 'size'
  | 'attachments'
  | 'folder'
  | 'importance'
  | 'categories';

export type ComparisonOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'regex';

export type LogicOperator = 'AND' | 'OR' | 'NOT';

export type ActionType =
  | 'import'
  | 'ignore'
  | 'quarantine'
  | 'tag'
  | 'folder'
  | 'notify'
  | 'workflow';

export type AttachmentProcessingStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'quarantined';

export type ImportJobType =
  | 'initial'
  | 'incremental'
  | 'manual'
  | 'scheduled'
  | 'test';

export type JobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

export type ErrorType =
  | 'connection'
  | 'authentication'
  | 'parsing'
  | 'processing'
  | 'storage'
  | 'security'
  | 'quota';

export type WarningType =
  | 'large_attachment'
  | 'unsupported_format'
  | 'low_ocr_confidence'
  | 'duplicate_content'
  | 'missing_metadata';

export type ImportanceLevel = 'low' | 'normal' | 'high' | 'urgent';

export type EntityType =
  | 'person'
  | 'organization'
  | 'location'
  | 'date'
  | 'money'
  | 'percentage'
  | 'phone'
  | 'email'
  | 'url'
  | 'invoice_number'
  | 'contract_number';

export type MonitoringType = 'push' | 'poll' | 'webhook';

export interface EmailIntegrationState {
  accounts: EmailAccount[];
  rules: EmailImportRule[];
  currentAccount: EmailAccount | null;
  currentJob: EmailImportJob | null;
  jobs: EmailImportJob[];
  messages: EmailMessage[];
  threads: EmailThread[];
  analytics: Record<string, EmailAnalytics>;
  monitoring: Record<string, EmailMonitoring>;
  loading: boolean;
  error: string | null;
}
// Re-export folder types from Document.ts for convenience
export type {
  DocumentFolder as Folder,
  FolderType,
  FolderAction,
  FolderCreationRequest as FolderCreate,
} from './Document';

// Additional folder-specific types
export interface FolderUpdate {
  name?: string;
  description?: string;
  parent_id?: string | null;
  color?: string;
  icon?: string;
  folder_type?: 'regular' | 'smart';
  smart_criteria?: any;
  auto_refresh?: boolean;
}

export interface FolderWithStats extends DocumentFolder {
  document_count: number;
  total_size: number;
  subfolder_count?: number;
}

// For backward compatibility, also import from Document.ts
import type { DocumentFolder } from './Document';

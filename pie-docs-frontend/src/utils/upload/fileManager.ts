import type { UploadFile, UploadFileMetadata } from '@/types/domain/Upload';

/**
 * File Manager to store File objects outside of Redux store
 * This prevents Redux serialization warnings while keeping file references
 */
class FileManager {
  private files = new Map<string, File>();

  /**
   * Store a file and return its metadata for Redux
   */
  addFile(file: File, metadata: Omit<UploadFileMetadata, 'name' | 'size' | 'type' | 'lastModified'>): UploadFileMetadata {
    const fileMetadata: UploadFileMetadata = {
      ...metadata,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    };

    this.files.set(metadata.id, file);
    return fileMetadata;
  }

  /**
   * Get a file by ID
   */
  getFile(id: string): File | undefined {
    return this.files.get(id);
  }

  /**
   * Get complete upload file (metadata + File object)
   */
  getUploadFile(metadata: UploadFileMetadata): UploadFile | undefined {
    const file = this.files.get(metadata.id);
    if (!file) return undefined;

    return {
      ...metadata,
      file,
    };
  }

  /**
   * Remove a file from storage
   */
  removeFile(id: string): void {
    this.files.delete(id);
  }

  /**
   * Clear all files
   */
  clearFiles(): void {
    this.files.clear();
  }

  /**
   * Get all file IDs
   */
  getFileIds(): string[] {
    return Array.from(this.files.keys());
  }

  /**
   * Check if a file exists
   */
  hasFile(id: string): boolean {
    return this.files.has(id);
  }

  /**
   * Get file count
   */
  getFileCount(): number {
    return this.files.size;
  }
}

// Singleton instance
export const fileManager = new FileManager();

/**
 * Helper to create upload file metadata without File object
 */
export function createUploadFileMetadata(
  file: File,
  options: {
    id: string;
    progress?: number;
    status?: UploadFileMetadata['status'];
    folderId?: string;
    folderPath?: string;
    metadata?: UploadFileMetadata['metadata'];
    retryCount?: number;
  }
): UploadFileMetadata {
  return {
    id: options.id,
    name: file.name,
    size: file.size,
    type: file.type,
    progress: options.progress ?? 0,
    status: options.status ?? 'pending',
    lastModified: file.lastModified,
    folderId: options.folderId,
    folderPath: options.folderPath,
    metadata: options.metadata,
    retryCount: options.retryCount ?? 0,
  };
}

/**
 * Helper to convert File array to UploadFileMetadata array and store files
 */
export function processFilesForUpload(
  files: File[],
  options: {
    generateId: () => string;
    folderId?: string;
    folderPath?: string;
    metadata?: UploadFileMetadata['metadata'];
  }
): UploadFileMetadata[] {
  return files.map(file => {
    const id = options.generateId();

    // Store file in manager
    const metadata = fileManager.addFile(file, {
      id,
      progress: 0,
      status: 'pending',
      folderId: options.folderId,
      folderPath: options.folderPath,
      metadata: options.metadata,
      retryCount: 0,
    });

    return metadata;
  });
}
import type { Folder, FolderCreate, FolderUpdate } from '@/types/domain/Folder';

// Environment configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000');

export interface FolderListResponse {
  folders: Folder[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface FolderQueryParams {
  page?: number;
  page_size?: number;
  parent_id?: string;
  folder_type?: 'regular' | 'smart';
}

class FoldersService {
  private baseUrl = `${API_BASE_URL}/folders`;

  /**
   * Get all folders with pagination
   */
  async getFolders(params: FolderQueryParams = {}): Promise<FolderListResponse> {
    try {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.page_size) searchParams.append('page_size', params.page_size.toString());
      if (params.parent_id) searchParams.append('parent_id', params.parent_id);
      if (params.folder_type) searchParams.append('folder_type', params.folder_type);

      const response = await fetch(`${this.baseUrl}?${searchParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch folders: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to fetch folders:', error);
      throw error;
    }
  }

  /**
   * Get folder by ID
   */
  async getFolder(id: string): Promise<Folder> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Folder not found');
        }
        throw new Error(`Failed to fetch folder: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to fetch folder ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create new folder
   */
  async createFolder(folderData: FolderCreate): Promise<Folder> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(folderData),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create folder: ${response.statusText} - ${error}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error;
    }
  }

  /**
   * Update folder
   */
  async updateFolder(id: string, folderData: FolderUpdate): Promise<Folder> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(folderData),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to update folder: ${response.statusText} - ${error}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to update folder ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete folder
   */
  async deleteFolder(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete folder: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Failed to delete folder ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get folder tree (hierarchical)
   */
  async getFolderTree(rootId?: string): Promise<Folder[]> {
    try {
      const params = rootId ? `?root_id=${rootId}` : '';
      const response = await fetch(`${this.baseUrl}/tree${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch folder tree: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to fetch folder tree:', error);
      throw error;
    }
  }

  /**
   * Get documents in folder
   */
  async getFolderDocuments(folderId: string, page: number = 1, pageSize: number = 20) {
    try {
      const response = await fetch(
        `${this.baseUrl}/${folderId}/documents?page=${page}&page_size=${pageSize}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(API_TIMEOUT),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch folder documents: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to fetch documents for folder ${folderId}:`, error);
      throw error;
    }
  }

  /**
   * Move document to folder
   */
  async moveDocumentToFolder(folderId: string, documentId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${folderId}/documents?document_id=${documentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to move document to folder: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Failed to move document ${documentId} to folder ${folderId}:`, error);
      throw error;
    }
  }

  /**
   * Move folder to another parent folder
   */
  async moveFolder(folderId: string, newParentId: string | null): Promise<Folder> {
    try {
      const response = await fetch(`${this.baseUrl}/${folderId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ new_parent_id: newParentId }),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to move folder: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to move folder ${folderId}:`, error);
      throw error;
    }
  }
}

export const foldersService = new FoldersService();
export default foldersService;

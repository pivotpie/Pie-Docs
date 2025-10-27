// Environment configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000');

export interface Tag {
  id: string;
  name: string;
  color?: string;
  usage_count?: number;
  created_at?: string;
}

export interface TagCreate {
  name: string;
  color?: string;
}

export interface TagUpdate {
  name?: string;
  color?: string;
}

class TagsService {
  private baseUrl = `${API_BASE_URL}/tags`;

  /**
   * Get all tags
   */
  async getTags(page: number = 1, pageSize: number = 100): Promise<Tag[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}?page=${page}&page_size=${pageSize}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(API_TIMEOUT),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch tags: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to fetch tags:', error);
      throw error;
    }
  }

  /**
   * Get tag by ID
   */
  async getTag(id: string): Promise<Tag> {
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
          throw new Error('Tag not found');
        }
        throw new Error(`Failed to fetch tag: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to fetch tag ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create new tag
   */
  async createTag(data: TagCreate): Promise<Tag> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create tag: ${response.statusText} - ${error}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to create tag:', error);
      throw error;
    }
  }

  /**
   * Update tag
   */
  async updateTag(id: string, data: TagUpdate): Promise<Tag> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to update tag: ${response.statusText} - ${error}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to update tag ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete tag
   */
  async deleteTag(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete tag: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Failed to delete tag ${id}:`, error);
      throw error;
    }
  }

  /**
   * Add tag to document
   */
  async addTagToDocument(documentId: string, tagId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tag_id: tagId }),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to add tag to document: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Failed to add tag ${tagId} to document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Remove tag from document
   */
  async removeTagFromDocument(documentId: string, tagId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/tags/${tagId}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to remove tag from document: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Failed to remove tag ${tagId} from document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Get documents with specific tag
   */
  async getDocumentsByTag(tagId: string, page: number = 1, pageSize: number = 20) {
    try {
      const response = await fetch(
        `${this.baseUrl}/${tagId}/documents?page=${page}&page_size=${pageSize}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(API_TIMEOUT),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to fetch documents for tag ${tagId}:`, error);
      throw error;
    }
  }

  /**
   * Search tags by name
   */
  async searchTags(query: string): Promise<Tag[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(API_TIMEOUT),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to search tags: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to search tags:', error);
      throw error;
    }
  }

  /**
   * Get popular tags (most used)
   */
  async getPopularTags(limit: number = 10): Promise<Tag[]> {
    try {
      const tags = await this.getTags(1, limit);
      // API should return tags sorted by usage_count DESC by default
      return tags;
    } catch (error) {
      console.error('Failed to fetch popular tags:', error);
      throw error;
    }
  }
}

export const tagsService = new TagsService();
export default tagsService;

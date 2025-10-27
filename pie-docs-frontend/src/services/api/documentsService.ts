import type {
  Document,
  DocumentFolder,
  DocumentQueryParams,
  DocumentQueryResponse,
  BulkAction,
  Cabinet,
  CabinetQueryParams,
  CabinetQueryResponse
} from '@/types/domain/Document';
import type {
  UploadResponse,
  UploadOptions,
  UploadProgress
} from '@/types/domain/Upload';

// Environment configuration
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://147.93.102.178:8888/api/v4';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000');

// Mayan EDMS authentication
const MAYAN_USERNAME = import.meta.env.VITE_MAYAN_USERNAME || 'Pivotpie';
const MAYAN_PASSWORD = import.meta.env.VITE_MAYAN_PASSWORD || 'WelcomePie@2025x';
const MAYAN_API_TOKEN = import.meta.env.VITE_MAYAN_API_TOKEN;

class DocumentsService {
  private baseUrl = `${API_BASE_URL}/documents`;

  /**
   * Get documents with filtering, sorting, and pagination
   */
  async getDocuments(params: DocumentQueryParams = {}): Promise<DocumentQueryResponse> {
    if (USE_MOCK_DATA) {
      return this.getMockDocuments(params);
    }

    try {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('page_size', params.limit.toString());
      if (params.searchQuery) searchParams.append('search', params.searchQuery);

      // Folder filtering:
      // - If folderId is provided, filter by that folder
      // - If folderId is null, we'll get all docs and filter on frontend
      if (params.folderId) {
        searchParams.append('folder_id', params.folderId);
      }

      const response = await fetch(`${API_BASE_URL}/documents?${searchParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }

      const data = await response.json();

      // Map backend response to frontend format
      const documents = (data.documents || []).map((doc: any) => ({
        id: doc.id,
        name: doc.title || `Document ${doc.id}`,
        type: this.getFileTypeFromDocument(doc) as Document['type'],
        status: doc.status as Document['status'],
        size: doc.file_size || 0,
        dateCreated: doc.created_at,
        dateModified: doc.modified_at || doc.created_at,
        path: doc.folder_id ? `/folder/${doc.folder_id}` : '/',
        downloadUrl: doc.download_url || `${API_BASE_URL}/documents/${doc.id}/download`,
        thumbnail: this.getDocumentThumbnailUrl(doc.id),
        metadata: {
          tags: doc.tags || [],
          author: doc.author || 'Unknown',
          version: doc.version || 1,
          description: doc.content ? doc.content.substring(0, 200) + '...' : '',
          language: doc.language || 'en',
          keywords: doc.keywords || [],
          customFields: {
            ...(doc.metadata || {}),
            document_type: doc.document_type,  // Include document type from backend
            document_type_id: doc.document_type_id,
            classification_confidence: doc.classification_confidence,
            barcode_id: doc.barcode_id,
            rack_id: doc.rack_id,
          },
        },
        permissions: {
          canView: true,
          canEdit: true,
          canDelete: true,
          canShare: true,
        },
      }));

      return {
        documents,
        folders: [],
        totalCount: data.total || documents.length,
        hasMore: data.page < data.total_pages,
        nextPage: data.page < data.total_pages ? data.page + 1 : undefined,
      };
    } catch (error) {
      console.error('Failed to fetch documents from backend:', error);
      return this.getMockDocuments(params);
    }
  }

  private getFileTypeFromName(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const typeMap: { [key: string]: string} = {
      'pdf': 'pdf',
      'doc': 'docx',
      'docx': 'docx',
      'xls': 'xlsx',
      'xlsx': 'xlsx',
      'ppt': 'pptx',
      'pptx': 'pptx',
      'txt': 'txt',
      'jpg': 'image',
      'jpeg': 'image',
      'png': 'image',
      'gif': 'image',
    };
    return typeMap[extension] || 'txt';
  }

  private getFileTypeFromDocument(doc: any): string {
    // Try to infer from document_type field
    if (doc.document_type) {
      const docType = doc.document_type.toLowerCase();
      if (docType.includes('invoice')) return 'pdf';
      if (docType.includes('contract')) return 'pdf';
      if (docType.includes('report')) return 'pdf';
      if (docType.includes('image')) return 'image';
      if (docType.includes('spreadsheet')) return 'xlsx';
      if (docType.includes('presentation')) return 'pptx';
    }
    // Try to infer from mime_type
    if (doc.mime_type) {
      const mimeType = doc.mime_type.toLowerCase();
      if (mimeType.includes('pdf')) return 'pdf';
      if (mimeType.includes('word') || mimeType.includes('docx')) return 'docx';
      if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'xlsx';
      if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'pptx';
      if (mimeType.includes('image')) return 'image';
      if (mimeType.includes('text')) return 'txt';
    }
    // Try to infer from file_path
    if (doc.file_path) {
      return this.getFileTypeFromName(doc.file_path);
    }
    // Try to infer from title
    if (doc.title) {
      return this.getFileTypeFromName(doc.title);
    }
    return 'pdf'; // Default to PDF
  }

  private getDefaultThumbnail(documentType?: string): string {
    const typeMap: { [key: string]: string } = {
      'Invoice': 'https://via.placeholder.com/200x300?text=Invoice',
      'Contract': 'https://via.placeholder.com/200x300?text=Contract',
      'Report': 'https://via.placeholder.com/200x300?text=Report',
      'Research Paper': 'https://via.placeholder.com/200x300?text=Research',
    };
    return typeMap[documentType || ''] || 'https://via.placeholder.com/200x300?text=Document';
  }

  /**
   * Get document by ID
   */
  async getDocumentById(id: string): Promise<Document> {
    if (USE_MOCK_DATA) {
      const mockDocs = await this.getMockDocuments();
      const doc = mockDocs.documents.find(d => d.id === id);
      if (!doc) {
        throw new Error(`Document not found: ${id}`);
      }
      return doc;
    }

    const response = await fetch(`${this.baseUrl}/${id}`, {
      headers: this.getAuthHeaders(),
      signal: AbortSignal.timeout(API_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Perform bulk action on documents
   */
  async performBulkAction(action: BulkAction): Promise<{ success: boolean; results: Array<{ id: string; success: boolean }> }> {
    if (USE_MOCK_DATA) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        success: true,
        results: action.documentIds.map(id => ({ id, success: true }))
      };
    }

    const response = await fetch(`${this.baseUrl}/bulk-action`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(action),
      signal: AbortSignal.timeout(API_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`Bulk action failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get folder contents
   */
  async getFolderContents(folderId: string, params: DocumentQueryParams = {}): Promise<DocumentQueryResponse> {
    return this.getDocuments({ ...params, folderId });
  }

  /**
   * Get available filter options
   */
  async getFilterOptions(): Promise<{
    types: string[];
    tags: string[];
    authors: string[];
  }> {
    if (USE_MOCK_DATA) {
      return {
        types: ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'md', 'html', 'image'],
        tags: ['Important', 'Draft', 'Review', 'Archive', 'Marketing', 'Legal', 'Technical'],
        authors: ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'David Wilson'],
      };
    }

    const response = await fetch(`${this.baseUrl}/filter-options`, {
      headers: this.getAuthHeaders(),
      signal: AbortSignal.timeout(API_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch filter options: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Mock cabinet documents for development
   */
  private async getMockCabinetDocuments(cabinetId: string, params: DocumentQueryParams = {}): Promise<DocumentQueryResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));

    const cabinetNames = ['Marketing Cabinet', 'Legal Documents', 'Financial Reports', 'HR Documents'];
    const cabinetName = cabinetNames[parseInt(cabinetId) - 1] || 'Unknown Cabinet';

    // Generate mock documents for this cabinet
    const mockDocuments: Document[] = Array.from({ length: 20 }, (_, index) => ({
      id: `cabinet-${cabinetId}-doc-${index + 1}`,
      name: `${cabinetName} Document ${index + 1}.pdf`,
      type: (['pdf', 'docx', 'xlsx', 'pptx', 'txt'][index % 5]) as Document['type'],
      status: (['published', 'draft', 'archived'][index % 3]) as Document['status'],
      size: Math.floor(Math.random() * 5000000) + 100000,
      dateCreated: new Date(2024, 0, 1 + (index % 365)).toISOString(),
      dateModified: new Date(2024, 8, 1 + (index % 20)).toISOString(),
      path: `/cabinet-${cabinetId}`,
      downloadUrl: `/api/documents/cabinet-${cabinetId}-doc-${index + 1}/download`,
      thumbnail: `https://picsum.photos/200/300?random=cabinet-${cabinetId}-doc-${index + 1}`,
      metadata: {
        tags: ['Important', 'Cabinet', cabinetName.split(' ')[0]].slice(0, (index % 3) + 1),
        author: ['John Doe', 'Jane Smith', 'Bob Johnson'][index % 3],
        version: (index % 3) + 1,
        description: `This is ${cabinetName} document ${index + 1}`,
        language: 'en',
        keywords: [cabinetName.toLowerCase(), 'document'],
        customFields: {},
      },
      permissions: {
        canView: true,
        canEdit: index % 3 !== 0,
        canDelete: index % 5 !== 0,
        canShare: true,
      },
    }));

    // Apply basic filtering
    let filteredDocuments = mockDocuments;

    if (params.searchQuery) {
      const query = params.searchQuery.toLowerCase();
      filteredDocuments = filteredDocuments.filter(doc =>
        doc.name.toLowerCase().includes(query) ||
        doc.metadata.author.toLowerCase().includes(query)
      );
    }

    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);
    const hasMore = endIndex < filteredDocuments.length;

    return {
      documents: paginatedDocuments,
      folders: [],
      totalCount: filteredDocuments.length,
      hasMore,
      nextPage: hasMore ? page + 1 : undefined,
    };
  }

  /**
   * Mock data generator for development
   */
  private async getMockDocuments(params: DocumentQueryParams = {}): Promise<DocumentQueryResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));

    const mockFolders: DocumentFolder[] = [
      {
        id: 'folder-1',
        name: 'Marketing Materials',
        path: '/marketing',
        documentCount: 45,
        childFolders: ['folder-2'],
        dateCreated: '2024-01-15T10:00:00Z',
        dateModified: '2024-09-15T14:30:00Z',
        permissions: {
          canView: true,
          canEdit: true,
          canDelete: false,
          canCreateChild: true,
        },
      },
      {
        id: 'folder-2',
        name: 'Legal Documents',
        path: '/legal',
        parentId: 'folder-1',
        documentCount: 23,
        childFolders: [],
        dateCreated: '2024-02-01T09:00:00Z',
        dateModified: '2024-09-10T11:20:00Z',
        permissions: {
          canView: true,
          canEdit: false,
          canDelete: false,
          canCreateChild: false,
        },
      },
    ];

    const mockDocuments: Document[] = Array.from({ length: 150 }, (_, index) => ({
      id: `doc-${index + 1}`,
      name: `Document ${index + 1}.pdf`,
      type: (['pdf', 'docx', 'xlsx', 'pptx', 'txt'][index % 5]) as Document['type'],
      status: (['published', 'draft', 'archived', 'processing'][index % 4]) as Document['status'],
      size: Math.floor(Math.random() * 10000000) + 1000, // 1KB to 10MB
      dateCreated: new Date(2024, 0, 1 + (index % 365)).toISOString(),
      dateModified: new Date(2024, 8, 1 + (index % 20)).toISOString(),
      path: index < 50 ? '/marketing' : index < 100 ? '/legal' : '/',
      downloadUrl: `/api/documents/doc-${index + 1}/download`,
      thumbnail: `https://picsum.photos/200/300?random=doc-${index + 1}`,
      metadata: {
        tags: ['Important', 'Draft', 'Review'].slice(0, (index % 3) + 1),
        author: ['John Doe', 'Jane Smith', 'Bob Johnson'][index % 3],
        version: (index % 5) + 1,
        description: `This is document ${index + 1} description`,
        language: 'en',
        keywords: ['keyword1', 'keyword2'],
        customFields: {},
      },
      permissions: {
        canView: true,
        canEdit: index % 3 !== 0,
        canDelete: index % 5 !== 0,
        canShare: true,
      },
    }));

    // Apply filtering (basic implementation)
    let filteredDocuments = mockDocuments;
    let filteredFolders = mockFolders;

    if (params.searchQuery) {
      const query = params.searchQuery.toLowerCase();
      filteredDocuments = filteredDocuments.filter(doc =>
        doc.name.toLowerCase().includes(query) ||
        doc.metadata.author.toLowerCase().includes(query)
      );
      filteredFolders = filteredFolders.filter(folder =>
        folder.name.toLowerCase().includes(query)
      );
    }

    if (params.filters?.types?.length) {
      filteredDocuments = filteredDocuments.filter(doc =>
        params.filters!.types!.includes(doc.type)
      );
    }

    if (params.filters?.status?.length) {
      filteredDocuments = filteredDocuments.filter(doc =>
        params.filters!.status!.includes(doc.status)
      );
    }

    // Apply sorting
    if (params.sort?.length) {
      filteredDocuments.sort((a, b) => {
        for (const sortCriteria of params.sort!) {
          let comparison = 0;

          switch (sortCriteria.field) {
            case 'name':
              comparison = a.name.localeCompare(b.name);
              break;
            case 'dateModified':
              comparison = new Date(a.dateModified).getTime() - new Date(b.dateModified).getTime();
              break;
            case 'dateCreated':
              comparison = new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime();
              break;
            case 'size':
              comparison = a.size - b.size;
              break;
            case 'type':
              comparison = a.type.localeCompare(b.type);
              break;
            default:
              comparison = 0;
          }

          if (comparison !== 0) {
            return sortCriteria.order === 'desc' ? -comparison : comparison;
          }
        }
        return 0;
      });
    }

    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);
    const hasMore = endIndex < filteredDocuments.length;

    return {
      documents: paginatedDocuments,
      folders: page === 1 ? filteredFolders : [], // Only show folders on first page
      totalCount: filteredDocuments.length,
      hasMore,
      nextPage: hasMore ? page + 1 : undefined,
    };
  }

  /**
   * Get authentication headers for Mayan EDMS
   */
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/json',
    };

    if (MAYAN_API_TOKEN) {
      headers['Authorization'] = `Token ${MAYAN_API_TOKEN}`;
    } else if (MAYAN_USERNAME && MAYAN_PASSWORD) {
      const credentials = btoa(`${MAYAN_USERNAME}:${MAYAN_PASSWORD}`);
      headers['Authorization'] = `Basic ${credentials}`;
    }

    return headers;
  }

  /**
   * Get cabinets from Mayan EDMS
   */
  async getCabinets(): Promise<Array<{ id: number; label: string; documents_count?: number }>> {
    if (USE_MOCK_DATA) {
      return [
        { id: 1, label: 'Marketing Cabinet', documents_count: 25 },
        { id: 2, label: 'Legal Documents', documents_count: 15 },
        { id: 3, label: 'Financial Reports', documents_count: 30 },
        { id: 4, label: 'HR Documents', documents_count: 12 }
      ];
    }

    try {
      const response = await fetch(`${API_BASE_URL}/cabinets/`, {
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cabinets: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || data;
    } catch (error) {
      console.error('Failed to fetch cabinets:', error);
      // Fallback to empty array
      return [];
    }
  }

  /**
   * Get documents in a specific cabinet
   */
  async getCabinetDocuments(cabinetId: string, params: DocumentQueryParams = {}): Promise<DocumentQueryResponse> {
    if (USE_MOCK_DATA) {
      return this.getMockCabinetDocuments(cabinetId, params);
    }

    try {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('page_size', params.limit.toString());
      if (params.searchQuery) searchParams.append('search', params.searchQuery);

      const response = await fetch(`${API_BASE_URL}/cabinets/${cabinetId}/documents/?${searchParams.toString()}`, {
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cabinet documents: ${response.statusText}`);
      }

      const data = await response.json();
      const documents = (data.results || data).map((doc: any) => ({
        id: doc.id.toString(),
        name: doc.label || `Document ${doc.id}`,
        type: this.getFileTypeFromName(doc.label || '') as Document['type'],
        status: 'published' as Document['status'],
        size: 0,
        dateCreated: doc.datetime_created,
        dateModified: doc.datetime_modified || doc.datetime_created,
        path: `/cabinet-${cabinetId}`,
        downloadUrl: `${API_BASE_URL}/documents/${doc.id}/files/`,
        thumbnail: this.getDocumentThumbnailUrl(doc.id.toString()),
        metadata: {
          tags: [],
          author: 'Unknown',
          version: 1,
          description: doc.description || '',
          language: 'en',
          keywords: [],
          customFields: {},
        },
        permissions: {
          canView: true,
          canEdit: true,
          canDelete: true,
          canShare: true,
        },
      }));

      return {
        documents,
        folders: [],
        totalCount: data.count || documents.length,
        hasMore: !!data.next,
        nextPage: data.next ? (params.page || 1) + 1 : undefined,
      };
    } catch (error) {
      console.error('Failed to fetch cabinet documents from Mayan:', error);
      return this.getMockCabinetDocuments(cabinetId, params);
    }
  }

  /**
   * Get document thumbnail URL (Internal API)
   */
  getDocumentThumbnailUrl(documentId: string, fileId?: string, pageId: string = '1'): string {
    if (USE_MOCK_DATA) {
      // Return mock thumbnail URLs
      return `https://picsum.photos/200/300?random=${documentId}`;
    }

    // Use internal API thumbnail endpoint
    return `${API_BASE_URL}/documents/${documentId}/thumbnail`;
  }

  /**
   * Get document files for thumbnail generation
   */
  async getDocumentFiles(documentId: string): Promise<Array<{ id: number; pages_count?: number }>> {
    if (USE_MOCK_DATA) {
      return [{ id: 1, pages_count: 1 }];
    }

    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/files/`, {
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch document files: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || data;
    } catch (error) {
      console.error('Failed to fetch document files:', error);
      return [{ id: 1, pages_count: 1 }];
    }
  }

  /**
   * Get document type from Mayan EDMS
   */
  async getDocumentTypes(): Promise<Array<{ id: number; label: string }>> {
    if (USE_MOCK_DATA) {
      return [
        { id: 1, label: 'Invoice' },
        { id: 2, label: 'Contract' },
        { id: 3, label: 'Report' },
        { id: 4, label: 'General Document' }
      ];
    }

    try {
      const response = await fetch(`${API_BASE_URL}/document_types/`, {
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch document types: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || data;
    } catch (error) {
      console.error('Failed to fetch document types:', error);
      // Fallback to default types
      return [{ id: 1, label: 'General Document' }];
    }
  }

  /**
   * Get metadata types from Mayan EDMS
   */
  async getMetadataTypes(): Promise<Array<{ id: number; label: string; name: string }>> {
    if (USE_MOCK_DATA) {
      return [
        { id: 1, label: 'Category', name: 'Category' },
        { id: 2, label: 'Document Number', name: 'Document Number' }
      ];
    }

    try {
      const response = await fetch(`${API_BASE_URL}/metadata_types/`, {
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        // Endpoint not implemented yet - return empty array silently
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Failed to fetch metadata types: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || data;
    } catch (error) {
      // Silently return empty array - endpoint not implemented yet
      return [];
    }
  }

  /**
   * Upload single file with progress tracking (Internal API)
   */
  async uploadFile(
    file: File,
    options: UploadOptions = {},
    onProgress?: (progress: UploadProgress) => void,
    abortSignal?: AbortSignal
  ): Promise<UploadResponse> {
    if (USE_MOCK_DATA) {
      return this.mockUploadFile(file, options, onProgress, abortSignal);
    }

    try {
      // Create FormData for internal API upload
      const formData = new FormData();
      formData.append('file', file);

      // Map frontend options to backend fields
      if (options.metadata?.title) {
        formData.append('title', options.metadata.title);
      }
      if (options.metadata?.category) {
        formData.append('document_type', options.metadata.category);
      }
      if (options.metadata?.tags && options.metadata.tags.length > 0) {
        formData.append('tags', options.metadata.tags.join(','));
      }
      if (options.folderId) {
        formData.append('folder_id', options.folderId);
      }
      if (options.metadata?.author) {
        formData.append('author', options.metadata.author);
      }

      // Workflow enhancements - document type ID and name from classification
      if (options.metadata?.document_type_id) {
        formData.append('document_type_id', options.metadata.document_type_id);
      }
      if (options.metadata?.document_type) {
        formData.append('document_type', options.metadata.document_type);
      }

      // Barcode assignment
      if (options.metadata?.barcode_id) {
        formData.append('barcode_id', options.metadata.barcode_id);
      }

      // Warehouse location
      if (options.metadata?.rack_id) {
        formData.append('rack_id', options.metadata.rack_id);
      }
      if (options.metadata?.location_path) {
        formData.append('location_path', options.metadata.location_path);
      }

      // AI Classification results
      if (options.metadata?.classification_confidence !== undefined) {
        formData.append('classification_confidence', String(options.metadata.classification_confidence));
      }
      if (options.metadata?.classification_reasoning) {
        formData.append('classification_reasoning', options.metadata.classification_reasoning);
      }

      // Embeddings for RAG search
      if (options.embeddings && Array.isArray(options.embeddings)) {
        formData.append('embeddings', JSON.stringify(options.embeddings));
      }

      // Pre-extracted OCR text
      if (options.metadata?.ocr_text) {
        formData.append('ocr_text', options.metadata.ocr_text);
      }

      // Pre-extracted AI features (insights, summary, key_terms) from metadata extraction
      if (options.insights && Array.isArray(options.insights) && options.insights.length > 0) {
        formData.append('insights_json', JSON.stringify(options.insights));
      }

      if (options.summary && Object.keys(options.summary).length > 0) {
        formData.append('summary_json', JSON.stringify(options.summary));
      }

      if (options.key_terms && Array.isArray(options.key_terms) && options.key_terms.length > 0) {
        formData.append('key_terms_json', JSON.stringify(options.key_terms));
      }

      // Custom metadata fields (excluding system fields)
      const customMetadata: any = {};
      if (options.metadata) {
        for (const [key, value] of Object.entries(options.metadata)) {
          // Exclude system fields that are sent separately
          if (!['title', 'category', 'tags', 'author', 'document_type_id', 'document_type', 'barcode_id', 'rack_id',
                'location_path', 'classification_confidence', 'classification_reasoning', 'ocr_text'].includes(key)) {
            customMetadata[key] = value;
          }
        }
      }

      if (Object.keys(customMetadata).length > 0) {
        formData.append('metadata_json', JSON.stringify(customMetadata));
      }

      // Auto-processing flags (defaults to true for better UX)
      formData.append('auto_ocr', options.autoOcr !== undefined ? String(options.autoOcr) : 'true');
      formData.append('auto_classify', options.autoClassify !== undefined ? String(options.autoClassify) : 'false');

      // Upload with progress tracking to internal API
      const uploadResponse = await this.uploadWithProgress(
        `${API_BASE_URL}/documents/upload`,
        formData,
        onProgress,
        abortSignal
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
      }

      const result = await uploadResponse.json();

      return {
        success: true,
        documentId: result.id,
        data: result,  // Include full document data
        message: 'File uploaded successfully',
        thumbnailUrl: result.thumbnail_path ? `${API_BASE_URL}/documents/${result.id}/thumbnail` : undefined,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Upload cancelled',
        };
      }

      console.error('Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Upload with progress tracking using XMLHttpRequest
   */
  private uploadWithProgress(
    url: string,
    formData: FormData,
    onProgress?: (progress: UploadProgress) => void,
    abortSignal?: AbortSignal
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const fileId = `upload-${Date.now()}`;
      const startTime = Date.now();

      // Handle abort signal
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error('Upload cancelled'));
        });
      }

      // Progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const elapsedTime = (Date.now() - startTime) / 1000;
          const speed = event.loaded / elapsedTime;
          const remainingTime = speed > 0 ? (event.total - event.loaded) / speed : 0;

          onProgress({
            fileId,
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
            speed,
            remainingTime,
          });
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Create a Response-like object
          const response = {
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            statusText: xhr.statusText,
            json: () => Promise.resolve(JSON.parse(xhr.responseText)),
            text: () => Promise.resolve(xhr.responseText),
          } as Response;
          resolve(response);
        } else {
          const response = {
            ok: false,
            status: xhr.status,
            statusText: xhr.statusText,
            text: () => Promise.resolve(xhr.responseText),
          } as Response;
          resolve(response);
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });

      // Set up the request
      xhr.open('POST', url);
      xhr.timeout = API_TIMEOUT;

      // Note: Don't set Content-Type header - browser will set it with boundary for FormData

      // Send the request
      xhr.send(formData);
    });
  }

  /**
   * Add tags to a document in Mayan EDMS
   */
  private async addTagsToDocument(documentId: string, tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        await fetch(`${API_BASE_URL}/documents/${documentId}/tags/`, {
          method: 'POST',
          headers: {
            ...this.getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ label: tag }),
          signal: AbortSignal.timeout(API_TIMEOUT),
        });
      }
    } catch (error) {
      console.warn('Failed to add tags to document:', error);
      // Don't fail the upload if tagging fails
    }
  }

  /**
   * Add metadata to a document in Mayan EDMS
   */
  private async addMetadataToDocument(documentId: string, metadata: {
    category?: string;
    documentNumber?: string;
  }): Promise<void> {
    try {
      // Get metadata types to map names to IDs
      const metadataTypes = await this.getMetadataTypes();

      // Get existing metadata for the document
      const existingMetadataResponse = await fetch(`${API_BASE_URL}/documents/${documentId}/metadata/`, {
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      let existingMetadata: any[] = [];
      if (existingMetadataResponse.ok) {
        const existingData = await existingMetadataResponse.json();
        existingMetadata = existingData.results || [];
      }

      // Update Category metadata
      if (metadata.category) {
        const categoryType = metadataTypes.find(mt => mt.name === 'Category');
        if (categoryType) {
          // Find existing metadata entry for this type
          const existingEntry = existingMetadata.find(
            entry => entry.metadata_type.id === categoryType.id
          );

          if (existingEntry) {
            // Update existing entry
            const response = await fetch(`${API_BASE_URL}/documents/${documentId}/metadata/${existingEntry.id}/`, {
              method: 'PATCH',
              headers: {
                ...this.getAuthHeaders(),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                value: metadata.category
              }),
              signal: AbortSignal.timeout(API_TIMEOUT),
            });

            if (!response.ok) {
              console.warn('Failed to update category metadata:', await response.text());
            }
          } else {
            // Create new entry (fallback if not auto-created)
            const response = await fetch(`${API_BASE_URL}/documents/${documentId}/metadata/`, {
              method: 'POST',
              headers: {
                ...this.getAuthHeaders(),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                metadata_type_id: categoryType.id,
                value: metadata.category
              }),
              signal: AbortSignal.timeout(API_TIMEOUT),
            });

            if (!response.ok) {
              console.warn('Failed to create category metadata:', await response.text());
            }
          }
        }
      }

      // Update Document Number metadata
      if (metadata.documentNumber) {
        const docNumberType = metadataTypes.find(mt => mt.name === 'Document Number');
        if (docNumberType) {
          // Find existing metadata entry for this type
          const existingEntry = existingMetadata.find(
            entry => entry.metadata_type.id === docNumberType.id
          );

          if (existingEntry) {
            // Update existing entry
            const response = await fetch(`${API_BASE_URL}/documents/${documentId}/metadata/${existingEntry.id}/`, {
              method: 'PATCH',
              headers: {
                ...this.getAuthHeaders(),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                value: metadata.documentNumber
              }),
              signal: AbortSignal.timeout(API_TIMEOUT),
            });

            if (!response.ok) {
              console.warn('Failed to update document number metadata:', await response.text());
            }
          } else {
            // Create new entry (fallback if not auto-created)
            const response = await fetch(`${API_BASE_URL}/documents/${documentId}/metadata/`, {
              method: 'POST',
              headers: {
                ...this.getAuthHeaders(),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                metadata_type_id: docNumberType.id,
                value: metadata.documentNumber
              }),
              signal: AbortSignal.timeout(API_TIMEOUT),
            });

            if (!response.ok) {
              console.warn('Failed to create document number metadata:', await response.text());
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to add metadata to document:', error);
      // Don't fail the upload if metadata fails
    }
  }

  /**
   * Upload multiple files with progress tracking
   */
  async uploadFiles(
    files: File[],
    options: UploadOptions = {},
    onProgress?: (fileId: string, progress: UploadProgress) => void,
    abortSignal?: AbortSignal
  ): Promise<UploadResponse[]> {
    const uploadPromises = files.map((file, index) => {
      const fileId = `${Date.now()}-${index}`;
      return this.uploadFile(
        file,
        options,
        onProgress ? (progress) => onProgress(fileId, progress) : undefined,
        abortSignal
      );
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Mock upload implementation for development
   */
  private async mockUploadFile(
    file: File,
    _options: UploadOptions = {},
    onProgress?: (progress: UploadProgress) => void,
    abortSignal?: AbortSignal
  ): Promise<UploadResponse> {
    const fileId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const totalSize = file.size;
    let uploadedSize = 0;
    const startTime = Date.now();

    // Simulate upload progress
    const uploadChunk = async (chunkIndex: number): Promise<void> => {
      if (abortSignal?.aborted) {
        throw new Error('Upload cancelled');
      }

      const chunkSize = Math.min(1024 * 1024, totalSize - uploadedSize); // 1MB chunks
      uploadedSize += chunkSize;
      const percentage = Math.round((uploadedSize / totalSize) * 100);
      const elapsedTime = (Date.now() - startTime) / 1000;
      const speed = uploadedSize / elapsedTime;
      const remainingTime = speed > 0 ? (totalSize - uploadedSize) / speed : 0;

      if (onProgress) {
        onProgress({
          fileId,
          loaded: uploadedSize,
          total: totalSize,
          percentage,
          speed,
          remainingTime,
        });
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));

      if (uploadedSize < totalSize) {
        await uploadChunk(chunkIndex + 1);
      }
    };

    try {
      await uploadChunk(0);

      // Simulate final processing delay
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        success: true,
        documentId: `doc-${fileId}`,
        message: 'File uploaded successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Get all cabinets from Mayan EDMS
   */
  async getCabinets(params: CabinetQueryParams = {}): Promise<CabinetQueryResponse> {
    if (USE_MOCK_DATA) {
      return this.getMockCabinets(params);
    }

    try {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.page_size) searchParams.append('page_size', params.page_size.toString());
      if (params._ordering) searchParams.append('_ordering', params._ordering);

      const response = await fetch(`${API_BASE_URL}/cabinets/?${searchParams.toString()}`, {
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cabinets: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform Mayan cabinet data to our format
      const cabinets: Cabinet[] = (data.results || []).map((cabinet: any) => ({
        id: cabinet.id.toString(),
        label: cabinet.label || `Cabinet ${cabinet.id}`,
        created: cabinet.datetime_created || new Date().toISOString(),
        edited: cabinet.datetime_modified || cabinet.datetime_created || new Date().toISOString(),
        documentCount: 0, // Will be populated separately
        permissions: {
          canView: true,
          canEdit: true,
          canDelete: true,
          canAddDocuments: true,
          canRemoveDocuments: true,
        },
      }));

      return {
        count: data.count || cabinets.length,
        next: data.next || undefined,
        previous: data.previous || undefined,
        results: cabinets,
      };
    } catch (error) {
      console.error('Failed to fetch cabinets from Mayan:', error);
      return this.getMockCabinets(params);
    }
  }

  /**
   * Get documents in a specific cabinet
   */
  async getCabinetDocuments(cabinetId: string, params: DocumentQueryParams = {}): Promise<DocumentQueryResponse> {
    if (USE_MOCK_DATA) {
      return this.getMockCabinetDocuments(cabinetId, params);
    }

    try {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('page_size', params.limit.toString());
      if (params.searchQuery) searchParams.append('search', params.searchQuery);

      const response = await fetch(`${API_BASE_URL}/cabinets/${cabinetId}/documents/?${searchParams.toString()}`, {
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cabinet documents: ${response.statusText}`);
      }

      const data = await response.json();
      const documents = (data.results || data).map((doc: any) => ({
        id: doc.id.toString(),
        name: doc.label || `Document ${doc.id}`,
        type: this.getFileTypeFromName(doc.label || '') as Document['type'],
        status: 'published' as Document['status'],
        size: 0,
        dateCreated: doc.datetime_created,
        dateModified: doc.datetime_modified || doc.datetime_created,
        path: `/cabinet/${cabinetId}`,
        downloadUrl: `${API_BASE_URL}/documents/${doc.id}/files/`,
        thumbnail: this.getDocumentThumbnailUrl(doc.id.toString()),
        metadata: {
          tags: [],
          author: 'Unknown',
          version: 1,
          description: doc.description || '',
          language: 'en',
          keywords: [],
          customFields: {},
        },
        permissions: {
          canView: true,
          canEdit: true,
          canDelete: true,
          canShare: true,
        },
      }));

      return {
        documents,
        folders: [],
        totalCount: data.count || documents.length,
        hasMore: !!data.next,
        nextPage: data.next ? (params.page || 1) + 1 : undefined,
      };
    } catch (error) {
      console.error('Failed to fetch cabinet documents from Mayan:', error);
      return this.getMockCabinetDocuments(cabinetId, params);
    }
  }

  /**
   * Add document to cabinet
   */
  async addDocumentToCabinet(cabinetId: string, documentId: string): Promise<{ success: boolean; error?: string }> {
    if (USE_MOCK_DATA) {
      return { success: true };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/cabinets/${cabinetId}/documents/add/`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document: documentId,
        }),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to add document to cabinet: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to add document to cabinet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add document to cabinet',
      };
    }
  }

  /**
   * Remove document from cabinet
   */
  async removeDocumentFromCabinet(cabinetId: string, documentId: string): Promise<{ success: boolean; error?: string }> {
    if (USE_MOCK_DATA) {
      return { success: true };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/cabinets/${cabinetId}/documents/remove/`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document: documentId,
        }),
        signal: AbortSignal.timeout(API_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to remove document from cabinet: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to remove document from cabinet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove document from cabinet',
      };
    }
  }

  /**
   * Mock cabinets for development
   */
  private async getMockCabinets(params: CabinetQueryParams = {}): Promise<CabinetQueryResponse> {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));

    const mockCabinets: Cabinet[] = [
      {
        id: '1',
        label: 'Marketing Documents',
        created: '2024-01-15T10:00:00Z',
        edited: '2024-09-20T14:30:00Z',
        documentCount: 45,
        permissions: {
          canView: true,
          canEdit: true,
          canDelete: false,
          canAddDocuments: true,
          canRemoveDocuments: true,
        },
      },
      {
        id: '2',
        label: 'Legal Documents',
        created: '2024-02-01T09:00:00Z',
        edited: '2024-09-18T11:15:00Z',
        documentCount: 23,
        permissions: {
          canView: true,
          canEdit: true,
          canDelete: false,
          canAddDocuments: true,
          canRemoveDocuments: true,
        },
      },
      {
        id: '3',
        label: 'Financial Reports',
        created: '2024-03-10T15:30:00Z',
        edited: '2024-09-22T16:45:00Z',
        documentCount: 67,
        permissions: {
          canView: true,
          canEdit: false,
          canDelete: false,
          canAddDocuments: false,
          canRemoveDocuments: false,
        },
      },
      {
        id: '4',
        label: 'HR Documents',
        created: '2024-04-05T08:15:00Z',
        edited: '2024-09-21T13:20:00Z',
        documentCount: 89,
        permissions: {
          canView: true,
          canEdit: true,
          canDelete: true,
          canAddDocuments: true,
          canRemoveDocuments: true,
        },
      },
    ];

    // Apply pagination
    const page = params.page || 1;
    const pageSize = params.page_size || 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedCabinets = mockCabinets.slice(startIndex, endIndex);

    return {
      count: mockCabinets.length,
      next: endIndex < mockCabinets.length ? `page=${page + 1}` : undefined,
      previous: page > 1 ? `page=${page - 1}` : undefined,
      results: paginatedCabinets,
    };
  }

  /**
   * Get OCR results for a document
   */
  async getDocumentOCR(documentId: string): Promise<any> {
    try {
      const response = await fetch(
        `http://localhost:8001/api/v1/documents/${documentId}/ocr`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(API_TIMEOUT),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch OCR results: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to fetch OCR for document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Get events/audit trail for a document
   */
  async getDocumentEvents(documentId: string, page: number = 1, pageSize: number = 50): Promise<any> {
    try {
      const response = await fetch(
        `http://localhost:8001/api/v1/documents/${documentId}/events?page=${page}&page_size=${pageSize}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(API_TIMEOUT),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch document events: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to fetch events for document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Get full document details by ID from local API
   */
  async getDocumentDetails(documentId: string): Promise<any> {
    try {
      const response = await fetch(
        `http://localhost:8001/api/v1/documents/${documentId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(API_TIMEOUT),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch document details: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to fetch document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Get document metadata (custom fields)
   */
  async getDocumentMetadata(documentId: string): Promise<any> {
    try {
      const response = await fetch(
        `http://localhost:8001/api/v1/documents/${documentId}/metadata`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(API_TIMEOUT),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch document metadata: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to fetch metadata for document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Update document metadata (custom fields)
   */
  async updateDocumentMetadata(documentId: string, customFields: Record<string, any>): Promise<any> {
    try {
      const response = await fetch(
        `http://localhost:8001/api/v1/documents/${documentId}/metadata`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ custom_fields: customFields }),
          signal: AbortSignal.timeout(API_TIMEOUT),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update document metadata: ${response.statusText} - ${errorText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to update metadata for document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Get document version history
   */
  async getDocumentVersions(documentId: string): Promise<any[]> {
    try {
      const response = await fetch(
        `http://localhost:8001/api/v1/documents/${documentId}/versions`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(API_TIMEOUT),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch document versions: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Failed to fetch versions for document ${documentId}:`, error);
      throw error;
    }
  }
}

export const documentsService = new DocumentsService();
export default documentsService;
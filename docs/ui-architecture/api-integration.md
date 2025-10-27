# API Integration

## Service Template

```typescript
// src/services/api/documents.ts
import { apiClient } from './client';
import { mockDocumentService } from '../mocks/documents';
import type { Document, DocumentMetadata, UploadResponse } from '@/types/domain';

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export const documentService = {
  // Get all documents with filtering and pagination
  async getDocuments(params: {
    page?: number;
    limit?: number;
    search?: string;
    filters?: Record<string, any>;
  }): Promise<{ documents: Document[]; total: number; hasMore: boolean }> {
    if (USE_MOCK_DATA) {
      return mockDocumentService.getDocuments(params);
    }
    const response = await apiClient.get('/api/documents', { params });
    return response.data;
  },

  // Upload single or multiple documents
  async uploadDocuments(
    files: File[],
    metadata: Partial<DocumentMetadata>,
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse[]> {
    if (USE_MOCK_DATA) {
      return mockDocumentService.uploadDocuments(files, metadata, onProgress);
    }

    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });
    formData.append('metadata', JSON.stringify(metadata));

    const response = await apiClient.post('/api/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          onProgress(progress);
        }
      },
    });
    return response.data;
  },
};
```

## API Client Configuration

```typescript
// src/services/api/client.ts
import axios from 'axios';
import { store } from '@/store';
import { logout } from '@/store/slices/authSlice';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor for authentication
apiClient.interceptors.request.use((config) => {
  const state = store.getState();
  const token = state.auth.token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);
```

**Key API Integration Features:**
- **Mock-First Development**: Seamless switching between mock and real APIs
- **Authentication Ready**: JWT token handling and session management
- **Error Handling**: Comprehensive error handling with user notifications
- **File Operations**: Upload/download with progress tracking
- **Type Safety**: Full TypeScript integration
- **RTK Query Integration**: Cache management and optimistic updates

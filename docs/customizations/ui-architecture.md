# PIE DOCS Frontend Architecture Document

## Template and Framework Selection

Based on your comprehensive PRD and front-end specifications, I can see you have clearly specified:

**Framework Requirements from PRD:**
- React 18+ with TypeScript (explicitly no Next.js)
- Tailwind CSS for styling
- Progressive Web App (PWA) capabilities
- Bilingual support (Arabic RTL/English LTR)
- Integration-ready for Mayan EDMS backend and SPAN physical tracking

**Mockup Development Strategy:**
For immediate mockup development with future backend readiness, I recommend using **Vite + React + TypeScript** as the foundation. This provides:

1. **Rapid Development**: Vite's fast HMR for quick mockup iterations
2. **Modern Tooling**: Built-in TypeScript support and optimized bundling
3. **No Framework Lock-in**: Pure React without Next.js constraints as specified
4. **Backend-Ready**: Clean separation allowing easy API integration later
5. **PWA Support**: Built-in PWA capabilities for mobile mockups

**Starter Template Decision:**
I'll design the architecture around a **custom Vite + React + TypeScript setup** rather than a pre-built template, giving us:
- Complete control over the structure for your specific EDMS requirements
- Tailwind CSS integration with RTL support
- Mock data services that can be easily swapped for real APIs
- Component structure optimized for your 6 epic workflow

### Change Log
| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-01-20 | 1.0 | Initial frontend architecture for mockup development with backend readiness | Architect Winston |
| 2025-09-20 | 1.1 | Updated with comprehensive component standards, state management, and project structure | Winston (Architect) |

## Frontend Tech Stack

### Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Framework | React | 18.2+ | Core UI framework for component-based architecture | Industry standard, excellent TypeScript support, huge ecosystem for EDMS components |
| Build Tool | Vite | 5.0+ | Fast development server and optimized bundling | 10x faster than CRA, excellent for rapid mockup iterations, built-in TypeScript support |
| Language | TypeScript | 5.0+ | Type safety and enterprise-grade development experience | Essential for complex EDMS workflows, better IDE support, reduces bugs in large codebase |
| Styling | Tailwind CSS | 3.4+ | Utility-first CSS framework with RTL support | Rapid UI development, excellent RTL support for Arabic, consistent design system |
| State Management | Redux Toolkit + RTK Query | 2.0+ | Predictable state management with built-in data fetching | Industry standard for complex state, RTK Query perfect for API mocking and real integration |
| Routing | React Router | 6.8+ | Client-side routing with lazy loading support | Standard React routing, supports protected routes and lazy loading for performance |
| UI Components | Headless UI + Custom Components | 1.7+ | Unstyled, accessible components with custom EDMS components | Perfect with Tailwind, accessibility built-in, allows custom enterprise components |
| Internationalization | React i18next | 13.0+ | Comprehensive i18n with RTL support | Best-in-class i18n for React, excellent RTL support, namespace organization |
| Form Handling | React Hook Form + Zod | 7.45+ | Performant forms with TypeScript schema validation | Best performance, TypeScript integration, complex enterprise form support |
| Animation | Framer Motion | 10.0+ | Smooth animations and micro-interactions | Excellent React integration, gesture support for mobile, smooth performance |
| Testing | Vitest + React Testing Library | 1.0+ | Fast unit testing with React component testing | Native Vite integration, Jest-compatible API, faster than Jest |
| Dev Tools | React DevTools, Redux DevTools, ESLint, Prettier | Latest | Development productivity and code quality | Essential React development tools, consistent code formatting |

## Project Structure

Based on the chosen Vite + React + TypeScript stack and your EDMS requirements, here's the optimized project structure for mockup development with backend readiness:

```
pie-docs-frontend/
├── public/
│   ├── icons/                     # PWA icons and favicons
│   ├── mockups/                   # Static mockup assets
│   └── manifest.json              # PWA manifest
├── src/
│   ├── components/                # Reusable UI components
│   │   ├── common/               # Shared components (Button, Modal, etc.)
│   │   ├── layout/               # Layout components (Sidebar, Header, etc.)
│   │   ├── forms/                # Form-specific components
│   │   ├── documents/            # Document-related components
│   │   ├── search/               # Search and AI chat components
│   │   ├── workflows/            # Workflow and task components
│   │   ├── physical/             # Physical document tracking components
│   │   └── analytics/            # Analytics and reporting components
│   ├── pages/                    # Page-level components (route components)
│   │   ├── auth/                 # Authentication pages
│   │   ├── dashboard/            # Dashboard pages
│   │   ├── documents/            # Document management pages
│   │   ├── search/               # Search and AI pages
│   │   ├── tasks/                # Task and workflow pages
│   │   ├── physical/             # Physical document pages
│   │   ├── analytics/            # Analytics pages
│   │   └── admin/                # Administrative pages
│   ├── services/                 # API services and data layer
│   │   ├── api/                  # API client configuration
│   │   ├── mock/                 # Mock data and services (for development)
│   │   ├── types/                # TypeScript type definitions
│   │   └── utils/                # Service utilities
│   ├── store/                    # Redux store configuration
│   │   ├── slices/               # Redux slices for different features
│   │   ├── middleware/           # Custom middleware
│   │   └── index.ts              # Store configuration
│   ├── hooks/                    # Custom React hooks
│   │   ├── api/                  # API-related hooks
│   │   ├── ui/                   # UI-related hooks
│   │   └── auth/                 # Authentication hooks
│   ├── utils/                    # Utility functions
│   │   ├── constants/            # Application constants
│   │   ├── helpers/              # Helper functions
│   │   ├── validation/           # Form validation schemas
│   │   └── i18n/                 # Internationalization utilities
│   ├── assets/                   # Static assets
│   │   ├── images/               # Images and graphics
│   │   ├── icons/                # SVG icons
│   │   └── fonts/                # Custom fonts (Arabic, etc.)
│   ├── styles/                   # Global styles and Tailwind config
│   │   ├── globals.css           # Global CSS and Tailwind imports
│   │   ├── components.css        # Component-specific styles
│   │   └── themes/               # Theme configurations
│   ├── locales/                  # Translation files
│   │   ├── en/                   # English translations
│   │   └── ar/                   # Arabic translations
│   ├── App.tsx                   # Main App component
│   ├── main.tsx                  # Application entry point
│   └── vite-env.d.ts            # Vite environment types
├── tests/                        # Test files
│   ├── components/               # Component tests
│   ├── pages/                    # Page tests
│   ├── services/                 # Service tests
│   └── utils/                    # Utility tests
├── docs/                         # Documentation
├── .env.example                  # Environment variables template
├── .env.local                    # Local environment variables
├── tailwind.config.js            # Tailwind CSS configuration
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies and scripts
└── README.md                    # Project documentation
```

## Component Standards

### Component Template

```typescript
import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/helpers/classNames';

// TypeScript interface for component props
interface ComponentNameProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
  // Add specific props for your component
}

// Default props for consistent behavior
const defaultProps: Partial<ComponentNameProps> = {
  variant: 'primary',
  size: 'md',
  disabled: false,
  isLoading: false,
};

// Main component with TypeScript and i18n support
export const ComponentName: React.FC<ComponentNameProps> = (props) => {
  const {
    children,
    className,
    variant,
    size,
    disabled,
    isLoading,
    onClick,
    ...restProps
  } = { ...defaultProps, ...props };

  const { t } = useTranslation('common'); // Namespace for translations

  // Base classes with Tailwind CSS
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

  // Variant classes for different states
  const variantClasses = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    ghost: 'text-slate-900 hover:bg-slate-100',
  };

  // Size classes for consistent spacing
  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4',
    lg: 'h-12 px-6 text-lg',
  };

  // Combine classes using cn utility
  const componentClasses = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  return (
    <button
      className={componentClasses}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...restProps}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin ltr:mr-2 rtl:ml-2" />
      ) : null}
      {children}
    </button>
  );
};

// Export default for easy importing
export default ComponentName;

// Named export for component testing
export type { ComponentNameProps };
```

### Naming Conventions

**File and Component Names:**
- **Components**: PascalCase for component names (`DocumentViewer`, `UploadZone`, `SearchInterface`)
- **Files**: PascalCase for component files (`DocumentViewer.tsx`, `UploadZone.tsx`)
- **Directories**: lowercase with hyphens (`document-viewer/`, `upload-zone/`)
- **Hooks**: camelCase with `use` prefix (`useDocumentUpload`, `useSearchQuery`)
- **Utilities**: camelCase (`formatFileSize`, `validateDocumentType`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_FILE_SIZE`, `SUPPORTED_FORMATS`)

**Redux State Management:**
- **Slices**: camelCase (`documentsSlice`, `authSlice`, `workflowSlice`)
- **Actions**: camelCase with descriptive verbs (`uploadDocument`, `searchDocuments`, `updateMetadata`)
- **Selectors**: camelCase with `select` prefix (`selectCurrentUser`, `selectDocuments`)

**API and Services:**
- **Services**: camelCase with service suffix (`documentService`, `authService`)
- **API Endpoints**: camelCase (`getDocuments`, `uploadDocument`, `updateWorkflow`)
- **Types**: PascalCase with descriptive suffixes (`DocumentType`, `UserRole`, `UploadResponse`)

**Internationalization:**
- **Namespace**: kebab-case (`common`, `documents`, `search-ai`, `workflows`)
- **Translation Keys**: dot notation (`documents.upload.title`, `errors.network.message`)

## State Management Architecture

### Store Structure (Redux Toolkit)

```
src/store/
├── store.ts                        # Root store configuration
├── rootReducer.ts                  # Combined reducers
├── middleware.ts                   # Custom middleware
├── slices/                         # Redux Toolkit slices
│   ├── authSlice.ts               # Authentication state
│   ├── documentsSlice.ts          # Document management state
│   ├── workflowsSlice.ts          # Workflow state
│   ├── physicalSlice.ts           # Physical document tracking
│   ├── searchSlice.ts             # Search and NLP state
│   ├── uiSlice.ts                 # UI state (modals, notifications)
│   ├── settingsSlice.ts           # User preferences and settings
│   └── index.ts                   # Slice exports
├── api/                           # RTK Query API slices
│   ├── baseApi.ts                 # Base API configuration
│   ├── authApi.ts                 # Authentication endpoints
│   ├── documentsApi.ts            # Document CRUD operations
│   ├── workflowsApi.ts            # Workflow management
│   ├── physicalApi.ts             # Physical tracking endpoints
│   ├── nlpApi.ts                  # RAG/NLP query endpoints
│   ├── usersApi.ts                # User management
│   ├── analyticsApi.ts            # Analytics and reporting
│   └── index.ts                   # API exports
├── selectors/                     # Reusable selectors
│   ├── authSelectors.ts
│   ├── documentsSelectors.ts
│   └── index.ts
├── types/                         # Store-specific types
│   ├── store.ts                   # RootState and AppDispatch
│   ├── api.ts                     # API response types
│   └── index.ts
└── utils/                         # Store utilities
    ├── persistConfig.ts           # Redux persist configuration
    ├── listeners.ts               # Middleware listeners
    └── index.ts
```

### Documents Slice Example

```typescript
// src/store/slices/documentsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../types/store';

interface DocumentsState {
  // List management
  selectedDocuments: string[];
  viewMode: 'grid' | 'list' | 'tree';
  sortBy: 'name' | 'date' | 'size' | 'relevance';
  sortOrder: 'asc' | 'desc';

  // Filtering and search
  filters: {
    documentType: string[];
    dateRange: { start: Date | null; end: Date | null };
    status: string[];
    tags: string[];
  };
  searchQuery: string;

  // Upload state
  uploadQueue: UploadItem[];
  uploadProgress: Record<string, number>;

  // UI state
  isLoading: boolean;
  error: string | null;
  notifications: Notification[];

  // Current document
  currentDocument: Document | null;
  documentHistory: string[];
}

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    selectDocument: (state, action: PayloadAction<string>) => {
      // Implementation with Immer immutable updates
    },
    setViewMode: (state, action: PayloadAction<'grid' | 'list' | 'tree'>) => {
      state.viewMode = action.payload;
    },
    // ... additional reducers
  },
});

export const { selectDocument, setViewMode } = documentsSlice.actions;
export default documentsSlice.reducer;
```

**Key State Management Principles:**
- **Predictable State Updates**: Immutable updates using Redux Toolkit
- **Type Safety**: Full TypeScript integration with proper typing
- **Performance**: Optimized selectors and memoization
- **Scalability**: Modular slice organization for different domains
- **Mockup-Ready**: State structure supports all 36 features demonstration
- **Backend Integration**: Clean separation for API state management

## API Integration

### Service Template

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

### API Client Configuration

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

## Routing

### Route Configuration

```typescript
// src/pages/routing/AppRoutes.tsx
import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { RoleGuard } from '@/components/auth/RoleGuard';

// Lazy-loaded page components
const DashboardPage = React.lazy(() => import('@/pages/dashboard/DashboardPage'));
const DocumentLibrary = React.lazy(() => import('@/pages/documents/DocumentLibrary'));
const SearchPage = React.lazy(() => import('@/pages/search/SearchPage'));
const WorkflowDesigner = React.lazy(() => import('@/pages/workflows/WorkflowDesigner'));

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <DashboardPage />
            </AuthGuard>
          }
        />
        <Route
          path="/documents"
          element={
            <AuthGuard>
              <DocumentLibrary />
            </AuthGuard>
          }
        />
        <Route
          path="/workflows/designer"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={['admin', 'workflow_manager']}>
                <WorkflowDesigner />
              </RoleGuard>
            </AuthGuard>
          }
        />
        {/* Additional routes... */}
      </Routes>
    </Suspense>
  );
};
```

**Key Routing Features:**
- **Lazy Loading**: Code-split pages for optimal performance
- **Authentication Guards**: Protected routes with role-based access
- **Nested Routes**: Hierarchical navigation supporting all 36 features
- **Mobile-Friendly**: PWA navigation patterns

## Styling Guidelines

### Global Theme Variables

```css
/* src/styles/themes/global-theme.css */
:root {
  /* Primary Brand Colors */
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;

  /* Typography */
  --font-sans: 'Inter', sans-serif;
  --font-arabic: 'Noto Sans Arabic', sans-serif;

  /* Spacing */
  --spacing-4: 1rem;
  --spacing-6: 1.5rem;

  /* Component Heights */
  --button-height-md: 2.5rem;
  --input-height-md: 2.5rem;
}

/* Dark Mode */
[data-theme="dark"] {
  --color-primary-500: #60a5fa;
  --color-neutral-900: #f4f4f5;
}

/* RTL Support */
[dir="rtl"] {
  --font-primary: var(--font-arabic);
}
```

**Key Styling Features:**
- **CSS Custom Properties**: Runtime theme switching
- **Bilingual Typography**: Arabic and English font optimization
- **RTL/LTR Support**: Automatic layout adaptation
- **Dark Mode Ready**: Complete theme implementation
- **Accessibility**: WCAG 2.1 AA compliance

## Testing Requirements

### Component Test Template

```typescript
// src/tests/components/DocumentViewer.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentViewer } from '@/components/domain/DocumentViewer';

describe('DocumentViewer Component', () => {
  it('renders document viewer with document title', () => {
    render(<DocumentViewer documentId="doc-123" />);
    expect(screen.getByTestId('document-viewer')).toBeInTheDocument();
  });

  it('handles zoom controls', async () => {
    render(<DocumentViewer documentId="doc-123" />);
    const zoomInButton = screen.getByLabelText('Zoom in');
    fireEvent.click(zoomInButton);
    expect(screen.getByText('110%')).toBeInTheDocument();
  });

  it('supports keyboard navigation', () => {
    render(<DocumentViewer documentId="doc-123" />);
    const viewer = screen.getByTestId('document-viewer');
    fireEvent.keyDown(viewer, { key: '+', ctrlKey: true });
    expect(screen.getByText('110%')).toBeInTheDocument();
  });
});
```

**Testing Best Practices:**
- **Unit Tests**: Component isolation with mocked dependencies
- **Integration Tests**: Component interactions and workflows
- **E2E Tests**: Critical user flows with Cypress/Playwright
- **Accessibility Tests**: WCAG compliance and keyboard navigation
- **Performance Tests**: Large dataset rendering and memory usage

## Environment Configuration

### Development Environment

```bash
# === APPLICATION CONFIGURATION ===
VITE_APP_NAME="PIE DOCS Frontend"
VITE_APP_ENVIRONMENT="development"

# === API CONFIGURATION ===
VITE_API_BASE_URL="http://localhost:8000"
VITE_MAYAN_EDMS_API_URL="http://localhost:8001/api/v4"
VITE_SPAN_PHYSICAL_API_URL="http://localhost:8002/api/v1"
VITE_NLP_RAG_API_URL="http://localhost:8003/api/v1"

# === MOCK DATA CONFIGURATION ===
VITE_USE_MOCK_DATA="true"
VITE_MOCK_API_DELAY="500"

# === FEATURES ===
VITE_PWA_ENABLED="true"
VITE_OCR_ENABLED="true"
VITE_NLP_QUERY_ENABLED="true"
VITE_WORKFLOW_DESIGNER_ENABLED="true"

# === INTERNATIONALIZATION ===
VITE_DEFAULT_LANGUAGE="en"
VITE_SUPPORTED_LANGUAGES="en,ar"
VITE_RTL_LANGUAGES="ar"
```

**Key Environment Features:**
- **Mock-to-Production Toggle**: Seamless API switching
- **Feature Flags**: Granular feature control
- **Multi-Service Integration**: Separate service configurations
- **Security Settings**: Configurable policies and encryption

## Frontend Developer Standards

### Critical Coding Rules

```typescript
// ✅ ALWAYS use strict TypeScript interfaces
interface DocumentMetadata {
  id: string;
  title: string;
  createdAt: Date;
  status: 'draft' | 'review' | 'approved';
}

// ✅ ALWAYS use Redux Toolkit for state updates
const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    selectDocument: (state, action: PayloadAction<string>) => {
      state.selectedDocuments.push(action.payload);
    },
  },
});

// ✅ ALWAYS memoize expensive calculations
const DocumentList = ({ documents, filters }) => {
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc =>
      filters.every(filter => applyFilter(doc, filter))
    );
  }, [documents, filters]);

  return <div>{/* render */}</div>;
};

// ✅ ALWAYS include proper ARIA labels
const DocumentViewer = () => {
  return (
    <main role="main" aria-label="Document viewer">
      <button aria-label="Zoom in" onClick={handleZoomIn}>+</button>
    </main>
  );
};

// ✅ ALWAYS use translation keys
const DocumentActions = () => {
  const { t } = useTranslation('documents');
  return <button>{t('actions.download')}</button>;
};
```

### Quick Reference

**Common Commands:**
```bash
npm run dev          # Development server
npm run build        # Production build
npm run test         # Run tests
npm run type-check   # TypeScript validation
npm run lint         # Code linting
```

**Import Patterns:**
```typescript
// Absolute imports
import { Button } from '@/components/ui/Button';
import { useDocuments } from '@/hooks/useDocuments';
import type { Document } from '@/types/domain';
```

**File Naming:**
- Components: `PascalCase.tsx`
- Hooks: `camelCase.ts`
- Services: `camelCase.ts`
- Types: `PascalCase.ts`

---

## Summary

This PIE DOCS Frontend Architecture provides a comprehensive, mockup-ready foundation that:

✅ **Supports All 36 Features** from the PRD across 6 epic areas
✅ **Backend Integration Ready** with clean service layer separation
✅ **Enterprise-Grade Quality** with TypeScript, testing, and accessibility
✅ **Bilingual Excellence** with Arabic RTL/English LTR support
✅ **Performance Optimized** with lazy loading, memoization, and PWA capabilities
✅ **Developer Experience** with modern tooling and comprehensive standards

The architecture enables immediate mockup development while ensuring seamless transition to production with Mayan EDMS, SPAN physical tracking, and RAG-based NLP services.
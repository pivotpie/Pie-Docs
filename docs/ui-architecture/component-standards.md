# Component Standards

## Component Template

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

## Naming Conventions

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

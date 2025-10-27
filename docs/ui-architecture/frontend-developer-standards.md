# Frontend Developer Standards

## Critical Coding Rules

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

## Quick Reference

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

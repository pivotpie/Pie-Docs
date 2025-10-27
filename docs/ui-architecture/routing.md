# Routing

## Route Configuration

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

import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthGuard from '@/components/auth/AuthGuard'
import MainLayout from '@/components/layout/MainLayout'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorPage from '@/pages/error/ErrorPage'
import LoginPage from '@/pages/auth/LoginPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import OnboardingPage from '@/pages/auth/OnboardingPage'

// Lazy-loaded components for code splitting
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const EnhancedDashboard = lazy(() => import('@/pages/dashboard/EnhancedDashboard'))
const ModernDashboard = lazy(() => import('@/pages/dashboard/ModernDashboard'))
const ExecutiveDashboard = lazy(() => import('@/pages/analytics/ExecutiveDashboard'))
const DashboardBuilderPage = lazy(() => import('@/pages/dashboard-builder/DashboardBuilderPage'))
const DocumentsPage = lazy(() => import('@/pages/documents/DocumentsPage'))
const MayanDocumentLibrary = lazy(() => import('@/pages/documents/MayanDocumentLibrary'))
const AdvancedDocumentLibrary = lazy(() => import('@/pages/documents/AdvancedDocumentLibrary'))
const AdvancedDocumentLibraryV2 = lazy(() => import('@/pages/documents/AdvancedDocumentLibraryV2'))
const AdvancedDocumentLibraryV3 = lazy(() => import('@/pages/documents/AdvancedDocumentLibraryV3'))
const SearchPage = lazy(() => import('@/pages/search/SearchPage'))
const AIChatPage = lazy(() => import('@/pages/chat/AIChatPage'))
const WorkflowsPage = lazy(() => import('@/pages/workflows/WorkflowsPage'))
const WorkflowDesigner = lazy(() => import('@/pages/workflows/WorkflowDesigner'))
const ApprovalsPage = lazy(() => import('@/pages/approvals/ApprovalsPage'))
const PhysicalDocsPage = lazy(() => import('@/pages/physical/PhysicalDocsPage'))
const WarehouseManagementPage = lazy(() => import('@/pages/warehouse/WarehouseManagementPage'))
const MetadataTest = lazy(() => import('@/components/testing/MetadataTest'))
const MetadataValidationTest = lazy(() => import('@/components/testing/MetadataValidationTest'))
const AIExtractionTest = lazy(() => import('@/components/testing/AIExtractionTest'))
const MetadataUploadPage = lazy(() => import('@/pages/documents/MetadataUploadPage'))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'))

const AppRoutes = () => {
  const { t } = useTranslation('common');

  // Enhanced loading fallback component
  const PageLoadingFallback = () => (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner
        size="lg"
        message={t('loading')}
        className="text-center"
      />
    </div>
  );
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Semi-protected route - onboarding for authenticated users */}
      <Route path="/onboarding" element={<OnboardingPage />} />

      {/* Protected routes with MainLayout */}
      {/* Main Dashboard - Modern Analytics Dashboard */}
      <Route
        path="/dashboard"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <ModernDashboard />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />

      {/* Enhanced Dashboard (old default) */}
      <Route
        path="/dashboard/enhanced"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <EnhancedDashboard />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />

      {/* Legacy dashboard route for comparison/fallback */}
      <Route
        path="/dashboard/legacy"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <DashboardPage />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/documents"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <AdvancedDocumentLibraryV3 />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/documents/legacy"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <DocumentsPage />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/documents/mayan"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <MayanDocumentLibrary />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/documents/advanced"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <AdvancedDocumentLibrary />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/documents/advanced-v2"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <AdvancedDocumentLibraryV2 />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/documents/advanced-v3"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <AdvancedDocumentLibraryV3 />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/documents/metadata-upload"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <MetadataUploadPage />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/search"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <AIChatPage />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/search-legacy"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <SearchPage />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/workflows"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <WorkflowsPage />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/workflows/designer"
        element={
          <AuthGuard>
            <Suspense fallback={<PageLoadingFallback />}>
              <WorkflowDesigner />
            </Suspense>
          </AuthGuard>
        }
      />
      <Route
        path="/approvals"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <ApprovalsPage />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/analytics"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <ExecutiveDashboard />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/physical"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <PhysicalDocsPage />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/warehouse"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <WarehouseManagementPage />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/settings"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <SettingsPage />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/test-metadata"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <MetadataTest />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/test-metadata-validation"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <MetadataValidationTest />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />
      <Route
        path="/test-ai-extraction"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoadingFallback />}>
                <AIExtractionTest />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />

      {/* Dashboard Builder Routes */}
      <Route
        path="/dashboard-builder"
        element={
          <AuthGuard>
            <Suspense fallback={<PageLoadingFallback />}>
              <DashboardBuilderPage />
            </Suspense>
          </AuthGuard>
        }
      />
      <Route
        path="/dashboard-builder/:dashboardId"
        element={
          <AuthGuard>
            <Suspense fallback={<PageLoadingFallback />}>
              <DashboardBuilderPage />
            </Suspense>
          </AuthGuard>
        }
      />

      {/* Default redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 Error Page */}
      <Route path="*" element={<ErrorPage errorCode="404" />} />
    </Routes>
  )
}

export default AppRoutes
import { screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { renderWithProviders } from '@/test/testUtils'
import AppRoutes from '@/pages/routing/AppRoutes'

// Mock the lazy-loaded components to avoid async issues in tests
vi.mock('@/pages/dashboard/DashboardPage', () => ({
  default: () => <div>Dashboard Page</div>
}))

vi.mock('@/pages/documents/DocumentsPage', () => ({
  default: () => <div>Documents Page</div>
}))

vi.mock('@/pages/search/SearchPage', () => ({
  default: () => <div>Search Page</div>
}))

vi.mock('@/pages/workflows/WorkflowsPage', () => ({
  default: () => <div>Workflows Page</div>
}))

describe('AppRoutes', () => {
  it('should redirect to dashboard when accessing root path with authentication', async () => {
    renderWithProviders(<AppRoutes />, true, ['/'])

    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
    })
  })

  it('should show login page when accessing root path without authentication', () => {
    renderWithProviders(<AppRoutes />, false, ['/'])

    expect(screen.getByRole('button', { name: /sign in$/i })).toBeInTheDocument()
  })

  it('should show login page when accessing protected route without authentication', () => {
    renderWithProviders(<AppRoutes />, false, ['/dashboard'])

    expect(screen.getByRole('button', { name: /sign in$/i })).toBeInTheDocument()
  })

  it('should show dashboard page when authenticated and accessing /dashboard', async () => {
    renderWithProviders(<AppRoutes />, true, ['/dashboard'])

    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
    })
  })

  it('should show documents page when authenticated and accessing /documents', async () => {
    renderWithProviders(<AppRoutes />, true, ['/documents'])

    await waitFor(() => {
      expect(screen.getByText('Documents Page')).toBeInTheDocument()
    })
  })

  it('should show search page when authenticated and accessing /search', async () => {
    renderWithProviders(<AppRoutes />, true, ['/search'])

    await waitFor(() => {
      expect(screen.getByText('Search Page')).toBeInTheDocument()
    })
  })

  it('should show workflows page when authenticated and accessing /workflows', async () => {
    renderWithProviders(<AppRoutes />, true, ['/workflows'])

    await waitFor(() => {
      expect(screen.getByText('Workflows Page')).toBeInTheDocument()
    })
  })

  it('should show login page when accessing /login route', () => {
    renderWithProviders(<AppRoutes />, false, ['/login'])

    expect(screen.getByRole('button', { name: /sign in$/i })).toBeInTheDocument()
  })

  it('should show 404 page for unknown routes', async () => {
    renderWithProviders(<AppRoutes />, true, ['/unknown-route'])

    await waitFor(() => {
      expect(screen.getByText('404')).toBeInTheDocument()
    })
  })
})
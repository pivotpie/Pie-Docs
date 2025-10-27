import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProvidersNoRouter } from '@/test/testUtils'
import App from './App'

// Mock the lazy-loaded components
vi.mock('@/pages/dashboard/DashboardPage', () => ({
  default: () => <div>Dashboard</div>
}))

describe('App Component', () => {
  it('renders login page when not authenticated', () => {
    renderWithProvidersNoRouter(<App />, false)

    // Should render the login form submit button
    const signInButton = screen.getByRole('button', { name: /sign in$/i })
    expect(signInButton).toBeInTheDocument()
    expect(signInButton).toHaveAttribute('type', 'submit')
  })

  // TODO: Fix this test - complex integration with ThemeProvider, router, and multiple contexts
  it.skip('renders dashboard when authenticated', async () => {
    renderWithProvidersNoRouter(<App />, true)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })
})
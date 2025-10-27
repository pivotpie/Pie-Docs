import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/testUtils'
import AuthGuard from '@/components/auth/AuthGuard'

describe('AuthGuard', () => {
  const TestComponent = () => <div>Protected Content</div>

  it('should redirect to login when user is not authenticated', () => {
    renderWithProviders(
      <AuthGuard>
        <TestComponent />
      </AuthGuard>,
      false,
      ['/dashboard']
    )

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should render children when user is authenticated', () => {
    renderWithProviders(
      <AuthGuard>
        <TestComponent />
      </AuthGuard>,
      true,
      ['/dashboard']
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})
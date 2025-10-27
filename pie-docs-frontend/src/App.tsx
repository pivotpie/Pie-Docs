import { BrowserRouter } from 'react-router-dom'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import AppRoutes from '@/pages/routing/AppRoutes'
import { ThemeProvider } from '@/contexts/ThemeContext'

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <div className="min-h-screen">
            <AppRoutes />
          </div>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App

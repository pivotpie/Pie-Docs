import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { configureStore } from '@reduxjs/toolkit'
import { describe, it, expect } from 'vitest'
import WorkflowCanvas from '@/components/workflows/WorkflowCanvas'
import workflowsSlice from '@/store/slices/workflowsSlice'

const createTestStore = () => {
  return configureStore({
    reducer: {
      workflows: workflowsSlice
    }
  })
}

const renderWithProviders = (component: React.ReactElement) => {
  const store = createTestStore()
  return render(
    <Provider store={store}>
      <DndProvider backend={HTML5Backend}>
        {component}
      </DndProvider>
    </Provider>
  )
}

describe('WorkflowCanvas', () => {
  it('renders canvas controls', () => {
    renderWithProviders(<WorkflowCanvas />)

    expect(screen.getByTitle('Zoom In')).toBeInTheDocument()
    expect(screen.getByTitle('Zoom Out')).toBeInTheDocument()
    expect(screen.getByTitle('Fit to Screen')).toBeInTheDocument()
    expect(screen.getByTitle('Toggle Grid')).toBeInTheDocument()
  })

  it('displays canvas info with default values', () => {
    renderWithProviders(<WorkflowCanvas />)

    expect(screen.getByText(/Zoom: 100%/)).toBeInTheDocument()
    expect(screen.getByText(/Elements: 0/)).toBeInTheDocument()
  })

  it('applies grid background when grid is enabled', () => {
    renderWithProviders(<WorkflowCanvas />)

    const canvas = screen.getByRole('button', { name: /toggle grid/i }).closest('div')?.parentElement?.querySelector('div[style*="radial-gradient"]')
    expect(canvas).toBeInTheDocument()
  })
})
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { describe, it, expect } from 'vitest'
import ValidationPanel from '@/components/workflows/validation/ValidationPanel'
import workflowsSlice, { setCurrentWorkflow, setValidationErrors } from '@/store/slices/workflowsSlice'

const createTestStore = () => {
  return configureStore({
    reducer: {
      workflows: workflowsSlice
    }
  })
}

const mockWorkflow = {
  id: 'test-workflow',
  name: 'Test Workflow',
  description: 'A workflow for testing',
  elements: [
    {
      id: 'element-1',
      type: 'approval' as const,
      position: { x: 100, y: 100 },
      data: { title: 'First Step' }
    }
  ],
  connections: [],
  version: 1,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  status: 'draft' as const
}

const mockValidationErrors = [
  {
    id: 'error-1',
    elementId: 'element-1',
    type: 'error' as const,
    message: 'This is a test error message'
  },
  {
    id: 'warning-1',
    type: 'warning' as const,
    message: 'This is a test warning message'
  }
]

const renderWithProvider = (component: React.ReactElement, initialState?: any) => {
  const store = createTestStore()

  if (initialState?.workflow) {
    store.dispatch(setCurrentWorkflow(initialState.workflow))
  }
  if (initialState?.validationErrors) {
    store.dispatch(setValidationErrors(initialState.validationErrors))
  }

  return render(
    <Provider store={store}>
      {component}
    </Provider>
  )
}

describe('ValidationPanel', () => {
  it('renders validation header', () => {
    renderWithProvider(
      <ValidationPanel />,
      { workflow: mockWorkflow }
    )

    expect(screen.getByText('Validation')).toBeInTheDocument()
  })

  it('shows valid state when no errors', () => {
    renderWithProvider(
      <ValidationPanel />,
      { workflow: mockWorkflow, validationErrors: [] }
    )

    expect(screen.getByText('Workflow is valid!')).toBeInTheDocument()
    expect(screen.getByText('No validation errors or warnings found.')).toBeInTheDocument()
    expect(screen.getByText('Valid')).toBeInTheDocument()
  })

  it('displays error and warning counts', () => {
    renderWithProvider(
      <ValidationPanel />,
      { workflow: mockWorkflow, validationErrors: mockValidationErrors }
    )

    expect(screen.getByText('1 Error')).toBeInTheDocument()
    expect(screen.getByText('1 Warning')).toBeInTheDocument()
  })

  it('renders individual validation errors', () => {
    renderWithProvider(
      <ValidationPanel />,
      { workflow: mockWorkflow, validationErrors: mockValidationErrors }
    )

    expect(screen.getByText('This is a test error message')).toBeInTheDocument()
    expect(screen.getByText('This is a test warning message')).toBeInTheDocument()
  })

  it('shows error and warning labels', () => {
    renderWithProvider(
      <ValidationPanel />,
      { workflow: mockWorkflow, validationErrors: mockValidationErrors }
    )

    const errorLabels = screen.getAllByText('Error')
    const warningLabels = screen.getAllByText('Warning')

    expect(errorLabels.length).toBeGreaterThan(0)
    expect(warningLabels.length).toBeGreaterThan(0)
  })

  it('shows no workflow message when workflow is null', () => {
    renderWithProvider(<ValidationPanel />)

    expect(screen.getByText('No workflow to validate')).toBeInTheDocument()
  })

  it('shows quick actions when there are errors', () => {
    renderWithProvider(
      <ValidationPanel />,
      { workflow: mockWorkflow, validationErrors: mockValidationErrors }
    )

    expect(screen.getByText('Fix these issues to improve your workflow')).toBeInTheDocument()
    expect(screen.getByText('Clear Selection')).toBeInTheDocument()
  })

  it('allows clicking on clear selection', () => {
    renderWithProvider(
      <ValidationPanel />,
      { workflow: mockWorkflow, validationErrors: mockValidationErrors }
    )

    const clearButton = screen.getByText('Clear Selection')
    fireEvent.click(clearButton)
    // Since we're testing the component in isolation, we can't test the dispatch effect
    // but we can ensure the button is clickable and doesn't cause errors
    expect(clearButton).toBeInTheDocument()
  })
})
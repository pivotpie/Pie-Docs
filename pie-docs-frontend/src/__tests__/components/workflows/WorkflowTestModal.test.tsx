import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { describe, it, expect, beforeEach } from 'vitest'
import WorkflowTestModal from '@/components/workflows/testing/WorkflowTestModal'
import workflowsSlice, { setCurrentWorkflow } from '@/store/slices/workflowsSlice'

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
    },
    {
      id: 'element-2',
      type: 'review' as const,
      position: { x: 300, y: 100 },
      data: { title: 'Second Step' }
    }
  ],
  connections: [
    {
      id: 'connection-1',
      sourceId: 'element-1',
      targetId: 'element-2'
    }
  ],
  version: 1,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  status: 'draft' as const
}

const renderWithProvider = (component: React.ReactElement) => {
  const store = createTestStore()
  store.dispatch(setCurrentWorkflow(mockWorkflow))

  return render(
    <Provider store={store}>
      {component}
    </Provider>
  )
}

describe('WorkflowTestModal', () => {
  it('renders modal when open', () => {
    renderWithProvider(
      <WorkflowTestModal isOpen={true} onClose={() => {}} />
    )

    expect(screen.getByText('Test Workflow: Test Workflow')).toBeInTheDocument()
    expect(screen.getByText('Test Controls')).toBeInTheDocument()
    expect(screen.getByText('Test Data')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    renderWithProvider(
      <WorkflowTestModal isOpen={false} onClose={() => {}} />
    )

    expect(screen.queryByText('Test Workflow: Test Workflow')).not.toBeInTheDocument()
  })

  it('displays start test button initially', () => {
    renderWithProvider(
      <WorkflowTestModal isOpen={true} onClose={() => {}} />
    )

    expect(screen.getByText('Start Test')).toBeInTheDocument()
    expect(screen.queryByText('Next Step')).not.toBeInTheDocument()
    expect(screen.queryByText('Stop Test')).not.toBeInTheDocument()
  })

  it('shows workflow visualization', () => {
    renderWithProvider(
      <WorkflowTestModal isOpen={true} onClose={() => {}} />
    )

    expect(screen.getByText('Workflow Execution')).toBeInTheDocument()
  })

  it('allows entering test data', () => {
    renderWithProvider(
      <WorkflowTestModal isOpen={true} onClose={() => {}} />
    )

    const titleInput = screen.getByPlaceholderText('Enter document title...')
    fireEvent.change(titleInput, { target: { value: 'Test Document' } })
    expect(titleInput).toHaveValue('Test Document')
  })

  it('shows template options', () => {
    renderWithProvider(
      <WorkflowTestModal isOpen={true} onClose={() => {}} />
    )

    expect(screen.getByText('Quick Templates')).toBeInTheDocument()
    expect(screen.getByText('Document Review')).toBeInTheDocument()
    expect(screen.getByText('Invoice Approval')).toBeInTheDocument()
    expect(screen.getByText('Contract Workflow')).toBeInTheDocument()
  })
})
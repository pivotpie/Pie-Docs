import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { describe, it, expect, vi } from 'vitest'
import WorkflowTemplateLibrary from '@/components/workflows/templates/WorkflowTemplateLibrary'
import workflowsSlice from '@/store/slices/workflowsSlice'

const createTestStore = () => {
  return configureStore({
    reducer: {
      workflows: workflowsSlice
    }
  })
}

const renderWithProvider = (component: React.ReactElement) => {
  const store = createTestStore()
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  )
}

describe('WorkflowTemplateLibrary', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  it('renders template library when open', () => {
    renderWithProvider(
      <WorkflowTemplateLibrary isOpen={true} onClose={mockOnClose} />
    )

    expect(screen.getByText('Workflow Templates')).toBeInTheDocument()
    expect(screen.getByText('Choose from pre-built workflow templates to get started quickly')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    renderWithProvider(
      <WorkflowTemplateLibrary isOpen={false} onClose={mockOnClose} />
    )

    expect(screen.queryByText('Workflow Templates')).not.toBeInTheDocument()
  })

  it('displays template categories', () => {
    renderWithProvider(
      <WorkflowTemplateLibrary isOpen={true} onClose={mockOnClose} />
    )

    expect(screen.getByText('All Templates')).toBeInTheDocument()
    expect(screen.getByText('Approval')).toBeInTheDocument()
    expect(screen.getByText('Finance')).toBeInTheDocument()
    expect(screen.getByText('Legal')).toBeInTheDocument()
    expect(screen.getByText('Human Resources')).toBeInTheDocument()
  })

  it('displays template cards', () => {
    renderWithProvider(
      <WorkflowTemplateLibrary isOpen={true} onClose={mockOnClose} />
    )

    expect(screen.getByText('Document Approval Workflow')).toBeInTheDocument()
    expect(screen.getByText('Invoice Processing Workflow')).toBeInTheDocument()
    expect(screen.getByText('Contract Review Workflow')).toBeInTheDocument()
    expect(screen.getByText('Employee Onboarding Workflow')).toBeInTheDocument()
  })

  it('allows searching templates', () => {
    renderWithProvider(
      <WorkflowTemplateLibrary isOpen={true} onClose={mockOnClose} />
    )

    const searchInput = screen.getByPlaceholderText('Search templates...')
    fireEvent.change(searchInput, { target: { value: 'invoice' } })

    expect(screen.getByText('Invoice Processing Workflow')).toBeInTheDocument()
    expect(screen.queryByText('Document Approval Workflow')).not.toBeInTheDocument()
  })

  it('filters templates by category', () => {
    renderWithProvider(
      <WorkflowTemplateLibrary isOpen={true} onClose={mockOnClose} />
    )

    const financeCategory = screen.getByText('Finance')
    fireEvent.click(financeCategory)

    expect(screen.getByText('Invoice Processing Workflow')).toBeInTheDocument()
    expect(screen.queryByText('Document Approval Workflow')).not.toBeInTheDocument()
  })

  it('shows use template buttons', () => {
    renderWithProvider(
      <WorkflowTemplateLibrary isOpen={true} onClose={mockOnClose} />
    )

    const useButtons = screen.getAllByText('Use Template')
    expect(useButtons.length).toBeGreaterThan(0)
  })

  it('shows template previews', () => {
    renderWithProvider(
      <WorkflowTemplateLibrary isOpen={true} onClose={mockOnClose} />
    )

    expect(screen.getByText('📄 Submit → 👁️ Review → ✅ Approve')).toBeInTheDocument()
    expect(screen.getByText('📋 Validate → 💰 Review → ✅ Approve → 📤 Process')).toBeInTheDocument()
  })

  it('shows template tags', () => {
    renderWithProvider(
      <WorkflowTemplateLibrary isOpen={true} onClose={mockOnClose} />
    )

    const approvalTags = screen.getAllByText('approval')
    const reviewTags = screen.getAllByText('review')
    const documentTags = screen.getAllByText('document')
    const financeTags = screen.getAllByText('finance')

    expect(approvalTags.length).toBeGreaterThan(0)
    expect(reviewTags.length).toBeGreaterThan(0)
    expect(documentTags.length).toBeGreaterThan(0)
    expect(financeTags.length).toBeGreaterThan(0)
  })

  it('shows no templates message when search has no results', () => {
    renderWithProvider(
      <WorkflowTemplateLibrary isOpen={true} onClose={mockOnClose} />
    )

    const searchInput = screen.getByPlaceholderText('Search templates...')
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

    expect(screen.getByText('No templates found')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your search or category filter.')).toBeInTheDocument()
  })

  it('allows closing the modal', () => {
    renderWithProvider(
      <WorkflowTemplateLibrary isOpen={true} onClose={mockOnClose} />
    )

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { describe, it, expect } from 'vitest'
import WorkflowConnection from '@/components/workflows/connections/WorkflowConnection'
import workflowsSlice from '@/store/slices/workflowsSlice'

const createTestStore = () => {
  return configureStore({
    reducer: {
      workflows: workflowsSlice
    }
  })
}

const mockConnection = {
  id: 'connection-1',
  sourceId: 'element-1',
  targetId: 'element-2',
  label: 'Test Connection',
  condition: undefined
}

const mockSourceElement = { x: 100, y: 100 }
const mockTargetElement = { x: 300, y: 200 }

const renderWithProvider = (component: React.ReactElement) => {
  const store = createTestStore()
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  )
}

describe('WorkflowConnection', () => {
  it('renders connection path', () => {
    const { container } = renderWithProvider(
      <svg>
        <WorkflowConnection
          connection={mockConnection}
          sourceElement={mockSourceElement}
          targetElement={mockTargetElement}
        />
      </svg>
    )

    const path = container.querySelector('path')
    expect(path).toBeInTheDocument()
    expect(path).toHaveAttribute('fill', 'none')
  })

  it('displays connection label when provided', () => {
    const { container } = renderWithProvider(
      <svg>
        <WorkflowConnection
          connection={mockConnection}
          sourceElement={mockSourceElement}
          targetElement={mockTargetElement}
        />
      </svg>
    )

    const text = container.querySelector('text')
    expect(text).toBeInTheDocument()
    expect(text).toHaveTextContent('Test Connection')
  })

  it('shows conditional indicator when condition is set', () => {
    const conditionalConnection = {
      ...mockConnection,
      condition: 'if approved'
    }

    const { container } = renderWithProvider(
      <svg>
        <WorkflowConnection
          connection={conditionalConnection}
          sourceElement={mockSourceElement}
          targetElement={mockTargetElement}
        />
      </svg>
    )

    const circle = container.querySelector('circle[fill="#F59E0B"]')
    expect(circle).toBeInTheDocument()
  })

  it('highlights when selected', () => {
    const { container } = renderWithProvider(
      <svg>
        <WorkflowConnection
          connection={mockConnection}
          sourceElement={mockSourceElement}
          targetElement={mockTargetElement}
          isSelected={true}
        />
      </svg>
    )

    const path = container.querySelector('path')
    expect(path).toHaveAttribute('stroke', '#3B82F6')
    expect(path).toHaveAttribute('stroke-width', '3')
  })
})
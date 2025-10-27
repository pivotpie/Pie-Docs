import { render, screen } from '@testing-library/react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { describe, it, expect } from 'vitest'
import ElementPalette from '@/components/workflows/ElementPalette'

const renderWithDnd = (component: React.ReactElement) => {
  return render(
    <DndProvider backend={HTML5Backend}>
      {component}
    </DndProvider>
  )
}

describe('ElementPalette', () => {
  it('renders all workflow element types', () => {
    renderWithDnd(<ElementPalette />)

    expect(screen.getByText('Approval Step')).toBeInTheDocument()
    expect(screen.getByText('Review Step')).toBeInTheDocument()
    expect(screen.getByText('Notification Step')).toBeInTheDocument()
    expect(screen.getByText('Decision Step')).toBeInTheDocument()
    expect(screen.getByText('Timer Step')).toBeInTheDocument()
  })

  it('displays element descriptions', () => {
    renderWithDnd(<ElementPalette />)

    expect(screen.getByText('Requires approval from assigned users before proceeding')).toBeInTheDocument()
    expect(screen.getByText('Assigns reviewers to examine and provide feedback')).toBeInTheDocument()
    expect(screen.getByText('Sends notifications to specified recipients')).toBeInTheDocument()
    expect(screen.getByText('Creates conditional branches based on criteria')).toBeInTheDocument()
    expect(screen.getByText('Adds delays or time-based triggers to workflow')).toBeInTheDocument()
  })

  it('shows quick tips section', () => {
    renderWithDnd(<ElementPalette />)

    expect(screen.getByText('Quick Tips')).toBeInTheDocument()
    expect(screen.getByText(/Drag elements onto the canvas/)).toBeInTheDocument()
    expect(screen.getByText(/Connect elements to create flow/)).toBeInTheDocument()
  })
})
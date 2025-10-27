/**
 * Simplified Element Palette
 *
 * Uses native HTML5 drag and drop (no react-dnd dependency)
 */

import React from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import type { WorkflowElement } from '@/store/slices/workflowsSlice'

interface PaletteItemProps {
  type: WorkflowElement['type']
  title: string
  description: string
  icon: React.ReactNode
}

const PaletteItem: React.FC<PaletteItemProps> = ({ type, title, description, icon }) => {
  const { theme } = useTheme()

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('elementType', type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`
        p-3 border rounded-lg cursor-grab select-none
        glass-panel border-white/20
        hover:scale-105 hover:border-white/40
        active:cursor-grabbing active:scale-95
        transition-all duration-200
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 mt-1 ${theme === 'dark' ? 'text-white/80' : 'text-gray-600'}`}>
          {icon}
        </div>
        <div className="flex-grow min-w-0">
          <h4 className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h4>
          <p className={`text-xs leading-tight ${theme === 'dark' ? 'text-white/70' : 'text-gray-500'}`}>
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

interface ElementPaletteNewProps {
  className?: string
}

const ElementPaletteNew: React.FC<ElementPaletteNewProps> = ({ className = '' }) => {
  const { theme } = useTheme()

  const workflowElements = [
    {
      type: 'approval' as const,
      title: 'Approval Step',
      description: 'Requires approval from assigned users',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      type: 'review' as const,
      title: 'Review Step',
      description: 'Assigns reviewers to examine content',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    },
    {
      type: 'notification' as const,
      title: 'Notification',
      description: 'Sends notifications to recipients',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    },
    {
      type: 'decision' as const,
      title: 'Decision Point',
      description: 'Creates conditional branches',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      type: 'timer' as const,
      title: 'Timer / Delay',
      description: 'Adds time-based delays or triggers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ]

  return (
    <div className={`glass-panel border-r border-white/10 flex flex-col ${className}`}>
      <div className="p-4 border-b border-white/10">
        <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Workflow Elements
        </h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-gray-500'}`}>
          Drag elements to the canvas
        </p>
      </div>

      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {workflowElements.map((element) => (
          <PaletteItem
            key={element.type}
            type={element.type}
            title={element.title}
            description={element.description}
            icon={element.icon}
          />
        ))}
      </div>

      {/* Quick Tips */}
      <div className="p-4 border-t border-white/10 glass-card">
        <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white/90' : 'text-gray-700'}`}>
          💡 Quick Tips
        </h4>
        <ul className={`text-xs space-y-1.5 ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>
          <li className="flex items-start gap-2">
            <span className="text-green-400 flex-shrink-0">●</span>
            <span>Drag elements onto canvas</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 flex-shrink-0">●</span>
            <span>Click green dot to connect</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-400 flex-shrink-0">●</span>
            <span>Drag elements to move them</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-400 flex-shrink-0">●</span>
            <span>Ctrl+Scroll to zoom canvas</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default ElementPaletteNew

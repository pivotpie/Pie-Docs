/**
 * Advanced Element Palette
 * Zapier-style workflow elements organized by category
 */

import React, { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import {
  WORKFLOW_ELEMENTS,
  getElementsByCategory,
  getCategoryName,
  getCategoryDescription,
  getCategoryColor,
  type WorkflowElementType
} from './WorkflowElementTypes'

interface PaletteItemProps {
  element: WorkflowElementType
}

const PaletteItem: React.FC<PaletteItemProps> = ({ element }) => {
  const { theme } = useTheme()

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('elementType', element.type)
    e.dataTransfer.setData('elementCategory', element.category)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`
        p-2.5 border rounded-lg cursor-grab select-none
        glass-panel bg-gradient-to-br ${element.color.from} ${element.color.to}
        ${element.color.border}
        hover:scale-[1.02] hover:shadow-md
        active:cursor-grabbing active:scale-95
        transition-all duration-200
      `}
    >
      <div className="flex items-start gap-2.5">
        <div className={`flex-shrink-0 mt-0.5 ${element.color.text}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={element.icon} />
          </svg>
        </div>
        <div className="flex-grow min-w-0">
          <h4 className={`text-xs font-semibold mb-0.5 ${theme === 'dark' ? 'text-white' : 'text-white'}`}>
            {element.name}
          </h4>
          <p className={`text-[10px] leading-tight ${theme === 'dark' ? 'text-white/60' : 'text-white/70'}`}>
            {element.description}
          </p>
        </div>
      </div>
    </div>
  )
}

interface CategorySectionProps {
  category: string
  isExpanded: boolean
  onToggle: () => void
}

const CategorySection: React.FC<CategorySectionProps> = ({ category, isExpanded, onToggle }) => {
  const { theme } = useTheme()
  const elements = getElementsByCategory(category)
  const categoryColor = getCategoryColor(category)

  return (
    <div className="border-b border-white/10 last:border-b-0">
      {/* Category Header */}
      <button
        onClick={onToggle}
        className={`
          w-full px-3 py-2.5 flex items-center justify-between
          hover:bg-white/5 transition-colors
          ${isExpanded ? 'bg-white/5' : ''}
        `}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${categoryColor.replace('text-', 'bg-')}`} />
          <div className="text-left">
            <h3 className={`text-sm font-bold ${categoryColor}`}>
              {getCategoryName(category)}
            </h3>
            <p className={`text-[10px] ${theme === 'dark' ? 'text-white/50' : 'text-white/60'}`}>
              {getCategoryDescription(category)}
            </p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 ${theme === 'dark' ? 'text-white/60' : 'text-white/60'} transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Category Elements */}
      {isExpanded && (
        <div className="p-3 space-y-2 bg-black/10">
          {elements.map((element) => (
            <PaletteItem key={element.type} element={element} />
          ))}
        </div>
      )}
    </div>
  )
}

interface AdvancedElementPaletteProps {
  className?: string
}

const AdvancedElementPalette: React.FC<AdvancedElementPaletteProps> = ({ className = '' }) => {
  const { theme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['trigger', 'action']))

  const categories = ['trigger', 'action', 'logic', 'flow', 'integration']

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const filteredElements = searchQuery
    ? WORKFLOW_ELEMENTS.filter(
        el =>
          el.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          el.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  return (
    <div className={`glass-panel border-r border-white/10 flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h3 className={`text-base font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-white'}`}>
          Workflow Elements
        </h3>
        <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-white/60' : 'text-white/70'}`}>
          Drag elements to canvas to build your workflow
        </p>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search elements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`
              w-full pl-8 pr-3 py-1.5 text-xs rounded-md
              bg-white/10 border border-white/20
              ${theme === 'dark' ? 'text-white placeholder-white/40' : 'text-white placeholder-white/50'}
              focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
              transition-all
            `}
          />
        </div>
      </div>

      {/* Elements List */}
      <div className="flex-1 overflow-y-auto">
        {searchQuery ? (
          /* Search Results */
          <div className="p-3 space-y-2">
            {filteredElements.length > 0 ? (
              <>
                <div className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-white/70' : 'text-white/80'}`}>
                  Found {filteredElements.length} element{filteredElements.length !== 1 ? 's' : ''}
                </div>
                {filteredElements.map((element) => (
                  <PaletteItem key={element.type} element={element} />
                ))}
              </>
            ) : (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-8 w-8 text-white/30 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className={`text-xs ${theme === 'dark' ? 'text-white/50' : 'text-white/60'}`}>
                  No elements found
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Category View */
          <div>
            {categories.map((category) => (
              <CategorySection
                key={category}
                category={category}
                isExpanded={expandedCategories.has(category)}
                onToggle={() => toggleCategory(category)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer - Quick Tips */}
      <div className="p-3 border-t border-white/10 glass-card">
        <h4 className={`text-xs font-bold mb-2 ${theme === 'dark' ? 'text-white/90' : 'text-white/90'}`}>
          💡 Quick Guide
        </h4>
        <ul className={`text-[10px] space-y-1.5 ${theme === 'dark' ? 'text-white/60' : 'text-white/70'}`}>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 flex-shrink-0 mt-0.5">●</span>
            <span><strong>Triggers</strong> start your workflow</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 flex-shrink-0 mt-0.5">●</span>
            <span><strong>Actions</strong> perform operations</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-400 flex-shrink-0 mt-0.5">●</span>
            <span><strong>Logic</strong> makes decisions</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-sky-400 flex-shrink-0 mt-0.5">●</span>
            <span><strong>Flow</strong> controls execution</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-400 flex-shrink-0 mt-0.5">●</span>
            <span><strong>Integrations</strong> connect services</span>
          </li>
        </ul>
        <div className={`mt-3 pt-3 border-t border-white/10 text-[10px] ${theme === 'dark' ? 'text-white/50' : 'text-white/60'}`}>
          <p className="mb-1">🎯 Drag elements to canvas</p>
          <p>🔗 Connect green → blue dots</p>
        </div>
      </div>
    </div>
  )
}

export default AdvancedElementPalette

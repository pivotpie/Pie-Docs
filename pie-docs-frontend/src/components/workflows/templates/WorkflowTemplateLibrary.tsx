import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { setCurrentWorkflow } from '@/store/slices/workflowsSlice'
import type { Workflow } from '@/store/slices/workflowsSlice'
import { useTheme } from '@/contexts/ThemeContext'

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>
  preview: string
}

interface WorkflowTemplateLibraryProps {
  isOpen?: boolean
  onClose?: () => void
  inline?: boolean
}

const WorkflowTemplateLibrary: React.FC<WorkflowTemplateLibraryProps> = ({ isOpen = true, onClose, inline = false }) => {
  const dispatch = useDispatch()
  const { theme } = useTheme()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const workflowTemplates: WorkflowTemplate[] = [
    {
      id: 'document-approval',
      name: 'Document Approval Workflow',
      description: 'Standard document approval process with review and approval steps',
      category: 'approval',
      tags: ['approval', 'review', 'document'],
      preview: '📄 Submit → 👁️ Review → ✅ Approve',
      workflow: {
        name: 'Document Approval Workflow',
        description: 'Standard document approval process',
        elements: [
          {
            id: 'start-1',
            type: 'notification',
            position: { x: 50, y: 100 },
            data: {
              title: 'Document Submitted',
              description: 'Notify submission received'
            }
          },
          {
            id: 'review-1',
            type: 'review',
            position: { x: 250, y: 100 },
            data: {
              title: 'Initial Review',
              description: 'Review document for completeness'
            }
          },
          {
            id: 'approve-1',
            type: 'approval',
            position: { x: 450, y: 100 },
            data: {
              title: 'Final Approval',
              description: 'Manager approval required'
            }
          },
          {
            id: 'notify-1',
            type: 'notification',
            position: { x: 650, y: 100 },
            data: {
              title: 'Approval Complete',
              description: 'Notify document approved'
            }
          }
        ],
        connections: [
          { id: 'conn-1', sourceId: 'start-1', targetId: 'review-1' },
          { id: 'conn-2', sourceId: 'review-1', targetId: 'approve-1' },
          { id: 'conn-3', sourceId: 'approve-1', targetId: 'notify-1' }
        ],
        version: 1,
        status: 'draft'
      }
    },
    {
      id: 'invoice-processing',
      name: 'Invoice Processing Workflow',
      description: 'Automated invoice validation and approval process',
      category: 'finance',
      tags: ['invoice', 'finance', 'approval', 'validation'],
      preview: '📋 Validate → 💰 Review → ✅ Approve → 📤 Process',
      workflow: {
        name: 'Invoice Processing Workflow',
        description: 'Automated invoice validation and approval',
        elements: [
          {
            id: 'validate-1',
            type: 'decision',
            position: { x: 50, y: 100 },
            data: {
              title: 'Validate Invoice',
              description: 'Check invoice format and data'
            }
          },
          {
            id: 'review-2',
            type: 'review',
            position: { x: 250, y: 50 },
            data: {
              title: 'Finance Review',
              description: 'Review invoice details'
            }
          },
          {
            id: 'approve-2',
            type: 'approval',
            position: { x: 450, y: 50 },
            data: {
              title: 'Approve Payment',
              description: 'Authorize payment processing'
            }
          },
          {
            id: 'reject-1',
            type: 'notification',
            position: { x: 250, y: 150 },
            data: {
              title: 'Reject Invoice',
              description: 'Notify rejection with reason'
            }
          }
        ],
        connections: [
          { id: 'conn-4', sourceId: 'validate-1', targetId: 'review-2', label: 'Valid' },
          { id: 'conn-5', sourceId: 'validate-1', targetId: 'reject-1', label: 'Invalid' },
          { id: 'conn-6', sourceId: 'review-2', targetId: 'approve-2' }
        ],
        version: 1,
        status: 'draft'
      }
    },
    {
      id: 'contract-review',
      name: 'Contract Review Workflow',
      description: 'Legal contract review and approval process',
      category: 'legal',
      tags: ['contract', 'legal', 'review', 'approval'],
      preview: '📜 Submit → ⚖️ Legal Review → 📝 Revisions → ✅ Sign',
      workflow: {
        name: 'Contract Review Workflow',
        description: 'Legal contract review and approval',
        elements: [
          {
            id: 'submit-1',
            type: 'notification',
            position: { x: 50, y: 100 },
            data: {
              title: 'Contract Submitted',
              description: 'New contract for review'
            }
          },
          {
            id: 'legal-1',
            type: 'review',
            position: { x: 250, y: 100 },
            data: {
              title: 'Legal Review',
              description: 'Legal team review'
            }
          },
          {
            id: 'decision-1',
            type: 'decision',
            position: { x: 450, y: 100 },
            data: {
              title: 'Review Decision',
              description: 'Approve or request changes'
            }
          },
          {
            id: 'revise-1',
            type: 'notification',
            position: { x: 450, y: 200 },
            data: {
              title: 'Request Revisions',
              description: 'Send back for changes'
            }
          },
          {
            id: 'approve-3',
            type: 'approval',
            position: { x: 650, y: 100 },
            data: {
              title: 'Final Approval',
              description: 'Approve for signing'
            }
          }
        ],
        connections: [
          { id: 'conn-7', sourceId: 'submit-1', targetId: 'legal-1' },
          { id: 'conn-8', sourceId: 'legal-1', targetId: 'decision-1' },
          { id: 'conn-9', sourceId: 'decision-1', targetId: 'approve-3', label: 'Approve' },
          { id: 'conn-10', sourceId: 'decision-1', targetId: 'revise-1', label: 'Revise' }
        ],
        version: 1,
        status: 'draft'
      }
    },
    {
      id: 'employee-onboarding',
      name: 'Employee Onboarding Workflow',
      description: 'Complete employee onboarding process with multiple departments',
      category: 'hr',
      tags: ['hr', 'onboarding', 'employee', 'multi-step'],
      preview: '👤 Welcome → 📋 IT Setup → 📚 Training → ✅ Complete',
      workflow: {
        name: 'Employee Onboarding Workflow',
        description: 'Complete employee onboarding process',
        elements: [
          {
            id: 'welcome-1',
            type: 'notification',
            position: { x: 50, y: 100 },
            data: {
              title: 'Welcome New Employee',
              description: 'Send welcome package'
            }
          },
          {
            id: 'it-setup-1',
            type: 'approval',
            position: { x: 250, y: 100 },
            data: {
              title: 'IT Account Setup',
              description: 'Create accounts and access'
            }
          },
          {
            id: 'training-1',
            type: 'review',
            position: { x: 450, y: 100 },
            data: {
              title: 'Training Program',
              description: 'Complete mandatory training'
            }
          },
          {
            id: 'complete-1',
            type: 'notification',
            position: { x: 650, y: 100 },
            data: {
              title: 'Onboarding Complete',
              description: 'Notify completion to HR'
            }
          }
        ],
        connections: [
          { id: 'conn-11', sourceId: 'welcome-1', targetId: 'it-setup-1' },
          { id: 'conn-12', sourceId: 'it-setup-1', targetId: 'training-1' },
          { id: 'conn-13', sourceId: 'training-1', targetId: 'complete-1' }
        ],
        version: 1,
        status: 'draft'
      }
    }
  ]

  const categories = [
    { id: 'all', name: 'All Templates', count: workflowTemplates.length },
    { id: 'approval', name: 'Approval', count: workflowTemplates.filter(t => t.category === 'approval').length },
    { id: 'finance', name: 'Finance', count: workflowTemplates.filter(t => t.category === 'finance').length },
    { id: 'legal', name: 'Legal', count: workflowTemplates.filter(t => t.category === 'legal').length },
    { id: 'hr', name: 'Human Resources', count: workflowTemplates.filter(t => t.category === 'hr').length }
  ]

  const filteredTemplates = workflowTemplates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchesSearch = searchTerm === '' ||
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesCategory && matchesSearch
  })

  const handleUseTemplate = (template: WorkflowTemplate) => {
    const newWorkflow: Workflow = {
      ...template.workflow,
      id: `workflow-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    dispatch(setCurrentWorkflow(newWorkflow))
    if (onClose) onClose()
  }

  if (!isOpen) return null

  const content = (
    <>
      {/* Header */}
      <div className={inline ? "mb-4" : "modal-glass-header px-6 pt-6 pb-4"}>
        <div className="flex items-center justify-between">
          <h3 className={`text-2xl leading-6 font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
            Workflow Templates
          </h3>
          {!inline && onClose && (
            <button
              onClick={onClose}
              className={`hover:scale-110 transition-all duration-300 ${theme === 'dark' ? 'text-white/60 hover:text-white/80' : 'text-white/60 hover:text-white/80'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
          Choose from pre-built workflow templates to get started quickly
        </p>
      </div>

      {/* Content */}
      <div className={inline ? "flex flex-col" : "flex h-96"}>
        {/* Sidebar */}
        <div className={inline ? "mb-4" : "w-64 modal-glass-content border-r border-white/10 p-4"}>
          {/* Header */}
          <div className="modal-glass-header px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-2xl leading-6 font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                Workflow Templates
              </h3>
              <button
                onClick={onClose}
                className={`hover:scale-110 transition-all duration-300 ${theme === 'dark' ? 'text-white/60 hover:text-white/80' : 'text-white/60 hover:text-white/80'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
              Choose from pre-built workflow templates to get started quickly
            </p>
          </div>

          {/* Content */}
          <div className="flex h-96">
            {/* Sidebar */}
            <div className="w-64 modal-glass-content border-r border-white/10 p-4">
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full px-3 py-2 glass-panel border border-white/20 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 ${theme === 'dark' ? 'text-white placeholder-white/50' : 'text-white placeholder-white/50'}`}
                />
              </div>

              {/* Categories */}
              <div className="space-y-1">
                <h4 className={`text-xs font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`}>Categories</h4>
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-300 hover:scale-105 ${
                      selectedCategory === category.id
                        ? 'glass-strong text-blue-300 font-medium border border-blue-400/30'
                        : `glass-panel border border-white/10 hover:border-white/20 ${theme === 'dark' ? 'text-white/80 hover:text-white' : 'text-white/80 hover:text-white'}`
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{category.name}</span>
                      <span className={`text-xs ${theme === 'dark' ? 'text-white/50' : 'text-white/50'}`}>{category.count}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Templates Grid */}
            <div className="flex-1 modal-glass-content p-6 overflow-y-auto">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className={`mt-2 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>No templates found</h3>
                  <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`}>
                    Try adjusting your search or category filter.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredTemplates.map(template => (
                    <div
                      key={template.id}
                      className="glass-card border border-white/20 rounded-lg p-6 hover:scale-105 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-grow">
                          <h4 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                            {template.name}
                          </h4>
                          <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
                            {template.description}
                          </p>
                          <div className={`text-sm mb-3 font-mono ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`}>
                            {template.preview}
                          </div>
                          <div className="flex flex-wrap gap-1 mb-4">
                            {template.tags.map(tag => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium glass-panel border border-blue-400/30 text-blue-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleUseTemplate(template)}
                          className="btn-glass px-4 py-2 text-sm font-medium text-blue-300 hover:text-blue-200 hover:scale-105 transition-all duration-300"
                        >
                          Use Template
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="modal-glass-header border-t border-white/10 px-6 py-3 flex justify-end">
            <button
              onClick={onClose}
              className={`btn-glass px-4 py-2 text-sm font-medium hover:scale-105 transition-all duration-300 ${theme === 'dark' ? 'text-white/90 hover:text-white' : 'text-white/90 hover:text-white'}`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkflowTemplateLibrary
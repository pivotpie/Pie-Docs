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

const WorkflowTemplateLibraryInline: React.FC = () => {
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
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <input
          type="text"
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`flex-1 px-4 py-2 glass-panel border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 ${theme === 'dark' ? 'text-white placeholder-white/50' : 'text-white placeholder-white/50'}`}
        />

        {/* Categories */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className={`px-4 py-2 glass-panel border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 ${theme === 'dark' ? 'text-white' : 'text-white'}`}
        >
          {categories.map(category => (
            <option key={category.id} value={category.id} className="bg-gray-800">
              {category.name} ({category.count})
            </option>
          ))}
        </select>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="glass-panel rounded-lg p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-white">No templates found</h3>
          <p className="mt-1 text-sm text-white/60">
            Try adjusting your search or category filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              className="glass-card border border-white/20 rounded-lg p-6 hover:scale-105 transition-all duration-300"
            >
              <div className="mb-4">
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
  )
}

export default WorkflowTemplateLibraryInline

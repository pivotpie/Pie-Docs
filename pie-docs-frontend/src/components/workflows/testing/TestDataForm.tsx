import React from 'react'

interface TestDataFormProps {
  testData: any
  onChange: (data: any) => void
  disabled?: boolean
}

const TestDataForm: React.FC<TestDataFormProps> = ({ testData, onChange, disabled = false }) => {
  const handleInputChange = (field: string, value: any) => {
    onChange({
      ...testData,
      [field]: value
    })
  }

  const sampleTemplates = [
    {
      name: 'Document Review',
      data: {
        documentTitle: 'Sample Document.pdf',
        documentType: 'pdf',
        submittedBy: 'john.doe@company.com',
        priority: 'normal',
        department: 'Engineering',
        tags: ['review-required', 'technical']
      }
    },
    {
      name: 'Invoice Approval',
      data: {
        invoiceNumber: 'INV-2025-001',
        amount: 1500.00,
        vendor: 'Acme Corporation',
        submittedBy: 'finance@company.com',
        priority: 'high',
        department: 'Finance',
        tags: ['invoice', 'approval-required']
      }
    },
    {
      name: 'Contract Workflow',
      data: {
        contractTitle: 'Service Agreement',
        contractType: 'service',
        submittedBy: 'legal@company.com',
        priority: 'high',
        department: 'Legal',
        tags: ['contract', 'legal-review']
      }
    }
  ]

  const loadTemplate = (template: any) => {
    onChange(template.data)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">Test Data</h4>
        {!disabled && (
          <div className="flex space-x-2">
            <button
              onClick={() => onChange({})}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Sample Templates */}
      {!disabled && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Quick Templates
          </label>
          <div className="grid grid-cols-1 gap-2">
            {sampleTemplates.map((template, index) => (
              <button
                key={index}
                onClick={() => loadTemplate(template)}
                className="text-left p-2 text-xs border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-gray-500 truncate">
                  {Object.keys(template.data).slice(0, 3).join(', ')}...
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Basic Fields */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Document Title
          </label>
          <input
            type="text"
            value={testData.documentTitle || ''}
            onChange={(e) => handleInputChange('documentTitle', e.target.value)}
            disabled={disabled}
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            placeholder="Enter document title..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Document Type
            </label>
            <select
              value={testData.documentType || ''}
              onChange={(e) => handleInputChange('documentType', e.target.value)}
              disabled={disabled}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Select type...</option>
              <option value="pdf">PDF</option>
              <option value="doc">Word Document</option>
              <option value="xlsx">Excel</option>
              <option value="txt">Text File</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={testData.priority || ''}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              disabled={disabled}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Select priority...</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Submitted By
          </label>
          <input
            type="email"
            value={testData.submittedBy || ''}
            onChange={(e) => handleInputChange('submittedBy', e.target.value)}
            disabled={disabled}
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            placeholder="user@company.com"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Department
          </label>
          <input
            type="text"
            value={testData.department || ''}
            onChange={(e) => handleInputChange('department', e.target.value)}
            disabled={disabled}
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            placeholder="Enter department..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={Array.isArray(testData.tags) ? testData.tags.join(', ') : (testData.tags || '')}
            onChange={(e) => handleInputChange('tags', e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
            disabled={disabled}
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            placeholder="review, approval, urgent"
          />
        </div>
      </div>

      {/* JSON Editor for Advanced Users */}
      <details className="border border-gray-200 rounded-md">
        <summary className="px-3 py-2 text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-50">
          Advanced: Raw JSON Data
        </summary>
        <div className="p-3 border-t border-gray-200">
          <textarea
            value={JSON.stringify(testData, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                onChange(parsed)
              } catch (error) {
                // Invalid JSON, don't update
              }
            }}
            disabled={disabled}
            className="w-full h-32 text-xs font-mono border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            placeholder="{ }"
          />
        </div>
      </details>
    </div>
  )
}

export default TestDataForm
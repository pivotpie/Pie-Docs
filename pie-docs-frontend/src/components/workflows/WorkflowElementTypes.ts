/**
 * Comprehensive Workflow Element Type Definitions
 * Similar to Zapier/Make/n8n workflow systems
 */

export interface WorkflowElementType {
  type: string
  category: 'trigger' | 'action' | 'logic' | 'flow' | 'integration'
  name: string
  description: string
  icon: string
  color: {
    from: string
    to: string
    border: string
    text: string
  }
  config?: {
    canHaveMultipleInputs?: boolean
    canHaveMultipleOutputs?: boolean
    requiresConfiguration?: boolean
  }
}

export const WORKFLOW_ELEMENTS: WorkflowElementType[] = [
  // ============================================================================
  // TRIGGERS - How workflows start
  // ============================================================================
  {
    type: 'trigger-manual',
    category: 'trigger',
    name: 'Manual Trigger',
    description: 'Start workflow manually with a button click',
    icon: 'M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122',
    color: {
      from: 'from-emerald-500/20',
      to: 'to-emerald-600/30',
      border: 'border-emerald-500/50',
      text: 'text-emerald-400'
    },
    config: {
      canHaveMultipleInputs: false,
      canHaveMultipleOutputs: true,
      requiresConfiguration: false
    }
  },
  {
    type: 'trigger-webhook',
    category: 'trigger',
    name: 'Webhook Trigger',
    description: 'Start workflow when webhook receives data',
    icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
    color: {
      from: 'from-blue-500/20',
      to: 'to-blue-600/30',
      border: 'border-blue-500/50',
      text: 'text-blue-400'
    },
    config: {
      canHaveMultipleInputs: false,
      canHaveMultipleOutputs: true,
      requiresConfiguration: true
    }
  },
  {
    type: 'trigger-schedule',
    category: 'trigger',
    name: 'Schedule Trigger',
    description: 'Start workflow on a schedule (cron, interval)',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    color: {
      from: 'from-indigo-500/20',
      to: 'to-indigo-600/30',
      border: 'border-indigo-500/50',
      text: 'text-indigo-400'
    },
    config: {
      canHaveMultipleInputs: false,
      canHaveMultipleOutputs: true,
      requiresConfiguration: true
    }
  },
  {
    type: 'trigger-file',
    category: 'trigger',
    name: 'File Upload Trigger',
    description: 'Start when a file is uploaded',
    icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',
    color: {
      from: 'from-cyan-500/20',
      to: 'to-cyan-600/30',
      border: 'border-cyan-500/50',
      text: 'text-cyan-400'
    }
  },
  {
    type: 'trigger-database',
    category: 'trigger',
    name: 'Database Trigger',
    description: 'Start when database record changes',
    icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
    color: {
      from: 'from-violet-500/20',
      to: 'to-violet-600/30',
      border: 'border-violet-500/50',
      text: 'text-violet-400'
    }
  },

  // ============================================================================
  // ACTIONS - Things workflows do
  // ============================================================================
  {
    type: 'action-create',
    category: 'action',
    name: 'Create Record',
    description: 'Create a new record/document',
    icon: 'M12 4v16m8-8H4',
    color: {
      from: 'from-green-500/20',
      to: 'to-green-600/30',
      border: 'border-green-500/50',
      text: 'text-green-400'
    },
    config: {
      canHaveMultipleInputs: true,
      canHaveMultipleOutputs: true,
      requiresConfiguration: true
    }
  },
  {
    type: 'action-update',
    category: 'action',
    name: 'Update Record',
    description: 'Update existing record/document',
    icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    color: {
      from: 'from-amber-500/20',
      to: 'to-amber-600/30',
      border: 'border-amber-500/50',
      text: 'text-amber-400'
    },
    config: {
      canHaveMultipleInputs: true,
      canHaveMultipleOutputs: true,
      requiresConfiguration: true
    }
  },
  {
    type: 'action-delete',
    category: 'action',
    name: 'Delete Record',
    description: 'Delete a record/document',
    icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
    color: {
      from: 'from-red-500/20',
      to: 'to-red-600/30',
      border: 'border-red-500/50',
      text: 'text-red-400'
    },
    config: {
      canHaveMultipleInputs: true,
      canHaveMultipleOutputs: true,
      requiresConfiguration: true
    }
  },
  {
    type: 'action-email',
    category: 'action',
    name: 'Send Email',
    description: 'Send an email notification',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    color: {
      from: 'from-pink-500/20',
      to: 'to-pink-600/30',
      border: 'border-pink-500/50',
      text: 'text-pink-400'
    },
    config: {
      canHaveMultipleInputs: true,
      canHaveMultipleOutputs: true,
      requiresConfiguration: true
    }
  },
  {
    type: 'action-notification',
    category: 'action',
    name: 'Send Notification',
    description: 'Send in-app notification',
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    color: {
      from: 'from-yellow-500/20',
      to: 'to-yellow-600/30',
      border: 'border-yellow-500/50',
      text: 'text-yellow-400'
    }
  },
  {
    type: 'action-http',
    category: 'action',
    name: 'HTTP Request',
    description: 'Make API call to external service',
    icon: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
    color: {
      from: 'from-purple-500/20',
      to: 'to-purple-600/30',
      border: 'border-purple-500/50',
      text: 'text-purple-400'
    },
    config: {
      canHaveMultipleInputs: true,
      canHaveMultipleOutputs: true,
      requiresConfiguration: true
    }
  },
  {
    type: 'action-transform',
    category: 'action',
    name: 'Transform Data',
    description: 'Transform/map data fields',
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    color: {
      from: 'from-teal-500/20',
      to: 'to-teal-600/30',
      border: 'border-teal-500/50',
      text: 'text-teal-400'
    }
  },

  // ============================================================================
  // LOGIC - Decision making
  // ============================================================================
  {
    type: 'logic-if',
    category: 'logic',
    name: 'If/Else Condition',
    description: 'Branch based on conditions',
    icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    color: {
      from: 'from-orange-500/20',
      to: 'to-orange-600/30',
      border: 'border-orange-500/50',
      text: 'text-orange-400'
    },
    config: {
      canHaveMultipleInputs: true,
      canHaveMultipleOutputs: true,
      requiresConfiguration: true
    }
  },
  {
    type: 'logic-switch',
    category: 'logic',
    name: 'Switch/Case',
    description: 'Multiple conditional branches',
    icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    color: {
      from: 'from-rose-500/20',
      to: 'to-rose-600/30',
      border: 'border-rose-500/50',
      text: 'text-rose-400'
    },
    config: {
      canHaveMultipleInputs: true,
      canHaveMultipleOutputs: true,
      requiresConfiguration: true
    }
  },
  {
    type: 'logic-filter',
    category: 'logic',
    name: 'Filter',
    description: 'Filter data based on criteria',
    icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
    color: {
      from: 'from-lime-500/20',
      to: 'to-lime-600/30',
      border: 'border-lime-500/50',
      text: 'text-lime-400'
    }
  },

  // ============================================================================
  // FLOW CONTROL - Workflow routing
  // ============================================================================
  {
    type: 'flow-approval',
    category: 'flow',
    name: 'Approval',
    description: 'Wait for user approval',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    color: {
      from: 'from-sky-500/20',
      to: 'to-sky-600/30',
      border: 'border-sky-500/50',
      text: 'text-sky-400'
    },
    config: {
      canHaveMultipleInputs: true,
      canHaveMultipleOutputs: true,
      requiresConfiguration: true
    }
  },
  {
    type: 'flow-delay',
    category: 'flow',
    name: 'Delay/Timer',
    description: 'Wait for specified duration',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    color: {
      from: 'from-slate-500/20',
      to: 'to-slate-600/30',
      border: 'border-slate-500/50',
      text: 'text-slate-400'
    },
    config: {
      canHaveMultipleInputs: true,
      canHaveMultipleOutputs: true,
      requiresConfiguration: true
    }
  },
  {
    type: 'flow-loop',
    category: 'flow',
    name: 'Loop/Iterate',
    description: 'Repeat actions for each item',
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    color: {
      from: 'from-fuchsia-500/20',
      to: 'to-fuchsia-600/30',
      border: 'border-fuchsia-500/50',
      text: 'text-fuchsia-400'
    },
    config: {
      canHaveMultipleInputs: true,
      canHaveMultipleOutputs: true,
      requiresConfiguration: true
    }
  },
  {
    type: 'flow-parallel',
    category: 'flow',
    name: 'Parallel Paths',
    description: 'Execute multiple branches simultaneously',
    icon: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4',
    color: {
      from: 'from-cyan-500/20',
      to: 'to-cyan-600/30',
      border: 'border-cyan-500/50',
      text: 'text-cyan-400'
    }
  },
  {
    type: 'flow-merge',
    category: 'flow',
    name: 'Merge Paths',
    description: 'Combine multiple branches',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    color: {
      from: 'from-emerald-500/20',
      to: 'to-emerald-600/30',
      border: 'border-emerald-500/50',
      text: 'text-emerald-400'
    }
  },
  {
    type: 'flow-error',
    category: 'flow',
    name: 'Error Handler',
    description: 'Handle errors and exceptions',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    color: {
      from: 'from-red-500/20',
      to: 'to-red-600/30',
      border: 'border-red-500/50',
      text: 'text-red-400'
    }
  },
  {
    type: 'flow-end',
    category: 'flow',
    name: 'End',
    description: 'Terminate workflow execution',
    icon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z',
    color: {
      from: 'from-gray-500/20',
      to: 'to-gray-600/30',
      border: 'border-gray-500/50',
      text: 'text-gray-400'
    },
    config: {
      canHaveMultipleInputs: true,
      canHaveMultipleOutputs: false
    }
  },

  // ============================================================================
  // INTEGRATIONS - External services
  // ============================================================================
  {
    type: 'integration-database',
    category: 'integration',
    name: 'Database Query',
    description: 'Query or modify database',
    icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
    color: {
      from: 'from-indigo-500/20',
      to: 'to-indigo-600/30',
      border: 'border-indigo-500/50',
      text: 'text-indigo-400'
    }
  },
  {
    type: 'integration-api',
    category: 'integration',
    name: 'API Call',
    description: 'Call external REST API',
    icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    color: {
      from: 'from-violet-500/20',
      to: 'to-violet-600/30',
      border: 'border-violet-500/50',
      text: 'text-violet-400'
    }
  },
  {
    type: 'integration-storage',
    category: 'integration',
    name: 'File Storage',
    description: 'Upload/download files',
    icon: 'M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z',
    color: {
      from: 'from-amber-500/20',
      to: 'to-amber-600/30',
      border: 'border-amber-500/50',
      text: 'text-amber-400'
    }
  }
]

// Helper functions
export const getElementByType = (type: string): WorkflowElementType | undefined => {
  return WORKFLOW_ELEMENTS.find(el => el.type === type)
}

export const getElementsByCategory = (category: string): WorkflowElementType[] => {
  return WORKFLOW_ELEMENTS.filter(el => el.category === category)
}

export const getCategoryName = (category: string): string => {
  const names: Record<string, string> = {
    trigger: 'Triggers',
    action: 'Actions',
    logic: 'Logic & Decisions',
    flow: 'Flow Control',
    integration: 'Integrations'
  }
  return names[category] || category
}

export const getCategoryDescription = (category: string): string => {
  const descriptions: Record<string, string> = {
    trigger: 'Start your workflow',
    action: 'Perform operations',
    logic: 'Make decisions',
    flow: 'Control workflow execution',
    integration: 'Connect external services'
  }
  return descriptions[category] || ''
}

export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    trigger: 'text-emerald-400',
    action: 'text-green-400',
    logic: 'text-orange-400',
    flow: 'text-sky-400',
    integration: 'text-violet-400'
  }
  return colors[category] || 'text-gray-400'
}

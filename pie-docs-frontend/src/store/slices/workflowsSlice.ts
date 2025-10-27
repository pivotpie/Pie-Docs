import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { workflowService, formatApiError } from '@/services/workflowApi'
import type { WorkflowCreate, WorkflowUpdate } from '@/services/workflowApi'

export interface WorkflowElement {
  id: string
  type: 'approval' | 'review' | 'notification' | 'decision' | 'timer'
  position: { x: number; y: number }
  data: {
    title: string
    description?: string
    config?: any
  }
}

export interface WorkflowConnection {
  id: string
  sourceId: string
  targetId: string
  label?: string
  condition?: string
}

export interface Workflow {
  id: string
  name: string
  description?: string
  elements: WorkflowElement[]
  connections: WorkflowConnection[]
  version: number
  createdAt: string
  updatedAt: string
  status: 'draft' | 'active' | 'archived'
}

export interface ValidationError {
  id: string
  elementId?: string
  connectionId?: string
  type: 'error' | 'warning'
  message: string
}

export interface WorkflowState {
  currentWorkflow: Workflow | null
  workflows: Workflow[]
  canvasConfig: {
    zoom: number
    pan: { x: number; y: number }
    gridEnabled: boolean
  }
  selectedElements: string[]
  validationErrors: ValidationError[]
  testMode: {
    isActive: boolean
    currentStep: string | null
    testData: any
  }
  isLoading: boolean
  error: string | null
}

const initialState: WorkflowState = {
  currentWorkflow: null,
  workflows: [],
  canvasConfig: {
    zoom: 1,
    pan: { x: 0, y: 0 },
    gridEnabled: true
  },
  selectedElements: [],
  validationErrors: [],
  testMode: {
    isActive: false,
    currentStep: null,
    testData: null
  },
  isLoading: false,
  error: null
}

// ============================================================================
// Async Thunks for API Integration
// ============================================================================

export const fetchWorkflows = createAsyncThunk(
  'workflows/fetchWorkflows',
  async (params?: { skip?: number; limit?: number; status?: 'draft' | 'active' | 'archived' }, { rejectWithValue }) => {
    try {
      const response = await workflowService.listWorkflows(params)
      return response
    } catch (error) {
      return rejectWithValue(formatApiError(error))
    }
  }
)

export const createWorkflowAsync = createAsyncThunk(
  'workflows/createWorkflow',
  async (workflow: WorkflowCreate, { rejectWithValue }) => {
    try {
      const response = await workflowService.createWorkflow(workflow)
      return response
    } catch (error) {
      return rejectWithValue(formatApiError(error))
    }
  }
)

export const updateWorkflowAsync = createAsyncThunk(
  'workflows/updateWorkflow',
  async ({ id, workflow }: { id: string; workflow: WorkflowUpdate }, { rejectWithValue }) => {
    try {
      const response = await workflowService.updateWorkflow(id, workflow)
      return response
    } catch (error) {
      return rejectWithValue(formatApiError(error))
    }
  }
)

export const deleteWorkflowAsync = createAsyncThunk(
  'workflows/deleteWorkflow',
  async (id: string, { rejectWithValue }) => {
    try {
      await workflowService.deleteWorkflow(id)
      return id
    } catch (error) {
      return rejectWithValue(formatApiError(error))
    }
  }
)

export const fetchWorkflowById = createAsyncThunk(
  'workflows/fetchWorkflowById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await workflowService.getWorkflow(id)
      return response
    } catch (error) {
      return rejectWithValue(formatApiError(error))
    }
  }
)

export const validateWorkflowAsync = createAsyncThunk(
  'workflows/validateWorkflow',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await workflowService.validateWorkflow(id)
      return response
    } catch (error) {
      return rejectWithValue(formatApiError(error))
    }
  }
)

const workflowsSlice = createSlice({
  name: 'workflows',
  initialState,
  reducers: {
    setCurrentWorkflow: (state, action: PayloadAction<Workflow | null>) => {
      state.currentWorkflow = action.payload
    },
    setWorkflows: (state, action: PayloadAction<Workflow[]>) => {
      state.workflows = action.payload
    },
    addWorkflow: (state, action: PayloadAction<Workflow>) => {
      state.workflows.push(action.payload)
    },
    updateWorkflow: (state, action: PayloadAction<Workflow>) => {
      const index = state.workflows.findIndex(w => w.id === action.payload.id)
      if (index !== -1) {
        state.workflows[index] = action.payload
      }
      if (state.currentWorkflow?.id === action.payload.id) {
        state.currentWorkflow = action.payload
      }
    },
    deleteWorkflow: (state, action: PayloadAction<string>) => {
      state.workflows = state.workflows.filter(w => w.id !== action.payload)
      if (state.currentWorkflow?.id === action.payload) {
        state.currentWorkflow = null
      }
    },
    addElement: (state, action: PayloadAction<WorkflowElement>) => {
      if (state.currentWorkflow) {
        state.currentWorkflow.elements.push(action.payload)
      }
    },
    updateElement: (state, action: PayloadAction<WorkflowElement>) => {
      if (state.currentWorkflow) {
        const index = state.currentWorkflow.elements.findIndex(e => e.id === action.payload.id)
        if (index !== -1) {
          state.currentWorkflow.elements[index] = action.payload
        }
      }
    },
    removeElement: (state, action: PayloadAction<string>) => {
      if (state.currentWorkflow) {
        state.currentWorkflow.elements = state.currentWorkflow.elements.filter(e => e.id !== action.payload)
        state.currentWorkflow.connections = state.currentWorkflow.connections.filter(
          c => c.sourceId !== action.payload && c.targetId !== action.payload
        )
      }
    },
    addConnection: (state, action: PayloadAction<WorkflowConnection>) => {
      if (state.currentWorkflow) {
        state.currentWorkflow.connections.push(action.payload)
      }
    },
    updateConnection: (state, action: PayloadAction<WorkflowConnection>) => {
      if (state.currentWorkflow) {
        const index = state.currentWorkflow.connections.findIndex(c => c.id === action.payload.id)
        if (index !== -1) {
          state.currentWorkflow.connections[index] = action.payload
        }
      }
    },
    removeConnection: (state, action: PayloadAction<string>) => {
      if (state.currentWorkflow) {
        state.currentWorkflow.connections = state.currentWorkflow.connections.filter(c => c.id !== action.payload)
      }
    },
    setCanvasConfig: (state, action: PayloadAction<Partial<WorkflowState['canvasConfig']>>) => {
      state.canvasConfig = { ...state.canvasConfig, ...action.payload }
    },
    setSelectedElements: (state, action: PayloadAction<string[]>) => {
      state.selectedElements = action.payload
    },
    setValidationErrors: (state, action: PayloadAction<ValidationError[]>) => {
      state.validationErrors = action.payload
    },
    setTestMode: (state, action: PayloadAction<Partial<WorkflowState['testMode']>>) => {
      state.testMode = { ...state.testMode, ...action.payload }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    }
  },
  extraReducers: (builder) => {
    // Fetch Workflows
    builder
      .addCase(fetchWorkflows.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchWorkflows.fulfilled, (state, action) => {
        state.isLoading = false
        state.workflows = action.payload.workflows
      })
      .addCase(fetchWorkflows.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Create Workflow
    builder
      .addCase(createWorkflowAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createWorkflowAsync.fulfilled, (state, action) => {
        state.isLoading = false
        state.workflows.push(action.payload)
        state.currentWorkflow = action.payload
      })
      .addCase(createWorkflowAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Update Workflow
    builder
      .addCase(updateWorkflowAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateWorkflowAsync.fulfilled, (state, action) => {
        state.isLoading = false
        const index = state.workflows.findIndex(w => w.id === action.payload.id)
        if (index !== -1) {
          state.workflows[index] = action.payload
        }
        if (state.currentWorkflow?.id === action.payload.id) {
          state.currentWorkflow = action.payload
        }
      })
      .addCase(updateWorkflowAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Delete Workflow
    builder
      .addCase(deleteWorkflowAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteWorkflowAsync.fulfilled, (state, action) => {
        state.isLoading = false
        state.workflows = state.workflows.filter(w => w.id !== action.payload)
        if (state.currentWorkflow?.id === action.payload) {
          state.currentWorkflow = null
        }
      })
      .addCase(deleteWorkflowAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Fetch Workflow By ID
    builder
      .addCase(fetchWorkflowById.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchWorkflowById.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentWorkflow = action.payload
        // Also update in workflows list if it exists
        const index = state.workflows.findIndex(w => w.id === action.payload.id)
        if (index !== -1) {
          state.workflows[index] = action.payload
        }
      })
      .addCase(fetchWorkflowById.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Validate Workflow
    builder
      .addCase(validateWorkflowAsync.pending, (state) => {
        state.isLoading = true
      })
      .addCase(validateWorkflowAsync.fulfilled, (state, action) => {
        state.isLoading = false
        state.validationErrors = [...action.payload.errors, ...action.payload.warnings]
      })
      .addCase(validateWorkflowAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  }
})

export const {
  setCurrentWorkflow,
  setWorkflows,
  addWorkflow,
  updateWorkflow,
  deleteWorkflow,
  addElement,
  updateElement,
  removeElement,
  addConnection,
  updateConnection,
  removeConnection,
  setCanvasConfig,
  setSelectedElements,
  setValidationErrors,
  setTestMode,
  setLoading,
  setError
} = workflowsSlice.actions

export default workflowsSlice.reducer
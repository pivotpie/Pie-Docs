# Workflows Feature - Comprehensive Analysis & Implementation Plan

**Date:** 2025-10-05
**Project:** PieDocs
**Feature:** Workflows Page & Related Components

---

## 📊 Executive Summary

The Workflows feature has a **fully developed frontend** with comprehensive UI components, but is **completely missing backend implementation**. The database schema exists but has no API layer to connect the frontend to the database.

### Status Overview
- ✅ **Frontend**: 95% Complete (UI only, no API integration)
- ❌ **Backend API**: 0% Complete (No routes, no models, no services)
- ✅ **Database Schema**: 100% Complete
- ❌ **Integration**: 0% Complete
- ⚠️  **Overall Functionality**: NON-FUNCTIONAL (Frontend renders but cannot persist data)

---

## 🏗️ Current State Analysis

### 1. Frontend Components (Fully Implemented)

#### Main Pages
**Location:** `pie-docs-frontend/src/pages/workflows/`

1. **WorkflowsPage.tsx**
   - Main workflow management page with 7 tabs
   - Tab-based navigation system
   - Responsive design with glass-morphism UI
   - **Tabs:**
     1. Overview - Workflow list and summary
     2. Workflow Designer - Visual workflow builder
     3. Templates - Pre-built workflow templates
     4. Testing & Validation - Workflow simulation
     5. Connections - Connection management
     6. Version Control - Version history
     7. Export/Import - Import/export workflows

2. **WorkflowDesigner.tsx**
   - Standalone designer component
   - Redux state management
   - Drag-and-drop interface
   - Element palette, canvas, and validation panel

#### Core Components
**Location:** `pie-docs-frontend/src/components/workflows/`

1. **WorkflowCanvas.tsx**
   - Drag-and-drop canvas
   - Zoom and pan controls
   - Grid system (toggleable)
   - Element positioning
   - Connection rendering
   - **Features:**
     - Zoom in/out (0.1x to 3x)
     - Fit to screen
     - Grid toggle
     - Multi-element support

2. **ElementPalette.tsx**
   - Draggable workflow elements
   - **Element Types:**
     - Approval Step
     - Review Step
     - Notification Step
     - Decision Step
     - Timer Step
   - Quick tips section
   - Responsive design

3. **WorkflowNode.tsx**
   - Individual workflow node
   - Connection points (input/output)
   - Node actions (edit, delete)
   - Visual state (selected, dragging)
   - Type-based styling

4. **ConnectionManager.tsx**
   - SVG-based connection rendering
   - Connection validation
   - Circular dependency detection
   - Duplicate connection prevention
   - Connection preview during creation

5. **Validation Components**
   - **ValidationPanel.tsx**: Error/warning display
   - **ValidationEngine.tsx**: Validation logic
   - Error types: errors, warnings
   - Click-to-highlight functionality

6. **Testing Components**
   - **WorkflowSimulator.tsx**: Visual workflow execution
   - **WorkflowTestModal.tsx**: Test configuration modal
   - **TestDataForm.tsx**: Test data input
   - Step-by-step execution visualization

7. **Template Components**
   - **WorkflowTemplateLibrary.tsx**: Pre-built templates
   - Template categories
   - Template preview
   - One-click template application

8. **Version Control**
   - **WorkflowVersionPanel.tsx**: Version history
   - Version comparison
   - Rollback functionality

9. **Export/Import**
   - **WorkflowExportImport.tsx**: JSON import/export
   - Workflow backup/restore
   - Cross-system workflow sharing

### 2. State Management (Redux)

**Location:** `pie-docs-frontend/src/store/slices/workflowsSlice.ts`

#### State Structure
```typescript
interface WorkflowState {
  currentWorkflow: Workflow | null
  workflows: Workflow[]
  canvasConfig: { zoom, pan, gridEnabled }
  selectedElements: string[]
  validationErrors: ValidationError[]
  testMode: { isActive, currentStep, testData }
  isLoading: boolean
  error: string | null
}
```

#### Data Models
```typescript
interface Workflow {
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

interface WorkflowElement {
  id: string
  type: 'approval' | 'review' | 'notification' | 'decision' | 'timer'
  position: { x: number; y: number }
  data: { title, description, config }
}

interface WorkflowConnection {
  id: string
  sourceId: string
  targetId: string
  label?: string
  condition?: string
}
```

#### Redux Actions (18 total)
- Workflow CRUD: setCurrentWorkflow, addWorkflow, updateWorkflow, deleteWorkflow
- Element management: addElement, updateElement, removeElement
- Connection management: addConnection, updateConnection, removeConnection
- Canvas control: setCanvasConfig
- Selection: setSelectedElements
- Validation: setValidationErrors
- Testing: setTestMode
- UI state: setLoading, setError

### 3. Database Schema (Complete)

**Location:** Database tables (PostgreSQL)

#### Main Tables

1. **workflows** (Lines 596-605 in dbschema.csv)
```sql
Table: workflows
- id: uuid PRIMARY KEY
- name: varchar(255) NOT NULL
- description: text
- elements: jsonb DEFAULT '[]'::jsonb
- connections: jsonb DEFAULT '[]'::jsonb
- version: integer DEFAULT 1
- status: varchar(20) DEFAULT 'draft'
- created_by: uuid
- created_at: timestamp with time zone DEFAULT CURRENT_TIMESTAMP
- updated_at: timestamp with time zone DEFAULT CURRENT_TIMESTAMP
```

2. **workflow_executions** (Lines 586-595 in dbschema.csv)
```sql
Table: workflow_executions
- id: uuid PRIMARY KEY
- workflow_id: uuid
- document_id: uuid
- current_step_id: varchar(100)
- status: varchar(50) DEFAULT 'running'
- execution_data: jsonb DEFAULT '{}'
- started_at: timestamp with time zone DEFAULT CURRENT_TIMESTAMP
- completed_at: timestamp with time zone
- error_message: text
- error_stack: text
```

#### Related Tables
- **approval_requests**: Has `workflow_id` foreign key (Line 67)
- **tasks**: Has `workflow_id` and `workflow_step_id` foreign keys (Lines 506-507)

### 4. Backend Implementation (MISSING - CRITICAL GAP!)

**Expected Location:** `pie-docs-backend/app/routers/workflows.py` (DOES NOT EXIST)

#### Current Backend Structure
```
pie-docs-backend/app/
├── main.py (no workflow routes included)
├── routers/
│   ├── auth.py ✅
│   ├── users.py ✅
│   ├── documents.py ✅
│   ├── approvals.py ✅
│   ├── tasks.py ✅
│   └── workflows.py ❌ MISSING!
└── models/
    └── workflows.py ❌ MISSING!
```

---

## 🎯 User Flow & Interaction Patterns

### Current Designed User Journey

#### 1. **Workflow Overview Tab** (Entry Point)
```
User lands → Overview tab displayed
↓
Shows empty state with "No workflows created"
↓
CTA: "Create New Workflow" button → Navigates to Designer tab
```

#### 2. **Workflow Designer Tab** (Primary Workspace)
```
User enters Designer tab
↓
Left Sidebar: Element Palette
↓
User drags elements (approval, review, notification, decision, timer)
↓
Drop on canvas → Element created at position
↓
User configures element properties (title, description, config)
↓
User creates connections between elements
↓
Connection validation runs automatically
  - Self-connection check
  - Circular dependency detection
  - Duplicate connection prevention
↓
Validation results shown in right sidebar
↓
User clicks "Save Workflow" → [BREAKS: NO API]
```

#### 3. **Templates Tab**
```
User selects Templates tab
↓
Browse pre-built workflow templates
↓
Select template → Preview shown
↓
Click "Use Template" → [BREAKS: NO API]
↓
Expected: Template loaded into designer
```

#### 4. **Testing & Validation Tab**
```
User selects Testing tab
↓
Left panel: Workflow Simulator
Right panel: Validation Panel
↓
User configures test data
↓
Click "Run Test" → [BREAKS: NO API]
↓
Expected: Step-by-step execution visualization
```

#### 5. **Connections Tab**
```
User views all connections
↓
Can modify connection properties
- Labels
- Conditions
↓
Save changes → [BREAKS: NO API]
```

#### 6. **Version Control Tab**
```
User views workflow versions
↓
Compare versions
↓
Rollback to previous version → [BREAKS: NO API]
```

#### 7. **Export/Import Tab**
```
Export: Download workflow as JSON ✅ (Frontend only)
Import: Upload workflow JSON → [BREAKS: NO API]
```

### UX Issues Identified

1. **No Persistence**
   - All workflow data stored in Redux (browser memory only)
   - Page refresh = data loss
   - No multi-user support

2. **No Real Validation**
   - Frontend validation only
   - No server-side business logic validation
   - No database constraint validation

3. **No Workflow Execution**
   - Workflows can be designed but never executed
   - No integration with document processing
   - No approval/task triggering

4. **No Collaboration**
   - No real-time updates
   - No shared workflows
   - No workflow permissions

---

## 🚨 Critical Gaps & Issues

### 1. **CRITICAL: Missing Backend API** (Priority: P0)
**Impact:** Entire feature is non-functional beyond UI mockup

**Missing Components:**
- ❌ Workflow router (`/api/v1/workflows/*`)
- ❌ Workflow models (Pydantic schemas)
- ❌ Workflow service layer
- ❌ CRUD operations
- ❌ Workflow execution engine
- ❌ Workflow validation logic
- ❌ Template management
- ❌ Version control logic

**Required API Endpoints:**
```
GET    /api/v1/workflows                 # List all workflows
POST   /api/v1/workflows                 # Create workflow
GET    /api/v1/workflows/{id}            # Get workflow
PUT    /api/v1/workflows/{id}            # Update workflow
DELETE /api/v1/workflows/{id}            # Delete workflow
GET    /api/v1/workflows/{id}/versions   # Get versions
POST   /api/v1/workflows/{id}/versions   # Create version
POST   /api/v1/workflows/{id}/execute    # Execute workflow
GET    /api/v1/workflows/{id}/executions # Get executions
GET    /api/v1/workflow-templates        # List templates
POST   /api/v1/workflow-templates        # Create template
GET    /api/v1/workflow-templates/{id}   # Get template
POST   /api/v1/workflows/{id}/validate   # Validate workflow
POST   /api/v1/workflows/{id}/export     # Export workflow
POST   /api/v1/workflows/import          # Import workflow
```

### 2. **Frontend-Backend Integration** (Priority: P0)
**Issue:** No API calls in frontend components

**Missing Integration Points:**
- WorkflowDesigner.tsx: `handleSaveWorkflow()` - only dispatches Redux action
- WorkflowTemplateLibrary.tsx: No API calls
- WorkflowSimulator.tsx: No execution API
- WorkflowVersionPanel.tsx: No version history API
- WorkflowExportImport.tsx: No import API

**Required:**
- Create API service layer (`src/services/workflowApi.ts`)
- Add axios/fetch calls
- Error handling
- Loading states
- Success/failure feedback

### 3. **Workflow Execution Engine** (Priority: P1)
**Issue:** No backend logic to actually execute workflows

**Missing:**
- Workflow state machine
- Step execution logic
- Approval step integration
- Notification step integration
- Decision step evaluation
- Timer step scheduling
- Error handling and retry logic

### 4. **Template System** (Priority: P2)
**Issue:** No template storage or management

**Missing:**
- Template database table
- Template CRUD operations
- Default templates seeding
- Template categorization
- Template search/filter

### 5. **Version Control** (Priority: P2)
**Issue:** No version history tracking

**Missing:**
- Workflow version table
- Version diff calculation
- Rollback logic
- Version comparison API

### 6. **Permissions & Security** (Priority: P1)
**Issue:** No access control

**Missing:**
- Workflow ownership
- Workflow sharing
- Permission checks
- Role-based access (who can create/edit/execute)

### 7. **Validation Logic** (Priority: P1)
**Issue:** Only basic frontend validation

**Missing:**
- Server-side validation
- Business rule validation
- Database constraint validation
- Workflow cycle detection (backend)

### 8. **Testing Infrastructure** (Priority: P2)
**Issue:** No real workflow testing

**Missing:**
- Test execution engine
- Test data management
- Execution logging
- Performance metrics

---

## 📋 Comprehensive Implementation Plan

### Phase 1: Core Backend API (Priority: P0) - 40 hours

#### 1.1 Database Models & Migrations (8 hours)
**Files to create:**
- `pie-docs-backend/app/models/workflows.py`
- `pie-docs-backend/database/migrations/add_workflow_tables.sql`

**Tasks:**
- [ ] Review existing database schema
- [ ] Create Pydantic models matching database schema
- [ ] Add any missing indexes
- [ ] Create migration scripts (if schema changes needed)
- [ ] Add database constraints
- [ ] Add foreign key relationships

**Pydantic Models Needed:**
```python
# pie-docs-backend/app/models/workflows.py
class WorkflowElementBase(BaseModel):
    type: Literal['approval', 'review', 'notification', 'decision', 'timer']
    position: dict
    data: dict

class WorkflowConnectionBase(BaseModel):
    sourceId: str
    targetId: str
    label: Optional[str]
    condition: Optional[str]

class WorkflowBase(BaseModel):
    name: str
    description: Optional[str]
    elements: List[dict] = []
    connections: List[dict] = []
    status: Literal['draft', 'active', 'archived'] = 'draft'

class WorkflowCreate(WorkflowBase):
    pass

class WorkflowUpdate(BaseModel):
    name: Optional[str]
    description: Optional[str]
    elements: Optional[List[dict]]
    connections: Optional[List[dict]]
    status: Optional[Literal['draft', 'active', 'archived']]

class WorkflowResponse(WorkflowBase):
    id: UUID
    version: int
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime

class WorkflowExecutionBase(BaseModel):
    workflow_id: UUID
    document_id: Optional[UUID]
    current_step_id: Optional[str]
    status: Literal['running', 'completed', 'failed', 'paused']
    execution_data: dict = {}

class WorkflowExecutionResponse(WorkflowExecutionBase):
    id: UUID
    started_at: datetime
    completed_at: Optional[datetime]
    error_message: Optional[str]
```

#### 1.2 Workflow Router & CRUD Operations (12 hours)
**File to create:**
- `pie-docs-backend/app/routers/workflows.py`

**Tasks:**
- [ ] Create FastAPI router
- [ ] Implement workflow CRUD endpoints
- [ ] Add input validation
- [ ] Add error handling
- [ ] Add database transactions
- [ ] Add user authentication checks
- [ ] Add permission checks

**Endpoints to implement:**
```python
# pie-docs-backend/app/routers/workflows.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.models.workflows import *
from app.database import get_db_cursor
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/v1/workflows", tags=["workflows"])

@router.get("/", response_model=List[WorkflowResponse])
async def list_workflows(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all workflows with pagination and filtering"""
    pass

@router.post("/", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    workflow: WorkflowCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new workflow"""
    pass

@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific workflow by ID"""
    pass

@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: UUID,
    workflow: WorkflowUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an existing workflow"""
    pass

@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Delete a workflow"""
    pass
```

#### 1.3 Workflow Validation Service (8 hours)
**File to create:**
- `pie-docs-backend/app/services/workflow_validation.py`

**Tasks:**
- [ ] Create validation service class
- [ ] Implement structure validation
- [ ] Implement circular dependency detection
- [ ] Implement connection validation
- [ ] Implement element configuration validation
- [ ] Add validation error reporting

**Validation Logic:**
```python
# pie-docs-backend/app/services/workflow_validation.py
class WorkflowValidationService:
    def validate_workflow(self, workflow_data: dict) -> tuple[bool, List[dict]]:
        """Validate entire workflow and return (is_valid, errors)"""
        errors = []
        errors.extend(self._validate_structure(workflow_data))
        errors.extend(self._validate_elements(workflow_data['elements']))
        errors.extend(self._validate_connections(workflow_data))
        errors.extend(self._detect_circular_dependencies(workflow_data))
        return (len(errors) == 0, errors)

    def _validate_structure(self, workflow_data: dict) -> List[dict]:
        """Validate basic workflow structure"""
        pass

    def _validate_elements(self, elements: List[dict]) -> List[dict]:
        """Validate all workflow elements"""
        pass

    def _validate_connections(self, workflow_data: dict) -> List[dict]:
        """Validate connections between elements"""
        pass

    def _detect_circular_dependencies(self, workflow_data: dict) -> List[dict]:
        """Detect circular dependencies in workflow graph"""
        pass
```

#### 1.4 Workflow Execution Engine (12 hours)
**File to create:**
- `pie-docs-backend/app/services/workflow_execution.py`

**Tasks:**
- [ ] Create execution engine class
- [ ] Implement state machine
- [ ] Implement step execution
- [ ] Add approval step handler
- [ ] Add notification step handler
- [ ] Add decision step handler
- [ ] Add timer step handler
- [ ] Add error handling and recovery
- [ ] Add execution logging

**Execution Engine:**
```python
# pie-docs-backend/app/services/workflow_execution.py
class WorkflowExecutionEngine:
    def __init__(self):
        self.step_handlers = {
            'approval': ApprovalStepHandler(),
            'review': ReviewStepHandler(),
            'notification': NotificationStepHandler(),
            'decision': DecisionStepHandler(),
            'timer': TimerStepHandler()
        }

    async def start_execution(self, workflow_id: UUID, document_id: Optional[UUID] = None) -> UUID:
        """Start workflow execution and return execution_id"""
        pass

    async def execute_step(self, execution_id: UUID, step_id: str):
        """Execute a single workflow step"""
        pass

    async def handle_step_completion(self, execution_id: UUID, step_id: str, result: dict):
        """Handle completion of a step and move to next"""
        pass

    async def pause_execution(self, execution_id: UUID):
        """Pause workflow execution"""
        pass

    async def resume_execution(self, execution_id: UUID):
        """Resume paused execution"""
        pass

    async def cancel_execution(self, execution_id: UUID):
        """Cancel workflow execution"""
        pass
```

**Step Handlers:**
```python
class ApprovalStepHandler:
    async def execute(self, step_data: dict, execution_context: dict) -> dict:
        """Execute approval step - create approval request"""
        pass

class NotificationStepHandler:
    async def execute(self, step_data: dict, execution_context: dict) -> dict:
        """Execute notification step - send notifications"""
        pass

class DecisionStepHandler:
    async def execute(self, step_data: dict, execution_context: dict) -> dict:
        """Execute decision step - evaluate condition and branch"""
        pass

class TimerStepHandler:
    async def execute(self, step_data: dict, execution_context: dict) -> dict:
        """Execute timer step - schedule delay or trigger"""
        pass
```

---

### Phase 2: Frontend Integration (Priority: P0) - 20 hours

#### 2.1 API Service Layer (6 hours)
**File to create:**
- `pie-docs-frontend/src/services/workflowApi.ts`

**Tasks:**
- [ ] Create API service with axios
- [ ] Add authentication headers
- [ ] Add error handling
- [ ] Add request interceptors
- [ ] Add response interceptors
- [ ] Add TypeScript types

**API Service:**
```typescript
// pie-docs-frontend/src/services/workflowApi.ts
import axios from 'axios';
import type { Workflow, WorkflowCreate, WorkflowUpdate } from '@/types/workflow';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const workflowApi = axios.create({
  baseURL: `${API_BASE_URL}/api/v1/workflows`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
workflowApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const workflowService = {
  // CRUD operations
  async listWorkflows(params?: { skip?: number; limit?: number; status?: string }) {
    const response = await workflowApi.get<Workflow[]>('/', { params });
    return response.data;
  },

  async createWorkflow(workflow: WorkflowCreate) {
    const response = await workflowApi.post<Workflow>('/', workflow);
    return response.data;
  },

  async getWorkflow(id: string) {
    const response = await workflowApi.get<Workflow>(`/${id}`);
    return response.data;
  },

  async updateWorkflow(id: string, workflow: WorkflowUpdate) {
    const response = await workflowApi.put<Workflow>(`/${id}`, workflow);
    return response.data;
  },

  async deleteWorkflow(id: string) {
    await workflowApi.delete(`/${id}`);
  },

  // Execution
  async executeWorkflow(id: string, documentId?: string) {
    const response = await workflowApi.post(`/${id}/execute`, { document_id: documentId });
    return response.data;
  },

  async getExecutions(id: string) {
    const response = await workflowApi.get(`/${id}/executions`);
    return response.data;
  },

  // Validation
  async validateWorkflow(id: string) {
    const response = await workflowApi.post(`/${id}/validate`);
    return response.data;
  },

  // Templates
  async listTemplates() {
    const response = await axios.get(`${API_BASE_URL}/api/v1/workflow-templates`);
    return response.data;
  },

  async getTemplate(id: string) {
    const response = await axios.get(`${API_BASE_URL}/api/v1/workflow-templates/${id}`);
    return response.data;
  },

  // Export/Import
  async exportWorkflow(id: string) {
    const response = await workflowApi.post(`/${id}/export`);
    return response.data;
  },

  async importWorkflow(workflowData: any) {
    const response = await axios.post(`${API_BASE_URL}/api/v1/workflows/import`, workflowData);
    return response.data;
  },
};
```

#### 2.2 Redux Async Actions (4 hours)
**File to update:**
- `pie-docs-frontend/src/store/slices/workflowsSlice.ts`

**Tasks:**
- [ ] Add createAsyncThunk actions
- [ ] Handle loading states
- [ ] Handle errors
- [ ] Update reducers

**Async Thunks:**
```typescript
import { createAsyncThunk } from '@reduxjs/toolkit';
import { workflowService } from '@/services/workflowApi';

export const fetchWorkflows = createAsyncThunk(
  'workflows/fetchWorkflows',
  async (params?: { skip?: number; limit?: number; status?: string }) => {
    return await workflowService.listWorkflows(params);
  }
);

export const createWorkflowAsync = createAsyncThunk(
  'workflows/createWorkflow',
  async (workflow: WorkflowCreate) => {
    return await workflowService.createWorkflow(workflow);
  }
);

export const updateWorkflowAsync = createAsyncThunk(
  'workflows/updateWorkflow',
  async ({ id, workflow }: { id: string; workflow: WorkflowUpdate }) => {
    return await workflowService.updateWorkflow(id, workflow);
  }
);

export const deleteWorkflowAsync = createAsyncThunk(
  'workflows/deleteWorkflow',
  async (id: string) => {
    await workflowService.deleteWorkflow(id);
    return id;
  }
);

export const executeWorkflowAsync = createAsyncThunk(
  'workflows/executeWorkflow',
  async ({ id, documentId }: { id: string; documentId?: string }) => {
    return await workflowService.executeWorkflow(id, documentId);
  }
);
```

#### 2.3 Component Integration (10 hours)
**Files to update:**
- `WorkflowsPage.tsx`
- `WorkflowDesigner.tsx`
- `WorkflowTemplateLibrary.tsx`
- `WorkflowSimulator.tsx`
- `WorkflowTestModal.tsx`
- `WorkflowVersionPanel.tsx`
- `WorkflowExportImport.tsx`

**Tasks per component:**
- [ ] Replace local state with API calls
- [ ] Add loading indicators
- [ ] Add error messages
- [ ] Add success notifications
- [ ] Handle edge cases
- [ ] Add data refetching logic

**Example: WorkflowDesigner.tsx updates**
```typescript
const handleSaveWorkflow = async () => {
  if (!currentWorkflow) return;

  setIsSaving(true);
  try {
    if (currentWorkflow.id.startsWith('workflow-')) {
      // New workflow
      const newWorkflow = await workflowService.createWorkflow({
        name: currentWorkflow.name,
        description: currentWorkflow.description,
        elements: currentWorkflow.elements,
        connections: currentWorkflow.connections,
        status: currentWorkflow.status
      });
      dispatch(setCurrentWorkflow(newWorkflow));
      showSuccessToast('Workflow created successfully!');
    } else {
      // Existing workflow
      const updated = await workflowService.updateWorkflow(currentWorkflow.id, {
        name: currentWorkflow.name,
        description: currentWorkflow.description,
        elements: currentWorkflow.elements,
        connections: currentWorkflow.connections,
        status: currentWorkflow.status
      });
      dispatch(setCurrentWorkflow(updated));
      showSuccessToast('Workflow saved successfully!');
    }
  } catch (error) {
    console.error('Error saving workflow:', error);
    showErrorToast('Failed to save workflow. Please try again.');
  } finally {
    setIsSaving(false);
  }
};
```

---

### Phase 3: Templates & Version Control (Priority: P2) - 16 hours

#### 3.1 Template System (10 hours)

**Backend Tasks:**
- [ ] Create workflow_templates table migration
- [ ] Create template models
- [ ] Create template router
- [ ] Implement template CRUD
- [ ] Seed default templates

**Database Schema:**
```sql
CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    elements JSONB NOT NULL DEFAULT '[]',
    connections JSONB NOT NULL DEFAULT '[]',
    thumbnail_url VARCHAR(1000),
    is_system_template BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX idx_workflow_templates_system ON workflow_templates(is_system_template);
```

**Default Templates:**
1. Document Approval Workflow
2. Document Review Workflow
3. Multi-Level Approval
4. Conditional Routing
5. Time-Based Escalation

**Frontend Tasks:**
- [ ] Update WorkflowTemplateLibrary component
- [ ] Add template preview
- [ ] Add template application logic
- [ ] Add template search/filter

#### 3.2 Version Control (6 hours)

**Backend Tasks:**
- [ ] Create workflow_versions table
- [ ] Create version router
- [ ] Implement version creation on workflow update
- [ ] Implement version comparison
- [ ] Implement rollback logic

**Database Schema:**
```sql
CREATE TABLE workflow_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    elements JSONB NOT NULL DEFAULT '[]',
    connections JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(20),
    change_description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workflow_id, version_number)
);

CREATE INDEX idx_workflow_versions_workflow_id ON workflow_versions(workflow_id);
```

**Frontend Tasks:**
- [ ] Update WorkflowVersionPanel component
- [ ] Add version comparison UI
- [ ] Add rollback confirmation modal
- [ ] Add version diff visualization

---

### Phase 4: Security & Permissions (Priority: P1) - 12 hours

#### 4.1 Access Control (8 hours)

**Backend Tasks:**
- [ ] Add workflow ownership
- [ ] Add permission checks in router
- [ ] Implement sharing logic
- [ ] Add role-based access control

**Database Schema Updates:**
```sql
CREATE TABLE workflow_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    role_id UUID REFERENCES roles(id),
    can_view BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_execute BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_workflow_permissions_workflow ON workflow_permissions(workflow_id);
CREATE INDEX idx_workflow_permissions_user ON workflow_permissions(user_id);
```

**Permission Checks:**
```python
async def check_workflow_permission(workflow_id: UUID, user_id: UUID, permission: str) -> bool:
    """Check if user has permission on workflow"""
    # Check ownership
    # Check direct permissions
    # Check role-based permissions
    pass
```

#### 4.2 Audit Logging (4 hours)

**Backend Tasks:**
- [ ] Add workflow audit logging
- [ ] Log workflow creation/updates/deletion
- [ ] Log workflow executions
- [ ] Log permission changes

**Audit Events:**
- WORKFLOW_CREATED
- WORKFLOW_UPDATED
- WORKFLOW_DELETED
- WORKFLOW_EXECUTED
- WORKFLOW_PERMISSION_GRANTED
- WORKFLOW_PERMISSION_REVOKED

---

### Phase 5: Testing & Documentation (Priority: P2) - 16 hours

#### 5.1 Backend Testing (8 hours)
**Files to create:**
- `pie-docs-backend/app/tests/test_workflows.py`
- `pie-docs-backend/app/tests/test_workflow_execution.py`
- `pie-docs-backend/app/tests/test_workflow_validation.py`

**Test Coverage:**
- [ ] Workflow CRUD operations
- [ ] Validation logic
- [ ] Execution engine
- [ ] Permission checks
- [ ] Template operations
- [ ] Version control

#### 5.2 Frontend Testing (8 hours)
**Existing test files to update:**
- `WorkflowCanvas.test.tsx`
- `ElementPalette.test.tsx`
- `WorkflowConnection.test.tsx`
- `WorkflowTestModal.test.tsx`
- `ValidationPanel.test.tsx`
- `WorkflowTemplateLibrary.test.tsx`

**Test Coverage:**
- [ ] Component rendering
- [ ] User interactions
- [ ] API integration
- [ ] Error handling
- [ ] Loading states
- [ ] Redux state management

---

### Phase 6: Advanced Features (Priority: P3) - 24 hours

#### 6.1 Real-time Collaboration (8 hours)
- [ ] Add WebSocket support
- [ ] Implement real-time workflow updates
- [ ] Add presence indicators
- [ ] Add conflict resolution

#### 6.2 Workflow Analytics (8 hours)
- [ ] Add workflow execution metrics
- [ ] Add performance monitoring
- [ ] Add success/failure rates
- [ ] Add execution time tracking
- [ ] Add bottleneck detection

#### 6.3 Advanced Validation (8 hours)
- [ ] Add custom validation rules
- [ ] Add business rule engine
- [ ] Add data validation
- [ ] Add compliance checks

---

## 📝 Database Migration Plan

### Required Migrations

1. **workflow_templates table** (if not exists)
2. **workflow_versions table** (if not exists)
3. **workflow_permissions table** (if not exists)
4. **Add indexes for performance**
5. **Add foreign key constraints**

### Migration Script Template
```sql
-- Migration: Add workflow support tables
-- Date: 2025-10-05

BEGIN;

-- 1. Workflow templates
CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    elements JSONB NOT NULL DEFAULT '[]',
    connections JSONB NOT NULL DEFAULT '[]',
    thumbnail_url VARCHAR(1000),
    is_system_template BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Workflow versions
CREATE TABLE IF NOT EXISTS workflow_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    elements JSONB NOT NULL DEFAULT '[]',
    connections JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(20),
    change_description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workflow_id, version_number)
);

-- 3. Workflow permissions
CREATE TABLE IF NOT EXISTS workflow_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    role_id UUID REFERENCES roles(id),
    can_view BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_execute BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX idx_workflow_templates_system ON workflow_templates(is_system_template);
CREATE INDEX idx_workflow_versions_workflow_id ON workflow_versions(workflow_id);
CREATE INDEX idx_workflow_permissions_workflow ON workflow_permissions(workflow_id);
CREATE INDEX idx_workflow_permissions_user ON workflow_permissions(user_id);

-- Seed default templates
INSERT INTO workflow_templates (name, description, category, elements, connections, is_system_template)
VALUES
('Document Approval', 'Simple document approval workflow', 'approval', '[]', '[]', true),
('Multi-Level Review', 'Multi-level document review workflow', 'review', '[]', '[]', true);

COMMIT;
```

---

## 🧪 Testing Strategy

### Unit Tests
- **Backend:** pytest for all services and routers
- **Frontend:** Vitest/Jest for components and utilities

### Integration Tests
- API endpoint testing
- Database operations
- Workflow execution flow
- Frontend-backend integration

### E2E Tests
- Complete workflow creation flow
- Workflow execution flow
- Template usage flow
- Version control flow

### Performance Tests
- Load testing for workflow execution
- Concurrent workflow execution
- Large workflow handling
- Database query optimization

---

## 🚀 Deployment Plan

### Development Environment
1. Run database migrations
2. Deploy backend changes
3. Deploy frontend changes
4. Smoke test all features

### Staging Environment
1. Run full test suite
2. Performance testing
3. Security audit
4. UAT (User Acceptance Testing)

### Production Environment
1. Database backup
2. Run migrations during maintenance window
3. Deploy backend (zero-downtime)
4. Deploy frontend
5. Monitor logs and metrics
6. Gradual rollout to users

---

## 📊 Effort Estimate Summary

| Phase | Tasks | Hours | Priority |
|-------|-------|-------|----------|
| Phase 1: Core Backend API | Database models, Router, Validation, Execution | 40 | P0 |
| Phase 2: Frontend Integration | API service, Redux, Components | 20 | P0 |
| Phase 3: Templates & Versions | Template system, Version control | 16 | P2 |
| Phase 4: Security & Permissions | Access control, Audit logging | 12 | P1 |
| Phase 5: Testing & Documentation | Backend tests, Frontend tests | 16 | P2 |
| Phase 6: Advanced Features | Real-time, Analytics, Advanced validation | 24 | P3 |
| **TOTAL** | | **128 hours** | |

**Estimated Timeline:** 3-4 weeks (with 1-2 developers)

---

## 🎯 Success Criteria

### Functional Requirements
- ✅ Users can create, edit, delete workflows
- ✅ Workflows persist to database
- ✅ Workflows can be executed
- ✅ Workflow elements connect properly
- ✅ Validation works correctly
- ✅ Templates can be applied
- ✅ Version history is tracked
- ✅ Permissions are enforced

### Non-Functional Requirements
- ✅ API response time < 200ms (95th percentile)
- ✅ Workflow execution latency < 1s per step
- ✅ Support 100+ concurrent workflow executions
- ✅ 99.9% uptime
- ✅ Zero data loss
- ✅ Comprehensive audit trail

### UX Requirements
- ✅ Smooth drag-and-drop experience
- ✅ Real-time validation feedback
- ✅ Clear error messages
- ✅ Intuitive workflow designer
- ✅ Mobile-responsive design
- ✅ Accessibility compliance (WCAG 2.1 AA)

---

## 🔄 Iteration Plan

### Sprint 1 (Week 1): Foundation
- Backend API basics (CRUD)
- Frontend API integration
- Basic workflow saving/loading

### Sprint 2 (Week 2): Execution
- Workflow execution engine
- Step handlers (approval, notification, etc.)
- Execution monitoring

### Sprint 3 (Week 3): Advanced Features
- Templates
- Version control
- Permissions

### Sprint 4 (Week 4): Polish & Testing
- Bug fixes
- Performance optimization
- Testing
- Documentation

---

## 📞 Next Steps

### Immediate Actions (This Week)
1. **Review and approve this plan**
2. **Set up development environment**
3. **Create database migrations**
4. **Start Phase 1: Backend API development**

### Communication Plan
- Daily standups: Progress updates
- Weekly demos: Feature showcases
- Bi-weekly retrospectives: Process improvements

### Risk Mitigation
- **Risk:** Complexity of execution engine
  **Mitigation:** Start with simple step types, iterate

- **Risk:** Performance issues with large workflows
  **Mitigation:** Implement pagination, lazy loading, caching

- **Risk:** Breaking changes to existing workflows
  **Mitigation:** Version all APIs, maintain backward compatibility

---

## 📚 References

### Documentation Links
- FastAPI: https://fastapi.tiangolo.com/
- React DnD: https://react-dnd.github.io/react-dnd/
- Redux Toolkit: https://redux-toolkit.js.org/
- PostgreSQL JSONB: https://www.postgresql.org/docs/current/datatype-json.html

### Related Features
- Approvals system (already implemented)
- Tasks system (already implemented)
- Notifications system (already implemented)
- Document management (already implemented)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-05
**Status:** DRAFT - Awaiting Approval

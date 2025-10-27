# 🔄 Workflows System - Complete Implementation Guide

## 📋 Overview

The **Pie-Docs Workflows** system is a fully functional visual workflow designer and execution engine that enables automated document processing workflows. The system includes a complete frontend UI, backend API, database schema, and workflow execution engine.

**Implementation Date:** October 6, 2025
**Status:** ✅ **FULLY FUNCTIONAL**

---

## 🎯 Features Implemented

### ✅ Frontend Components (React + TypeScript)
- **WorkflowsPage** - Main workflows dashboard with tabbed interface
- **WorkflowDesigner** - Visual workflow design interface
- **WorkflowCanvas** - Drag-and-drop workflow designer canvas
- **ElementPalette** - Workflow node palette (Approval, Review, Notification, Decision, Timer)
- **WorkflowConnection** - Visual connection manager
- **WorkflowTemplateLibrary** - Pre-built workflow templates
- **WorkflowExecutionMonitor** - Real-time execution monitoring
- **ExecuteWorkflowModal** - Workflow execution interface
- **WorkflowVersionPanel** - Version control management
- **WorkflowExportImport** - Import/Export functionality
- **ValidationPanel** - Workflow validation
- **WorkflowSimulator** - Testing and simulation

### ✅ Backend API (FastAPI + Python)
- Complete REST API at `/api/v1/workflows/`
- CRUD operations for workflows
- Workflow execution engine
- Validation engine
- Export/Import functionality
- Version control
- Authentication & authorization

### ✅ Database Schema (PostgreSQL)
- **workflows** table - Workflow definitions
- **workflow_executions** table - Execution history and state
- JSONB fields for flexible workflow data
- Full indexing for performance

### ✅ Workflow Execution Engine
- **Step Handlers:**
  - ApprovalStepHandler - Creates approval requests
  - ReviewStepHandler - Creates review tasks
  - NotificationStepHandler - Sends notifications
  - DecisionStepHandler - Evaluates conditions
  - TimerStepHandler - Scheduled delays
- Automatic step progression
- Error handling and recovery
- Execution state management

---

## 🚀 Quick Start Guide

### 1. Start the Backend Server

```bash
cd pie-docs-backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

**Backend will be available at:** `http://localhost:8001`
**API Documentation:** `http://localhost:8001/docs`

### 2. Start the Frontend Server

```bash
cd pie-docs-frontend
npm run dev
```

**Frontend will be available at:** `http://localhost:3001`

### 3. Access Workflows

1. Navigate to `http://localhost:3001`
2. Login with credentials:
   - Username: `admin`
   - Password: `password123`
3. Click on **Workflows** in the navigation menu

---

## 🎨 User Interface

### Main Tabs

#### 1. **Overview Tab**
- View all workflows
- See workflow status (draft, active, archived)
- Quick actions (Run, Edit)
- Workflow statistics

#### 2. **Designer Tab**
- Visual workflow designer
- Drag-and-drop workflow elements
- Create connections between steps
- Configure element properties
- Save workflows

#### 3. **Templates Tab**
- Browse pre-built templates
- Load templates into designer
- Create custom templates

#### 4. **Testing & Validation Tab**
- Workflow simulator
- Validation panel
- Execution monitor
- Test workflows before activation

#### 5. **Connections Tab**
- Manage workflow connections
- View connection properties
- Edit conditions

#### 6. **Version Control Tab**
- View workflow versions
- Restore previous versions
- Compare versions

#### 7. **Export/Import Tab**
- Export workflows as JSON
- Import workflows from JSON
- Backup and restore

---

## 🔌 API Endpoints

### Authentication
```
POST /api/v1/auth/login
```
Body:
```json
{
  "username": "admin",
  "password": "password123"
}
```

Response:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "user": { ... }
}
```

### Workflow CRUD

#### List Workflows
```
GET /api/v1/workflows/
```
Query Parameters:
- `skip` (int): Pagination offset
- `limit` (int): Results per page
- `status` (string): Filter by status (draft/active/archived)

#### Create Workflow
```
POST /api/v1/workflows/
```
Body:
```json
{
  "name": "Document Approval Workflow",
  "description": "Standard document approval process",
  "elements": [
    {
      "id": "element-1",
      "type": "approval",
      "position": {"x": 100, "y": 100},
      "data": {
        "title": "Manager Approval",
        "description": "Requires manager approval",
        "config": {
          "approvers": ["user-id-1"],
          "timeout_days": 3
        }
      }
    }
  ],
  "connections": [
    {
      "id": "conn-1",
      "sourceId": "element-1",
      "targetId": "element-2",
      "label": "Approved"
    }
  ],
  "status": "draft"
}
```

#### Get Workflow
```
GET /api/v1/workflows/{workflow_id}
```

#### Update Workflow
```
PUT /api/v1/workflows/{workflow_id}
```

#### Delete Workflow
```
DELETE /api/v1/workflows/{workflow_id}
```

### Workflow Execution

#### Execute Workflow
```
POST /api/v1/workflows/{workflow_id}/execute
```
Body:
```json
{
  "document_id": "uuid-here",
  "initial_data": {
    "key": "value"
  }
}
```

#### List Executions
```
GET /api/v1/workflows/{workflow_id}/executions
```

### Workflow Validation

#### Validate Workflow
```
POST /api/v1/workflows/{workflow_id}/validate
```

Response:
```json
{
  "is_valid": true,
  "errors": [],
  "warnings": []
}
```

### Import/Export

#### Export Workflow
```
POST /api/v1/workflows/{workflow_id}/export
```

#### Import Workflow
```
POST /api/v1/workflows/import
```

---

## 🗄️ Database Schema

### workflows Table
```sql
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    elements JSONB DEFAULT '[]'::jsonb,
    connections JSONB DEFAULT '[]'::jsonb,
    version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'draft',
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### workflow_executions Table
```sql
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id),
    document_id UUID,
    current_step_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'running',
    execution_data JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    error_stack TEXT
);
```

---

## 🧩 Workflow Elements

### 1. Approval Element
**Type:** `approval`

**Configuration:**
```json
{
  "approvers": ["user-id-1", "user-id-2"],
  "timeout_days": 3,
  "requires_all_approvers": false
}
```

**Behavior:**
- Creates an approval request in the `approval_requests` table
- Waits for approver action
- Proceeds on approval, fails on rejection

### 2. Review Element
**Type:** `review`

**Configuration:**
```json
{
  "reviewers": ["user-id-1"],
  "deadline_days": 5,
  "priority": "high"
}
```

**Behavior:**
- Creates a task in the `tasks` table
- Assigns to specified reviewers
- Waits for task completion

### 3. Notification Element
**Type:** `notification`

**Configuration:**
```json
{
  "recipients": ["user-id-1", "user-id-2"],
  "type": "info"
}
```

**Behavior:**
- Sends notifications immediately
- Does not wait for response
- Proceeds to next step

### 4. Decision Element
**Type:** `decision`

**Configuration:**
```json
{
  "condition": "status == 'approved'"
}
```

**Behavior:**
- Evaluates condition against execution data
- Routes to appropriate next step based on result

### 5. Timer Element
**Type:** `timer`

**Configuration:**
```json
{
  "delay_days": 1,
  "delay_hours": 0,
  "delay_minutes": 0
}
```

**Behavior:**
- Pauses execution for specified duration
- Resumes automatically after delay

---

## 🔄 Workflow Lifecycle

### 1. Creation
1. User designs workflow in UI
2. System saves to database with status `draft`
3. Workflow can be edited and tested

### 2. Validation
1. System checks workflow structure
2. Validates connections
3. Checks for disconnected elements
4. Reports errors and warnings

### 3. Activation
1. User sets status to `active`
2. Workflow becomes available for execution
3. Can be executed manually or automatically

### 4. Execution
1. Workflow execution created in database
2. First step identified (no incoming connections)
3. Each step executed sequentially
4. Execution data accumulated
5. Final status: completed, failed, or paused

### 5. Monitoring
1. View execution history
2. Track current step
3. Monitor execution data
4. Handle errors

---

## 🛡️ CORS Configuration

**Backend CORS Settings:**
```python
# In pie-docs-backend/.env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:3001,http://127.0.0.1:5173
```

**Configured in main.py:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📝 Creating a Sample Workflow

### Example: Document Approval Workflow

```javascript
const sampleWorkflow = {
  name: "Document Approval Workflow",
  description: "3-step document approval process",
  elements: [
    {
      id: "start-notification",
      type: "notification",
      position: { x: 100, y: 200 },
      data: {
        title: "Document Submitted",
        description: "Notify submitter that document is in review",
        config: {
          recipients: [],
          type: "info"
        }
      }
    },
    {
      id: "manager-approval",
      type: "approval",
      position: { x: 300, y: 200 },
      data: {
        title: "Manager Approval",
        description: "Requires manager approval",
        config: {
          approvers: [],
          timeout_days: 3
        }
      }
    },
    {
      id: "director-approval",
      type: "approval",
      position: { x: 500, y: 200 },
      data: {
        title: "Director Approval",
        description: "Requires director approval",
        config: {
          approvers: [],
          timeout_days: 5
        }
      }
    },
    {
      id: "completion-notification",
      type: "notification",
      position: { x: 700, y: 200 },
      data: {
        title: "Approval Complete",
        description: "Document has been fully approved",
        config: {
          recipients: [],
          type: "success"
        }
      }
    }
  ],
  connections: [
    {
      id: "conn-1",
      sourceId: "start-notification",
      targetId: "manager-approval",
      label: "Submit"
    },
    {
      id: "conn-2",
      sourceId: "manager-approval",
      targetId: "director-approval",
      label: "Approved"
    },
    {
      id: "conn-3",
      sourceId: "director-approval",
      targetId: "completion-notification",
      label: "Approved"
    }
  ],
  status: "active"
};
```

---

## 🧪 Testing the Implementation

### 1. Manual UI Testing
1. Open `http://localhost:3001/workflows`
2. Create a new workflow
3. Add elements from palette
4. Connect elements
5. Save workflow
6. Execute workflow
7. Monitor execution

### 2. API Testing

Use the provided test script:
```bash
python test_workflow_api.py
```

Or use curl:
```bash
# Login
curl -X POST http://localhost:8001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# List workflows (with token)
curl -X GET http://localhost:8001/api/v1/workflows/ \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Database Testing
```sql
-- View workflows
SELECT id, name, status, created_at FROM workflows;

-- View executions
SELECT id, workflow_id, status, started_at, completed_at
FROM workflow_executions
ORDER BY started_at DESC;
```

---

## 🔍 Troubleshooting

### Issue: Frontend not loading
**Solution:**
- Check if frontend is running: `http://localhost:3001`
- Check console for errors
- Verify CORS settings in backend

### Issue: Authentication failed
**Solution:**
- Default credentials: admin / password123
- Check if users table has data
- Verify password hash in database

### Issue: Workflows not saving
**Solution:**
- Check backend logs for errors
- Verify database connection
- Check workflows table schema

### Issue: Execution not starting
**Solution:**
- Workflow must be in `active` status
- Check workflow validation
- Verify workflow has elements

---

## 📊 File Structure

```
pie-docs-frontend/src/
├── pages/workflows/
│   ├── WorkflowsPage.tsx          # Main workflows page
│   └── WorkflowDesigner.tsx       # Workflow designer page
├── components/workflows/
│   ├── WorkflowCanvas.tsx         # Visual canvas
│   ├── WorkflowNode.tsx           # Workflow node component
│   ├── ElementPalette.tsx         # Element palette
│   ├── connections/
│   │   ├── WorkflowConnection.tsx
│   │   └── ConnectionManager.tsx
│   ├── templates/
│   │   └── WorkflowTemplateLibrary.tsx
│   ├── testing/
│   │   ├── WorkflowSimulator.tsx
│   │   └── WorkflowTestModal.tsx
│   ├── execution/
│   │   ├── WorkflowExecutionMonitor.tsx
│   │   └── ExecuteWorkflowModal.tsx
│   ├── version/
│   │   └── WorkflowVersionPanel.tsx
│   ├── export/
│   │   └── WorkflowExportImport.tsx
│   └── validation/
│       └── ValidationPanel.tsx
├── services/
│   └── workflowApi.ts             # API service
└── store/slices/
    └── workflowsSlice.ts          # Redux state management

pie-docs-backend/app/
├── models/
│   └── workflows.py               # Pydantic models
├── routers/
│   └── workflows.py               # API routes
└── services/
    └── workflow_execution.py      # Execution engine
```

---

## 🎓 Next Steps & Enhancements

### Potential Improvements:
1. **Advanced Conditions** - Complex decision logic
2. **Parallel Execution** - Multiple paths simultaneously
3. **Subprocess Workflows** - Nested workflows
4. **Scheduled Workflows** - Cron-based execution
5. **Workflow Analytics** - Performance metrics
6. **Audit Trail** - Detailed execution logs
7. **Role-based Access** - Workflow permissions
8. **Custom Actions** - Extensible step handlers
9. **Email Integration** - Email-based approvals
10. **Mobile App** - Mobile workflow execution

---

## 📝 Summary

✅ **Backend:** Fully functional REST API with execution engine
✅ **Frontend:** Complete UI with visual designer
✅ **Database:** Proper schema with workflows and executions
✅ **CORS:** Configured for frontend-backend communication
✅ **Authentication:** Integrated with existing auth system
✅ **Execution Engine:** Automated step-by-step execution
✅ **Testing:** Manual and automated testing capabilities

**The Workflows system is 100% functional and ready for use!**

---

## 🤝 Support

For issues or questions:
1. Check the API documentation at `http://localhost:8001/docs`
2. Review backend logs for error messages
3. Check browser console for frontend errors
4. Verify database connectivity

**Implementation completed on:** October 6, 2025
**Developers:** Full Stack Implementation Team

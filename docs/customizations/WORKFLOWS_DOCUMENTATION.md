# Workflows Feature - Complete Documentation

## Overview

The Workflows feature in PieDocs allows users to create, execute, and monitor automated document workflows. This includes approval processes, review tasks, notifications, decision branches, and timed actions.

## Architecture

### Frontend (React + TypeScript)
- **Location**: `pie-docs-frontend/src/pages/workflows/` and `pie-docs-frontend/src/components/workflows/`
- **State Management**: Redux Toolkit (`pie-docs-frontend/src/store/slices/workflowsSlice.ts`)
- **API Service**: Axios-based service (`pie-docs-frontend/src/services/workflowApi.ts`)

### Backend (FastAPI + Python)
- **API Router**: `pie-docs-backend/app/routers/workflows.py`
- **Models**: `pie-docs-backend/app/models/workflows.py`
- **Execution Engine**: `pie-docs-backend/app/services/workflow_execution.py`
- **Database**: PostgreSQL with JSONB for workflow definitions

## Features

### 1. Workflow Designer
- **Visual Canvas**: Drag-and-drop interface for building workflows
- **Element Palette**: Pre-built workflow elements (nodes)
- **Connection Manager**: Visual connection drawing between elements
- **Zoom & Pan**: Canvas navigation controls
- **Grid Snap**: Optional grid alignment

#### Available Workflow Elements

1. **Approval Step**
   - Creates approval requests
   - Supports multiple approvers
   - Configurable timeout/deadline
   - Option for "all must approve" or "any can approve"

2. **Review Step**
   - Creates review tasks
   - Assigns to specific reviewers
   - Sets deadlines and priorities
   - Tracks completion status

3. **Notification Step**
   - Sends in-app notifications
   - Supports multiple recipients
   - Configurable notification types (info, warning, success)

4. **Decision Step**
   - Conditional branching logic
   - Simple condition evaluation
   - Routes workflow based on data

5. **Timer Step**
   - Scheduled delays
   - Configurable time periods (days, hours, minutes)
   - Pauses workflow execution

### 2. Workflow Management
- **Create**: Design new workflows from scratch
- **Update**: Edit existing workflow definitions
- **Delete**: Remove workflows
- **Version Control**: Track workflow versions
- **Status Management**: Draft, Active, Archived

### 3. Workflow Execution
- **Manual Trigger**: Execute workflows on-demand
- **Document Association**: Link executions to specific documents
- **Initial Data**: Pass context data to workflow
- **Real-time Monitoring**: Track execution progress
- **Error Handling**: Capture and display execution errors

### 4. Templates
- **Pre-built Templates**: Common workflow patterns
- **Template Library**: Browse and select templates
- **Custom Templates**: Save your own workflows as templates

### 5. Import/Export
- **JSON Export**: Download workflow definitions
- **JSON Import**: Upload and import workflows
- **Backup & Restore**: Preserve workflow configurations

### 6. Validation
- **Structure Validation**: Check workflow integrity
- **Connection Validation**: Verify element connections
- **Warnings**: Identify potential issues (disconnected nodes, etc.)

## Database Schema

### Workflows Table
```sql
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    elements JSONB DEFAULT '[]'::jsonb,        -- Workflow nodes
    connections JSONB DEFAULT '[]'::jsonb,      -- Connections between nodes
    version INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'draft',         -- draft, active, archived
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Workflow Executions Table
```sql
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id),
    document_id UUID REFERENCES documents(id),
    current_step_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'running',       -- running, completed, failed, paused
    execution_data JSONB DEFAULT '{}'::jsonb,   -- Runtime execution context
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    error_stack TEXT
);
```

## API Endpoints

### Workflow CRUD
- `GET /api/v1/workflows` - List all workflows (with pagination & filters)
- `POST /api/v1/workflows` - Create a new workflow
- `GET /api/v1/workflows/{id}` - Get workflow by ID
- `PUT /api/v1/workflows/{id}` - Update workflow
- `DELETE /api/v1/workflows/{id}` - Delete workflow

### Workflow Execution
- `POST /api/v1/workflows/{id}/execute` - Start workflow execution
- `GET /api/v1/workflows/{id}/executions` - List executions for a workflow

### Workflow Validation
- `POST /api/v1/workflows/{id}/validate` - Validate workflow structure

### Import/Export
- `POST /api/v1/workflows/{id}/export` - Export workflow as JSON
- `POST /api/v1/workflows/import` - Import workflow from JSON

## Setup Instructions

### Prerequisites
1. PostgreSQL database running (with workflows tables created)
2. Python 3.10+ (backend)
3. Node.js 18+ (frontend)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd pie-docs-backend
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   - Ensure `.env` has correct database connection:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5434/piedocs
   ```

4. **Run database migrations**
   ```bash
   python database/run_migrations.py
   ```

5. **Start the backend server**
   ```bash
   python -m app.main
   # Server runs on http://localhost:8001
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd pie-docs-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Update `.env.local`:
   ```
   VITE_API_URL=http://localhost:8001
   VITE_USE_MOCK_DATA=false
   ```

4. **Start the development server**
   ```bash
   npm run dev
   # Server runs on http://localhost:5173
   ```

## Usage Guide

### Creating a Workflow

1. **Navigate to Workflows**
   - Go to `/workflows` in the application
   - Click on the "Designer" tab

2. **Design Your Workflow**
   - Drag elements from the palette onto the canvas
   - Connect elements by clicking on connection points
   - Configure each element by clicking on it

3. **Save Your Workflow**
   - Click the "Save Workflow" button
   - Workflow is saved to the database

4. **Activate Workflow**
   - Set workflow status to "Active"
   - Only active workflows can be executed

### Executing a Workflow

1. **From Overview Tab**
   - Find your workflow in the list
   - Click the "▶️ Run" button
   - Enter optional document ID and initial data
   - Click "Execute Workflow"

2. **Monitor Execution**
   - Go to "Testing & Validation" tab
   - Select workflow from dropdown
   - View real-time execution status and progress

### Viewing Execution History

1. **Select Workflow**
   - Choose a workflow from the monitoring dropdown

2. **View Executions**
   - See list of all past and running executions
   - Click on an execution to see details
   - View execution data, timing, and any errors

## Workflow Execution Logic

### Step Handlers

Each workflow element type has a dedicated handler:

1. **ApprovalStepHandler**
   - Creates an approval request in the database
   - Assigns to specified approvers
   - Sets deadline based on config
   - Workflow pauses until approval is received

2. **ReviewStepHandler**
   - Creates a review task
   - Assigns to reviewers
   - Sets priority and deadline
   - Workflow pauses until task is completed

3. **NotificationStepHandler**
   - Creates notifications for recipients
   - Immediately completes (non-blocking)
   - Workflow continues to next step

4. **DecisionStepHandler**
   - Evaluates condition against execution data
   - Routes to appropriate next step
   - Supports simple expressions:
     - `has:key` - Check if key exists
     - `key == value` - Check equality

5. **TimerStepHandler**
   - Schedules a delay
   - Pauses workflow execution
   - Resumes after specified time

### Execution Flow

1. **Start Execution**
   - Creates execution record in database
   - Finds first step (element with no incoming connections)
   - Begins step execution

2. **Execute Step**
   - Updates `current_step_id` in execution record
   - Calls appropriate step handler
   - Stores result data in `execution_data`

3. **Determine Next Step**
   - If step is "waiting" (approval, review, timer), execution pauses
   - Otherwise, finds next connected element
   - If no next step, marks execution as completed

4. **Error Handling**
   - Catches execution errors
   - Stores error message and stack trace
   - Marks execution as "failed"

## Testing

### Manual Testing Checklist

1. **Workflow Creation**
   - [ ] Create a new workflow
   - [ ] Add multiple elements to canvas
   - [ ] Connect elements
   - [ ] Save workflow
   - [ ] Verify saved in database

2. **Workflow Execution**
   - [ ] Set workflow to "active" status
   - [ ] Execute workflow with test data
   - [ ] Verify execution record created
   - [ ] Check execution progresses through steps

3. **Approval Flow**
   - [ ] Create workflow with approval step
   - [ ] Execute workflow
   - [ ] Verify approval request created
   - [ ] Approve/reject the request
   - [ ] Verify workflow continues/stops appropriately

4. **Monitoring**
   - [ ] View execution list
   - [ ] Select an execution
   - [ ] View execution details
   - [ ] Check execution data displays correctly

5. **Import/Export**
   - [ ] Export a workflow
   - [ ] Verify JSON format
   - [ ] Import the workflow
   - [ ] Verify imported workflow matches original

### API Testing with cURL

#### Create a Workflow
```bash
curl -X POST http://localhost:8001/api/v1/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Workflow",
    "description": "A test workflow",
    "elements": [
      {
        "id": "step-1",
        "type": "notification",
        "position": {"x": 100, "y": 100},
        "data": {
          "title": "Start Notification",
          "config": {
            "recipients": ["USER_UUID"]
          }
        }
      }
    ],
    "connections": [],
    "status": "active"
  }'
```

#### Execute a Workflow
```bash
curl -X POST http://localhost:8001/api/v1/workflows/{WORKFLOW_ID}/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "initial_data": {"test": "data"}
  }'
```

#### List Executions
```bash
curl -X GET http://localhost:8001/api/v1/workflows/{WORKFLOW_ID}/executions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Common Issues

#### 1. "Workflow must be active to execute"
**Solution**: Set workflow status to "active" before executing
```bash
curl -X PUT http://localhost:8001/api/v1/workflows/{WORKFLOW_ID} \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

#### 2. "No handler for step type"
**Solution**: Ensure step type is one of: approval, review, notification, decision, timer

#### 3. "Database connection failed"
**Solution**:
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure migrations have been run

#### 4. "Frontend can't connect to API"
**Solution**:
- Verify backend is running on port 8001
- Check `VITE_API_URL` in `.env.local`
- Ensure CORS is configured correctly

#### 5. "Approval step not working"
**Solution**:
- Verify `approval_requests` table exists
- Check that approver UUIDs are valid user IDs
- Ensure user has permissions

## Advanced Configuration

### Custom Step Handlers

To add a new workflow step type:

1. **Create Handler Class** (`pie-docs-backend/app/services/workflow_execution.py`)
   ```python
   class CustomStepHandler(StepHandler):
       def can_handle(self, step_type: str) -> bool:
           return step_type == 'custom'

       async def execute(self, step_data, execution_context):
           # Your custom logic here
           return {
               'success': True,
               'message': 'Custom step executed',
               'data': {}
           }
   ```

2. **Register Handler**
   ```python
   # In WorkflowExecutionEngine.__init__
   self.handlers.append(CustomStepHandler())
   ```

3. **Add to Frontend** (`pie-docs-frontend/src/components/workflows/ElementPalette.tsx`)
   ```typescript
   {
     type: 'custom' as const,
     title: 'Custom Step',
     description: 'Your custom step description',
     icon: <YourIcon />
   }
   ```

### Webhook Integration

Workflows can trigger webhooks on certain events. Configure in `webhooks` table.

### Scheduled Workflows

Use the timer step with a cron-like trigger to create scheduled workflows.

## Performance Considerations

- **Large Workflows**: Workflows with 50+ elements may slow down the designer. Consider breaking into sub-workflows.
- **Execution Volume**: High-frequency executions should be monitored for database performance.
- **JSONB Queries**: Indexes on JSONB fields can improve query performance.

## Security

- All workflow API endpoints require authentication
- Workflow execution permissions can be controlled via RBAC
- Sensitive data in `execution_data` should be encrypted
- Audit logs track workflow creation and execution

## Future Enhancements

Planned features:
- [ ] Sub-workflows (call workflow from workflow)
- [ ] Parallel execution paths
- [ ] Advanced condition builder
- [ ] Workflow templates marketplace
- [ ] Email/SMS notifications
- [ ] Integration with external systems (Zapier, Make, etc.)
- [ ] Workflow analytics and insights
- [ ] A/B testing for workflows
- [ ] Workflow rollback functionality

## Support

For issues or questions:
- Check the troubleshooting section above
- Review API documentation at `http://localhost:8001/docs`
- Examine backend logs for detailed error messages
- Use browser DevTools to inspect network requests

---

**Version**: 1.0.0
**Last Updated**: 2025-01-06
**Maintained by**: PieDocs Development Team

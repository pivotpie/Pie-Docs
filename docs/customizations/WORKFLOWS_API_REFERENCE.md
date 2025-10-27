# 📚 Workflows API Reference

Complete API reference for the Pie-Docs Workflows system.

**Base URL:** `http://localhost:8001/api/v1/workflows`

**Authentication:** Bearer token (JWT) required for all endpoints

---

## 🔐 Authentication

All workflow endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

### Get Access Token

**Endpoint:** `POST /api/v1/auth/login`

**Request:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@piedocs.com"
  },
  "requires_mfa": false
}
```

---

## 📋 Workflow Management

### List Workflows

**Endpoint:** `GET /api/v1/workflows/`

**Query Parameters:**
- `skip` (integer, default: 0) - Number of records to skip
- `limit` (integer, default: 50, max: 100) - Max records to return
- `status` (string, optional) - Filter by status: `draft`, `active`, or `archived`

**Example Request:**
```bash
curl -X GET "http://localhost:8001/api/v1/workflows/?skip=0&limit=10&status=active" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "total": 5,
  "workflows": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Document Approval Workflow",
      "description": "Standard document approval process",
      "elements": [...],
      "connections": [...],
      "version": 1,
      "status": "active",
      "created_by": "uuid",
      "created_at": "2025-10-06T10:00:00Z",
      "updated_at": "2025-10-06T10:00:00Z"
    }
  ]
}
```

---

### Create Workflow

**Endpoint:** `POST /api/v1/workflows/`

**Request Body:**
```json
{
  "name": "My Workflow",
  "description": "Workflow description",
  "elements": [
    {
      "id": "element-1",
      "type": "approval",
      "position": {"x": 100, "y": 100},
      "data": {
        "title": "Approval Step",
        "description": "Requires approval",
        "config": {
          "approvers": ["user-uuid"],
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

**Response:** `201 Created`
```json
{
  "id": "new-workflow-uuid",
  "name": "My Workflow",
  "description": "Workflow description",
  "elements": [...],
  "connections": [...],
  "version": 1,
  "status": "draft",
  "created_by": "user-uuid",
  "created_at": "2025-10-06T10:00:00Z",
  "updated_at": "2025-10-06T10:00:00Z"
}
```

---

### Get Workflow

**Endpoint:** `GET /api/v1/workflows/{workflow_id}`

**Example Request:**
```bash
curl -X GET "http://localhost:8001/api/v1/workflows/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Document Approval Workflow",
  "description": "Standard document approval process",
  "elements": [...],
  "connections": [...],
  "version": 1,
  "status": "active",
  "created_by": "user-uuid",
  "created_at": "2025-10-06T10:00:00Z",
  "updated_at": "2025-10-06T10:00:00Z"
}
```

**Error Response:** `404 Not Found`
```json
{
  "detail": "Workflow {workflow_id} not found"
}
```

---

### Update Workflow

**Endpoint:** `PUT /api/v1/workflows/{workflow_id}`

**Request Body:** (All fields optional)
```json
{
  "name": "Updated Workflow Name",
  "description": "Updated description",
  "elements": [...],
  "connections": [...],
  "status": "active"
}
```

**Notes:**
- Only provided fields will be updated
- Version is automatically incremented
- `updated_at` timestamp is automatically updated

**Response:** `200 OK`
```json
{
  "id": "workflow-uuid",
  "name": "Updated Workflow Name",
  "version": 2,
  ...
}
```

---

### Delete Workflow

**Endpoint:** `DELETE /api/v1/workflows/{workflow_id}`

**Example Request:**
```bash
curl -X DELETE "http://localhost:8001/api/v1/workflows/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `204 No Content`

**Error Response:** `404 Not Found`
```json
{
  "detail": "Workflow {workflow_id} not found"
}
```

---

## ▶️ Workflow Execution

### Execute Workflow

**Endpoint:** `POST /api/v1/workflows/{workflow_id}/execute`

**Request Body:**
```json
{
  "document_id": "document-uuid",
  "initial_data": {
    "requester": "user-uuid",
    "priority": "high",
    "custom_field": "value"
  }
}
```

**Notes:**
- Workflow must have `status: "active"` to be executed
- `document_id` is optional (can be null for general workflows)
- `initial_data` is optional (defaults to {})

**Response:** `201 Created`
```json
{
  "id": "execution-uuid",
  "workflow_id": "workflow-uuid",
  "document_id": "document-uuid",
  "current_step_id": "element-1",
  "status": "running",
  "execution_data": {
    "requester": "user-uuid",
    "priority": "high"
  },
  "started_at": "2025-10-06T10:00:00Z",
  "completed_at": null,
  "error_message": null,
  "error_stack": null
}
```

**Error Responses:**

`404 Not Found` - Workflow doesn't exist
```json
{
  "detail": "Workflow {workflow_id} not found"
}
```

`400 Bad Request` - Workflow is not active
```json
{
  "detail": "Workflow must be active to execute (current status: draft)"
}
```

---

### List Workflow Executions

**Endpoint:** `GET /api/v1/workflows/{workflow_id}/executions`

**Query Parameters:**
- `skip` (integer, default: 0) - Number of records to skip
- `limit` (integer, default: 50, max: 100) - Max records to return

**Example Request:**
```bash
curl -X GET "http://localhost:8001/api/v1/workflows/550e8400-e29b-41d4-a716-446655440000/executions?skip=0&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`
```json
[
  {
    "id": "execution-uuid-1",
    "workflow_id": "workflow-uuid",
    "document_id": "document-uuid",
    "current_step_id": "element-3",
    "status": "completed",
    "execution_data": {...},
    "started_at": "2025-10-06T10:00:00Z",
    "completed_at": "2025-10-06T10:15:00Z",
    "error_message": null,
    "error_stack": null
  },
  {
    "id": "execution-uuid-2",
    "workflow_id": "workflow-uuid",
    "document_id": "document-uuid",
    "current_step_id": "element-2",
    "status": "running",
    "execution_data": {...},
    "started_at": "2025-10-06T11:00:00Z",
    "completed_at": null,
    "error_message": null,
    "error_stack": null
  }
]
```

---

## ✅ Workflow Validation

### Validate Workflow

**Endpoint:** `POST /api/v1/workflows/{workflow_id}/validate`

**Example Request:**
```bash
curl -X POST "http://localhost:8001/api/v1/workflows/550e8400-e29b-41d4-a716-446655440000/validate" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`
```json
{
  "is_valid": true,
  "errors": [],
  "warnings": [
    {
      "id": "warning-disconnected",
      "type": "warning",
      "message": "2 element(s) are not connected to the workflow",
      "elementId": "element-5"
    }
  ]
}
```

**Validation Checks:**
- Empty workflow (warning)
- Disconnected elements (warning)
- Invalid connections (error)
- Missing required config (error)

---

## 📤 Import/Export

### Export Workflow

**Endpoint:** `POST /api/v1/workflows/{workflow_id}/export`

**Example Request:**
```bash
curl -X POST "http://localhost:8001/api/v1/workflows/550e8400-e29b-41d4-a716-446655440000/export" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:** `200 OK`
```json
{
  "workflow": {
    "id": "workflow-uuid",
    "name": "Document Approval Workflow",
    "description": "Standard document approval process",
    "elements": [...],
    "connections": [...],
    "version": 1,
    "status": "active",
    "created_by": "user-uuid",
    "created_at": "2025-10-06T10:00:00Z",
    "updated_at": "2025-10-06T10:00:00Z"
  },
  "export_date": "2025-10-06T12:00:00Z",
  "version": "1.0"
}
```

---

### Import Workflow

**Endpoint:** `POST /api/v1/workflows/import`

**Request Body:**
```json
{
  "name": "Imported Workflow",
  "description": "Workflow imported from JSON",
  "elements": [...],
  "connections": [...],
  "preserve_ids": false
}
```

**Notes:**
- `preserve_ids`: If true, keeps original element/connection IDs (may cause conflicts)
- If false, generates new IDs (default behavior)
- Imported workflow always starts with `status: "draft"`

**Response:** `201 Created`
```json
{
  "id": "new-workflow-uuid",
  "name": "Imported Workflow",
  "description": "Workflow imported from JSON",
  "elements": [...],
  "connections": [...],
  "version": 1,
  "status": "draft",
  "created_by": "user-uuid",
  "created_at": "2025-10-06T12:00:00Z",
  "updated_at": "2025-10-06T12:00:00Z"
}
```

---

## 📊 Data Models

### Workflow Element Types

| Type | Description | Configuration |
|------|-------------|---------------|
| `approval` | Approval step | `approvers`, `timeout_days`, `requires_all_approvers` |
| `review` | Review task | `reviewers`, `deadline_days`, `priority` |
| `notification` | Send notification | `recipients`, `type` |
| `decision` | Conditional logic | `condition` |
| `timer` | Delay execution | `delay_days`, `delay_hours`, `delay_minutes` |

### Workflow Status Values

| Status | Description |
|--------|-------------|
| `draft` | Workflow is being designed, not executable |
| `active` | Workflow is active and can be executed |
| `archived` | Workflow is archived, not executable |

### Execution Status Values

| Status | Description |
|--------|-------------|
| `running` | Execution is in progress |
| `completed` | Execution completed successfully |
| `failed` | Execution failed with error |
| `paused` | Execution is paused (waiting for external action) |

---

## 🚨 Error Codes

| Status Code | Description |
|-------------|-------------|
| `200` | Success (GET, PUT) |
| `201` | Created (POST) |
| `204` | No Content (DELETE) |
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Invalid or missing token |
| `404` | Not Found - Resource doesn't exist |
| `500` | Internal Server Error - Server error |

---

## 💡 Usage Examples

### Complete Workflow Creation Example

```javascript
// JavaScript/TypeScript example
const createWorkflow = async () => {
  // 1. Login
  const loginResponse = await fetch('http://localhost:8001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'password123'
    })
  });
  const { access_token } = await loginResponse.json();

  // 2. Create workflow
  const workflowResponse = await fetch('http://localhost:8001/api/v1/workflows/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access_token}`
    },
    body: JSON.stringify({
      name: 'Simple Approval',
      description: 'Basic approval workflow',
      elements: [
        {
          id: 'approval-1',
          type: 'approval',
          position: { x: 100, y: 100 },
          data: {
            title: 'Approve Document',
            description: 'Requires approval',
            config: { approvers: [], timeout_days: 3 }
          }
        }
      ],
      connections: [],
      status: 'draft'
    })
  });
  const workflow = await workflowResponse.json();
  console.log('Created workflow:', workflow.id);

  // 3. Activate workflow
  const updateResponse = await fetch(
    `http://localhost:8001/api/v1/workflows/${workflow.id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`
      },
      body: JSON.stringify({ status: 'active' })
    }
  );

  // 4. Execute workflow
  const executeResponse = await fetch(
    `http://localhost:8001/api/v1/workflows/${workflow.id}/execute`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`
      },
      body: JSON.stringify({
        document_id: null,
        initial_data: { note: 'Test execution' }
      })
    }
  );
  const execution = await executeResponse.json();
  console.log('Execution started:', execution.id);
};
```

### Python Example

```python
import requests

BASE_URL = "http://localhost:8001"

# Login
login_resp = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
    "username": "admin",
    "password": "password123"
})
token = login_resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Create workflow
workflow_data = {
    "name": "Test Workflow",
    "elements": [],
    "connections": [],
    "status": "draft"
}
workflow_resp = requests.post(
    f"{BASE_URL}/api/v1/workflows/",
    json=workflow_data,
    headers=headers
)
workflow = workflow_resp.json()
print(f"Created workflow: {workflow['id']}")

# Execute
exec_resp = requests.post(
    f"{BASE_URL}/api/v1/workflows/{workflow['id']}/execute",
    json={"initial_data": {}},
    headers=headers
)
execution = exec_resp.json()
print(f"Execution: {execution['id']} - Status: {execution['status']}")
```

---

## 🔗 Related Documentation

- [Complete Implementation Guide](./WORKFLOWS_COMPLETE_IMPLEMENTATION_GUIDE.md)
- [API Documentation](http://localhost:8001/docs) (Interactive Swagger UI)
- [Frontend Components Documentation](./pie-docs-frontend/src/components/workflows/)

---

**Last Updated:** October 6, 2025

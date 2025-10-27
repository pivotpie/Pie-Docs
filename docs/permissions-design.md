# PieDocs Permissions Design

## Overview
This document outlines the comprehensive Role-Based Access Control (RBAC) permissions system for PieDocs, mapping each component, API endpoint, and database operation to specific permissions.

## Permission Naming Convention
Format: `{resource}.{action}`

### Standard Actions
- `view` - Read/view access
- `create` - Create new records
- `edit` - Modify existing records
- `delete` - Remove records
- `manage` - Full control (includes all actions)
- `approve` - Approve/reject items
- `export` - Export data
- `import` - Import data
- `share` - Share with others
- `checkout` - Check out items
- `checkin` - Check in items

---

## 1. AUTHENTICATION & USER MANAGEMENT

### 1.1 Users
**Resource**: `users`
**Database Table**: `users`
**API Endpoints**: `/api/v1/users/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `users.view` | View user profiles | SELECT on users | GET /users, GET /users/{id} |
| `users.create` | Create new users | INSERT on users | POST /users |
| `users.edit` | Edit user profiles | UPDATE on users | PUT /users/{id}, PATCH /users/{id} |
| `users.delete` | Delete users | UPDATE users SET deleted_at | DELETE /users/{id} |
| `users.manage` | Full user management | All operations on users | All /users/* endpoints |
| `users.activate` | Activate/deactivate users | UPDATE users.is_active | POST /users/{id}/activate, POST /users/{id}/deactivate |
| `users.reset_password` | Reset user passwords | UPDATE users.password_hash | POST /users/{id}/reset-password |
| `users.impersonate` | Login as another user | SELECT on users | POST /users/{id}/impersonate |

### 1.2 Roles
**Resource**: `roles`
**Database Table**: `roles`
**API Endpoints**: `/api/v1/roles/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `roles.view` | View roles | SELECT on roles | GET /roles, GET /roles/{id} |
| `roles.create` | Create new roles | INSERT on roles | POST /roles |
| `roles.edit` | Edit roles | UPDATE on roles | PUT /roles/{id}, PATCH /roles/{id} |
| `roles.delete` | Delete roles | DELETE on roles | DELETE /roles/{id} |
| `roles.manage` | Full role management | All operations on roles | All /roles/* endpoints |
| `roles.assign` | Assign roles to users | INSERT/DELETE on user_roles | POST /users/{id}/roles |

### 1.3 Permissions
**Resource**: `permissions`
**Database Table**: `permissions`
**API Endpoints**: `/api/v1/permissions/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `permissions.view` | View permissions | SELECT on permissions | GET /permissions |
| `permissions.manage` | Manage permissions | All operations on permissions, role_permissions | All /permissions/* endpoints |

---

## 2. DOCUMENT MANAGEMENT

### 2.1 Documents
**Resource**: `documents`
**Database Table**: `documents`
**API Endpoints**: `/api/v1/documents/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `documents.view` | View documents | SELECT on documents | GET /documents, GET /documents/{id} |
| `documents.create` | Upload documents | INSERT on documents | POST /documents, POST /documents/upload |
| `documents.edit` | Edit document metadata | UPDATE on documents | PUT /documents/{id}, PATCH /documents/{id} |
| `documents.delete` | Delete documents | UPDATE documents SET deleted_at | DELETE /documents/{id} |
| `documents.manage` | Full document management | All operations on documents | All /documents/* endpoints |
| `documents.download` | Download documents | SELECT on documents | GET /documents/{id}/download |
| `documents.preview` | Preview documents | SELECT on documents | GET /documents/{id}/preview |
| `documents.share` | Share documents | INSERT on document_shares | POST /documents/{id}/share |
| `documents.version` | Manage versions | INSERT/SELECT on document_versions | GET/POST /documents/{id}/versions |
| `documents.export` | Export documents | SELECT on documents | POST /documents/export |
| `documents.bulk_upload` | Bulk upload | INSERT multiple on documents | POST /documents/bulk-upload |
| `documents.bulk_delete` | Bulk delete | UPDATE multiple documents | POST /documents/bulk-delete |

### 2.2 Folders
**Resource**: `folders`
**Database Table**: `folders`
**API Endpoints**: `/api/v1/folders/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `folders.view` | View folders | SELECT on folders | GET /folders, GET /folders/{id} |
| `folders.create` | Create folders | INSERT on folders | POST /folders |
| `folders.edit` | Edit folders | UPDATE on folders | PUT /folders/{id}, PATCH /folders/{id} |
| `folders.delete` | Delete folders | DELETE on folders | DELETE /folders/{id} |
| `folders.manage` | Full folder management | All operations on folders | All /folders/* endpoints |
| `folders.move` | Move folders | UPDATE folders.parent_id | POST /folders/{id}/move |

### 2.3 Cabinets (Mayan Integration)
**Resource**: `cabinets`
**Database Table**: `cabinets`
**API Endpoints**: `/api/v1/cabinets/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `cabinets.view` | View cabinets | SELECT on cabinets | GET /cabinets, GET /cabinets/{id} |
| `cabinets.create` | Create cabinets | INSERT on cabinets | POST /cabinets |
| `cabinets.edit` | Edit cabinets | UPDATE on cabinets | PUT /cabinets/{id} |
| `cabinets.delete` | Delete cabinets | DELETE on cabinets | DELETE /cabinets/{id} |
| `cabinets.manage` | Full cabinet management | All operations on cabinets | All /cabinets/* endpoints |

### 2.4 Tags
**Resource**: `tags`
**Database Table**: `tags`
**API Endpoints**: `/api/v1/tags/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `tags.view` | View tags | SELECT on tags | GET /tags |
| `tags.create` | Create tags | INSERT on tags | POST /tags |
| `tags.edit` | Edit tags | UPDATE on tags | PUT /tags/{id} |
| `tags.delete` | Delete tags | DELETE on tags | DELETE /tags/{id} |
| `tags.manage` | Full tag management | All operations on tags | All /tags/* endpoints |
| `tags.apply` | Apply tags to documents | INSERT on document_tags | POST /documents/{id}/tags |

### 2.5 Document Types
**Resource**: `document_types`
**Database Table**: `document_types`
**API Endpoints**: `/api/v1/document-types/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `document_types.view` | View document types | SELECT on document_types | GET /document-types |
| `document_types.create` | Create document types | INSERT on document_types | POST /document-types |
| `document_types.edit` | Edit document types | UPDATE on document_types | PUT /document-types/{id} |
| `document_types.delete` | Delete document types | DELETE on document_types | DELETE /document-types/{id} |
| `document_types.manage` | Full document type management | All operations on document_types | All /document-types/* endpoints |

---

## 3. METADATA & CLASSIFICATION

### 3.1 Metadata Schemas
**Resource**: `metadata_schemas`
**Database Table**: `metadata_schemas`
**API Endpoints**: `/api/v1/metadata-schemas/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `metadata_schemas.view` | View metadata schemas | SELECT on metadata_schemas | GET /metadata-schemas |
| `metadata_schemas.create` | Create metadata schemas | INSERT on metadata_schemas | POST /metadata-schemas |
| `metadata_schemas.edit` | Edit metadata schemas | UPDATE on metadata_schemas | PUT /metadata-schemas/{id} |
| `metadata_schemas.delete` | Delete metadata schemas | DELETE on metadata_schemas | DELETE /metadata-schemas/{id} |
| `metadata_schemas.manage` | Full schema management | All operations on metadata_schemas | All /metadata-schemas/* endpoints |

### 3.2 Annotations
**Resource**: `annotations`
**Database Table**: `annotations`
**API Endpoints**: `/api/v1/annotations/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `annotations.view` | View annotations | SELECT on annotations | GET /annotations, GET /documents/{id}/annotations |
| `annotations.create` | Create annotations | INSERT on annotations | POST /annotations |
| `annotations.edit` | Edit own annotations | UPDATE on annotations | PUT /annotations/{id} |
| `annotations.delete` | Delete own annotations | DELETE on annotations | DELETE /annotations/{id} |
| `annotations.manage` | Manage all annotations | All operations on annotations | All /annotations/* endpoints |

---

## 4. WORKFLOW & APPROVALS

### 4.1 Workflows
**Resource**: `workflows`
**Database Table**: `approval_chains`
**API Endpoints**: `/api/v1/workflows/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `workflows.view` | View workflows | SELECT on approval_chains | GET /workflows |
| `workflows.create` | Create workflows | INSERT on approval_chains | POST /workflows |
| `workflows.edit` | Edit workflows | UPDATE on approval_chains | PUT /workflows/{id} |
| `workflows.delete` | Delete workflows | DELETE on approval_chains | DELETE /workflows/{id} |
| `workflows.manage` | Full workflow management | All operations on approval_chains | All /workflows/* endpoints |
| `workflows.assign` | Assign workflows to documents | UPDATE documents.approval_chain_id | POST /documents/{id}/workflow |

### 4.2 Approvals
**Resource**: `approvals`
**Database Table**: `approvals`
**API Endpoints**: `/api/v1/approvals/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `approvals.view` | View approval requests | SELECT on approvals | GET /approvals |
| `approvals.approve` | Approve requests | UPDATE approvals | POST /approvals/{id}/approve |
| `approvals.reject` | Reject requests | UPDATE approvals | POST /approvals/{id}/reject |
| `approvals.manage` | Manage all approvals | All operations on approvals | All /approvals/* endpoints |
| `approvals.reassign` | Reassign approvals | UPDATE approvals.approver_id | POST /approvals/{id}/reassign |

---

## 5. TASKS & NOTIFICATIONS

### 5.1 Tasks
**Resource**: `tasks`
**Database Table**: `tasks`
**API Endpoints**: `/api/v1/tasks/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `tasks.view` | View tasks | SELECT on tasks | GET /tasks |
| `tasks.create` | Create tasks | INSERT on tasks | POST /tasks |
| `tasks.edit` | Edit tasks | UPDATE on tasks | PUT /tasks/{id} |
| `tasks.delete` | Delete tasks | DELETE on tasks | DELETE /tasks/{id} |
| `tasks.manage` | Full task management | All operations on tasks | All /tasks/* endpoints |
| `tasks.assign` | Assign tasks | UPDATE tasks.assignee_id | POST /tasks/{id}/assign |
| `tasks.complete` | Mark tasks complete | UPDATE tasks.status | POST /tasks/{id}/complete |

### 5.2 Notifications
**Resource**: `notifications`
**Database Table**: `notifications`
**API Endpoints**: `/api/v1/notifications/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `notifications.view` | View own notifications | SELECT on notifications | GET /notifications |
| `notifications.manage` | Manage all notifications | All operations on notifications | All /notifications/* endpoints |
| `notifications.send` | Send notifications | INSERT on notifications | POST /notifications |
| `notifications.mark_read` | Mark as read | UPDATE notifications | POST /notifications/{id}/read |

---

## 6. PHYSICAL DOCUMENT MANAGEMENT

### 6.1 Physical Locations
**Resource**: `physical_locations`
**Database Table**: `storage_locations`
**API Endpoints**: `/api/v1/physical-locations/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `physical_locations.view` | View storage locations | SELECT on storage_locations | GET /physical-locations |
| `physical_locations.create` | Create locations | INSERT on storage_locations | POST /physical-locations |
| `physical_locations.edit` | Edit locations | UPDATE on storage_locations | PUT /physical-locations/{id} |
| `physical_locations.delete` | Delete locations | DELETE on storage_locations | DELETE /physical-locations/{id} |
| `physical_locations.manage` | Full location management | All operations on storage_locations | All /physical-locations/* endpoints |

### 6.2 Barcodes
**Resource**: `barcodes`
**Database Table**: `physical_barcodes`
**API Endpoints**: `/api/v1/barcodes/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `barcodes.view` | View barcodes | SELECT on physical_barcodes | GET /barcodes |
| `barcodes.generate` | Generate barcodes | INSERT on physical_barcodes | POST /barcodes/generate |
| `barcodes.print` | Print barcode labels | SELECT on physical_barcodes | POST /barcodes/print |
| `barcodes.scan` | Scan barcodes (mobile) | SELECT on physical_barcodes | POST /barcodes/scan |
| `barcodes.manage` | Full barcode management | All operations on physical_barcodes | All /barcodes/* endpoints |

### 6.3 Check-In/Check-Out
**Resource**: `checkinout`
**Database Table**: `document_checkouts`
**API Endpoints**: `/api/v1/checkinout/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `checkinout.view` | View checkout history | SELECT on document_checkouts | GET /checkinout |
| `checkinout.checkout` | Check out documents | INSERT on document_checkouts | POST /documents/{id}/checkout |
| `checkinout.checkin` | Check in documents | UPDATE document_checkouts | POST /documents/{id}/checkin |
| `checkinout.override` | Override checkouts | UPDATE document_checkouts | POST /checkinout/{id}/override |
| `checkinout.manage` | Full check-in/out management | All operations on document_checkouts | All /checkinout/* endpoints |

---

## 7. OCR & PROCESSING

### 7.1 OCR
**Resource**: `ocr`
**Database Table**: `ocr_results`
**API Endpoints**: `/api/v1/ocr/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `ocr.view` | View OCR results | SELECT on ocr_results | GET /documents/{id}/ocr |
| `ocr.process` | Trigger OCR processing | INSERT on ocr_results | POST /documents/{id}/ocr |
| `ocr.reprocess` | Reprocess OCR | UPDATE ocr_results | POST /documents/{id}/ocr/reprocess |
| `ocr.manage` | Full OCR management | All operations on ocr_results | All /ocr/* endpoints |

---

## 8. SYSTEM ADMINISTRATION

### 8.1 Settings
**Resource**: `settings`
**Database Table**: `system_settings`
**API Endpoints**: `/api/v1/settings/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `settings.view` | View system settings | SELECT on system_settings | GET /settings |
| `settings.edit` | Edit system settings | UPDATE on system_settings | PUT /settings/{key} |
| `settings.manage` | Full settings management | All operations on system_settings | All /settings/* endpoints |

### 8.2 System Monitoring
**Resource**: `system`
**Database Table**: N/A (System metrics)
**API Endpoints**: `/api/v1/system/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `system.monitor` | View system health | System queries | GET /system/health, GET /system/stats |
| `system.cache_clear` | Clear system cache | Cache operations | POST /system/cache/clear |
| `system.backup` | Trigger backups | Backup operations | POST /system/backup |
| `system.manage` | Full system management | All system operations | All /system/* endpoints |

### 8.3 Audit Logs
**Resource**: `audit_logs`
**Database Table**: `audit_logs`
**API Endpoints**: `/api/v1/audit-logs/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `audit_logs.view` | View audit logs | SELECT on audit_logs | GET /audit-logs |
| `audit_logs.export` | Export audit logs | SELECT on audit_logs | POST /audit-logs/export |
| `audit_logs.manage` | Full audit log management | All operations on audit_logs | All /audit-logs/* endpoints |

### 8.4 API Keys
**Resource**: `api_keys`
**Database Table**: `api_keys`
**API Endpoints**: `/api/v1/api-keys/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `api_keys.view` | View API keys | SELECT on api_keys | GET /api-keys |
| `api_keys.create` | Create API keys | INSERT on api_keys | POST /api-keys |
| `api_keys.revoke` | Revoke API keys | UPDATE api_keys.revoked | DELETE /api-keys/{id} |
| `api_keys.manage` | Full API key management | All operations on api_keys | All /api-keys/* endpoints |

---

## 9. WAREHOUSE MANAGEMENT (Extended Features)

### 9.1 Warehouse
**Resource**: `warehouse`
**Database Table**: `warehouse_items`
**API Endpoints**: `/api/v1/warehouse/*`

| Permission | Description | Database Operations | API Endpoints |
|------------|-------------|-------------------|---------------|
| `warehouse.view` | View warehouse items | SELECT on warehouse_items | GET /warehouse |
| `warehouse.create` | Create warehouse items | INSERT on warehouse_items | POST /warehouse |
| `warehouse.edit` | Edit warehouse items | UPDATE on warehouse_items | PUT /warehouse/{id} |
| `warehouse.delete` | Delete warehouse items | DELETE on warehouse_items | DELETE /warehouse/{id} |
| `warehouse.manage` | Full warehouse management | All operations on warehouse_items | All /warehouse/* endpoints |
| `warehouse.transfer` | Transfer items | INSERT on warehouse_transfers | POST /warehouse/{id}/transfer |
| `warehouse.inventory` | Manage inventory | UPDATE warehouse_items.quantity | POST /warehouse/inventory |

---

## 10. PREDEFINED ROLES

### Super Admin
**Description**: Full system access
**Permissions**: ALL

### Admin
**Description**: Administrative access without system configuration
**Permissions**:
- users.* (except users.impersonate)
- roles.*
- documents.*
- folders.*
- cabinets.*
- workflows.*
- approvals.manage
- tasks.manage
- audit_logs.view

### Manager
**Description**: Department/team management
**Permissions**:
- users.view
- documents.*
- folders.*
- workflows.view
- approvals.approve, approvals.reject
- tasks.*
- physical_locations.view

### Document Controller
**Description**: Document lifecycle management
**Permissions**:
- documents.*
- folders.*
- tags.*
- metadata_schemas.view
- annotations.*
- ocr.*
- checkinout.*
- barcodes.*

### Approver
**Description**: Approval workflow participant
**Permissions**:
- documents.view
- approvals.approve, approvals.reject, approvals.view
- tasks.view, tasks.complete
- notifications.view

### User (Standard)
**Description**: Basic document access
**Permissions**:
- documents.view, documents.create, documents.download
- folders.view
- tags.view, tags.apply
- annotations.view, annotations.create, annotations.edit (own)
- tasks.view (assigned), tasks.complete (assigned)
- notifications.view
- checkinout.checkout, checkinout.checkin

### Guest/Viewer
**Description**: Read-only access
**Permissions**:
- documents.view (limited), documents.preview
- folders.view
- tags.view

---

## 11. PERMISSION CHECKING LOGIC

### Backend Implementation Pattern

```python
from functools import wraps
from fastapi import HTTPException, Depends

def require_permission(permission: str):
    """Decorator to check if user has required permission"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user = Depends(get_current_user), **kwargs):
            if not has_permission(current_user, permission):
                raise HTTPException(
                    status_code=403,
                    detail=f"Permission denied: {permission} required"
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

# Usage
@router.get("/documents/{id}")
@require_permission("documents.view")
async def get_document(id: str, current_user: User):
    ...
```

### Database Query Example

```sql
-- Check if user has permission
SELECT EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.id = $1
    AND p.name = $2
    AND u.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
) OR (
    -- Check if user is superuser
    SELECT is_superuser FROM users WHERE id = $1
);
```

---

## 12. FRONTEND COMPONENT PERMISSIONS

### UI Element Visibility Rules

```typescript
// Component permission mapping
export const COMPONENT_PERMISSIONS = {
  // Navigation
  'nav.dashboard': [],  // Public
  'nav.documents': ['documents.view'],
  'nav.workflows': ['workflows.view'],
  'nav.tasks': ['tasks.view'],
  'nav.admin': ['users.view', 'roles.view', 'settings.view'],

  // Document Actions
  'documents.upload_button': ['documents.create'],
  'documents.edit_button': ['documents.edit'],
  'documents.delete_button': ['documents.delete'],
  'documents.share_button': ['documents.share'],
  'documents.download_button': ['documents.download'],

  // Admin Actions
  'users.create_button': ['users.create'],
  'users.edit_button': ['users.edit'],
  'users.delete_button': ['users.delete'],

  // Workflow Actions
  'approvals.approve_button': ['approvals.approve'],
  'approvals.reject_button': ['approvals.reject'],
}
```

---

## 13. PERMISSION MIGRATION SCRIPT

This SQL script will seed the initial permissions:

```sql
-- See separate file: database/migrations/permissions-seed.sql
```

---

## Implementation Notes

1. **Superuser Bypass**: Users with `is_superuser=true` bypass all permission checks
2. **Role Hierarchy**: Higher priority roles take precedence
3. **Permission Inheritance**: `manage` permission includes all sub-permissions
4. **Expiring Roles**: Support for temporary role assignments via `expires_at`
5. **Audit Trail**: All permission checks should be logged in audit_logs
6. **Caching**: Cache user permissions for performance (invalidate on role/permission changes)

---

Generated: 2025-01-07
Version: 1.0

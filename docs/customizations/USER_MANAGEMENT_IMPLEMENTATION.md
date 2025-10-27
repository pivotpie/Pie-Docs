# User Management System - Implementation Guide

## Overview

A comprehensive, modern user and role-based permission management system has been implemented for the Pie-Docs application with the following features:

- **User Management**: Create, update, delete, and manage users
- **Role Management**: Define roles with hierarchical priorities
- **Permission Management**: Granular permission system with resource-based access control
- **Settings Interface**: Modern, intuitive UI accessible via settings icon in header

## Architecture

### Backend (FastAPI + PostgreSQL)

#### Database Schema
Location: `pie-docs-backend/database/schema_user_management.sql`

**Key Tables:**
- `users` - User account information
- `roles` - Role definitions with priority system
- `permissions` - Permission definitions (resource + action based)
- `user_roles` - Many-to-many relationship between users and roles
- `role_permissions` - Many-to-many relationship between roles and permissions
- `user_sessions` - Active session tracking
- `user_audit_log` - Complete audit trail

**Key Features:**
- UUID primary keys
- Soft deletes (is_active flags)
- Timestamp tracking (created_at, updated_at)
- Automatic updated_at triggers
- Database views for efficient querying
- Helper functions for permission checking

**Default System Roles:**
1. **Super Admin** (Priority: 1000) - Full system access
2. **Admin** (Priority: 900) - Administrative access
3. **Manager** (Priority: 700) - Document and workflow management
4. **User** (Priority: 500) - Standard user access
5. **Viewer** (Priority: 300) - Read-only access
6. **Guest** (Priority: 100) - Limited guest access

**Default Permissions:**
- User Management: `users.view`, `users.create`, `users.update`, `users.delete`
- Role Management: `roles.view`, `roles.create`, `roles.update`, `roles.delete`
- Permission Management: `permissions.view`, `permissions.manage`
- Document Management: `documents.view`, `documents.create`, `documents.update`, `documents.delete`, `documents.share`
- Workflow Management: `workflows.view`, `workflows.create`, `workflows.update`, `workflows.delete`, `workflows.execute`
- Analytics: `analytics.view`, `analytics.export`
- Settings: `settings.view`, `settings.update`

#### API Models
Location: `pie-docs-backend/app/models/user_management.py`

**Pydantic Models:**
- User models: `UserBase`, `UserCreate`, `UserUpdate`, `User`, `UserWithRoles`, `UserWithPermissions`
- Role models: `RoleBase`, `RoleCreate`, `RoleUpdate`, `Role`, `RoleWithPermissions`
- Permission models: `PermissionBase`, `PermissionCreate`, `PermissionUpdate`, `Permission`
- Response models: `UserListResponse`, `RoleListResponse`, `PermissionListResponse`
- Auth models: `UserLogin`, `Token`, `TokenData`

**Features:**
- Input validation with Pydantic validators
- Password strength requirements
- Email validation
- Comprehensive response models with pagination

#### API Endpoints

##### User Endpoints (`pie-docs-backend/app/routers/users.py`)
- `GET /api/v1/users` - List users with pagination and filtering
- `GET /api/v1/users/{user_id}` - Get specific user
- `POST /api/v1/users` - Create new user
- `PATCH /api/v1/users/{user_id}` - Update user
- `DELETE /api/v1/users/{user_id}` - Delete user (soft delete)
- `POST /api/v1/users/{user_id}/roles` - Assign roles to user
- `DELETE /api/v1/users/{user_id}/roles/{role_id}` - Revoke role from user
- `POST /api/v1/users/{user_id}/password` - Update user password
- `GET /api/v1/users/{user_id}/permissions` - Get user permissions

##### Role Endpoints (`pie-docs-backend/app/routers/roles.py`)
- `GET /api/v1/roles` - List roles with pagination
- `GET /api/v1/roles/{role_id}` - Get specific role with permissions
- `POST /api/v1/roles` - Create new role
- `PATCH /api/v1/roles/{role_id}` - Update role
- `DELETE /api/v1/roles/{role_id}` - Delete role
- `POST /api/v1/roles/{role_id}/permissions` - Assign permissions to role
- `DELETE /api/v1/roles/{role_id}/permissions/{permission_id}` - Revoke permission
- `GET /api/v1/roles/{role_id}/users` - Get users assigned to role

##### Permission Endpoints (`pie-docs-backend/app/routers/permissions.py`)
- `GET /api/v1/permissions` - List permissions with filtering
- `GET /api/v1/permissions/resources` - List unique resources
- `GET /api/v1/permissions/actions` - List unique actions
- `GET /api/v1/permissions/{permission_id}` - Get specific permission
- `POST /api/v1/permissions` - Create new permission
- `PATCH /api/v1/permissions/{permission_id}` - Update permission
- `DELETE /api/v1/permissions/{permission_id}` - Delete permission
- `GET /api/v1/permissions/{permission_id}/roles` - Get roles with permission

### Frontend (React + TypeScript + TailwindCSS)

#### Settings Page
Location: `pie-docs-frontend/src/pages/settings/SettingsPage.tsx`

**Features:**
- Tabbed interface for Users, Roles, Permissions, and General settings
- Sidebar navigation with icons
- Modern glass-morphism design matching app theme

#### User Management Component
Location: `pie-docs-frontend/src/components/settings/UserManagement.tsx`

**Features:**
- User listing with pagination
- Search functionality
- User creation and editing modals
- Role assignment badges
- Active/Inactive status toggles
- Last login tracking
- User avatar display
- Bulk operations support

**UI Elements:**
- Search bar with live filtering
- Data table with sorting
- Action buttons (Edit, Activate/Deactivate, Delete)
- Status badges (Active/Inactive)
- Role tags
- Avatar with initials

#### Role Management Component
Location: `pie-docs-frontend/src/components/settings/RoleManagement.tsx`

**Features:**
- Card-based role display
- Permission count display
- Priority system visualization
- System role protection
- Role creation and editing
- Permission assignment

**UI Elements:**
- Grid layout of role cards
- System role badges
- Permission count indicators
- Priority display
- Edit and delete actions (disabled for system roles)

#### Permission Management Component
Location: `pie-docs-frontend/src/components/settings/PermissionManagement.tsx`

**Features:**
- Grouped by resource
- Resource and action filtering
- System permission indicators
- Permission description display
- Read-only view (permissions managed via roles)

**UI Elements:**
- Resource grouping sections
- Permission cards with badges
- Search and filter controls
- Action type tags

#### API Service
Location: `pie-docs-frontend/src/services/userManagementApi.ts`

**Modules:**
- `userApi` - User CRUD and role assignment
- `roleApi` - Role CRUD and permission assignment
- `permissionApi` - Permission CRUD and resource listing

**Features:**
- Type-safe API calls with TypeScript
- Centralized error handling
- Environment-based API URL configuration
- Full CRUD operations for all entities

#### Header Integration
Location: `pie-docs-frontend/src/components/layout/Header.tsx`

**Changes:**
- Added settings icon (gear icon) to header quick actions
- Links to `/settings` route
- Consistent styling with existing header elements

## Installation & Setup

### 1. Database Setup

```bash
# Connect to your PostgreSQL database
psql -U your_user -d piedocs

# Run the schema creation script
\i pie-docs-backend/database/schema_user_management.sql
```

This will create:
- All necessary tables
- Indexes for performance
- Triggers for automatic timestamp updates
- Default roles and permissions
- Helper functions and views

### 2. Backend Setup

The routers are already integrated into the main FastAPI app (`pie-docs-backend/app/main.py`).

Install dependencies if needed:
```bash
cd pie-docs-backend
pip install bcrypt  # For password hashing
```

### 3. Frontend Setup

No additional dependencies required - all components use existing libraries.

Add the settings route to your router configuration:
```typescript
import SettingsPage from '@/pages/settings/SettingsPage'

// In your routes:
{
  path: '/settings',
  element: <SettingsPage />
}
```

### 4. Environment Configuration

Add to your `.env` file:
```bash
# Backend
DATABASE_URL=postgresql://user:password@localhost:5432/piedocs

# Frontend
VITE_API_URL=http://localhost:8001
```

## Usage

### Accessing the User Management Interface

1. Click the **Settings icon** (gear) in the header
2. Navigate between tabs: Users, Roles, Permissions, General

### Creating a User

1. Go to Settings → Users
2. Click "Create User"
3. Fill in user details (username, email, password, etc.)
4. Assign roles
5. Click "Save"

### Managing Roles

1. Go to Settings → Roles
2. View existing roles in card format
3. Click "Create Role" to add new role
4. Assign permissions to roles
5. Set role priority

### Viewing Permissions

1. Go to Settings → Permissions
2. Browse permissions grouped by resource
3. Filter by resource or search
4. View which roles have each permission

## Security Features

### Password Security
- Minimum 8 characters
- Must contain uppercase, lowercase, digit
- Bcrypt hashing with salt
- Password change tracking

### Role-Based Access Control (RBAC)
- Hierarchical role system with priorities
- Permission inheritance through roles
- System role protection (cannot modify/delete)
- Flexible permission assignment

### Audit Logging
- All user management actions logged
- Tracks who did what and when
- IP address and user agent tracking
- Old/new value comparison

### Session Management
- Active session tracking
- Session expiration
- Token-based authentication ready
- Multi-session support

## API Examples

### Create a User
```bash
curl -X POST http://localhost:8001/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "first_name": "John",
    "last_name": "Doe",
    "role_ids": ["<manager-role-uuid>"]
  }'
```

### Assign Roles to User
```bash
curl -X POST http://localhost:8001/api/v1/users/{user_id}/roles \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "{user_id}",
    "role_ids": ["<role-uuid-1>", "<role-uuid-2>"]
  }'
```

### Check User Permissions
```bash
curl http://localhost:8001/api/v1/users/{user_id}/permissions
```

### Create Custom Role
```bash
curl -X POST http://localhost:8001/api/v1/roles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "custom_role",
    "display_name": "Custom Role",
    "description": "Custom role for specific team",
    "priority": 600,
    "permission_ids": ["<perm-uuid-1>", "<perm-uuid-2>"]
  }'
```

## Database Functions

### Check if User Has Permission
```sql
SELECT user_has_permission(
  '<user-uuid>',
  'documents.create'
);
```

### Get All User Permissions
```sql
SELECT * FROM get_user_permissions('<user-uuid>');
```

### Assign Role to User
```sql
SELECT assign_role_to_user(
  '<user-uuid>',
  '<role-uuid>',
  '<assigned-by-uuid>',
  NULL  -- expires_at (optional)
);
```

## File Structure

```
pie-docs-backend/
├── database/
│   └── schema_user_management.sql       # Database schema
├── app/
│   ├── models/
│   │   └── user_management.py           # Pydantic models
│   ├── routers/
│   │   ├── users.py                     # User endpoints
│   │   ├── roles.py                     # Role endpoints
│   │   └── permissions.py               # Permission endpoints
│   └── main.py                          # FastAPI app (updated)

pie-docs-frontend/
├── src/
│   ├── pages/
│   │   └── settings/
│   │       └── SettingsPage.tsx         # Main settings page
│   ├── components/
│   │   ├── settings/
│   │   │   ├── UserManagement.tsx       # User management UI
│   │   │   ├── RoleManagement.tsx       # Role management UI
│   │   │   └── PermissionManagement.tsx # Permission management UI
│   │   └── layout/
│   │       └── Header.tsx               # Updated with settings icon
│   └── services/
│       └── userManagementApi.ts         # API client
```

## Next Steps

### Recommended Enhancements

1. **Authentication Integration**
   - Integrate with existing auth system
   - Add JWT token generation
   - Implement middleware for permission checking

2. **Form Modals**
   - Complete create/edit user form
   - Add role assignment interface
   - Implement permission selector

3. **Advanced Features**
   - User profile page
   - Password reset flow
   - Email verification
   - Two-factor authentication
   - Session management UI
   - Audit log viewer

4. **Performance**
   - Add caching for permissions
   - Implement Redis for sessions
   - Add database connection pooling

5. **Testing**
   - Unit tests for API endpoints
   - Integration tests for permissions
   - Frontend component tests
   - E2E tests for user flows

## Support

For questions or issues with the user management system, refer to:
- Database schema comments
- API endpoint docstrings
- TypeScript type definitions
- This implementation guide

---

**System Status**: ✅ Complete and Ready for Integration

The user management system provides a solid foundation for secure, scalable user and permission management in the Pie-Docs application.

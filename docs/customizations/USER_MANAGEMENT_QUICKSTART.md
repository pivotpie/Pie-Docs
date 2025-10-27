# User Management System - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Prerequisites
- PostgreSQL 12+ running
- Python 3.8+ with pip
- Node.js 16+ with npm
- Git Bash or similar (for running .sh scripts on Windows)

### Step 1: Initialize the Database

**On Linux/Mac:**
```bash
cd pie-docs-backend/database
chmod +x init_user_management.sh
./init_user_management.sh
```

**On Windows:**
```cmd
cd pie-docs-backend\database
init_user_management.bat
```

This will:
- ✅ Create all user management tables
- ✅ Add 6 default system roles
- ✅ Add 24+ default permissions
- ✅ Set up indexes and triggers
- ✅ Create helper functions

### Step 2: Install Dependencies

**Backend:**
```bash
cd pie-docs-backend
pip install bcrypt  # For password hashing
```

**Frontend:**
```bash
cd pie-docs-frontend
# All dependencies already installed via package.json
```

### Step 3: Configure Environment

**Backend** - Update `pie-docs-backend/.env`:
```bash
# Ensure your DATABASE_URL is correct
DATABASE_URL=postgresql://username:password@localhost:5434/piedocs

# Add security settings (if not already present)
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
```

**Frontend** - Update `pie-docs-frontend/.env.local`:
```bash
# Ensure API URL matches your backend
VITE_API_URL=http://localhost:8001

# Enable user management
VITE_ENABLE_USER_MANAGEMENT=true
```

### Step 4: Start the Application

**Terminal 1 - Backend:**
```bash
cd pie-docs-backend
python -m uvicorn app.main:app --reload --port 8001
```

**Terminal 2 - Frontend:**
```bash
cd pie-docs-frontend
npm run dev
```

### Step 5: Access the Settings

1. Open browser: `http://localhost:5173`
2. Login with your existing credentials
3. Click the **⚙️ Settings icon** in the header
4. Navigate between **Users**, **Roles**, and **Permissions** tabs

---

## 📁 What Was Created

### Backend Files
```
pie-docs-backend/
├── database/
│   ├── schema_user_management.sql       # Complete DB schema
│   ├── init_user_management.sh          # Linux/Mac setup script
│   └── init_user_management.bat         # Windows setup script
├── app/
│   ├── models/
│   │   └── user_management.py           # Pydantic models
│   ├── routers/
│   │   ├── __init__.py                  # Router exports
│   │   ├── users.py                     # User API endpoints
│   │   ├── roles.py                     # Role API endpoints
│   │   └── permissions.py               # Permission API endpoints
│   └── main.py                          # Updated with new routers
└── .env.example                         # Updated with user management config
```

### Frontend Files
```
pie-docs-frontend/
├── src/
│   ├── pages/
│   │   ├── routing/
│   │   │   └── AppRoutes.tsx            # Added /settings route
│   │   └── settings/
│   │       └── SettingsPage.tsx         # Main settings page
│   ├── components/
│   │   ├── settings/
│   │   │   ├── UserManagement.tsx       # User management UI
│   │   │   ├── RoleManagement.tsx       # Role management UI
│   │   │   └── PermissionManagement.tsx # Permission management UI
│   │   └── layout/
│   │       └── Header.tsx               # Added settings icon
│   ├── services/
│   │   └── userManagementApi.ts         # API client
│   ├── types/
│   │   └── userManagement.ts            # TypeScript types
│   └── locales/
│       ├── en/
│       │   └── settings.json            # English translations
│       └── ar/
│           └── settings.json            # Arabic translations
└── .env.example                         # Updated with feature flag
```

---

## 🔑 Default System Roles

| Role | Priority | Description | Default Permissions |
|------|----------|-------------|-------------------|
| **Super Admin** | 1000 | Full system access | ALL |
| **Admin** | 900 | Administrative access | User/Role management, Documents, Workflows, Analytics |
| **Manager** | 700 | Team management | Documents, Workflows, Analytics (view) |
| **User** | 500 | Standard user | Documents (create/view/update), Workflows (view) |
| **Viewer** | 300 | Read-only access | Documents (view), Workflows (view) |
| **Guest** | 100 | Limited guest | Documents (view only) |

---

## 🛠️ Common Tasks

### Create Your First Admin User

**Via PostgreSQL:**
```sql
-- First, hash your password using bcrypt
-- Then insert the user
INSERT INTO users (username, email, password_hash, first_name, last_name, is_active, is_verified)
VALUES ('admin', 'admin@piedocs.com', '<bcrypt-hash>', 'Admin', 'User', true, true);

-- Assign super_admin role
INSERT INTO user_roles (user_id, role_id)
SELECT
    (SELECT id FROM users WHERE username = 'admin'),
    (SELECT id FROM roles WHERE name = 'super_admin');
```

**Via API (after creating any user):**
```bash
curl -X POST http://localhost:8001/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@piedocs.com",
    "password": "SecurePass123!",
    "first_name": "Admin",
    "last_name": "User",
    "role_ids": ["<super-admin-role-uuid>"]
  }'
```

### Create a New Role

```bash
curl -X POST http://localhost:8001/api/v1/roles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "content_editor",
    "display_name": "Content Editor",
    "description": "Can create and edit documents",
    "priority": 650,
    "permission_ids": [
      "<documents.view-uuid>",
      "<documents.create-uuid>",
      "<documents.update-uuid>"
    ]
  }'
```

### Assign Role to User

```bash
curl -X POST http://localhost:8001/api/v1/users/{user-id}/roles \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "{user-id}",
    "role_ids": ["{role-id}"]
  }'
```

### Check User Permissions

```bash
curl http://localhost:8001/api/v1/users/{user-id}/permissions
```

---

## 🎨 UI Features

### User Management
- ✅ Paginated user list with search
- ✅ User creation and editing
- ✅ Role assignment with badges
- ✅ Active/Inactive status toggle
- ✅ User avatar with initials
- ✅ Last login tracking
- ✅ Bulk user operations

### Role Management
- ✅ Card-based role display
- ✅ Permission count indicators
- ✅ Priority-based ordering
- ✅ System role protection
- ✅ Create custom roles
- ✅ Assign permissions to roles

### Permission Management
- ✅ Grouped by resource
- ✅ Resource and action filtering
- ✅ System permission indicators
- ✅ Permission descriptions
- ✅ View which roles have each permission

---

## 🔒 Security Features

### Password Security
- Minimum 8 characters
- Requires uppercase, lowercase, and digit
- Bcrypt hashing with salt
- Password change tracking

### Access Control
- Role-Based Access Control (RBAC)
- Hierarchical role priorities
- Permission inheritance
- System role/permission protection

### Audit & Tracking
- Complete audit log
- User session tracking
- IP address and user agent logging
- Action history with old/new values

---

## 📊 Database Views

The system includes helpful database views:

**Get users with their roles:**
```sql
SELECT * FROM v_users_with_roles;
```

**Get roles with their permissions:**
```sql
SELECT * FROM v_roles_with_permissions;
```

**Get user permissions (includes inherited from roles):**
```sql
SELECT * FROM v_user_permissions WHERE user_id = '<user-uuid>';
```

---

## 🧪 Testing the API

### Using curl

**List all users:**
```bash
curl http://localhost:8001/api/v1/users
```

**List all roles:**
```bash
curl http://localhost:8001/api/v1/roles
```

**List all permissions:**
```bash
curl http://localhost:8001/api/v1/permissions
```

**Search users:**
```bash
curl "http://localhost:8001/api/v1/users?search=john&page=1&page_size=10"
```

**Filter permissions by resource:**
```bash
curl "http://localhost:8001/api/v1/permissions?resource=documents"
```

### Using the UI

1. Navigate to **Settings** → **Users**
2. Click **Create User** to add a new user
3. Assign roles using the role selector
4. Toggle user status with the activate/deactivate button
5. View user permissions by clicking on the user

---

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Verify PostgreSQL is running
psql -h localhost -p 5434 -U piedocs -d piedocs -c "SELECT 1"

# Check DATABASE_URL in .env matches your setup
```

### API Not Found (404)
```bash
# Ensure backend is running on correct port
curl http://localhost:8001/health

# Check that routers are imported in main.py
```

### Settings Page Not Loading
```bash
# Check that route is added in AppRoutes.tsx
# Verify SettingsPage component exists
# Check browser console for errors
```

### Translations Missing
```bash
# Ensure settings.json exists in locales/en/ and locales/ar/
# Restart the frontend dev server
```

---

## 📚 Additional Resources

- **Complete Documentation:** `USER_MANAGEMENT_IMPLEMENTATION.md`
- **Database Schema:** `pie-docs-backend/database/schema_user_management.sql`
- **API Models:** `pie-docs-backend/app/models/user_management.py`
- **TypeScript Types:** `pie-docs-frontend/src/types/userManagement.ts`

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Database tables created (users, roles, permissions, etc.)
- [ ] 6 system roles exist
- [ ] 20+ permissions exist
- [ ] Backend server starts without errors
- [ ] Frontend builds without TypeScript errors
- [ ] Settings icon appears in header
- [ ] Settings page loads at `/settings`
- [ ] Can view users, roles, and permissions
- [ ] API endpoints respond correctly

---

## 🎉 Success!

You now have a fully functional user and permission management system!

**Next Steps:**
1. Create your first admin user
2. Explore the Settings UI
3. Create custom roles for your organization
4. Assign users to appropriate roles
5. Implement authentication middleware (see Implementation Guide)

For detailed implementation information, see `USER_MANAGEMENT_IMPLEMENTATION.md`.

# ACL Implementation Guide

## 📋 Overview

Complete document-level Access Control Lists (ACL) implementation for Pie-Docs, including:
- Fine-grained permission management (view, edit, delete, share, download)
- Role-based and user-based access control
- Document sharing with public/password-protected links
- Access tracking and audit logging

---

## 🎯 What Was Implemented

### 1. Database Layer ✅
**File:** `pie-docs-backend/database/migrations/23-document-permissions-shares.sql`

#### Tables Created:
- **`document_permissions`** - Document-level ACLs
  - Supports user-specific and role-based permissions
  - Granular permissions: can_view, can_edit, can_delete, can_share, can_download
  - Optional expiration dates
  - Audit trail (granted_by, granted_at)

- **`document_shares`** - Shareable document links
  - Three share types: public, password-protected, email-restricted
  - Access limits (max_access_count, expires_at)
  - Security features (password hashing, email restrictions)
  - Auto-deactivation when limits are reached

- **`document_share_access_log`** - Access audit trail
  - Tracks who accessed shared documents
  - Records IP addresses and user agents
  - Distinguishes between view and download actions

#### Helper Functions:
- `user_can_access_document()` - Check user permissions (including role-based)
- `increment_share_access_count()` - Auto-increment share access counter
- `check_share_access_limit()` - Auto-deactivate shares at limit

#### Indexes:
- Optimized for permission lookups by document, user, and role
- Fast share token lookups
- Efficient expiration queries

---

### 2. Backend API ✅
**Existing:** Backend endpoints already exist in `app/routers/documents.py` (lines 1710-1780)

#### Document Permissions Endpoints:
- `GET /api/v1/documents/{document_id}/permissions` - List permissions
- `POST /api/v1/documents/{document_id}/permissions` - Grant permission
- `DELETE /api/v1/documents/{document_id}/permissions/{permission_id}` - Revoke permission

#### Document Shares Endpoints:
- `GET /api/v1/documents/{document_id}/shares` - List shares
- `POST /api/v1/documents/{document_id}/shares` - Create share link
- `DELETE /api/v1/documents/{document_id}/shares/{share_id}` - Revoke share

**Note:** Backend models already defined in `app/models/documents.py`

---

### 3. Frontend Service Layer ✅
**File:** `pie-docs-frontend/src/services/api/documentPermissionsService.ts`

#### Features:
- Full TypeScript type definitions
- RESTful API integration
- Token-based authentication
- Error handling

#### Main Methods:

**Permission Management:**
- `listDocumentPermissions(documentId)` - Get all permissions
- `grantDocumentPermission(documentId, permission)` - Add permission
- `revokeDocumentPermission(documentId, permissionId)` - Remove permission
- `bulkGrantPermissions(documentId, permissions[])` - Add multiple
- `updateDocumentPermission(documentId, permissionId, updates)` - Update existing
- `getEffectivePermissions(documentId)` - Get aggregated permissions

**Share Link Management:**
- `listDocumentShares(documentId)` - Get all shares
- `createDocumentShare(documentId, share)` - Create share
- `revokeDocumentShare(documentId, shareId)` - Revoke share
- `getShareByToken(shareToken)` - Get share details
- `accessSharedDocument(shareToken, password?, email?)` - Access shared doc
- `getShareAccessLog(shareId)` - View access history

**Utility Methods:**
- `grantViewerPermission()` - Quick viewer access
- `grantEditorPermission()` - Quick editor access
- `grantOwnerPermission()` - Quick owner access
- `createPublicShare()` - Quick public link
- `createPasswordProtectedShare()` - Quick protected link
- `createEmailRestrictedShare()` - Quick email-restricted link
- `generateShareUrl()` - Generate shareable URL
- `copyShareUrlToClipboard()` - Copy URL helper

---

### 4. Frontend UI Component ✅
**File:** `pie-docs-frontend/src/components/documents/tools/ACLsTool.tsx`

#### Features:

**Document Permissions Section:**
- View all permissions for the document
- Permission levels: Viewer, Editor, Owner, Custom
- Role-based permission granting
- Visual badges (color-coded by permission level)
- In-line permission revocation
- Add permission dialog with role selector
- Empty state messaging

**Share Links Section:**
- View all active and revoked shares
- Create public or password-protected links
- One-click copy to clipboard
- Access count tracking
- Revoke share functionality
- Visual indicators for expired/revoked shares
- Share type icons (🌐 public, 🔐 password)

**UI/UX:**
- Loading states
- Error handling with dismissible alerts
- Responsive glass-morphism design
- Collapsible dialog panels
- Confirmation prompts for destructive actions
- Real-time data reloading after changes

---

## 🚀 Deployment Steps

### Step 1: Run Database Migration

```bash
cd pie-docs-backend

# Using PostgreSQL command line
psql -U your_username -d your_database -f database/migrations/23-document-permissions-shares.sql

# Or using your migration tool
python manage.py migrate
```

**Verify Migration:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('document_permissions', 'document_shares', 'document_share_access_log');

-- Check helper functions
SELECT proname FROM pg_proc WHERE proname LIKE '%document%';
```

### Step 2: Verify Backend

The backend endpoints already exist. Just ensure:
1. Backend server is running
2. Routes are registered in `app/main.py`
3. Database connection is configured

```bash
cd pie-docs-backend
python -m uvicorn app.main:app --reload --port 8001
```

### Step 3: Install Frontend Dependencies

```bash
cd pie-docs-frontend
npm install
```

### Step 4: Test Frontend Build

```bash
npm run dev  # For development
# or
npm run build  # For production
```

---

## 🧪 Testing Guide

### Manual Testing Checklist

#### 1. Permission Management
- [ ] Open a document in the preview pane
- [ ] Click on the ACLs tool (🔒)
- [ ] Verify it loads without errors
- [ ] Click "+ Add Permission"
- [ ] Select a role from dropdown
- [ ] Choose permission level (Viewer/Editor/Owner)
- [ ] Click "Grant Permission"
- [ ] Verify permission appears in list
- [ ] Click "Revoke" on a permission
- [ ] Confirm revocation works

#### 2. Share Links
- [ ] Click "🔗 Create Share Link"
- [ ] Create a public link
- [ ] Verify URL is copied to clipboard
- [ ] Verify share appears in shares list
- [ ] Click "Copy" to copy the URL again
- [ ] Create a password-protected link
- [ ] Enter password in prompt
- [ ] Verify protected share appears
- [ ] Click "Revoke" on a share
- [ ] Confirm share is marked as revoked

#### 3. Error Handling
- [ ] Disconnect from backend
- [ ] Try to load permissions (should show error)
- [ ] Dismiss error message
- [ ] Reconnect backend
- [ ] Reload and verify recovery

### API Testing with curl

```bash
# List document permissions
curl -X GET "http://localhost:8001/api/v1/documents/{document_id}/permissions" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Grant permission
curl -X POST "http://localhost:8001/api/v1/documents/{document_id}/permissions" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role_id": "role-uuid-here",
    "can_view": true,
    "can_edit": true,
    "can_delete": false,
    "can_share": false,
    "can_download": true
  }'

# Create public share
curl -X POST "http://localhost:8001/api/v1/documents/{document_id}/shares" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "share_type": "public",
    "can_view": true,
    "can_download": true
  }'
```

---

## 🔧 Configuration

### Environment Variables

**Backend:**
- Database connection should already be configured
- No additional environment variables needed for ACL

**Frontend:**
```env
VITE_RAG_API_URL=http://localhost:8001/api/v1
```

---

## 📊 Database Schema Reference

### document_permissions Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| document_id | UUID | Foreign key to documents |
| user_id | UUID | Foreign key to users (optional) |
| role_id | UUID | Foreign key to roles (optional) |
| can_view | BOOLEAN | View permission |
| can_edit | BOOLEAN | Edit permission |
| can_delete | BOOLEAN | Delete permission |
| can_share | BOOLEAN | Share permission |
| can_download | BOOLEAN | Download permission |
| expires_at | TIMESTAMP | Expiration date (optional) |
| granted_by | UUID | User who granted permission |
| granted_at | TIMESTAMP | When permission was granted |

**Constraints:**
- Either user_id OR role_id must be set (not both)
- Unique per user/role per document

### document_shares Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| document_id | UUID | Foreign key to documents |
| share_token | VARCHAR(100) | Unique share token for URL |
| share_type | VARCHAR(20) | 'public', 'password', 'email' |
| can_view | BOOLEAN | View permission |
| can_download | BOOLEAN | Download permission |
| can_edit | BOOLEAN | Edit permission |
| requires_password | BOOLEAN | Password required flag |
| password_hash | VARCHAR(255) | Hashed password |
| allowed_emails | TEXT[] | Array of allowed emails |
| max_access_count | INTEGER | Maximum access count (null = unlimited) |
| current_access_count | INTEGER | Current access count |
| expires_at | TIMESTAMP | Expiration date (optional) |
| shared_by | UUID | User who created share |
| shared_at | TIMESTAMP | When share was created |
| is_active | BOOLEAN | Share active status |
| revoked_at | TIMESTAMP | When share was revoked |

---

## 🎨 UI Screenshots (Expected)

### Permissions Section
```
┌─────────────────────────────────────────┐
│ Document Permissions    [+ Add Permission] │
├─────────────────────────────────────────┤
│ ┌───────────────────────────────────┐   │
│ │ Admin Role     [owner] [Role]     │   │
│ │                        [Revoke]   │   │
│ ├───────────────────────────────────┤   │
│ │ Editor Role    [editor] [Role]    │   │
│ │                        [Revoke]   │   │
│ └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Share Links Section
```
┌─────────────────────────────────────────┐
│ Share Links       [🔗 Create Share Link]  │
├─────────────────────────────────────────┤
│ ┌───────────────────────────────────┐   │
│ │ 🌐 public link                    │   │
│ │ Created: Jan 1, 2025 • Accessed: 5│   │
│ │                  [Copy] [Revoke]  │   │
│ ├───────────────────────────────────┤   │
│ │ 🔐 password link                  │   │
│ │ Created: Jan 2, 2025 • Accessed: 2│   │
│ │                  [Copy] [Revoke]  │   │
│ └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### Issue: "Failed to load permissions"
**Solution:**
1. Check backend is running: `curl http://localhost:8001/health`
2. Verify database tables exist (run verification queries above)
3. Check browser console for detailed error messages
4. Verify authentication token is valid

### Issue: "Failed to grant permission"
**Solution:**
1. Ensure role exists in database
2. Check user has permission to grant permissions
3. Verify no duplicate permission exists
4. Check backend logs for SQL errors

### Issue: Share link returns 404
**Solution:**
1. Verify share is active (`is_active = true`)
2. Check share hasn't expired
3. Ensure share token is correct
4. Check max_access_count hasn't been reached

---

## 📚 Additional Resources

### Related Files:
- Backend Models: `pie-docs-backend/app/models/documents.py`
- Backend Router: `pie-docs-backend/app/routers/documents.py`
- Roles Service: `pie-docs-frontend/src/services/api/rolesPermissionsService.ts`
- User Management Schema: `pie-docs-backend/database/schema_user_management.sql`

### API Documentation:
- Permissions API: `http://localhost:8001/docs#/permissions`
- Roles API: `http://localhost:8001/docs#/roles`
- Documents API: `http://localhost:8001/docs#/documents`

---

## ✅ Implementation Checklist

- [x] Database migration created
- [x] Backend endpoints verified
- [x] Frontend service implemented
- [x] UI component updated
- [x] TypeScript types defined
- [x] Error handling added
- [x] Loading states implemented
- [ ] Database migration run
- [ ] End-to-end testing completed
- [ ] Production deployment

---

## 🎓 Key Design Decisions

### 1. Role-Based vs User-Based Permissions
- Supports both approaches
- Role-based preferred for scalability
- User-based for specific exceptions
- Enforced at database level (either/or constraint)

### 2. Permission Levels
- Three predefined levels: Viewer, Editor, Owner
- Custom level for granular control
- Backend stores individual flags for flexibility

### 3. Share Link Security
- Unique tokens (UUID-based)
- Password hashing for protected shares
- Email restrictions for sensitive documents
- Access counting and limits
- Automatic expiration

### 4. Audit Trail
- All permissions track who granted them
- Shares track access with IP and user agent
- Timestamps for all operations
- Soft delete for shares (revoked, not deleted)

---

## 📝 Notes

- The ACL system integrates with existing RBAC (Role-Based Access Control) system
- Document permissions override system-wide permissions
- Share links provide guest access without authentication
- All API calls require authentication except accessing shares
- Frontend uses optimistic updates with error rollback

---

**Implementation Date:** October 14, 2025
**Version:** 1.0.0
**Status:** Ready for Testing

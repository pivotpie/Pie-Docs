# Settings Section - Quick Start Guide

## 🚀 Getting Started

### 1. Backend Server (Already Running!)
The backend server is currently running on **http://localhost:8001**

✅ Server Status: **OPERATIONAL**
✅ Database: **CONNECTED**
✅ All APIs: **READY**

### 2. Access the Settings

#### Frontend Route:
```
http://localhost:5173/settings
```

#### Or programmatically:
```typescript
import { useNavigate } from 'react-router-dom'
const navigate = useNavigate()
navigate('/settings')
```

---

## 📱 Available Settings Sections

### 👤 USER SETTINGS (All Users)

#### 1. **My Profile**
- View and edit profile information
- Upload/change profile picture
- Update contact details
- View account status

**Path**: `/settings` → Click "My Profile"

#### 2. **Preferences**
- **Language**: English, Spanish, French, German, Chinese
- **Timezone**: UTC, ET, CT, MT, PT, GMT, CET, JST
- **Date Format**: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, DD-MMM-YYYY
- **Theme**: Light, Dark, Auto
- **Notifications**: Email, In-app, Push
- **Default Views**: Grid, List, Tree

**Path**: `/settings` → Click "Preferences"

#### 3. **Password & Security**
- Change password
- Enable/disable 2FA
- View active sessions
- Revoke sessions

**Path**: `/settings` → Click "Password & Security"

---

### 🔐 ADMIN SETTINGS (Admin Only)

#### 4. **User Management**
- Create new users
- Edit user details
- Assign roles
- Activate/deactivate users
- Delete users

#### 5. **Role Management**
- Create/edit roles
- Assign permissions to roles
- View role hierarchy

#### 6. **Permission Management**
- View all permissions
- Assign permissions to roles
- Permission categories

#### 7. **General Settings**
- System-wide configurations
- Application settings
- Feature toggles

#### 8. **Document Settings**
- Default document types
- OCR settings
- File upload limits
- Storage configurations

#### 9. **Workflow Settings**
- Workflow templates
- Approval chains
- Automation rules

#### 10. **Search & AI Settings**
- RAG configuration
- Search parameters
- AI model settings
- Embedding settings

#### 11. **Analytics Settings**
- Tracking configuration
- Report settings
- Dashboard preferences

#### 12. **Email Settings**
- SMTP configuration
- Email templates
- Test email connection

#### 13. **API & Webhooks**
- API key management
- Webhook endpoints
- Rate limiting

#### 14. **Database Management**
- Connection status
- Database stats
- Maintenance tools

#### 15. **Security Settings**
- Password policies
- Session timeout
- Login restrictions
- MFA policies

#### 16. **Audit Logs**
- View system events
- User actions
- Security events
- Filter and search

#### 17. **System Health**
- Server status
- Resource usage
- Performance metrics
- Error logs

#### 18. **Cache Management**
- View cache stats
- Clear cache
- Cache configuration

---

## 🔧 API Endpoints

### User Preferences
```bash
# Get preferences
GET /api/v1/user-preferences

# Update preferences
PATCH /api/v1/user-preferences
{
  "theme": "dark",
  "language": "en",
  "notifications_email": true
}

# Reset to defaults
POST /api/v1/user-preferences/reset
```

### System Settings
```bash
# List all settings
GET /api/v1/settings

# Get by category
GET /api/v1/settings?category=email

# Get specific setting
GET /api/v1/settings/jwt_access_token_expiry

# Update setting
PATCH /api/v1/settings/max_login_attempts
{
  "setting_value": 5,
  "description": "Maximum login attempts"
}

# Get categories
GET /api/v1/settings/categories/list
```

### User Profile
```bash
# Get profile
GET /api/v1/users/me

# Update profile
PATCH /api/v1/users/me
{
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "+1234567890"
}

# Upload avatar
POST /api/v1/users/me/avatar
[multipart/form-data with file]

# Delete avatar
DELETE /api/v1/users/me/avatar
```

### Security
```bash
# Change password
POST /api/v1/auth/change-password
{
  "current_password": "old",
  "new_password": "new",
  "confirm_password": "new"
}

# Enable 2FA
POST /api/v1/auth/2fa/enable

# Verify 2FA
POST /api/v1/auth/2fa/verify
{ "code": "123456" }

# Disable 2FA
POST /api/v1/auth/2fa/disable
{ "code": "123456" }

# Get sessions
GET /api/v1/auth/sessions

# Revoke session
DELETE /api/v1/auth/sessions/{session_id}

# Revoke all sessions
POST /api/v1/auth/sessions/revoke-all
```

---

## 💡 Common Tasks

### How to Change Your Theme
1. Go to `/settings`
2. Click "Preferences"
3. Under "Appearance", select:
   - **Light**: Light theme
   - **Dark**: Dark theme (default)
   - **Auto**: System preference
4. Click "Save Changes"

### How to Enable 2FA
1. Go to `/settings`
2. Click "Password & Security"
3. Toggle "Two-Factor Authentication"
4. Scan QR code with authenticator app
5. Enter verification code
6. Save backup codes

### How to Create a New User (Admin)
1. Go to `/settings`
2. Click "Users" (admin section)
3. Click "Create User" button
4. Fill in:
   - Username *
   - Email *
   - Password *
   - First/Last Name
   - Phone Number
5. Assign roles (check boxes)
6. Set status (Active/Verified)
7. Click "Create"

### How to Update System Settings (Admin)
1. Go to `/settings`
2. Click relevant admin section (e.g., "General")
3. Find the setting to update
4. Enter new value
5. Click "Save" or "Update"

---

## 🎯 Feature Highlights

### ✨ User Profile
- **Avatar Upload**: Drag & drop or click to upload (max 5MB)
- **Real-time Validation**: Instant feedback on form fields
- **Edit Mode**: Toggle between view and edit modes

### 🌍 Preferences
- **Live Updates**: Language changes apply immediately
- **Persistent**: Saved to database, synced across devices
- **Smart Defaults**: Sensible defaults for new users

### 🔒 Security
- **Password Strength**: Visual indicator
- **2FA Support**: TOTP-based (Google Authenticator, Authy, etc.)
- **Session Management**: See all active sessions, revoke individually

### 👥 User Management
- **Bulk Operations**: Coming soon
- **Search & Filter**: Find users quickly
- **Role Assignment**: Multiple roles per user
- **Audit Trail**: All changes logged

---

## 📊 Data Flow

```
User Interaction (Frontend)
        ↓
React Component State
        ↓
API Service Layer
        ↓
HTTP Request (with Auth Token)
        ↓
FastAPI Backend Router
        ↓
Business Logic & Validation
        ↓
Database (PostgreSQL)
        ↓
Response (JSON)
        ↓
Component State Update
        ↓
UI Re-render
```

---

## 🐛 Troubleshooting

### Settings not loading?
1. Check backend server: http://localhost:8001/health
2. Check browser console for errors
3. Verify authentication token is valid
4. Check network tab in DevTools

### Can't save changes?
1. Check form validation errors
2. Verify you have permission (role-based)
3. Check backend logs
4. Try refreshing the page

### 2FA not working?
1. Ensure time sync on device
2. Check 6-digit code is current
3. Use backup codes if available
4. Contact admin to reset

---

## 🔗 Related Documentation

- **API Documentation**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc
- **Full Implementation**: See `SETTINGS_IMPLEMENTATION_COMPLETE.md`

---

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Review backend logs
3. Verify API endpoints in Swagger docs
4. Check database connectivity

---

**Last Updated**: October 6, 2025
**Server Status**: ✅ Running on http://localhost:8001
**Ready to Use**: ✅ All features operational

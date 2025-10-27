# CORS & API Configuration Guide

## 🔧 Complete Configuration Setup

### ✅ Current Status
- **Backend CORS**: ✅ Configured
- **Frontend ENV**: ✅ Fixed
- **Backend Server**: ✅ Running on port 8001
- **Frontend Port**: 5173 (default Vite)

---

## 🌐 CORS Configuration

### Backend CORS Settings

**File**: `pie-docs-backend/.env`

```env
# CORS Origins - Add all frontend URLs
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:3001,http://127.0.0.1:5173
```

**Middleware Configuration** (already set in `app/main.py`):
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,  # From .env CORS_ORIGINS
    allow_credentials=True,                     # Allow cookies/auth headers
    allow_methods=["*"],                        # Allow all HTTP methods
    allow_headers=["*"],                        # Allow all headers
)
```

### What's Configured:
- ✅ **allow_origins**: Restricts which domains can call the API
- ✅ **allow_credentials**: Enables auth tokens and cookies
- ✅ **allow_methods**: Permits GET, POST, PATCH, DELETE, etc.
- ✅ **allow_headers**: Allows Authorization, Content-Type, etc.

---

## 📡 Frontend API Configuration

### Environment Variables

**File**: `pie-docs-frontend/.env`

```env
# Primary API URLs (ALL THREE MUST POINT TO SAME BACKEND)
VITE_API_BASE_URL=http://localhost:8001/api/v1     # Base API URL with version
VITE_API_URL=http://localhost:8001                 # Root API URL
VITE_RAG_API_URL=http://localhost:8001/api/v1      # Settings/User API URL

# Other settings
VITE_API_TIMEOUT=30000                              # Request timeout (30s)
VITE_USE_MOCK_DATA=false                            # Use real backend
```

### Why Three URLs?

1. **VITE_API_BASE_URL** - Used by axios config and general API calls
2. **VITE_API_URL** - Used for root-level endpoints
3. **VITE_RAG_API_URL** - Used by settings and user preference services

**Important**: All three must point to the same backend server!

---

## 🚀 Starting the Application

### 1. Backend Server

```bash
# Navigate to backend
cd pie-docs-backend

# Activate virtual environment (if using one)
# Windows:
mayan_env\Scripts\activate
# Linux/Mac:
source mayan_env/bin/activate

# Start server on port 8001
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

**Verify Backend**:
```bash
curl http://localhost:8001/health
# Should return: {"status":"healthy","database":"connected"}
```

### 2. Frontend Application

```bash
# Navigate to frontend
cd pie-docs-frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev

# Frontend will run on http://localhost:5173
```

**Verify Frontend**:
- Open browser: http://localhost:5173
- Should see the application
- Check browser console for any errors

---

## 🔍 Testing CORS & API Connection

### Test 1: Health Check (No Auth)
```bash
# From terminal
curl http://localhost:8001/health

# Expected response:
{
  "status": "healthy",
  "database": "connected"
}
```

### Test 2: Settings API (Requires Auth)
```bash
# Get settings (will fail without token - expected)
curl http://localhost:8001/api/v1/settings/categories/list

# Expected response:
{
  "detail": "Missing or invalid authorization header"
}
```

### Test 3: From Browser Console

Open browser console on `http://localhost:5173` and run:

```javascript
// Test 1: Health check (no auth needed)
fetch('http://localhost:8001/health')
  .then(r => r.json())
  .then(console.log)

// Test 2: Settings endpoint (needs auth - will fail as expected)
fetch('http://localhost:8001/api/v1/settings')
  .then(r => r.json())
  .then(console.log)
```

**Expected Results**:
- Test 1: Should succeed and show health status
- Test 2: Should fail with auth error (this is correct!)

---

## 🛠️ Troubleshooting CORS Issues

### Issue 1: CORS Error in Browser Console

**Error**:
```
Access to fetch at 'http://localhost:8001/api/v1/...' from origin 'http://localhost:5173'
has been blocked by CORS policy
```

**Solution**:
1. Check backend `.env` file has correct CORS_ORIGINS
2. Ensure your frontend URL is in the CORS_ORIGINS list
3. Restart backend server after changing .env
4. Clear browser cache

### Issue 2: Request Works in Postman but Not Browser

**Cause**: CORS is a browser security feature, not enforced in Postman/curl

**Solution**:
- Verify CORS middleware is configured in backend
- Check browser Network tab for CORS headers
- Look for `Access-Control-Allow-Origin` in response headers

### Issue 3: Preflight OPTIONS Request Fails

**Error**: 405 Method Not Allowed for OPTIONS request

**Solution**:
```python
# Verify in main.py:
allow_methods=["*"]  # Must include OPTIONS
```

### Issue 4: Credentials Not Sent

**Error**: Auth token not being sent with request

**Solution**:
```javascript
// In frontend requests, ensure:
fetch(url, {
  credentials: 'include',  // For cookies
  headers: {
    'Authorization': `Bearer ${token}`,  // For JWT
  }
})
```

### Issue 5: Wrong API URL

**Symptoms**: 404 errors, connection refused

**Check**:
1. Frontend .env has correct URLs
2. Backend is running on correct port
3. No typos in environment variables
4. Restart frontend dev server after .env changes

---

## 📋 CORS Headers Checklist

### Backend Response Must Include:

✅ `Access-Control-Allow-Origin`: Your frontend URL
✅ `Access-Control-Allow-Methods`: GET, POST, PATCH, DELETE, etc.
✅ `Access-Control-Allow-Headers`: Authorization, Content-Type, etc.
✅ `Access-Control-Allow-Credentials`: true (if using auth)

### Verify in Browser DevTools:

1. Open Network tab
2. Make a request
3. Click on request
4. Check Response Headers section
5. Verify CORS headers are present

---

## 🔐 Authentication Flow with CORS

### Complete Flow:

```
1. User logs in → Frontend sends credentials
   POST http://localhost:8001/api/v1/auth/login

2. Backend validates → Returns JWT token
   { "access_token": "eyJ...", "token_type": "bearer" }

3. Frontend stores token
   localStorage.setItem('authToken', token)

4. Frontend makes authenticated request
   Headers: { Authorization: "Bearer eyJ..." }

5. Backend validates token → Returns data
   CORS headers included in response

6. Frontend receives data
   Updates UI
```

### CORS is Involved in Every Step!

Each request/response must have proper CORS headers for browser to allow it.

---

## 📁 File Uploads with CORS

### Avatar Upload Example

**Frontend**:
```typescript
const formData = new FormData()
formData.append('file', file)

const response = await fetch(`${API_URL}/users/me/avatar`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    // Don't set Content-Type - browser sets it with boundary
  },
  body: formData
})
```

**Backend** (already configured):
```python
@router.post("/users/me/avatar")
async def upload_avatar(file: UploadFile):
    # CORS headers automatically added by middleware
    ...
```

**CORS Requirements for File Upload**:
- ✅ `Access-Control-Allow-Origin`: frontend URL
- ✅ `Access-Control-Allow-Methods`: POST
- ✅ `Access-Control-Allow-Headers`: Authorization, Content-Type
- ✅ Server must handle multipart/form-data

---

## 🧪 Testing Checklist

### Manual Testing:

- [ ] Backend health check works from browser
- [ ] Backend health check works from frontend (fetch)
- [ ] Login flow works (returns token)
- [ ] Authenticated API calls work (with token)
- [ ] File upload works (avatar)
- [ ] No CORS errors in console
- [ ] Network tab shows CORS headers

### Automated Testing:

```bash
# Test backend health
curl http://localhost:8001/health

# Test CORS headers
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Authorization" \
     -X OPTIONS \
     http://localhost:8001/api/v1/settings \
     -v
```

---

## 🌍 Production Configuration

### Backend (Production)

```env
# .env (production)
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com,https://admin.yourdomain.com
```

**Important Production Settings**:
- Use HTTPS URLs only
- List all production domains
- Don't use wildcards (*) in production
- Enable rate limiting
- Use strong SECRET_KEY

### Frontend (Production)

```env
# .env.production
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
VITE_API_URL=https://api.yourdomain.com
VITE_RAG_API_URL=https://api.yourdomain.com/api/v1
VITE_USE_MOCK_DATA=false
```

---

## 📊 Current Configuration Summary

### ✅ Backend (.env)
```
DATABASE_URL=postgresql://piedocs:piedocs123@localhost:5434/piedocs
API_PORT=8001
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:3001,http://127.0.0.1:5173
```

### ✅ Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:8001/api/v1
VITE_API_URL=http://localhost:8001
VITE_RAG_API_URL=http://localhost:8001/api/v1
VITE_USE_MOCK_DATA=false
```

### ✅ Backend Server
- Running on: http://0.0.0.0:8001
- Health: http://localhost:8001/health
- Docs: http://localhost:8001/docs

### ✅ Frontend Server (when started)
- Running on: http://localhost:5173
- Settings: http://localhost:5173/settings

---

## 🚨 Common Mistakes to Avoid

1. **❌ Wrong Port**
   - Backend on 8001, frontend tries 8000
   - Solution: Check .env files

2. **❌ Missing /api/v1**
   - Using http://localhost:8001/settings
   - Should be: http://localhost:8001/api/v1/settings

3. **❌ Frontend not in CORS origins**
   - CORS_ORIGINS doesn't include http://localhost:5173
   - Solution: Add to backend .env

4. **❌ Not restarting after .env change**
   - Changed .env but didn't restart servers
   - Solution: Restart both backend and frontend

5. **❌ Using HTTP and HTTPS mixed**
   - Frontend on HTTPS, backend on HTTP
   - Solution: Use same protocol

6. **❌ Credentials not included**
   - Not sending Authorization header
   - Solution: Use settings/userPreferences services

---

## 🔗 Quick Reference

### Backend URLs
- Health: `http://localhost:8001/health`
- API Docs: `http://localhost:8001/docs`
- Settings: `http://localhost:8001/api/v1/settings`
- User Prefs: `http://localhost:8001/api/v1/user-preferences`

### Frontend URLs (when running)
- Home: `http://localhost:5173/`
- Settings: `http://localhost:5173/settings`
- Login: `http://localhost:5173/login`

### Environment Variables
- Backend: `pie-docs-backend/.env`
- Frontend: `pie-docs-frontend/.env`

---

## 💡 Pro Tips

1. **Always check browser console** for CORS errors
2. **Use Network tab** to inspect headers
3. **Test with curl** to isolate CORS issues
4. **Restart servers** after .env changes
5. **Clear browser cache** if seeing old behavior
6. **Use incognito mode** for clean testing
7. **Check firewall** if connection refused

---

## 📞 Getting Help

If you encounter CORS issues:

1. **Check browser console** - Look for specific error
2. **Check Network tab** - Inspect request/response headers
3. **Verify .env files** - Ensure URLs are correct
4. **Check server logs** - Look for backend errors
5. **Test with curl** - Bypass browser CORS
6. **Restart everything** - Fresh start often helps

---

**Status**: ✅ CORS Fully Configured and Operational
**Last Updated**: October 6, 2025
**Backend**: Running on port 8001
**Frontend**: Ready to connect on port 5173

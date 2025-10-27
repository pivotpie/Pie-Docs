# CORS Configuration for Workflows API

## 🔒 Current CORS Setup

The PieDocs backend has CORS (Cross-Origin Resource Sharing) properly configured to allow the frontend to communicate with the API.

### Configuration Location

**Backend Configuration**: `pie-docs-backend/app/config.py`

```python
# CORS
CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:3001"

@property
def cors_origins_list(self) -> List[str]:
    return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
```

**Environment File**: `pie-docs-backend/.env`

```env
# CORS Origins (comma-separated) - Include all frontend dev/prod URLs
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:3001,http://127.0.0.1:5173
```

**Middleware Setup**: `pie-docs-backend/app/main.py` (lines 89-96)

```python
# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## ✅ What's Allowed

### Origins
- `http://localhost:5173` - Vite dev server (default)
- `http://localhost:3000` - Alternative React dev server
- `http://localhost:3001` - Additional dev server
- `http://127.0.0.1:5173` - Alternative localhost notation

### Methods
- **ALL HTTP methods** are allowed:
  - `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`

### Headers
- **ALL headers** are allowed
- Includes custom headers like `Authorization`, `Content-Type`, etc.

### Credentials
- **Enabled** - Cookies and authentication headers are allowed

## 🧪 Testing CORS

### Test 1: Browser Console Test

Open your browser console at `http://localhost:5173/workflows` and run:

```javascript
// Test fetching workflows
fetch('http://localhost:8001/api/v1/workflows', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include'
})
.then(res => res.json())
.then(data => console.log('Success:', data))
.catch(err => console.error('CORS Error:', err));
```

**Expected**: Success response or 401 (unauthorized) - NOT a CORS error

### Test 2: Workflow Creation Test

```javascript
// Test creating a workflow
fetch('http://localhost:8001/api/v1/workflows', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    name: 'CORS Test Workflow',
    description: 'Testing CORS',
    elements: [],
    connections: [],
    status: 'draft'
  })
})
.then(res => res.json())
.then(data => console.log('Created:', data))
.catch(err => console.error('Error:', err));
```

### Test 3: Preflight Request Test

```bash
# Test OPTIONS preflight request
curl -X OPTIONS http://localhost:8001/api/v1/workflows \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**Expected Response Headers**:
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: *
Access-Control-Allow-Headers: *
Access-Control-Allow-Credentials: true
```

## 🚨 Common CORS Issues & Solutions

### Issue 1: "No 'Access-Control-Allow-Origin' header"

**Symptom**: Browser console shows CORS error
```
Access to fetch at 'http://localhost:8001/api/v1/workflows' from origin
'http://localhost:5173' has been blocked by CORS policy
```

**Solution**:
1. Verify backend is running on port 8001
2. Check `.env` has correct CORS_ORIGINS
3. Restart backend server after changing .env
4. Verify the origin in the error matches one in CORS_ORIGINS

### Issue 2: "Credentials flag is true, but Access-Control-Allow-Credentials is false"

**Solution**: Already configured - `allow_credentials=True` is set

### Issue 3: "Request header field Authorization is not allowed"

**Solution**: Already configured - `allow_headers=["*"]` allows all headers

### Issue 4: Different Port Numbers

If your frontend runs on a different port:

1. **Update `.env`**:
   ```env
   CORS_ORIGINS=http://localhost:YOUR_PORT,http://localhost:5173
   ```

2. **Restart backend**:
   ```bash
   cd pie-docs-backend
   python -m app.main
   ```

### Issue 5: HTTPS vs HTTP

For production with HTTPS:

1. **Update `.env`**:
   ```env
   CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
   ```

2. **Set specific origins** (don't use wildcard `*` with credentials)

## 🔧 Advanced Configuration

### Adding New Origins

**For Development**:
```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://192.168.1.100:5173
```

**For Production**:
```env
CORS_ORIGINS=https://piedocs.com,https://www.piedocs.com,https://app.piedocs.com
```

### Restricting Methods (More Secure)

If you want to restrict methods, edit `app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Specific methods only
    allow_headers=["*"],
)
```

### Restricting Headers

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Content-Type", "Authorization"],  # Only specific headers
)
```

## 🛡️ Security Best Practices

### Development
✅ Current setup is fine for development
- Wildcard methods and headers
- localhost origins only

### Production
When deploying to production:

1. **Use Specific Origins**
   ```env
   CORS_ORIGINS=https://piedocs.com,https://api.piedocs.com
   ```

2. **Never Use Wildcard `*` with Credentials**
   ```python
   # DON'T DO THIS in production:
   allow_origins=["*"]  # Not allowed with credentials
   ```

3. **Use HTTPS Only**
   ```env
   CORS_ORIGINS=https://piedocs.com  # No HTTP
   ```

4. **Limit Methods if Possible**
   ```python
   allow_methods=["GET", "POST", "PUT", "DELETE"]
   ```

5. **Set Specific Headers**
   ```python
   allow_headers=["Content-Type", "Authorization", "X-Requested-With"]
   ```

## 📋 CORS Checklist for Workflows

Before using workflows feature, verify:

- [ ] Backend `.env` has `CORS_ORIGINS` configured
- [ ] Frontend origin (`http://localhost:5173`) is in CORS_ORIGINS
- [ ] Backend is running and accessible
- [ ] No CORS errors in browser console
- [ ] API requests from frontend succeed
- [ ] Preflight OPTIONS requests succeed
- [ ] Authentication headers are sent and received

## 🧰 Debugging CORS

### Check Backend Logs

When a CORS request is made, check backend logs:

```bash
cd pie-docs-backend
python -m app.main
# Watch for logs showing incoming requests
```

### Browser Network Tab

1. Open DevTools → Network tab
2. Make a request from frontend
3. Click on the request
4. Check **Response Headers**:
   - Look for `Access-Control-Allow-Origin`
   - Look for `Access-Control-Allow-Credentials`
   - Look for `Access-Control-Allow-Methods`

### CORS Test Tool

Use an online CORS tester:
- https://www.test-cors.org/
- Enter: `http://localhost:8001/api/v1/workflows`
- Set origin: `http://localhost:5173`
- Click "Send Request"

## 💡 Quick Fixes

### Fix 1: Restart Backend
```bash
# Stop backend (Ctrl+C)
cd pie-docs-backend
python -m app.main
```

### Fix 2: Clear Browser Cache
- Hard reload: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or clear cache in DevTools → Network tab → "Disable cache"

### Fix 3: Verify .env Loaded
Add logging to verify CORS origins:

```python
# In app/main.py, after app creation
logger.info(f"CORS origins configured: {settings.cors_origins_list}")
```

### Fix 4: Add Wildcard for Dev (Temporary)

**Only for debugging**:
```python
# In app/main.py - TEMPORARY ONLY
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # WARNING: Don't use in production with credentials
    allow_credentials=False,  # Must be False with wildcard
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 📊 CORS Request Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Frontend (http://localhost:5173)                     │
│    Makes request to API                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Browser checks if cross-origin                       │
│    Origin: http://localhost:5173                        │
│    Target: http://localhost:8001                        │
│    → Different port = Cross-origin ✓                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Browser sends OPTIONS preflight request              │
│    (if needed for POST/PUT/DELETE)                      │
│    Headers:                                             │
│      Origin: http://localhost:5173                      │
│      Access-Control-Request-Method: POST                │
│      Access-Control-Request-Headers: content-type       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Backend CORS Middleware                              │
│    Checks if origin is in allow_origins list            │
│    ✓ http://localhost:5173 is allowed                   │
│    Returns CORS headers:                                │
│      Access-Control-Allow-Origin: http://localhost:5173 │
│      Access-Control-Allow-Methods: *                    │
│      Access-Control-Allow-Headers: *                    │
│      Access-Control-Allow-Credentials: true             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Browser sends actual request                         │
│    POST /api/v1/workflows                               │
│    Headers: Content-Type, Authorization, etc.           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Backend processes request                            │
│    Workflow created, returns response with CORS headers │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 7. Browser receives response                            │
│    Checks CORS headers match                            │
│    ✓ All good, delivers response to frontend            │
└─────────────────────────────────────────────────────────┘
```

## ✅ Verification Steps

Run these checks to verify CORS is working:

1. **Backend Check**:
   ```bash
   curl -I http://localhost:8001/health
   # Should return 200 OK
   ```

2. **Frontend Check**:
   - Open http://localhost:5173/workflows
   - Open browser DevTools → Console
   - No CORS errors should appear

3. **API Request Check**:
   - In workflows page, try creating a workflow
   - Check Network tab for the POST request
   - Response headers should include `Access-Control-Allow-Origin`

4. **Automated Check**:
   ```bash
   cd pie-docs-backend
   python verify_workflows_setup.py
   ```

## 🎓 Additional Resources

- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [FastAPI CORS Middleware](https://fastapi.tiangolo.com/tutorial/cors/)
- [CORS Explained](https://web.dev/cross-origin-resource-sharing/)

---

**CORS Status**: ✅ **Properly Configured**

The current CORS setup allows the frontend at `http://localhost:5173` to communicate with the backend API at `http://localhost:8001` for all workflow operations.

No additional CORS configuration is needed for basic functionality!

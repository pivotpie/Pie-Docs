# Mayan EDMS Frontend Integration Setup

## Overview
This document provides instructions for integrating your React frontend with the Mayan EDMS backend at `http://147.93.102.178:8888/`.

## Configuration Steps

### 1. Environment Configuration
The frontend is configured to connect to your Mayan EDMS instance using the `.env.local` file:

```bash
# Mayan EDMS Configuration
VITE_API_BASE_URL=http://147.93.102.178:8888/api/v4
VITE_USE_MOCK_DATA=false

# Authentication (choose one method)
# Method 1: Username/Password
VITE_MAYAN_USERNAME=your_username
VITE_MAYAN_PASSWORD=your_password

# Method 2: API Token (recommended)
VITE_MAYAN_API_TOKEN=your_api_token
```

### 2. Mayan EDMS Backend Configuration

#### CORS Configuration
Since your frontend will be running on a different port/domain, you need to configure CORS in Mayan EDMS.

Add these settings to your Mayan EDMS configuration (`settings/local.py` or environment variables):

```python
# CORS settings for frontend integration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite dev server default
    "http://localhost:3000",  # Alternative dev port
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    # Add your production frontend domain here
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False  # Set to True only for development

# Allow necessary headers
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Allow necessary methods
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
```

#### API Authentication
You have two options for authentication:

**Option 1: API Token (Recommended)**
1. In Mayan EDMS admin, go to Authentication → API tokens
2. Create a new token for your frontend application
3. Add the token to your `.env.local` file: `VITE_MAYAN_API_TOKEN=your_token_here`

**Option 2: Username/Password**
1. Use an existing user account or create a dedicated frontend user
2. Add credentials to `.env.local`:
   ```
   VITE_MAYAN_USERNAME=frontend_user
   VITE_MAYAN_PASSWORD=secure_password
   ```

### 3. Document Types Configuration
Ensure you have at least one document type configured in Mayan EDMS:
1. Go to Setup → Document types
2. Create or verify document types exist
3. Note the document type IDs for API usage

### 4. Testing the Integration

#### Using the Test Component
A test component has been created at `src/components/testing/MayanUploadTest.tsx` to verify the integration.

To use it, add it to your app temporarily:

```typescript
// In your main App.tsx or routing file
import MayanUploadTest from '@/components/testing/MayanUploadTest';

// Add to your routes or component
<MayanUploadTest />
```

#### Manual Testing Steps
1. Start your frontend: `npm run dev`
2. Navigate to the test component
3. Click "Test Connection & Load Document Types" to verify API connectivity
4. Select a file and upload it to test the upload functionality

### 5. API Endpoints Used

The integration uses these Mayan EDMS API endpoints:

- `GET /api/v4/document_types/` - Get available document types
- `POST /api/v4/documents/upload/` - Upload documents
- `POST /api/v4/documents/{id}/tags/` - Add tags to documents

### 6. Error Handling

Common issues and solutions:

**CORS Errors**
- Ensure CORS is properly configured in Mayan EDMS
- Check that your frontend URL is in the allowed origins

**Authentication Errors**
- Verify API token or username/password is correct
- Check that the user has upload permissions

**Upload Errors**
- Ensure document types exist
- Check file size limits in Mayan EDMS
- Verify file format is supported

**Network Errors**
- Confirm Mayan EDMS is accessible at `http://147.93.102.178:8888/`
- Check if any firewall rules are blocking requests

### 7. Production Considerations

For production deployment:

1. **HTTPS**: Use HTTPS for both frontend and backend
2. **API Token**: Use API tokens instead of username/password
3. **CORS**: Configure specific allowed origins (not wildcard)
4. **Error Handling**: Implement proper error boundaries and user feedback
5. **File Validation**: Add client-side file validation before upload
6. **Progress Tracking**: Implement upload progress indicators for better UX

### 8. Security Notes

- Never commit API tokens or passwords to version control
- Use environment variables for all sensitive configuration
- Implement proper error handling to avoid exposing internal details
- Consider implementing request rate limiting on the frontend
- Validate file types and sizes before upload

## Integration Features

The updated `documentsService.ts` now supports:

- ✅ Real Mayan EDMS API integration
- ✅ Token and Basic authentication
- ✅ Progress tracking during uploads
- ✅ Document type detection and assignment
- ✅ Metadata and tag support
- ✅ Error handling and timeout management
- ✅ Automatic fallback to mock data during development

## Next Steps

1. Configure CORS in your Mayan EDMS instance
2. Set up authentication (API token recommended)
3. Test the integration using the test component
4. Replace mock data usage throughout your application
5. Implement additional features like document listing, search, etc.
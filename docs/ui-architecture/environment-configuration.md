# Environment Configuration

## Development Environment

```bash
# === APPLICATION CONFIGURATION ===
VITE_APP_NAME="PIE DOCS Frontend"
VITE_APP_ENVIRONMENT="development"

# === API CONFIGURATION ===
VITE_API_BASE_URL="http://localhost:8000"
VITE_MAYAN_EDMS_API_URL="http://localhost:8001/api/v4"
VITE_SPAN_PHYSICAL_API_URL="http://localhost:8002/api/v1"
VITE_NLP_RAG_API_URL="http://localhost:8003/api/v1"

# === MOCK DATA CONFIGURATION ===
VITE_USE_MOCK_DATA="true"
VITE_MOCK_API_DELAY="500"

# === FEATURES ===
VITE_PWA_ENABLED="true"
VITE_OCR_ENABLED="true"
VITE_NLP_QUERY_ENABLED="true"
VITE_WORKFLOW_DESIGNER_ENABLED="true"

# === INTERNATIONALIZATION ===
VITE_DEFAULT_LANGUAGE="en"
VITE_SUPPORTED_LANGUAGES="en,ar"
VITE_RTL_LANGUAGES="ar"
```

**Key Environment Features:**
- **Mock-to-Production Toggle**: Seamless API switching
- **Feature Flags**: Granular feature control
- **Multi-Service Integration**: Separate service configurations
- **Security Settings**: Configurable policies and encryption

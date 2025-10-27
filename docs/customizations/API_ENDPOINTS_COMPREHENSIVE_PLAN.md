# Comprehensive API Endpoints Implementation Plan

## Database Schema Analysis

Based on the `dbschema.csv`, we have 60+ tables organized into the following domains:

### 1. Documents & Content Management
- `documents` - Core document metadata
- `document_versions` - Version control
- `document_metadata` - Custom metadata
- `document_chunks` - Document chunks for RAG/embeddings
- `document_permissions` - Document-level permissions
- `document_shares` - External sharing
- `document_comments` - Comments on documents
- `document_access_log` - Access tracking
- `document_tags` - Document-tag relationships

### 2. Folders & Organization
- `folders` - Folder hierarchy (supports smart folders)
- `tags` - Tag definitions
- `cabinets` - Cabinet organization (Mayan EDMS integration)
- `cabinet_documents` - Cabinet-document relationships

### 3. Annotations
- `annotations` - Document annotations
- `annotation_replies` - Threaded replies to annotations

### 4. Approval Workflows
- `approval_chains` - Approval chain templates
- `approval_chain_steps` - Steps in approval chains
- `approval_requests` - Active approval requests
- `approval_steps` - Steps in active requests
- `approval_actions` - Actions taken on requests

### 5. OCR Processing
- `ocr_jobs` - OCR processing jobs
- `ocr_results` - OCR extraction results
- `ocr_text_blocks` - Individual text blocks
- `ocr_quality_metrics` - Quality assessment
- `ocr_edit_history` - Manual edit tracking

### 6. Physical Document Management
- `physical_documents` - Physical document tracking
- `barcodes` - Barcode management
- `label_templates` - Label printing templates
- `print_jobs` - Print job queue
- `storage_locations` - Physical storage locations

### 7. Tasks & Workflows
- `tasks` - Task management
- `task_comments` - Task discussions
- `task_attachments` - Task attachments
- `workflows` - Workflow definitions
- `workflow_executions` - Workflow runs
- `routing_rules` - Workflow routing

### 8. User Management & Security
- `users` - User accounts
- `roles` - Role definitions
- `permissions` - Permission definitions
- `user_sessions` - Active sessions
- `auth_tokens` - Authentication tokens
- `password_reset_tokens` - Password reset tokens
- `password_resets` - Password reset tracking
- `mfa_codes` - MFA verification codes

### 9. System & Configuration
- `system_settings` - System configuration
- `audit_logs` - Activity auditing
- `audit_log` - Alternative audit table
- `metadata_schemas` - Custom metadata definitions
- `dashboard_configs` - User dashboard layouts

### 10. Integration & Communication
- `webhooks` - Webhook configurations
- `webhook_logs` - Webhook execution logs
- `notifications` - User notifications

### 11. Analytics & Reporting
- `search_history` - Search tracking
- `user_analytics` - User behavior analytics
- `popular_content` - Content popularity metrics

---

## API Endpoints Implementation Plan

### ✅ Already Implemented
- **Authentication**: Login, Logout, Refresh, MFA, Password Reset
- **Users**: Full CRUD, Role assignment, Permissions
- **Roles**: Full CRUD (partial - need to verify)
- **Permissions**: Full CRUD
- **Settings**: System settings management
- **Audit Logs**: Query audit logs
- **Documents**: Basic list, get, create (needs expansion)
- **Search**: Semantic search, hybrid search
- **RAG**: Query, suggestions, regenerate embeddings

### 🔨 To Be Implemented

#### 1. Documents API (Expansion) - `/api/v1/documents`
- ✅ GET `/` - List documents (exists, needs enhancement)
- ✅ GET `/{id}` - Get document (exists)
- ✅ POST `/` - Create document (exists)
- ⚠️ PATCH `/{id}` - Update document
- ⚠️ DELETE `/{id}` - Delete document
- ⚠️ POST `/bulk-action` - Bulk operations
- ⚠️ GET `/filter-options` - Get filter options
- ⚠️ POST `/{id}/upload` - Upload file
- ⚠️ GET `/{id}/download` - Download file
- ⚠️ GET `/{id}/preview` - Preview document

##### Document Versions - `/api/v1/documents/{id}/versions`
- ⚠️ GET `/` - List versions
- ⚠️ GET `/{version_id}` - Get specific version
- ⚠️ POST `/` - Create new version
- ⚠️ DELETE `/{version_id}` - Delete version

##### Document Metadata - `/api/v1/documents/{id}/metadata`
- ⚠️ GET `/` - Get metadata
- ⚠️ PUT `/` - Update metadata
- ⚠️ PATCH `/` - Partial update

##### Document Permissions - `/api/v1/documents/{id}/permissions`
- ⚠️ GET `/` - List permissions
- ⚠️ POST `/` - Grant permission
- ⚠️ DELETE `/{permission_id}` - Revoke permission

##### Document Shares - `/api/v1/documents/{id}/shares`
- ⚠️ GET `/` - List shares
- ⚠️ POST `/` - Create share link
- ⚠️ DELETE `/{share_id}` - Revoke share
- ⚠️ GET `/public/{token}` - Access shared document

##### Document Comments - `/api/v1/documents/{id}/comments`
- ⚠️ GET `/` - List comments
- ⚠️ POST `/` - Add comment
- ⚠️ PATCH `/{comment_id}` - Update comment
- ⚠️ DELETE `/{comment_id}` - Delete comment
- ⚠️ POST `/{comment_id}/resolve` - Resolve comment

#### 2. Folders API - `/api/v1/folders`
- ⚠️ GET `/` - List folders
- ⚠️ GET `/{id}` - Get folder
- ⚠️ POST `/` - Create folder
- ⚠️ PATCH `/{id}` - Update folder
- ⚠️ DELETE `/{id}` - Delete folder
- ⚠️ GET `/{id}/documents` - List folder documents
- ⚠️ POST `/{id}/documents` - Add document to folder
- ⚠️ DELETE `/{id}/documents/{doc_id}` - Remove document
- ⚠️ GET `/{id}/tree` - Get folder tree
- ⚠️ POST `/smart` - Create smart folder
- ⚠️ POST `/{id}/refresh` - Refresh smart folder

#### 3. Tags API - `/api/v1/tags`
- ⚠️ GET `/` - List all tags
- ⚠️ POST `/` - Create tag
- ⚠️ PATCH `/{id}` - Update tag
- ⚠️ DELETE `/{id}` - Delete tag
- ⚠️ GET `/popular` - Get popular tags

#### 4. Cabinets API - `/api/v1/cabinets`
- ⚠️ GET `/` - List cabinets
- ⚠️ GET `/{id}` - Get cabinet
- ⚠️ POST `/` - Create cabinet
- ⚠️ PATCH `/{id}` - Update cabinet
- ⚠️ DELETE `/{id}` - Delete cabinet
- ⚠️ GET `/{id}/documents` - List cabinet documents
- ⚠️ POST `/{id}/documents` - Add document to cabinet
- ⚠️ DELETE `/{id}/documents/{doc_id}` - Remove document

#### 5. Annotations API - `/api/v1/annotations`
- ⚠️ GET `/` - List annotations (filtered by document)
- ⚠️ GET `/{id}` - Get annotation
- ⚠️ POST `/` - Create annotation
- ⚠️ PATCH `/{id}` - Update annotation
- ⚠️ DELETE `/{id}` - Delete annotation
- ⚠️ GET `/{id}/replies` - List replies
- ⚠️ POST `/{id}/replies` - Add reply
- ⚠️ PATCH `/replies/{reply_id}` - Update reply
- ⚠️ DELETE `/replies/{reply_id}` - Delete reply

#### 6. Approvals API - `/api/v1/approvals`

##### Approval Chains - `/api/v1/approvals/chains`
- ⚠️ GET `/` - List approval chains
- ⚠️ GET `/{id}` - Get chain
- ⚠️ POST `/` - Create chain
- ⚠️ PATCH `/{id}` - Update chain
- ⚠️ DELETE `/{id}` - Delete chain
- ⚠️ GET `/{id}/steps` - List chain steps
- ⚠️ POST `/{id}/steps` - Add step
- ⚠️ PATCH `/steps/{step_id}` - Update step
- ⚠️ DELETE `/steps/{step_id}` - Delete step

##### Approval Requests - `/api/v1/approvals/requests`
- ⚠️ GET `/` - List requests
- ⚠️ GET `/{id}` - Get request
- ⚠️ POST `/` - Create request
- ⚠️ DELETE `/{id}` - Cancel request
- ⚠️ POST `/{id}/approve` - Approve
- ⚠️ POST `/{id}/reject` - Reject
- ⚠️ POST `/{id}/delegate` - Delegate
- ⚠️ GET `/{id}/history` - Get action history

#### 7. OCR API - `/api/v1/ocr`
- ⚠️ POST `/start` - Start OCR job
- ⚠️ GET `/jobs/{id}` - Get job status
- ⚠️ DELETE `/jobs/{id}` - Cancel job
- ⚠️ POST `/jobs/{id}/retry` - Retry job
- ⚠️ GET `/jobs/{id}/result` - Get OCR result
- ⚠️ GET `/jobs/{id}/preview` - Get preview
- ⚠️ GET `/results/{id}` - Get result details
- ⚠️ GET `/results/{id}/text-blocks` - Get text blocks
- ⚠️ GET `/results/{id}/quality` - Get quality metrics
- ⚠️ POST `/results/{id}/edit` - Save manual edits
- ⚠️ GET `/results/{id}/edit-history` - Get edit history
- ⚠️ POST `/detect-type` - Detect document type
- ⚠️ POST `/detect-language` - Detect language
- ⚠️ POST `/optimize-image` - Optimize image for OCR
- ⚠️ GET `/stats` - Get processing statistics

#### 8. Barcodes API - `/api/v1/barcodes`
- ⚠️ GET `/` - List barcodes
- ⚠️ GET `/{id}` - Get barcode
- ⚠️ POST `/` - Create barcode
- ⚠️ PATCH `/{id}` - Update barcode
- ⚠️ DELETE `/{id}` - Delete barcode
- ⚠️ GET `/scan/{code}` - Lookup by code
- ⚠️ POST `/generate` - Generate barcode
- ⚠️ POST `/print` - Create print job

##### Label Templates - `/api/v1/barcodes/templates`
- ⚠️ GET `/` - List templates
- ⚠️ POST `/` - Create template
- ⚠️ GET `/{id}` - Get template
- ⚠️ PATCH `/{id}` - Update template
- ⚠️ DELETE `/{id}` - Delete template

##### Print Jobs - `/api/v1/barcodes/print-jobs`
- ⚠️ GET `/` - List print jobs
- ⚠️ GET `/{id}` - Get job status
- ⚠️ DELETE `/{id}` - Cancel job

#### 9. Physical Documents API - `/api/v1/physical-documents`
- ⚠️ GET `/` - List physical documents
- ⚠️ GET `/{id}` - Get physical document
- ⚠️ POST `/` - Register physical document
- ⚠️ PATCH `/{id}` - Update physical document
- ⚠️ DELETE `/{id}` - Delete physical document
- ⚠️ POST `/{id}/check-out` - Check out document
- ⚠️ POST `/{id}/check-in` - Check in document

##### Storage Locations - `/api/v1/storage-locations`
- ⚠️ GET `/` - List locations
- ⚠️ POST `/` - Create location
- ⚠️ GET `/{id}` - Get location
- ⚠️ PATCH `/{id}` - Update location
- ⚠️ DELETE `/{id}` - Delete location
- ⚠️ GET `/{id}/items` - List items in location

#### 10. Tasks API - `/api/v1/tasks`
- ⚠️ GET `/` - List tasks
- ⚠️ GET `/{id}` - Get task
- ⚠️ POST `/` - Create task
- ⚠️ PATCH `/{id}` - Update task
- ⚠️ DELETE `/{id}` - Delete task
- ⚠️ POST `/{id}/assign` - Assign task
- ⚠️ POST `/{id}/complete` - Complete task
- ⚠️ GET `/{id}/comments` - List comments
- ⚠️ POST `/{id}/comments` - Add comment
- ⚠️ GET `/{id}/attachments` - List attachments
- ⚠️ POST `/{id}/attachments` - Add attachment
- ⚠️ DELETE `/attachments/{attachment_id}` - Delete attachment

#### 11. Workflows API - `/api/v1/workflows`
- ⚠️ GET `/` - List workflows
- ⚠️ GET `/{id}` - Get workflow
- ⚠️ POST `/` - Create workflow
- ⚠️ PATCH `/{id}` - Update workflow
- ⚠️ DELETE `/{id}` - Delete workflow
- ⚠️ POST `/{id}/execute` - Execute workflow
- ⚠️ GET `/{id}/executions` - List executions
- ⚠️ GET `/executions/{exec_id}` - Get execution details
- ⚠️ POST `/executions/{exec_id}/cancel` - Cancel execution
- ⚠️ POST `/{id}/test` - Test workflow with sample data

##### Routing Rules - `/api/v1/workflows/routing-rules`
- ⚠️ GET `/` - List routing rules
- ⚠️ POST `/` - Create rule
- ⚠️ GET `/{id}` - Get rule
- ⚠️ PATCH `/{id}` - Update rule
- ⚠️ DELETE `/{id}` - Delete rule

#### 12. Notifications API - `/api/v1/notifications`
- ⚠️ GET `/` - List notifications
- ⚠️ GET `/{id}` - Get notification
- ⚠️ POST `/{id}/read` - Mark as read
- ⚠️ POST `/mark-all-read` - Mark all as read
- ⚠️ DELETE `/{id}` - Delete notification
- ⚠️ GET `/unread-count` - Get unread count

#### 13. Dashboard Configs API - `/api/v1/dashboards`
- ⚠️ GET `/` - List dashboard configs
- ⚠️ GET `/{id}` - Get config
- ⚠️ POST `/` - Create config
- ⚠️ PATCH `/{id}` - Update config
- ⚠️ DELETE `/{id}` - Delete config
- ⚠️ POST `/{id}/set-default` - Set as default

#### 14. Webhooks API - `/api/v1/webhooks`
- ⚠️ GET `/` - List webhooks
- ⚠️ GET `/{id}` - Get webhook
- ⚠️ POST `/` - Create webhook
- ⚠️ PATCH `/{id}` - Update webhook
- ⚠️ DELETE `/{id}` - Delete webhook
- ⚠️ POST `/{id}/test` - Test webhook
- ⚠️ GET `/{id}/logs` - Get webhook logs
- ⚠️ POST `/{id}/retry/{log_id}` - Retry failed webhook

#### 15. Metadata Schemas API - `/api/v1/metadata-schemas`
- ⚠️ GET `/` - List schemas
- ⚠️ GET `/{id}` - Get schema
- ⚠️ POST `/` - Create schema
- ⚠️ PATCH `/{id}` - Update schema
- ⚠️ DELETE `/{id}` - Delete schema
- ⚠️ POST `/{id}/validate` - Validate metadata against schema

#### 16. Analytics API - `/api/v1/analytics`
- ⚠️ GET `/search-history` - Get search history
- ⚠️ GET `/popular-content` - Get popular content
- ⚠️ GET `/user-analytics` - Get user analytics
- ⚠️ GET `/document-access` - Get document access logs
- ⚠️ GET `/reports/usage` - Usage report
- ⚠️ GET `/reports/trends` - Trending documents
- ⚠️ GET `/reports/user-activity` - User activity report

---

## Implementation Status Legend
- ✅ **Fully Implemented** - Already exists and working
- ⚠️ **To Be Implemented** - Needs to be built
- ❌ **Cannot Implement** - Missing database infrastructure

---

## Missing Database Infrastructure

### None Found
All required database tables exist in the schema. The database is well-designed and comprehensive, supporting all planned API endpoints.

---

## Implementation Order (Priority)

### Phase 1: Core Document Management (High Priority)
1. Documents API expansion (versions, metadata, permissions, shares, comments)
2. Folders API (full implementation)
3. Tags API
4. Cabinets API

### Phase 2: Annotations & Approvals (High Priority)
5. Annotations API (with replies)
6. Approval Chains API
7. Approval Requests API

### Phase 3: OCR & Physical Documents (Medium Priority)
8. OCR API (full implementation)
9. Barcodes API (with label templates and print jobs)
10. Physical Documents API
11. Storage Locations API

### Phase 4: Tasks & Workflows (Medium Priority)
12. Tasks API (with comments and attachments)
13. Workflows API (with executions)
14. Routing Rules API

### Phase 5: System & Integration (Low Priority)
15. Notifications API
16. Dashboard Configs API
17. Webhooks API
18. Metadata Schemas API
19. Analytics API

---

## Frontend-Backend Alignment

### Documents Service Requirements
✅ All frontend requirements can be met:
- Document CRUD operations
- Bulk actions
- Filter options
- Cabinet management
- File upload with progress tracking
- Thumbnail generation

### Search Service Requirements
✅ All frontend requirements can be met:
- Elasticsearch integration
- Full-text search with filters
- Suggestions
- Advanced search
- Export functionality
- Index management
- Batch indexing

### OCR Service Requirements
✅ All frontend requirements can be met:
- Job management
- Status tracking
- Retry functionality
- Preview generation
- Language detection
- Image optimization
- Processing statistics

---

## Technical Implementation Notes

### Models Required
Create Pydantic models for:
- Document operations
- Folder operations
- Annotations
- Approval workflows
- OCR processing
- Barcodes & physical documents
- Tasks & workflows
- Notifications
- Dashboards
- Webhooks
- Metadata schemas
- Analytics

### Database Operations
- Use existing `get_db_cursor()` context manager
- Implement proper transaction management for multi-step operations
- Add database indexes for frequently queried fields
- Implement soft deletes where appropriate

### Security Considerations
- Implement role-based access control for all endpoints
- Add permission checks before document access/modification
- Validate user ownership/permissions for sensitive operations
- Implement rate limiting for resource-intensive operations
- Add audit logging for all state-changing operations

### Performance Optimizations
- Implement pagination for all list endpoints
- Add caching for frequently accessed data
- Use database connection pooling (already implemented)
- Batch database operations where possible
- Implement async operations for file uploads/processing

---

## Estimated Implementation Effort

- **Phase 1**: ~40 endpoints (~2-3 days)
- **Phase 2**: ~20 endpoints (~1-2 days)
- **Phase 3**: ~30 endpoints (~2-3 days)
- **Phase 4**: ~25 endpoints (~2-3 days)
- **Phase 5**: ~30 endpoints (~2-3 days)

**Total**: ~145 new endpoints, ~10-14 days of development

---

## Next Steps

1. Create comprehensive Pydantic models file
2. Implement Phase 1 (Documents, Folders, Tags, Cabinets)
3. Update main.py to include new routers
4. Implement Phase 2 (Annotations, Approvals)
5. Implement Phase 3 (OCR, Barcodes, Physical Docs)
6. Implement Phase 4 (Tasks, Workflows)
7. Implement Phase 5 (Notifications, Dashboards, Webhooks, Analytics)
8. Update OpenAPI documentation
9. Create integration tests
10. Update frontend services to use new endpoints

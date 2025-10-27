# PieDocs API Documentation

**Version:** 1.0.0  
**Generated:** 2025-10-11 09:16:14  
**Base URL:** `http://localhost:8001`

---

## Overview

This document provides a comprehensive reference for all PieDocs API endpoints organized by category.
The API is RESTful and returns JSON responses. Authentication is required for most endpoints.

### Quick Stats

- **Total Categories:** 23
- **Total Endpoints:** 262
- **Authentication:** Bearer Token (JWT)

---

## Table of Contents

1. [authentication](#authentication)
2. [users](#users)
3. [roles](#roles)
4. [permissions](#permissions)
5. [documents](#documents)
6. [document-types](#document-types)
7. [folders](#folders)
8. [tags](#tags)
9. [annotations](#annotations)
10. [approvals](#approvals)
11. [tasks](#tasks)
12. [notifications](#notifications)
13. [check-in-out](#check-in-out)
14. [ocr](#ocr)
15. [classification](#classification)
16. [Metadata Extraction](#metadata-extraction)
17. [Metadata Schemas](#metadata-schemas)
18. [embeddings](#embeddings)
19. [search](#search)
20. [physical-barcodes](#physical-barcodes)
21. [physical-mobile](#physical-mobile)
22. [physical-print](#physical-print)
23. [warehouse](#warehouse)

---

## authentication

**Authentication endpoints - Login, logout, token refresh, password reset, MFA**

Total Endpoints: **6**

### 🔵 `POST` /api/v1/auth/forgot-password

**Description:** Request password reset

**Function:** `forgot_password()`

---

### 🔵 `POST` /api/v1/auth/login

**Description:** User login endpoint

**Function:** `login()`

---

### 🔵 `POST` /api/v1/auth/mfa/resend

**Description:** Resend MFA code

**Function:** `resend_mfa_code()`

---

### 🔵 `POST` /api/v1/auth/mfa/verify

**Description:** Verify MFA code and complete login

**Function:** `verify_mfa()`

---

### 🔵 `POST` /api/v1/auth/refresh

**Description:** Refresh access token using refresh token

**Function:** `refresh_token()`

---

### 🔵 `POST` /api/v1/auth/reset-password

**Description:** Reset password using reset token

**Function:** `reset_password()`

---

## users

**User management endpoints - Create, read, update, and delete users, assign roles**

Total Endpoints: **8**

### 🔵 `POST` /api/v1/users

**Description:** Create a new user

**Function:** `create_user()`

---

### 🟢 `GET` /api/v1/users/{user_id}

**Description:** Get a specific user by ID

**Function:** `get_user()`

---

### 🟠 `PATCH` /api/v1/users/{user_id}

**Description:** Update a user's information

**Function:** `update_user()`

---

### 🔴 `DELETE` /api/v1/users/{user_id}

**Description:** Delete a user (soft delete by deactivating)

**Function:** `delete_user()`

---

### 🔵 `POST` /api/v1/users/{user_id}/password

**Description:** Update a user's password

**Function:** `update_user_password()`

---

### 🟢 `GET` /api/v1/users/{user_id}/permissions

**Description:** Get all permissions for a user (via their roles)

**Function:** `get_user_permissions()`

---

### 🔵 `POST` /api/v1/users/{user_id}/roles

**Description:** Assign roles to a user

**Function:** `assign_roles_to_user()`

---

### 🔴 `DELETE` /api/v1/users/{user_id}/roles/{role_id}

**Description:** Revoke a role from a user

**Function:** `revoke_role_from_user()`

---

## roles

**Role management endpoints - Manage roles and assign permissions to roles**

Total Endpoints: **7**

### 🔵 `POST` /api/v1/roles

**Description:** Create a new role

**Function:** `create_role()`

---

### 🟢 `GET` /api/v1/roles/{role_id}

**Description:** Get a specific role by ID

**Function:** `get_role()`

---

### 🟠 `PATCH` /api/v1/roles/{role_id}

**Description:** Update a role's information

**Function:** `update_role()`

---

### 🔴 `DELETE` /api/v1/roles/{role_id}

**Description:** Delete a role

**Function:** `delete_role()`

---

### 🔵 `POST` /api/v1/roles/{role_id}/permissions

**Description:** Assign permissions to a role

**Function:** `assign_permissions_to_role()`

---

### 🔴 `DELETE` /api/v1/roles/{role_id}/permissions/{permission_id}

**Description:** Revoke a permission from a role

**Function:** `revoke_permission_from_role()`

---

### 🟢 `GET` /api/v1/roles/{role_id}/users

**Description:** Get all users assigned to a role

**Function:** `get_role_users()`

---

## permissions

**Permission management endpoints - View and manage system permissions**

Total Endpoints: **7**

### 🔵 `POST` /api/v1/permissions

**Description:** Create a new permission

**Function:** `create_permission()`

---

### 🟢 `GET` /api/v1/permissions/actions

**Description:** Get a list of all unique actions

**Function:** `list_actions()`

---

### 🟢 `GET` /api/v1/permissions/resources

**Description:** Get a list of all unique resources

**Function:** `list_resources()`

---

### 🟢 `GET` /api/v1/permissions/{permission_id}

**Description:** Get a specific permission by ID

**Function:** `get_permission()`

---

### 🟠 `PATCH` /api/v1/permissions/{permission_id}

**Description:** Update a permission's information

**Function:** `update_permission()`

---

### 🔴 `DELETE` /api/v1/permissions/{permission_id}

**Description:** Delete a permission

**Function:** `delete_permission()`

---

### 🟢 `GET` /api/v1/permissions/{permission_id}/roles

**Description:** Get all roles that have this permission

**Function:** `get_permission_roles()`

---

## documents

**Document management and RAG endpoints**

Total Endpoints: **50**

### 🔵 `POST` /api/v1/documents

**Description:** Create a new document

**Function:** `create_document()`

---

### 🔵 `POST` /api/v1/documents

**Description:** Create a new document

**Function:** `create_document()`

---

### 🟢 `GET` /api/v1/documents/barcode/{barcode_code}

**Description:** Look up a document by its barcode code from the barcodes table

**Function:** `get_document_by_barcode()`

---

### 🟠 `PATCH` /api/v1/documents/comments/{comment_id}

**Description:** Update a document comment

**Function:** `update_document_comment()`

---

### 🟠 `PATCH` /api/v1/documents/comments/{comment_id}

**Description:** Update a document comment

**Function:** `update_document_comment()`

---

### 🔴 `DELETE` /api/v1/documents/comments/{comment_id}

**Description:** Delete a document comment

**Function:** `delete_document_comment()`

---

### 🔴 `DELETE` /api/v1/documents/comments/{comment_id}

**Description:** Delete a document comment

**Function:** `delete_document_comment()`

---

### 🔵 `POST` /api/v1/documents/comments/{comment_id}/resolve

**Description:** Mark a comment as resolved

**Function:** `resolve_document_comment()`

---

### 🔵 `POST` /api/v1/documents/comments/{comment_id}/resolve

**Description:** Mark a comment as resolved

**Function:** `resolve_document_comment()`

---

### 🟢 `GET` /api/v1/documents/filter-options

**Description:** Get available filter options (document types, tags, authors)

**Function:** `get_filter_options()`

---

### 🟢 `GET` /api/v1/documents/filter-options

**Description:** Get available filter options (document types, tags, authors)

**Function:** `get_filter_options()`

---

### 🟢 `GET` /api/v1/documents/{document_id}

**Description:** Get a specific document by ID

**Function:** `get_document()`

---

### 🟢 `GET` /api/v1/documents/{document_id}

**Description:** Get a specific document by ID

**Function:** `get_document()`

---

### 🟠 `PATCH` /api/v1/documents/{document_id}

**Description:** Update a document

**Function:** `update_document()`

---

### 🟠 `PATCH` /api/v1/documents/{document_id}

**Description:** Update a document

**Function:** `update_document()`

---

### 🔵 `POST` /api/v1/documents/{document_id}/analyze

**Description:** Analyze document using AI (GPT-4) for intelligence extraction

**Function:** `analyze_document_intelligence()`

---

### 🔵 `POST` /api/v1/documents/{document_id}/analyze

**Description:** Analyze document using AI (GPT-4) for intelligence extraction

**Function:** `analyze_document_intelligence()`

---

### 🟢 `GET` /api/v1/documents/{document_id}/comments

**Description:** List document comments

**Function:** `list_document_comments()`

---

### 🟢 `GET` /api/v1/documents/{document_id}/comments

**Description:** List document comments

**Function:** `list_document_comments()`

---

### 🔵 `POST` /api/v1/documents/{document_id}/comments

**Description:** Add a comment to a document

**Function:** `create_document_comment()`

---

### 🔵 `POST` /api/v1/documents/{document_id}/comments

**Description:** Add a comment to a document

**Function:** `create_document_comment()`

---

### 🟢 `GET` /api/v1/documents/{document_id}/download

**Description:** Download a document file

**Function:** `download_document()`

---

### 🟢 `GET` /api/v1/documents/{document_id}/download

**Description:** Download a document file

**Function:** `download_document()`

---

### 🟢 `GET` /api/v1/documents/{document_id}/download

**Description:** Download a document file

**Function:** `download_document()`

---

### 🟢 `GET` /api/v1/documents/{document_id}/download

**Description:** Download a document file

**Function:** `download_document()`

---

### 🟢 `GET` /api/v1/documents/{document_id}/metadata

**Description:** Get document metadata - returns custom_fields JSONB

**Function:** `get_document_metadata()`

---

### 🟢 `GET` /api/v1/documents/{document_id}/metadata

**Description:** Get document metadata - returns custom_fields JSONB

**Function:** `get_document_metadata()`

---

### 🟡 `PUT` /api/v1/documents/{document_id}/metadata

**Description:** Update document metadata

**Function:** `update_document_metadata()`

---

### 🟡 `PUT` /api/v1/documents/{document_id}/metadata

**Description:** Update document metadata

**Function:** `update_document_metadata()`

---

### 🟢 `GET` /api/v1/documents/{document_id}/ocr

**Description:** Get OCR results for a document

**Function:** `get_document_ocr()`

---

### 🟢 `GET` /api/v1/documents/{document_id}/permissions

**Description:** List document permissions

**Function:** `list_document_permissions()`

---

### 🟢 `GET` /api/v1/documents/{document_id}/permissions

**Description:** List document permissions

**Function:** `list_document_permissions()`

---

### 🔵 `POST` /api/v1/documents/{document_id}/permissions

**Description:** Grant document permission

**Function:** `create_document_permission()`

---

### 🔵 `POST` /api/v1/documents/{document_id}/permissions

**Description:** Grant document permission

**Function:** `create_document_permission()`

---

### 🔴 `DELETE` /api/v1/documents/{document_id}/permissions/{permission_id}

**Description:** Revoke document permission

**Function:** `delete_document_permission()`

---

### 🔴 `DELETE` /api/v1/documents/{document_id}/permissions/{permission_id}

**Description:** Revoke document permission

**Function:** `delete_document_permission()`

---

### 🟢 `GET` /api/v1/documents/{document_id}/preview

**Description:** Preview a document file (inline display in browser)

**Function:** `preview_document()`

---

### 🟢 `GET` /api/v1/documents/{document_id}/preview

**Description:** Preview a document file (inline display in browser)

**Function:** `preview_document()`

---

### 🟢 `GET` /api/v1/documents/{document_id}/shares

**Description:** List document shares

**Function:** `list_document_shares()`

---

### 🟢 `GET` /api/v1/documents/{document_id}/shares

**Description:** List document shares

**Function:** `list_document_shares()`

---

### 🔵 `POST` /api/v1/documents/{document_id}/shares

**Description:** Create a share link for document

**Function:** `create_document_share()`

---

### 🔵 `POST` /api/v1/documents/{document_id}/shares

**Description:** Create a share link for document

**Function:** `create_document_share()`

---

### 🔴 `DELETE` /api/v1/documents/{document_id}/shares/{share_id}

**Description:** Revoke a document share

**Function:** `revoke_document_share()`

---

### 🔴 `DELETE` /api/v1/documents/{document_id}/shares/{share_id}

**Description:** Revoke a document share

**Function:** `revoke_document_share()`

---

### 🟢 `GET` /api/v1/documents/{document_id}/thumbnail

**Description:** Get document thumbnail image

**Function:** `get_thumbnail()`

---

### 🟢 `GET` /api/v1/documents/{document_id}/thumbnail

**Description:** Get document thumbnail image

**Function:** `get_thumbnail()`

---

### 🟢 `GET` /api/v1/documents/{document_id}/versions

**Description:** List all versions of a document

**Function:** `list_document_versions()`

---

### 🟢 `GET` /api/v1/documents/{document_id}/versions

**Description:** List all versions of a document

**Function:** `list_document_versions()`

---

### 🔵 `POST` /api/v1/documents/{document_id}/versions

**Description:** Create a new document version

**Function:** `create_document_version()`

---

### 🔵 `POST` /api/v1/documents/{document_id}/versions

**Description:** Create a new document version

**Function:** `create_document_version()`

---

## document-types

**Document type management - Define and manage document types and their properties**

Total Endpoints: **6**

### 🔵 `POST` /api/v1/document-types

**Description:** Create a new document type

**Function:** `create_document_type()`

---

### 🟢 `GET` /api/v1/document-types/by-name/{name}

**Description:** Get a specific document type by name

**Function:** `get_document_type_by_name()`

---

### 🟢 `GET` /api/v1/document-types/stats

**Description:** Get statistics for all document types

**Function:** `get_document_type_stats()`

---

### 🟢 `GET` /api/v1/document-types/{document_type_id}

**Description:** Get a specific document type by ID

**Function:** `get_document_type()`

---

### 🟠 `PATCH` /api/v1/document-types/{document_type_id}

**Description:** Update a document type

**Function:** `update_document_type()`

---

### 🔵 `POST` /api/v1/document-types/{document_type_id}/increment-count

**Description:** Increment the document count for a document type

**Function:** `increment_document_count()`

---

## folders

**Folder organization - Hierarchical folder structure for document organization**

Total Endpoints: **9**

### 🔵 `POST` /api/v1/folders

**Description:** Create a new folder

**Function:** `create_folder()`

---

### 🔵 `POST` /api/v1/folders/smart

**Description:** Create a smart folder with criteria

**Function:** `create_smart_folder()`

---

### 🟢 `GET` /api/v1/folders/{folder_id}

**Description:** Get folder details

**Function:** `get_folder()`

---

### 🟠 `PATCH` /api/v1/folders/{folder_id}

**Description:** Update folder

**Function:** `update_folder()`

---

### 🔴 `DELETE` /api/v1/folders/{folder_id}

**Description:** Delete folder (soft delete)

**Function:** `delete_folder()`

---

### 🔵 `POST` /api/v1/folders/{folder_id}/documents

**Description:** Add document to folder

**Function:** `add_document_to_folder()`

---

### 🔴 `DELETE` /api/v1/folders/{folder_id}/documents/{document_id}

**Description:** Remove document from folder

**Function:** `remove_document_from_folder()`

---

### 🔵 `POST` /api/v1/folders/{folder_id}/refresh

**Description:** Refresh smart folder contents based on criteria

**Function:** `refresh_smart_folder()`

---

### 🟢 `GET` /api/v1/folders/{folder_id}/tree

**Description:** Get folder hierarchy tree

**Function:** `get_folder_tree()`

---

## tags

**Document tagging - Create and manage tags for document categorization and filtering**

Total Endpoints: **3**

### 🔵 `POST` /api/v1/tags

**Description:** Create a new tag

**Function:** `create_tag()`

---

### 🟠 `PATCH` /api/v1/tags/{tag_id}

**Description:** Update a tag

**Function:** `update_tag()`

---

### 🔴 `DELETE` /api/v1/tags/{tag_id}

**Description:** Delete a tag

**Function:** `delete_tag()`

---

## annotations

**Document annotations - Add comments, highlights, and threaded replies to documents**

Total Endpoints: **8**

### 🔵 `POST` /api/v1/annotations

**Description:** Create a new annotation

**Function:** `create_annotation()`

---

### 🟠 `PATCH` /api/v1/annotations/replies/{reply_id}

**Description:** Update an annotation reply

**Function:** `update_annotation_reply()`

---

### 🔴 `DELETE` /api/v1/annotations/replies/{reply_id}

**Description:** Delete an annotation reply

**Function:** `delete_annotation_reply()`

---

### 🟢 `GET` /api/v1/annotations/{annotation_id}

**Description:** Get annotation details

**Function:** `get_annotation()`

---

### 🟠 `PATCH` /api/v1/annotations/{annotation_id}

**Description:** Update an annotation

**Function:** `update_annotation()`

---

### 🔴 `DELETE` /api/v1/annotations/{annotation_id}

**Description:** Delete an annotation (soft delete)

**Function:** `delete_annotation()`

---

### 🟢 `GET` /api/v1/annotations/{annotation_id}/replies

**Description:** List replies to an annotation

**Function:** `list_annotation_replies()`

---

### 🔵 `POST` /api/v1/annotations/{annotation_id}/replies

**Description:** Add a reply to an annotation

**Function:** `create_annotation_reply()`

---

## approvals

**Approval workflows - Multi-step approval chains, routing rules, and bulk operations**

Total Endpoints: **27**

### 🔵 `POST` /api/v1/approvals/chains

**Description:** Create a new approval chain

**Function:** `create_approval_chain()`

---

### 🟠 `PATCH` /api/v1/approvals/chains/steps/{step_id}

**Description:** Update chain step

**Function:** `update_chain_step()`

---

### 🔴 `DELETE` /api/v1/approvals/chains/steps/{step_id}

**Description:** Delete chain step

**Function:** `delete_chain_step()`

---

### 🟢 `GET` /api/v1/approvals/chains/{chain_id}

**Description:** Get approval chain details

**Function:** `get_approval_chain()`

---

### 🟠 `PATCH` /api/v1/approvals/chains/{chain_id}

**Description:** Update approval chain

**Function:** `update_approval_chain()`

---

### 🔴 `DELETE` /api/v1/approvals/chains/{chain_id}

**Description:** Delete approval chain

**Function:** `delete_approval_chain()`

---

### 🟢 `GET` /api/v1/approvals/chains/{chain_id}/steps

**Description:** List steps in an approval chain

**Function:** `list_chain_steps()`

---

### 🔵 `POST` /api/v1/approvals/chains/{chain_id}/steps

**Description:** Add a step to approval chain

**Function:** `create_chain_step()`

---

### 🔵 `POST` /api/v1/approvals/chains/{chain_id}/validate

**Description:** Validate approval chain configuration

**Function:** `validate_approval_chain()`

---

### 🔵 `POST` /api/v1/approvals/escalation/check-timeouts

**Description:** Check and escalate requests that have passed their deadline

**Function:** `check_escalation_timeouts()`

---

### 🔵 `POST` /api/v1/approvals/requests

**Description:** Create a new approval request

**Function:** `create_approval_request()`

---

### 🔵 `POST` /api/v1/approvals/requests/auto-route

**Description:** Find matching approval chain for a document based on routing rules

**Function:** `auto_route_request()`

---

### 🔵 `POST` /api/v1/approvals/requests/bulk-action

**Description:** Perform bulk approval actions with permission validation

**Function:** `bulk_approval_action()`

---

### 🟢 `GET` /api/v1/approvals/requests/{request_id}

**Description:** Get approval request details

**Function:** `get_approval_request()`

---

### 🔴 `DELETE` /api/v1/approvals/requests/{request_id}

**Description:** Cancel an approval request

**Function:** `cancel_approval_request()`

---

### 🔵 `POST` /api/v1/approvals/requests/{request_id}/approve

**Description:** Approve a request with permission checks and workflow progression

**Function:** `approve_request()`

---

### 🔵 `POST` /api/v1/approvals/requests/{request_id}/delegate

**Description:** Delegate approval to another user

**Function:** `delegate_request()`

---

### 🔵 `POST` /api/v1/approvals/requests/{request_id}/escalate

**Description:** Manually escalate an approval request with permission checks

**Function:** `escalate_request()`

---

### 🟢 `GET` /api/v1/approvals/requests/{request_id}/history

**Description:** Get approval request action history

**Function:** `get_request_history()`

---

### 🟢 `GET` /api/v1/approvals/requests/{request_id}/metrics

**Description:** Get detailed metrics for an approval request

**Function:** `get_approval_metrics()`

---

### 🔵 `POST` /api/v1/approvals/requests/{request_id}/reject

**Description:** Reject a request with permission checks - comments are REQUIRED

**Function:** `reject_request()`

---

### 🔵 `POST` /api/v1/approvals/requests/{request_id}/request-changes

**Description:** Request changes on an approval request with permission checks - comments are REQUIRED

**Function:** `request_changes()`

---

### 🔵 `POST` /api/v1/approvals/routing-rules

**Description:** Create a new routing rule

**Function:** `create_routing_rule()`

---

### 🟢 `GET` /api/v1/approvals/routing-rules/{rule_id}

**Description:** Get routing rule details

**Function:** `get_routing_rule()`

---

### 🟡 `PUT` /api/v1/approvals/routing-rules/{rule_id}

**Description:** Update routing rule

**Function:** `update_routing_rule()`

---

### 🔴 `DELETE` /api/v1/approvals/routing-rules/{rule_id}

**Description:** Delete routing rule

**Function:** `delete_routing_rule()`

---

### 🟢 `GET` /api/v1/approvals/user/{user_id}/pending

**Description:** Get all pending approval requests assigned to a user with enriched data

**Function:** `get_user_pending_approvals()`

---

## tasks

**Task management - Assign and track document-related tasks and workflows**

Total Endpoints: **11**

### 🔵 `POST` /api/v1/tasks

**Description:** Create a new task

**Function:** `create_task()`

---

### 🔴 `DELETE` /api/v1/tasks/attachments/{attachment_id}

**Description:** Delete a task attachment

**Function:** `delete_task_attachment()`

---

### 🟢 `GET` /api/v1/tasks/{task_id}

**Description:** Get task details

**Function:** `get_task()`

---

### 🟠 `PATCH` /api/v1/tasks/{task_id}

**Description:** Update a task

**Function:** `update_task()`

---

### 🔴 `DELETE` /api/v1/tasks/{task_id}

**Description:** Delete a task

**Function:** `delete_task()`

---

### 🔵 `POST` /api/v1/tasks/{task_id}/assign

**Description:** Assign task to a user

**Function:** `assign_task()`

---

### 🟢 `GET` /api/v1/tasks/{task_id}/attachments

**Description:** List task attachments

**Function:** `list_task_attachments()`

---

### 🔵 `POST` /api/v1/tasks/{task_id}/attachments

**Description:** Add an attachment to a task

**Function:** `add_task_attachment()`

---

### 🟢 `GET` /api/v1/tasks/{task_id}/comments

**Description:** List task comments

**Function:** `list_task_comments()`

---

### 🔵 `POST` /api/v1/tasks/{task_id}/comments

**Description:** Add a comment to a task

**Function:** `create_task_comment()`

---

### 🔵 `POST` /api/v1/tasks/{task_id}/complete

**Description:** Mark task as completed

**Function:** `complete_task()`

---

## notifications

**Notifications - Real-time notifications for workflow events, approvals, and system updates**

Total Endpoints: **5**

### 🔵 `POST` /api/v1/notifications/mark-all-read

**Description:** Mark all user notifications as read

**Function:** `mark_all_notifications_read()`

---

### 🟢 `GET` /api/v1/notifications/unread-count

**Description:** Get count of unread notifications

**Function:** `get_unread_count()`

---

### 🟢 `GET` /api/v1/notifications/{notification_id}

**Description:** Get notification details

**Function:** `get_notification()`

---

### 🔴 `DELETE` /api/v1/notifications/{notification_id}

**Description:** Delete a notification

**Function:** `delete_notification()`

---

### 🔵 `POST` /api/v1/notifications/{notification_id}/read

**Description:** Mark notification as read

**Function:** `mark_notification_read()`

---

## check-in-out

**Document check-in/check-out - Document locking and version control system**

Total Endpoints: **7**

### 🟢 `GET` /api/v1/checkinout/analytics

**Description:** Get checkout analytics and statistics

**Function:** `get_checkout_analytics()`

---

### 🟢 `GET` /api/v1/checkinout/audit/{document_id}

**Description:** Get complete audit trail for a document's checkout history

**Function:** `get_checkout_audit_trail()`

---

### 🔵 `POST` /api/v1/checkinout/checkin

**Description:** Check in a document (releases lock)

**Function:** `checkin_document()`

---

### 🔵 `POST` /api/v1/checkinout/checkout

**Description:** Check out a document for editing (creates lock)

**Function:** `checkout_document()`

---

### 🟢 `GET` /api/v1/checkinout/document/{document_id}/status

**Description:** Get checkout status for a specific document

**Function:** `get_checkout_status()`

---

### 🔵 `POST` /api/v1/checkinout/extend

**Description:** Extend checkout due date

**Function:** `extend_checkout()`

---

### 🔵 `POST` /api/v1/checkinout/force-checkin

**Description:** Force check-in a document (admin override)

**Function:** `force_checkin()`

---

## ocr

**OCR processing - Optical character recognition and document text extraction**

Total Endpoints: **15**

### 🔵 `POST` /api/v1/ocr/detect-language

**Description:** Detect document language

**Function:** `detect_language()`

---

### 🔵 `POST` /api/v1/ocr/detect-type

**Description:** Detect if document is OCR-compatible

**Function:** `detect_document_type()`

---

### 🟢 `GET` /api/v1/ocr/documents/{document_id}

**Description:** Get OCR results for a specific document

**Function:** `get_document_ocr_results()`

---

### 🟢 `GET` /api/v1/ocr/jobs/{job_id}

**Description:** Get OCR job status

**Function:** `get_job_status()`

---

### 🔴 `DELETE` /api/v1/ocr/jobs/{job_id}

**Description:** Cancel an OCR job

**Function:** `cancel_ocr_job()`

---

### 🟢 `GET` /api/v1/ocr/jobs/{job_id}/preview

**Description:** Get OCR preview data

**Function:** `get_ocr_preview()`

---

### 🟢 `GET` /api/v1/ocr/jobs/{job_id}/result

**Description:** Get OCR result for a completed job

**Function:** `get_ocr_result()`

---

### 🔵 `POST` /api/v1/ocr/jobs/{job_id}/retry

**Description:** Retry a failed OCR job

**Function:** `retry_ocr_job()`

---

### 🔵 `POST` /api/v1/ocr/optimize-image

**Description:** Optimize image for OCR processing

**Function:** `optimize_image()`

---

### 🟢 `GET` /api/v1/ocr/results/{result_id}

**Description:** Get OCR result details

**Function:** `get_result_details()`

---

### 🔵 `POST` /api/v1/ocr/results/{result_id}/edit

**Description:** Save manual edits to OCR result

**Function:** `save_manual_edits()`

---

### 🟢 `GET` /api/v1/ocr/results/{result_id}/edit-history

**Description:** Get OCR edit history

**Function:** `get_edit_history()`

---

### 🟢 `GET` /api/v1/ocr/results/{result_id}/quality

**Description:** Get OCR quality metrics

**Function:** `get_quality_metrics()`

---

### 🔵 `POST` /api/v1/ocr/start

**Description:** Start a new OCR processing job with GPT-4 Vision

**Function:** `start_ocr_job()`

---

### 🟢 `GET` /api/v1/ocr/stats

**Description:** Get OCR processing statistics

**Function:** `get_processing_stats()`

---

## classification

**Document classification - AI-powered document type identification using LLM**

Total Endpoints: **1**

### 🟢 `GET` /api/v1/classification/status

**Description:** Check if classification service is available

**Function:** `get_classification_status()`

---

## Metadata Extraction

**Metadata extraction - AI-powered metadata extraction using GPT-5-Nano Vision for multi-page documents**

Total Endpoints: **1**

### 🟢 `GET` /api/v1/metadata/schema/{document_type_id}

**Description:** Get the metadata extraction schema for a document type

**Function:** `get_extraction_schema()`

---

## Metadata Schemas

**Metadata schema management - Define and manage metadata schemas and fields for document types**

Total Endpoints: **10**

### 🔵 `POST` /api/v1/metadata-schemas/

**Description:** Create a new metadata schema with optional fields

**Function:** `create_metadata_schema()`

---

### 🟢 `GET` /api/v1/metadata-schemas/document-type/{document_type_id}

**Description:** Get the active metadata schema for a document type

**Function:** `get_schema_by_document_type()`

---

### 🟡 `PUT` /api/v1/metadata-schemas/documents/{document_id}/metadata

**Description:** Update metadata for a document

**Function:** `update_document_metadata()`

---

### 🔵 `POST` /api/v1/metadata-schemas/documents/{document_id}/metadata/validate

**Description:** Validate document metadata against its schema

**Function:** `validate_document_metadata()`

---

### 🟡 `PUT` /api/v1/metadata-schemas/fields/{field_id}

**Description:** Update a metadata field

**Function:** `update_metadata_field()`

---

### 🔴 `DELETE` /api/v1/metadata-schemas/fields/{field_id}

**Description:** Delete a metadata field (soft delete)

**Function:** `delete_metadata_field()`

---

### 🟢 `GET` /api/v1/metadata-schemas/{schema_id}

**Description:** Get a specific metadata schema with all its fields

**Function:** `get_metadata_schema()`

---

### 🟡 `PUT` /api/v1/metadata-schemas/{schema_id}

**Description:** Update a metadata schema

**Function:** `update_metadata_schema()`

---

### 🔴 `DELETE` /api/v1/metadata-schemas/{schema_id}

**Description:** Delete a metadata schema (soft delete by setting is_active=false)

**Function:** `delete_metadata_schema()`

---

### 🔵 `POST` /api/v1/metadata-schemas/{schema_id}/fields

**Description:** Add a new field to a metadata schema

**Function:** `create_metadata_field()`

---

## embeddings

**Embeddings generation - Generate vector embeddings for semantic search and RAG**

Total Endpoints: **4**

### 🔵 `POST` /api/v1/embeddings/generate

**Description:** Generate embedding for a single text

**Function:** `generate_embedding()`

---

### 🔵 `POST` /api/v1/embeddings/generate-batch

**Description:** Generate embeddings for multiple texts

**Function:** `generate_embeddings_batch()`

---

### 🔵 `POST` /api/v1/embeddings/health

**Description:** Health check endpoint - generate a test embedding

**Function:** `health_check()`

---

### 🟢 `GET` /api/v1/embeddings/status

**Description:** Check embedding service status

**Function:** `get_embedding_service_status()`

---

## search

**Search and query endpoints**

Total Endpoints: **3**

### 🔵 `POST` /api/v1/search/

**Description:** Comprehensive document search endpoint

**Function:** `search_documents()`

---

### 🔴 `DELETE` /api/v1/search/history/{history_id}

**Description:** Delete a search history entry

**Function:** `delete_search_history()`

---

### 🟢 `GET` /api/v1/search/stats

**Description:** Get search statistics and analytics

**Function:** `get_search_stats()`

---

## physical-barcodes

**Barcode management - Generate, validate, and manage barcodes for physical documents and assets**

Total Endpoints: **10**

### 🔵 `POST` /api/v1/physical/barcodes

**Description:** Create a new barcode record

**Function:** `create_barcode()`

---

### 🟢 `GET` /api/v1/physical/barcodes/formats

**Description:** Get all available barcode formats

**Function:** `list_barcode_formats()`

---

### 🟢 `GET` /api/v1/physical/barcodes/formats/{format_id}

**Description:** Get a specific barcode format

**Function:** `get_barcode_format()`

---

### 🔵 `POST` /api/v1/physical/barcodes/generate

**Description:** Generate barcodes for documents or assets

**Function:** `generate_barcodes()`

---

### 🟢 `GET` /api/v1/physical/barcodes/jobs/{job_id}

**Description:** Get barcode generation job status

**Function:** `get_generation_job()`

---

### 🟢 `GET` /api/v1/physical/barcodes/lookup/{code}

**Description:** Look up a barcode by its code

**Function:** `lookup_barcode()`

---

### 🔵 `POST` /api/v1/physical/barcodes/validate/{code}

**Description:** Validate a barcode code

**Function:** `validate_barcode()`

---

### 🟢 `GET` /api/v1/physical/barcodes/{barcode_id}

**Description:** Get a specific barcode record

**Function:** `get_barcode()`

---

### 🟠 `PATCH` /api/v1/physical/barcodes/{barcode_id}/activate

**Description:** Activate a barcode

**Function:** `activate_barcode()`

---

### 🟠 `PATCH` /api/v1/physical/barcodes/{barcode_id}/deactivate

**Description:** Deactivate a barcode

**Function:** `deactivate_barcode()`

---

## physical-mobile

**Mobile scanning - Barcode scanning, document capture, and offline operations**

Total Endpoints: **7**

### 🟢 `GET` /api/v1/physical/mobile/batch/{batch_id}

**Description:** Get batch session with items

**Function:** `get_batch_session()`

---

### 🟠 `PATCH` /api/v1/physical/mobile/batch/{batch_id}/complete

**Description:** Complete a batch scanning session

**Function:** `complete_batch_session()`

---

### 🔵 `POST` /api/v1/physical/mobile/batch/{batch_id}/items

**Description:** Add an item to a batch

**Function:** `add_batch_item()`

---

### 🟠 `PATCH` /api/v1/physical/mobile/captures/{capture_id}/process

**Description:** Trigger processing for a captured document

**Function:** `process_captured_document()`

---

### 🔵 `POST` /api/v1/physical/mobile/scans

**Description:** Record a scanned barcode

**Function:** `record_scan()`

---

### 🟢 `GET` /api/v1/physical/mobile/sessions/{session_id}

**Description:** Get a scan session

**Function:** `get_scan_session()`

---

### 🟠 `PATCH` /api/v1/physical/mobile/sessions/{session_id}/end

**Description:** End a scan session

**Function:** `end_scan_session()`

---

## physical-print

**Print management - Templates, printers, and print job management**

Total Endpoints: **13**

### 🔵 `POST` /api/v1/physical/print/jobs

**Description:** Create a new print job

**Function:** `create_print_job()`

---

### 🟢 `GET` /api/v1/physical/print/jobs/{job_id}

**Description:** Get a specific print job

**Function:** `get_print_job()`

---

### 🔵 `POST` /api/v1/physical/print/jobs/{job_id}/print

**Description:** Execute a print job (trigger printing)

**Function:** `execute_print_job()`

---

### 🟠 `PATCH` /api/v1/physical/print/jobs/{job_id}/status

**Description:** Update print job status

**Function:** `update_print_job_status()`

---

### 🟢 `GET` /api/v1/physical/print/printers

**Description:** Get all printers

**Function:** `list_printers()`

---

### 🔵 `POST` /api/v1/physical/print/printers

**Description:** Create a new printer

**Function:** `create_printer()`

---

### 🟢 `GET` /api/v1/physical/print/printers/{printer_id}

**Description:** Get a specific printer

**Function:** `get_printer()`

---

### 🟠 `PATCH` /api/v1/physical/print/printers/{printer_id}

**Description:** Update a printer

**Function:** `update_printer()`

---

### 🔴 `DELETE` /api/v1/physical/print/printers/{printer_id}

**Description:** Delete a printer

**Function:** `delete_printer()`

---

### 🟢 `GET` /api/v1/physical/print/templates

**Description:** Get all print templates

**Function:** `list_print_templates()`

---

### 🔵 `POST` /api/v1/physical/print/templates

**Description:** Create a new print template

**Function:** `create_print_template()`

---

### 🟢 `GET` /api/v1/physical/print/templates/{template_id}

**Description:** Get a specific print template

**Function:** `get_print_template()`

---

### 🔴 `DELETE` /api/v1/physical/print/templates/{template_id}

**Description:** Delete a print template

**Function:** `delete_print_template()`

---

## warehouse

**Warehouse management - Manage locations, warehouses, zones, shelves, racks, and physical documents**

Total Endpoints: **44**

### 🟢 `GET` /api/v1/warehouse/customer-assignments

**Description:** List customer rack assignments

**Function:** `list_customer_rack_assignments()`

---

### 🔴 `DELETE` /api/v1/warehouse/customer-assignments/{assignment_id}

**Description:** Delete a customer rack assignment

**Function:** `delete_customer_assignment()`

---

### 🟢 `GET` /api/v1/warehouse/documents/barcode/{barcode}

**Description:** Look up a physical document by its barcode

**Function:** `get_document_by_barcode()`

---

### 🟢 `GET` /api/v1/warehouse/documents/digital/{digital_document_id}

**Description:** Get a specific physical document by its digital document ID

**Function:** `get_physical_document_by_digital_id()`

---

### 🟢 `GET` /api/v1/warehouse/documents/{document_id}

**Description:** Get a specific physical document by ID

**Function:** `get_physical_document()`

---

### 🔴 `DELETE` /api/v1/warehouse/documents/{document_id}

**Description:** Delete a physical document

**Function:** `delete_document()`

---

### 🟢 `GET` /api/v1/warehouse/documents/{document_id}/movements

**Description:** Get movement history for a specific document (accepts digital or physical document ID)

**Function:** `get_document_movements()`

---

### 🟢 `GET` /api/v1/warehouse/hierarchy/{location_id}

**Description:** Get complete warehouse hierarchy for a location

**Function:** `get_warehouse_hierarchy()`

---

### 🟢 `GET` /api/v1/warehouse/locations

**Description:** List all locations with optional filtering

**Function:** `list_locations()`

---

### 🟢 `GET` /api/v1/warehouse/locations/{location_id}

**Description:** Get a specific location by ID

**Function:** `get_location()`

---

### 🔴 `DELETE` /api/v1/warehouse/locations/{location_id}

**Description:** Delete a location (cascades to warehouses, zones, etc.)

**Function:** `delete_location()`

---

### 🟢 `GET` /api/v1/warehouse/locations/{location_id}/warehouses

**Description:** Get all warehouses in a location

**Function:** `get_location_warehouses()`

---

### 🔵 `POST` /api/v1/warehouse/mobile/inventory/verify/{rack_id}

**Description:** Verify inventory in a rack against scanned barcodes

**Function:** `verify_rack_inventory()`

---

### 🟢 `GET` /api/v1/warehouse/mobile/lookup/{barcode}

**Description:** Look up entity by barcode (quick lookup)

**Function:** `lookup_barcode()`

---

### 🔵 `POST` /api/v1/warehouse/mobile/scans

**Description:** Record a barcode scan

**Function:** `record_scan()`

---

### 🔵 `POST` /api/v1/warehouse/mobile/scans/bulk

**Description:** Bulk upload scans (for offline sync)

**Function:** `bulk_record_scans()`

---

### 🔵 `POST` /api/v1/warehouse/mobile/sessions

**Description:** Start a new mobile scanning session

**Function:** `create_scan_session()`

---

### 🟢 `GET` /api/v1/warehouse/mobile/sessions/{session_id}

**Description:** Get a specific scan session

**Function:** `get_scan_session()`

---

### 🟠 `PATCH` /api/v1/warehouse/mobile/sessions/{session_id}

**Description:** Update a scan session (complete, cancel, add notes)

**Function:** `update_scan_session()`

---

### 🟢 `GET` /api/v1/warehouse/mobile/sessions/{session_id}/scans

**Description:** Get all scans for a session

**Function:** `get_session_scans()`

---

### 🟢 `GET` /api/v1/warehouse/movements/{movement_id}

**Description:** Get a specific movement record

**Function:** `get_movement()`

---

### 🔵 `POST` /api/v1/warehouse/print/batch

**Description:** Batch print labels for multiple entity types

**Function:** `batch_print_labels()`

---

### 🟢 `GET` /api/v1/warehouse/print/jobs/{job_id}

**Description:** Get a specific print job

**Function:** `get_print_job()`

---

### 🟠 `PATCH` /api/v1/warehouse/print/jobs/{job_id}/status

**Description:** Update print job status

**Function:** `update_print_job_status()`

---

### 🔵 `POST` /api/v1/warehouse/print/labels

**Description:** Print labels for warehouse entities

**Function:** `print_labels()`

---

### 🟢 `GET` /api/v1/warehouse/print/labels/preview/{entity_type}/{entity_id}

**Description:** Preview label data for an entity

**Function:** `preview_label()`

---

### 🟢 `GET` /api/v1/warehouse/racks

**Description:** List all racks with optional filtering

**Function:** `list_racks()`

---

### 🟢 `GET` /api/v1/warehouse/racks/barcode/{barcode}

**Description:** Look up a rack by its barcode

**Function:** `get_rack_by_barcode()`

---

### 🟢 `GET` /api/v1/warehouse/racks/{rack_id}

**Description:** Get a specific rack by ID

**Function:** `get_rack()`

---

### 🔴 `DELETE` /api/v1/warehouse/racks/{rack_id}

**Description:** Delete a rack (must have no documents)

**Function:** `delete_rack()`

---

### 🟢 `GET` /api/v1/warehouse/racks/{rack_id}/documents

**Description:** Get all documents in a rack

**Function:** `get_rack_documents()`

---

### 🟢 `GET` /api/v1/warehouse/shelves

**Description:** List all shelves with optional filtering

**Function:** `list_shelves()`

---

### 🟢 `GET` /api/v1/warehouse/shelves/{shelf_id}

**Description:** Get a specific shelf by ID

**Function:** `get_shelf()`

---

### 🔴 `DELETE` /api/v1/warehouse/shelves/{shelf_id}

**Description:** Delete a shelf (must have no racks)

**Function:** `delete_shelf()`

---

### 🟢 `GET` /api/v1/warehouse/shelves/{shelf_id}/racks

**Description:** Get all racks on a shelf

**Function:** `get_shelf_racks()`

---

### 🟢 `GET` /api/v1/warehouse/stats/counts

**Description:** Get total counts of all entities

**Function:** `get_entity_counts()`

---

### 🟢 `GET` /api/v1/warehouse/warehouses

**Description:** List all warehouses with optional filtering

**Function:** `list_warehouses()`

---

### 🟢 `GET` /api/v1/warehouse/warehouses/{warehouse_id}

**Description:** Get a specific warehouse by ID

**Function:** `get_warehouse()`

---

### 🔴 `DELETE` /api/v1/warehouse/warehouses/{warehouse_id}

**Description:** Delete a warehouse (must have no zones)

**Function:** `delete_warehouse()`

---

### 🟢 `GET` /api/v1/warehouse/warehouses/{warehouse_id}/zones

**Description:** Get all zones in a warehouse

**Function:** `get_warehouse_zones()`

---

### 🟢 `GET` /api/v1/warehouse/zones

**Description:** List all zones with optional filtering

**Function:** `list_zones()`

---

### 🟢 `GET` /api/v1/warehouse/zones/{zone_id}

**Description:** Get a specific zone by ID

**Function:** `get_zone()`

---

### 🔴 `DELETE` /api/v1/warehouse/zones/{zone_id}

**Description:** Delete a zone (must have no shelves)

**Function:** `delete_zone()`

---

### 🟢 `GET` /api/v1/warehouse/zones/{zone_id}/shelves

**Description:** Get all shelves in a zone

**Function:** `get_zone_shelves()`

---

## Authentication

Most endpoints require authentication using a JWT Bearer token.

### Getting a Token

Use the `/api/v1/auth/login` endpoint to obtain an access token:

```bash
curl -X POST http://localhost:8001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'
```

### Using the Token

Include the token in the Authorization header:

```bash
curl -X GET http://localhost:8001/api/v1/documents \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Response Formats

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response

```json
{
  "detail": "Error message describing what went wrong"
}
```

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success - Request completed successfully |
| 201 | Created - Resource created successfully |
| 204 | No Content - Request succeeded with no response body |
| 400 | Bad Request - Invalid request parameters |
| 401 | Unauthorized - Authentication required or failed |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource conflict (e.g., duplicate) |
| 500 | Server Error - Internal server error |
| 503 | Service Unavailable - Service temporarily unavailable |

---

## Additional Resources

- **Interactive API Docs:** [http://localhost:8001/docs](http://localhost:8001/docs) (Swagger UI)
- **Alternative Docs:** [http://localhost:8001/redoc](http://localhost:8001/redoc) (ReDoc)
- **Health Check:** [http://localhost:8001/health](http://localhost:8001/health)
- **API Status:** [http://localhost:8001/api/v1/status](http://localhost:8001/api/v1/status)

---

*Documentation generated from PieDocs API v1.0.0*
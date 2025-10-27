/**
 * Document Permissions Service - Usage Examples
 *
 * This file demonstrates how to use the documentPermissionsService
 * to grant permissions to users and roles.
 */

import { documentPermissionsService } from './documentPermissionsService';

// ============================================
// Example 1: Grant permission to a specific user
// ============================================
async function grantPermissionToUser() {
  const documentId = '81753de0-2010-4864-b236-d2a06ea38c46';
  const userId = 'some-user-uuid';

  const permission = await documentPermissionsService.grantDocumentPermission(documentId, {
    user_id: userId,
    role_id: null, // Must be null when granting to a user
    can_view: true,
    can_edit: true,
    can_delete: false,
    can_share: false,
    can_download: false,
    expires_at: '2025-10-15T06:06:17.772Z',
  });

  console.log('Permission granted:', permission);
}

// ============================================
// Example 2: Grant permission to a role
// ============================================
async function grantPermissionToRole() {
  const documentId = '81753de0-2010-4864-b236-d2a06ea38c46';
  const roleId = 'f9cb2727-d602-4578-9514-eae5a51a7468';

  const permission = await documentPermissionsService.grantDocumentPermission(documentId, {
    user_id: null, // Must be null when granting to a role
    role_id: roleId,
    can_view: true,
    can_edit: true,
    can_delete: false,
    can_share: false,
    can_download: false,
    expires_at: '2025-10-15T06:06:17.772Z',
  });

  console.log('Permission granted to role:', permission);
}

// ============================================
// Example 3: Grant permission to current authenticated user
// ============================================
async function grantPermissionToCurrentUser() {
  const documentId = '81753de0-2010-4864-b236-d2a06ea38c46';

  // Automatically uses the current user's ID from auth state
  const permission = await documentPermissionsService.grantPermissionToCurrentUser(documentId, {
    can_view: true,
    can_edit: true,
    can_delete: false,
    can_share: false,
    can_download: true,
    expires_at: '2025-10-15T06:06:17.772Z',
  });

  console.log('Permission granted to current user:', permission);
}

// ============================================
// Example 4: Use convenience methods
// ============================================
async function useConvenienceMethods() {
  const documentId = '81753de0-2010-4864-b236-d2a06ea38c46';
  const userId = 'some-user-uuid';
  const roleId = 'f9cb2727-d602-4578-9514-eae5a51a7468';

  // Grant viewer permission (view + download only)
  const viewer = await documentPermissionsService.grantViewerPermission(documentId, userId);

  // Grant editor permission (view + edit + download)
  const editor = await documentPermissionsService.grantEditorPermission(documentId, userId);

  // Grant owner permission (all permissions)
  const owner = await documentPermissionsService.grantOwnerPermission(documentId, userId);

  // Can also use with roleId instead of userId
  const roleViewer = await documentPermissionsService.grantViewerPermission(documentId, undefined, roleId);

  console.log('Permissions granted:', { viewer, editor, owner, roleViewer });
}

// ============================================
// Example 5: Get current user ID
// ============================================
function getCurrentUserId() {
  const userId = documentPermissionsService.getCurrentUserId();
  console.log('Current user ID:', userId);
  return userId;
}

export {
  grantPermissionToUser,
  grantPermissionToRole,
  grantPermissionToCurrentUser,
  useConvenienceMethods,
  getCurrentUserId,
};

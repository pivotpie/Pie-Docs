/**
 * Cryptographic utilities for audit trail integrity
 */

/**
 * Generate SHA-256 hash for audit log entries
 */
export async function generateSHA256Hash(data: string): Promise<string> {
  // Use Web Crypto API for secure hashing
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Create deterministic string representation of audit log entry for hashing
 */
export function createAuditLogHashInput(entry: {
  userId: string;
  action: string;
  documentId: string;
  approvalId: string;
  timestamp: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}): string {
  // Create deterministic string for hashing (order matters)
  const hashInput = [
    entry.userId,
    entry.action,
    entry.documentId,
    entry.approvalId,
    entry.timestamp,
    JSON.stringify(entry.details, Object.keys(entry.details).sort()), // Sort keys for consistency
    entry.ipAddress,
    entry.userAgent
  ].join('|');

  return hashInput;
}

/**
 * Generate checksum for audit log entry
 */
export async function generateAuditLogChecksum(entry: {
  userId: string;
  action: string;
  documentId: string;
  approvalId: string;
  timestamp: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}): Promise<string> {
  const hashInput = createAuditLogHashInput(entry);
  return await generateSHA256Hash(hashInput);
}

/**
 * Verify audit log entry integrity
 */
export async function verifyAuditLogIntegrity(
  entry: {
    userId: string;
    action: string;
    documentId: string;
    approvalId: string;
    timestamp: string;
    details: Record<string, any>;
    ipAddress: string;
    userAgent: string;
    checksum: string;
  }
): Promise<{ isValid: boolean; expectedChecksum: string }> {
  const expectedChecksum = await generateAuditLogChecksum(entry);

  return {
    isValid: entry.checksum === expectedChecksum,
    expectedChecksum
  };
}

/**
 * Generate approval action checksum for integrity
 */
export async function generateApprovalActionChecksum(action: {
  userId: string;
  action: string;
  comments: string;
  timestamp: string;
  approvalId: string;
}): Promise<string> {
  const hashInput = [
    action.userId,
    action.action,
    action.comments,
    action.timestamp,
    action.approvalId
  ].join('|');

  return await generateSHA256Hash(hashInput);
}

/**
 * Create a chain of checksums for audit trail immutability
 */
export async function createAuditChainChecksum(
  currentEntryChecksum: string,
  previousEntryChecksum: string | null
): Promise<string> {
  const chainInput = previousEntryChecksum
    ? `${previousEntryChecksum}|${currentEntryChecksum}`
    : currentEntryChecksum;

  return await generateSHA256Hash(chainInput);
}

/**
 * Verify entire audit trail chain integrity
 */
export async function verifyAuditTrailChain(
  auditEntries: Array<{
    checksum: string;
    chainChecksum?: string;
    timestamp: string;
  }>
): Promise<{ isValid: boolean; brokenAtIndex?: number }> {
  if (auditEntries.length === 0) return { isValid: true };

  let previousChainChecksum: string | null = null;

  for (let i = 0; i < auditEntries.length; i++) {
    const entry = auditEntries[i];
    const expectedChainChecksum = await createAuditChainChecksum(
      entry.checksum,
      previousChainChecksum
    );

    if (entry.chainChecksum && entry.chainChecksum !== expectedChainChecksum) {
      return { isValid: false, brokenAtIndex: i };
    }

    previousChainChecksum = entry.chainChecksum || expectedChainChecksum;
  }

  return { isValid: true };
}
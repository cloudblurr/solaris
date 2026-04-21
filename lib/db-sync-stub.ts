/**
 * lib/db-sync-stub.ts
 * Stub implementation for removed database sync functionality.
 * These functions are no-ops to maintain compatibility with existing code.
 */

export async function backupDatabaseToCloudreve(): Promise<boolean> {
  // No-op: Database sync removed
  console.warn('[DB Sync] Backup attempted but database sync is disabled');
  return false;
}

export async function restoreDatabaseFromCloudreve(): Promise<boolean> {
  // No-op: Database sync removed
  console.warn('[DB Sync] Restore attempted but database sync is disabled');
  return false;
}

export function startAutoBackup(): void {
  // No-op: Database sync removed
}

export async function ensureBackupFolder(): Promise<void> {
  // No-op: Database sync removed
  return Promise.resolve();
}

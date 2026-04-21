/**
 * lib/startup.ts
 * Application startup tasks.
 */

import { ensureBackupFolder, startAutoBackup } from './db-sync-stub';

let initialized = false;

export async function initializeApp() {
  if (initialized) return;
  
  console.log('[Startup] Initializing NimbusAI...');
  
  // Ensure Cloudreve backup folder exists
  await ensureBackupFolder();
  
  // Start automatic database backups
  startAutoBackup();
  
  initialized = true;
  console.log('[Startup] Initialization complete');
}

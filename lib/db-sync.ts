/**
 * lib/db-sync.ts
 * Automatically sync SQLite database to Cloudreve for backup.
 * This ensures all user data is stored in Cloudreve.
 */

import fs from 'fs';
import path from 'path';
import { getAdminToken } from './cloudreve';

const BASE = process.env.CLOUDREVE_URL!;
const DB_PATH = path.join(process.cwd(), 'nimbus.db');
const BACKUP_FOLDER = '/system/backups';

/**
 * Upload the SQLite database to Cloudreve as a backup
 */
export async function backupDatabaseToCloudreve(): Promise<boolean> {
  try {
    // Read the database file
    const dbBuffer = fs.readFileSync(DB_PATH);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `nimbus-db-${timestamp}.db`;
    
    // Get admin token
    const token = await getAdminToken();
    
    // Upload to Cloudreve
    const res = await fetch(
      `${BASE}/api/v3/file/upload${BACKUP_FOLDER}/${fileName}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/x-sqlite3',
          'Content-Length': String(dbBuffer.length),
          Cookie: `cloudreve-session=${token}`,
        },
        body: new Uint8Array(dbBuffer),
      }
    );

    const data = await res.json();
    if (data.code !== 0) {
      console.error('[DB Sync] Upload failed:', data.msg);
      return false;
    }

    console.log(`[DB Sync] Database backed up to Cloudreve: ${fileName}`);
    return true;
  } catch (error) {
    console.error('[DB Sync] Backup error:', error);
    return false;
  }
}

/**
 * Download the latest database backup from Cloudreve
 */
export async function restoreDatabaseFromCloudreve(): Promise<boolean> {
  try {
    const token = await getAdminToken();
    
    // List backups
    const listRes = await fetch(
      `${BASE}/api/v3/directory?path=${encodeURIComponent(BACKUP_FOLDER)}`,
      { headers: { Cookie: `cloudreve-session=${token}` } }
    );
    
    const listData = await listRes.json();
    if (listData.code !== 0 || !listData.data?.objects) {
      console.error('[DB Sync] Failed to list backups');
      return false;
    }

    // Find the latest backup
    const backups = listData.data.objects
      .filter((obj: { name: string; type: string }) => 
        obj.type === 'file' && obj.name.startsWith('nimbus-db-') && obj.name.endsWith('.db')
      )
      .sort((a: { name: string }, b: { name: string }) => b.name.localeCompare(a.name));

    if (backups.length === 0) {
      console.log('[DB Sync] No backups found');
      return false;
    }

    const latestBackup = backups[0].name;
    console.log(`[DB Sync] Restoring from: ${latestBackup}`);

    // Download the backup
    const downloadRes = await fetch(
      `${BASE}/api/v3/file/download${BACKUP_FOLDER}/${latestBackup}`,
      { headers: { Cookie: `cloudreve-session=${token}` } }
    );

    if (!downloadRes.ok) {
      console.error('[DB Sync] Download failed');
      return false;
    }

    const dbBuffer = Buffer.from(await downloadRes.arrayBuffer());
    
    // Backup current DB before overwriting
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, `${DB_PATH}.backup`);
    }

    // Write the restored database
    fs.writeFileSync(DB_PATH, dbBuffer);
    console.log('[DB Sync] Database restored successfully');
    return true;
  } catch (error) {
    console.error('[DB Sync] Restore error:', error);
    return false;
  }
}

/**
 * Start automatic backup schedule (every 30 minutes)
 */
export function startAutoBackup() {
  // Initial backup
  backupDatabaseToCloudreve();

  // Schedule backups every 30 minutes
  setInterval(() => {
    backupDatabaseToCloudreve();
  }, 30 * 60 * 1000);

  console.log('[DB Sync] Auto-backup enabled (every 30 minutes)');
}

/**
 * Ensure backup folder exists in Cloudreve
 */
export async function ensureBackupFolder(): Promise<void> {
  try {
    const token = await getAdminToken();
    
    // Create /system folder
    await fetch(`${BASE}/api/v3/directory`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `cloudreve-session=${token}`,
      },
      body: JSON.stringify({ path: '/system' }),
    }).catch(() => {}); // Ignore if exists

    // Create /system/backups folder
    await fetch(`${BASE}/api/v3/directory`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `cloudreve-session=${token}`,
      },
      body: JSON.stringify({ path: BACKUP_FOLDER }),
    }).catch(() => {}); // Ignore if exists

    console.log('[DB Sync] Backup folder ready');
  } catch (error) {
    console.error('[DB Sync] Failed to create backup folder:', error);
  }
}

/**
 * app/api/admin/db-backup/route.ts
 * Manual database backup/restore endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { backupDatabaseToCloudreve, restoreDatabaseFromCloudreve } from '@/lib/db-sync';

// POST - Backup database to Cloudreve
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const success = await backupDatabaseToCloudreve();
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Database backed up to Cloudreve successfully' 
      });
    } else {
      return NextResponse.json({ 
        error: 'Backup failed' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[DB Backup] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Restore database from Cloudreve
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const success = await restoreDatabaseFromCloudreve();
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Database restored from Cloudreve successfully. Please restart the server.' 
      });
    } else {
      return NextResponse.json({ 
        error: 'Restore failed or no backups found' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[DB Restore] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

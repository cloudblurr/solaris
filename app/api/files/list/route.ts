/**
 * app/api/files/list/route.ts
 * List files in the authenticated user's Cloudreve namespace.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listFiles } from '@/lib/cloudreve-stub';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { folder = 'uploads' } = body;

    const result = await listFiles(session.user.id, folder);
    if (!result) {
      return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
    }

    return NextResponse.json({ success: true, folder, ...result });
  } catch (error) {
    console.error('[Files List] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

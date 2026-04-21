/**
 * app/api/files/upload/route.ts
 * Upload content to the authenticated user's Cloudreve namespace.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadFile } from '@/lib/cloudreve-stub';

const ALLOWED_FOLDERS = ['gallery', 'projects', 'conversations', 'uploads'];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { folder, fileName, content, mimeType } = body;

    if (!folder || !fileName || content === undefined || !mimeType) {
      return NextResponse.json(
        { error: 'folder, fileName, content, and mimeType are required' },
        { status: 400 }
      );
    }

    if (!ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json(
        { error: `Invalid folder. Allowed: ${ALLOWED_FOLDERS.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await uploadFile(session.user.id, folder, fileName, content, mimeType);
    if (!result) {
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[Files Upload] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

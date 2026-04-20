/**
 * app/api/files/upload/route.ts
 * Upload AI-generated content to Cloudreve.
 * NOTE: This is for AI outputs, conversations, and projects — NOT user uploads.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadFile, getCloudreveToken } from '@/lib/cloudreve';

export async function POST(request: NextRequest) {
  try {
    // Validate session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { folder, fileName, content, mimeType } = body;

    // Validation
    if (!folder || !fileName || content === undefined || !mimeType) {
      return NextResponse.json(
        { error: 'folder, fileName, content, and mimeType are required' },
        { status: 400 }
      );
    }

    // Only allow specific folders for AI-generated content
    const allowedFolders = ['gallery', 'projects', 'conversations', 'uploads'];
    if (!allowedFolders.includes(folder)) {
      return NextResponse.json(
        { error: `Invalid folder. Allowed: ${allowedFolders.join(', ')}` },
        { status: 400 }
      );
    }

    // Get user with Cloudreve token
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get valid Cloudreve token
    const token = await getCloudreveToken(user.id, user.email, user.cloudreve_token);
    if (!token) {
      return NextResponse.json(
        { error: 'Failed to authenticate with Cloudreve' },
        { status: 500 }
      );
    }

    // Update stored token if it changed
    if (token !== user.cloudreve_token) {
      await prisma.user.update({
        where: { id: user.id },
        data: { cloudreve_token: token },
      });
    }

    // Upload file
    const result = await uploadFile(token, folder, fileName, content, mimeType);
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Files Upload] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

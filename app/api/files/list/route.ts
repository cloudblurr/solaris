/**
 * app/api/files/list/route.ts
 * List files in a Cloudreve folder for the authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listFiles, getCloudreveToken } from '@/lib/cloudreve';

export async function POST(request: NextRequest) {
  try {
    // Validate session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { folder = 'uploads' } = body;

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

    // List files
    const result = await listFiles(token, folder);
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to list files' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      folder,
      ...result,
    });
  } catch (error) {
    console.error('[Files List] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

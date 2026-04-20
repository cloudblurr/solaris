/**
 * app/api/threads/route.ts
 * CRUD operations for chat threads.
 * All operations are scoped to the authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getUserThreads,
  createThread,
  getThread,
  deleteThread,
  updateThreadTitle,
} from '@/lib/user-data';

// GET - List all threads for the user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const threads = await getUserThreads(session.user.id);
    return NextResponse.json({ threads });
  } catch (error) {
    console.error('[Threads] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new thread
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title } = body;

    const thread = await createThread(session.user.id, title);
    return NextResponse.json({ thread });
  } catch (error) {
    console.error('[Threads] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a thread
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('id');

    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID required' }, { status: 400 });
    }

    await deleteThread(session.user.id, threadId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Threads] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update thread title
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { threadId, title } = body;

    if (!threadId || !title) {
      return NextResponse.json({ error: 'Thread ID and title required' }, { status: 400 });
    }

    await updateThreadTitle(session.user.id, threadId, title);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Threads] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

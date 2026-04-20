/**
 * app/api/messages/route.ts
 * Message operations for chat threads.
 * All operations are scoped to the authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addMessage, getThreadMessages } from '@/lib/user-data';

// GET - Get messages for a thread
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');

    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID required' }, { status: 400 });
    }

    const messages = await getThreadMessages(session.user.id, threadId);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('[Messages] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a message to a thread
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { threadId, role, content, mode, attachments } = body;

    if (!threadId || !role || !content) {
      return NextResponse.json(
        { error: 'Thread ID, role, and content required' },
        { status: 400 }
      );
    }

    const message = await addMessage(session.user.id, threadId, {
      role,
      content,
      mode,
      attachments: attachments ? JSON.stringify(attachments) : undefined,
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error('[Messages] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

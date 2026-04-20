/**
 * app/api/memory/route.ts
 * User memory/context operations.
 * Stores ideas, questions, topics, and preferences for contextual AI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserMemory, updateUserMemory, updateContextSummary } from '@/lib/user-data';

// GET - Get user memory
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memory = await getUserMemory(session.user.id);
    return NextResponse.json({ memory });
  } catch (error) {
    console.error('[Memory] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update user memory
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ideas, questions, topics, preferences, contextSummary } = body;

    if (contextSummary) {
      await updateContextSummary(session.user.id, contextSummary);
    } else {
      await updateUserMemory(session.user.id, {
        ideas,
        questions,
        topics,
        preferences,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Memory] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

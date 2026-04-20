/**
 * app/api/agent/context/route.ts
 * Provides user context to the AI agent for personalized conversations.
 * Includes user memory, recent topics, and preferences.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserMemory, getUserThreads } from '@/lib/user-data';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user memory (ideas, questions, topics, preferences)
    const memory = await getUserMemory(session.user.id);

    // Get recent threads for context
    const threads = await getUserThreads(session.user.id);
    const recentThreads = threads.slice(0, 5).map((t) => ({
      id: t.id,
      title: t.title,
      summary: t.summary,
      messageCount: t.messages.length,
    }));

    // Build context string for the agent
    const contextParts: string[] = [];

    if (memory.context_summary) {
      contextParts.push(`User Context Summary: ${memory.context_summary}`);
    }

    if (memory.ideas && memory.ideas.length > 0) {
      contextParts.push(`User's Ideas: ${memory.ideas.join(', ')}`);
    }

    if (memory.questions && memory.questions.length > 0) {
      contextParts.push(`Questions User Has Asked: ${memory.questions.slice(0, 10).join('; ')}`);
    }

    if (memory.topics && memory.topics.length > 0) {
      contextParts.push(`Topics Discussed: ${memory.topics.slice(0, 10).join(', ')}`);
    }

    if (Object.keys(memory.preferences).length > 0) {
      contextParts.push(`User Preferences: ${JSON.stringify(memory.preferences)}`);
    }

    return NextResponse.json({
      context: contextParts.join('\n\n'),
      memory,
      recentThreads,
    });
  } catch (error) {
    console.error('[Agent Context] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update user memory after conversations
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ideas, questions, topics, preferences, contextSummary } = body;

    // Import the update functions
    const { updateUserMemory, updateContextSummary } = await import('@/lib/user-data');

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
    console.error('[Agent Context] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

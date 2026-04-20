import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/roleplay/sessions - List all sessions for user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const characterId = searchParams.get('characterId');

    const sessions = await prisma.roleplaySession.findMany({
      where: {
        user_id: user.id,
        ...(characterId && { character_id: characterId }),
      },
      include: {
        character: true,
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1, // Just the last message for preview
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('[Sessions API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// POST /api/roleplay/sessions - Create new session
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { characterId, loreContext } = body;

    if (!characterId) {
      return NextResponse.json({ error: 'Character ID required' }, { status: 400 });
    }

    const roleplaySession = await prisma.roleplaySession.create({
      data: {
        character_id: characterId,
        user_id: user.id,
        lore_context: JSON.stringify(loreContext || []),
        active_memory: '',
        mood: 'neutral',
      },
      include: {
        character: true,
      },
    });

    return NextResponse.json({ session: roleplaySession });
  } catch (error) {
    console.error('[Sessions API] Error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

// DELETE /api/roleplay/sessions - Delete session
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    await prisma.roleplaySession.delete({
      where: { id, user_id: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Sessions API] Error:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}

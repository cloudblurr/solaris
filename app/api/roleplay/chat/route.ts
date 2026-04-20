import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hermesRoleplayChat, updateCharacterMemory, autoGenerateLore, RoleplayMessage } from '@/lib/roleplay-engine';

// POST /api/roleplay/chat - Send message and get character response
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
    const { sessionId, message } = body;

    if (!sessionId || !message) {
      return NextResponse.json({ error: 'Session ID and message required' }, { status: 400 });
    }

    // Fetch session with character and messages
    const roleplaySession = await prisma.roleplaySession.findUnique({
      where: { id: sessionId, user_id: user.id },
      include: {
        character: true,
        messages: {
          orderBy: { created_at: 'asc' },
          take: 50, // Last 50 messages for context
        },
      },
    });

    if (!roleplaySession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Parse character data
    const character = {
      ...roleplaySession.character,
      personality: JSON.parse(roleplaySession.character.personality),
      traits: JSON.parse(roleplaySession.character.traits),
      relationships: JSON.parse(roleplaySession.character.relationships),
      lore_connections: JSON.parse(roleplaySession.character.lore_connections),
    };

    // Parse lore context
    const loreContext = JSON.parse(roleplaySession.lore_context);

    // Convert DB messages to engine format
    const messages: RoleplayMessage[] = roleplaySession.messages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'character' | 'narrator',
      content: m.content,
      emotion: m.emotion || undefined,
      action: m.action || undefined,
      timestamp: m.created_at,
    }));

    // Save user message
    await prisma.roleplayMessage.create({
      data: {
        session_id: sessionId,
        role: 'user',
        content: message,
      },
    });

    // Get character response from Hermes
    const response = await hermesRoleplayChat(character, messages, loreContext, message);

    // Save character response
    await prisma.roleplayMessage.create({
      data: {
        session_id: sessionId,
        role: 'character',
        content: response.response,
        emotion: response.emotion,
        action: response.action,
      },
    });

    // Update session mood
    await prisma.roleplaySession.update({
      where: { id: sessionId },
      data: { mood: response.emotion, updated_at: new Date() },
    });

    // Background tasks (don't await)
    Promise.all([
      // Update character memory every 10 messages
      (async () => {
        if (messages.length % 10 === 0) {
          try {
            const newMemory = await updateCharacterMemory(character, messages.slice(-10));
            await prisma.roleplayCharacter.update({
              where: { id: character.id },
              data: { memory_summary: newMemory },
            });
          } catch (err) {
            console.error('[Roleplay Chat] Memory update failed:', err);
          }
        }
      })(),

      // Auto-generate lore every 20 messages
      (async () => {
        if (messages.length % 20 === 0) {
          try {
            const existingLore = await prisma.loreEntry.findMany({
              where: { user_id: user.id },
            });
            const parsedLore = existingLore.map((l) => ({
              ...l,
              tags: JSON.parse(l.tags),
              connections: JSON.parse(l.connections),
              category: l.category as 'world' | 'event' | 'location' | 'faction' | 'item' | 'custom',
            }));

            const newLore = await autoGenerateLore(
              {
                ...roleplaySession,
                messages,
                lore_context: loreContext,
              },
              character,
              parsedLore
            );

            if (newLore) {
              await prisma.loreEntry.create({
                data: {
                  title: newLore.title,
                  content: newLore.content,
                  category: newLore.category,
                  tags: JSON.stringify(newLore.tags),
                  connections: JSON.stringify(newLore.connections),
                  auto_generated: true,
                  user_id: user.id,
                },
              });
            }
          } catch (err) {
            console.error('[Roleplay Chat] Auto-lore failed:', err);
          }
        }
      })(),
    ]).catch(console.error);

    return NextResponse.json({
      response: response.response,
      emotion: response.emotion,
      action: response.action,
    });
  } catch (error) {
    console.error('[Roleplay Chat API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process message' },
      { status: 500 }
    );
  }
}

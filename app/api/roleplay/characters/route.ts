import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateCharacterProfile } from '@/lib/roleplay-engine';

// GET /api/roleplay/characters - List all characters for user
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

    const characters = await prisma.roleplayCharacter.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
    });

    // Parse JSON fields
    const parsed = characters.map((c) => ({
      ...c,
      personality: JSON.parse(c.personality),
      traits: JSON.parse(c.traits),
      relationships: JSON.parse(c.relationships),
      lore_connections: JSON.parse(c.lore_connections),
    }));

    return NextResponse.json({ characters: parsed });
  } catch (error) {
    console.error('[Characters API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 });
  }
}

// POST /api/roleplay/characters - Create new character
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
    const { name, quickBackstory, qualities, avatar, useAI } = body;

    let characterData: any = {
      name,
      avatar: avatar || '',
      backstory: quickBackstory || '',
      personality: JSON.stringify([]),
      traits: JSON.stringify([]),
      appearance: '',
      voice: '',
      relationships: JSON.stringify({}),
      lore_connections: JSON.stringify([]),
      memory_summary: '',
      user_id: user.id,
    };

    // Use AI to generate full profile if requested
    if (useAI && name && quickBackstory && qualities?.length > 0) {
      try {
        const generated = await generateCharacterProfile(name, quickBackstory, qualities);
        characterData = {
          ...characterData,
          backstory: generated.backstory,
          personality: JSON.stringify(generated.personality),
          traits: JSON.stringify(generated.traits),
          appearance: generated.appearance,
          voice: generated.voice,
          relationships: JSON.stringify(generated.relationships),
          lore_connections: JSON.stringify(generated.lore_connections),
          memory_summary: generated.memory_summary,
        };
      } catch (aiError) {
        console.error('[Characters API] AI generation failed:', aiError);
        // Continue with manual data
      }
    }

    const character = await prisma.roleplayCharacter.create({
      data: characterData,
    });

    return NextResponse.json({
      character: {
        ...character,
        personality: JSON.parse(character.personality),
        traits: JSON.parse(character.traits),
        relationships: JSON.parse(character.relationships),
        lore_connections: JSON.parse(character.lore_connections),
      },
    });
  } catch (error) {
    console.error('[Characters API] Error:', error);
    return NextResponse.json({ error: 'Failed to create character' }, { status: 500 });
  }
}

// PATCH /api/roleplay/characters - Update character
export async function PATCH(req: NextRequest) {
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
    const { id, ...updates } = body;

    // Stringify array/object fields
    if (updates.personality) updates.personality = JSON.stringify(updates.personality);
    if (updates.traits) updates.traits = JSON.stringify(updates.traits);
    if (updates.relationships) updates.relationships = JSON.stringify(updates.relationships);
    if (updates.lore_connections) updates.lore_connections = JSON.stringify(updates.lore_connections);

    const character = await prisma.roleplayCharacter.update({
      where: { id, user_id: user.id },
      data: updates,
    });

    return NextResponse.json({
      character: {
        ...character,
        personality: JSON.parse(character.personality),
        traits: JSON.parse(character.traits),
        relationships: JSON.parse(character.relationships),
        lore_connections: JSON.parse(character.lore_connections),
      },
    });
  } catch (error) {
    console.error('[Characters API] Error:', error);
    return NextResponse.json({ error: 'Failed to update character' }, { status: 500 });
  }
}

// DELETE /api/roleplay/characters - Delete character
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
      return NextResponse.json({ error: 'Character ID required' }, { status: 400 });
    }

    await prisma.roleplayCharacter.delete({
      where: { id, user_id: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Characters API] Error:', error);
    return NextResponse.json({ error: 'Failed to delete character' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateLore, LoreEntry } from '@/lib/roleplay-engine';

// GET /api/roleplay/lore - List all lore entries for user
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
    const category = searchParams.get('category');

    const loreEntries = await prisma.loreEntry.findMany({
      where: {
        user_id: user.id,
        ...(category && { category }),
      },
      orderBy: { created_at: 'desc' },
    });

    // Parse JSON fields
    const parsed = loreEntries.map((l) => ({
      ...l,
      tags: JSON.parse(l.tags),
      connections: JSON.parse(l.connections),
    }));

    return NextResponse.json({ lore: parsed });
  } catch (error) {
    console.error('[Lore API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch lore' }, { status: 500 });
  }
}

// POST /api/roleplay/lore - Create new lore entry
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
    const { title, content, category, tags, connections, useAI, prompt } = body;

    let loreData: any = {
      title: title || '',
      content: content || '',
      category: category || 'custom',
      tags: JSON.stringify(tags || []),
      connections: JSON.stringify(connections || []),
      auto_generated: false,
      user_id: user.id,
    };

    // Use AI to generate lore if requested
    if (useAI && prompt) {
      try {
        const existingLore = await prisma.loreEntry.findMany({
          where: { user_id: user.id },
        });
        const parsedLore: LoreEntry[] = existingLore.map((l) => ({
          ...l,
          tags: JSON.parse(l.tags),
          connections: JSON.parse(l.connections),
          category: l.category as 'world' | 'event' | 'location' | 'faction' | 'item' | 'custom',
        }));

        const generated = await generateLore(prompt, category || 'custom', parsedLore);
        loreData = {
          ...loreData,
          title: generated.title,
          content: generated.content,
          tags: JSON.stringify(generated.tags),
          connections: JSON.stringify(generated.connections),
        };
      } catch (aiError) {
        console.error('[Lore API] AI generation failed:', aiError);
        // Continue with manual data
      }
    }

    const lore = await prisma.loreEntry.create({
      data: loreData,
    });

    return NextResponse.json({
      lore: {
        ...lore,
        tags: JSON.parse(lore.tags),
        connections: JSON.parse(lore.connections),
      },
    });
  } catch (error) {
    console.error('[Lore API] Error:', error);
    return NextResponse.json({ error: 'Failed to create lore' }, { status: 500 });
  }
}

// PATCH /api/roleplay/lore - Update lore entry
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

    // Stringify array fields
    if (updates.tags) updates.tags = JSON.stringify(updates.tags);
    if (updates.connections) updates.connections = JSON.stringify(updates.connections);

    const lore = await prisma.loreEntry.update({
      where: { id, user_id: user.id },
      data: updates,
    });

    return NextResponse.json({
      lore: {
        ...lore,
        tags: JSON.parse(lore.tags),
        connections: JSON.parse(lore.connections),
      },
    });
  } catch (error) {
    console.error('[Lore API] Error:', error);
    return NextResponse.json({ error: 'Failed to update lore' }, { status: 500 });
  }
}

// DELETE /api/roleplay/lore - Delete lore entry
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
      return NextResponse.json({ error: 'Lore ID required' }, { status: 400 });
    }

    await prisma.loreEntry.delete({
      where: { id, user_id: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Lore API] Error:', error);
    return NextResponse.json({ error: 'Failed to delete lore' }, { status: 500 });
  }
}

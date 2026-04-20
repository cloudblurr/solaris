/**
 * app/api/skyway/route.ts
 * CRUD for Sky-Way agents (user-scoped, max 5).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getUserAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  setActiveAgent,
} from '@/lib/skyway';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const agents = await getUserAgents(session.user.id);
    return NextResponse.json({ agents });
  } catch (error) {
    console.error('[Skyway] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const agent = await createAgent(session.user.id, body);
    return NextResponse.json({ agent }, { status: 201 });
  } catch (error: any) {
    console.error('[Skyway] POST error:', error);
    if (error.message?.includes('limit')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { agentId, action, ...data } = body;

    if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });

    if (action === 'activate') {
      await setActiveAgent(session.user.id, agentId);
      return NextResponse.json({ success: true });
    }

    const agent = await updateAgent(session.user.id, agentId, data);
    return NextResponse.json({ agent });
  } catch (error) {
    console.error('[Skyway] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('id');
    if (!agentId) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await deleteAgent(session.user.id, agentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Skyway] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

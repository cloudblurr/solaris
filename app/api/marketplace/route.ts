/**
 * app/api/marketplace/route.ts
 * Public marketplace listing + submission.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  listMarketplace,
  submitMarketplaceEntry,
  getUserInstalledItems,
  seedOfficialEntries,
} from '@/lib/marketplace-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Seed official entries if none exist (first-run bootstrap)
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await seedOfficialEntries(session.user.id).catch(() => {});
    }

    const entries = await listMarketplace({ category, search, limit, offset });

    // If authenticated, include installed status
    let installedIds: string[] = [];
    if (session?.user?.id) {
      installedIds = await getUserInstalledItems(session.user.id);
    }

    return NextResponse.json({ entries, installedIds });
  } catch (error) {
    console.error('[Marketplace] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const entry = await submitMarketplaceEntry(
      session.user.id,
      session.user.name,
      body
    );
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('[Marketplace] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

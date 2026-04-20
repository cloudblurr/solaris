/**
 * app/api/marketplace/install/route.ts
 * Install / uninstall marketplace items.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { installMarketplaceItem, uninstallMarketplaceItem } from '@/lib/marketplace-db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { entryId, config } = await request.json();
    if (!entryId) return NextResponse.json({ error: 'entryId required' }, { status: 400 });

    await installMarketplaceItem(session.user.id, entryId, config);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Marketplace/Install] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');
    if (!entryId) return NextResponse.json({ error: 'entryId required' }, { status: 400 });

    await uninstallMarketplaceItem(session.user.id, entryId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Marketplace/Install] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

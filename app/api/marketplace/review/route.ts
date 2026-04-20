/**
 * app/api/marketplace/review/route.ts
 * Submit a review for a marketplace entry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { submitReview, getEntryReviews } from '@/lib/marketplace-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');
    if (!entryId) return NextResponse.json({ error: 'entryId required' }, { status: 400 });

    const reviews = await getEntryReviews(entryId);
    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('[Marketplace/Review] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { entryId, rating, comment } = await request.json();
    if (!entryId || !rating) return NextResponse.json({ error: 'entryId and rating required' }, { status: 400 });
    if (rating < 1 || rating > 5) return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });

    await submitReview(session.user.id, entryId, rating, comment);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Marketplace/Review] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * app/api/auth/register/route.ts
 * User registration endpoint.
 * Creates a new NimbusAI user and provisions their Cloudreve account.
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { provisionCloudreveUser } from '@/lib/cloudreve';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    console.log('[Register] Received registration request for:', email);

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    console.log('[Register] Checking for existing user...');
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    console.log('[Register] Hashing password...');
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    console.log('[Register] Creating user in database...');
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password_hash: passwordHash,
      },
    });

    console.log('[Register] User created successfully:', user.id);

    // Provision Cloudreve account (non-blocking)
    provisionCloudreveUser({
      id: user.id,
      email: user.email,
      name: user.name,
    }).then(async (result) => {
      if (result) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            cloudreve_token: result.token,
            cloudreve_uid: result.uid,
            provisioned: true,
          },
        });
      }
    }).catch((err) => {
      console.error('[Register] Cloudreve provisioning error:', err);
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('[Register] Error:', error);
    console.error('[Register] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

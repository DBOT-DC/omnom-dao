import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  initDatabase,
  getUserByWallet,
  updateUserDisplayName,
  getUserWallets,
  updateUserPrivacyFlags,
  getUserVotes,
} from '@/lib/database';
import { getSession } from '@/lib/auth';
import type { PrivacyFlags } from '@/types';

// ── Validation ────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  display_name: z
    .string()
    .min(1, 'Display name cannot be empty')
    .max(50, 'Display name must be under 50 characters')
    .optional(),
  privacy_flags: z
    .object({
      showHolderRank: z.boolean().optional(),
      showBalance: z.boolean().optional(),
    })
    .optional(),
});

// ── GET: User profile ────────────────────────────────────────────────

export async function GET() {
  try {
    await initDatabase();

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await getUserByWallet(session.sub);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const wallets = await getUserWallets(user.id);
    const votes = await getUserVotes(session.sub);

    return NextResponse.json({
      user: {
        ...user,
        wallets,
        votes,
      },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// ── PUT: Update display name and privacy flags ────────────────────────

export async function PUT(request: NextRequest) {
  try {
    await initDatabase();

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await getUserByWallet(session.sub);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { display_name, privacy_flags } = parsed.data;

    // Update display name if provided
    let updatedUser = user;
    if (display_name !== undefined) {
      const result = await updateUserDisplayName(user.id, display_name);
      if (result) {
        updatedUser = result;
      }
    }

    // Privacy flags update — merge with existing and persist to DB
    const mergedFlags: PrivacyFlags = {
      showHolderRank: privacy_flags?.showHolderRank ?? user.privacy_flags.showHolderRank,
      showBalance: privacy_flags?.showBalance ?? user.privacy_flags.showBalance,
    };

    if (privacy_flags) {
      await updateUserPrivacyFlags(user.id, mergedFlags);
    }

    return NextResponse.json({
      user: {
        ...updatedUser,
        privacy_flags: mergedFlags,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

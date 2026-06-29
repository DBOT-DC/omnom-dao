import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import { z } from 'zod';
import {
  initDatabase,
  createUser,
  getUserByWallet,
  linkWallet,
} from '@/lib/database';
import { consumeNonce, generateToken, COOKIE_NAME } from '@/lib/auth';
import { lookupHolder } from '@/lib/holders';

// ── Validation ────────────────────────────────────────────────────────

const verifySchema = z.object({
  address: z.string().min(1),
  signature: z.string().min(1),
  nonce: z.string().min(1),
});

// ── POST: Verify ECDSA signature (simplified from SIWE) ────────────

export async function POST(request: NextRequest) {
  try {
    await initDatabase();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { address, signature, nonce } = parsed.data;

    // 1. Verify nonce exists and is not expired
    if (!consumeNonce(nonce)) {
      return NextResponse.json(
        { error: 'Nonce not found, expired, or already used' },
        { status: 401 }
      );
    }

    // 2. Recover signer from signature using viem's verifyMessage
    const message = `Sign this message to verify your wallet ownership.\n\nNonce: ${nonce}`;
    const isValid = await verifyMessage({ message, signature: signature as `0x${string}`, address: address as `0x${string}` });

    if (!isValid) {
      return NextResponse.json(
        { error: 'Signature verification failed' },
        { status: 401 }
      );
    }

    const recoveredAddress = address.toLowerCase();

    // 3. Look up holder in snapshot
    const holder = lookupHolder(recoveredAddress);

    // 4. Create or find user in database
    let user = await getUserByWallet(recoveredAddress);
    if (!user) {
      user = await createUser(recoveredAddress);
    }

    // 5. Generate JWT with holder info
    const token = await generateToken(recoveredAddress);

    // 6. Build response
    const userResponse = {
      id: user.id,
      address: recoveredAddress,
      display_name: user.display_name,
      verified: true,
      holder: holder
        ? {
            rank: holder.rank,
            balance: holder.balance,
            class: holder.class,
            percentage: holder.percentage,
          }
        : null,
    };

    // 7. Set JWT as httpOnly cookie
    const response = NextResponse.json({ user: userResponse });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 604800, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

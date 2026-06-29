import { NextRequest, NextResponse } from 'next/server';
import { initDatabase } from '@/lib/database';
import { generateNonce } from '@/lib/auth';

// ── GET: Generate nonce for SIWE ──────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    await initDatabase();

    const nonce = generateNonce();
    const issuedAt = new Date().toISOString();

    const domain = request.headers.get('host') || 'localhost:3000';

    const message =
      `${domain} wants you to sign in with your Ethereum account:\n` +
      `\n` +
      `Verify you own this wallet to access $OMNOM DAO governance.\n` +
      `\n` +
      `Nonce: ${nonce}\n` +
      `Issued At: ${issuedAt}`;

    return NextResponse.json({ nonce, message });
  } catch (error) {
    console.error('Nonce generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate nonce' },
      { status: 500 }
    );
  }
}

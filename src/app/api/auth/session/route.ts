import { NextResponse } from 'next/server';
import { initDatabase, getUserNotifications } from '@/lib/database';
import { getSession } from '@/lib/auth';

// ── GET: Session data ─────────────────────────────────────────────────

export async function GET() {
  try {
    await initDatabase();

    const session = await getSession();

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Fetch unread notification count
    const notifications = await getUserNotifications(session.sub, 1);
    // We need the user by wallet to get the user ID
    // For now, return session data with notifications from the session
    return NextResponse.json({
      authenticated: true,
      user: {
        address: session.sub,
        holder: session.holder ?? false,
        holderClass: session.holderClass ?? null,
        balance: session.balance ?? null,
        rank: session.rank ?? null,
        votingPower: session.votingPower ?? 0,
      },
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}

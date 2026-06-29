import { NextRequest, NextResponse } from 'next/server';
import { initDatabase } from '@/lib/database';
import { lookupHolder, calculateVotingPower } from '@/lib/holders';

// ── GET: Public holder lookup ─────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    await initDatabase();

    const { address } = await params;

    // Basic address format validation
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    const holder = lookupHolder(address);

    if (!holder) {
      return NextResponse.json({ found: false });
    }

    const votingPower = calculateVotingPower(Number(holder.balance));

    return NextResponse.json({
      found: true,
      holder: {
        rank: holder.rank,
        balance: holder.balance,
        class: holder.class,
        percentage: holder.percentage,
      },
      voting_power: votingPower,
    });
  } catch (error) {
    console.error('Snapshot lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup address' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import {
  initDatabase,
  getProposal,
  getProposalVotes,
  getProposalComments,
} from '@/lib/database';
import { getSession } from '@/lib/auth';

// ── GET: Single proposal ──────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();

    const { id } = await params;

    const proposal = await getProposal(id);

    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // Get vote count and comment count
    const [votes, comments] = await Promise.all([
      getProposalVotes(id),
      getProposalComments(id),
    ]);

    return NextResponse.json({
      proposal: {
        ...proposal,
        vote_count: votes.length,
        comment_count: comments.length,
      },
    });
  } catch (error) {
    console.error('Proposal fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proposal' },
      { status: 500 }
    );
  }
}

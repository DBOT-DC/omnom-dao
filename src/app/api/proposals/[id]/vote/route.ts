import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  initDatabase,
  getProposal,
  getVoteByUser,
  getProposalVotes,
  castVote,
} from '@/lib/database';
import { getSession } from '@/lib/auth';
import { lookupHolder, calculateVotingPower } from '@/lib/holders';

// ── Validation ────────────────────────────────────────────────────────

const voteSchema = z.object({
  choice: z.enum(['FOR', 'AGAINST', 'ABSTAIN'] as const),
});

// ── GET: List votes for a proposal ─────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();

    const { id: proposalId } = await params;

    const proposal = await getProposal(proposalId);
    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    const votes = await getProposalVotes(proposalId);

    return NextResponse.json({
      votes: votes.map((v) => ({
        voter_address: v.voter_address,
        choice: v.choice,
        voting_power: v.voting_power,
        created_at: v.created_at,
      })),
    });
  } catch (error) {
    console.error('Votes fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch votes' },
      { status: 500 }
    );
  }
}

// ── POST: Cast vote ────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();

    // Auth check — must be authenticated holder
    const session = await getSession();
    if (!session || !session.holder) {
      return NextResponse.json(
        { error: 'Only verified OMNOM holders can vote' },
        { status: 403 }
      );
    }

    const { id: proposalId } = await params;

    // Validate request body
    const body = await request.json();
    const parsed = voteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { choice } = parsed.data;

    // Check proposal exists
    const proposal = await getProposal(proposalId);
    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // Proposal must be ACTIVE
    if (proposal.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'This proposal is not accepting votes', message: `Current status: ${proposal.status}` },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    // Check voting period — allow vote changes until final 12h before voting ends
    if (proposal.voting_ends_at && proposal.voting_ends_at < now) {
      return NextResponse.json(
        { error: 'Voting period has ended' },
        { status: 400 }
      );
    }

    // Block new votes in final 12 hours (only allow changes)
    const isFinal12Hours = proposal.voting_ends_at
      ? (proposal.voting_ends_at - now) <= 12 * 3600
      : false;

    const existingVote = await getVoteByUser(proposalId, session.sub);

    if (!existingVote && isFinal12Hours) {
      return NextResponse.json(
        { error: 'Voting is locked in the final 12 hours — only vote changes are allowed' },
        { status: 400 }
      );
    }

    // Calculate QTV voting power from snapshot
    const holder = lookupHolder(session.sub);
    const votingPower = holder
      ? calculateVotingPower(Number(holder.balance))
      : 0;

    if (votingPower === 0) {
      return NextResponse.json(
        { error: 'No voting power found for this wallet in the snapshot' },
        { status: 403 }
      );
    }

    // Cast or update vote (castVote handles upsert via ON CONFLICT)
    const result = await castVote(proposalId, session.sub, choice, votingPower);

    return NextResponse.json({
      vote: result.vote,
      proposal: result.proposal,
    });
  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json(
      { error: 'Failed to cast vote' },
      { status: 500 }
    );
  }
}

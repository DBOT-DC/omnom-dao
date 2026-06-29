import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  initDatabase,
  listProposals,
  createProposal,
} from '@/lib/database';
import { getSession } from '@/lib/auth';
import type { ProposalType, ProposalStatus } from '@/types';

// ── Validation Schemas ────────────────────────────────────────────────

const createProposalSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(200),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  type: z.enum([
    'CHAIN_SELECTION',
    'TREASURY',
    'TOKENOMICS',
    'COMMUNITY_GUIDELINE',
    'TECHNICAL_SPEC',
    'GENERAL',
  ] as const),
  voting_ends_at: z.number().int().positive().optional(),
  quorum_required: z.number().min(0.01).max(0.50).optional(),
  voting_multiplier: z.number().min(0.1).max(10).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ── GET: List proposals ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    await initDatabase();

    const { searchParams } = new URL(request.url);

    // Parse query params
    const status = searchParams.get('status') as ProposalStatus | null;
    const type = searchParams.get('type') as ProposalType | null;
    const search = searchParams.get('search') || undefined;
    const sort = searchParams.get('sort') || 'newest';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // Map frontend sort options to DB sort columns
    let sortColumn: 'created_at' | 'voting_ends_at' | 'votes_for' = 'created_at';
    let order: 'asc' | 'desc' = 'desc';

    switch (sort) {
      case 'newest':
        sortColumn = 'created_at';
        order = 'desc';
        break;
      case 'oldest':
        sortColumn = 'created_at';
        order = 'asc';
        break;
      case 'most-votes':
        sortColumn = 'votes_for';
        order = 'desc';
        break;
      case 'ending-soon':
        sortColumn = 'voting_ends_at';
        order = 'asc';
        break;
    }

    // Validate enum values if provided
    const validStatuses: ProposalStatus[] = [
      'DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'CLOSED', 'PASSED', 'FAILED', 'EXPIRED',
    ];
    const validTypes: ProposalType[] = [
      'CHAIN_SELECTION', 'TREASURY', 'TOKENOMICS', 'COMMUNITY_GUIDELINE', 'TECHNICAL_SPEC', 'GENERAL',
    ];

    const result = await listProposals(
      {
        status: status && validStatuses.includes(status) ? status : undefined,
        type: type && validTypes.includes(type) ? type : undefined,
        search,
        sort: sortColumn,
        order,
      },
      page,
      limit,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Proposals list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proposals' },
      { status: 500 }
    );
  }
}

// ── POST: Create proposal ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    await initDatabase();

    // Auth check — must be authenticated + verified holder
    const session = await getSession();
    if (!session || !session.holder) {
      return NextResponse.json(
        { error: 'Only verified OMNOM holders can create proposals' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createProposalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const proposal = await createProposal(parsed.data, session.sub);

    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error) {
    console.error('Proposal creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create proposal' },
      { status: 500 }
    );
  }
}

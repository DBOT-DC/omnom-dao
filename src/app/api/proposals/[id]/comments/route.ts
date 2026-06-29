import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  initDatabase,
  getProposal,
  getProposalComments,
  createComment,
} from '@/lib/database';
import { getSession } from '@/lib/auth';

// ── Validation ────────────────────────────────────────────────────────

const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment must be under 2000 characters'),
  parent_id: z.string().uuid().optional(),
});

// ── GET: List comments (threaded, paginated) ──────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();

    const { id: proposalId } = await params;

    // Verify proposal exists
    const proposal = await getProposal(proposalId);
    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    // Fetch all visible (non-deleted) comments for this proposal
    const allComments = await getProposalComments(proposalId);

    // Build threaded structure: separate roots and replies
    const rootComments = allComments.filter((c) => c.parent_id === null);
    const replyMap = new Map<string, typeof allComments>();

    for (const c of allComments) {
      if (c.parent_id) {
        const existing = replyMap.get(c.parent_id) || [];
        existing.push(c);
        replyMap.set(c.parent_id, existing);
      }
    }

    // Paginate root comments
    const total = rootComments.length;
    const offset = (page - 1) * limit;
    const paginatedRoots = rootComments.slice(offset, offset + limit);

    // Attach replies to roots
    const comments = paginatedRoots.map((root) => ({
      ...root,
      replies: (replyMap.get(root.id) || []).sort(
        (a, b) => a.created_at - b.created_at
      ),
    }));

    return NextResponse.json({ comments, total, page, limit });
  } catch (error) {
    console.error('Comments fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// ── POST: Add comment ─────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();

    // Auth check — any authenticated user can comment
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: proposalId } = await params;

    // Verify proposal exists
    const proposal = await getProposal(proposalId);
    if (!proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // Validate body
    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { content, parent_id } = parsed.data;

    // If parent_id provided, verify it exists and belongs to this proposal
    if (parent_id) {
      const allComments = await getProposalComments(proposalId);
      const parentExists = allComments.some((c) => c.id === parent_id);
      if (!parentExists) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 400 }
        );
      }
    }

    const comment = await createComment(proposalId, session.sub, content, parent_id ?? null);

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Comment creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

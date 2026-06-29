import { NextResponse } from 'next/server';
import { initDatabase, getProposalTemplates } from '@/lib/database';

// ── GET: List proposal templates ─────────────────────────────────────

export async function GET() {
  try {
    await initDatabase();

    const templates = await getProposalTemplates();

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Templates fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

import { createClient, type Client } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  User,
  Proposal,
  Vote,
  Comment,
  Notification,
  ProposalTemplate,
  LinkedWallet,
  ProposalStatus,
  ProposalType,
  VoteChoice,
  ProposalsFilter,
  ProposalsResponse,
  CreateProposalPayload,
  PrivacyFlags,
} from '@/types';

// ════════════════════════════════════════════════════════════════════════
// Database Singleton
// ════════════════════════════════════════════════════════════════════════

const dbUrl = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN || '';

let _client: Client | null = null;

export function getDatabase(): Client {
  if (!_client) {
    _client = createClient({
      url: dbUrl,
      authToken: authToken || undefined,
    });
  }
  return _client;
}

// ════════════════════════════════════════════════════════════════════════
// Schema Initialization
// ════════════════════════════════════════════════════════════════════════

let _initialized = false;

export async function initDatabase(): Promise<void> {
  if (_initialized) return;
  const db = getDatabase();

  // Try multiple path strategies to find schema.sql (works in both dev and production)
  const candidates = [
    join(process.cwd(), 'database', 'schema.sql'),
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'database', 'schema.sql'),
  ];
  let schema: string | null = null;
  for (const p of candidates) {
    try {
      schema = readFileSync(p, 'utf-8');
      break;
    } catch { /* try next */ }
  }
  if (!schema) {
    throw new Error(`Could not find schema.sql. Tried: ${candidates.join(', ')}`);
  }

  // Strip single-line comments, then split on semicolons
  const cleaned = schema
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  const statements = cleaned
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    try {
      await db.execute(stmt);
    } catch (e: unknown) {
      const msg = (e as Error).message || String(e);
      // Ignore "already exists" errors from IF NOT EXISTS
      if (!msg.includes('already exists') && !msg.includes('duplicate')) {
        console.error('Schema error:', msg);
      }
    }
  }

  _initialized = true;
  console.log('✅ Database schema initialized');
}

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    wallet_address: row.wallet_address as string,
    display_name: (row.display_name as string) ?? null,
    primary_wallet: (row.primary_wallet as string) ?? null,
    privacy_flags: parseJson<PrivacyFlags>(row.privacy_flags as string, {
      showHolderRank: true,
      showBalance: false,
    }),
    created_at: row.created_at as number,
    updated_at: row.updated_at as number,
  };
}

function rowToProposal(row: Record<string, unknown>): Proposal {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    type: row.type as ProposalType,
    status: row.status as ProposalStatus,
    author_address: row.author_address as string,
    created_at: row.created_at as number,
    updated_at: row.updated_at as number,
    voting_starts_at: (row.voting_starts_at as number) ?? null,
    voting_ends_at: (row.voting_ends_at as number) ?? null,
    quorum_required: row.quorum_required as number,
    votes_for: row.votes_for as number,
    votes_against: row.votes_against as number,
    votes_abstain: row.votes_abstain as number,
    vote_power_for: row.vote_power_for as number,
    vote_power_against: row.vote_power_against as number,
    vote_power_abstain: row.vote_power_abstain as number,
    metadata: parseJson<Record<string, unknown>>(row.metadata as string, {}),
    voting_multiplier: row.voting_multiplier as number,
  };
}

function rowToVote(row: Record<string, unknown>): Vote {
  return {
    id: row.id as string,
    proposal_id: row.proposal_id as string,
    voter_address: row.voter_address as string,
    choice: row.choice as VoteChoice,
    voting_power: row.voting_power as number,
    delegated_from: (row.delegated_from as string) ?? null,
    created_at: row.created_at as number,
    updated_at: row.updated_at as number,
  };
}

function rowToComment(row: Record<string, unknown>): Comment {
  return {
    id: row.id as string,
    proposal_id: row.proposal_id as string,
    author_address: row.author_address as string,
    content: row.content as string,
    parent_id: (row.parent_id as string) ?? null,
    deleted_at: (row.deleted_at as number) ?? null,
    created_at: row.created_at as number,
    updated_at: row.updated_at as number,
  };
}

function rowToNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    type: row.type as Notification['type'],
    title: row.title as string,
    body: row.body as string,
    read: (row.read as number) === 1,
    proposal_id: (row.proposal_id as string) ?? null,
    created_at: row.created_at as number,
  };
}

function rowToTemplate(row: Record<string, unknown>): ProposalTemplate {
  return {
    id: row.id as string,
    title: row.title as string,
    type: row.type as ProposalType,
    description_template: row.description_template as string,
    is_default: (row.is_default as number) === 1,
    created_at: row.created_at as number,
  };
}

function rowToLinkedWallet(row: Record<string, unknown>): LinkedWallet {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    wallet_address: row.wallet_address as string,
    is_primary: (row.is_primary as number) === 1,
    created_at: row.created_at as number,
  };
}

// ════════════════════════════════════════════════════════════════════════
// User Operations
// ════════════════════════════════════════════════════════════════════════

/**
 * Create a new user from a wallet address.
 */
export async function createUser(walletAddress: string): Promise<User> {
  const db = getDatabase();
  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const addr = walletAddress.toLowerCase();

  await db.execute({
    sql: `INSERT INTO users (id, wallet_address, primary_wallet, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, addr, addr, now, now],
  });

  return {
    id,
    wallet_address: addr,
    display_name: null,
    primary_wallet: addr,
    privacy_flags: { showHolderRank: true, showBalance: false },
    created_at: now,
    updated_at: now,
  };
}

/**
 * Get a user by wallet address. Returns null if not found.
 */
export async function getUserByWallet(
  walletAddress: string
): Promise<User | null> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE wallet_address = ?',
    args: [walletAddress.toLowerCase()],
  });

  if (result.rows.length === 0) return null;
  return rowToUser(result.rows[0]);
}

/**
 * Update a user's display name.
 */
export async function updateUserDisplayName(
  userId: string,
  displayName: string
): Promise<User | null> {
  const db = getDatabase();
  const now = Math.floor(Date.now() / 1000);

  await db.execute({
    sql: 'UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?',
    args: [displayName, now, userId],
  });

  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [userId],
  });

  if (result.rows.length === 0) return null;
  return rowToUser(result.rows[0]);
}

/**
 * Link an additional wallet to a user.
 */
export async function linkWallet(
  userId: string,
  walletAddress: string,
  isPrimary: boolean = false
): Promise<LinkedWallet> {
  const db = getDatabase();
  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const addr = walletAddress.toLowerCase();

  // If setting as primary, unset the current primary
  if (isPrimary) {
    await db.execute({
      sql: 'UPDATE linked_wallets SET is_primary = 0 WHERE user_id = ? AND is_primary = 1',
      args: [userId],
    });
  }

  await db.execute({
    sql: `INSERT INTO linked_wallets (id, user_id, wallet_address, is_primary, created_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, wallet_address) DO UPDATE SET is_primary = excluded.is_primary`,
    args: [id, userId, addr, isPrimary ? 1 : 0, now],
  });

  return {
    id,
    user_id: userId,
    wallet_address: addr,
    is_primary: isPrimary,
    created_at: now,
  };
}

/**
 * Get all wallets linked to a user.
 */
export async function getUserWallets(userId: string): Promise<LinkedWallet[]> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'SELECT * FROM linked_wallets WHERE user_id = ? ORDER BY is_primary DESC, created_at ASC',
    args: [userId],
  });
  return result.rows.map(rowToLinkedWallet);
}

/**
 * Update a user's privacy flags (stored as JSON).
 */
export async function updateUserPrivacyFlags(
  userId: string,
  flags: PrivacyFlags
): Promise<void> {
  const db = getDatabase();
  const now = Math.floor(Date.now() / 1000);

  await db.execute({
    sql: 'UPDATE users SET privacy_flags = ?, updated_at = ? WHERE id = ?',
    args: [JSON.stringify(flags), now, userId],
  });
}

/**
 * Get all votes cast by a user (by wallet address).
 */
export async function getUserVotes(walletAddress: string): Promise<Vote[]> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'SELECT * FROM votes WHERE voter_address = ? ORDER BY created_at DESC',
    args: [walletAddress.toLowerCase()],
  });
  return result.rows.map(rowToVote);
}

// ════════════════════════════════════════════════════════════════════════
// Proposal Operations
// ════════════════════════════════════════════════════════════════════════

/**
 * Get a single proposal by ID.
 */
export async function getProposal(proposalId: string): Promise<Proposal | null> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'SELECT * FROM proposals WHERE id = ?',
    args: [proposalId],
  });

  if (result.rows.length === 0) return null;
  return rowToProposal(result.rows[0]);
}

/**
 * List proposals with filtering, sorting, and pagination.
 */
export async function listProposals(
  filter: ProposalsFilter = {},
  page: number = 1,
  limit: number = 20
): Promise<ProposalsResponse> {
  const db = getDatabase();

  const conditions: string[] = [];
  const args: (string | number | null)[] = [];

  // Status filter
  if (filter.status) {
    conditions.push('status = ?');
    args.push(filter.status);
  }

  // Type filter
  if (filter.type) {
    conditions.push('type = ?');
    args.push(filter.type);
  }

  // Author filter
  if (filter.author) {
    conditions.push('author_address = ?');
    args.push(filter.author.toLowerCase());
  }

  // Search filter
  if (filter.search) {
    conditions.push('(title LIKE ? OR description LIKE ?)');
    const term = `%${filter.search}%`;
    args.push(term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total matching
  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as total FROM proposals ${whereClause}`,
    args,
  });
  const total = (countResult.rows[0].total as number) || 0;

  // Sort
  const sortCol = filter.sort || 'created_at';
  const order = filter.order || 'desc';
  const allowedSorts = ['created_at', 'voting_ends_at', 'votes_for'];
  const sortColumn = allowedSorts.includes(sortCol) ? sortCol : 'created_at';

  const offset = (page - 1) * limit;

  const result = await db.execute({
    sql: `SELECT * FROM proposals ${whereClause} ORDER BY ${sortColumn} ${order} LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  return {
    proposals: result.rows.map(rowToProposal),
    total,
    page,
    limit,
  };
}

/**
 * Create a new proposal.
 */
export async function createProposal(
  payload: CreateProposalPayload,
  authorAddress: string
): Promise<Proposal> {
  const db = getDatabase();
  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const addr = authorAddress.toLowerCase();

  const metadata = payload.metadata || {};
  const votingEndsAt = payload.voting_ends_at ?? null;

  await db.execute({
    sql: `INSERT INTO proposals (
      id, title, description, type, status, author_address,
      created_at, updated_at, voting_ends_at, quorum_required,
      voting_multiplier, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      payload.title,
      payload.description,
      payload.type,
      'DRAFT',
      addr,
      now,
      now,
      votingEndsAt,
      payload.quorum_required ?? 0.20,
      payload.voting_multiplier ?? 1.0,
      JSON.stringify(metadata),
    ],
  });

  return {
    id,
    title: payload.title,
    description: payload.description,
    type: payload.type,
    status: 'DRAFT',
    author_address: addr,
    created_at: now,
    updated_at: now,
    voting_starts_at: null,
    voting_ends_at: votingEndsAt,
    quorum_required: payload.quorum_required ?? 0.20,
    votes_for: 0,
    votes_against: 0,
    votes_abstain: 0,
    vote_power_for: 0,
    vote_power_against: 0,
    vote_power_abstain: 0,
    metadata,
    voting_multiplier: payload.voting_multiplier ?? 1.0,
  };
}

/**
 * Update a proposal's status.
 */
export async function updateProposalStatus(
  proposalId: string,
  status: ProposalStatus
): Promise<Proposal | null> {
  const db = getDatabase();
  const now = Math.floor(Date.now() / 1000);

  await db.execute({
    sql: 'UPDATE proposals SET status = ?, updated_at = ? WHERE id = ?',
    args: [status, now, proposalId],
  });

  return getProposal(proposalId);
}

// ════════════════════════════════════════════════════════════════════════
// Vote Operations
// ════════════════════════════════════════════════════════════════════════

/**
 * Cast a vote on a proposal. Updates vote counts atomically.
 */
export async function castVote(
  proposalId: string,
  voterAddress: string,
  choice: VoteChoice,
  votingPower: number,
  delegatedFrom: string | null = null
): Promise<{ vote: Vote; proposal: Proposal }> {
  const db = getDatabase();
  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const addr = voterAddress.toLowerCase();

  await db.execute({
    sql: `INSERT INTO votes (id, proposal_id, voter_address, choice, voting_power, delegated_from, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(proposal_id, voter_address) DO UPDATE SET
            choice = excluded.choice,
            voting_power = excluded.voting_power,
            delegated_from = excluded.delegated_from,
            updated_at = excluded.updated_at`,
    args: [id, proposalId, addr, choice, votingPower, delegatedFrom, now, now],
  });

  // Recalculate proposal vote counts atomically
  const votes = await db.execute({
    sql: 'SELECT * FROM votes WHERE proposal_id = ?',
    args: [proposalId],
  });

  let votesFor = 0;
  let votesAgainst = 0;
  let votesAbstain = 0;
  let votePowerFor = 0;
  let votePowerAgainst = 0;
  let votePowerAbstain = 0;

  for (const v of votes.rows) {
    const c = v.choice as VoteChoice;
    const vp = v.voting_power as number;
    if (c === 'FOR') { votesFor++; votePowerFor += vp; }
    else if (c === 'AGAINST') { votesAgainst++; votePowerAgainst += vp; }
    else { votesAbstain++; votePowerAbstain += vp; }
  }

  await db.execute({
    sql: `UPDATE proposals SET
      votes_for = ?, votes_against = ?, votes_abstain = ?,
      vote_power_for = ?, vote_power_against = ?, vote_power_abstain = ?,
      updated_at = ?
    WHERE id = ?`,
    args: [votesFor, votesAgainst, votesAbstain, votePowerFor, votePowerAgainst, votePowerAbstain, now, proposalId],
  });

  const proposal = (await getProposal(proposalId))!;

  return {
    vote: {
      id,
      proposal_id: proposalId,
      voter_address: addr,
      choice,
      voting_power: votingPower,
      delegated_from: delegatedFrom,
      created_at: now,
      updated_at: now,
    },
    proposal,
  };
}

/**
 * Update an existing vote (change choice).
 */
export async function updateVote(
  proposalId: string,
  voterAddress: string,
  newChoice: VoteChoice,
  newVotingPower?: number
): Promise<{ vote: Vote; proposal: Proposal } | null> {
  const db = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  const addr = voterAddress.toLowerCase();

  const existing = await db.execute({
    sql: 'SELECT id FROM votes WHERE proposal_id = ? AND voter_address = ?',
    args: [proposalId, addr],
  });

  if (existing.rows.length === 0) return null;

  await db.execute({
    sql: 'UPDATE votes SET choice = ?, voting_power = COALESCE(?, voting_power), updated_at = ? WHERE proposal_id = ? AND voter_address = ?',
    args: [newChoice, newVotingPower ?? null, now, proposalId, addr],
  });

  // Recalculate proposal vote counts
  const votes = await db.execute({
    sql: 'SELECT * FROM votes WHERE proposal_id = ?',
    args: [proposalId],
  });

  let votesFor = 0;
  let votesAgainst = 0;
  let votesAbstain = 0;
  let votePowerFor = 0;
  let votePowerAgainst = 0;
  let votePowerAbstain = 0;

  for (const v of votes.rows) {
    const c = v.choice as VoteChoice;
    const vp = v.voting_power as number;
    if (c === 'FOR') { votesFor++; votePowerFor += vp; }
    else if (c === 'AGAINST') { votesAgainst++; votePowerAgainst += vp; }
    else { votesAbstain++; votePowerAbstain += vp; }
  }

  await db.execute({
    sql: `UPDATE proposals SET
      votes_for = ?, votes_against = ?, votes_abstain = ?,
      vote_power_for = ?, vote_power_against = ?, vote_power_abstain = ?,
      updated_at = ?
    WHERE id = ?`,
    args: [votesFor, votesAgainst, votesAbstain, votePowerFor, votePowerAgainst, votePowerAbstain, now, proposalId],
  });

  const proposal = (await getProposal(proposalId))!;
  const voteRow = await db.execute({
    sql: 'SELECT * FROM votes WHERE proposal_id = ? AND voter_address = ?',
    args: [proposalId, addr],
  });

  return {
    vote: rowToVote(voteRow.rows[0]),
    proposal,
  };
}

/**
 * Get a user's vote on a specific proposal.
 */
export async function getVoteByUser(
  proposalId: string,
  voterAddress: string
): Promise<Vote | null> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'SELECT * FROM votes WHERE proposal_id = ? AND voter_address = ?',
    args: [proposalId, voterAddress.toLowerCase()],
  });

  if (result.rows.length === 0) return null;
  return rowToVote(result.rows[0]);
}

/**
 * Get all votes for a proposal.
 */
export async function getProposalVotes(proposalId: string): Promise<Vote[]> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'SELECT * FROM votes WHERE proposal_id = ? ORDER BY created_at DESC',
    args: [proposalId],
  });
  return result.rows.map(rowToVote);
}

// ════════════════════════════════════════════════════════════════════════
// Comment Operations
// ════════════════════════════════════════════════════════════════════════

/**
 * Create a comment on a proposal (optionally as a reply to another comment).
 */
export async function createComment(
  proposalId: string,
  authorAddress: string,
  content: string,
  parentId: string | null = null
): Promise<Comment> {
  const db = getDatabase();
  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const addr = authorAddress.toLowerCase();

  await db.execute({
    sql: `INSERT INTO comments (id, proposal_id, author_address, content, parent_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, proposalId, addr, content, parentId, now, now],
  });

  return {
    id,
    proposal_id: proposalId,
    author_address: addr,
    content,
    parent_id: parentId,
    deleted_at: null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Get all visible comments for a proposal, threaded by parent_id.
 */
export async function getProposalComments(
  proposalId: string
): Promise<Comment[]> {
  const db = getDatabase();
  const result = await db.execute({
    sql: `SELECT * FROM comments
          WHERE proposal_id = ? AND deleted_at IS NULL
          ORDER BY created_at ASC`,
    args: [proposalId],
  });
  return result.rows.map(rowToComment);
}

/**
 * Soft-delete a comment (marks it as deleted without removing the record).
 */
export async function softDeleteComment(commentId: string): Promise<boolean> {
  const db = getDatabase();
  const now = Math.floor(Date.now() / 1000);

  const result = await db.execute({
    sql: 'UPDATE comments SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    args: [now, now, commentId],
  });

  return result.rowsAffected > 0;
}

// ════════════════════════════════════════════════════════════════════════
// Notification Operations
// ════════════════════════════════════════════════════════════════════════

/**
 * Create a notification for a user.
 */
export async function createNotification(
  userId: string,
  type: Notification['type'],
  title: string,
  body: string,
  proposalId: string | null = null
): Promise<Notification> {
  const db = getDatabase();
  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db.execute({
    sql: `INSERT INTO notifications (id, user_id, type, title, body, read, proposal_id, created_at)
          VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    args: [id, userId, type, title, body, proposalId, now],
  });

  return {
    id,
    user_id: userId,
    type,
    title,
    body,
    read: false,
    proposal_id: proposalId,
    created_at: now,
  };
}

/**
 * Get all notifications for a user, newest first.
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 50
): Promise<Notification[]> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    args: [userId, limit],
  });
  return result.rows.map(rowToNotification);
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(
  notificationId: string
): Promise<boolean> {
  const db = getDatabase();

  const result = await db.execute({
    sql: 'UPDATE notifications SET read = 1 WHERE id = ? AND read = 0',
    args: [notificationId],
  });

  return result.rowsAffected > 0;
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllNotificationsRead(
  userId: string
): Promise<number> {
  const db = getDatabase();

  const result = await db.execute({
    sql: 'UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0',
    args: [userId],
  });

  return result.rowsAffected;
}

// ════════════════════════════════════════════════════════════════════════
// Template Operations
// ════════════════════════════════════════════════════════════════════════

/**
 * Get all proposal templates.
 */
export async function getProposalTemplates(): Promise<ProposalTemplate[]> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'SELECT * FROM proposal_templates ORDER BY created_at ASC',
    args: [],
  });
  return result.rows.map(rowToTemplate);
}

/**
 * Get a single template by ID.
 */
export async function getProposalTemplate(
  templateId: string
): Promise<ProposalTemplate | null> {
  const db = getDatabase();
  const result = await db.execute({
    sql: 'SELECT * FROM proposal_templates WHERE id = ?',
    args: [templateId],
  });

  if (result.rows.length === 0) return null;
  return rowToTemplate(result.rows[0]);
}

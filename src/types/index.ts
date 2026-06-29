// ══════════════════════════════════════════════════════════════════════════
// OMNOM DAO — Core TypeScript Types
// ══════════════════════════════════════════════════════════════════════════

// ── Enums ──────────────────────────────────────────────────────────────

export type ProposalType =
  | 'CHAIN_SELECTION'
  | 'TREASURY'
  | 'TOKENOMICS'
  | 'COMMUNITY_GUIDELINE'
  | 'TECHNICAL_SPEC'
  | 'GENERAL';

export type ProposalStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'CLOSED'
  | 'PASSED'
  | 'FAILED'
  | 'EXPIRED';

export type VoteChoice = 'FOR' | 'AGAINST' | 'ABSTAIN';

export type NotificationType =
  | 'PROPOSAL_CREATED'
  | 'VOTE_CAST'
  | 'PROPOSAL_CLOSED'
  | 'COMMENT_REPLY'
  | 'DELEGATION_RECEIVED';

export type HolderClass = 'WHALE' | 'DOLPHIN' | 'FISH';

// ── Core Entities ───────────────────────────────────────────────────────

export interface Holder {
  address?: string;
  rank: number;
  balance: string;
  percentage: number;
  class: HolderClass;
}

export interface User {
  id: string;
  wallet_address: string;
  display_name: string | null;
  primary_wallet: string | null;
  privacy_flags: PrivacyFlags;
  created_at: number;
  updated_at: number;
  // Session fields (used by useAuth hook)
  authenticated?: boolean;
  address?: string;
  verified?: boolean;
  holder?: Holder;
}

export interface PrivacyFlags {
  showHolderRank: boolean;
  showBalance: boolean;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  type: ProposalType;
  status: ProposalStatus;
  author_address: string;
  created_at: number;
  updated_at: number;
  voting_starts_at: number | null;
  voting_ends_at: number | null;
  quorum_required: number;
  votes_for: number;
  votes_against: number;
  votes_abstain: number;
  vote_power_for: number;
  vote_power_against: number;
  vote_power_abstain: number;
  metadata: Record<string, unknown>;
  voting_multiplier: number;
}

export interface Vote {
  id: string;
  proposal_id: string;
  voter_address: string;
  choice: VoteChoice;
  voting_power: number;
  delegated_from: string | null;
  created_at: number;
  updated_at: number;
}

export interface Comment {
  id: string;
  proposal_id: string;
  author_address: string;
  content: string;
  parent_id: string | null;
  deleted_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  proposal_id: string | null;
  created_at: number;
}

export interface ProposalTemplate {
  id: string;
  title: string;
  type: ProposalType;
  description_template: string;
  is_default: boolean;
  created_at: number;
}

export interface LinkedWallet {
  id: string;
  user_id: string;
  wallet_address: string;
  is_primary: boolean;
  created_at: number;
}

// ── API Payloads & Responses ───────────────────────────────────────────

export interface ProposalsResponse {
  proposals: Proposal[];
  total: number;
  page: number;
  limit: number;
}

export interface ProposalsFilter {
  status?: ProposalStatus;
  type?: ProposalType;
  author?: string;
  search?: string;
  sort?: 'created_at' | 'voting_ends_at' | 'votes_for';
  order?: 'asc' | 'desc';
}

export interface CreateProposalPayload {
  title: string;
  description: string;
  type: ProposalType;
  voting_ends_at?: number;
  quorum_required?: number;
  voting_multiplier?: number;
  metadata?: Record<string, unknown>;
}

export interface VotePayload {
  choice: VoteChoice;
}

export interface CreateCommentPayload {
  content: string;
  parent_id?: string;
}

// ── Auth ───────────────────────────────────────────────────────────────

export interface AuthUser {
  authenticated: boolean;
  address: string;
  verified: boolean;
  holder?: {
    rank: number;
    balance: string;
    class: HolderClass;
    percentage: number;
  };
}

export interface SessionUser {
  address: string;
  holder: boolean;
  holderClass: HolderClass | null;
  balance: string | null;
  rank: number | null;
  votingPower: number;
  delegatedFrom: string | null;
  delegatedTo: string | null;
}

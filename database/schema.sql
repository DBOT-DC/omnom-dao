-- ══════════════════════════════════════════════════════════════════════════
-- OMNOM DAO Governance Database Schema
-- Turso / libSQL compatible
-- ══════════════════════════════════════════════════════════════════════════

-- Users who connect their wallet
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  wallet_address  TEXT UNIQUE NOT NULL,
  display_name    TEXT,
  primary_wallet  TEXT,
  privacy_flags   TEXT DEFAULT '{}',          -- JSON: { showHolderRank: bool, showBalance: bool }
  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Governance proposals
CREATE TABLE IF NOT EXISTS proposals (
  id               TEXT PRIMARY KEY,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  type             TEXT NOT NULL DEFAULT 'GENERAL'
                   CHECK(type IN ('CHAIN_SELECTION','TREASURY','TOKENOMICS','COMMUNITY_GUIDELINE','TECHNICAL_SPEC','GENERAL')),
  status           TEXT NOT NULL DEFAULT 'DRAFT'
                   CHECK(status IN ('DRAFT','PENDING_REVIEW','ACTIVE','CLOSED','PASSED','FAILED','EXPIRED')),
  author_address   TEXT NOT NULL,
  created_at       INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at       INTEGER NOT NULL DEFAULT (unixepoch()),
  voting_starts_at INTEGER,
  voting_ends_at   INTEGER,
  quorum_required  REAL NOT NULL DEFAULT 0.20,       -- 20% of supply
  votes_for        INTEGER NOT NULL DEFAULT 0,
  votes_against    INTEGER NOT NULL DEFAULT 0,
  votes_abstain    INTEGER NOT NULL DEFAULT 0,
  vote_power_for     REAL NOT NULL DEFAULT 0,
  vote_power_against REAL NOT NULL DEFAULT 0,
  vote_power_abstain REAL NOT NULL DEFAULT 0,
  metadata         TEXT DEFAULT '{}',               -- JSON: arbitrary metadata
  voting_multiplier REAL NOT NULL DEFAULT 1.0
);

-- Individual votes on proposals
CREATE TABLE IF NOT EXISTS votes (
  id              TEXT PRIMARY KEY,
  proposal_id     TEXT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  voter_address   TEXT NOT NULL,
  choice          TEXT NOT NULL CHECK(choice IN ('FOR','AGAINST','ABSTAIN')),
  voting_power    REAL NOT NULL DEFAULT 0,
  delegated_from  TEXT,                             -- nullable: address of delegator
  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(proposal_id, voter_address)
);

-- Comments / discussion on proposals (threaded)
CREATE TABLE IF NOT EXISTS comments (
  id              TEXT PRIMARY KEY,
  proposal_id     TEXT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  author_address  TEXT NOT NULL,
  content         TEXT NOT NULL,
  parent_id       TEXT REFERENCES comments(id) ON DELETE CASCADE,  -- self-referencing for threads
  deleted_at      INTEGER,                         -- null = visible, timestamp = soft-deleted
  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch())
);

-- User notifications
CREATE TABLE IF NOT EXISTS notifications (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  type         TEXT NOT NULL
               CHECK(type IN ('PROPOSAL_CREATED','VOTE_CAST','PROPOSAL_CLOSED','COMMENT_REPLY','DELEGATION_RECEIVED')),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL DEFAULT '',
  read         INTEGER NOT NULL DEFAULT 0,          -- 0 = unread, 1 = read
  proposal_id  TEXT,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Proposal templates for guided creation
CREATE TABLE IF NOT EXISTS proposal_templates (
  id                  TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  type                TEXT NOT NULL
                       CHECK(type IN ('CHAIN_SELECTION','TREASURY','TOKENOMICS','COMMUNITY_GUIDELINE','TECHNICAL_SPEC','GENERAL')),
  description_template TEXT NOT NULL DEFAULT '',
  is_default          INTEGER NOT NULL DEFAULT 0,
  created_at          INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Linked wallets (multi-wallet support)
CREATE TABLE IF NOT EXISTS linked_wallets (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  wallet_address  TEXT NOT NULL,
  is_primary      INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(user_id, wallet_address)
);

-- ══════════════════════════════════════════════════════════════════════════
-- Indexes for common query patterns
-- ══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_users_wallet     ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_author ON proposals(author_address);
CREATE INDEX IF NOT EXISTS idx_proposals_type   ON proposals(type);
CREATE INDEX IF NOT EXISTS idx_proposals_created ON proposals(created_at);
CREATE INDEX IF NOT EXISTS idx_votes_proposal   ON votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter      ON votes(voter_address);
CREATE INDEX IF NOT EXISTS idx_comments_proposal ON comments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent  ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_author  ON comments(author_address);
CREATE INDEX IF NOT EXISTS idx_notifications_user      ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_linked_wallets_user    ON linked_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_wallets_address ON linked_wallets(wallet_address);

-- ══════════════════════════════════════════════════════════════════════════
-- Seed proposal templates (idempotent via INSERT OR IGNORE)
-- ══════════════════════════════════════════════════════════════════════════

INSERT OR IGNORE INTO proposal_templates (id, title, type, description_template, is_default, created_at) VALUES
('chain-selection', 'Chain Selection', 'CHAIN_SELECTION',
'Describe the blockchain you are proposing $OMNOM migrate to.\n\nInclude:\n- Chain name and network ID\n- Reason for selection (security, speed, cost, ecosystem)\n- Migration plan and timeline\n- Risk assessment',
1, unixepoch()),

('treasury-allocation', 'Treasury Allocation', 'TREASURY',
'Describe how treasury funds should be allocated.\n\nInclude:\n- Amount requested (in $OMNOM or USD equivalent)\n- Purpose and expected impact\n- Recipient address or team\n- Milestones and deliverables\n- Accountability measures',
1, unixepoch()),

('tokenomics-change', 'Tokenomics Change', 'TOKENOMICS',
'Describe the proposed change to $OMNOM tokenomics.\n\nInclude:\n- Current mechanism being changed\n- Proposed new mechanism\n- Rationale and expected benefits\n- Impact on holders (dilution, yield, etc.)\n- Implementation timeline',
1, unixepoch()),

('community-guideline', 'Community Guideline', 'COMMUNITY_GUIDELINE',
'Describe the proposed community guideline or rule.\n\nInclude:\n- Guideline title and scope\n- Full text of the proposed guideline\n- Rationale for the guideline\n- Enforcement mechanism\n- Examples of acceptable/unacceptable behavior',
1, unixepoch()),

('technical-spec', 'Technical Specification', 'TECHNICAL_SPEC',
'Describe the proposed technical change or specification.\n\nInclude:\n- Technical overview\n- Architecture or design changes\n- Smart contract modifications (if any)\n- Security considerations\n- Testing plan',
1, unixepoch()),

('general-discussion', 'General Discussion', 'GENERAL',
'Open discussion topic for the OMNOM DAO community.\n\nInclude:\n- Topic summary\n- Background context\n- Questions or points for discussion\n- Any relevant links or references',
1, unixepoch());

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Wallet,
  ArrowRight,
  ShieldCheck,
  Clock,
  Trophy,
  TrendingUp,
  Percent as PercentIcon,
  FileText,
  Vote as VoteIcon,
} from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAuth } from '@/hooks/useAuth';
import { formatRelativeTime, truncateAddress } from '@/lib/format';
import { StatCard } from '@/components/ui/StatCard';
import { HolderBadge } from '@/components/ui/HolderBadge';
import { ProposalStatusBadge } from '@/components/ui/ProposalStatusBadge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import type { Vote as VoteType, Proposal, VoteChoice } from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────

function voteChoiceStyle(choice: VoteChoice) {
  switch (choice) {
    case 'FOR':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'AGAINST':
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    case 'ABSTAIN':
      return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  }
}

// ── Stagger animation wrapper ──────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

// ── Dashboard Page ────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, loading, error } = useAuth();
  const router = useRouter();
  const [votes, setVotes] = useState<VoteType[]>([]);
  const [voteProposals, setVoteProposals] = useState<Map<string, Proposal>>(new Map());
  const [votesLoading, setVotesLoading] = useState(false);

  const userData = user as any;
  const isAuthenticated = userData?.authenticated;
  const isHolder = isAuthenticated && userData?.holder;

  // Fetch user's voting history
  useEffect(() => {
    if (!isAuthenticated || !userData?.address) return;

    const fetchVotes = async () => {
      setVotesLoading(true);
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const profileData = await res.json();
          const userData = profileData.user || profileData;
          setVotes(userData.votes || []);
          // Fetch proposals for each voted item
          const proposalIds = [...new Set((userData.votes || []).map((v: VoteType) => v.proposal_id))] as string[];
          const proposalMap = new Map<string, Proposal>();
          await Promise.all(
            proposalIds.slice(0, 10).map(async (id) => {
              try {
                const pRes = await fetch(`/api/proposals/${id}`);
                if (pRes.ok) {
                  const p = await pRes.json();
                  proposalMap.set(id, p.proposal || p);
                }
              } catch {
                // skip
              }
            })
          );
          setVoteProposals(proposalMap);
        }
      } catch {
        // skip
      } finally {
        setVotesLoading(false);
      }
    };
    fetchVotes();
  }, [isAuthenticated, userData?.address]);

  // ── Unauthenticated state ──
  if (!loading && !isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center rounded-2xl border border-omnom-gold/10 bg-omnom-surface/60 p-8 sm:p-10"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-omnom-gold/20 to-omnom-purple/20 ring-1 ring-omnom-gold/10 text-omnom-gold"
          >
            <Wallet className="h-8 w-8" />
          </motion.div>

          <h1 className="text-2xl font-bold text-omnom-text mb-3">Connect Your Wallet</h1>
          <p className="text-omnom-muted mb-8 leading-relaxed">
            Connect your Web3 wallet to access your personal dashboard, view your voting power, and track your governance activity.
          </p>

          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={openConnectModal}
                className="inline-flex items-center gap-2 rounded-full bg-omnom-gold px-8 py-3 text-sm font-bold text-omnom-dark hover:bg-omnom-gold/90 transition-colors glow-gold"
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </motion.button>
            )}
          </ConnectButton.Custom>
        </motion.div>
      </div>
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <LoadingSkeleton variant="stat" count={4} />
        <div className="mt-8">
          <LoadingSkeleton variant="list" count={5} />
        </div>
      </div>
    );
  }

  // ── Non-holder state ──
  if (!isHolder) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center rounded-2xl border border-omnom-gold/10 bg-omnom-surface/60 p-8 sm:p-10"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-omnom-purple/20 to-omnom-gold/20 ring-1 ring-omnom-purple/10 text-omnom-purple"
          >
            <ShieldCheck className="h-8 w-8" />
          </motion.div>

          <h2 className="text-2xl font-bold text-omnom-text mb-3">Not a Verified Holder</h2>
          <p className="text-omnom-muted mb-8 leading-relaxed">
            Your wallet is connected but hasn't been verified as a $OMNOM holder yet. Verify your holdings to unlock your dashboard and voting power.
          </p>

          <Link href="/verify">
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-full bg-omnom-gold px-8 py-3 text-sm font-bold text-omnom-dark hover:bg-omnom-gold/90 transition-colors glow-gold"
            >
              <ShieldCheck className="h-4 w-4" />
              Verify Holdings
            </motion.div>
          </Link>
        </motion.div>
      </div>
    );
  }

  const holder = userData.holder;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12"
    >
      {/* ── Profile Card ─────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="rounded-2xl border border-omnom-gold/10 bg-omnom-surface/60 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Avatar */}
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-omnom-gold/20 to-omnom-purple/20 ring-1 ring-omnom-gold/10 font-mono text-2xl font-bold text-omnom-gold">
              {userData.address ? userData.address.slice(2, 4).toUpperCase() : '??'}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-omnom-text">
                  {userData.address ? truncateAddress(userData.address) : 'Wallet'}
                </h1>
                {holder?.class && (
                  <HolderBadge holderClass={holder.class} rank={holder.rank} size="md" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-omnom-muted">
                {userData.address && (
                  <span className="font-mono text-xs">
                    {userData.address}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Member since {userData.created_at ? new Date(userData.created_at * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'}
                </span>
              </div>
            </div>

            <Link href="/settings">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="text-sm text-omnom-muted hover:text-omnom-gold transition-colors px-3 py-2 rounded-lg hover:bg-omnom-surface"
              >
                Settings →
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Row ────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Balance"
            value={holder?.balance || '0'}
            icon={<Trophy className="h-5 w-5" />}
          />
          <StatCard
            label="Rank"
            value={`#${holder?.rank || '—'}`}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <StatCard
            label="Voting Power (QTV)"
            value={holder?.balance || '0'}
            icon={<VoteIcon className="h-5 w-5" />}
          />
          <StatCard
            label="Voting Power %"
            value={holder?.percentage ? `${holder.percentage}%` : '0%'}
            icon={<PercentIcon className="h-5 w-5" />}
          />
        </div>
      </motion.div>

      {/* ── Quick Actions ────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="mb-8 flex flex-wrap gap-3">
        <Link href="/proposals?status=ACTIVE">
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 rounded-xl bg-omnom-gold px-5 py-2.5 text-sm font-semibold text-omnom-dark hover:bg-omnom-gold/90 transition-colors glow-gold"
          >
            <FileText className="h-4 w-4" />
            Browse Active Proposals
            <ArrowRight className="h-4 w-4" />
          </motion.div>
        </Link>

        <Link href="/proposals/create">
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 rounded-xl border border-omnom-gold/30 bg-omnom-surface/60 px-5 py-2.5 text-sm font-semibold text-omnom-gold hover:bg-omnom-gold/10 transition-all"
          >
            <VoteIcon className="h-4 w-4" />
            Create Proposal
          </motion.div>
        </Link>
      </motion.div>

      {/* ── Voting History ────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="rounded-2xl border border-omnom-gold/10 bg-omnom-surface/40 p-6">
          <h2 className="text-lg font-semibold text-omnom-text mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-omnom-gold" />
            Voting History
          </h2>

          {votesLoading ? (
            <LoadingSkeleton variant="list" count={3} />
          ) : votes.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-omnom-muted text-sm">You haven&apos;t voted on any proposals yet.</p>
              <Link href="/proposals" className="mt-3 inline-block text-sm text-omnom-gold hover:underline">
                Browse active proposals →
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {votes.map((vote: VoteType) => {
                const proposal = voteProposals.get(vote.proposal_id);
                return (
                  <motion.div
                    key={vote.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 rounded-xl p-3 hover:bg-omnom-surface/60 transition-colors group"
                  >
                    <Link
                      href={`/proposals/${vote.proposal_id}`}
                      className="flex-1 min-w-0 flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-omnom-text group-hover:text-omnom-gold transition-colors truncate">
                          {proposal?.title || `Proposal ${vote.proposal_id.slice(0, 8)}...`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {proposal && <ProposalStatusBadge status={proposal.status} />}
                          <span className="text-xs text-omnom-muted font-mono">
                            {formatRelativeTime(vote.created_at)}
                          </span>
                        </div>
                      </div>
                    </Link>

                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${voteChoiceStyle(vote.choice)}`}>
                      {vote.choice}
                    </span>

                    <span className="text-xs text-omnom-muted font-mono hidden sm:block">
                      {vote.voting_power} QTV
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

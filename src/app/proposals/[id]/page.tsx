'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  Target,
  Users,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Share2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { formatRelativeTime, formatFullDate, formatCountdown, truncateAddress } from '@/lib/format';
import { ProposalStatusBadge } from '@/components/ui/ProposalStatusBadge';
import { ProposalTypeBadge } from '@/components/ui/ProposalTypeBadge';
import { VoteBar } from '@/components/ui/VoteBar';
import { CommentItem } from '@/components/ui/CommentItem';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Proposal, Vote, Comment, VoteChoice } from '@/types';

// ── Countdown timer hook ──────────────────────────────────────────────
function useCountdown(target: number): string {
  const [text, setText] = useState(formatCountdown(target));

  useEffect(() => {
    if (target <= Date.now()) return;
    const interval = setInterval(() => {
      setText(formatCountdown(target));
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  return text;
}

// ── Vote button config ─────────────────────────────────────────────────
function getVoteButtonStyle(choice: VoteChoice, selected: boolean) {
  switch (choice) {
    case 'FOR':
      return selected
        ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
        : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10';
    case 'AGAINST':
      return selected
        ? 'bg-red-500 text-white border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
        : 'border-red-500/30 text-red-400 hover:bg-red-500/10';
    case 'ABSTAIN':
      return selected
        ? 'bg-slate-500 text-white border-slate-500'
        : 'border-slate-500/30 text-slate-400 hover:bg-slate-500/10';
  }
}

// ── Proposal Detail Page ──────────────────────────────────────────────
export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const userData = user as any;
  const proposalId = params.id as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [userVote, setUserVote] = useState<VoteChoice | null>(null);
  const [voting, setVoting] = useState(false);
  const [voted, setVoted] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showVoters, setShowVoters] = useState(false);
  const [voters, setVoters] = useState<Vote[]>([]);
  const [votersLoading, setVotersLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isAuthenticated = userData?.authenticated;
  const countdown = proposal?.voting_ends_at ? useCountdown(proposal.voting_ends_at) : '';

  // Fetch proposal
  useEffect(() => {
    const fetchProposal = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/proposals/${proposalId}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch proposal');
        const data = await res.json();
        setProposal(data.proposal);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProposal();
  }, [proposalId]);

  // Fetch comments
  useEffect(() => {
    if (!proposalId) return;
    const fetchComments = async () => {
      setCommentsLoading(true);
      try {
        const res = await fetch(`/api/proposals/${proposalId}/comments?limit=50`);
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || data || []);
        }
      } catch {
        // skip
      } finally {
        setCommentsLoading(false);
      }
    };
    fetchComments();
  }, [proposalId]);

  // Fetch voters
  const handleToggleVoters = useCallback(async () => {
    if (showVoters) {
      setShowVoters(false);
      return;
    }
    setShowVoters(true);
    setVotersLoading(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/vote`);
      if (res.ok) {
        const data = await res.json();
        setVoters(data.votes || data || []);
      }
    } catch {
      // skip
    } finally {
      setVotersLoading(false);
    }
  }, [showVoters, proposalId]);

  // Cast vote
  const handleVote = useCallback(
    async (choice: VoteChoice) => {
      if (!isAuthenticated) return;
      setVoting(true);
      try {
        const res = await fetch(`/api/proposals/${proposalId}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ choice }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to vote');
        }
        setUserVote(choice);
        setVoted(true);

        // Re-fetch proposal to update counts
        const pRes = await fetch(`/api/proposals/${proposalId}`);
        if (pRes.ok) {
          const updated = await pRes.json();
          setProposal(updated.proposal);
        }
      } catch (err) {
        // Could show toast
      } finally {
        setVoting(false);
      }
    },
    [isAuthenticated, proposalId]
  );

  // Submit comment
  const handleSubmitComment = useCallback(async () => {
    if (!isAuthenticated || !commentInput.trim()) return;
    try {
      const body: { content: string; parent_id?: string } = {
        content: commentInput.trim(),
      };
      if (replyingTo) body.parent_id = replyingTo;

      const res = await fetch(`/api/proposals/${proposalId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [newComment, ...prev]);
        setCommentInput('');
        setReplyingTo(null);
      }
    } catch {
      // skip
    }
  }, [isAuthenticated, commentInput, replyingTo, proposalId]);

  // Copy link
  const handleCopyLink = useCallback(() => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        <LoadingSkeleton variant="detail" />
      </div>
    );
  }

  // ── Not found ──
  if (notFound || !proposal) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-16 w-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-omnom-text mb-3">Proposal Not Found</h2>
          <p className="text-omnom-muted mb-6">
            This proposal doesn&apos;t exist or may have been removed.
          </p>
          <Button onClick={() => router.push('/proposals')} variant="gold" className="rounded-full px-8">
            Browse Proposals
          </Button>
        </div>
      </div>
    );
  }

  // ── Computed values ──
  const totalVotes = proposal.votes_for + proposal.votes_against + proposal.votes_abstain;
  const totalPower = proposal.vote_power_for + proposal.vote_power_against + proposal.vote_power_abstain;
  const forPct = totalPower > 0 ? (proposal.vote_power_for / totalPower) * 100 : 0;
  const againstPct = totalPower > 0 ? (proposal.vote_power_against / totalPower) * 100 : 0;
  const abstainPct = totalPower > 0 ? (proposal.vote_power_abstain / totalPower) * 100 : 0;
  const isActive = proposal.status === 'ACTIVE';

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      {/* ── Back navigation ────────────────────────────────────── */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-omnom-muted hover:text-omnom-text transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ProposalStatusBadge status={proposal.status} />
            <ProposalTypeBadge type={proposal.type} />
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-omnom-text leading-tight mb-3">
            {proposal.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-omnom-muted">
            <span className="font-mono">
              by{' '}
              <span className="text-omnom-gold">
                {truncateAddress(proposal.author_address)}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatRelativeTime(proposal.created_at)}
            </span>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 hover:text-omnom-gold transition-colors"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Share'}
            </button>
          </div>
        </div>

        {/* ── Voting Section (if ACTIVE) ──────────────────────── */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8 rounded-2xl border border-omnom-gold/10 bg-omnom-surface/60 p-6"
          >
            {/* Vote buttons */}
            {!userVote && !voted && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleVote('FOR')}
                  disabled={voting || !isAuthenticated}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all text-sm font-semibold',
                    'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10',
                    'disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                >
                  <ThumbsUp className="h-6 w-6" />
                  For
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleVote('AGAINST')}
                  disabled={voting || !isAuthenticated}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all text-sm font-semibold',
                    'border-red-500/30 text-red-400 hover:bg-red-500/10',
                    'disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                >
                  <ThumbsDown className="h-6 w-6" />
                  Against
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleVote('ABSTAIN')}
                  disabled={voting || !isAuthenticated}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all text-sm font-semibold',
                    'border-slate-500/30 text-slate-400 hover:bg-slate-500/10',
                    'disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                >
                  <MinusCircle className="h-6 w-6" />
                  Abstain
                </motion.button>
              </div>
            )}

            {/* Already voted indicator */}
            {userVote && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 flex items-center gap-2 rounded-xl bg-omnom-dark/50 p-3 border border-omnom-gold/10"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span className="text-sm text-omnom-text">
                  You voted <span className={cn('font-semibold',
                    userVote === 'FOR' ? 'text-emerald-400' : userVote === 'AGAINST' ? 'text-red-400' : 'text-slate-400'
                  )}>{userVote}</span>
                </span>
              </motion.div>
            )}

            {/* Loading vote */}
            {voting && (
              <div className="mb-6 flex items-center justify-center gap-2 text-sm text-omnom-muted">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-omnom-gold/30 border-t-omnom-gold" />
                Casting vote...
              </div>
            )}

            {/* Vote bar */}
            <div className="mb-4">
              <VoteBar
                forPercent={forPct}
                againstPercent={againstPct}
                abstainPercent={abstainPct}
                totalVotes={totalVotes}
                quorumRequired={proposal.quorum_required}
                showLabels={true}
                size="md"
              />
            </div>

            {/* Vote counts */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-emerald-400">{proposal.votes_for}</p>
                <p className="text-xs text-omnom-muted">For</p>
              </div>
              <div>
                <p className="text-xl font-bold text-red-400">{proposal.votes_against}</p>
                <p className="text-xs text-omnom-muted">Against</p>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-400">{proposal.votes_abstain}</p>
                <p className="text-xs text-omnom-muted">Abstain</p>
              </div>
            </div>

            {/* Countdown timer */}
            {proposal.voting_ends_at && (
              <div className="mt-4 pt-4 border-t border-omnom-gold/10 flex items-center justify-center gap-2">
                <Clock className="h-4 w-4 text-omnom-gold" />
                <span className="text-sm font-medium text-omnom-gold">{countdown} remaining</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Non-active vote summary */}
        {!isActive && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-2xl border border-omnom-gold/10 bg-omnom-surface/60 p-6"
          >
            <div className="mb-4">
              <VoteBar
                forPercent={forPct}
                againstPercent={againstPct}
                abstainPercent={abstainPct}
                totalVotes={totalVotes}
                quorumRequired={proposal.quorum_required}
                showLabels={true}
                size="md"
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-emerald-400">{proposal.votes_for}</p>
                <p className="text-xs text-omnom-muted">For ({proposal.vote_power_for} QTV)</p>
              </div>
              <div>
                <p className="text-xl font-bold text-red-400">{proposal.votes_against}</p>
                <p className="text-xs text-omnom-muted">Against ({proposal.vote_power_against} QTV)</p>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-400">{proposal.votes_abstain}</p>
                <p className="text-xs text-omnom-muted">Abstain ({proposal.vote_power_abstain} QTV)</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Content ──────────────────────────────────────────── */}
        <div className="mb-8 rounded-2xl border border-omnom-gold/10 bg-omnom-surface/40 p-6 sm:p-8">
          <div className="prose prose-invert prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-omnom-text text-sm leading-relaxed">
              {proposal.description}
            </div>
          </div>
        </div>

        {/* ── Metadata ────────────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Voting period */}
          <div className="rounded-xl border border-omnom-gold/10 bg-omnom-surface/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-omnom-gold" />
              <p className="text-xs text-omnom-muted uppercase tracking-wider">Voting Period</p>
            </div>
            {proposal.voting_starts_at && (
              <p className="text-xs text-omnom-text font-mono">
                {formatFullDate(proposal.voting_starts_at)}
              </p>
            )}
            {proposal.voting_ends_at && (
              <p className="text-xs text-omnom-text font-mono mt-1">
                → {formatFullDate(proposal.voting_ends_at)}
              </p>
            )}
            {isActive && proposal.voting_ends_at && (
              <p className="text-xs text-omnom-gold font-semibold mt-2">{countdown} remaining</p>
            )}
          </div>

          {/* Quorum */}
          <div className="rounded-xl border border-omnom-gold/10 bg-omnom-surface/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-omnom-purple" />
              <p className="text-xs text-omnom-muted uppercase tracking-wider">Quorum Required</p>
            </div>
            <p className="text-xl font-bold text-omnom-text">{proposal.quorum_required}%</p>
            <div className="mt-2 h-1.5 rounded-full bg-omnom-dark overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-omnom-purple"
                animate={{ width: `${Math.min((totalPower / 100) * proposal.quorum_required, 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Total voting power */}
          <div className="rounded-xl border border-omnom-gold/10 bg-omnom-surface/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-400" />
              <p className="text-xs text-omnom-muted uppercase tracking-wider">Total Votes</p>
            </div>
            <p className="text-xl font-bold text-omnom-text">{totalVotes}</p>
            <p className="text-xs text-omnom-muted">{totalPower.toLocaleString()} QTV cast</p>
          </div>

          {/* Voters toggle */}
          <div className="rounded-xl border border-omnom-gold/10 bg-omnom-surface/40 p-4">
            <button
              onClick={handleToggleVoters}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-omnom-gold" />
                <div className="text-left">
                  <p className="text-xs text-omnom-muted uppercase tracking-wider">Voters</p>
                  <p className="text-sm font-medium text-omnom-text">{voters.length || totalVotes}</p>
                </div>
              </div>
              {showVoters ? (
                <ChevronUp className="h-4 w-4 text-omnom-muted" />
              ) : (
                <ChevronDown className="h-4 w-4 text-omnom-muted" />
              )}
            </button>
          </div>
        </div>

        {/* ── Voter list (expandable) ────────────────────────────── */}
        <AnimatePresence>
          {showVoters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="rounded-2xl border border-omnom-gold/10 bg-omnom-surface/40 p-6">
                <h3 className="text-sm font-semibold text-omnom-text mb-4">All Voters</h3>
                {votersLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="animate-pulse h-10 rounded-lg bg-omnom-gold/8" />
                    ))}
                  </div>
                ) : voters.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {voters.map((voter: Vote) => (
                      <div
                        key={voter.id}
                        className="flex items-center justify-between rounded-lg bg-omnom-dark/50 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-omnom-gold/20 to-omnom-purple/20 ring-1 ring-omnom-gold/10 font-mono text-xs font-bold text-omnom-gold">
                            {voter.voter_address.slice(2, 4).toUpperCase()}
                          </div>
                          <span className="font-mono text-sm text-omnom-text">
                            {truncateAddress(voter.voter_address)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-omnom-muted font-mono">
                            {voter.voting_power} QTV
                          </span>
                          <span className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                            voter.choice === 'FOR' ? 'bg-emerald-500/15 text-emerald-400' :
                            voter.choice === 'AGAINST' ? 'bg-red-500/15 text-red-400' :
                            'bg-slate-500/15 text-slate-400'
                          )}>
                            {voter.choice}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-omnom-muted">No voters yet.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Comments Section ────────────────────────────────────── */}
        <div className="rounded-2xl border border-omnom-gold/10 bg-omnom-surface/40 p-6">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="h-5 w-5 text-omnom-gold" />
            <h2 className="text-lg font-semibold text-omnom-text">
              Discussion ({comments.length})
            </h2>
          </div>

          {/* Comment input */}
          {isAuthenticated && (
            <div className="mb-6">
              {replyingTo && (
                <div className="flex items-center gap-2 mb-2 text-xs text-omnom-gold">
                  <span>Replying to comment</span>
                  <button onClick={() => setReplyingTo(null)} className="text-omnom-muted hover:text-omnom-text">
                    × Cancel
                  </button>
                </div>
              )}
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-omnom-gold/20 to-omnom-purple/20 ring-1 ring-omnom-gold/10 font-mono text-xs font-bold text-omnom-gold">
                  {userData?.address ? userData.address.slice(2, 4).toUpperCase() : '??'}
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder={replyingTo ? 'Write a reply...' : 'Join the discussion...'}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                    className="flex-1 rounded-xl border border-omnom-gold/10 bg-omnom-dark px-4 py-2.5 text-sm text-omnom-text placeholder:text-omnom-muted/50 focus:border-omnom-gold/30 focus:outline-none focus:ring-1 focus:ring-omnom-gold/20"
                  />
                  <button
                    onClick={handleSubmitComment}
                    disabled={!commentInput.trim()}
                    className="flex items-center justify-center h-10 w-10 rounded-xl bg-omnom-gold text-omnom-dark hover:bg-omnom-gold/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Comments list */}
          {commentsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-omnom-gold/10" />
                    <div className="h-4 w-24 rounded bg-omnom-gold/10" />
                  </div>
                  <div className="h-12 w-full rounded bg-omnom-gold/5" />
                </div>
              ))}
            </div>
          ) : comments.length > 0 ? (
            <div className="divide-y divide-omnom-gold/5">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentAddress={userData?.address}
                  onReply={(id) => {
                    setReplyingTo(id);
                    setCommentInput('');
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <MessageSquare className="h-8 w-8 text-omnom-muted/40 mx-auto mb-3" />
              <p className="text-sm text-omnom-muted">No comments yet. Be the first to share your thoughts!</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Mobile sticky vote bar (if ACTIVE) ─────────────────── */}
      {isActive && !userVote && (
        <div className="fixed bottom-20 left-0 right-0 z-40 border-t border-omnom-gold/10 bg-omnom-dark/95 backdrop-blur-lg p-3 sm:hidden">
          <div className="grid grid-cols-3 gap-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => handleVote('FOR')}
              disabled={voting || !isAuthenticated}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-emerald-400 disabled:opacity-40"
            >
              <ThumbsUp className="h-4 w-4" />
              For
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => handleVote('AGAINST')}
              disabled={voting || !isAuthenticated}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm font-semibold text-red-400 disabled:opacity-40"
            >
              <ThumbsDown className="h-4 w-4" />
              Against
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => handleVote('ABSTAIN')}
              disabled={voting || !isAuthenticated}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-500/30 bg-slate-500/10 px-3 py-2.5 text-sm font-semibold text-slate-400 disabled:opacity-40"
            >
              <MinusCircle className="h-4 w-4" />
              Abstain
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}

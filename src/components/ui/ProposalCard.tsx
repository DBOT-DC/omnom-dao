'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Clock, Users, MessageSquare } from 'lucide-react';
import { ProposalStatusBadge } from '@/components/ui/ProposalStatusBadge';
import { ProposalTypeBadge } from '@/components/ui/ProposalTypeBadge';
import { VoteBar } from '@/components/ui/VoteBar';
import { cn } from '@/lib/utils';
import { formatRelativeTime, truncateAddress } from '@/lib/format';
import type { Proposal } from '@/types';

interface ProposalCardProps {
  proposal: Proposal;
  index?: number;
}

function formatTimeRemaining(endsAt: number): string {
  const end = endsAt * 1000;
  const now = Date.now();
  const diff = end - now;

  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export function ProposalCard({ proposal, index = 0 }: ProposalCardProps) {
  const totalVotes = proposal.votes_for + proposal.votes_against + proposal.votes_abstain;
  const forPct = totalVotes > 0 ? (proposal.votes_for / totalVotes) * 100 : 0;
  const againstPct = totalVotes > 0 ? (proposal.votes_against / totalVotes) * 100 : 0;
  const abstainPct = totalVotes > 0 ? (proposal.votes_abstain / totalVotes) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: 'easeOut' }}
    >
      <Link href={`/proposals/${proposal.id}`} className="block">
        <motion.div
          whileHover={{ scale: 1.01, y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={cn(
            'group rounded-xl glass p-5',
            'transition-all duration-200',
            'hover:border-omnom-gold/25 hover:shadow-[0_8px_30px_rgba(0,0,0,0.2),0_0_15px_rgba(255,215,0,0.06)]'
          )}
        >
          {/* Badges row */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ProposalStatusBadge status={proposal.status} />
            <ProposalTypeBadge type={proposal.type} />
          </div>

          {/* Title */}
          <h3 className="mb-2 text-lg font-semibold text-omnom-text group-hover:text-omnom-gold transition-colors line-clamp-2 leading-snug">
            {proposal.title}
          </h3>

          {/* Description preview — 2 lines */}
          <p className="mb-3 text-sm text-omnom-muted line-clamp-2 leading-relaxed">
            {proposal.description}
          </p>

          {/* Vote bar */}
          <div className="mb-3">
            <VoteBar
              forPercent={forPct}
              againstPercent={againstPct}
              abstainPercent={abstainPct}
              totalVotes={totalVotes}
              quorumRequired={proposal.quorum_required}
              showLabels={true}
              size="sm"
            />
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-omnom-muted">
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{totalVotes} votes</span>
            </div>
            {proposal.status === 'ACTIVE' && proposal.voting_ends_at && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatTimeRemaining(proposal.voting_ends_at)}</span>
              </div>
            )}
            <span className="font-mono text-[11px]">
              by {truncateAddress(proposal.author_address)}
            </span>
            <span className="ml-auto">{formatRelativeTime(proposal.created_at)}</span>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

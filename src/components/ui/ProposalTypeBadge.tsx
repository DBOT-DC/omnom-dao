'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ProposalType } from '@/types';

interface ProposalTypeBadgeProps {
  type: ProposalType;
  className?: string;
}

const typeConfig: Record<ProposalType, { emoji: string; label: string; bg: string; text: string }> = {
  CHAIN_SELECTION: {
    emoji: '🔄',
    label: 'Chain Selection',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
  },
  TREASURY: {
    emoji: '💰',
    label: 'Treasury',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
  },
  TOKENOMICS: {
    emoji: '📊',
    label: 'Tokenomics',
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
  },
  COMMUNITY_GUIDELINE: {
    emoji: '📜',
    label: 'Guidelines',
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
  },
  TECHNICAL_SPEC: {
    emoji: '⚙️',
    label: 'Tech Spec',
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
  },
  GENERAL: {
    emoji: '💬',
    label: 'General',
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
  },
};

export function ProposalTypeBadge({ type, className }: ProposalTypeBadgeProps) {
  const config = typeConfig[type];

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.bg,
        config.text,
        className
      )}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </motion.span>
  );
}

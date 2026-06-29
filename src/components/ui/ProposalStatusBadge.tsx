'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ProposalStatus } from '@/types';

interface ProposalStatusBadgeProps {
  status: ProposalStatus;
  className?: string;
}

type StatusStyle = {
  label: string;
  bg: string;
  text: string;
  border: string;
  glow?: string;
  icon?: React.ReactNode;
  dash?: boolean;
  strikethrough?: boolean;
  pulse?: boolean;
};

const statusConfig: Record<ProposalStatus, StatusStyle> = {
  ACTIVE: {
    label: 'Active',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    glow: 'shadow-[0_0_8px_rgba(16,185,129,0.3)]',
    icon: <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>,
    pulse: true,
  },
  PASSED: {
    label: 'Passed',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    icon: <span className="text-emerald-400">✓</span>,
  },
  FAILED: {
    label: 'Failed',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
    icon: <span className="text-red-400">✗</span>,
  },
  CLOSED: {
    label: 'Closed',
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
  },
  DRAFT: {
    label: 'Draft',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30 border-dashed',
    dash: true,
  },
  PENDING_REVIEW: {
    label: 'Pending Review',
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    pulse: true,
  },
  EXPIRED: {
    label: 'Expired',
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
    strikethrough: true,
  },
};

export function ProposalStatusBadge({ status, className }: ProposalStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.bg,
        config.text,
        config.border,
        config.glow,
        config.strikethrough && 'line-through opacity-70',
        className
      )}
    >
      {config.icon && config.icon}
      {config.label}
    </motion.span>
  );
}

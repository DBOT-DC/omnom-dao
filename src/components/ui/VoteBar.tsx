'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface VoteBarProps {
  forPercent: number;
  againstPercent: number;
  abstainPercent: number;
  totalVotes?: number;
  quorumRequired?: number;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function VoteBar({
  forPercent,
  againstPercent,
  abstainPercent,
  totalVotes = 0,
  quorumRequired,
  showLabels = true,
  size = 'md',
  className,
}: VoteBarProps) {
  const heights = { sm: 'h-2.5', md: 'h-4', lg: 'h-6' };
  const labelSize = { sm: 'text-[10px]', md: 'text-xs', lg: 'text-sm' };

  // Quorum threshold as percentage of total possible votes (estimated)
  const quorumPct = quorumRequired ? Math.min(quorumRequired / 100, 100) : null;

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Bar container */}
      <div className="relative">
        <div className={cn('flex w-full overflow-hidden rounded-full', heights[size])}>
          {/* FOR segment — green */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${forPercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
            className={cn(
              'relative flex items-center justify-center overflow-hidden',
              'bg-emerald-500'
            )}
          >
            {showLabels && forPercent > 12 && size !== 'sm' && (
              <span className={cn('font-semibold text-white drop-shadow-sm', labelSize[size])}>
                {forPercent.toFixed(1)}%
              </span>
            )}
          </motion.div>

          {/* AGAINST segment — red */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${againstPercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
            className={cn(
              'relative flex items-center justify-center overflow-hidden',
              'bg-red-500'
            )}
          >
            {showLabels && againstPercent > 12 && size !== 'sm' && (
              <span className={cn('font-semibold text-white drop-shadow-sm', labelSize[size])}>
                {againstPercent.toFixed(1)}%
              </span>
            )}
          </motion.div>

          {/* ABSTAIN segment — gray */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${abstainPercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
            className={cn(
              'relative flex items-center justify-center overflow-hidden',
              'bg-slate-500'
            )}
          >
            {showLabels && abstainPercent > 12 && size !== 'sm' && (
              <span className={cn('font-semibold text-white drop-shadow-sm', labelSize[size])}>
                {abstainPercent.toFixed(1)}%
              </span>
            )}
          </motion.div>
        </div>

        {/* Quorum line indicator */}
        {quorumPct !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="absolute top-0 bottom-0 z-10 flex flex-col items-center"
            style={{ left: `${quorumPct}%` }}
          >
            <div className="w-px h-full border-l-2 border-dashed border-omnom-gold/80" />
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-omnom-gold">
              Quorum
            </span>
          </motion.div>
        )}
      </div>

      {/* Labels below bar */}
      {showLabels && size !== 'sm' && (
        <div className={cn('flex justify-between', labelSize[size], 'text-omnom-muted')}>
          <span className="text-emerald-400">
            For {forPercent.toFixed(1)}%
          </span>
          <span className="text-red-400">
            Against {againstPercent.toFixed(1)}%
          </span>
          <span className="text-slate-400">
            Abstain {abstainPercent.toFixed(1)}%
          </span>
        </div>
      )}

      {/* Total votes count */}
      {totalVotes > 0 && (
        <p className={cn('text-center font-medium', labelSize[size], 'text-omnom-muted')}>
          {totalVotes.toLocaleString()} vote{totalVotes !== 1 ? 's' : ''} total
        </p>
      )}
    </div>
  );
}

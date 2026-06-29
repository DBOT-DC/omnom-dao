'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { HolderClass } from '@/types';

interface HolderBadgeProps {
  holderClass: HolderClass;
  rank?: number;
  variant?: 'compact' | 'full';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const classConfig: Record<HolderClass, {
  emoji: string;
  label: string;
  bg: string;
  text: string;
  border: string;
  glow?: string;
}> = {
  WHALE: {
    emoji: '🐋',
    label: 'Whale',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    glow: 'shadow-[0_0_12px_rgba(255,215,0,0.25)]',
  },
  DOLPHIN: {
    emoji: '🐬',
    label: 'Dolphin',
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  FISH: {
    emoji: '🐟',
    label: 'Fish',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
};

const sizeConfig = {
  sm: 'px-1.5 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-sm gap-1.5',
  lg: 'px-3 py-1.5 text-base gap-2',
};

export function HolderBadge({
  holderClass,
  rank,
  variant = 'full',
  size = 'md',
  className,
}: HolderBadgeProps) {
  const config = classConfig[holderClass];

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        config.bg,
        config.text,
        config.border,
        config.glow,
        sizeConfig[size],
        className
      )}
    >
      {rank !== undefined && (
        <span className="font-mono font-bold text-[10px] opacity-70">#{rank}</span>
      )}
      <span>{config.emoji}</span>
      {variant === 'full' && <span>{config.label}</span>}
    </motion.span>
  );
}

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        'rounded-2xl bg-gradient-to-b from-omnom-surface/50 to-transparent',
        className
      )}
    >
      {/* Animated icon */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-omnom-surface ring-1 ring-omnom-gold/10 text-omnom-muted"
      >
        {icon || <Inbox className="h-8 w-8" />}
      </motion.div>

      <h3 className="mb-2 text-lg font-semibold text-omnom-text">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-omnom-muted leading-relaxed">{description}</p>

      {action && (
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
          {action.href ? (
            <Link
              href={action.href}
              className="rounded-full bg-omnom-gold px-6 py-2.5 text-sm font-semibold text-omnom-dark hover:bg-omnom-gold/90 transition-colors glow-gold"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="rounded-full bg-omnom-gold px-6 py-2.5 text-sm font-semibold text-omnom-dark hover:bg-omnom-gold/90 transition-colors glow-gold"
            >
              {action.label}
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

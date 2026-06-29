'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
}

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const displayValue = useTransform(motionValue, (v) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v % 1 === 0 ? Math.round(v).toLocaleString() : v.toFixed(1)
  );
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const unsubscribe = displayValue.on('change', (v) => setDisplay(String(v)));
    return () => unsubscribe();
  }, [displayValue]);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.2,
      ease: 'easeOut',
    });
    return () => controls.stop();
  }, [motionValue, value]);

  return <span ref={ref} className={className}>{display}</span>;
}

export function StatCard({ label, value, icon, className, trend }: StatCardProps) {
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'rounded-xl glass p-5',
        'hover:border-omnom-gold/20 hover:bg-omnom-surface-elevated/50 transition-all duration-200',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-omnom-muted uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-omnom-text">
            {typeof value === 'number' ? (
              <AnimatedNumber value={numericValue} />
            ) : (
              value
            )}
          </p>
          {trend && (
            <motion.p
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className={cn(
                'text-xs font-semibold',
                trend.positive ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {trend.positive ? '↑' : '↓'} {trend.value}
            </motion.p>
          )}
        </div>
        {icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-omnom-gold/20 to-omnom-purple/20 text-omnom-gold ring-1 ring-omnom-gold/10">
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}

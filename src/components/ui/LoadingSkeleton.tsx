'use client';

import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'detail' | 'stat';
  count?: number;
  className?: string;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-omnom-gold/8',
        className
      )}
    />
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-omnom-gold/10 bg-omnom-surface/60 p-5 space-y-3">
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-2.5 w-full rounded-full" />
      <div className="flex gap-4 pt-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg p-3">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </div>

      {/* Content area */}
      <Skeleton className="h-48 w-full rounded-lg" />

      {/* Vote section */}
      <div className="rounded-xl border border-omnom-gold/10 bg-omnom-surface/60 p-5 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      {/* Small cards */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-omnom-gold/10 bg-omnom-surface/60 p-4 space-y-2">
      <Skeleton className="h-3 w-20 rounded" />
      <Skeleton className="h-8 w-32 rounded" />
    </div>
  );
}

export function LoadingSkeleton({ variant = 'card', count = 3, className }: LoadingSkeletonProps) {
  if (variant === 'list') {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <ListSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className={cn('max-w-3xl', className)}>
        <DetailSkeleton />
      </div>
    );
  }

  if (variant === 'stat') {
    return (
      <div className={cn('grid grid-cols-2 gap-4 lg:grid-cols-4', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Default: card variant
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

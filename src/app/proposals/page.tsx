'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useProposals } from '@/hooks/useProposals';
import { useAuth } from '@/hooks/useAuth';
import { ProposalCard } from '@/components/ui/ProposalCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import type { ProposalStatus, ProposalType } from '@/types';

// ── Filter options ────────────────────────────────────────────────────
const STATUS_OPTIONS: Array<{ value: ProposalStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_REVIEW', label: 'Pending' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'PASSED', label: 'Passed' },
  { value: 'FAILED', label: 'Failed' },
];

const TYPE_OPTIONS: Array<{ value: ProposalType | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Types' },
  { value: 'CHAIN_SELECTION', label: 'Chain Selection' },
  { value: 'TREASURY', label: 'Treasury' },
  { value: 'TOKENOMICS', label: 'Tokenomics' },
  { value: 'COMMUNITY_GUIDELINE', label: 'Guidelines' },
  { value: 'TECHNICAL_SPEC', label: 'Tech Spec' },
  { value: 'GENERAL', label: 'General' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'most-votes', label: 'Most Votes' },
  { value: 'ending-soon', label: 'Ending Soon' },
];

// ── Dropdown component ────────────────────────────────────────────────
function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-omnom-gold/10 bg-omnom-surface/60 px-3 py-2 text-sm text-omnom-text hover:border-omnom-gold/20 transition-colors whitespace-nowrap"
      >
        <span className="hidden sm:inline text-omnom-muted">{label}:</span>
        <span className="font-medium">{selected?.label || value}</span>
        <ChevronDown className={`h-4 w-4 text-omnom-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 z-40 mt-1 min-w-[180px] rounded-xl border border-omnom-gold/10 bg-omnom-surface py-1 shadow-xl overflow-hidden"
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                option.value === value
                  ? 'bg-omnom-gold/10 text-omnom-gold'
                  : 'text-omnom-text hover:bg-omnom-surface'
              }`}
            >
              {option.label}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ── Proposals Page ──────────────────────────────────────────────────────
export default function ProposalsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<ProposalType | 'ALL'>('ALL');
  const [sort, setSort] = useState<'newest' | 'most-votes' | 'ending-soon'>('newest');

  const { user } = useAuth();
  const userData = user as any;
  const isAuthenticated = userData?.authenticated;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    proposals,
    total,
    loading,
    error,
    fetchMore,
    hasMore,
    refetch,
  } = useProposals({
    status: statusFilter === 'ALL' ? undefined : (statusFilter as ProposalStatus),
    type: typeFilter === 'ALL' ? undefined : (typeFilter as ProposalType),
    sort: sort as 'newest' | 'most-votes',
    limit: 12,
  });

  // Filter by search client-side (API also handles it if endpoint supports search param)
  const filteredProposals = debouncedSearch
    ? proposals.filter(
        (p) =>
          p.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          p.description.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : proposals;

  const activeFilters =
    (statusFilter !== 'ALL' ? 1 : 0) +
    (typeFilter !== 'ALL' ? 1 : 0) +
    (search ? 1 : 0);

  const clearFilters = useCallback(() => {
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setSearch('');
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12"
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-omnom-text">Proposals</h1>
          <p className="text-sm text-omnom-muted mt-1">
            {loading ? (
              'Loading...'
            ) : (
              <>
                {total} proposal{total !== 1 ? 's' : ''}
                {activeFilters > 0 && ` matching filters`}
              </>
            )}
          </p>
        </div>

        {isAuthenticated && (
          <Link href="/proposals/create">
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 rounded-xl bg-omnom-gold px-5 py-2.5 text-sm font-semibold text-omnom-dark hover:bg-omnom-gold/90 transition-colors glow-gold"
            >
              <Plus className="h-4 w-4" />
              Create Proposal
            </motion.div>
          </Link>
        )}
      </div>

      {/* ── Search & Filters ───────────────────────────────────── */}
      <div className="mb-8 space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-omnom-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search proposals..."
            className="w-full rounded-xl border border-omnom-gold/10 bg-omnom-surface/60 pl-10 pr-10 py-3 text-sm text-omnom-text placeholder:text-omnom-muted/50 focus:border-omnom-gold/30 focus:outline-none focus:ring-1 focus:ring-omnom-gold/20"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-omnom-muted hover:text-omnom-text transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter row — horizontally scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-x-visible scrollbar-none">
          <SlidersHorizontal className="h-4 w-4 text-omnom-muted shrink-0" />
          <FilterDropdown
            label="Status"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as ProposalStatus | 'ALL')}
          />
          <FilterDropdown
            label="Type"
            options={TYPE_OPTIONS}
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as ProposalType | 'ALL')}
          />
          <FilterDropdown
            label="Sort"
            options={SORT_OPTIONS}
            value={sort}
            onChange={(v) => setSort(v as 'newest' | 'most-votes' | 'ending-soon')}
          />

          {activeFilters > 0 && (
            <button
              onClick={clearFilters}
              className="shrink-0 flex items-center gap-1 rounded-lg border border-red-500/20 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear ({activeFilters})
            </button>
          )}
        </div>
      </div>

      {/* ── Error state ───────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 mb-6">
          <p className="text-sm text-red-400">Failed to load proposals: {error}</p>
          <Button variant="ghost" onClick={refetch} className="mt-2 text-xs">
            Try again
          </Button>
        </div>
      )}

      {/* ── Loading state ──────────────────────────────────────── */}
      {loading && proposals.length === 0 && (
        <LoadingSkeleton variant="card" count={6} />
      )}

      {/* ── Empty state ────────────────────────────────────────── */}
      {!loading && filteredProposals.length === 0 && !error && (
        <EmptyState
          icon={<SlidersHorizontal className="h-8 w-8" />}
          title="No proposals found"
          description={
            activeFilters > 0
              ? 'Try adjusting your filters or search terms to find what you\'re looking for.'
              : 'No proposals have been created yet. Be the first to propose something!'
          }
          action={
            activeFilters > 0
              ? { label: 'Clear Filters', onClick: clearFilters }
              : isAuthenticated
              ? { label: 'Create Proposal', href: '/proposals/create' }
              : undefined
          }
        />
      )}

      {/* ── Proposal grid/list ────────────────────────────────── */}
      <div className="space-y-4">
        {filteredProposals.map((proposal, i) => (
          <ProposalCard key={proposal.id} proposal={proposal} index={i} />
        ))}
      </div>

      {/* ── Load more ──────────────────────────────────────────── */}
      {hasMore && !loading && (
        <div className="mt-8 text-center">
          <Button
            onClick={fetchMore}
            variant="gold-outline"
            size="lg"
            className="rounded-full px-8"
          >
            Load More
          </Button>
        </div>
      )}

      {/* Loading more indicator */}
      {loading && proposals.length > 0 && (
        <div className="mt-6 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-omnom-muted">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-omnom-gold/30 border-t-omnom-gold" />
            Loading more...
          </div>
        </div>
      )}
    </motion.div>
  );
}

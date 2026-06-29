'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Proposal, ProposalStatus, ProposalType, ProposalsResponse } from '@/types';

interface UseProposalsOptions {
  status?: ProposalStatus;
  type?: ProposalType;
  sort?: 'newest' | 'oldest' | 'most-votes';
  limit?: number;
}

interface UseProposalsReturn {
  proposals: Proposal[];
  total: number;
  loading: boolean;
  error: string | null;
  fetchMore: () => Promise<void>;
  refetch: () => Promise<void>;
  hasMore: boolean;
}

export function useProposals(options: UseProposalsOptions = {}): UseProposalsReturn {
  const { status, type, sort = 'newest', limit = 10 } = options;

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef(1);

  const fetchProposals = useCallback(
    async (pageNum: number, append = false) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        if (type) params.set('type', type);
        if (sort) params.set('sort', sort);
        params.set('page', String(pageNum));
        params.set('limit', String(limit));

        const res = await fetch(`/api/proposals?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch proposals');
        const data: ProposalsResponse = await res.json();

        setProposals((prev) => (append ? [...prev, ...data.proposals] : data.proposals));
        setTotal(data.total);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [status, type, sort, limit]
  );

  useEffect(() => {
    pageRef.current = 1;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProposals(1, false);
  }, [fetchProposals]);

  const fetchMore = useCallback(async () => {
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    await fetchProposals(nextPage, true);
  }, [fetchProposals]);

  const refetch = useCallback(async () => {
    pageRef.current = 1;
    await fetchProposals(1, false);
  }, [fetchProposals]);

  const hasMore = proposals.length < total;

  return { proposals, total, loading, error, fetchMore, refetch, hasMore };
}

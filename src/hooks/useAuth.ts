'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AuthUser } from '@/types';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable fetch function used by both the effect and refetch
  const doFetch = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (!res.ok) throw new Error('Failed to fetch session');
      const data = await res.json();
      if (data.authenticated && data.user) {
        const userData: AuthUser = {
          authenticated: true,
          address: data.user.address,
          verified: data.user.verified,
          holder: data.user.holder
            ? {
                rank: data.user.holder.rank,
                balance: data.user.holder.balance,
                class: data.user.holder.class,
                percentage: data.user.holder.percentage,
              }
            : undefined,
        };
        setUser(userData);
      } else {
        setUser(null);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (cancelled) return;
        if (!res.ok) throw new Error('Failed to fetch session');
        const data = await res.json();
        if (cancelled) return;
        if (data.authenticated && data.user) {
          const userData: AuthUser = {
            authenticated: true,
            address: data.user.address,
            verified: data.user.verified,
            holder: data.user.holder
              ? {
                  rank: data.user.holder.rank,
                  balance: data.user.holder.balance,
                  class: data.user.holder.class,
                  percentage: data.user.holder.percentage,
                }
              : undefined,
          };
          setUser(userData);
        } else {
          setUser(null);
        }
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
        setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    await doFetch();
  }, [doFetch]);

  return { user, loading, error, refetch };
}

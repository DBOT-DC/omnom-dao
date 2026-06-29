'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  Wallet,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Loader2,
  XCircle,
  Search,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { HolderBadge } from '@/components/ui/HolderBadge';
import { StatCard } from '@/components/ui/StatCard';
import type { HolderClass } from '@/types';

// ── Verification states ────────────────────────────────────────────────
type VerifyState = 'disconnected' | 'connecting' | 'verifying' | 'verified' | 'not_found' | 'error';

function truncateAddress(address: string): string {
  if (!address) return '0x????';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ── Verify Page ────────────────────────────────────────────────────────
export default function VerifyPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { user, loading, refetch } = useAuth();
  const [state, setState] = useState<VerifyState>('disconnected');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [holderData, setHolderData] = useState<{
    rank: number;
    balance: string;
    class: HolderClass;
    percentage: number;
  } | null>(null);

  const userData = user as any;
  const isAuthenticated = userData?.authenticated;
  const isVerified = isAuthenticated && userData?.verified;

  // Auto-redirect if already verified
  useEffect(() => {
    if (isVerified) {
      setState('verified');
      if (userData?.holder) {
        setHolderData(userData.holder);
      }
    }
  }, [isVerified, userData]);

  // Update state based on connection
  useEffect(() => {
    if (loading || isVerified) return;

    if (!isConnected) {
      setState('disconnected');
    } else if (!isAuthenticated || !userData?.address) {
      setState('connecting');
    } else if (userData?.holder) {
      setHolderData(userData.holder);
      setState('verified');
    } else if (userData?.verified === false) {
      setState('not_found');
    }
  }, [isConnected, isAuthenticated, isVerified, userData, loading]);

  // SIWE verification flow
  const handleVerify = useCallback(async () => {
    if (!address) return;

    setState('verifying');
    setErrorMsg('');

    try {
      // 1. Get nonce
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      if (!nonceRes.ok) throw new Error('Failed to get nonce');
      const { nonce } = await nonceRes.json();

      // 2. Sign message
      const signature = await signMessageAsync({
        message: `Sign this message to verify your wallet ownership.\n\nNonce: ${nonce}`,
      });

      // 3. Verify signature
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, nonce }),
      });

      if (!verifyRes.ok) {
        const errData = await verifyRes.json().catch(() => ({}));
        if (errData.error === 'not_found' || errData.code === 'HOLDER_NOT_FOUND') {
          setState('not_found');
          return;
        }
        throw new Error(errData.error || 'Verification failed');
      }

      // 4. Success — refetch session
      await refetch();
      setState('verified');
    } catch (err) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    }
  }, [address, signMessageAsync, refetch]);

  // ── Render: Disconnected ──────────────────────────────────────
  if (state === 'disconnected') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full text-center"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-omnom-gold/20 to-omnom-purple/20 ring-1 ring-omnom-gold/10"
          >
            <Wallet className="h-12 w-12 text-omnom-gold" />
          </motion.div>

          <h1 className="text-3xl sm:text-4xl font-bold text-omnom-text mb-4">
            Verify Your <span className="text-gradient-gold">Holdings</span>
          </h1>

          <p className="text-omnom-muted mb-8 max-w-md mx-auto leading-relaxed">
            Connect your Web3 wallet to verify your $OMNOM holdings. We use Sign-In with Ethereum (SIWE) to securely authenticate your ownership without exposing any private keys.
          </p>

          <div className="flex flex-col items-center gap-4">
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={openConnectModal}
                  className="flex items-center gap-2 rounded-full bg-omnom-gold px-8 py-3.5 text-base font-bold text-omnom-dark hover:bg-omnom-gold/90 transition-colors glow-gold"
                >
                  <Wallet className="h-5 w-5" />
                  Connect Wallet
                </motion.button>
              )}
            </ConnectButton.Custom>

            <div className="flex items-center gap-4 text-xs text-omnom-muted mt-2">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                SIWE Auth
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                No Private Keys
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Secure
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Render: Connecting/Verifying (loading) ─────────────────────
  if (state === 'connecting' || state === 'verifying' || (loading && !isVerified)) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border-4 border-omnom-gold/20 border-t-omnom-gold"
          >
            <Loader2 className="h-10 w-10 text-omnom-gold animate-spin" />
          </motion.div>

          <h2 className="text-2xl font-bold text-omnom-text mb-3">
            {state === 'connecting' ? 'Connecting...' : 'Verifying Your Wallet...'}
          </h2>
          <p className="text-omnom-muted leading-relaxed">
            {state === 'connecting'
              ? 'Please wait while we check your wallet connection.'
              : 'Please sign the message in your wallet to verify ownership. We will never ask you to sign a transaction.'}
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Render: Verified (Success) ─────────────────────────────────
  if (state === 'verified') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="max-w-lg w-full text-center"
        >
          {/* Animated checkmark */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 15 }}
            className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-500/30"
          >
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 15 }}
            >
              <CheckCircle2 className="h-14 w-14 text-emerald-400" />
            </motion.div>
          </motion.div>

          <h2 className="text-3xl font-bold text-omnom-text mb-2">
            Wallet <span className="text-emerald-400">Verified!</span>
          </h2>

          {userData?.address && (
            <p className="font-mono text-sm text-omnom-muted mb-6">
              {truncateAddress(userData.address)}
            </p>
          )}

          {/* Holder info */}
          {holderData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-8 rounded-2xl border border-omnom-gold/10 bg-omnom-surface/60 p-6 text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-omnom-muted">Holder Status</span>
                {holderData.class && (
                  <HolderBadge holderClass={holderData.class} rank={holderData.rank} size="lg" />
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  label="Balance"
                  value={holderData.balance}
                />
                <StatCard
                  label="Rank"
                  value={`#${holderData.rank}`}
                />
                <StatCard
                  label="Voting Power"
                  value={`${holderData.percentage}%`}
                />
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link href="/dashboard">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 rounded-full bg-omnom-gold px-8 py-3 text-sm font-bold text-omnom-dark hover:bg-omnom-gold/90 transition-colors glow-gold"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </motion.div>
            </Link>
            <Link href="/proposals">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 rounded-full border border-omnom-gold/30 px-6 py-3 text-sm font-semibold text-omnom-gold hover:bg-omnom-gold/10 transition-all"
              >
                Browse Proposals
              </motion.div>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ── Render: Not Found in snapshot ──────────────────────────────
  if (state === 'not_found') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-500/20"
          >
            <Search className="h-12 w-12 text-amber-400" />
          </motion.div>

          <h2 className="text-2xl font-bold text-omnom-text mb-3">
            Wallet Not Found in Snapshot
          </h2>

          <div className="rounded-2xl border border-omnom-gold/10 bg-omnom-surface/40 p-6 mb-8 text-left">
            <p className="text-omnom-muted text-sm leading-relaxed mb-3">
              Your connected wallet was not found in the latest $OMNOM holder snapshot. This could mean:
            </p>
            <ul className="space-y-2 text-sm text-omnom-muted">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-omnom-gold shrink-0" />
                You don&apos;t hold any $OMNOM tokens yet
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-omnom-gold shrink-0" />
                Your tokens are on a different address
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-omnom-gold shrink-0" />
                The snapshot hasn&apos;t been updated to include your recent purchases
              </li>
            </ul>

            {address && (
              <p className="mt-4 text-xs text-omnom-muted font-mono">
                Connected: {truncateAddress(address)}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setState('disconnected'); }}
              className="flex items-center gap-2 rounded-full border border-omnom-gold/30 px-6 py-3 text-sm font-semibold text-omnom-gold hover:bg-omnom-gold/10 transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              Try Different Wallet
            </motion.button>

            <a
              href="https://t.me/omnomdao"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-omnom-muted hover:text-omnom-gold transition-colors"
            >
              Need help? Join Telegram →
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Render: Error ──────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-500/20"
          >
            <XCircle className="h-12 w-12 text-red-400" />
          </motion.div>

          <h2 className="text-2xl font-bold text-omnom-text mb-3">
            Verification Failed
          </h2>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 mb-8">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm">{errorMsg || 'Something went wrong during verification.'}</p>
            </div>
          </div>

          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleVerify}
              className="flex items-center gap-2 rounded-full bg-omnom-gold px-8 py-3 text-sm font-bold text-omnom-dark hover:bg-omnom-gold/90 transition-colors glow-gold mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Fallback (should not reach here)
  return null;
}

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  FileText,
  Users,
  Zap,
  ShieldCheck,
  Vote,
  ArrowRight,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { StatCard } from '@/components/ui/StatCard';
import { ProposalCard } from '@/components/ui/ProposalCard';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { useProposals } from '@/hooks/useProposals';
import type { Proposal } from '@/types';

// ── Typewriter hook ────────────────────────────────────────────────────
function useTypewriter(words: string[], typingSpeed = 80, deletingSpeed = 40, pauseTime = 2000) {
  const [text, setText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex];
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          setText(currentWord.slice(0, text.length + 1));
          if (text.length + 1 === currentWord.length) {
            setTimeout(() => setIsDeleting(true), pauseTime);
          }
        } else {
          setText(currentWord.slice(0, text.length - 1));
          if (text.length === 0) {
            setIsDeleting(false);
            setWordIndex((prev) => (prev + 1) % words.length);
          }
        }
      },
      isDeleting ? deletingSpeed : typingSpeed
    );
    return () => clearTimeout(timeout);
  }, [text, isDeleting, wordIndex, words, typingSpeed, deletingSpeed, pauseTime]);

  return text;
}

// ── Floating particles background ───────────────────────────────────────
function ParticleField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Subtle gradient mesh */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-[10%] left-[15%] h-[40vh] w-[40vh] rounded-full bg-omnom-gold/[0.07] blur-[100px]" />
        <div className="absolute bottom-[20%] right-[10%] h-[35vh] w-[35vh] rounded-full bg-omnom-purple/[0.08] blur-[80px]" />
        <div className="absolute top-[60%] left-[50%] h-[30vh] w-[30vh] rounded-full bg-omnom-amber/[0.04] blur-[90px]" />
      </div>
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-[2px] h-[2px] rounded-full bg-omnom-gold/20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -40, 0],
            opacity: [0.1, 0.6, 0.1],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: 4 + Math.random() * 6,
            repeat: Infinity,
            delay: Math.random() * 4,
            ease: 'easeInOut',
          }}
        />
      ))}
      {/* Larger diamond-shaped particles */}
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={`star-${i}`}
          className="absolute"
          style={{
            left: `${15 + Math.random() * 70}%`,
            top: `${15 + Math.random() * 70}%`,
          }}
          animate={{
            rotate: [0, 180, 360],
            scale: [0.4, 0.8, 0.4],
            opacity: [0.15, 0.5, 0.15],
          }}
          transition={{
            duration: 8 + Math.random() * 6,
            repeat: Infinity,
            delay: Math.random() * 6,
            ease: 'easeInOut',
          }}
        >
          <div className="w-1.5 h-1.5 bg-omnom-gold/30 rotate-45" />
        </motion.div>
      ))}
    </div>
  );
}

// ── Animated section wrapper ───────────────────────────────────────────
function AnimatedSection({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Step card ───────────────────────────────────────────────────────────
function StepCard({
  step,
  icon,
  title,
  description,
  index,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay: index * 0.15, ease: 'easeOut' }}
      className="relative flex flex-col items-center text-center p-6 rounded-2xl glass hover:border-omnom-gold/20 group"
    >
      {/* Step number */}
      <div className="absolute -top-3 -left-3 flex h-8 w-8 items-center justify-center rounded-full bg-omnom-gold text-omnom-dark text-sm font-bold shadow-[0_0_16px_rgba(255,215,0,0.3)]">
        {step}
      </div>

      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-omnom-gold/15 to-omnom-purple/15 text-omnom-gold ring-1 ring-omnom-gold/10 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(255,215,0,0.15)] transition-all duration-300">
        {icon}
      </div>

      <h3 className="mb-2 text-lg font-semibold text-omnom-text group-hover:text-omnom-gold-light transition-colors">{title}</h3>
      <p className="text-sm text-omnom-muted leading-relaxed max-w-xs">{description}</p>
    </motion.div>
  );
}

// ── Main Landing Page ───────────────────────────────────────────────────
export default function LandingPage() {
  const subtitle = useTypewriter(
    ['Decentralized Governance', 'Community Driven', 'Built on Dogechain', 'Shape the Future'],
    70,
    35,
    1800
  );

  const { proposals, loading, total } = useProposals({ status: 'ACTIVE', sort: 'newest', limit: 3 });

  return (
    <div className="min-h-screen">
      {/* ── Hero Section ─────────────────────────────────────────── */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden">
        {/* Gradient mesh background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[800px] w-[1200px] rounded-full bg-gradient-to-b from-omnom-gold/[0.06] via-omnom-purple/[0.04] to-transparent blur-[60px]" />
          <div className="absolute -top-20 -left-20 h-[50vh] w-[50vh] rounded-full bg-omnom-gold/[0.04] blur-[80px]" />
          <div className="absolute -bottom-20 -right-20 h-[50vh] w-[50vh] rounded-full bg-omnom-purple/[0.05] blur-[80px]" />
          {/* Subtle grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,215,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,215,0,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        <ParticleField />

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 text-center">
          {/* Animated OMNOM logo */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, type: 'spring', stiffness: 200, damping: 15 }}
            className="mb-8 inline-block"
          >
            <motion.span
              className="text-7xl sm:text-8xl inline-block drop-shadow-[0_0_30px_rgba(255,215,0,0.3)]"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              🐕
            </motion.span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mb-4 text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-extrabold tracking-tighter"
          >
            <span className="text-gradient-hero">$OMNOM</span>{' '}
            <span className="text-omnom-text font-light opacity-70">DAO</span>
          </motion.h1>

          {/* Typewriter subtitle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mb-4 h-10 flex items-center justify-center"
          >
            <p className="text-xl sm:text-2xl md:text-[1.7rem] text-omnom-text-secondary font-light tracking-tight">
              {subtitle}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="inline-block ml-1 w-0.5 h-7 bg-omnom-gold align-middle"
              />
            </p>
          </motion.div>

          {/* QTV + Dogechain brand tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mb-8 text-xs sm:text-sm font-medium tracking-[0.2em] uppercase text-omnom-gold/70"
          >
            Quadratic Token Voting · Powered by Dogechain
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          >
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={openConnectModal}
                  className="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-omnom-gold via-omnom-amber to-omnom-gold bg-[length:200%_100%] px-8 py-4 text-base font-bold text-omnom-dark hover:shadow-[0_0_40px_rgba(255,215,0,0.35)] transition-all duration-300 animate-[gradient-shift_4s_ease_infinite]"
                >
                  <Wallet className="h-5 w-5" />
                  Connect Wallet
                </motion.button>
              )}
            </ConnectButton.Custom>

            <Link href="/proposals">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 rounded-full glass px-8 py-4 text-base font-semibold text-omnom-gold hover:bg-omnom-gold/10 hover:border-omnom-gold/25 transition-all duration-300"
              >
                <FileText className="h-5 w-5" />
                Browse Proposals
                <ArrowRight className="h-4 w-4" />
              </motion.div>
            </Link>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown className="h-6 w-6 text-omnom-gold/40" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Live Stats Bar ───────────────────────────────────────── */}
      <section className="relative py-10 sm:py-12 border-y border-omnom-gold/[0.06] bg-omnom-surface/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard
              label="Total Holders"
              value={25431}
              icon={<Users className="h-5 w-5" />}
              trend={{ value: '+127 this week', positive: true }}
            />
            <StatCard
              label="Total Supply"
              value="1B $OMNOM"
              icon={<Zap className="h-5 w-5" />}
            />
            <StatCard
              label="Active Proposals"
              value={loading ? '...' : total}
              icon={<FileText className="h-5 w-5" />}
            />
            <StatCard
              label="DAO Members"
              value={1847}
              icon={<Vote className="h-5 w-5" />}
              trend={{ value: '+23 this month', positive: true }}
            />
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AnimatedSection className="text-center mb-14">
            <p className="text-xs font-semibold tracking-[0.15em] uppercase text-omnom-gold/60 mb-2">Getting Started</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-omnom-text mb-3 tracking-tight">
              How It <span className="text-gradient-gold">Works</span>
            </h2>
            <p className="text-omnom-text-secondary max-w-xl mx-auto">
              Get started in four simple steps. Connect, verify, vote, and shape the future of OMNOM.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StepCard
              step={1}
              icon={<Wallet className="h-7 w-7" />}
              title="Connect Wallet"
              description="Link your Web3 wallet to access the DAO platform and all governance features."
              index={0}
            />
            <StepCard
              step={2}
              icon={<ShieldCheck className="h-7 w-7" />}
              title="Verify Holdings"
              description="Verify your $OMNOM holdings to unlock voting power based on your holder class."
              index={1}
            />
            <StepCard
              step={3}
              icon={<Vote className="h-7 w-7" />}
              title="Vote on Proposals"
              description="Cast your vote using Quadratic Token Voting (QTV). Power scales with your holdings."
              index={2}
            />
            <StepCard
              step={4}
              icon={<Zap className="h-7 w-7" />}
              title="Shape the Future"
              description="Create proposals, participate in discussions, and directly govern the OMNOM ecosystem."
              index={3}
            />
          </div>
        </div>
      </section>

      {/* ── Recent Active Proposals ───────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-omnom-surface/20 border-y border-omnom-gold/[0.06]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AnimatedSection className="flex items-end justify-between mb-12">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-omnom-gold/60 mb-2">Governance</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-omnom-text mb-3 tracking-tight">
                Active <span className="text-gradient-gold">Proposals</span>
              </h2>
              <p className="text-omnom-text-secondary max-w-md">See what the community is voting on right now.</p>
            </div>
            <Link href="/proposals" className="hidden sm:flex items-center gap-1.5 rounded-full glass px-5 py-2.5 text-sm font-medium text-omnom-gold hover:bg-omnom-gold/10 hover:border-omnom-gold/20 transition-all">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </AnimatedSection>

          {loading ? (
            <LoadingSkeleton variant="card" count={3} />
          ) : proposals.length === 0 ? (
            <AnimatedSection delay={0.2}>
              <div className="text-center py-16 rounded-2xl bg-omnom-surface/40 border border-omnom-gold/10">
                <p className="text-omnom-muted">No active proposals at the moment.</p>
                <Link href="/proposals/create" className="mt-4 inline-block text-sm text-omnom-gold hover:underline py-3 px-4">
                  Create the first one →
                </Link>
              </div>
            </AnimatedSection>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {proposals.slice(0, 3).map((proposal: Proposal, i) => (
                <ProposalCard key={proposal.id} proposal={proposal} index={i} />
              ))}
            </div>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Link href="/proposals" className="inline-flex items-center gap-1.5 text-sm font-medium text-omnom-gold hover:underline py-3 px-4">
              View All Proposals <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Community Section ─────────────────────────────────────── */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <AnimatedSection>
            <motion.div
              className="inline-flex items-center justify-center mb-8 h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 ring-1 ring-blue-500/20"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg className="h-10 w-10 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.67-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.88 7.97-3.44 3.8-1.58 4.59-1.86 5.1-1.87.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z" />
              </svg>
            </motion.div>

            <h2 className="text-3xl sm:text-4xl font-bold text-omnom-text mb-4 tracking-tight">
              Join the <span className="text-gradient-gold">OMNOM</span> Community
            </h2>
            <p className="text-omnom-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed text-lg">
              Connect with fellow holders, discuss proposals, and stay up to date with the latest DAO developments.
              Our Telegram community is the heart of OMNOM governance.
            </p>

            <motion.a
              href="https://t.me/omnomdao"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-4 text-base font-bold text-white shadow-[0_0_30px_rgba(59,130,246,0.25)] hover:shadow-[0_0_50px_rgba(59,130,246,0.35)] transition-shadow duration-300"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.67-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.88 7.97-3.44 3.8-1.58 4.59-1.86 5.1-1.87.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z" />
              </svg>
              Join Telegram
              <ExternalLink className="h-4 w-4 opacity-60" />
            </motion.a>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-omnom-gold/10 bg-omnom-surface/30 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🐕</span>
              <span className="text-sm font-semibold text-gradient-gold">$OMNOM DAO</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-omnom-muted">
              <Link href="/proposals" className="py-3 px-1 hover:text-omnom-text transition-colors">
                Proposals
              </Link>
              <Link href="/dashboard" className="py-3 px-1 hover:text-omnom-text transition-colors">
                Dashboard
              </Link>
              <Link href="/verify" className="py-3 px-1 hover:text-omnom-text transition-colors">
                Verify
              </Link>
              <Link href="/settings" className="py-3 px-1 hover:text-omnom-text transition-colors">
                Settings
              </Link>
            </div>

            <p className="text-xs text-omnom-muted">
              Built with <span className="text-red-400">❤️</span> by the OMNOM Community
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-omnom-gold/5 text-center">
            <p className="text-xs text-omnom-muted/60">
              © {new Date().getFullYear()} $OMNOM DAO. All rights reserved. Decentralized governance for the people.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

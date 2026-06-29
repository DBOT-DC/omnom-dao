'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { loadDraft, saveDraft, clearDraft } from '@/lib/draft';
import type { ProposalType } from '@/types';
import {
  ArrowLeft,
  ArrowRight,
  Type,
  FileText,
  Clock,
  Check,
  AlertTriangle,
  Send,
  Loader2,
  RotateCcw,
} from 'lucide-react';

/* ── Constants ───────────────────────────────────────────────────── */

const PROPOSAL_TYPES: {
  value: ProposalType;
  label: string;
  emoji: string;
  description: string;
}[] = [
  {
    value: 'CHAIN_SELECTION',
    label: 'Chain Selection',
    emoji: '🔄',
    description: 'Propose which blockchain the protocol should deploy to or migrate between.',
  },
  {
    value: 'TREASURY',
    label: 'Treasury',
    emoji: '💰',
    description: 'Allocate, spend, or manage DAO treasury funds.',
  },
  {
    value: 'TOKENOMICS',
    label: 'Tokenomics',
    emoji: '📊',
    description: 'Modify token supply, distribution, or economic parameters.',
  },
  {
    value: 'COMMUNITY_GUIDELINE',
    label: 'Community Guidelines',
    emoji: '📜',
    description: 'Update or create community rules, guidelines, or standards.',
  },
  {
    value: 'TECHNICAL_SPEC',
    label: 'Technical Spec',
    emoji: '⚙️',
    description: 'Propose technical changes, upgrades, or new protocol features.',
  },
  {
    value: 'GENERAL',
    label: 'General',
    emoji: '💬',
    description: "Any other proposal that doesn't fit the above categories.",
  },
];

const STEP_ICONS = [Type, FileText, Clock, Check];
const STEP_LABELS = ['Type', 'Content', 'Parameters', 'Review'];

/* ── Component ──────────────────────────────────────────────────── */

export default function CreateProposalPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const userData = user as any;
  const isAuthenticated = userData?.authenticated;
  const isHolder = isAuthenticated && userData?.holder;

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState<ProposalType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tldr, setTldr] = useState('');
  const [votingDurationDays, setVotingDurationDays] = useState(7);
  const [quorumRequired, setQuorumRequired] = useState(20);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdProposalId, setCreatedProposalId] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const draftIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check for draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setHasDraft(true);
    }
    return () => {
      if (draftIntervalRef.current) clearInterval(draftIntervalRef.current);
    };
  }, []);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    draftIntervalRef.current = setInterval(() => {
      const hasContent = selectedType || title || description;
      if (hasContent) {
        saveDraft({
          type: selectedType || undefined,
          title: title || undefined,
          description: description || undefined,
          tldr: tldr || undefined,
          votingDurationDays,
          quorumRequired,
        });
        setHasDraft(true);
      }
    }, 30000);
    return () => {
      if (draftIntervalRef.current) clearInterval(draftIntervalRef.current);
    };
  }, [selectedType, title, description, tldr, votingDurationDays, quorumRequired]);

  /* ── Handlers (must be above conditional returns — Rules of Hooks) */

  const handleLoadDraft = useCallback(() => {
    const draft = loadDraft();
    if (draft) {
      if (draft.type) setSelectedType(draft.type as ProposalType);
      if (draft.title) setTitle(draft.title);
      if (draft.description) setDescription(draft.description);
      if (draft.tldr) setTldr(draft.tldr);
      if (draft.votingDurationDays) setVotingDurationDays(draft.votingDurationDays);
      if (draft.quorumRequired) setQuorumRequired(draft.quorumRequired);
      setHasDraft(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedType || !title || !description) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          title,
          description,
          tldr: tldr || undefined,
          votingDurationDays,
          quorumRequired,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create proposal');
      }

      const data = await res.json();
      clearDraft();
      setCreatedProposalId(data.id || data.proposalId);
      setShowSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create proposal');
    } finally {
      setSubmitting(false);
    }
  }, [selectedType, title, description, tldr, votingDurationDays, quorumRequired]);

  const canProceed = useCallback(
    () => {
      switch (currentStep) {
        case 1: return selectedType !== null;
        case 2: return title.trim().length > 0 && description.trim().length > 0;
        case 3: return true;
        default: return false;
      }
    },
    [currentStep, selectedType, title, description],
  );

  const handleNext = useCallback(() => {
    if (currentStep < 4) setCurrentStep((s) => s + 1);
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  /* ── Auth guards ─────────────────────────────────────────────── */

  if (!loading && !isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold text-omnom-text mb-3">Connect to Create</h1>
          <p className="text-omnom-muted mb-6">Please connect your wallet to create a proposal.</p>
          <Button onClick={() => router.push('/verify')} variant="gold" className="rounded-full px-8">
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  if (!loading && isAuthenticated && !isHolder) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-omnom-text mb-3">Holders Only</h2>
          <p className="text-omnom-muted mb-6">
            Only $OMNOM holders can create proposals. Verify your wallet to check eligibility.
          </p>
          <Button onClick={() => router.push('/verify')} variant="gold" className="rounded-full px-8">
            Verify Wallet
          </Button>
        </div>
      </div>
    );
  }

  /* ── Success view ─────────────────────────────────────────────── */

  if (showSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-omnom-text mb-3">Proposal Submitted!</h2>
          <p className="text-omnom-muted mb-6">
            Your proposal has been submitted for review. The community will be able to vote on it soon.
          </p>
          {createdProposalId && (
            <p className="text-xs text-omnom-muted mb-4 font-mono">ID: {createdProposalId}</p>
          )}
          <div className="flex gap-3 justify-center">
            <Button onClick={() => router.push('/proposals')} variant="gold" className="rounded-full px-6">
              View Proposals
            </Button>
            <Button onClick={() => {
              setShowSuccess(false);
              setSelectedType(null);
              setTitle('');
              setDescription('');
              setTldr('');
              setCurrentStep(1);
            }} variant="outline" className="rounded-full px-6">
              Create Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────────── */

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-omnom-text">Create Proposal</h1>
          <p className="text-sm text-omnom-muted mt-1">Submit a proposal for the community to vote on.</p>
        </div>
        {hasDraft && (
          <Button variant="outline" size="sm" onClick={handleLoadDraft} className="flex items-center gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Load Draft
          </Button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-10">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const Icon = STEP_ICONS[i];
          const isActive = currentStep === stepNum;
          const isComplete = currentStep > stepNum;
          return (
            <div key={label} className="flex items-center gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => { if (isComplete || isActive) setCurrentStep(stepNum); }}
                className={`flex items-center gap-2 rounded-full px-3 sm:px-4 py-2 text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-omnom-gold text-omnom-dark shadow-[0_0_16px_rgba(255,215,0,0.3)] scale-110'
                    : isComplete
                      ? 'bg-omnom-surface text-omnom-gold border border-omnom-gold/20'
                      : 'bg-omnom-surface text-omnom-muted border border-omnom-gold/10'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
              {i < STEP_LABELS.length - 1 && (
                <div className="hidden sm:block h-px w-8 bg-omnom-gold/10" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div>
        {/* Step 1: Choose type */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-omnom-text mb-6">Choose Proposal Type</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PROPOSAL_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => setSelectedType(pt.value)}
                  className={`text-left rounded-xl border p-5 transition-all ${
                    selectedType === pt.value
                      ? 'border-omnom-gold/50 bg-omnom-gold/5 ring-1 ring-omnom-gold/20'
                      : 'border-omnom-gold/10 bg-omnom-surface/40 hover:border-omnom-gold/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{pt.emoji}</span>
                    <div>
                      <h3 className="font-semibold text-omnom-text mb-1">{pt.label}</h3>
                      <p className="text-xs text-omnom-muted leading-relaxed">{pt.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Content */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-omnom-text mb-6">Proposal Content</h2>

            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium text-omnom-text">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Clear, concise title for your proposal"
                maxLength={200}
                className="w-full rounded-xl border border-omnom-gold/10 bg-omnom-surface/40 px-4 py-3 text-sm text-omnom-text placeholder:text-omnom-muted/50 focus:border-omnom-gold/30 focus:outline-none focus:ring-1 focus:ring-omnom-gold/20 transition-colors"
              />
              <p className="text-xs text-omnom-muted">{title.length}/200</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-medium text-omnom-text">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of your proposal. Explain the problem, your solution, and expected impact."
                rows={8}
                maxLength={10000}
                className="w-full rounded-xl border border-omnom-gold/10 bg-omnom-surface/40 px-4 py-3 text-sm text-omnom-text placeholder:text-omnom-muted/50 focus:border-omnom-gold/30 focus:outline-none focus:ring-1 focus:ring-omnom-gold/20 transition-colors resize-none"
              />
              <p className="text-xs text-omnom-muted">{description.length}/10,000</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="tldr" className="block text-sm font-medium text-omnom-text">
                TL;DR <span className="text-omnom-muted font-normal">(optional)</span>
              </label>
              <input
                id="tldr"
                type="text"
                value={tldr}
                onChange={(e) => setTldr(e.target.value)}
                placeholder="One-sentence summary"
                maxLength={280}
                className="w-full rounded-xl border border-omnom-gold/10 bg-omnom-surface/40 px-4 py-3 text-sm text-omnom-text placeholder:text-omnom-muted/50 focus:border-omnom-gold/30 focus:outline-none focus:ring-1 focus:ring-omnom-gold/20 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Step 3: Parameters */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-omnom-text mb-6">Voting Parameters</h2>

            <div className="space-y-2">
              <label htmlFor="duration" className="block text-sm font-medium text-omnom-text">
                Voting Duration (days)
              </label>
              <input
                id="duration"
                type="number"
                min={1}
                max={30}
                value={votingDurationDays}
                onChange={(e) => setVotingDurationDays(Math.max(1, Math.min(30, Number(e.target.value))))}
                className="w-full rounded-xl border border-omnom-gold/10 bg-omnom-surface/40 px-4 py-3 text-sm text-omnom-text focus:border-omnom-gold/30 focus:outline-none focus:ring-1 focus:ring-omnom-gold/20 transition-colors"
              />
              <p className="text-xs text-omnom-muted">Between 1 and 30 days. Default: 7 days.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="quorum" className="block text-sm font-medium text-omnom-text">
                Quorum Required (%)
              </label>
              <input
                id="quorum"
                type="number"
                min={1}
                max={100}
                value={quorumRequired}
                onChange={(e) => setQuorumRequired(Math.max(1, Math.min(100, Number(e.target.value))))}
                className="w-full rounded-xl border border-omnom-gold/10 bg-omnom-surface/40 px-4 py-3 text-sm text-omnom-text focus:border-omnom-gold/30 focus:outline-none focus:ring-1 focus:ring-omnom-gold/20 transition-colors"
              />
              <p className="text-xs text-omnom-muted">
                Minimum voter participation required for the vote to be valid. Default: 20%.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-omnom-text mb-6">Review Proposal</h2>

            <div className="rounded-xl border border-omnom-gold/10 bg-omnom-surface/40 p-6 space-y-4">
              <div>
                <p className="text-xs text-omnom-muted uppercase tracking-wider mb-1">Type</p>
                <p className="text-sm font-medium text-omnom-text">
                  {PROPOSAL_TYPES.find((t) => t.value === selectedType)?.emoji}{' '}
                  {PROPOSAL_TYPES.find((t) => t.value === selectedType)?.label}
                </p>
              </div>
              <div>
                <p className="text-xs text-omnom-muted uppercase tracking-wider mb-1">Title</p>
                <p className="text-sm font-medium text-omnom-text">{title}</p>
              </div>
              <div>
                <p className="text-xs text-omnom-muted uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm text-omnom-muted whitespace-pre-wrap">{description}</p>
              </div>
              {tldr && (
                <div>
                  <p className="text-xs text-omnom-muted uppercase tracking-wider mb-1">TL;DR</p>
                  <p className="text-sm text-omnom-text">{tldr}</p>
                </div>
              )}
              <div className="flex gap-8">
                <div>
                  <p className="text-xs text-omnom-muted uppercase tracking-wider mb-1">Duration</p>
                  <p className="text-sm text-omnom-text">{votingDurationDays} days</p>
                </div>
                <div>
                  <p className="text-xs text-omnom-muted uppercase tracking-wider mb-1">Quorum</p>
                  <p className="text-sm text-omnom-text">{quorumRequired}%</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-omnom-gold/10">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 1}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            currentStep === 1
              ? 'text-omnom-muted/30 cursor-not-allowed'
              : 'text-omnom-muted hover:text-omnom-text'
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {currentStep < 4 ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            variant="gold"
            className="rounded-xl px-6 font-semibold"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            variant="gold"
            className="rounded-xl px-6 font-semibold"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Proposal
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

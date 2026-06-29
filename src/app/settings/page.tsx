'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  User,
  Shield,
  Bell,
  Wallet,
  LogOut,
  Save,
  Plus,
  Check,
  X,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { HolderBadge } from '@/components/ui/HolderBadge';

// ── Types ──────────────────────────────────────────────────────────────
interface ProfileData {
  displayName: string | null;
  privacyFlags: {
    showHolderRank: boolean;
    showBalance: boolean;
    showVotingHistory: boolean;
  };
  notificationPreferences: {
    newProposals: boolean;
    voteAlerts: boolean;
    proposalOutcomes: boolean;
    commentReplies: boolean;
  };
  wallets: Array<{
    id: string;
    wallet_address: string;
    is_primary: boolean;
  }>;
}

// ── Toggle Switch Component ────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-omnom-text">{label}</p>
        {description && <p className="text-xs text-omnom-muted mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 ${
          checked
            ? 'bg-omnom-gold border-omnom-gold'
            : 'bg-omnom-surface border-omnom-gold/20'
        }`}
      >
        <motion.span
          animate={{ x: checked ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="inline-block h-5 w-5 rounded-full bg-omnom-dark shadow-sm"
        />
      </button>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────
function SettingsSection({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-omnom-gold/10 bg-omnom-surface/60 p-6 ${className || ''}`}
    >
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-omnom-gold/10">
        {icon}
        <h2 className="text-lg font-semibold text-omnom-text">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

// ── Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData>({
    displayName: null,
    privacyFlags: { showHolderRank: true, showBalance: false, showVotingHistory: true },
    notificationPreferences: {
      newProposals: true,
      voteAlerts: true,
      proposalOutcomes: true,
      commentReplies: false,
    },
    wallets: [],
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const userData = user as any;
  const isAuthenticated = userData?.authenticated;

  // Fetch profile data
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          setProfile({
            displayName: data.displayName || null,
            privacyFlags: {
              showHolderRank: data.privacyFlags?.showHolderRank ?? true,
              showBalance: data.privacyFlags?.showBalance ?? false,
              showVotingHistory: data.privacyFlags?.showVotingHistory ?? true,
            },
            notificationPreferences: {
              newProposals: data.notificationPreferences?.newProposals ?? true,
              voteAlerts: data.notificationPreferences?.voteAlerts ?? true,
              proposalOutcomes: data.notificationPreferences?.proposalOutcomes ?? true,
              commentReplies: data.notificationPreferences?.commentReplies ?? false,
            },
            wallets: data.wallets || [],
          });
        }
      } catch {
        // skip
      }
    };
    fetchProfile();
  }, [isAuthenticated]);

  // Save profile
  const saveProfile = useCallback(async (partial?: Partial<ProfileData>) => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const payload = { ...profile, ...partial };
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setProfile((prev) => ({ ...prev, ...partial }));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch {
      // skip
    } finally {
      setSaving(false);
    }
  }, [profile]);

  // Disconnect wallet
  const handleDisconnect = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch {
      // skip
    }
  }, [router]);

  // Not authenticated
  if (!loading && !isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold text-omnom-text mb-3">Connect to Access Settings</h1>
          <p className="text-omnom-muted mb-6">Please connect your wallet to manage your profile settings.</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-omnom-gold/10 bg-omnom-surface/60 p-6">
            <div className="animate-pulse h-6 w-40 rounded bg-omnom-gold/10 mb-4" />
            <div className="animate-pulse h-4 w-full rounded bg-omnom-gold/10" />
            <div className="animate-pulse h-4 w-3/4 rounded bg-omnom-gold/10 mt-2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 space-y-6"
    >
      <div className="mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-omnom-text">Settings</h1>
        <p className="text-sm text-omnom-muted mt-1">Manage your profile, privacy, and preferences.</p>
      </div>

      {/* ── Profile Section ─────────────────────────────────────── */}
      <SettingsSection
        title="Profile"
        icon={<User className="h-5 w-5 text-omnom-gold" />}
      >
        <div className="space-y-4">
          {/* Wallet address */}
          <div className="flex items-center justify-between py-3 border-b border-omnom-gold/5">
            <div>
              <p className="text-sm font-medium text-omnom-text">Wallet Address</p>
              <p className="font-mono text-xs text-omnom-muted mt-0.5">
                {userData?.address || 'Not connected'}
              </p>
            </div>
            {userData?.holder?.class && (
              <HolderBadge holderClass={userData.holder.class} rank={userData.holder.rank} size="sm" />
            )}
          </div>

          {/* Display name */}
          <div className="py-3">
            <p className="text-sm font-medium text-omnom-text mb-2">Display Name</p>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter display name..."
                  maxLength={30}
                  className="flex-1 rounded-lg border border-omnom-gold/20 bg-omnom-dark px-3 py-2 text-sm text-omnom-text placeholder:text-omnom-muted/50 focus:border-omnom-gold/50 focus:outline-none focus:ring-1 focus:ring-omnom-gold/30"
                  autoFocus
                />
                <button
                  onClick={() => {
                    saveProfile({ displayName: nameInput || null });
                    setEditingName(false);
                  }}
                  className="flex items-center justify-center h-9 w-9 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setNameInput(profile.displayName || '');
                    setEditingName(false);
                  }}
                  className="flex items-center justify-center h-9 w-9 rounded-lg bg-omnom-surface text-omnom-muted hover:text-omnom-text transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => {
                  setNameInput(profile.displayName || '');
                  setEditingName(true);
                }}
                className="cursor-pointer flex items-center justify-between rounded-lg border border-omnom-gold/10 bg-omnom-surface/50 px-3 py-2 hover:border-omnom-gold/20 transition-colors"
              >
                <span className="text-sm text-omnom-text">
                  {profile.displayName || (
                    <span className="text-omnom-muted italic">Add a display name...</span>
                  )}
                </span>
                <span className="text-xs text-omnom-muted">Click to edit</span>
              </div>
            )}
          </div>
        </div>
      </SettingsSection>

      {/* ── Privacy Section ───────────────────────────────────── */}
      <SettingsSection
        title="Privacy"
        icon={<Shield className="h-5 w-5 text-omnom-purple" />}
      >
        <div className="divide-y divide-omnom-gold/5">
          <Toggle
            checked={profile.privacyFlags.showHolderRank}
            onChange={(v) =>
              saveProfile({
                privacyFlags: { ...profile.privacyFlags, showHolderRank: v },
              })
            }
            label="Show Holder Rank"
            description="Display your holder rank on your public profile"
          />
          <Toggle
            checked={profile.privacyFlags.showBalance}
            onChange={(v) =>
              saveProfile({
                privacyFlags: { ...profile.privacyFlags, showBalance: v },
              })
            }
            label="Show Balance Publicly"
            description="Allow others to see your $OMNOM token balance"
          />
          <Toggle
            checked={profile.privacyFlags.showVotingHistory}
            onChange={(v) =>
              saveProfile({
                privacyFlags: { ...profile.privacyFlags, showVotingHistory: v },
              })
            }
            label="Show Voting History"
            description="Make your past votes visible on your profile"
          />
        </div>
      </SettingsSection>

      {/* ── Wallet Management ──────────────────────────────────── */}
      <SettingsSection
        title="Wallet Management"
        icon={<Wallet className="h-5 w-5 text-blue-400" />}
      >
        <div className="space-y-3">
          {profile.wallets.length > 0 ? (
            <div className="space-y-2">
              {profile.wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="flex items-center justify-between rounded-lg border border-omnom-gold/10 bg-omnom-surface/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-omnom-gold/20 to-omnom-purple/20 ring-1 ring-omnom-gold/10 font-mono text-xs font-bold text-omnom-gold">
                      {wallet.wallet_address.slice(2, 4).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-mono text-sm text-omnom-text">
                        {wallet.wallet_address.slice(0, 10)}...{wallet.wallet_address.slice(-6)}
                      </p>
                      {wallet.is_primary && (
                        <span className="text-[10px] font-semibold text-omnom-gold uppercase tracking-wider">
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-omnom-muted">No additional wallets linked.</p>
          )}

          <button className="flex items-center gap-2 text-sm text-omnom-muted hover:text-omnom-gold transition-colors mt-2">
            <Plus className="h-4 w-4" />
            Add Wallet
          </button>
        </div>
      </SettingsSection>

      {/* ── Notification Preferences ────────────────────────────── */}
      <SettingsSection
        title="Notification Preferences"
        icon={<Bell className="h-5 w-5 text-amber-400" />}
      >
        <div className="divide-y divide-omnom-gold/5">
          <Toggle
            checked={profile.notificationPreferences.newProposals}
            onChange={(v) =>
              saveProfile({
                notificationPreferences: { ...profile.notificationPreferences, newProposals: v },
              })
            }
            label="New Proposals"
            description="Get notified when a new proposal is created"
          />
          <Toggle
            checked={profile.notificationPreferences.voteAlerts}
            onChange={(v) =>
              saveProfile({
                notificationPreferences: { ...profile.notificationPreferences, voteAlerts: v },
              })
            }
            label="Vote Alerts"
            description="Receive alerts when proposals you voted on are closing"
          />
          <Toggle
            checked={profile.notificationPreferences.proposalOutcomes}
            onChange={(v) =>
              saveProfile({
                notificationPreferences: { ...profile.notificationPreferences, proposalOutcomes: v },
              })
            }
            label="Proposal Outcomes"
            description="Get notified when proposals you voted on pass or fail"
          />
          <Toggle
            checked={profile.notificationPreferences.commentReplies}
            onChange={(v) =>
              saveProfile({
                notificationPreferences: { ...profile.notificationPreferences, commentReplies: v },
              })
            }
            label="Comment Replies"
            description="Receive notifications when someone replies to your comments"
          />
        </div>
      </SettingsSection>

      {/* ── Danger Zone ───────────────────────────────────────── */}
      <SettingsSection
        title="Danger Zone"
        icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
        className="border-red-500/20"
      >
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-omnom-text">Disconnect Wallet</p>
            <p className="text-xs text-omnom-muted mt-0.5">
              Disconnect your wallet and sign out of the platform
            </p>
          </div>

          {showDisconnect ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Confirm
              </button>
              <button
                onClick={() => setShowDisconnect(false)}
                className="flex items-center justify-center h-9 w-9 rounded-lg bg-omnom-surface text-omnom-muted hover:text-omnom-text transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDisconnect(true)}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Disconnect
            </button>
          )}
        </div>
      </SettingsSection>

      {/* Save status */}
      {saveSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-emerald-500/90 px-5 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          <Check className="h-4 w-4" />
          Settings saved
        </motion.div>
      )}
    </motion.div>
  );
}

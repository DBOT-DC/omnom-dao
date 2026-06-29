export interface DraftData {
  type?: string;  // ProposalType serialized as string
  title?: string;
  description?: string;
  tldr?: string;
  votingDurationDays?: number;
  quorumRequired?: number;
  savedAt?: number;
}

const DRAFT_KEY = 'omnom-dao-proposal-draft';

export function loadDraft(): DraftData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveDraft(data: DraftData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {
    // storage full or unavailable
  }
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DRAFT_KEY);
}

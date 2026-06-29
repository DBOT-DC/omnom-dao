import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Holder, HolderClass } from '@/types';

// ── Constants ──────────────────────────────────────────────────────────

const OMNOM_DECIMALS = 18;

// ── Types ──────────────────────────────────────────────────────────────

export interface HolderRaw {
  address: string;
  rank: number;
  balance: string;
  percentage: number;
  class: string;
}

// ── In-Memory Holder Cache ─────────────────────────────────────────────

let holdersMap: Map<string, Holder> | null = null;

/**
 * Loads the frozen holder snapshot from the public data directory.
 * Cached in-memory for the lifetime of the process.
 */
export function loadHolders(): Map<string, Holder> {
  if (holdersMap) return holdersMap;

  const filePath = join(process.cwd(), 'public', 'data', 'holders.json');
  const raw = JSON.parse(readFileSync(filePath, 'utf-8')) as HolderRaw[];

  holdersMap = new Map();
  for (const h of raw) {
    holdersMap.set(h.address.toLowerCase(), {
      address: h.address,
      rank: h.rank,
      balance: h.balance,
      percentage: h.percentage,
      class: h.class.toUpperCase() as HolderClass,
    });
  }

  return holdersMap;
}

/**
 * Look up a holder by wallet address (case-insensitive).
 */
export function lookupHolder(address: string): Holder | null {
  const map = loadHolders();
  return map.get(address.toLowerCase()) ?? null;
}

// ── QTV Voting Power ───────────────────────────────────────────────────

/**
 * Calculates quadratic voting power from a raw token balance.
 *
 * Formula: floor(sqrt(balanceRaw / 10^18))
 *
 * This gives larger holders disproportionately less power per token
 * while ensuring every holder has at least 1 vote unit.
 *
 * @param balanceRaw - Raw token amount (with 18 decimals)
 * @returns Integer voting power units
 */
export function calculateVotingPower(balanceRaw: number): number {
  if (balanceRaw <= 0) return 0;

  const normalized = balanceRaw / Math.pow(10, OMNOM_DECIMALS);
  const power = Math.floor(Math.sqrt(normalized));

  return Math.max(power, 1); // Minimum 1 vote unit for any non-zero balance
}

/**
 * Classifies a holder based on their percentage of total supply.
 *
 * - WHALE:    >= 1.00%
 * - DOLPHIN:  >= 0.01%
 * - FISH:     < 0.01%
 */
export function getHolderClass(percentage: number): HolderClass {
  if (percentage >= 1.0) return 'WHALE';
  if (percentage >= 0.01) return 'DOLPHIN';
  return 'FISH';
}

/**
 * Returns a visual emoji indicator for a holder class.
 */
export function getHolderEmoji(holderClass: HolderClass): string {
  switch (holderClass) {
    case 'WHALE':
      return '🐋';
    case 'DOLPHIN':
      return '🐬';
    case 'FISH':
      return '🐟';
  }
}

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { randomBytes, randomUUID } from 'node:crypto';
import { lookupHolder, calculateVotingPower } from './holders';

// ── Constants ──────────────────────────────────────────────────────────

const _rawSecret = process.env.JWT_SECRET;
if (!_rawSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
if (!_rawSecret) {
  console.warn('⚠️  Using fallback JWT_SECRET — set JWT_SECRET env var for production!');
}
const JWT_SECRET = new TextEncoder().encode(
  _rawSecret || 'dev-secret-change-me-in-production'
);
export const COOKIE_NAME = 'omnom_token';

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

// ── Nonce Store (in-memory, TTL 5 min) ────────────────────────────────

interface NonceEntry {
  createdAt: number;
}

const NONCE_TTL = 5 * 60 * 1000; // 5 minutes
const nonceStore = new Map<string, NonceEntry>();

function cleanExpiredNonces() {
  const now = Date.now();
  for (const [key, entry] of nonceStore) {
    if (now - entry.createdAt > NONCE_TTL) {
      nonceStore.delete(key);
    }
  }
}

/**
 * Generate a one-time nonce for wallet signature verification.
 */
export function generateNonce(): string {
  cleanExpiredNonces();
  const nonce = randomBytes(16).toString('hex');
  nonceStore.set(nonce, { createdAt: Date.now() });
  return nonce;
}

/**
 * Consume a nonce — returns true only if valid and not expired.
 */
export function consumeNonce(nonce: string): boolean {
  const entry = nonceStore.get(nonce);
  if (!entry) return false;
  if (Date.now() - entry.createdAt > NONCE_TTL) {
    nonceStore.delete(nonce);
    return false;
  }
  nonceStore.delete(nonce);
  return true;
}

// ── JWT Helpers ────────────────────────────────────────────────────────

export interface OmnomJwtPayload extends JWTPayload {
  sub: string;                   // wallet address (lowercase)
  holder: boolean;
  holderClass: string | null;
  balance: string | null;
  rank: number | null;
  votingPower: number;
  delegatedFrom: string | null;  // address this user received delegation from
  delegatedTo: string | null;    // address this user delegated voting to
}

/**
 * Generate a JWT session token for an authenticated wallet.
 *
 * Looks up the holder from the frozen snapshot and computes
 * quadratic voting power using the QTV formula.
 */
export async function generateToken(address: string): Promise<string> {
  const holder = lookupHolder(address);

  const now = Math.floor(Date.now() / 1000);

  // Compute voting power from raw balance
  let votingPower = 0;
  if (holder) {
    const balanceRaw = Number(holder.balance);
    votingPower = calculateVotingPower(Number(balanceRaw));
  }

  const payload: OmnomJwtPayload = {
    sub: address.toLowerCase(),
    iat: now,
    exp: now + SESSION_TTL,
    holder: !!holder,
    holderClass: holder?.class.toUpperCase() ?? null,
    balance: holder?.balance ?? null,
    rank: holder?.rank ?? null,
    votingPower,
    delegatedFrom: null,
    delegatedTo: null,
  };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .sign(JWT_SECRET);
}

/**
 * Verify a JWT token and return its payload, or null if invalid/expired.
 */
export async function verifyToken(token: string): Promise<OmnomJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as OmnomJwtPayload;
  } catch {
    return null;
  }
}

/**
 * Get the current session from the cookie store.
 * Returns null if no valid session exists.
 */
export async function getSession(): Promise<OmnomJwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export { randomUUID };

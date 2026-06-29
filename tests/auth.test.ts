/**
 * Auth Logic Tests
 *
 * Tests nonce generation, consumption, and TTL expiry logic.
 * Pure logic tests — no Next.js dependencies.
 *
 * Run: npx tsx tests/auth.test.ts
 */

import { randomBytes } from 'node:crypto';

// ── Inline-extracted auth logic (from src/lib/auth.ts) ──

const NONCE_TTL = 5 * 60 * 1000; // 5 minutes

interface NonceEntry {
  createdAt: number;
}

const nonceStore = new Map<string, NonceEntry>();

// Patchable Date.now for TTL tests
let _mockNow: number | null = null;
function now(): number {
  return _mockNow ?? Date.now();
}

function cleanExpiredNonces() {
  const current = now();
  for (const [key, entry] of nonceStore) {
    if (current - entry.createdAt > NONCE_TTL) {
      nonceStore.delete(key);
    }
  }
}

function generateNonce(): string {
  cleanExpiredNonces();
  const nonce = randomBytes(16).toString('hex');
  nonceStore.set(nonce, { createdAt: now() });
  return nonce;
}

function consumeNonce(nonce: string): boolean {
  const entry = nonceStore.get(nonce);
  if (!entry) return false;
  if (now() - entry.createdAt > NONCE_TTL) {
    nonceStore.delete(nonce);
    return false;
  }
  nonceStore.delete(nonce);
  return true;
}

// ── Test harness ──

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
    failures.push(label);
  }
}

function assertEquals<T>(actual: T, expected: T, label: string) {
  assert(actual === expected, `${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ── Tests ──

console.log('\n=== Auth Nonce Tests ===\n');

// 1. generateNonce returns 32-char hex string
console.log('1. Nonce format:');
const nonce1 = generateNonce();
assert(nonce1.length === 32, `Nonce length is 32 (got ${nonce1.length})`);
assert(/^[0-9a-f]{32}$/.test(nonce1), 'Nonce is lowercase hex');
console.log(`     Sample nonce: ${nonce1}`);

// 2. Each nonce is unique
console.log('2. Nonce uniqueness:');
const nonces = new Set<string>();
nonces.add(nonce1); // Include nonce from test 1
for (let i = 0; i < 100; i++) {
  nonces.add(generateNonce());
}
assertEquals(nonces.size, 101, '101 nonces (1 prior + 100 new) are all unique');

// 3. consumeNonce returns true for valid nonce
console.log('3. Valid nonce consumption:');
const freshNonce = generateNonce();
assert(consumeNonce(freshNonce), 'consumeNonce returns true for fresh nonce');

// 4. consumeNonce returns false after consumption (one-time use)
console.log('4. Double consumption:');
const doubleNonce = generateNonce();
assert(consumeNonce(doubleNonce), 'First consumption returns true');
assertEquals(consumeNonce(doubleNonce), false, 'Second consumption returns false (already consumed)');

// 5. consumeNonce returns false for unknown nonce
console.log('5. Unknown nonce:');
assertEquals(consumeNonce('00000000000000000000000000000000'), false, 'Unknown nonce returns false');
assertEquals(consumeNonce('deadbeefdeadbeefdeadbeefdeadbeef'), false, 'Random hex string returns false');
assertEquals(consumeNonce(''), false, 'Empty string returns false');

// 6. Nonce TTL: expired nonces are rejected
console.log('6. Nonce TTL expiry:');
_mockNow = 1000000;
const ttlNonce = generateNonce(); // createdAt = 1000000
_mockNow = 1000000 + NONCE_TTL + 1; // Move past TTL
assertEquals(consumeNonce(ttlNonce), false, 'Expired nonce returns false');
_mockNow = null;

// 7. Nonce at exact TTL boundary is still valid
console.log('7. TTL boundary:');
_mockNow = 2000000;
const boundaryNonce = generateNonce(); // createdAt = 2000000
_mockNow = 2000000 + NONCE_TTL; // Exactly at TTL (not past it)
assert(consumeNonce(boundaryNonce), 'Nonce at exact TTL boundary is still valid');
_mockNow = null;

// 8. Nonce TTL: just past boundary is rejected
console.log('8. TTL boundary + 1ms:');
_mockNow = 3000000;
const boundaryNonce2 = generateNonce(); // createdAt = 3000000
_mockNow = 3000000 + NONCE_TTL + 1;
assertEquals(consumeNonce(boundaryNonce2), false, 'Nonce 1ms past TTL is rejected');
_mockNow = null;

// 9. cleanExpiredNonces removes old nonces from store
console.log('9. Expired nonce cleanup:');
// Set mock time far in the future so all previous real-time nonces are expired
_mockNow = 9000000000000; // year ~2275
const cleanupNonce1 = generateNonce(); // createdAt = 9000000000000
_mockNow = 9000000000000 + NONCE_TTL + 100000;
const cleanupNonce2 = generateNonce(); // createdAt = 9000000000000 + TTL + 100000, cleans up cleanupNonce1
assertEquals(nonceStore.size, 1, `Store has 1 nonce after cleanup (expired prior nonces cleaned)`);
_mockNow = null;

// 10. Nonce consumed between generation and TTL is valid
console.log('10. Fresh nonce consumption timing:');
const freshForTime = generateNonce();
// With real time (no mock), should be valid
assert(consumeNonce(freshForTime), 'Real-time nonce is consumable');

// 11. Multiple concurrent nonces can coexist
console.log('11. Multiple concurrent nonces:');
_mockNow = 9000000;
const c1 = generateNonce();
const c2 = generateNonce();
const c3 = generateNonce();
assert(nonceStore.size >= 3, `${nonceStore.size} nonces in store`);
assert(consumeNonce(c2), 'Consume middle nonce succeeds');
assert(consumeNonce(c1), 'Consume first nonce succeeds');
assertEquals(consumeNonce(c2), false, 'Already-consumed middle nonce returns false');
assert(consumeNonce(c3), 'Consume last nonce succeeds');
_mockNow = null;

// ── Summary ──
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f}`));
}
console.log(failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
process.exit(failed === 0 ? 0 : 1);

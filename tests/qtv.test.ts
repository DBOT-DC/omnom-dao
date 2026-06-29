/**
 * QTV (Quadratic Token Voting) — Voting Power Calculation Tests
 *
 * Tests the core formula: floor(sqrt(balanceRaw / 10^18))
 * with minimum of 1 vote unit for any non-zero balance.
 *
 * Run: npx tsx tests/qtv.test.ts
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── Inline-extracted function under test (from src/lib/holders.ts) ──

const OMNOM_DECIMALS = 18;

function calculateVotingPower(balanceRaw: number): number {
  if (balanceRaw <= 0) return 0;

  const normalized = balanceRaw / Math.pow(10, OMNOM_DECIMALS);
  const power = Math.floor(Math.sqrt(normalized));

  return Math.max(power, 1); // Minimum 1 vote unit for any non-zero balance
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

function assertEquals(actual: number, expected: number, label: string) {
  assert(actual === expected, `${label} — expected ${expected}, got ${actual}`);
}

// ── Tests ──

console.log('\n=== QTV Voting Power Tests ===\n');

// 1. Minimum non-zero balance → 1
console.log('1. Minimum voting power:');
assertEquals(calculateVotingPower(1 * 1e18), 1, '1 OMNOM → 1 voting power');

// 2. 100 OMNOM → sqrt(100) = 10
console.log('2. 100 tokens:');
assertEquals(calculateVotingPower(100 * 1e18), 10, '100 OMNOM → 10 voting power');

// 3. 1,000,000 OMNOM → sqrt(1,000,000) = 1000
console.log('3. Large holder:');
assertEquals(calculateVotingPower(1_000_000 * 1e18), 1000, '1M OMNOM → 1000 voting power');

// 4. Zero balance → 0
console.log('4. Zero balance:');
assertEquals(calculateVotingPower(0), 0, '0 balance → 0 voting power');

// 5. Negative balance → 0 (edge case)
console.log('5. Negative balance:');
assertEquals(calculateVotingPower(-100 * 1e18), 0, 'negative balance → 0 voting power');

// 6. Very small non-zero balance (< 1 full token) → still 1
console.log('6. Fractional token (wei):');
assertEquals(calculateVotingPower(1), 1, '1 wei → 1 voting power (minimum)');
assertEquals(calculateVotingPower(500_000), 1, '0.0005 OMNOM → 1 voting power (minimum)');

// 7. Quadratic dampening: 10,000 tokens → 100 (not 10,000)
console.log('7. Quadratic dampening:');
assertEquals(calculateVotingPower(10_000 * 1e18), 100, '10K OMNOM → 100 (not 10K — quadratic!)');

// 8. 4 tokens → 2
console.log('8. Exact square:');
assertEquals(calculateVotingPower(4 * 1e18), 2, '4 OMNOM → 2 voting power');

// 9. 9 tokens → 3
assertEquals(calculateVotingPower(9 * 1e18), 3, '9 OMNOM → 3 voting power');

// 10. Non-perfect square: 2 tokens → floor(sqrt(2)) = 1
console.log('10. Non-perfect square:');
assertEquals(calculateVotingPower(2 * 1e18), 1, '2 OMNOM → 1 (floor(sqrt(2))=1)');
assertEquals(calculateVotingPower(50 * 1e18), 7, '50 OMNOM → 7 (floor(sqrt(50))=7)');

// 11. Verify against Vitalik's actual balance from the holder snapshot
console.log('11. Real-world: Vitalik (rank 1):');
try {
  const holdersPath = join(process.cwd(), 'public', 'data', 'holders.json');
  const raw = JSON.parse(readFileSync(holdersPath, 'utf-8')) as Array<{
    address: string;
    rank: number;
    balance: string;
  }>;
  const vitalik = raw.find(h => h.address.toLowerCase() === '0xab5801a7d398351b8be11c439e05c5b3259aec9b');
  if (vitalik) {
    // Balance is a decimal string like "689000000671370.375000000000000000"
    // representing human-readable OMNOM. Convert to raw wei (× 10^18).
    const humanBalance = parseFloat(vitalik.balance);
    const balanceWei = humanBalance * 1e18;
    const vp = calculateVotingPower(balanceWei);
    const expectedVP = Math.max(1, Math.floor(Math.sqrt(humanBalance)));
    console.log(`     Vitalik balance: ${vitalik.balance} OMNOM`);
    console.log(`     Human-readable: ${humanBalance} OMNOM`);
    console.log(`     Voting power: ${vp}`);
    console.log(`     Expected VP: floor(sqrt(${humanBalance})) = ${expectedVP}`);
    assert(vp >= 1, `Vitalik voting power ${vp} >= 1`);
    // VP = floor(sqrt(humanBalance)) since dividing by 1e18 then sqrt gives sqrt(humanBalance)
    assertEquals(vp, expectedVP, `Vitalik VP = floor(sqrt(balance)) = ${expectedVP}`);
  } else {
    console.log('  ⚠️  Vitalik not found in snapshot — skipping real-world test');
  }
} catch (err) {
  console.log('  ⚠️  Could not load holders.json — skipping real-world test');
}

// 12. Verify monotonicity: more tokens = more or equal voting power
console.log('12. Monotonicity:');
for (let i = 1; i <= 100; i++) {
  const a = calculateVotingPower(i * 1e18);
  const b = calculateVotingPower((i + 1) * 1e18);
  assert(b >= a, `VP(${i})=${a} ≤ VP(${i + 1})=${b}`);
}

// ── Summary ──
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f}`));
}
console.log(failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
process.exit(failed === 0 ? 0 : 1);

/**
 * Holder Snapshot Lookup Tests
 *
 * Tests holder loading, case-insensitive lookup, and class classification.
 *
 * Run: npx tsx tests/holder-lookup.test.ts
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ── Inline-extracted functions under test (from src/lib/holders.ts) ──

interface Holder {
  address: string;
  rank: number;
  balance: string;
  percentage: number;
  class: 'WHALE' | 'DOLPHIN' | 'FISH';
}

interface HolderRaw {
  address: string;
  rank: number;
  balance: string;
  percentage: number;
  class: string;
}

let holdersMap: Map<string, Holder> | null = null;

function loadHolders(): Map<string, Holder> {
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
      class: h.class.toUpperCase() as 'WHALE' | 'DOLPHIN' | 'FISH',
    });
  }

  return holdersMap;
}

function lookupHolder(address: string): Holder | null {
  const map = loadHolders();
  return map.get(address.toLowerCase()) ?? null;
}

type HolderClass = 'WHALE' | 'DOLPHIN' | 'FISH';

function getHolderClass(percentage: number): HolderClass {
  if (percentage >= 1.0) return 'WHALE';
  if (percentage >= 0.01) return 'DOLPHIN';
  return 'FISH';
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

console.log('\n=== Holder Lookup Tests ===\n');

// 1. loadHolders returns Map with expected entry count
console.log('1. loadHolders():');
const holders = loadHolders();
assertEquals(holders.size, 25431, 'Map contains 25431 entries');
assert(holders instanceof Map, 'Returns a Map instance');

// 2. lookupHolder with valid address returns holder data
console.log('2. Valid address lookup:');
const vitalik = lookupHolder('0xab5801a7d398351b8be11c439e05c5b3259aec9b');
assert(vitalik !== null, 'Vitalik found in snapshot');
if (vitalik) {
  assertEquals(vitalik.rank, 1, 'Vitalik rank = 1');
  assertEquals(vitalik.class, 'WHALE', 'Vitalik class = WHALE');
  assert(vitalik.balance.length > 0, 'Vitalik has balance');
  assert(vitalik.percentage > 0, 'Vitalik has positive percentage');
  assert(vitalik.address.startsWith('0x'), 'Vitalik address has 0x prefix');
  console.log(`     Rank: ${vitalik.rank}, Balance: ${vitalik.balance}, Class: ${vitalik.class}`);
}

// 3. lookupHolder with invalid/unknown address returns null
console.log('3. Invalid address lookup:');
assertEquals(lookupHolder('0x0000000000000000000000000000000000000000'), null, 'Zero address returns null');
assertEquals(lookupHolder('0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'), null, 'Deadbeef address returns null');
assertEquals(lookupHolder('not-an-address'), null, 'Non-address string returns null');
assertEquals(lookupHolder(''), null, 'Empty string returns null');

// 4. Case insensitive lookup
console.log('4. Case insensitive lookup:');
const vitalikUpper = lookupHolder('0xAB5801A7D398351B8BE11C439E05C5B3259AEC9B');
assert(vitalikUpper !== null, 'Uppercase address lookup works');
if (vitalik && vitalikUpper) {
  assertEquals(vitalikUpper.rank, vitalik.rank, 'Case insensitive: same rank');
  assertEquals(vitalikUpper.balance, vitalik.balance, 'Case insensitive: same balance');
}
const vitalikMixed = lookupHolder('0xAb5801a7D398351b8Be11c439e05C5b3259aEc9B');
assert(vitalikMixed !== null, 'Mixed-case address lookup works');
if (vitalikMixed) {
  assertEquals(vitalikMixed.rank, 1, 'Mixed-case: rank = 1');
}

// 5. getHolderClass classification
console.log('5. Holder class classification:');
assertEquals(getHolderClass(1.5), 'WHALE', '1.5% → WHALE');
assertEquals(getHolderClass(1.0), 'WHALE', '1.0% → WHALE (boundary)');
assertEquals(getHolderClass(50.0), 'WHALE', '50% → WHALE');
assertEquals(getHolderClass(0.5), 'DOLPHIN', '0.5% → DOLPHIN');
assertEquals(getHolderClass(0.01), 'DOLPHIN', '0.01% → DOLPHIN (boundary)');
assertEquals(getHolderClass(0.1), 'DOLPHIN', '0.1% → DOLPHIN');
assertEquals(getHolderClass(0.001), 'FISH', '0.001% → FISH');
assertEquals(getHolderClass(0.0099), 'FISH', '0.0099% → FISH');
assertEquals(getHolderClass(0.0001), 'FISH', '0.0001% → FISH');
assertEquals(getHolderClass(0), 'FISH', '0% → FISH');

// 6. Verify class distribution matches classification function
console.log('6. Class consistency with snapshot data:');
let classConsistencyErrors = 0;
for (const [, holder] of holders) {
  const expectedClass = getHolderClass(holder.percentage);
  if (holder.class !== expectedClass) {
    classConsistencyErrors++;
    if (classConsistencyErrors <= 3) {
      console.log(`     ⚠️ ${holder.address.slice(0, 10)}... percentage=${holder.percentage} class=${holder.class} expected=${expectedClass}`);
    }
  }
}
assertEquals(classConsistencyErrors, 0, `All ${holders.size} holders match classification (${classConsistencyErrors} mismatches)`);

// 7. Verify top holders have valid classes
console.log('7. Top holders class validation:');
let checkedCount = 0;
const validClasses = new Set(['WHALE', 'DOLPHIN', 'FISH']);
for (let rank = 1; rank <= 10; rank++) {
  for (const [, h] of holders) {
    if (h.rank === rank) {
      assert(validClasses.has(h.class), `Rank ${rank} has valid class "${h.class}"`);
      // Ranks 1-4 should be WHALEs (top addresses with large percentages)
      if (rank <= 4) {
        assert(h.class === 'WHALE', `Rank ${rank} is WHALE`);
      }
      checkedCount++;
      break;
    }
  }
}
assert(checkedCount > 0, `Checked ${checkedCount} top holders`);

// 8. Cache behavior — second load returns same map
console.log('8. Caching:');
const holders2 = loadHolders();
assert(holders === holders2, 'Second loadHolders() returns same Map reference');

// 9. Verify address format for all holders
console.log('9. Address format validation:');
let formatErrors = 0;
for (const [addr] of holders) {
  if (!/^0x[0-9a-f]{40}$/.test(addr)) {
    formatErrors++;
    if (formatErrors <= 3) console.log(`  ❌ Bad format: ${addr}`);
  }
}
assertEquals(formatErrors, 0, `All ${holders.size} addresses are valid lowercase 0x format`);

// 10. Rank uniqueness
console.log('10. Rank uniqueness:');
const ranks = new Set<number>();
for (const [, h] of holders) {
  ranks.add(h.rank);
}
assertEquals(ranks.size, holders.size, `All ${holders.size} ranks are unique`);

// ── Summary ──
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f}`));
}
console.log(failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
process.exit(failed === 0 ? 0 : 1);

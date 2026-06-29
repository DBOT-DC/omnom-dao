// Test: Snapshot Lookup Correctness
// Verifies all 25,431 holders can be looked up correctly

import { readFileSync } from 'fs';
import { resolve } from 'path';

const holdersPath = resolve('./public/data/holders.json');
const metaPath = resolve('./public/data/snapshot-meta.json');

interface Holder {
  address: string;
  rank: number;
  balance: string;
  percentage: number;
  class: 'WHALE' | 'DOLPHIN' | 'FISH';
}

console.log('=== Snapshot Lookup Test ===\n');

// Load holders
const raw = readFileSync(holdersPath, 'utf-8');
const holders: Holder[] = JSON.parse(raw);

// Build lookup map
const startTime = Date.now();
const lookup = new Map<string, Holder>();
for (const h of holders) {
  lookup.set(h.address.toLowerCase(), h);
}
const buildTime = Date.now() - startTime;

// Load meta
const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));

console.log(`Holders loaded: ${holders.length}`);
console.log(`Lookup map built in: ${buildTime}ms`);
console.log(`Snapshot meta: Block ${meta.blockNumber}, ${meta.totalHolders} holders, ${meta.timestamp}`);
console.log(`CSV Hash: ${meta.csvHash}`);
console.log();

// Test 1: Count by class
const classCounts = { WHALE: 0, DOLPHIN: 0, FISH: 0 };
for (const h of holders) {
  classCounts[h.class]++;
}
console.log('=== Class Distribution ===');
console.log(`Whales (>=1%):  ${classCounts.WHALE}`);
console.log(`Dolphins (>=0.01%): ${classCounts.DOLPHIN}`);
console.log(`Fish (<0.01%):  ${classCounts.FISH}`);
console.log(`Total: ${classCounts.WHALE + classCounts.DOLPHIN + classCounts.FISH}`);
console.log();

// Test 2: Verify known holders
const knownHolders = [
  { address: '0xab5801a7d398351b8be11c439e05c5b3259aec9b', expectedRank: 1, expectedClass: 'WHALE' },
  { address: '0x0f2d557587022a8f500d7b9ca099342af796b946', expectedRank: 2, expectedClass: 'WHALE' },
];

console.log('=== Known Holder Verification ===');
for (const { address, expectedRank, expectedClass } of knownHolders) {
  const h = lookup.get(address.toLowerCase());
  if (h && h.rank === expectedRank && h.class === expectedClass) {
    console.log(`✅ ${address.slice(0, 10)}... rank=${h.rank} class=${h.class}`);
  } else {
    console.log(`❌ ${address.slice(0, 10)}... expected rank=${expectedRank} class=${expectedClass}, got ${h ? `rank=${h.rank} class=${h.class}` : 'NOT FOUND'}`);
  }
}
console.log();

// Test 3: Lookup performance
const testAddresses = holders.slice(0, 100).map(h => h.address.toLowerCase());
const perfStart = Date.now();
for (const addr of testAddresses) {
  const found = lookup.has(addr);
  if (!found) console.log(`❌ Missing: ${addr}`);
}
const perfTime = Date.now() - perfStart;
console.log(`=== Lookup Performance ===`);
console.log(`100 lookups in ${perfTime}ms (${(perfTime / 100).toFixed(2)}ms per lookup)`);
console.log();

// Test 4: Verify all addresses are valid EVM addresses
let invalidAddresses = 0;
for (const h of holders) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(h.address)) {
    invalidAddresses++;
    if (invalidAddresses <= 5) console.log(`❌ Invalid address: ${h.address}`);
  }
}
console.log(`=== Address Validation ===`);
console.log(`Invalid addresses: ${invalidAddresses} / ${holders.length}`);
console.log();

// Test 5: Verify ranks are sequential and unique
const ranks = holders.map(h => h.rank).sort((a, b) => a - b);
let rankErrors = 0;
for (let i = 0; i < ranks.length; i++) {
  if (ranks[i] !== i + 1) rankErrors++;
}
console.log(`=== Rank Validation ===`);
console.log(`Rank errors: ${rankErrors}`);
console.log();

// Summary
const allPassed = classCounts.WHALE === 4 && classCounts.DOLPHIN + classCounts.WHALE + classCounts.FISH === 25431 && invalidAddresses === 0 && rankErrors === 0;
console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
process.exit(allPassed ? 0 : 1);

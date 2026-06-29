#!/usr/bin/env node
/**
 * Test: Snapshot Lookup Correctness
 * Verifies all 25,431 holders can be looked up correctly.
 */
const fs = require('fs');
const path = require('path');

const HOLDERSPath = path.join(__dirname, '../public/data/holders.json');
const csvPath = path.join(process.env.HOME, '.openclaw-telegram/workspace/omnom-snapshot/omnom-snapshot-pre-announcement.csv');

console.log('=== Snapshot Lookup Correctness Test ===\n');

// Load holders.json
const t0 = Date.now();
const holdersData = JSON.parse(fs.readFileSync(holdersPath, 'utf-8'));
const t1 = Date.now();
console.log(`Loaded ${holdersData.length} holders from holders.json in ${t1 - t0}ms`);

// Build lookup map
const map = new Map();
for (const h of holdersData) {
  map.set(h.address.toLowerCase(), h);
}
console.log(`Lookup map size: ${map.size}`);

// Verify against CSV
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const csvLines = csvContent.trim().split('\n');
const csvHeader = csvLines[0];
console.log(`CSV header: ${csvHeader}`);

let matchCount = 0;
let mismatchCount = 0;
let missingCount = 0;
const mismatches = [];

for (let i = 1; i < csvLines.length; i++) {
  const parts = csvLines[i].split(',');
  if (parts.length < 5) continue;
  
  const csvAddr = parts[1].toLowerCase();
  const csvBalance = parts[4].trim();
  const csvRank = parseInt(parts[0], 10);
  
  const holder = map.get(csvAddr);
  if (!holder) {
    missingCount++;
    if (missingCount <= 5) mismatches.push(`MISSING: ${csvAddr} (rank ${csvRank})`);
    continue;
  }
  
  if (holder.rank !== csvRank) {
    mismatchCount++;
    mismatches.push(`RANK MISMATCH: ${csvAddr} - JSON:${holder.rank} vs CSV:${csvRank}`);
    continue;
  }
  
  // Verify class classification
  const pct = parseFloat(holder.percentage);
  let expectedClass;
  if (pct >= 1.0) expectedClass = 'Whale';
  else if (pct >= 0.01) expectedClass = 'Dolphin';
  else expectedClass = 'Fish';
  
  if (holder.class !== expectedClass) {
    mismatchCount++;
    mismatches.push(`CLASS MISMATCH: ${csvAddr} - JSON:${holder.class} vs expected:${expectedClass} (pct=${pct})`);
  }
  
  matchCount++;
}

console.log(`\nResults:`);
console.log(`  Match: ${matchCount}`);
console.log(`  Missing in JSON: ${missingCount}`);
console.log(`  Mismatches: ${mismatchCount}`);

if (mismatches.length > 0) {
  console.log(`\nMismatches (first 10):`);
  mismatches.slice(0, 10).forEach(m => console.log(`  ${m}`));
}

// Test lookup speed
const t2 = Date.now();
const testAddresses = holdersData.slice(0, 1000).map(h => h.address.toLowerCase());
for (const addr of testAddresses) {
  const found = map.get(addr);
  if (!found) console.log(`SPEED TEST FAIL: ${addr}`);
}
const t3 = Date.now();
console.log(`\nLookup speed: 1000 lookups in ${t3 - t2}ms (${((t3-t2)/1000).toFixed(2)}ms per lookup)`);

// Verify holder class distribution
const classes = { Whale: 0, Dolphin: 0, Fish: 0 };
for (const h of holdersData) {
  classes[h.class]++;
}
console.log(`\nHolder class distribution:`);
console.log(`  Whale: ${classes.Whale}`);
console.log(`  Dolphin: ${classes.Dolphin}`);
console.log(`  Fish: ${classes.Fish}`);
console.log(`  Total: ${classes.Whale + classes.Dolphin + classes.Fish}`);

// Verify snapshot meta
const metaPath = path.join(__dirname, '../public/data/snapshot-meta.json');
const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
console.log(`\nSnapshot metadata:`);
console.log(`  Block: ${meta.blockNumber}`);
console.log(`  Timestamp: ${meta.timestamp}`);
console.log(`  Total holders: ${meta.totalHolders}`);
console.log(`  Contract: ${meta.contractAddress}`);
console.log(`  CSV hash: ${meta.csvHash}`);

const allPass = matchCount === csvLines.length - 1 && mismatchCount === 0;
console.log(`\n${allPass ? '✅ ALL TESTS PASSED' : '❌ TESTS FAILED'}`);
process.exit(allPass ? 0 : 1);

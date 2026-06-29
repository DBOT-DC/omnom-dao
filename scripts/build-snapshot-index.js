#!/usr/bin/env node
/**
 * build-snapshot-index.js
 * Reads the OMNOM snapshot CSV and produces:
 *   - public/data/holders.json       (array for client lookup)
 *   - public/data/snapshot-meta.json  (metadata for governance UI)
 *
 * Usage: node scripts/build-snapshot-index.js
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const CSV_FILE = '/Users/penny/.openclaw-telegram/workspace/omnom-snapshot/omnom-snapshot-pre-announcement.csv';
const OUT_DIR = join(ROOT, 'public', 'data');

function main() {
  const csvRaw = readFileSync(CSV_FILE, 'utf-8');
  const csvHash = 'sha256:' + createHash('sha256').update(csvRaw).digest('hex');

  const lines = csvRaw.trim().split('\n');
  // header: rank,address,balance_raw,balance_formatted,percentage_of_supply

  const holders = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 5) continue;

    const rank = parseInt(cols[0], 10);
    const address = cols[1].trim().toLowerCase();
    const balance = cols[3].trim();
    const percentage = parseFloat(cols[4].trim());

    let cls;
    if (percentage >= 1) cls = 'Whale';
    else if (percentage >= 0.01) cls = 'Dolphin';
    else cls = 'Fish';

    holders.push({ address, rank, balance, percentage, class: cls });
  }

  const meta = {
    blockNumber: 59922100,
    timestamp: '2026-06-07T23:59:58Z',
    totalHolders: holders.length,
    contractAddress: '0xe3fcA919883950c5cD468156392a6477Ff5d18de',
    csvHash,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'holders.json'), JSON.stringify(holders, null, 2));
  writeFileSync(join(OUT_DIR, 'snapshot-meta.json'), JSON.stringify(meta, null, 2));

  const whales = holders.filter(h => h.class === 'Whale').length;
  const dolphins = holders.filter(h => h.class === 'Dolphin').length;
  const fish = holders.filter(h => h.class === 'Fish').length;

  console.log(`✅ Processed ${holders.length} holders`);
  console.log(`   Whales: ${whales} | Dolphins: ${dolphins} | Fish: ${fish}`);
  console.log(`   CSV hash: ${csvHash.slice(0, 24)}...`);
  console.log(`   Output: ${OUT_DIR}/`);
}

main();

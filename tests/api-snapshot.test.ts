/**
 * Public Snapshot API Integration Tests
 *
 * Tests the public holder snapshot endpoint via HTTP calls to a running dev server.
 * Requires: npm run dev (or next dev) running in the background.
 *
 * Run: npx tsx tests/api-snapshot.test.ts
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

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

async function jsonFetch(path: string, opts: RequestInit = {}): Promise<{ status: number; body: unknown }> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
    });
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { status: res.status, body };
  } catch (err) {
    return { status: 0, body: { error: 'Connection refused — is the dev server running?', detail: String(err) } };
  }
}

// ── Main ──

async function main() {
  console.log(`\n=== Snapshot API Tests (${BASE_URL}) ===\n`);

  // Health check
  console.log('0. Server connectivity:');
  const health = await jsonFetch('/');
  if (health.status === 0) {
    console.log(`  ❌ Cannot connect to ${BASE_URL} — start the dev server first: npm run dev`);
    process.exit(1);
  }
  console.log(`  ✅ Server is reachable (status ${health.status})`);

  // 1. GET /api/snapshot/Vitalik returns his data
  console.log('1. GET /api/snapshot — Vitalik Buterin:');
  const vitalikRes = await jsonFetch('/api/snapshot/0xab5801a7d398351b8be11c439e05c5b3259aec9b');
  assert(vitalikRes.status === 200, `Returns 200 (got ${vitalikRes.status})`);
  if (vitalikRes.status === 200 && typeof vitalikRes.body === 'object' && vitalikRes.body !== null) {
    const data = vitalikRes.body as Record<string, unknown>;
    assertEquals(data.found, true, 'found = true');
    assert('holder' in data, 'Response has "holder" field');
    assert('voting_power' in data, 'Response has "voting_power" field');

    const holder = data.holder as Record<string, unknown>;
    assertEquals(holder.rank, 1, 'Vitalik rank = 1');
    assertEquals(holder.class, 'WHALE', 'Vitalik class = WHALE');
    assert(typeof holder.balance === 'string', 'Balance is a string');
    assert(typeof holder.percentage === 'number', 'Percentage is a number');
    assert((holder.percentage as number) > 0, 'Percentage is positive');

    const vp = data.voting_power as number;
    assert(typeof vp === 'number', 'voting_power is a number');
    assert(vp >= 1, `Vitalik voting power >= 1 (got ${vp})`);

    console.log(`     Rank: ${holder.rank}`);
    console.log(`     Class: ${holder.class}`);
    console.log(`     Balance: ${holder.balance}`);
    console.log(`     Percentage: ${holder.percentage}%`);
    console.log(`     Voting Power: ${vp}`);
  }

  // 2. GET /api/snapshot with zero address returns found: false
  console.log('2. GET /api/snapshot — zero address:');
  const zeroRes = await jsonFetch('/api/snapshot/0x0000000000000000000000000000000000000000');
  if (zeroRes.status === 200) {
    const data = zeroRes.body as Record<string, unknown>;
    assertEquals(data.found, false, 'found = false for zero address');
  } else if (zeroRes.status === 404) {
    assert(true, 'Zero address returns 404 (also acceptable)');
  }

  // 3. GET /api/snapshot with invalid address returns 400
  console.log('3. GET /api/snapshot — invalid address:');
  const invalidAddrRes = await jsonFetch('/api/snapshot/not-an-address');
  assert(invalidAddrRes.status === 400, `Invalid address returns 400 (got ${invalidAddrRes.status})`);
  if (typeof invalidAddrRes.body === 'object' && invalidAddrRes.body !== null) {
    assert('error' in (invalidAddrRes.body as Record<string, unknown>), 'Error response has "error" field');
  }

  console.log('4. GET /api/snapshot — short address:');
  const shortAddrRes = await jsonFetch('/api/snapshot/0x1234');
  assert(shortAddrRes.status === 400, `Short address returns 400 (got ${shortAddrRes.status})`);

  console.log('5. GET /api/snapshot — non-hex address:');
  const nonHexAddrRes = await jsonFetch('/api/snapshot/0xgggggggggggggggggggggggggggggggggggggggg');
  assert(nonHexAddrRes.status === 400, `Non-hex address returns 400 (got ${nonHexAddrRes.status})`);

  // 6. GET /api/snapshot — unknown but valid address returns found: false
  console.log('6. GET /api/snapshot — valid but unknown:');
  const unknownAddrRes = await jsonFetch('/api/snapshot/0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef');
  if (unknownAddrRes.status === 200) {
    const data = unknownAddrRes.body as Record<string, unknown>;
    assertEquals(data.found, false, 'found = false for unknown address');
  } else if (unknownAddrRes.status === 404) {
    assert(true, 'Unknown address returns 404 (also acceptable)');
  }

  // 7. Case insensitivity — same holder with different case
  console.log('7. Case insensitive snapshot lookup:');
  const upperAddrRes = await jsonFetch('/api/snapshot/0xAB5801A7D398351B8BE11C439E05C5B3259AEC9B');
  if (upperAddrRes.status === 200) {
    const data = upperAddrRes.body as Record<string, unknown>;
    assertEquals(data.found, true, 'Uppercase address lookup succeeds');
    if (data.found) {
      const holder = data.holder as Record<string, unknown>;
      assertEquals(holder.rank, 1, 'Same rank for uppercase lookup');
    }
  } else {
    console.log(`  ⚠️  Uppercase lookup returned ${upperAddrRes.status}`);
  }

  // 8. Response voting_power field follows QTV formula
  console.log('8. Voting power formula consistency:');
  if (vitalikRes.status === 200) {
    const data = vitalikRes.body as Record<string, unknown>;
    const holder = data.holder as Record<string, unknown>;
    const balanceStr = holder.balance as string;
    const vp = data.voting_power as number;

    const balance = parseFloat(balanceStr);
    if (!isNaN(balance) && balance > 0) {
      const expectedVP = Math.max(1, Math.floor(Math.sqrt(balance)));
      assertEquals(vp, expectedVP, `VP = floor(sqrt(${balance})) = ${expectedVP} (got ${vp})`);
    }
  }

  // 9. WHALE holder has high voting power
  console.log('9. WHALE voting power magnitude:');
  if (vitalikRes.status === 200) {
    const data = vitalikRes.body as Record<string, unknown>;
    const vp = data.voting_power as number;
    assert(vp >= 100, `WHALE Vitalik has VP >= 100 (got ${vp})`);
  }

  // 10. Rank 2 holder exists
  console.log('10. Rank 2 holder:');
  const rank2Res = await jsonFetch('/api/snapshot/0x0f2d557587022a8f500d7b9ca099342af796b946');
  if (rank2Res.status === 200) {
    const data = rank2Res.body as Record<string, unknown>;
    assertEquals(data.found, true, 'Rank 2 holder found');
    if (data.found) {
      const holder = data.holder as Record<string, unknown>;
      assertEquals(holder.rank, 2, 'Rank = 2');
      assert('voting_power' in data, 'Has voting_power field');
      const vp = data.voting_power as number;
      assert(vp >= 1, `Rank 2 voting power >= 1 (got ${vp})`);
      console.log(`     Class: ${holder.class}, VP: ${vp}`);
    }
  } else {
    console.log(`  ⚠️  Rank 2 holder returned ${rank2Res.status} — address may differ in this snapshot`);
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
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});

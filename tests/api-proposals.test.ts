/**
 * Proposal API Integration Tests
 *
 * Tests via HTTP calls to a running dev server (http://localhost:3000).
 * Requires: npm run dev (or next dev) running in the background.
 *
 * Run: npx tsx tests/api-proposals.test.ts
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
  console.log(`\n=== Proposal API Tests (${BASE_URL}) ===\n`);

  // Health check
  console.log('0. Server connectivity:');
  const health = await jsonFetch('/');
  if (health.status === 0) {
    console.log(`  ❌ Cannot connect to ${BASE_URL} — start the dev server first: npm run dev`);
    process.exit(1);
  }
  console.log(`  ✅ Server is reachable (status ${health.status})`);

  // 1. GET /api/proposals returns proper structure
  console.log('1. GET /api/proposals:');
  const listRes = await jsonFetch('/api/proposals');
  console.log(`     Status: ${listRes.status}`);
  assert(listRes.status === 200, 'Returns 200');
  if (listRes.status === 200 && typeof listRes.body === 'object' && listRes.body !== null) {
    const data = listRes.body as Record<string, unknown>;
    assert('proposals' in data, 'Response has "proposals" field');
    assert('total' in data, 'Response has "total" field');
    assert('page' in data, 'Response has "page" field');
    assert('limit' in data, 'Response has "limit" field');
    assert(Array.isArray(data.proposals), '"proposals" is an array');
    assert(typeof data.total === 'number', '"total" is a number');
    console.log(`     Total proposals: ${data.total}, Page: ${data.page}, Limit: ${data.limit}`);

    // Verify proposal shape if any exist
    if ((data.proposals as unknown[]).length > 0) {
      const first = (data.proposals as Record<string, unknown>[])[0];
      assert('id' in first, 'Proposal has "id"');
      assert('title' in first, 'Proposal has "title"');
      assert('status' in first, 'Proposal has "status"');
      assert('type' in first, 'Proposal has "type"');
      assert('votes_for' in first, 'Proposal has "votes_for"');
      assert('votes_against' in first, 'Proposal has "votes_against"');
    }
  }

  // 2. GET /api/proposals with pagination
  console.log('2. Pagination:');
  const page1 = await jsonFetch('/api/proposals?page=1&limit=5');
  if (page1.status === 200) {
    const d = page1.body as Record<string, unknown>;
    assertEquals((d.limit as number), 5, 'Limit param respected');
    assertEquals((d.page as number), 1, 'Page param respected');
    assert(Array.isArray(d.proposals) && (d.proposals as unknown[]).length <= 5, 'At most 5 proposals returned');
  }

  // 3. GET /api/proposals with status filter
  console.log('3. Status filter:');
  const activeRes = await jsonFetch('/api/proposals?status=ACTIVE');
  if (activeRes.status === 200) {
    const d = activeRes.body as Record<string, unknown>;
    assert(Array.isArray(d.proposals), 'Filtered response is array');
    for (const p of d.proposals as Record<string, unknown>[]) {
      assert(p.status === 'ACTIVE', `Proposal ${p.id} has status ACTIVE`);
    }
  }

  // 4. POST /api/proposals requires auth (no session = 403)
  console.log('4. POST /api/proposals without auth:');
  const createRes = await jsonFetch('/api/proposals', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Test Proposal For Integration Testing',
      description: 'This is a test proposal created during integration testing to verify auth requirements are enforced.',
      type: 'GENERAL',
    }),
  });
  assert(createRes.status === 403, `Unauthenticated POST returns 403 (got ${createRes.status})`);
  if (typeof createRes.body === 'object' && createRes.body !== null) {
    const err = createRes.body as Record<string, unknown>;
    assert('error' in err, 'Error response has "error" field');
  }

  // 5. POST /api/proposals with bad body returns 400
  console.log('5. POST /api/proposals with invalid body:');
  const badBodyRes = await jsonFetch('/api/proposals', {
    method: 'POST',
    body: JSON.stringify({ title: 'short', description: 'too short' }),
  });
  assert([400, 403].includes(badBodyRes.status), `Invalid body returns 400 or 403 (got ${badBodyRes.status})`);

  // 6. GET /api/proposals/:id returns 404 for missing
  console.log('6. GET /api/proposals/:id — missing:');
  const missingIdRes = await jsonFetch('/api/proposals/00000000-0000-0000-0000-000000000000');
  assert(missingIdRes.status === 404, `Missing proposal returns 404 (got ${missingIdRes.status})`);

  // 7. GET /api/proposals/:id with invalid UUID returns 404
  console.log('7. GET /api/proposals/:id — invalid ID:');
  const invalidIdRes = await jsonFetch('/api/proposals/not-a-uuid');
  assert(invalidIdRes.status === 404, `Invalid UUID returns 404 (got ${invalidIdRes.status})`);

  // 8. GET /api/proposals/:id — if any proposals exist, fetch one
  console.log('8. GET /api/proposals/:id — existing:');
  if (listRes.status === 200) {
    const data = listRes.body as Record<string, unknown>;
    const proposals = data.proposals as Record<string, unknown>[];
    if (proposals.length > 0) {
      const firstId = proposals[0].id as string;
      const singleRes = await jsonFetch(`/api/proposals/${firstId}`);
      assert(singleRes.status === 200, `GET /api/proposals/${firstId} returns 200`);
      if (typeof singleRes.body === 'object' && singleRes.body !== null) {
        const body = singleRes.body as Record<string, unknown>;
        assert('proposal' in body, 'Response has "proposal" field');
        const p = body.proposal as Record<string, unknown>;
        assertEquals(p.id, firstId, 'Returned proposal has correct ID');
        assert('vote_count' in p, 'Response includes vote_count');
        assert('comment_count' in p, 'Response includes comment_count');
      }
    } else {
      console.log('  ⚠️  No proposals exist — skipping single proposal test');
    }
  }

  // 9. POST /api/proposals/:id/vote requires auth
  console.log('9. POST /api/proposals/:id/vote without auth:');
  const voteRes = await jsonFetch('/api/proposals/00000000-0000-0000-0000-000000000000/vote', {
    method: 'POST',
    body: JSON.stringify({ choice: 'FOR' }),
  });
  assert(voteRes.status === 403, `Unauthenticated vote returns 403 (got ${voteRes.status})`);

  // 10. POST /api/proposals/:id/vote with invalid choice
  console.log('10. POST /api/proposals/:id/vote with invalid choice:');
  const badVoteRes = await jsonFetch('/api/proposals/00000000-0000-0000-0000-000000000000/vote', {
    method: 'POST',
    body: JSON.stringify({ choice: 'MAYBE' }),
  });
  assert([400, 403].includes(badVoteRes.status), `Invalid choice returns 400 or 403 (got ${badVoteRes.status})`);

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

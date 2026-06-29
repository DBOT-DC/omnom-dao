/**
 * Auth API Integration Tests
 *
 * Tests the authentication flow via HTTP calls to a running dev server.
 * Requires: npm run dev (or next dev) running in the background.
 *
 * Run: npx tsx tests/api-auth.test.ts
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

async function jsonFetch(
  path: string,
  opts: RequestInit & { cookie?: string } = {}
): Promise<{ status: number; body: unknown; headers: Headers }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(opts.cookie ? { Cookie: opts.cookie } : {}),
    };
    const res = await fetch(`${BASE_URL}${path}`, {
      ...opts,
      headers,
    });
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { status: res.status, body, headers: res.headers };
  } catch (err) {
    return {
      status: 0,
      body: { error: 'Connection refused — is the dev server running?', detail: String(err) },
      headers: new Headers(),
    };
  }
}

// ── Main ──

async function main() {
  console.log(`\n=== Auth API Tests (${BASE_URL}) ===\n`);

  // Health check
  console.log('0. Server connectivity:');
  const health = await jsonFetch('/');
  if (health.status === 0) {
    console.log(`  ❌ Cannot connect to ${BASE_URL} — start the dev server first: npm run dev`);
    process.exit(1);
  }
  console.log(`  ✅ Server is reachable (status ${health.status})`);

  // 1. GET /api/auth/nonce returns nonce + message
  console.log('1. GET /api/auth/nonce:');
  const nonceRes = await jsonFetch('/api/auth/nonce');
  assert(nonceRes.status === 200, `Returns 200 (got ${nonceRes.status})`);
  if (nonceRes.status === 200 && typeof nonceRes.body === 'object' && nonceRes.body !== null) {
    const data = nonceRes.body as Record<string, unknown>;
    assert('nonce' in data, 'Response has "nonce" field');
    assert('message' in data, 'Response has "message" field');
    const nonce = data.nonce as string;
    assert(typeof nonce === 'string' && nonce.length === 32, `Nonce is 32-char hex string (got "${nonce}")`);
    assert(/^[0-9a-f]{32}$/.test(nonce), 'Nonce matches hex pattern');
    const message = data.message as string;
    assert(message.includes(nonce), 'Message contains the nonce');
    assert(message.includes('omnom-dao'), 'Message contains domain reference');
    assert(message.includes('Nonce:'), 'Message has "Nonce:" label');
    console.log(`     Nonce: ${nonce}`);
    console.log(`     Message preview: ${message.slice(0, 80)}...`);
  }

  // 2. GET /api/auth/nonce returns unique nonces each call
  console.log('2. Nonce uniqueness:');
  const [n1, n2, n3] = await Promise.all([
    jsonFetch('/api/auth/nonce'),
    jsonFetch('/api/auth/nonce'),
    jsonFetch('/api/auth/nonce'),
  ]);
  if (n1.status === 200 && n2.status === 200 && n3.status === 200) {
    const nonce1 = (n1.body as Record<string, unknown>).nonce as string;
    const nonce2 = (n2.body as Record<string, unknown>).nonce as string;
    const nonce3 = (n3.body as Record<string, unknown>).nonce as string;
    assert(nonce1 !== nonce2, 'Nonce 1 !== Nonce 2');
    assert(nonce2 !== nonce3, 'Nonce 2 !== Nonce 3');
    assert(nonce1 !== nonce3, 'Nonce 1 !== Nonce 3');
  }

  // 3. GET /api/auth/session returns null when not authenticated
  console.log('3. GET /api/auth/session (unauthenticated):');
  const sessionRes = await jsonFetch('/api/auth/session');
  assert(sessionRes.status === 401, `Unauthenticated session returns 401 (got ${sessionRes.status})`);
  if (typeof sessionRes.body === 'object' && sessionRes.body !== null) {
    const data = sessionRes.body as Record<string, unknown>;
    assertEquals(data.authenticated, false, 'authenticated = false');
  }

  // 4. POST /api/auth/verify with missing fields returns 400
  console.log('4. POST /api/auth/verify — missing fields:');
  const missingRes = await jsonFetch('/api/auth/verify', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  assert(missingRes.status === 400, `Missing fields returns 400 (got ${missingRes.status})`);
  if (typeof missingRes.body === 'object' && missingRes.body !== null) {
    assert('error' in (missingRes.body as Record<string, unknown>), 'Error response body');
  }

  // 5. POST /api/auth/verify with invalid nonce returns 401
  console.log('5. POST /api/auth/verify — invalid nonce:');
  const badNonceRes = await jsonFetch('/api/auth/verify', {
    method: 'POST',
    body: JSON.stringify({
      message: 'test message',
      signature: '0xdeadbeef',
      nonce: '00000000000000000000000000000000',
    }),
  });
  assert(badNonceRes.status === 401, `Invalid nonce returns 401 (got ${badNonceRes.status})`);

  // 6. POST /api/auth/verify with expired nonce returns 401
  console.log('6. POST /api/auth/verify — expired nonce:');
  const expiredNonceRes = await jsonFetch('/api/auth/verify', {
    method: 'POST',
    body: JSON.stringify({
      message: 'expired nonce test',
      signature: '0x' + '00'.repeat(65),
      nonce: 'a'.repeat(32),
    }),
  });
  assert(expiredNonceRes.status === 401, `Expired/invalid nonce returns 401 (got ${expiredNonceRes.status})`);

  // 7. POST /api/auth/verify with malformed SIWE message returns 400
  console.log('7. POST /api/auth/verify — malformed SIWE message:');
  const freshNonce = await jsonFetch('/api/auth/nonce');
  if (freshNonce.status === 200) {
    const nonce = (freshNonce.body as Record<string, unknown>).nonce as string;
    const malformedRes = await jsonFetch('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({
        message: 'this is not a valid siwe message at all',
        signature: '0x' + 'ab'.repeat(65),
        nonce,
      }),
    });
    assert([400, 401].includes(malformedRes.status), `Malformed SIWE returns 400 or 401 (got ${malformedRes.status})`);
    console.log(`     Status: ${malformedRes.status}`);
    if (typeof malformedRes.body === 'object' && malformedRes.body !== null) {
      console.log(`     Body: ${JSON.stringify(malformedRes.body).slice(0, 100)}`);
    }
  }

  // 8. POST /api/auth/logout clears session
  console.log('8. POST /api/auth/logout:');
  const logoutRes = await jsonFetch('/api/auth/logout', { method: 'POST' });
  assert(logoutRes.status === 200, `Logout returns 200 (got ${logoutRes.status})`);
  if (typeof logoutRes.body === 'object' && logoutRes.body !== null) {
    const data = logoutRes.body as Record<string, unknown>;
    assertEquals(data.success, true, 'Logout returns success: true');
  }

  // 9. Session still unauthenticated after logout
  console.log('9. Session check after logout:');
  const afterLogout = await jsonFetch('/api/auth/session');
  assert(afterLogout.status === 401, `Still unauthenticated after logout (got ${afterLogout.status})`);

  // 10. Nonce is consumed after verify attempt (even if signature invalid)
  console.log('10. Nonce consumed after verify attempt:');
  const nonceForConsume = await jsonFetch('/api/auth/nonce');
  if (nonceForConsume.status === 200) {
    const nonce = (nonceForConsume.body as Record<string, unknown>).nonce as string;
    // Try to verify with bad signature — nonce should still be consumed
    await jsonFetch('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({
        message: 'omnom-dao.example.com wants you to sign in with your Ethereum account:\n\nNonce: ' + nonce,
        signature: '0x' + '00'.repeat(65),
        nonce,
      }),
    });
    // Try again with same nonce — should fail
    const reuseRes = await jsonFetch('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({
        message: 'omnom-dao.example.com wants you to sign in with your Ethereum account:\n\nNonce: ' + nonce,
        signature: '0x' + '00'.repeat(65),
        nonce,
      }),
    });
    assert(reuseRes.status === 401, `Reused nonce returns 401 (got ${reuseRes.status})`);
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

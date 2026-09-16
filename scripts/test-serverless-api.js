import assert from 'assert';

// Mock request and response creator
function createMockReqRes(options = {}) {
  const req = {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body || {},
    query: options.query || {},
    socket: { remoteAddress: '127.0.0.1' },
  };

  let statusCode = 200;
  let responseData = null;
  let headers = {};
  let ended = false;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      responseData = data;
      ended = true;
      return res;
    },
    send(data) {
      responseData = data;
      ended = true;
      return res;
    },
    setHeader(name, value) {
      headers[name] = value;
      return res;
    },
    end() {
      ended = true;
      return res;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData,
    getHeaders: () => headers,
  };

  return { req, res };
}

async function runTests() {
  console.log('🚀 Running Vercel Serverless Function Verification Suite...\n');

  // 1. Health check
  {
    const { default: handler } = await import('../api/system/health.ts');
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    assert.strictEqual(res.getStatusCode(), 200);
    assert.strictEqual(res.getData().status, 'healthy');
    console.log('✅ PASS: /api/system/health returned 200 (healthy)');
  }

  // 2. Metrics check
  {
    const { default: handler } = await import('../api/system/metrics.ts');
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    assert.strictEqual(res.getStatusCode(), 200);
    assert.ok(typeof res.getData() === 'string' && (res.getData().includes('ZOVA_uptime_seconds') || res.getData().includes('zova_uptime_seconds')));
    console.log('✅ PASS: /api/system/metrics returned Prometheus metrics');
  }

  // 3. Auth login
  let accessToken = '';
  {
    const { default: handler } = await import('../api/auth/login.ts');
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        identifier: 'marketplace',
        password: 'Admin#penal@131366674',
      },
    });
    await handler(req, res);
    assert.strictEqual(res.getStatusCode(), 200, `Login failed: ${JSON.stringify(res.getData())}`);
    assert.ok(res.getData().accessToken, 'Expected accessToken in login response');
    accessToken = res.getData().accessToken;
    console.log('✅ PASS: /api/auth/login returned 200 with valid JWT accessToken');
  }

  // 4. Authenticated profile /api/auth/me
  {
    const { default: handler } = await import('../api/auth/me.ts');
    const { req, res } = createMockReqRes({
      method: 'GET',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    await handler(req, res);
    assert.strictEqual(res.getStatusCode(), 200);
    assert.ok(res.getData().name);
    console.log('✅ PASS: /api/auth/me returned 200 with authenticated user profile');
  }

  // 5. Admin session verification /api/admin/session
  {
    const { default: handler } = await import('../api/admin/session.ts');
    const { req, res } = createMockReqRes({
      method: 'GET',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    await handler(req, res);
    assert.strictEqual(res.getStatusCode(), 200);
    assert.strictEqual(res.getData().authenticated, true);
    assert.strictEqual(res.getData().permissions.canManageUsers, true);
    console.log('✅ PASS: /api/admin/session returned 200 with valid admin permissions');
  }

  // 6. Listings query /api/listings
  {
    const { default: handler } = await import('../api/listings/index.ts');
    const { req, res } = createMockReqRes({ method: 'GET', query: { limit: '5' } });
    await handler(req, res);
    assert.strictEqual(res.getStatusCode(), 200);
    assert.ok(Array.isArray(res.getData().data));
    assert.ok(res.getData().pagination.total > 0);
    console.log(`✅ PASS: /api/listings returned 200 with ${res.getData().data.length} listings (total: ${res.getData().pagination.total})`);
  }

  // 7. Payment plans /api/payments/plans
  {
    const { default: handler } = await import('../api/payments/plans.ts');
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    assert.strictEqual(res.getStatusCode(), 200);
    assert.ok(Array.isArray(res.getData().plans));
    assert.strictEqual(res.getData().plans.length, 3);
    console.log('✅ PASS: /api/payments/plans returned 200 with subscription tiers');
  }

  // 8. Dashboard overview /api/dashboard/overview
  {
    const { default: handler } = await import('../api/dashboard/overview.ts');
    const { req, res } = createMockReqRes({
      method: 'GET',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    await handler(req, res);
    assert.strictEqual(res.getStatusCode(), 200);
    assert.ok(res.getData().kpis);
    assert.ok(Array.isArray(res.getData().categories));
    console.log('✅ PASS: /api/dashboard/overview returned 200 with KPI analytics');
  }

  // 9. CORS preflight OPTIONS check
  {
    const { default: handler } = await import('../api/listings/index.ts');
    const { req, res } = createMockReqRes({ method: 'OPTIONS' });
    await handler(req, res);
    assert.strictEqual(res.getStatusCode(), 200);
    assert.strictEqual(res.getHeaders()['Access-Control-Allow-Origin'], '*');
    console.log('✅ PASS: CORS OPTIONS preflight returned 200 with Access-Control headers');
  }

  // 10. Cookie-based auth verification /api/auth/me
  {
    const { default: handler } = await import('../api/auth/me.ts');
    const { req, res } = createMockReqRes({
      method: 'GET',
      headers: { cookie: `zioee_token=${accessToken}` },
    });
    await handler(req, res);
    assert.strictEqual(res.getStatusCode(), 200);
    assert.ok(res.getData().email);
    console.log('✅ PASS: /api/auth/me returned 200 via cookie auth');
  }

  // 11. Unauthorized protection on admin API /api/admin/session
  {
    const { default: handler } = await import('../api/admin/session.ts');
    const { req, res } = createMockReqRes({ method: 'GET' });
    await handler(req, res);
    assert.strictEqual(res.getStatusCode(), 401);
    console.log('✅ PASS: /api/admin/session rejected unauthorized request with 401');
  }

  // 12. Admin pending listings /api/admin/pending-listings
  {
    const { default: handler } = await import('../api/admin/pending-listings.ts');
    const { req, res } = createMockReqRes({
      method: 'GET',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    await handler(req, res);
    assert.strictEqual(res.getStatusCode(), 200);
    assert.ok(typeof res.getData().total === 'number');
    console.log(`✅ PASS: /api/admin/pending-listings returned 200 (pending: ${res.getData().total})`);
  }

  // 13. Admin logout /api/auth/logout
  {
    const { default: handler } = await import('../api/auth/logout.ts');
    const { req, res } = createMockReqRes({ method: 'POST' });
    await handler(req, res);
    assert.strictEqual(res.getStatusCode(), 200);
    assert.strictEqual(res.getData().success, true);
    assert.ok(res.getHeaders()['Set-Cookie']?.includes('Max-Age=0'));
    console.log('✅ PASS: /api/auth/logout returned 200 and cleared session cookie');
  }

  console.log('\n🎉 ALL 13 VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

import assert from 'assert';

async function verifyAll() {
  console.log('🧪 Running Complete Admin Endpoint & UI Verification...\n');

  const BASE = 'http://localhost:3000/api';

  // 1. Health
  const healthRes = await fetch(`${BASE}/system/health`);
  assert.strictEqual(healthRes.status, 200, 'Health check failed');
  console.log('✅ 1. /api/system/health -> 200 OK');

  // 2. Reject Wrong Password
  const badLogin = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'marketplace', password: 'WrongPassword999!' }),
  });
  assert.strictEqual(badLogin.status, 401, 'Wrong password did not return 401');
  const badJson = await badLogin.json();
  assert.ok(badJson.message || badJson.error, 'Expected error message on wrong password');
  console.log(`✅ 2. /api/auth/login (wrong password) -> 401 Unauthorized (${badJson.message || badJson.error})`);

  // 3. Reject Unknown User
  const unknownUser = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'nonexistent@zova.com', password: 'AnyPassword123' }),
  });
  assert.strictEqual(unknownUser.status, 401, 'Unknown user did not return 401');
  console.log('✅ 3. /api/auth/login (unknown user) -> 401 Unauthorized');

  // 4. Successful Admin Login
  const goodLogin = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'marketplace', password: 'Admin#penal@131366674' }),
  });
  assert.strictEqual(goodLogin.status, 200, 'Valid login failed');
  const loginData = await goodLogin.json();
  assert.ok(loginData.accessToken, 'Missing accessToken in login response');
  assert.strictEqual(loginData.user.role, 'SUPER_ADMIN', 'Expected SUPER_ADMIN role');
  console.log('✅ 4. /api/auth/login (correct credentials) -> 200 OK (JWT issued, role SUPER_ADMIN)');

  const token = loginData.accessToken;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 5. Current User Profile
  const meRes = await fetch(`${BASE}/auth/me`, { headers });
  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  assert.strictEqual(meData.role, 'SUPER_ADMIN');
  console.log(`✅ 5. /api/auth/me -> 200 OK (${meData.name} - ${meData.email})`);

  // 6. Admin Session Check
  const sessionRes = await fetch(`${BASE}/admin/session`, { headers });
  assert.strictEqual(sessionRes.status, 200);
  const sessionData = await sessionRes.json();
  assert.strictEqual(sessionData.authenticated, true);
  console.log('✅ 6. /api/admin/session -> 200 OK (authenticated: true)');

  // 7. Dashboard Overview
  const dashRes = await fetch(`${BASE}/dashboard/overview`, { headers });
  assert.strictEqual(dashRes.status, 200);
  const dashData = await dashRes.json();
  assert.ok(dashData.kpis, 'Missing KPIs');
  assert.ok(Array.isArray(dashData.categories), 'Missing categories');
  console.log('✅ 7. /api/dashboard/overview -> 200 OK');

  // 8. Listings
  const listingsRes = await fetch(`${BASE}/listings`, { headers });
  assert.strictEqual(listingsRes.status, 200);
  console.log('✅ 8. /api/listings -> 200 OK');

  // 9. Users
  const usersRes = await fetch(`${BASE}/users`, { headers });
  assert.strictEqual(usersRes.status, 200);
  console.log('✅ 9. /api/users -> 200 OK');

  // 10. Reports
  const reportsRes = await fetch(`${BASE}/reports`, { headers });
  assert.strictEqual(reportsRes.status, 200);
  console.log('✅ 10. /api/reports -> 200 OK');

  // 11. Payments
  const paymentsRes = await fetch(`${BASE}/payments`, { headers });
  assert.strictEqual(paymentsRes.status, 200);
  console.log('✅ 11. /api/payments -> 200 OK');

  // 12. Chats
  const chatsRes = await fetch(`${BASE}/chats`, { headers });
  assert.strictEqual(chatsRes.status, 200);
  console.log('✅ 12. /api/chats -> 200 OK');

  // 13. Audit Logs
  const auditRes = await fetch(`${BASE}/audit-logs`, { headers });
  assert.strictEqual(auditRes.status, 200);
  console.log('✅ 13. /api/audit-logs -> 200 OK');

  // 14. Packages
  const packagesRes = await fetch(`${BASE}/packages`, { headers });
  assert.strictEqual(packagesRes.status, 200);
  console.log('✅ 14. /api/packages -> 200 OK');

  // 15. Settings Public
  const settingsRes = await fetch(`${BASE}/settings/public`, { headers });
  assert.strictEqual(settingsRes.status, 200);
  console.log('✅ 15. /api/settings/public -> 200 OK');

  // 16. Logout
  const logoutRes = await fetch(`${BASE}/auth/logout`, {
    method: 'POST',
    headers,
  });
  assert.strictEqual(logoutRes.status, 200);
  console.log('✅ 16. /api/auth/logout -> 200 OK');

  console.log('\n🎉 ALL 16 INTEGRATION TESTS PASSED WITH 0 ERRORS!');
}

verifyAll().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});

import { test, expect } from '@playwright/test';

/**
 * ForAntigravity Progressive Lockout Acceptance Test
 *
 * Sequence:
 *   1. 3 consecutive wrong password attempts -> 10-second lockout (Tier 1)
 *   2. Cooldown wait (10s) -> UI unlocks, allows attempts again
 *   3. 3 further wrong password attempts (total 6) -> 1-hour lockout (Tier 2)
 *   4. Admin override / unlock via API -> instant unlock
 *   5. Successful admin login with TOTP 2FA
 */

test.describe('ForAntigravity Progressive Lockout Suite (3 -> 10s -> 3 -> 1h)', () => {
  const uniqueId = Date.now();
  const testEmail = `sec.test.${uniqueId}@forantigravity.internal`;
  const wrongPassword = 'IncorrectPassword!999';
  const apiBase = process.env.API_URL || 'http://localhost:5000/api';

  test.beforeEach(async ({ page }) => {
    // Navigate to Admin Login Portal
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
  });

  test('Step 1: 3 failed attempts triggers Tier 1 (10-second Lockout) with countdown & disabled UI', async ({ page, request }) => {
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    // Ensure elements are visible
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Fill test account
    await emailInput.fill(testEmail);

    // --- Attempt 1 ---
    await passwordInput.fill(wrongPassword);
    await submitBtn.click();
    await expect(page.locator('text=Remaining attempts before lockout: 2')).toBeVisible({ timeout: 5000 });

    // --- Attempt 2 ---
    await passwordInput.fill(wrongPassword);
    await submitBtn.click();
    await expect(page.locator('text=Remaining attempts before lockout: 1')).toBeVisible({ timeout: 5000 });

    // --- Attempt 3 (Triggers Tier 1 Lockout) ---
    await passwordInput.fill(wrongPassword);
    await submitBtn.click();

    // Verify UI reflects Tier 1 Lockout immediately
    const lockoutBanner = page.locator('text=Account Temporarily Locked for 10 Seconds');
    await expect(lockoutBanner).toBeVisible({ timeout: 5000 });

    // Verify submit button is disabled and reflects countdown
    await expect(submitBtn).toBeDisabled();
    await expect(submitBtn).toContainText(/Locked \(\d+s\)/);

    // Verify direct API returns HTTP 429 Too Many Requests
    const directApiRes = await request.post(`${apiBase}/auth/login`, {
      data: {
        email: testEmail,
        password: wrongPassword,
      },
    });

    expect(directApiRes.status()).toBe(429);
    const body = await directApiRes.json();
    expect(body.error).toBe('ACCOUNT_LOCKED');
    expect(body.lockLevel).toBe(1);
    expect(body.remainingSeconds).toBeGreaterThan(0);
    expect(body.remainingSeconds).toBeLessThanOrEqual(10);
  });

  test('Step 2: 10-second cooldown expires -> UI automatically re-enables for retries', async ({ page }) => {
    // Navigate back to admin login
    await page.goto('/admin');

    const emailInput = page.locator('input[type="email"]');
    const submitBtn = page.locator('button[type="submit"]');
    await emailInput.fill(testEmail);

    // If still in 10s cooldown, wait for it to reach 0
    const banner = page.locator('text=Account Temporarily Locked for 10 Seconds');
    if (await banner.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Wait up to 11 seconds for lockout to naturally expire
      await expect(banner).toBeHidden({ timeout: 12000 });
    }

    // Verify submit button is re-enabled
    await expect(submitBtn).toBeEnabled();
    await expect(submitBtn).toContainText('Sign In to Admin Panel');
  });

  test('Step 3: 3 additional failed attempts (total 6) triggers Tier 2 (1-Hour Lockout)', async ({ page, request }) => {
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await emailInput.fill(testEmail);

    // Ensure 10s cooldown has completely lifted before sending next 3 attempts
    await expect(submitBtn).toBeEnabled({ timeout: 12000 });

    // --- Attempt 4 ---
    await passwordInput.fill(wrongPassword);
    await submitBtn.click();
    await page.waitForTimeout(300);

    // --- Attempt 5 ---
    await passwordInput.fill(wrongPassword);
    await submitBtn.click();
    await page.waitForTimeout(300);

    // --- Attempt 6 (Triggers Tier 2: 1 Hour Lockout) ---
    await passwordInput.fill(wrongPassword);
    await submitBtn.click();

    // Verify UI displays 1-Hour Lockout Warning
    const hourBanner = page.locator('text=Account Blocked for 1 Hour');
    await expect(hourBanner).toBeVisible({ timeout: 5000 });

    // Verify button is disabled and timer shows > 3500 seconds
    await expect(submitBtn).toBeDisabled();

    // Verify server API status is 429 with lockLevel 2
    const checkRes = await request.post(`${apiBase}/auth/login`, {
      data: {
        email: testEmail,
        password: wrongPassword,
      },
    });

    expect(checkRes.status()).toBe(429);
    const body = await checkRes.json();
    expect(body.error).toBe('ACCOUNT_LOCKED');
    expect(body.lockLevel).toBe(2);
    expect(body.remainingSeconds).toBeGreaterThan(3500);
  });

  test('Step 4: Admin Unlock endpoint revokes lockout and restores access', async ({ request, page }) => {
    // 1. Authenticate as Super Admin to get admin token
    const adminLoginRes = await request.post(`${apiBase}/auth/login`, {
      data: {
        email: 'admin@olx.com',
        password: 'admin123',
        totpCode: '123456',
      },
    });
    expect(adminLoginRes.status()).toBe(200);
    const { accessToken } = await adminLoginRes.json();
    expect(accessToken).toBeDefined();

    // 2. Perform Admin Unlock Override on the locked user
    const unlockRes = await request.post(`${apiBase}/auth/unlock`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        targetEmailOrUserId: testEmail,
      },
    });

    expect(unlockRes.status()).toBe(200);
    const unlockBody = await unlockRes.json();
    expect(unlockBody.success).toBe(true);

    // 3. Verify user is no longer locked on the API
    const verifyRes = await request.post(`${apiBase}/auth/login`, {
      data: {
        email: testEmail,
        password: 'wrongpassword',
      },
    });

    // Should return 401 Invalid Password rather than 429 ACCOUNT_LOCKED
    expect(verifyRes.status()).toBe(401);
    const verifyBody = await verifyRes.json();
    expect(verifyBody.isLocked).toBe(false);

    // 4. Reload Admin Login UI and verify normal login state restored
    await page.goto('/admin');
    await expect(page.locator('text=Account Blocked for 1 Hour')).toBeHidden();
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test('Step 5: Successful Admin authentication lands in protected admin dashboard', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    // Fill valid admin credentials
    await emailInput.fill('admin@olx.com');
    await passwordInput.fill('admin123');
    await submitBtn.click();

    // 2FA TOTP input should appear
    const totpInput = page.locator('input[placeholder*="6-digit TOTP"]');
    await expect(totpInput).toBeVisible({ timeout: 5000 });

    // Enter valid 2FA code
    await totpInput.fill('123456');
    await submitBtn.click();

    // Expect navigation into Admin Dashboard
    await expect(page.locator('text=Platform KPIs')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=28,463')).toBeVisible(); // Total Users metric matching ox.jpeg
  });
});

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/database/store.js';

const app = createApp();

describe('Zioeemarket Server API Suite', () => {
  let adminAccessToken: string;
  const originalFetch = global.fetch;

  beforeAll(() => {
    process.env.MSG91_AUTH_KEY = 'test_msg91_auth_key_secret';
    process.env.MSG91_OTP_WIDGET_ID = 'test_widget_id_123456';
    process.env.MSG91_OTP_WIDGET_TOKEN = 'test_widget_token_abcdef';
    process.env.MSG91_TEMPLATE_ID = 'test_template_zioee';

    global.fetch = vi.fn(async (url: any, init?: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('control.msg91.com')) {
        // Check verify
        if (urlStr.includes('verifyOtp') || urlStr.includes('/otp/verify')) {
          let code = '';
          if (init?.body) {
            try {
              const parsed = JSON.parse(init.body);
              code = parsed.otp || '';
            } catch {}
          }
          if (!code && urlStr.includes('otp=')) {
            const match = urlStr.match(/otp=([^&]+)/);
            if (match) code = decodeURIComponent(match[1]);
          }

          if (code === '654321') {
            return new Response(JSON.stringify({ type: 'success', message: 'OTP verified success' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          if (code === '999999') {
            return new Response(JSON.stringify({ type: 'error', message: 'DLT Te ID is not approved or invalid' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return new Response(JSON.stringify({ type: 'error', message: 'OTP not match' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Send / retry response
        return new Response(JSON.stringify({ type: 'success', message: 'OTP sent successfully' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return originalFetch(url, init);
    }) as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('GET /api/system/health returns healthy system status', async () => {
    const res = await request(app).get('/api/system/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.system).toContain('Zioeemarket');
  });

  it('GET /api/dashboard/kpis returns dynamic live platform statistics', async () => {
    const res = await request(app).get('/api/dashboard/kpis');
    expect(res.status).toBe(200);
    expect(res.body.totalUsers).toBeDefined();
    expect(res.body.totalListings).toBeDefined();
    expect(res.body.totalChats).toBeDefined();
    expect(res.body.contactClicks).toBeDefined();
    expect(res.body.reportedItems).toBeDefined();
  });

  it('POST /api/auth/login succeeds with username "marketplace" and secure password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: 'marketplace',
      password: 'market@23022374',
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.role).toBe('SUPER_ADMIN');
    adminAccessToken = res.body.accessToken;
  });

  it('POST /api/auth/login succeeds with email "marketplace@zioeemarket.com"', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'marketplace@zioeemarket.com',
      password: 'market@23022374',
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('Progressive Lockout Level 1: blocks for 10s after 3 failed password attempts', async () => {
    const testEmail = 'lockout.test@zioeemarket.com';
    db.resetFailedLogins(testEmail, '10.0.0.1');

    // 3 failed attempts
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '10.0.0.1')
        .send({ email: testEmail, password: 'wrongpassword' });
    }

    // 4th attempt should be blocked with 429
    const res = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '10.0.0.1')
      .send({ email: testEmail, password: 'wrongpassword' });

    expect(res.status).toBe(429);
    expect(res.body.error).toBe('ACCOUNT_LOCKED');
    expect(res.body.lockLevel).toBe(1);
    expect(res.body.remainingSeconds).toBeGreaterThan(0);
    expect(res.body.remainingSeconds).toBeLessThanOrEqual(10);
  });

  it('Progressive Lockout Level 2: escalates to 1-hour lockout after 6 failed attempts', async () => {
    const testEmail = 'lockout.level2@zioeemarket.com';
    db.resetFailedLogins(testEmail, '10.0.0.2');

    // 1. Initial 3 failed attempts (triggers Level 1: 10 seconds)
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '10.0.0.2')
        .send({ email: testEmail, password: 'wrongpassword' });
    }

    const tier1Res = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '10.0.0.2')
      .send({ email: testEmail, password: 'wrongpassword' });
    expect(tier1Res.status).toBe(429);
    expect(tier1Res.body.lockLevel).toBe(1);

    // 2. Simulate expiration of the 10-second temporary cooldown
    const record = db.failedAttempts.find((f) => f.email === testEmail);
    if (record) {
      record.lockedUntil = new Date(Date.now() - 1000).toISOString();
    }

    // 3. User fails 3 MORE attempts (accumulating 6 total failures)
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '10.0.0.2')
        .send({ email: testEmail, password: 'wrongpassword' });
    }

    // 4. Escalated to Tier 2 (1 Hour Lockout)
    const res = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '10.0.0.2')
      .send({ email: testEmail, password: 'wrongpassword' });

    expect(res.status).toBe(429);
    expect(res.body.error).toBe('ACCOUNT_LOCKED');
    expect(res.body.lockLevel).toBe(2);
    expect(res.body.remainingSeconds).toBeGreaterThan(3500);
    expect(res.body.remainingSeconds).toBeLessThanOrEqual(3600);
  });

  it('Admin override: unlocks account and resets failed counters', async () => {
    const testEmail = 'lockout.test@zioeemarket.com';
    const unlockRes = await request(app)
      .post('/api/auth/unlock')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ targetEmailOrUserId: testEmail });

    expect(unlockRes.status).toBe(200);
    expect(unlockRes.body.success).toBe(true);

    // Should now not be locked
    const checkRes = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '10.0.0.1')
      .send({ email: testEmail, password: 'market@23022374' });

    // Status should not be 429
    expect(checkRes.status).not.toBe(429);
  });

  it('Password Reset Flow: creates token and updates password safely', async () => {
    // 1. Request token
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'marketplace@zioeemarket.com' });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.token).toBeDefined();

    // 2. Reset password
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: forgotRes.body.token,
        newPassword: 'BrandNewSecurePassword2026!',
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // 3. Verify login with new password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'marketplace@zioeemarket.com',
        password: 'BrandNewSecurePassword2026!',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.accessToken).toBeDefined();

    // Reset password back for other tests
    const adminUser = db.users.find((u) => u.id === 'admin-root-001');
    if (adminUser) {
      const bcrypt = await import('bcryptjs');
      adminUser.passwordHash = bcrypt.default.hashSync('market@23022374', 12);
    }
  });

  it('POST /api/listings creates listing with multi-images and GET filters by radius', async () => {
    // 1. Create a listing with images array
    const createRes = await request(app)
      .post('/api/listings')
      .send({
        title: 'Park Street Vintage Bike',
        price: 15000,
        category: 'Vehicles',
        condition: 'Used',
        location: 'Park Street, Kolkata',
        coordinates: { lat: 22.5532, lng: 88.3518 },
        description: 'Excellent condition vintage bike',
        images: [
          'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600',
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
        ],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.title).toBe('Park Street Vintage Bike');
    expect(createRes.body.images.length).toBe(2);

    // 2. Query near Park Street
    const res = await request(app).get('/api/listings?lat=22.5529&lng=88.3534&radius=10');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach((l: any) => {
      expect(l.distanceKm).toBeLessThanOrEqual(10);
    });
  });

  it('POST /api/chats/create-or-get creates user-to-user conversation thread', async () => {
    const threadRes = await request(app)
      .post('/api/chats/create-or-get')
      .send({
        buyer: {
          id: 'usr-buyer-test',
          name: 'Rajesh Sen',
          email: 'rajesh.sen@gmail.com',
        },
        listing: {
          id: 'lst-1',
          title: 'Park Street Vintage Bike',
          sellerId: 'admin-root-001',
          sellerName: 'Zioeemarket Admin',
        },
      });

    expect(threadRes.status).toBe(200);
    expect(threadRes.body.listingId).toBe('lst-1');
    expect(threadRes.body.messages.length).toBeGreaterThan(0);
  });

  it('MSG91 OTP Flow: validates Indian phone format, sends OTP, and enforces 30s cooldown', async () => {
    // 1. Invalid phone number rejected
    const badPhoneRes = await request(app).post('/api/auth/otp/send').send({
      destination: '12345',
      purpose: 'LOGIN',
    });
    expect(badPhoneRes.status).toBe(400);
    expect(badPhoneRes.body.error).toBe('INVALID_PHONE');

    // 2. Valid Indian mobile sends OTP
    const testPhone = '+919876543210';
    const sendRes = await request(app).post('/api/auth/otp/send').send({
      destination: testPhone,
      purpose: 'LOGIN',
    });
    expect(sendRes.status).toBe(200);
    expect(sendRes.body.success).toBe(true);
    expect(sendRes.body.expiresInSeconds).toBe(300);
    expect(sendRes.body.simulatedCode).toBeUndefined();

    // 3. Immediate resend triggers rate limit cooldown
    const rapidRes = await request(app).post('/api/auth/otp/send').send({
      destination: testPhone,
      purpose: 'LOGIN',
    });
    expect(rapidRes.status).toBe(429);
    expect(rapidRes.body.error).toBe('RATE_LIMITED');
  });

  it('MSG91 OTP Flow: rejects incorrect OTP and provides DLT mismatch diagnostics', async () => {
    const testPhone = '+919876543211';

    // 1. Send OTP
    await request(app).post('/api/auth/otp/send').send({
      destination: testPhone,
      purpose: 'LOGIN',
    });

    // 2. Verify with wrong code
    const wrongRes = await request(app).post('/api/auth/otp/verify').send({
      destination: testPhone,
      code: '000000',
      purpose: 'LOGIN',
    });
    expect(wrongRes.status).toBe(400);
    expect(wrongRes.body.success).toBe(false);
    expect(wrongRes.body.attemptsRemaining).toBe(2);

    // 3. Verify with code that triggers DLT mismatch error
    const dltRes = await request(app).post('/api/auth/otp/verify').send({
      destination: testPhone,
      code: '999999',
      purpose: 'LOGIN',
    });
    expect(dltRes.status).toBe(502);
    expect(dltRes.body.error).toBe('DLT_TEMPLATE_MISMATCH');
  });

  it('MSG91 OTP Flow: verifies valid OTP and establishes authenticated user session', async () => {
    const testPhone = '+919876543212';

    // 1. Send OTP
    await request(app).post('/api/auth/otp/send').send({
      destination: testPhone,
      purpose: 'LOGIN',
    });

    // 2. Verify with valid code (mocked MSG91 success for 654321)
    const verifyRes = await request(app).post('/api/auth/otp/verify').send({
      destination: testPhone,
      code: '654321',
      purpose: 'LOGIN',
      name: 'Rohan Sen',
    });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.accessToken).toBeDefined();
    expect(verifyRes.body.refreshToken).toBeDefined();
    expect(verifyRes.body.user).toBeDefined();
    expect(verifyRes.body.user.phone).toBe('+919876543212');
  });

  it('Admin Route Protection: rejects unauthenticated visitors with 401', async () => {
    const res = await request(app).get('/api/admin/metrics');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('Admin Route Protection: allows authenticated admin and returns system metrics', async () => {
    const res = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.platformStatus).toBe('HEALTHY');
    expect(res.body.security.totalRegisteredUsers).toBeGreaterThan(0);
  });

  it('Admin Provisioning: upsertAdminUser securely creates admin with 12 bcrypt salt rounds', async () => {
    const bcrypt = await import('bcryptjs');
    const newAdminEmail = 'provisioned.admin@zioeemarket.com';
    const rawSecret = 'EnterpriseUltraSecret2026!';
    const hash = bcrypt.default.hashSync(rawSecret, 12);

    const created = db.upsertAdminUser(newAdminEmail, hash, 'Provisioned Admin', 'ADMIN');
    expect(created.email).toBe(newAdminEmail);
    expect(created.role).toBe('ADMIN');
    expect(bcrypt.default.compareSync(rawSecret, created.passwordHash!)).toBe(true);
  });

  // --- NEW OLX MARKETPLACE FEATURES TESTS ---
  it('Ad Posting: newly posted ad enters Pending status by default', async () => {
    const postRes = await request(app)
      .post('/api/listings')
      .send({
        title: 'Sony Alpha A7 IV Mirrorless Camera',
        price: 185000,
        category: 'Electronics',
        condition: 'Used',
        location: 'Park Street, Kolkata',
        description: 'Pristine condition mirrorless camera with 24-70mm lens.',
        sellerName: 'Arijit Ghosh',
        sellerPhone: '+919830112233',
      });

    expect(postRes.status).toBe(201);
    expect(postRes.body.status).toBe('Pending');
    expect(postRes.body.id).toBeDefined();

    // Verify it is NOT visible in public active listings
    const publicRes = await request(app).get('/api/listings?publicOnly=true');
    const existsInPublic = publicRes.body.data.some((l: any) => l.id === postRes.body.id);
    expect(existsInPublic).toBe(false);
  });

  it('Content Moderation: auto-flags ad matching prohibited keywords', async () => {
    const flagRes = await request(app)
      .post('/api/listings')
      .send({
        title: 'Discounted illegal weapons and narcotics',
        price: 5000,
        category: 'Others',
        condition: 'New',
        location: 'Kolkata',
        description: 'Prohibited contraband item.',
      });

    expect(flagRes.status).toBe(201);
    expect(flagRes.body.status).toBe('Flagged');
    expect(flagRes.body.autoFlagged).toBe(true);
    expect(flagRes.body.autoFlagReason).toContain('Auto-flagged');
  });

  it('Admin Moderation Queue: allows admin to view, approve, or reject pending ads', async () => {
    // 1. Create a pending ad
    const ad = await request(app)
      .post('/api/listings')
      .send({
        title: 'Royal Enfield Meteor 350 Fireball',
        price: 165000,
        category: 'Vehicles',
        condition: 'Used',
        location: 'Salt Lake, Kolkata',
        description: 'Single owner, only 8000km driven.',
        sellerName: 'Bikramjit Roy',
      });

    const adId = ad.body.id;

    // 2. Fetch queue as Admin
    const queueRes = await request(app)
      .get('/api/admin/pending-listings')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(queueRes.status).toBe(200);
    expect(queueRes.body.data.some((l: any) => l.id === adId)).toBe(true);

    // 3. Approve the ad
    const approveRes = await request(app)
      .post(`/api/admin/listings/${adId}/approve`)
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.listing.status).toBe('Active');

    // 4. Verify it is now visible publicly
    const publicListings = await request(app).get('/api/listings?publicOnly=true');
    const isPublicNow = publicListings.body.data.some((l: any) => l.id === adId);
    expect(isPublicNow).toBe(true);

    // 5. Test Rejecting an ad with reason
    const ad2 = await request(app)
      .post('/api/listings')
      .send({
        title: 'Duplicate Test Listing',
        price: 1000,
        category: 'Mobiles',
        condition: 'Used',
        location: 'Kolkata',
      });

    const rejectRes = await request(app)
      .post(`/api/admin/listings/${ad2.body.id}/reject`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ reason: 'Duplicate listing detected' });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.listing.status).toBe('Rejected');
    expect(rejectRes.body.listing.rejectionReason).toBe('Duplicate listing detected');
  });

  it('Paid Subscriptions: retrieves 3-tier plans and verifies subscription upgrade', async () => {
    // 1. Get plans
    const plansRes = await request(app).get('/api/payments/plans');
    expect(plansRes.status).toBe(200);
    expect(plansRes.body.plans.length).toBe(3);
    expect(plansRes.body.plans.some((p: any) => p.id === 'FREE')).toBe(true);
    expect(plansRes.body.plans.some((p: any) => p.id === 'BASIC')).toBe(true);
    expect(plansRes.body.plans.some((p: any) => p.id === 'PRO')).toBe(true);

    // 2. Verify subscription checkout
    const subRes = await request(app)
      .post('/api/payments/verify-subscription')
      .send({
        userId: 'test-seller-101',
        tier: 'PRO',
        billingCycle: 'MONTHLY',
        razorpayPaymentId: 'pay_test_pro_12345',
      });

    expect(subRes.status).toBe(200);
    expect(subRes.body.success).toBe(true);
    expect(subRes.body.subscription.tier).toBe('PRO');
    expect(subRes.body.plan.id).toBe('PRO');

    // 3. Verify Admin Subscription Stats
    const statsRes = await request(app)
      .get('/api/admin/subscriptions/stats')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.tiers.pro).toBeGreaterThan(0);
    expect(statsRes.body.totalMonthlyRevenue).toBeGreaterThan(0);
  });

  it('Favorites & Reviews: allows users to favorite ads and leave seller reviews', async () => {
    // 0. Create an ad first
    const adRes = await request(app)
      .post('/api/listings')
      .send({
        title: 'Apple iPad Pro 11-inch M2',
        price: 68000,
        category: 'Mobiles',
        condition: 'Used',
        location: 'Kolkata',
        sellerName: 'Debolina Das',
      });
    const listingId = adRes.body.id;

    // 1. Favorite the ad
    const favRes = await request(app)
      .post(`/api/listings/${listingId}/favorite`)
      .send({ userId: 'buyer-99' });

    expect(favRes.status).toBe(200);
    expect(favRes.body.success).toBe(true);
    expect(favRes.body.favorited).toBe(true);

    // 2. Add a review
    const revRes = await request(app)
      .post(`/api/listings/${listingId}/reviews`)
      .send({
        buyerId: 'buyer-99',
        buyerName: 'Priya Mukherjee',
        rating: 5,
        comment: 'Great interaction, genuine seller and fast response!',
      });

    expect(revRes.status).toBe(201);
    expect(revRes.body.rating).toBe(5);
    expect(revRes.body.comment).toContain('Great interaction');

    // 3. Fetch reviews for the listing
    const getRevRes = await request(app).get(`/api/listings/${listingId}/reviews`);
    expect(getRevRes.status).toBe(200);
    expect(getRevRes.body.reviews.length).toBeGreaterThan(0);
  });
});

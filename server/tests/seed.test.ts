import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/database/store.js';

const app = createApp();

describe('Marketplace Demo Seed Data Suite', () => {
  beforeEach(() => {
    // Re-seed cleanly before each test
    db.seedDemoData(true);
  });

  it('verifies that db.seedDemoData() creates exactly 20 demo listings and 5 demo sellers with is_demo=true', () => {
    const demoUsers = db.users.filter((u) => u.is_demo);
    const demoListings = db.listings.filter((l) => l.is_demo);

    expect(demoUsers.length).toBe(5);
    expect(demoListings.length).toBe(20);

    // Verify all 5 demo sellers have fake test numbers starting with +91 900000000X
    demoUsers.forEach((user) => {
      expect(user.phone).toMatch(/^\+91 900000000[1-5]$/);
      expect(user.is_demo).toBe(true);
      expect(user.email).toMatch(/@demo\.(zova|zioee)\.com/);
    });

    // Verify all 20 demo listings have is_demo = true and Active status
    demoListings.forEach((listing) => {
      expect(listing.is_demo).toBe(true);
      expect(listing.status).toBe('Active');
      expect(listing.images).toBeDefined();
      expect(listing.images!.length).toBeGreaterThanOrEqual(2);
      expect(listing.images!.length).toBeLessThanOrEqual(4);
      expect(listing.price).toBeGreaterThan(0);
      expect(listing.description.length).toBeGreaterThan(20);
    });
  });

  it('verifies category distribution covers at least 8 distinct categories', () => {
    const demoListings = db.listings.filter((l) => l.is_demo);
    const categories = Array.from(new Set(demoListings.map((l) => l.category)));

    // Must have at least 8 categories
    expect(categories.length).toBeGreaterThanOrEqual(8);

    // Verify specific category counts
    const countByCat = (cat: string) => demoListings.filter((l) => l.category === cat).length;
    expect(countByCat('Mobiles')).toBe(3);
    expect(countByCat('Electronics')).toBe(3);
    expect(countByCat('Vehicles')).toBe(2);
    expect(countByCat('Furniture')).toBe(3);
    expect(countByCat('Laptops')).toBe(2);
    expect(countByCat('Fashion')).toBe(2);
    expect(countByCat('Home & Living')).toBe(2);
    expect(countByCat('Jobs')).toBe(2);
    expect(countByCat('Services')).toBe(1);
  });

  it('verifies 3 listings are marked as Featured with PRO tier', () => {
    const featuredAds = db.listings.filter((l) => l.is_demo && l.featured);
    expect(featuredAds.length).toBe(3);

    featuredAds.forEach((ad) => {
      expect(ad.tier).toBe('PRO');
      expect(ad.featured).toBe(true);
    });

    const featuredTitles = featuredAds.map((a) => a.title);
    expect(featuredTitles.some((t) => t.includes('iPhone 14 Pro Max'))).toBe(true);
    expect(featuredTitles.some((t) => t.includes('Sony WH-1000XM5'))).toBe(true);
    expect(featuredTitles.some((t) => t.includes('Hyundai Creta'))).toBe(true);
  });

  it('verifies seller reuse across the 20 listings (each seller has 3-5 listings)', () => {
    const demoListings = db.listings.filter((l) => l.is_demo);
    const sellerCounts: Record<string, number> = {};

    demoListings.forEach((l) => {
      sellerCounts[l.sellerId] = (sellerCounts[l.sellerId] || 0) + 1;
    });

    const uniqueSellers = Object.keys(sellerCounts);
    expect(uniqueSellers.length).toBe(5);

    uniqueSellers.forEach((sellerId) => {
      expect(sellerCounts[sellerId]).toBeGreaterThanOrEqual(3);
      expect(sellerCounts[sellerId]).toBeLessThanOrEqual(5);
    });
  });

  it('verifies dates are staggered across the past 1 to 14 days', () => {
    const demoListings = db.listings.filter((l) => l.is_demo);
    const now = Date.now();

    const agesInDays = demoListings.map((l) => {
      const ageMs = now - new Date(l.createdAt).getTime();
      return Math.floor(ageMs / (24 * 60 * 60 * 1000));
    });

    const minAge = Math.min(...agesInDays);
    const maxAge = Math.max(...agesInDays);

    expect(minAge).toBeLessThanOrEqual(2);
    expect(maxAge).toBeGreaterThanOrEqual(10);
    expect(maxAge).toBeLessThanOrEqual(14);
  });

  it('verifies idempotent behavior: re-running seed does not duplicate data', () => {
    // Run seed twice
    db.seedDemoData(true);
    db.seedDemoData(true);

    const demoUsers = db.users.filter((u) => u.is_demo);
    const demoListings = db.listings.filter((l) => l.is_demo);

    expect(demoUsers.length).toBe(5);
    expect(demoListings.length).toBe(20);
  });

  it('verifies clearDemoData() wipes only demo data, preserving system admin', () => {
    const adminBefore = db.users.find((u) => u.role === 'SUPER_ADMIN');
    expect(adminBefore).toBeDefined();

    const { removedUsers, removedListings } = db.clearDemoData();
    expect(removedUsers).toBe(5);
    expect(removedListings).toBe(20);

    // Verify 0 demo records remain
    expect(db.users.filter((u) => u.is_demo).length).toBe(0);
    expect(db.listings.filter((l) => l.is_demo).length).toBe(0);

    // Verify system administrator is untouched
    const adminAfter = db.users.find((u) => u.role === 'SUPER_ADMIN');
    expect(adminAfter).toBeDefined();
    expect(adminAfter?.id).toBe(adminBefore?.id);
  });

  it('tests HTTP GET /api/listings with search, category, and featured filters', async () => {
    // 1. All public listings
    const resAll = await request(app).get('/api/listings?publicOnly=true&limit=50');
    expect(resAll.status).toBe(200);
    expect(resAll.body.data.length).toBe(20);

    // 2. Category filter: Mobiles
    const resMobiles = await request(app).get('/api/listings?category=Mobiles');
    expect(resMobiles.status).toBe(200);
    expect(resMobiles.body.data.length).toBe(3);
    resMobiles.body.data.forEach((item: any) => {
      expect(item.category).toBe('Mobiles');
    });

    // 3. Search filter: iPhone
    const resSearch = await request(app).get('/api/listings?search=iPhone');
    expect(resSearch.status).toBe(200);
    expect(resSearch.body.data.length).toBeGreaterThanOrEqual(1);
    expect(resSearch.body.data[0].title).toContain('iPhone');

    // 4. Featured filter: true
    const resFeatured = await request(app).get('/api/listings?featured=true');
    expect(resFeatured.status).toBe(200);
    expect(resFeatured.body.data.length).toBe(3);
  });

  it('tests HTTP POST & DELETE /api/listings/seed-demo endpoints', async () => {
    // 1. DELETE /api/listings/seed-demo
    const resDelete = await request(app).delete('/api/listings/seed-demo');
    expect(resDelete.status).toBe(200);
    expect(resDelete.body.success).toBe(true);
    expect(resDelete.body.removedListings).toBe(20);
    expect(resDelete.body.removedUsers).toBe(5);

    // Verify empty public listings
    const resEmpty = await request(app).get('/api/listings?publicOnly=true');
    expect(resEmpty.body.data.length).toBe(0);

    // 2. POST /api/listings/seed-demo
    const resPost = await request(app).post('/api/listings/seed-demo');
    expect(resPost.status).toBe(200);
    expect(resPost.body.success).toBe(true);
    expect(resPost.body.listingsCount).toBe(20);
    expect(resPost.body.sellersCount).toBe(5);

    // Verify listings restored
    const resRestored = await request(app).get('/api/listings?publicOnly=true&limit=50');
    expect(resRestored.body.data.length).toBe(20);
    expect(resRestored.body.pagination.total).toBe(20);
  });
});

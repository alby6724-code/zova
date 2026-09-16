import dotenv from 'dotenv';
import { db } from '../src/database/store.js';
import { DEMO_SELLERS, DEMO_LISTINGS } from '../src/database/demoData.js';

dotenv.config();

/**
 * Zioeemarket Demo Products & Sellers Seeding CLI
 *
 * Usage:
 *   npx tsx scripts/seed.ts            # Seed 20 demo listings and 5 demo sellers (idempotent)
 *   npx tsx scripts/seed.ts --wipe     # Clean up all demo data with is_demo = true
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

function parseArgs(): { wipe: boolean; force: boolean } {
  const args = process.argv.slice(2);
  return {
    wipe: args.includes('--wipe') || args.includes('--clear') || args.includes('-w'),
    force: args.includes('--force') || args.includes('-f'),
  };
}

async function tryHttpSeed(isWipe: boolean): Promise<boolean> {
  try {
    const url = `${API_BASE_URL}/listings/seed-demo`;
    const res = await fetch(url, {
      method: isWipe ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      const json = await res.json();
      console.log(`🌐 Successfully synced with running server (${API_BASE_URL}):`);
      console.log(`   ${json.message || JSON.stringify(json)}`);
      return true;
    }
  } catch {
    // Server is not running or unreachable; will operate on local store instance
  }
  return false;
}

async function main() {
  const { wipe } = parseArgs();

  console.log('\n===============================================================');
  console.log('📦 Zioeemarket Demo Marketplace Seeder');
  console.log('===============================================================\n');

  if (wipe) {
    console.log('🧹 Wiping all demo records (DELETE WHERE is_demo = true)...');
    
    // 1. Notify running server if online
    await tryHttpSeed(true);

    // 2. Clear local store
    const { removedUsers, removedListings } = db.clearDemoData();

    console.log('\n✅ Demo Data Cleanup Complete:');
    console.log(`   Removed Demo Listings: ${removedListings}`);
    console.log(`   Removed Demo Sellers:  ${removedUsers}`);
    console.log('\n===============================================================\n');
    return;
  }

  console.log('🌱 Seeding 20 realistic demo products across 9 categories...');

  // 1. Notify running server if online
  const serverUpdated = await tryHttpSeed(false);

  // 2. Perform local store seed
  const result = db.seedDemoData(true);

  console.log('\n👥 Seeded Demo Sellers (5 Profiles):');
  console.table(
    DEMO_SELLERS.map((s) => ({
      ID: s.id,
      Name: s.name,
      Phone: s.phone,
      City: s.city,
      Role: s.role,
      Flag: s.is_demo ? 'is_demo=true' : 'real',
    }))
  );

  console.log('\n🛍️ Seeded Marketplace Listings (20 Products across 9 Categories):');
  console.table(
    DEMO_LISTINGS.map((l) => ({
      ID: l.id,
      Category: l.category,
      Subcategory: l.subcategory,
      Title: l.title.length > 32 ? l.title.slice(0, 29) + '...' : l.title,
      Price: `₹${l.price.toLocaleString('en-IN')}`,
      Condition: l.condition,
      City: l.location.split(',')[0],
      Featured: l.featured ? '⭐ PRO' : 'No',
      Images: l.images?.length || 1,
      Seller: l.sellerName,
    }))
  );

  console.log('📊 Category Spread Verification:');
  const catCounts: Record<string, number> = {};
  DEMO_LISTINGS.forEach((l) => {
    catCounts[l.category] = (catCounts[l.category] || 0) + 1;
  });
  Object.entries(catCounts).forEach(([cat, count]) => {
    console.log(`   • ${cat.padEnd(16)} : ${count} ads`);
  });

  const featuredCount = DEMO_LISTINGS.filter((l) => l.featured).length;
  console.log(`\n⭐ Featured / Paid Tier Ads: ${featuredCount} / ${DEMO_LISTINGS.length}`);
  console.log(`🔒 Live Server Sync: ${serverUpdated ? 'ONLINE (Hot Reloaded)' : 'OFFLINE (Ready for boot)'}`);
  console.log('\n===============================================================\n');
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});

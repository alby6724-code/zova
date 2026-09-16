import dotenv from 'dotenv';
import { db } from '../src/database/store.js';

dotenv.config();

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

async function tryHttpAddRandom(): Promise<boolean> {
  try {
    const url = `${API_BASE_URL}/listings/add-random?count=20`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      const json = await res.json();
      console.log(`🌐 Successfully synced with running server (${API_BASE_URL}):`);
      console.log(`   ${json.message}`);
      return true;
    }
  } catch {
    // Server offline or unreachable; fall back to local store
  }
  return false;
}

async function main() {
  console.log('\n===============================================================');
  console.log('🛍️  Zioeemarket: Adding 20 Random Product Listings');
  console.log('===============================================================\n');

  // 1. Sync with running backend server if active
  const serverUpdated = await tryHttpAddRandom();

  // 2. Add to local store instance
  const addedProducts = db.addRandomProducts(20);

  if (!serverUpdated) {
    console.log('ℹ️  Standalone mode: Added 20 random products to local store.');
  }

  console.log(`\n✅ Added ${addedProducts.length} Random Products:`);
  console.table(
    addedProducts.map((p, i) => ({
      '#': i + 1,
      Category: p.category,
      Title: p.title.length > 38 ? p.title.substring(0, 35) + '...' : p.title,
      Price: `₹${p.price.toLocaleString('en-IN')}`,
      Condition: p.condition,
      Location: p.location,
      Tier: p.tier || 'FREE',
    }))
  );

  console.log('\n===============================================================');
  console.log(`🎉 Done! Marketplace now has ${db.listings.length} active listings.`);
  console.log('===============================================================\n');
}

main().catch((err) => {
  console.error('Error adding random products:', err);
  process.exit(1);
});

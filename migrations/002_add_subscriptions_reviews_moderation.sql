-- =============================================================================
-- ForAntigravity Classifieds Marketplace: Subscriptions, Reviews, Moderation Queue
-- Migration: 002_add_subscriptions_reviews_moderation.sql
-- =============================================================================

BEGIN;

-- 1. SUBSCRIPTION PLANS TABLE
CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(32) PRIMARY KEY, -- 'FREE', 'BASIC', 'PRO'
  name VARCHAR(128) NOT NULL,
  price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(10, 2) NOT NULL DEFAULT 0,
  active_listing_limit INT NOT NULL DEFAULT 3, -- -1 for unlimited
  featured_ads_limit INT NOT NULL DEFAULT 0,
  duration_days INT NOT NULL DEFAULT 30,
  verified_badge BOOLEAN NOT NULL DEFAULT FALSE,
  homepage_banner BOOLEAN NOT NULL DEFAULT FALSE,
  priority_search BOOLEAN NOT NULL DEFAULT FALSE,
  analytics_level VARCHAR(32) NOT NULL DEFAULT 'NONE',
  support_level VARCHAR(32) NOT NULL DEFAULT 'STANDARD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO plans (id, name, price_monthly, price_yearly, active_listing_limit, featured_ads_limit, duration_days, verified_badge, homepage_banner, priority_search, analytics_level, support_level)
VALUES 
  ('FREE', 'Free Starter', 0, 0, 3, 0, 30, FALSE, FALSE, FALSE, 'NONE', 'STANDARD'),
  ('BASIC', 'Basic Seller', 199, 1999, 15, 2, 60, TRUE, FALSE, FALSE, 'BASIC', 'PRIORITY'),
  ('PRO', 'Pro Merchant', 499, 4999, -1, 10, 90, TRUE, TRUE, TRUE, 'ADVANCED', 'DEDICATED')
ON CONFLICT (id) DO UPDATE SET 
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly;

-- 2. USER SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(32) NOT NULL REFERENCES plans(id),
  billing_cycle VARCHAR(16) NOT NULL DEFAULT 'MONTHLY',
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  featured_ads_used INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions (user_id, status, expires_at);

-- 3. LISTING MODERATION ENHANCEMENTS
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS auto_flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS auto_flag_reason TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS tier VARCHAR(32) DEFAULT 'FREE';

-- 4. REVIEWS & RATINGS TABLE
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(64) PRIMARY KEY,
  seller_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buyer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buyer_name VARCHAR(255) NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_seller ON reviews (seller_id, rating);

-- 5. USER FAVORITES TABLE
CREATE TABLE IF NOT EXISTS favorites (
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id VARCHAR(64) NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id)
);

-- 6. BANNED KEYWORDS BLOCKLIST TABLE
CREATE TABLE IF NOT EXISTS keyword_blocklist (
  keyword VARCHAR(128) PRIMARY KEY,
  category VARCHAR(64) DEFAULT 'GENERAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;

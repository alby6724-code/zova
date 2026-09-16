-- =============================================================================
-- ForAntigravity Enterprise Marketplace Schema Migration
-- Migration: 001_add_geo_otp_lockout_schema.sql
-- Description: Adds Geolocation (lat/lon/PostGIS), OTP Authentication,
--              Progressive Lockout tracking, Realtime Chat, Audit Logs, and Payments.
-- Compatibility: PostgreSQL 14+, PostGIS 3+ (with graceful non-PostGIS fallback)
-- Zero-Downtime Safe: Idempotent (IF NOT EXISTS, ADD COLUMN IF NOT EXISTS)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONS & PREREQUISITES
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Try enabling PostGIS if available on server; if not, standard lat/lon is used
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "postgis";
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'PostGIS extension not available in environment; continuing with standard lat/lon DOUBLE PRECISION columns.';
END $$;

-- -----------------------------------------------------------------------------
-- 2. USERS TABLE ENHANCEMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(32) UNIQUE,
  role VARCHAR(32) NOT NULL DEFAULT 'BUYER' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SELLER', 'BUYER')),
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'BANNED')),
  is_verified BOOLEAN DEFAULT FALSE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  totp_secret VARCHAR(255),
  avatar_url TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  locked_until TIMESTAMPTZ,
  lock_level INT DEFAULT 0,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was previously created
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(32) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lock_level INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users (locked_until) WHERE locked_until IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. OTP VERIFICATION TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS otp_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact VARCHAR(255) NOT NULL,
  contact_type VARCHAR(16) NOT NULL CHECK (contact_type IN ('SMS', 'EMAIL')),
  purpose VARCHAR(32) NOT NULL CHECK (purpose IN ('LOGIN', 'REGISTER', 'PASSWORD_RESET', 'SENSITIVE_ACTION')),
  code_hash VARCHAR(255) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_contact_purpose ON otp_records (contact, purpose, expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_records (expires_at);

-- -----------------------------------------------------------------------------
-- 4. PROGRESSIVE LOCKOUT ATTEMPTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier VARCHAR(255) NOT NULL, -- Email or username attempted
  ip_address VARCHAR(45) NOT NULL,
  attempts_count INT NOT NULL DEFAULT 1,
  locked_until TIMESTAMPTZ,
  lock_level INT NOT NULL DEFAULT 0, -- 0: normal, 1: 10 seconds (tier 1), 2: 1 hour (tier 2)
  first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unlocked_by VARCHAR(255),
  unlocked_at TIMESTAMPTZ,
  unlock_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_failed_login_identifier ON failed_login_attempts (LOWER(identifier));
CREATE INDEX IF NOT EXISTS idx_failed_login_ip ON failed_login_attempts (ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_login_locked_until ON failed_login_attempts (locked_until);

-- -----------------------------------------------------------------------------
-- 5. LISTINGS TABLE (WITH GEOLOCATION, PostGIS & TRIGRAM SEARCH)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listings (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  category VARCHAR(64) NOT NULL,
  subcategory VARCHAR(64),
  condition VARCHAR(32) NOT NULL DEFAULT 'GOOD' CHECK (condition IN ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'FOR_PARTS')),
  is_negotiable BOOLEAN NOT NULL DEFAULT FALSE,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  seller_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING_REVIEW', 'REJECTED', 'SOLD', 'EXPIRED')),
  location_name VARCHAR(255) NOT NULL,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  featured_expires_at TIMESTAMPTZ,
  views_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was previously created
ALTER TABLE listings ADD COLUMN IF NOT EXISTS condition VARCHAR(32) DEFAULT 'GOOD';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_negotiable BOOLEAN DEFAULT FALSE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS featured_expires_at TIMESTAMPTZ;

-- PostGIS geometry column if postgis is present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS geom GEOGRAPHY(Point, 4326);
    -- Sync geom with lat/lon trigger or update
    UPDATE listings SET geom = ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography WHERE lat IS NOT NULL AND lon IS NOT NULL AND geom IS NULL;
    CREATE INDEX IF NOT EXISTS idx_listings_geom ON listings USING GIST (geom);
  END IF;
END $$;

-- Fast Spatial & Bounding-Box Index for Haversine fallback queries
CREATE INDEX IF NOT EXISTS idx_listings_lat_lon_status ON listings (lat, lon, status);
CREATE INDEX IF NOT EXISTS idx_listings_category_status ON listings (category, status);
CREATE INDEX IF NOT EXISTS idx_listings_featured ON listings (is_featured, created_at DESC) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_listings_title_trgm ON listings USING GIN (title gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- 6. REALTIME CHAT (CONVERSATIONS & MESSAGES)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(64) PRIMARY KEY,
  listing_id VARCHAR(64) REFERENCES listings(id) ON DELETE SET NULL,
  buyer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_conversation_participants UNIQUE (listing_id, buyer_id, seller_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON conversations (buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller ON conversations (seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations (last_message_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages (conversation_id, is_read) WHERE is_read = FALSE;

-- -----------------------------------------------------------------------------
-- 7. AUDIT LOGGING TABLE (ENTERPRISE COMPLIANCE)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  admin_id VARCHAR(64) NOT NULL,
  admin_name VARCHAR(255) NOT NULL,
  admin_role VARCHAR(64) NOT NULL,
  action VARCHAR(128) NOT NULL,
  target_id VARCHAR(255),
  details TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON admin_audit_logs (target_id);

-- -----------------------------------------------------------------------------
-- 8. PROMOTED LISTINGS & PAYMENT TRANSACTIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  listing_id VARCHAR(64) NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(32) NOT NULL CHECK (plan IN ('TOP_PICK', 'FEATURED_7D', 'FEATURED_30D', 'URGENT')),
  amount_cents INT NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  stripe_session_id VARCHAR(255) UNIQUE,
  stripe_payment_intent VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_listing ON payments (listing_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session ON payments (stripe_session_id);

COMMIT;

-- =============================================================================
-- DOWN MIGRATION (ROLLBACK SCRIPT)
-- To revert this migration, run the following block:
--
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TABLE IF EXISTS messages CASCADE;
-- DROP TABLE IF EXISTS conversations CASCADE;
-- DROP TABLE IF EXISTS admin_audit_logs CASCADE;
-- DROP TABLE IF EXISTS failed_login_attempts CASCADE;
-- DROP TABLE IF EXISTS otp_records CASCADE;
-- =============================================================================

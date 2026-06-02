-- Daddy Moto Classifieds — PostgreSQL Schema
-- Run: psql -U daddymoto_user -d daddymoto_prod -f scripts/schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── CATEGORIES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(64) NOT NULL UNIQUE,
  name        VARCHAR(128) NOT NULL,
  description TEXT,
  icon        VARCHAR(64),
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (slug, name, description, icon, sort_order) VALUES
  ('sport',       'Sport',          'Sport bikes and supersports',              'zap',        1),
  ('cruiser',     'Cruiser',        'Cruisers, choppers, and bobbers',          'anchor',     2),
  ('adventure',   'Adventure / ADV','Adventure and dual-sport bikes',           'map',        3),
  ('dirt',        'Dirt / Off-Road','Motocross, enduro, and trail bikes',       'trees',      4),
  ('touring',     'Touring',        'Touring and sport-touring motorcycles',    'compass',    5),
  ('naked',       'Naked / Standard','Standard and naked bikes',               'bike',       6),
  ('scooter',     'Scooter / Moped','Scooters and mopeds',                     'wind',       7),
  ('electric',    'Electric',       'Electric motorcycles and ebikes',          'battery',    8),
  ('parts',       'Parts',          'Parts, accessories, and components',       'wrench',     9),
  ('gear',        'Gear',           'Helmets, jackets, boots, and riding gear', 'shield',     10),
  ('wanted',      'Wanted',         'Looking to buy',                           'search',     11),
  ('other',       'Other',          'Everything else',                          'more-horiz', 12)
ON CONFLICT (slug) DO NOTHING;

-- ─── USERS ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(128) NOT NULL,
  phone         VARCHAR(32),
  city          VARCHAR(128),
  state         CHAR(2),
  avatar_url    TEXT,
  bio           TEXT,
  is_admin      BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─── LISTINGS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id     INTEGER NOT NULL REFERENCES categories(id),
  status          VARCHAR(32) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','sold','expired','pending','removed')),

  -- Core fields
  title           VARCHAR(255) NOT NULL,
  description     TEXT NOT NULL,
  price           INTEGER,                 -- stored in cents; NULL = "make offer"
  price_obo       BOOLEAN DEFAULT FALSE,   -- or best offer

  -- Moto-specific structured fields
  year            SMALLINT,
  make            VARCHAR(64),
  model           VARCHAR(128),
  mileage         INTEGER,
  engine_cc       INTEGER,
  color           VARCHAR(64),
  condition       VARCHAR(32) CHECK (condition IN ('excellent','good','fair','parts')),
  vin             VARCHAR(17),

  -- Location
  city            VARCHAR(128),
  state           CHAR(2),
  zip             VARCHAR(10),

  -- Metadata
  views           INTEGER DEFAULT 0,
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '60 days'),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_status     ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_category   ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_user       ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_state      ON listings(state);
CREATE INDEX IF NOT EXISTS idx_listings_make_model ON listings(make, model);
CREATE INDEX IF NOT EXISTS idx_listings_price      ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_created    ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_year       ON listings(year);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_listings_fts ON listings
  USING GIN(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(make,'') || ' ' || coalesce(model,'') || ' ' || coalesce(description,'')));

-- ─── LISTING PHOTOS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listing_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,           -- R2 public URL
  key         TEXT NOT NULL,           -- R2 object key (for deletion)
  sort_order  INTEGER DEFAULT 0,       -- 0 = cover photo
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_listing ON listing_photos(listing_id, sort_order);

-- ─── MESSAGES (contact form) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_name VARCHAR(128),
  sender_email VARCHAR(255) NOT NULL,
  body        TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_listing ON messages(listing_id);

-- ─── SAVED LISTINGS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_listings (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id)
);

-- ─── PASSWORD RESET TOKENS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  used       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);

-- ─── AUTO-UPDATE updated_at ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Migration 004: Align the database with the columns the API routes actually use
--
-- The API (routes/incidents.js, teams.js, bulletins.js, notifications.js) was
-- written against supabase/schema.sql (the schema used on Neon), while
-- sql/schema.sql — the one the README tells you to load — lacks several of
-- those columns and tables. On a database built from sql/schema.sql every
-- POST /api/incidents failed with: column "reporter_name" does not exist.
--
-- This migration is idempotent and brings EITHER starting point to the same
-- complete schema, so both install paths work.

-- ─── incidents: columns used by the API ──────────────────────────────────────
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS reporter_name    VARCHAR(150),
  ADD COLUMN IF NOT EXISTS reporter_phone   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS lat              DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng              DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS department       VARCHAR(100) DEFAULT 'Engineering Services',
  ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS photo_url        TEXT,
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at      TIMESTAMPTZ;

-- Backfill lat/lng from the PostGIS point for any rows created before this
UPDATE incidents
   SET lat = ST_Y(location::geometry), lng = ST_X(location::geometry)
 WHERE (lat IS NULL OR lng IS NULL) AND location IS NOT NULL;

-- Keep the PostGIS point in step with lat/lng on every insert/update.
-- sql/schema.sql defines is_emergency as a GENERATED column, supabase/schema.sql
-- as a plain column set by trigger, so pick the matching trigger body.
DO $$
DECLARE generated_flag "char";
BEGIN
  SELECT attgenerated INTO generated_flag
    FROM pg_attribute
   WHERE attrelid = 'incidents'::regclass AND attname = 'is_emergency';

  IF generated_flag = 's' THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION set_incident_location() RETURNS TRIGGER AS $body$
      BEGIN
        IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
          NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
        END IF;
        NEW.updated_at := NOW();
        RETURN NEW;
      END; $body$ LANGUAGE plpgsql;
    $f$;
  ELSE
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION set_incident_location() RETURNS TRIGGER AS $body$
      BEGIN
        IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
          NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
        END IF;
        NEW.is_emergency := NEW.incident_type IN ('Ambulance', 'Fire', 'Disaster');
        NEW.updated_at := NOW();
        RETURN NEW;
      END; $body$ LANGUAGE plpgsql;
    $f$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_set_incident_location ON incidents;
CREATE TRIGGER trg_set_incident_location
BEFORE INSERT OR UPDATE ON incidents
FOR EACH ROW EXECUTE FUNCTION set_incident_location();

CREATE INDEX IF NOT EXISTS idx_incidents_lat_lng  ON incidents(lat, lng);
CREATE INDEX IF NOT EXISTS idx_incidents_ref      ON incidents(reference_number);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents USING GIST(location);

-- ─── users: notifications route filters on is_active ─────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_guest  BOOLEAN NOT NULL DEFAULT false;

-- ─── Field teams and public bulletins (missing from sql/schema.sql) ──────────
CREATE TABLE IF NOT EXISTS field_teams (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(150) NOT NULL,
  role          VARCHAR(100) NOT NULL,
  department    VARCHAR(100) NOT NULL,
  status        VARCHAR(50)  NOT NULL DEFAULT 'Available',
  active_ticket VARCHAR(25),
  avatar        TEXT,
  phone         VARCHAR(50),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bulletins (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(200) NOT NULL,
  body        TEXT NOT NULL,
  category    VARCHAR(50)  NOT NULL DEFAULT 'Notice',
  target_ward VARCHAR(100) DEFAULT 'All Bulawayo Wards',
  is_urgent   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bulletins_created ON bulletins(created_at DESC);

-- ─── Push-notification log (missing from supabase/schema.sql) ────────────────
DO $$ BEGIN
  CREATE TYPE notification_target AS ENUM ('All', 'Zone');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           VARCHAR(100) NOT NULL,
  body            VARCHAR(500) NOT NULL,
  target_type     notification_target NOT NULL DEFAULT 'All',
  target_zone     GEOGRAPHY(Polygon, 4326),
  sent_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivered_at    TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  UNIQUE (notification_id, user_id)
);

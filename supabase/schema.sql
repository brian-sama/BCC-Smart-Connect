-- ==============================================================================
-- BCC SmartConnect: Neon PostgreSQL + PostGIS Schema
-- Run this in your Neon SQL Editor: console.neon.tech -> Your Project -> SQL Editor
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Enums
DO $$ BEGIN
  CREATE TYPE incident_type AS ENUM (
    'Ambulance', 'Fire', 'Disaster',
    'WaterLeak', 'SewerBurst', 'RoadDamage', 'StreetLight', 'Other'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE incident_status AS ENUM ('New', 'Assigned', 'InProgress', 'Resolved', 'Closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('Resident', 'Dispatcher', 'Communications', 'Administrator');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Users Table (standalone — no Supabase auth dependency)
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       VARCHAR(254) UNIQUE,
  phone       VARCHAR(25),
  first_name  VARCHAR(100),
  last_name   VARCHAR(100),
  password_hash VARCHAR(255),
  role        user_role NOT NULL DEFAULT 'Resident',
  fcm_token   VARCHAR(255),
  is_guest    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Incidents Table (with PostGIS Geometry & Direct Lat/Lng)
CREATE TABLE IF NOT EXISTS incidents (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_number VARCHAR(25) UNIQUE NOT NULL,
  reporter_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  reporter_name    VARCHAR(150),
  reporter_phone   VARCHAR(50),
  incident_type    incident_type NOT NULL,
  status           incident_status NOT NULL DEFAULT 'New',
  description      TEXT NOT NULL,
  address          VARCHAR(500),
  lat              DOUBLE PRECISION NOT NULL,
  lng              DOUBLE PRECISION NOT NULL,
  location         GEOGRAPHY(Point, 4326),
  department       VARCHAR(100) DEFAULT 'Engineering Services',
  assigned_to_name VARCHAR(150),
  is_emergency     BOOLEAN DEFAULT false,
  photo_url        TEXT,
  resolution_notes TEXT,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-populate PostGIS location + emergency flag + updated_at
CREATE OR REPLACE FUNCTION set_incident_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  IF NEW.incident_type IN ('Ambulance', 'Fire', 'Disaster') THEN
    NEW.is_emergency := true;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_incident_location ON incidents;
CREATE TRIGGER trg_set_incident_location
BEFORE INSERT OR UPDATE ON incidents
FOR EACH ROW EXECUTE FUNCTION set_incident_location();

-- 5. Incident Timeline Table
CREATE TABLE IF NOT EXISTS incident_timeline (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  actor_name  VARCHAR(100) NOT NULL,
  actor_role  VARCHAR(50)  NOT NULL DEFAULT 'Dispatcher',
  status      incident_status NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Field Maintenance Teams Roster Table
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

-- 7. Municipal Public Bulletins Table
CREATE TABLE IF NOT EXISTS bulletins (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(200) NOT NULL,
  body        TEXT NOT NULL,
  category    VARCHAR(50)  NOT NULL DEFAULT 'Notice',
  target_ward VARCHAR(100) DEFAULT 'All Bulawayo Wards',
  is_urgent   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Spatial and Performance Indexes
CREATE INDEX IF NOT EXISTS idx_incidents_lat_lng   ON incidents(lat, lng);
CREATE INDEX IF NOT EXISTS idx_incidents_status    ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_type      ON incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_incidents_created   ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_ref       ON incidents(reference_number);
CREATE INDEX IF NOT EXISTS idx_incidents_reporter  ON incidents(reporter_id);
CREATE INDEX IF NOT EXISTS idx_timeline_incident   ON incident_timeline(incident_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_created   ON bulletins(created_at DESC);

-- Sample operational records are intentionally not seeded.

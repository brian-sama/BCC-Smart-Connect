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

-- 9. Seed Realistic Initial Bulawayo Data
INSERT INTO field_teams (name, role, department, status, active_ticket, avatar, phone)
VALUES
  ('Eng. Nomvula Dube',  'Water Distribution Lead',  'Engineering Services',     'On Site',   'BCC-20260904-W281', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&h=120&q=80', '+263 77 200 1122'),
  ('Sipho Mthethwa',     'Sewerage Rapid Response',  'Health Services',           'Dispatched', 'BCC-20260904-S104', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80', '+263 71 333 4455'),
  ('Famona Unit 4',      'Emergency Medical Rescue', 'Emergency & Fire Services', 'On Site',   'BCC-20260904-E001', 'https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=120&h=120&q=80', '+263 2922 71717'),
  ('BCC Roads Gang 2',   'Asphalt Surface Gang',     'Engineering Services',     'Available', NULL,                 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80', '+263 78 444 8899')
ON CONFLICT DO NOTHING;

INSERT INTO bulletins (title, body, category, target_ward, is_urgent)
VALUES
  ('Criterion Water Works Maintenance',  'Scheduled water supply reduction in Eastern suburbs between 08:00 and 17:00 tomorrow due to valve rehabilitation.',  'Water Cut', 'Eastern Suburbs',       true),
  ('Luveve Road Resurfacing Update',     'Asphalt paving along Luveve Road near Mpilo Hospital is progressing. Single lane traffic diversions in place.',       'Roads',     'Luveve & Magwegwe',     false),
  ('Refuse Collection Cycle (Ward 28)', 'Domestic refuse compaction trucks will service Cowdray Park sections 1 to 6 this Friday morning.',                    'Health',    'Cowdray Park (Ward 28)', false)
ON CONFLICT DO NOTHING;

INSERT INTO incidents (reference_number, reporter_name, reporter_phone, incident_type, status, description, address, lat, lng, department, assigned_to_name, is_emergency)
VALUES
  ('BCC-20260904-W281', 'Themba Moyo',       '+263 77 234 5678', 'WaterLeak',   'InProgress', 'Burst main transmission pipe leaking clean drinking water across road.', 'Cowdray Park, Stand 14203',                 -20.0821, 28.5034, 'Engineering Services',     'Eng. Nomvula Dube',  false),
  ('BCC-20260904-S104', 'Sipho Ndlovu',      '+263 71 890 1234', 'SewerBurst',  'Assigned',   'Sewer manhole overflowing into street ditch near school entrance.',      'Nkulumane 12, Sekusile Shopping Centre',  -20.1983, 28.5291, 'Health Services',           'Sipho Mthethwa',     false),
  ('BCC-20260904-E001', 'Witness Alert',     '+263 78 555 4321', 'Ambulance',   'InProgress', 'Road traffic collision on Khami Road. Urgent medical assistance required.', 'Khami Road near Kelvin North Industrial', -20.1542, 28.5412, 'Emergency & Fire Services', 'Famona Unit 4',      true),
  ('BCC-20260904-R899', 'Tariro Hove',       '+263 77 111 2233', 'RoadDamage',  'Resolved',   'Deep pothole repaired with asphalt cold-mix.',                           'Bradfield, 12th Avenue Extension',         -20.1742, 28.6011, 'Engineering Services',     'BCC Roads Gang 2',   false),
  ('BCC-20260904-L402', 'Anonymous Citizen', NULL,               'StreetLight', 'New',        'Streetlight array flickering and causing electrical hazard on overhead wire.', 'Suburbs, Park Road / 8th Avenue',      -20.1520, 28.6045, 'Electrical Services',      NULL,                 false)
ON CONFLICT (reference_number) DO NOTHING;

-- BCC SmartConnect Database Schema
-- Requires: PostgreSQL 14+ with PostGIS extension

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('Resident', 'Dispatcher', 'Communications', 'Administrator');

CREATE TYPE incident_type AS ENUM (
  'Ambulance', 'Fire', 'Disaster',
  'WaterLeak', 'SewerBurst', 'RoadDamage', 'StreetLight', 'Other'
);

CREATE TYPE incident_status AS ENUM ('New', 'Assigned', 'InProgress', 'Resolved', 'Closed');

CREATE TYPE notification_target AS ENUM ('All', 'Zone');

-- ─── Users ────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  phone         VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role          user_role NOT NULL DEFAULT 'Resident',
  fcm_token     VARCHAR(255),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin-specific profile data (1-to-1 with users where role != Resident)
CREATE TABLE admin_users (
  id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  department   VARCHAR(100),
  badge_number VARCHAR(50) UNIQUE
);

-- ─── Incidents ────────────────────────────────────────────────────────────────

CREATE TABLE incidents (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_number VARCHAR(20) UNIQUE NOT NULL,
  reporter_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to      UUID REFERENCES users(id) ON DELETE SET NULL,
  incident_type    incident_type NOT NULL,
  status           incident_status NOT NULL DEFAULT 'New',
  description      TEXT,
  address          VARCHAR(500),
  -- PostGIS geography column: lon/lat in WGS-84
  location         GEOGRAPHY(Point, 4326) NOT NULL,
  -- Derived: true for Ambulance, Fire, Disaster
  is_emergency     BOOLEAN GENERATED ALWAYS AS (
                     incident_type IN ('Ambulance', 'Fire', 'Disaster')
                   ) STORED,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ
);

CREATE TABLE media_attachments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  file_url    VARCHAR(1000) NOT NULL,
  file_type   VARCHAR(50),
  file_size   INTEGER,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Notifications ────────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           VARCHAR(100) NOT NULL,
  body            VARCHAR(500) NOT NULL,
  target_type     notification_target NOT NULL DEFAULT 'All',
  -- Non-null only when target_type = 'Zone'
  target_zone     GEOGRAPHY(Polygon, 4326),
  sent_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE notification_deliveries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivered_at    TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  UNIQUE (notification_id, user_id)
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX idx_incidents_location    ON incidents USING GIST(location);
CREATE INDEX idx_incidents_status      ON incidents(status);
CREATE INDEX idx_incidents_type        ON incidents(incident_type);
CREATE INDEX idx_incidents_created     ON incidents(created_at DESC);
CREATE INDEX idx_incidents_reporter    ON incidents(reporter_id);
CREATE INDEX idx_notif_target_zone     ON notifications USING GIST(target_zone)
  WHERE target_zone IS NOT NULL;
CREATE INDEX idx_users_email           ON users(email);
CREATE INDEX idx_users_fcm_active      ON users(fcm_token) WHERE fcm_token IS NOT NULL AND is_active = true;

-- ─── Updated-at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_users_updated     BEFORE UPDATE ON users     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_incidents_updated BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

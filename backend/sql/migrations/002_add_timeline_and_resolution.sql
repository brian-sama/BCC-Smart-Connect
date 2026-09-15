-- Migration 002: Add Incident Timeline and Resolution Notes
-- Tracks resolution details and full audit history of status changes

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS resolution_notes VARCHAR(1000),
  ADD COLUMN IF NOT EXISTS resolved_by      UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS incident_timeline (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role  VARCHAR(50),
  actor_name  VARCHAR(200),
  status      incident_status NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_incident ON incident_timeline(incident_id);
CREATE INDEX IF NOT EXISTS idx_timeline_created  ON incident_timeline(created_at ASC);

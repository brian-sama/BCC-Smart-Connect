-- Prevent unknown coordinates and unreviewed public information from being
-- presented as confirmed municipal facts. Legacy records remain readable but
-- are explicitly marked unverified.

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS location_source TEXT NOT NULL DEFAULT 'legacy_unknown',
  ADD COLUMN IF NOT EXISTS location_accuracy_m NUMERIC,
  ADD COLUMN IF NOT EXISTS location_captured_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location_confirmed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE field_teams ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE incidents ADD CONSTRAINT incidents_location_source_check
    CHECK (location_source IN ('gps', 'manual_pin', 'legacy_unknown'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE bulletins
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS source_name TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_retrieved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE bulletins ADD CONSTRAINT bulletins_status_check
    CHECK (status IN ('draft', 'review', 'published', 'withdrawn', 'expired'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE whatsapp_channels
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Tag, do not delete, known sample records shipped with the old schema.
UPDATE incidents SET is_demo = true WHERE reference_number IN (
  'BCC-20260904-W281', 'BCC-20260904-S104', 'BCC-20260904-E001',
  'BCC-20260904-R899', 'BCC-20260904-L402'
);
UPDATE bulletins SET is_demo = true WHERE title IN (
  'Criterion Water Works Maintenance',
  'Luveve Road Resurfacing Update',
  'Refuse Collection Cycle (Ward 28)'
);
UPDATE field_teams SET is_demo = true WHERE name IN (
  'Eng. Nomvula Dube', 'Sipho Mthethwa', 'Famona Unit 4', 'BCC Roads Gang 2'
);

-- Existing contact rows have no verification provenance; keep them private.
UPDATE whatsapp_channels SET is_official = false WHERE last_verified_at IS NULL;

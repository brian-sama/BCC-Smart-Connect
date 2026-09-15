-- Migration 001: Support anonymous reporting
-- Adds direct contact fields to incidents so citizens don't need an account

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS reporter_phone     VARCHAR(20),
  ADD COLUMN IF NOT EXISTS reporter_fcm_token VARCHAR(255);

-- Index for FCM push look-ups on status change
CREATE INDEX IF NOT EXISTS idx_incidents_fcm ON incidents(reporter_fcm_token)
  WHERE reporter_fcm_token IS NOT NULL;

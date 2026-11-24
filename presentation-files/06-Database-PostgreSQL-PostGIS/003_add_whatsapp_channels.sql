-- Migration 003: Official City of Bulawayo WhatsApp Channels, Meter Readings & Ward Communities
CREATE TABLE IF NOT EXISTS whatsapp_channels (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                VARCHAR(200) NOT NULL,
  category            VARCHAR(50) NOT NULL DEFAULT 'WardGroup', -- 'Channel', 'WardGroup', 'Support', 'MeterReading'
  ward                VARCHAR(100),
  description         TEXT,
  invite_url          VARCHAR(500) NOT NULL,
  phone_number        VARCHAR(50),
  is_official         BOOLEAN NOT NULL DEFAULT false,
  member_count_approx VARCHAR(50) DEFAULT 'Active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_channels_category ON whatsapp_channels(category);
CREATE INDEX IF NOT EXISTS idx_whatsapp_channels_ward ON whatsapp_channels(ward);


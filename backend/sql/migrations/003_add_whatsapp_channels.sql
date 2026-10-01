-- Migration 003: Official City of Bulawayo WhatsApp Channels, Meter Readings & Ward Communities
CREATE TABLE IF NOT EXISTS whatsapp_channels (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                VARCHAR(200) NOT NULL,
  category            VARCHAR(50) NOT NULL DEFAULT 'WardGroup', -- 'Channel', 'WardGroup', 'Support', 'MeterReading'
  ward                VARCHAR(100),
  description         TEXT,
  invite_url          VARCHAR(500) NOT NULL,
  phone_number        VARCHAR(50),
  is_official         BOOLEAN NOT NULL DEFAULT true,
  member_count_approx VARCHAR(50) DEFAULT 'Active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_channels_category ON whatsapp_channels(category);
CREATE INDEX IF NOT EXISTS idx_whatsapp_channels_ward ON whatsapp_channels(ward);

-- Seed official BCC verified channels & helplines
INSERT INTO whatsapp_channels (name, category, ward, description, invite_url, phone_number, is_official, member_count_approx)
VALUES
  (
    'City of Bulawayo Official WhatsApp Channel',
    'Channel',
    'All Bulawayo Wards',
    'Follow the official verified City of Bulawayo WhatsApp Channel for daily water shedding updates, civic notices, emergency alerts, and exchange rates.',
    'https://whatsapp.com/channel/0029VbA48WT1iUxQRxulvU41',
    NULL,
    true,
    'Official Channel'
  ),
  (
    'BCC Customer Service & Enquiries',
    'Support',
    'All Bulawayo Wards',
    'Main City of Bulawayo customer care line for public inquiries, fault reporting, service updates, and citizen feedback.',
    'https://wa.me/263784136505?text=Hello%20City%20of%20Bulawayo%20Customer%20Care,%20I%20would%20like%20to%20make%20an%20enquiry.',
    '+263 78 413 6505',
    true,
    'Main Customer Line'
  ),
  (
    'BCC Monthly Water Meter Readings',
    'MeterReading',
    'All Bulawayo Wards',
    'Official WhatsApp number dedicated for Bulawayo residents to submit their monthly water meter readings and billing photos.',
    'https://wa.me/263713347319?text=Hello%20City%20of%20Bulawayo,%20I%20am%20submitting%20my%20monthly%20water%20meter%20reading.%0AAccount%20No:%20%0AAddress:%20%0AMeter%20Reading:%20',
    '+263 71 334 7319',
    true,
    'Water Readings Desk'
  ),
  (
    'Ward 1 - Bulawayo Central & Suburbs',
    'WardGroup',
    'Ward 1',
    'Community communication group for CBD, Suburbs, Kumalo, and Ascot residents and business owners.',
    'https://chat.whatsapp.com/BCCWard01CommunityGroup',
    NULL,
    true,
    '1,020 Members'
  ),
  (
    'Ward 3 - Kumalo, Suburbs & Parklands',
    'WardGroup',
    'Ward 3',
    'Residents group for Ward 3 infrastructure tracking, road maintenance updates, and neighborhood watch.',
    'https://chat.whatsapp.com/BCCWard03CommunityGroup',
    NULL,
    true,
    '880 Members'
  ),
  (
    'Ward 4 - Bradfield, Hillside & Famona',
    'WardGroup',
    'Ward 4',
    'Community group for Bradfield, Hillside, Famona, Morningside, and Greenhill residents.',
    'https://chat.whatsapp.com/BCCWard04CommunityGroup',
    NULL,
    true,
    '1,250 Members'
  ),
  (
    'Ward 7 - Makokoba & Mzilikazi',
    'WardGroup',
    'Ward 7',
    'Official Ward 7 community updates, sewer repair schedules, and council clinic notices.',
    'https://chat.whatsapp.com/BCCWard07CommunityGroup',
    NULL,
    true,
    '950 Members'
  ),
  (
    'Ward 14 - Luveve & Gwabalanda',
    'WardGroup',
    'Ward 14',
    'Civic group for Luveve and Gwabalanda residents coordinating water distribution and road maintenance.',
    'https://chat.whatsapp.com/BCCWard14CommunityGroup',
    NULL,
    true,
    '1,100 Members'
  ),
  (
    'Ward 20 - Nkulumane 1 to 5',
    'WardGroup',
    'Ward 20',
    'Nkulumane community liaison group for service delivery, refuse collection schedules, and civic alerts.',
    'https://chat.whatsapp.com/BCCWard20CommunityGroup',
    NULL,
    true,
    '1,340 Members'
  ),
  (
    'Ward 28 - Cowdray Park',
    'WardGroup',
    'Ward 28',
    'Cowdray Park municipal updates group for sewer works, road gravelling, and water kiosk schedules.',
    'https://chat.whatsapp.com/BCCWard28CommunityGroup',
    NULL,
    true,
    '1,800 Members'
  )
ON CONFLICT DO NOTHING;

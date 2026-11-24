-- Migration 007: Widen reference_number and active_ticket columns to fit 29-char
-- cryptographically random incident references (BCC-YYYYMMDD-<16 hex chars>).

ALTER TABLE incidents ALTER COLUMN reference_number TYPE VARCHAR(40);
ALTER TABLE field_teams ALTER COLUMN active_ticket TYPE VARCHAR(40);

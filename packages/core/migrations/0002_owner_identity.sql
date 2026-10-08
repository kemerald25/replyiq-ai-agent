-- Migration 0002_owner_identity.sql
-- Add identity_key column to owners table to support both E.164 phone numbers and WhatsApp LID identities

ALTER TABLE owners ADD COLUMN identity_key TEXT;
UPDATE owners SET identity_key = phone_number WHERE identity_key IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_owners_identity_key ON owners(identity_key);

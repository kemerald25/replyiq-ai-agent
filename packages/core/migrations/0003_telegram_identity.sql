-- Migration 0003_telegram_identity.sql
-- ReplyIQ Telegram Channel Identity Support
--
-- Owners can register and authenticate via Telegram Bot API using identity keys formatted as 'tg:<numeric_user_id>'.
-- The 'owners' table stores:
--   - identity_key: Unique identifier ('+234...', 'lid:...', or 'tg:...').
--   - phone_number: Confirmed WhatsApp contact number for the website visitor link (nullable).
-- For Telegram owners, phone_number starts NULL; website WhatsApp contact CTA remains hidden until confirmed.

-- Ensure index exists on identity_key for rapid lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_owners_identity_key ON owners(identity_key);

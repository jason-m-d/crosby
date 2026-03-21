-- Add metadata column to messages for persisting card track data
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;

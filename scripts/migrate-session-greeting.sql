-- Add snoozed_until and last_surfaced_at to action_items
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS snoozed_until timestamptz;
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS last_surfaced_at timestamptz;

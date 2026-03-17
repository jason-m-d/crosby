-- Self-modification features: dashboard cards, notification rules, bookmarks, UI preferences
-- Run: PGPASSWORD="..." psql -h db.wzhdyfprmgalyvodwrxf.supabase.co -U postgres -d postgres -f scripts/migrate-self-mod.sql

-- Dashboard cards (pinned summary/alert cards on the dashboard)
CREATE TABLE IF NOT EXISTS dashboard_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  card_type TEXT NOT NULL DEFAULT 'summary' CHECK (card_type IN ('summary', 'alert', 'custom')),
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE dashboard_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage dashboard cards" ON dashboard_cards
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Notification rules (email alert triggers)
CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  match_type TEXT NOT NULL CHECK (match_type IN ('sender', 'subject', 'keyword')),
  match_value TEXT NOT NULL,
  match_field TEXT DEFAULT 'any',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage notification rules" ON notification_rules
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Bookmarks (project-scoped links)
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage bookmarks" ON bookmarks
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- UI preferences (key-value store for UI settings)
CREATE TABLE IF NOT EXISTS ui_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ui_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage ui preferences" ON ui_preferences
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

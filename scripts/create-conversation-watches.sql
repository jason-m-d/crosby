-- Create conversation_watches table for proactive email/event monitoring
CREATE TABLE conversation_watches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  conversation_id UUID REFERENCES conversations(id) NULL,
  watch_type TEXT NOT NULL CHECK (watch_type IN ('email_reply', 'keyword', 'sender', 'topic')),
  match_criteria JSONB NOT NULL,
  context TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('high', 'normal')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'triggered', 'expired')),
  source_thread_id TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  triggered_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ DEFAULT now() + interval '30 days'
);

CREATE INDEX idx_watches_active ON conversation_watches(user_id, status) WHERE status = 'active';
CREATE INDEX idx_watches_type ON conversation_watches(watch_type, status);

# Database Schema — Architecture Spec

*Last updated: 2026-03-25*

---

## Overview

Supabase Postgres 16 with pgvector extension. All tables use Row Level Security (RLS) scoped to the authenticated user. Schema designed for a single-user v2 launch with multi-user support baked into the structure (every table has a `user_id` column).

---

## Design Principles

- **user_id on everything.** Even though v2 is single-user, every row is scoped to a user. This makes multi-user a config change, not a schema migration.
- **Soft deletes where specified.** Artifacts use soft delete (1-month holding bay). Memories use supersession (never deleted). Most other tables use hard delete.
- **Embeddings inline.** Vector columns live on the tables that need them (messages, memories, document_chunks). No separate vector tables.
- **Timestamps everywhere.** Every table has `created_at` and `updated_at`. Operational tables add domain-specific timestamps.
- **snake_case for all columns.** Supabase convention.

---

## Extensions Required

```sql
CREATE EXTENSION IF NOT EXISTS vector;        -- pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- trigram for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pgcrypto;      -- UUID generation
```

---

## Core Tables

### users
Managed by Supabase Auth. Extended with a profile table.

```sql
-- Supabase manages auth.users automatically.
-- This is our extension table.

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  language TEXT DEFAULT 'en',
  tone_preference TEXT DEFAULT 'balanced' CHECK (tone_preference IN ('casual', 'professional', 'balanced')),
  response_length TEXT DEFAULT 'standard' CHECK (response_length IN ('concise', 'standard', 'detailed')),
  quiet_hours_enabled BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME DEFAULT '21:00',
  quiet_hours_end TIME DEFAULT '07:00',
  briefing_cadence TEXT DEFAULT 'morning' CHECK (briefing_cadence IN ('morning', 'morning_afternoon', 'morning_afternoon_evening')),
  overnight_builder_enabled BOOLEAN DEFAULT TRUE,
  quiz_sessions_enabled BOOLEAN DEFAULT TRUE,
  overnight_research_enabled BOOLEAN DEFAULT TRUE,
  greeting_state JSONB DEFAULT '{}',          -- Living greeting: { content, isMutable, generatedAt }. One active greeting per user.
  notification_preferences JSONB DEFAULT '{
    "briefings": { "push": true, "in_app": true },
    "nudges": { "push": true, "in_app": true },
    "heads_ups": { "push": true, "in_app": true },
    "watch_alerts": { "push": true, "in_app": true },
    "research_complete": { "push": true, "in_app": true }
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Conversation & Messages

### messages
The single continuous conversation. No conversation ID needed — one conversation per user.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content JSONB NOT NULL,                     -- Anthropic content block format (text, tool_use, tool_result)
  message_type TEXT DEFAULT 'chat' CHECK (message_type IN (
    'chat', 'briefing', 'nudge', 'heads_up', 'greeting', 'system', 'research_complete', 'overnight_build'
  )),
  session_id UUID REFERENCES sessions(id),
  expert_ids UUID[],                          -- Which Experts were active
  specialist_ids TEXT[],                       -- Which specialists were active
  metadata JSONB DEFAULT '{}',                -- Card tracks, citations, etc.
  embedding VECTOR(1536),                     -- For message RAG search
  embedded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_user_created ON messages(user_id, created_at DESC);
CREATE INDEX idx_messages_user_type ON messages(user_id, message_type);
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_embedding ON messages USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### sessions
Chapters within the infinite conversation. Auto-close after 30 messages or 2 hours idle.

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  message_count INT DEFAULT 0,
  summary TEXT,                               -- Generated on session close
  primary_expert_id UUID REFERENCES experts(id),
  topics TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id, started_at DESC);
```

### context_summaries
Rolling context summary — one per user, overwritten on each refresh.

```sql
CREATE TABLE context_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,                      -- The summary text
  token_count INT,                            -- Approximate token count of summary
  last_message_id UUID REFERENCES messages(id),  -- Last message included in summary
  refreshed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Memory System

### semantic_memories
Facts and preferences about the user and their world.

```sql
CREATE TABLE semantic_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,                      -- Self-contained memory text
  importance INT NOT NULL CHECK (importance BETWEEN 1 AND 10),
  confidence FLOAT DEFAULT 1.0,
  entity_tags TEXT[] DEFAULT '{}',            -- People, places, businesses, topics
  embedding VECTOR(1536),
  superseded_at TIMESTAMPTZ,                  -- NULL = active
  superseded_by UUID REFERENCES semantic_memories(id),
  scanned_at TIMESTAMPTZ,                     -- Contradiction scan timestamp
  last_accessed_at TIMESTAMPTZ,
  access_count INT DEFAULT 0,
  source_message_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_semantic_user_active ON semantic_memories(user_id) WHERE superseded_at IS NULL;
CREATE INDEX idx_semantic_entities ON semantic_memories USING gin(entity_tags);
CREATE INDEX idx_semantic_embedding ON semantic_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_semantic_unscannable ON semantic_memories(user_id) WHERE scanned_at IS NULL AND superseded_at IS NULL;
```

### episodic_memories
Narrative accounts of specific events and interactions.

```sql
CREATE TABLE episodic_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                        -- Human-readable event description
  narrative TEXT NOT NULL,                    -- Third-person account
  keywords TEXT[] DEFAULT '{}',
  entity_tags TEXT[] DEFAULT '{}',
  importance INT NOT NULL CHECK (importance BETWEEN 1 AND 10),
  time_start TIMESTAMPTZ,
  time_end TIMESTAMPTZ,
  session_id UUID REFERENCES sessions(id),
  embedding VECTOR(1536),
  last_accessed_at TIMESTAMPTZ,
  access_count INT DEFAULT 0,
  source_message_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_episodic_user ON episodic_memories(user_id, created_at DESC);
CREATE INDEX idx_episodic_entities ON episodic_memories USING gin(entity_tags);
CREATE INDEX idx_episodic_embedding ON episodic_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_episodic_temporal ON episodic_memories(user_id, time_start, time_end);
```

### procedural_memories
Learned behavioral patterns and shortcuts.

```sql
CREATE TABLE procedural_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                         -- "When Jason says 'send the numbers'"
  trigger_pattern TEXT NOT NULL,              -- Natural language trigger description
  action_description TEXT NOT NULL,           -- What to do when triggered
  example_invocations TEXT[] DEFAULT '{}',
  confidence FLOAT DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  category TEXT,                              -- email, tasks, tone, etc.
  last_triggered_at TIMESTAMPTZ,
  trigger_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_procedural_user ON procedural_memories(user_id);
CREATE INDEX idx_procedural_confidence ON procedural_memories(user_id, confidence DESC);
```

---

## Experts

### experts

```sql
CREATE TABLE experts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,                           -- What this Expert covers
  instructions TEXT,                          -- Behavioral rules for this Expert
  color TEXT,                                 -- HSL format: "210 80% 55%" (hue saturation lightness, no commas). Used for Expert Drift tinting.
  icon TEXT,                                  -- Lucide icon name
  is_active BOOLEAN DEFAULT FALSE,            -- Currently in Direct Activation mode
  ambient_confidence FLOAT DEFAULT 0.0,       -- Current ambient confidence (0-1)
  pinned_document_ids UUID[] DEFAULT '{}',    -- Documents always loaded in Tier 1
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_experts_user ON experts(user_id);
CREATE INDEX idx_experts_active ON experts(user_id) WHERE is_active = TRUE;
```

### expert_documents
Documents associated with an Expert (for Tier 1/Tier 2 loading).

```sql
CREATE TABLE expert_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  importance FLOAT DEFAULT 0.5,               -- For Tier 1 cut decisions. Updated by overnight cron based on access_count, last_accessed_at, and is_pinned. Pinned docs always get importance 1.0.
  is_pinned BOOLEAN DEFAULT FALSE,
  last_accessed_at TIMESTAMPTZ,
  access_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(expert_id, document_id)
);
```

---

## Tasks & Commitments

### tasks

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'dismissed', 'delegated')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_commitment BOOLEAN DEFAULT FALSE,        -- Commitment flag (faster escalation)
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  dismissal_reason TEXT,
  nudge_count INT DEFAULT 0,                  -- Escalation tracking
  last_nudged_at TIMESTAMPTZ,
  escalation_level INT DEFAULT 0,             -- 0=none, 1=gentle, 2=direct, 3=escalated
  entity_tags TEXT[] DEFAULT '{}',
  expert_id UUID REFERENCES experts(id),
  source_message_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_user_due ON tasks(user_id, due_date) WHERE status = 'open';
CREATE INDEX idx_tasks_commitments ON tasks(user_id) WHERE is_commitment = TRUE AND status = 'open';
```

### decisions

```sql
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision_text TEXT NOT NULL,
  context TEXT,                               -- Why this decision was made
  alternatives_considered TEXT[],
  entity_tags TEXT[] DEFAULT '{}',
  expert_id UUID REFERENCES experts(id),
  source_message_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_decisions_user ON decisions(user_id, created_at DESC);
```

---

## Contacts

### contacts

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  organization TEXT,
  relationship_type TEXT,                     -- Open-ended: client, vendor, friend, etc.
  is_promoted BOOLEAN DEFAULT FALSE,          -- FALSE = shadow record, TRUE = full contact
  promoted_at TIMESTAMPTZ,
  role_aliases TEXT[] DEFAULT '{}',           -- "my lawyer", "the bookkeeper"
  interaction_count INT DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',               -- Flexible per-contact data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_user ON contacts(user_id);
CREATE INDEX idx_contacts_promoted ON contacts(user_id) WHERE is_promoted = TRUE;
CREATE INDEX idx_contacts_email ON contacts(user_id, email);
CREATE INDEX idx_contacts_name ON contacts USING gin(name gin_trgm_ops);
```

### contact_channels
Multiple identifiers (emails, phones, aliases) per contact for entity resolution.

```sql
CREATE TABLE contact_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('email', 'phone', 'alias', 'google_contact_id')),
  value TEXT NOT NULL,                           -- The identifier: email address, phone number, alias string
  is_primary BOOLEAN DEFAULT FALSE,
  source TEXT,                                   -- Where this identifier was first seen: gmail, calendar, chat, manual
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, channel_type, value)
);

CREATE INDEX idx_channels_contact ON contact_channels(contact_id);
CREATE INDEX idx_channels_value ON contact_channels(channel_type, value);
```

---

## Watches & Monitors

### watches

```sql
CREATE TABLE watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,                  -- What we're watching for
  watch_type TEXT DEFAULT 'watch' CHECK (watch_type IN ('watch', 'monitor')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'stale', 'dismissed')),
  condition TEXT,                             -- What triggers resolution
  resolution_summary TEXT,                    -- What happened when resolved
  resolved_at TIMESTAMPTZ,
  stale_at TIMESTAMPTZ,                       -- When Crosby flagged it as stale
  contact_id UUID REFERENCES contacts(id),
  expert_id UUID REFERENCES experts(id),
  entity_tags TEXT[] DEFAULT '{}',
  source_message_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_watches_user_active ON watches(user_id) WHERE status = 'active';
CREATE INDEX idx_watches_type ON watches(user_id, watch_type);
```

---

## Documents & RAG

### documents

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT,                              -- Supabase Storage URL
  file_type TEXT,                             -- pdf, docx, txt, etc.
  file_size INT,
  source TEXT DEFAULT 'upload' CHECK (source IN ('upload', 'chat_attachment', 'artifact', 'deep_research')),
  is_pinned BOOLEAN DEFAULT FALSE,
  expert_id UUID REFERENCES experts(id),
  metadata JSONB DEFAULT '{}',
  tombstone TEXT,                             -- One-line record after hard delete
  deleted_at TIMESTAMPTZ,                     -- Soft delete
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_user ON documents(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_source ON documents(user_id, source);
CREATE INDEX idx_documents_expert ON documents(expert_id);
```

### document_chunks

```sql
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### artifacts
Crosby-created documents (reports, plans, checklists).

```sql
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  artifact_type TEXT DEFAULT 'freeform' CHECK (artifact_type IN ('plan', 'spec', 'checklist', 'report', 'freeform')),
  version INT DEFAULT 1,
  expert_id UUID REFERENCES experts(id),
  importance FLOAT DEFAULT 0.5,
  is_pinned BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,                     -- Soft delete (1-month holding bay)
  spec_summary TEXT,                          -- Retained indefinitely after hard delete
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_artifacts_user ON artifacts(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_artifacts_expert ON artifacts(expert_id);

-- Artifact version history
CREATE TABLE artifact_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  version INT NOT NULL,
  content TEXT NOT NULL,
  change_summary TEXT,
  changed_by TEXT CHECK (changed_by IN ('user', 'assistant')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Notepad

### notepad_entries

```sql
CREATE TABLE notepad_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  expert_id UUID REFERENCES experts(id),
  is_pinned BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,                     -- Crosby-set expiry (NULL = no expiry)
  source_message_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notepad_user ON notepad_entries(user_id);
CREATE INDEX idx_notepad_expert ON notepad_entries(expert_id);
CREATE INDEX idx_notepad_expired ON notepad_entries(expires_at) WHERE expires_at IS NOT NULL AND is_pinned = FALSE;
```

---

## Email Integration

### email_threads

```sql
CREATE TABLE email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_thread_id TEXT NOT NULL UNIQUE,
  gmail_message_id TEXT,                      -- Latest message ID
  subject TEXT,
  from_address TEXT,
  from_name TEXT,
  snippet TEXT,                               -- Preview text
  needs_response BOOLEAN DEFAULT FALSE,
  response_detected BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  labels TEXT[] DEFAULT '{}',
  contact_id UUID REFERENCES contacts(id),
  received_at TIMESTAMPTZ,
  scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_user ON email_threads(user_id, received_at DESC);
CREATE INDEX idx_email_needs_response ON email_threads(user_id) WHERE needs_response = TRUE AND response_detected = FALSE;
CREATE INDEX idx_email_gmail_id ON email_threads(gmail_thread_id);
```

### gmail_tokens

```sql
CREATE TABLE gmail_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[] DEFAULT '{}',                 -- Which OAuth scopes are granted
  history_id TEXT,                            -- Gmail history ID for incremental sync
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Calendar Integration

### calendar_events

```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  calendar_id TEXT DEFAULT 'primary',
  title TEXT,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT FALSE,
  attendees JSONB DEFAULT '[]',
  status TEXT DEFAULT 'confirmed',
  sync_token TEXT,                            -- For incremental sync
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calendar_user ON calendar_events(user_id, start_time);
CREATE INDEX idx_calendar_google_id ON calendar_events(google_event_id);
CREATE INDEX idx_calendar_upcoming ON calendar_events(user_id, start_time) WHERE start_time > NOW();
```

---

## Text/SMS Integration

### text_messages

```sql
CREATE TABLE text_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id TEXT,                             -- iMessage thread identifier
  contact_phone TEXT,
  contact_name TEXT,
  content TEXT,
  direction TEXT CHECK (direction IN ('incoming', 'outgoing')),
  contact_id UUID REFERENCES contacts(id),
  received_at TIMESTAMPTZ,
  scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_texts_user ON text_messages(user_id, received_at DESC);
```

---

## Background Jobs & Activity Log

### background_jobs

```sql
CREATE TABLE background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,                     -- deep_research, overnight_build, expert_research, etc.
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'paused', 'success', 'failed', 'cancelled')),
  category TEXT DEFAULT 'heavy' CHECK (category IN ('heavy', 'lightweight')),
  priority INT DEFAULT 2 CHECK (priority BETWEEN 1 AND 3), -- 1=user, 2=user-adjacent, 3=system
  trigger_source TEXT,                        -- user, cron, system
  prompt TEXT,                                -- Job instructions
  result TEXT,                                -- Job output
  error TEXT,                                 -- Error message if failed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  timeout_at TIMESTAMPTZ,                     -- When to kill if still running
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_user_status ON background_jobs(user_id, status);
CREATE INDEX idx_jobs_queued ON background_jobs(status, priority, created_at) WHERE status = 'queued';
CREATE INDEX idx_jobs_running ON background_jobs(user_id) WHERE status = 'running' AND category = 'heavy';
```

### activity_log

```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_type TEXT NOT NULL CHECK (log_type IN (
    'cron', 'background_job', 'router_decision', 'error', 'proactive_decision', 'integration_health'
  )),
  status TEXT,                                -- success, failed, skipped, sent, absorbed, etc.
  summary TEXT,                               -- Human-readable description
  data JSONB DEFAULT '{}',                    -- Structured payload (varies by log_type)
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON activity_log(user_id, created_at DESC);
CREATE INDEX idx_activity_type ON activity_log(user_id, log_type, created_at DESC);

-- Auto-purge entries older than 90 days (run via cron or Supabase scheduled function)
```

### proactive_outbox
Dedup log for proactive messages.

```sql
CREATE TABLE proactive_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('briefing', 'nudge', 'heads_up', 'greeting')),
  decision TEXT NOT NULL CHECK (decision IN ('sent', 'skipped', 'absorbed', 'held')),
  content_preview TEXT,                       -- First ~100 chars
  related_topics TEXT[] DEFAULT '{}',
  related_item_ids UUID[] DEFAULT '{}',
  reason TEXT,                                -- Why this decision was made
  message_id UUID REFERENCES messages(id),    -- If sent, link to the message
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_outbox_user ON proactive_outbox(user_id, created_at DESC);
CREATE INDEX idx_outbox_type ON proactive_outbox(user_id, message_type, created_at DESC);
```

---

## Notification Rules & Push

### breakthrough_rules

```sql
CREATE TABLE breakthrough_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,                  -- "Always notify me if Roger emails"
  rule_type TEXT DEFAULT 'contact' CHECK (rule_type IN ('contact', 'keyword', 'integration', 'custom')),
  match_config JSONB NOT NULL,               -- { "contact_id": "...", "email": "roger@..." } or { "keyword": "deployment" }
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_breakthrough_user ON breakthrough_rules(user_id) WHERE is_active = TRUE;
```

### push_subscriptions

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'web')),
  token TEXT NOT NULL,                        -- Expo push token or web push subscription
  device_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_user ON push_subscriptions(user_id) WHERE is_active = TRUE;
```

### push_batch_window
Temporary holding table for batched push notifications (3-minute window).

```sql
CREATE TABLE push_batch_window (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batch_user ON push_batch_window(user_id, expires_at);
```

---

## Integration Health

### integration_health

```sql
CREATE TABLE integration_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration TEXT NOT NULL CHECK (integration IN ('gmail', 'google_calendar', 'imessage', 'openrouter', 'supabase', 'perplexity', 'cohere')),
  status TEXT DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'down', 'disconnected')),
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  last_error TEXT,
  consecutive_failures INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, integration)
);
```

---

## Dashboard

### dashboard_widgets

```sql
CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  widget_type TEXT NOT NULL,                  -- chart, table, count, list, status, timeline
  data_source TEXT NOT NULL,                  -- calendar, email, tasks, silo:<silo_id>, etc.
  config JSONB DEFAULT '{}',                  -- Widget-specific configuration
  position INT DEFAULT 0,                     -- Display order
  expert_id UUID REFERENCES experts(id),      -- Expert-aware reordering
  refresh_interval_seconds INT DEFAULT 600,   -- Default 10 min
  last_refreshed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('proposed', 'approved', 'active', 'rejected')), -- Overnight builder creates as 'proposed', user approves
  is_visible BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,                     -- Soft delete (1-month holding bay)
  spec JSONB,                                 -- Retained indefinitely after hard delete
  created_by TEXT DEFAULT 'system' CHECK (created_by IN ('system', 'user', 'overnight_builder')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_widgets_user ON dashboard_widgets(user_id) WHERE deleted_at IS NULL AND is_visible = TRUE;
```

---

## Silos (Future — Scaffolded for v2)

### silos

```sql
CREATE TABLE silos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  silo_type TEXT DEFAULT 'core' CHECK (silo_type IN ('core', 'marketplace', 'custom')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'building', 'error', 'disabled')),
  tools JSONB DEFAULT '[]',                   -- Tool schemas
  prompt_section TEXT,                        -- System prompt text when active
  trigger_rules JSONB DEFAULT '{}',           -- JSON trigger rules
  connections JSONB DEFAULT '{}',             -- API credentials (encrypted)
  sync_schedule TEXT,                         -- Cron expression for data sync
  config JSONB DEFAULT '{}',                  -- Silo-specific configuration
  error_log JSONB DEFAULT '[]',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_silos_user ON silos(user_id) WHERE status = 'active';
```

---

## Onboarding

### onboarding_progress
Tracks onboarding completeness score per user. Invisible to user — no progress bar.

```sql
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_connected BOOLEAN DEFAULT FALSE,
  calendar_connected BOOLEAN DEFAULT FALSE,
  profile_depth INT DEFAULT 0,                   -- 0-3: how much Crosby knows about the user's work/life
  feature_discovery INT DEFAULT 0,               -- Count of core features tried (task, question, card interaction)
  first_briefing_received BOOLEAN DEFAULT FALSE,
  return_sessions INT DEFAULT 0,                 -- How many separate sessions the user has had
  completeness_score FLOAT DEFAULT 0.0,          -- Computed: weighted sum of above factors (0-1)
  completed_at TIMESTAMPTZ,                      -- When score hit threshold (NULL = still onboarding)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Training & Learning

### training_signals
Raw behavioral observations before they're processed into procedural memories.

```sql
CREATE TABLE training_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'draft_edit', 'artifact_edit', 'tone_correction', 'task_dismissed',
    'card_dismissed', 'card_engaged', 'repeated_question', 'explicit_correction',
    'feature_usage', 'widget_ignored', 'quiz_response'
  )),
  signal_data JSONB NOT NULL,                    -- Type-specific payload (original vs edited, what was dismissed, etc.)
  category TEXT,                                 -- email, tasks, tone, briefing, etc.
  strength FLOAT DEFAULT 0.5,                    -- Signal strength (0-1). Explicit corrections = 1.0, passive signals = 0.3-0.5
  processed_at TIMESTAMPTZ,                      -- When this signal was processed into a procedural memory (NULL = unprocessed)
  procedural_memory_id UUID REFERENCES procedural_memories(id), -- Which memory it contributed to
  source_message_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signals_user ON training_signals(user_id, created_at DESC);
CREATE INDEX idx_signals_unprocessed ON training_signals(user_id) WHERE processed_at IS NULL;
CREATE INDEX idx_signals_type ON training_signals(user_id, signal_type);
```

---

## Supabase RPC Functions

### match_documents (vector search)

```sql
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 10,
  filter_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE d.user_id = filter_user_id
    AND d.deleted_at IS NULL
    AND dc.embedding IS NOT NULL
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### match_messages (conversation history search)

```sql
CREATE OR REPLACE FUNCTION match_messages(
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 10,
  filter_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  role TEXT,
  content JSONB,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.role,
    m.content,
    1 - (m.embedding <=> query_embedding) AS similarity,
    m.created_at
  FROM messages m
  WHERE m.user_id = filter_user_id
    AND m.embedding IS NOT NULL
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### match_memories (semantic memory search)

```sql
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 15,
  filter_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  importance INT,
  entity_tags TEXT[],
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sm.id,
    sm.content,
    sm.importance,
    sm.entity_tags,
    1 - (sm.embedding <=> query_embedding) AS similarity,
    sm.created_at
  FROM semantic_memories sm
  WHERE sm.user_id = filter_user_id
    AND sm.superseded_at IS NULL
    AND sm.embedding IS NOT NULL
  ORDER BY sm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## Row Level Security (RLS)

Every table with a `user_id` column gets RLS:

```sql
-- Example for messages (apply same pattern to all tables)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own messages"
  ON messages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Service role bypasses RLS** for server-side operations (cron jobs, background processing). The service role key is never exposed to the client.

---

## Migration Strategy

Migrations live in `packages/supabase/src/migrations/` as numbered SQL files:

```
001_initial_schema.sql         # Core tables
002_memory_system.sql          # Memory tables + RPC functions
003_integrations.sql           # Email, calendar, text tables
004_experts.sql                # Expert system tables
005_background_jobs.sql        # Jobs, activity log, outbox
006_dashboard.sql              # Widgets
007_silos.sql                  # Silo scaffolding
008_onboarding.sql             # Onboarding progress tracking
009_training.sql               # Training signals for behavioral learning
010_rls_policies.sql           # All RLS policies
011_indexes.sql                # Performance indexes
```

Run via `supabase db push` or the Supabase MCP `apply_migration` tool.

---

## Relationship to Product Specs

| Product spec | Tables |
|---|---|
| CONVERSATION-CONTINUITY.md | messages, context_summaries, sessions |
| PERSISTENT-MEMORY.md | semantic_memories, episodic_memories, procedural_memories |
| NOTEPAD.md | notepad_entries |
| EXPERTS.md + EXPERT-CONTEXT-LOADING.md | experts, expert_documents |
| TASKS-COMMITMENTS.md | tasks, decisions |
| CONTACTS-ENTITY-RESOLUTION.md | contacts, contact_channels |
| WATCHES-MONITORS.md | watches |
| DOCUMENTS.md + ARTIFACTS.md | documents, document_chunks, artifacts, artifact_versions |
| EMAIL-MANAGEMENT.md | email_threads, gmail_tokens |
| CALENDAR-INTEGRATION.md | calendar_events |
| TEXT-SMS.md | text_messages |
| BACKGROUND-JOBS.md | background_jobs |
| ACTIVITY-LOG.md | activity_log |
| NOTIFICATIONS.md | breakthrough_rules, push_subscriptions |
| PROACTIVE-MESSAGES.md | proactive_outbox |
| DASHBOARD-OVERNIGHT-BUILDER.md | dashboard_widgets |
| SETTINGS.md | user_profiles |
| ERROR-HANDLING.md | integration_health |
| AUTH-ACCOUNT.md | user_profiles, gmail_tokens (OAuth) |
| SILOS.md | silos |
| ONBOARDING.md | onboarding_progress |
| TRAINING-LEARNING.md | training_signals |

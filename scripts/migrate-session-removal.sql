-- Session Removal Architecture Migration
-- Adds conversation_summaries, message_embeddings, and embedded_at column

-- conversation_summaries: rolling summaries replacing session-scoped context
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  summarized_through_message_id UUID REFERENCES messages(id),
  summarized_through_at TIMESTAMPTZ NOT NULL,
  token_count_at_summarization INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_summaries_conv_id ON conversation_summaries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_summaries_created ON conversation_summaries(created_at DESC);

-- message_embeddings: vector store for past conversation retrieval (RAG)
CREATE TABLE IF NOT EXISTS message_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  embedding vector(1024),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_embeddings_message_id ON message_embeddings(message_id);
CREATE INDEX IF NOT EXISTS idx_msg_embeddings_conversation_id ON message_embeddings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_msg_embeddings_embedding ON message_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Track which messages have been embedded
ALTER TABLE messages ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMPTZ;

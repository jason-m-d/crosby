-- Vector similarity search over message_embeddings
-- Called by the search_conversation_history tool executor

CREATE OR REPLACE FUNCTION search_message_embeddings(
  query_embedding vector(1024),
  conversation_id_filter uuid,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  message_id uuid,
  content text,
  role text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    me.id,
    me.message_id,
    me.content,
    m.role,
    1 - (me.embedding <=> query_embedding) AS similarity
  FROM message_embeddings me
  JOIN messages m ON m.id = me.message_id
  WHERE me.conversation_id = conversation_id_filter
    AND me.embedding IS NOT NULL
    AND 1 - (me.embedding <=> query_embedding) > match_threshold
  ORDER BY me.embedding <=> query_embedding
  LIMIT match_count;
$$;

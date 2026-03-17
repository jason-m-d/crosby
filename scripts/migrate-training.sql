-- Training examples: labeled snippets for action item extraction learning
CREATE TABLE training_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snippet text NOT NULL,
  is_action_item boolean NOT NULL,
  label_source text CHECK (label_source IN ('teach_me', 'feedback', 'implicit')),
  action_item_id uuid REFERENCES action_items(id) ON DELETE SET NULL,
  source_type text CHECK (source_type IN ('email', 'chat')),
  embedding vector(1024),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Vector similarity search for training examples
CREATE OR REPLACE FUNCTION match_training_examples(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5
)
RETURNS TABLE (id uuid, snippet text, is_action_item boolean, similarity float)
LANGUAGE sql STABLE
AS $$
  SELECT
    t.id,
    t.snippet,
    t.is_action_item,
    1 - (t.embedding <=> query_embedding) AS similarity
  FROM training_examples t
  WHERE t.embedding IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Training rules: extracted patterns from labeled examples
CREATE TABLE training_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule text NOT NULL,
  category text CHECK (category IN ('always_flag', 'never_flag', 'conditional')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add confidence score to action items
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS confidence float;

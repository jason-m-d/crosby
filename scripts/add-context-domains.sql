-- Add context_domains column to messages table for selective context injection tracking
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS context_domains text[] DEFAULT '{}';

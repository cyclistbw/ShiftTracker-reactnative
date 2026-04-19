-- Run once in Supabase SQL Editor.
-- Adds push_token column to user_profile for server-side push notifications.

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS push_token text;

-- Index for fast lookups when sending bulk notifications
CREATE INDEX IF NOT EXISTS user_profile_push_token_idx
  ON public.user_profile (push_token)
  WHERE push_token IS NOT NULL;

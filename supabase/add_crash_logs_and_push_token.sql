-- Migration: add crash_logs table and push_token column to user_profile
-- Run in the Supabase SQL editor for project gazozwwfhoewxpvrzcec
-- Idempotent — safe to run multiple times.

-- 1. crash_logs table — stores production crash reports captured by ErrorBoundary
create table if not exists public.crash_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  error_message text not null,
  error_stack text,
  component_stack text,
  app_version text,
  platform text,
  os_version text,
  device text,
  -- Free-form column for any extra metadata we want to attach later
  metadata jsonb
);

create index if not exists idx_crash_logs_created_at on public.crash_logs (created_at desc);
create index if not exists idx_crash_logs_user_id on public.crash_logs (user_id);

-- Row Level Security: anyone authenticated (or anonymous) can INSERT a crash report,
-- but only the project owner / service role can read them.
alter table public.crash_logs enable row level security;

-- Drop policies first so re-running this migration doesn't duplicate them
drop policy if exists "Anyone can insert crash logs" on public.crash_logs;
drop policy if exists "Service role can read crash logs" on public.crash_logs;

create policy "Anyone can insert crash logs"
  on public.crash_logs
  for insert
  to anon, authenticated
  with check (true);

-- (Reads are reserved for the dashboard / service role — no client read policy.)

-- 2. push_token column on user_profile — for server-side push notification sending
alter table public.user_profile
  add column if not exists push_token text;

create index if not exists idx_user_profile_push_token on public.user_profile (push_token)
  where push_token is not null;

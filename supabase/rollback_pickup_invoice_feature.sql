-- Rollback for the pickup / invoice feature added in v1.2.0.
-- Drops the four tables and bucket-level RLS policies.
-- Run in the Supabase SQL editor for project gazozwwfhoewxpvrzcec.
--
-- NOTE: The `pickup-photos` storage bucket itself must be deleted via the
-- Supabase Dashboard UI (Storage → pickup-photos → ⋯ → Delete bucket).
-- Supabase blocks direct DELETEs from storage.objects/storage.buckets
-- through the SQL editor as a safety measure.

-- 1. Drop tables (cascade handles FKs and policies)
drop table if exists public.pickup_qr_codes cascade;
drop table if exists public.pickup_events cascade;
drop table if exists public.pickup_reports cascade;
drop table if exists public.user_invoice_settings cascade;

-- 2. Drop bucket-level RLS policies (these CAN be dropped via SQL — only the
-- storage.objects/buckets row-level deletes are blocked)
drop policy if exists "Users read own pickup photos" on storage.objects;
drop policy if exists "Users upload own pickup photos" on storage.objects;
drop policy if exists "Users update own pickup photos" on storage.objects;
drop policy if exists "Users delete own pickup photos" on storage.objects;

-- ============================================================
-- Run this ONCE in Supabase Dashboard → SQL Editor
-- Creates the "feedback" table for JAZZY COLLECTION reviews
-- ============================================================

create table if not exists public.feedback (
  id             bigint generated always as identity primary key,
  customer_name  text        not null,
  rating         smallint    not null check (rating between 1 and 5),
  feedback       text        not null,
  created_at     timestamptz not null default now()
);

-- Enable security (RLS) and allow public insert + read only
alter table public.feedback enable row level security;

create policy "Allow public to submit feedback"
  on public.feedback for insert
  with check (true);

create policy "Allow public to read feedback"
  on public.feedback for select
  using (true);

-- No update/delete policy = anonymous visitors cannot edit or remove rows.

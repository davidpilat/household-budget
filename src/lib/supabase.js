import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

/* ─── SQL to run in Supabase SQL Editor ──────────────────────────────────────

create table expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  date date not null,
  description text not null,
  category text not null,
  amount numeric(10,2) not null,
  paid_by text not null
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  category text unique not null,
  amount numeric(10,2) not null default 0
);

create table settings (
  key text primary key,
  value text not null
);

-- Seed default budgets
insert into budgets (category, amount) values
  ('Housing', 1200),
  ('Food', 800),
  ('Transport', 300),
  ('Health', 200),
  ('Entertainment', 200),
  ('Shopping', 300),
  ('Other', 200);

-- Seed default settings
insert into settings (key, value) values
  ('p1_name', 'Partner 1'),
  ('p2_name', 'Partner 2'),
  ('p1_income', '0'),
  ('p2_income', '0');

-- Enable realtime for live sync
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table budgets;
alter publication supabase_realtime add table settings;

-- Disable RLS (household app, no auth needed)
alter table expenses disable row level security;
alter table budgets disable row level security;
alter table settings disable row level security;

─────────────────────────────────────────────────────────────────────────────*/

-- Deoghar Dash global leaderboard (run in Supabase SQL editor)
create table if not exists leaderboard (
  id uuid primary key default gen_random_uuid(),
  handle text not null check (char_length(handle) between 2 and 16),
  vehicle text not null,
  earnings int not null check (earnings between 0 and 99999),
  deliveries int not null check (deliveries between 0 and 200),
  best_combo numeric(3,2) not null default 1.0,
  duration_s int not null default 300,
  created_at timestamptz default now()
);

alter table leaderboard enable row level security;

create policy "anon can insert scores" on leaderboard
  for insert to anon with check (true);

create policy "anyone can read scores" on leaderboard
  for select to anon using (true);

-- no update/delete policies: scores are immutable
create index if not exists leaderboard_earnings_idx on leaderboard (earnings desc);

create table if not exists public.notification_states (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null,
  state text not null check (state in ('unread', 'read', 'archived')),
  read_at timestamptz null,
  archived_at timestamptz null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, item_id)
);

alter table public.notification_states enable row level security;

create policy "Users can read their own notification states"
  on public.notification_states
  for select
  using (auth.uid() = user_id);

create policy "Users can upsert their own notification states"
  on public.notification_states
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own notification states"
  on public.notification_states
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

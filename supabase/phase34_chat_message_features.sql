-- Phase 34: Chat message features
-- Adds: reactions, reply, forward, pin

-- ───── messages columns ─────
alter table public.messages
  add column if not exists reply_to_id uuid references public.messages(id) on delete set null,
  add column if not exists forwarded_from_id uuid references public.messages(id) on delete set null,
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_at timestamptz default null,
  add column if not exists pinned_by uuid references auth.users(id) on delete set null;

create index if not exists messages_pinned_idx
  on public.messages (conversation_id)
  where is_pinned = true;

create index if not exists messages_reply_to_idx
  on public.messages (reply_to_id);

-- ───── message_reactions table ─────
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

create index if not exists message_reactions_message_idx
  on public.message_reactions (message_id);

alter table public.message_reactions enable row level security;

-- Allow reading reactions for messages in conversations the user is a member of
drop policy if exists message_reactions_select on public.message_reactions;
create policy message_reactions_select on public.message_reactions
  for select using (
    exists (
      select 1
      from public.messages m
      join public.conversation_members cm
        on cm.conversation_id = m.conversation_id
      where m.id = message_reactions.message_id
        and cm.user_id = auth.uid()
    )
  );

-- Allow inserting own reactions on messages in own conversations
drop policy if exists message_reactions_insert on public.message_reactions;
create policy message_reactions_insert on public.message_reactions
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.messages m
      join public.conversation_members cm
        on cm.conversation_id = m.conversation_id
      where m.id = message_reactions.message_id
        and cm.user_id = auth.uid()
    )
  );

-- Allow deleting own reactions
drop policy if exists message_reactions_delete on public.message_reactions;
create policy message_reactions_delete on public.message_reactions
  for delete using (user_id = auth.uid());

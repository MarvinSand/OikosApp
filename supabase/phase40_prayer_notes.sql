-- ════════════════════════════════════════════════════════════════════════
-- Phase 40: Kommentare zu Gebetsanliegen (prayer_notes)
-- ════════════════════════════════════════════════════════════════════════
-- Einmal im Supabase SQL-Editor ausführen. Idempotent (mehrfach ausführbar).
--
-- Behebt:
--  "Fehler beim Kommentieren" – usePrayerFeed (addNote / Feed-Read) nutzt die
--  Tabelle prayer_notes, die in keiner Migration angelegt war. Dadurch schlugen
--  Insert und Read fehl.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.prayer_notes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.personal_prayer_requests(id) on delete cascade not null,
  author_id  uuid references public.profiles(id) on delete cascade not null,
  text text not null,
  is_public boolean default true,
  created_at timestamptz default now()
);

create index if not exists prayer_notes_request_idx on public.prayer_notes(request_id);

alter table public.prayer_notes enable row level security;

-- Insert: nur eigene Notizen
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Insert own prayer_notes' and tablename = 'prayer_notes') then
    create policy "Insert own prayer_notes" on public.prayer_notes for insert
      with check (author_id = auth.uid());
  end if;
end $$;

-- Select: öffentliche Notizen, eigene Notizen, oder als Ersteller des Anliegens
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Read prayer_notes' and tablename = 'prayer_notes') then
    create policy "Read prayer_notes" on public.prayer_notes for select
      using (
        is_public = true
        or author_id = auth.uid()
        or exists (
          select 1 from public.personal_prayer_requests p
          where p.id = prayer_notes.request_id and p.owner_id = auth.uid()
        )
      );
  end if;
end $$;

-- Delete: eigene Notizen löschen dürfen
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Delete own prayer_notes' and tablename = 'prayer_notes') then
    create policy "Delete own prayer_notes" on public.prayer_notes for delete
      using (author_id = auth.uid());
  end if;
end $$;

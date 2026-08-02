-- Phase 49: Anzeige, wie oft ein Post gespeichert wurde
--
-- Hintergrund: Die Engagement-Leiste soll neben Kommentar/Repost/Like auch
-- zeigen, wie oft ein Post gebookmarkt wurde. feed_bookmarks ist laut Phase 47
-- absichtlich privat (RLS erlaubt nur eigene Zeilen), daher zählen wir die
-- Bookmarks per Trigger in einer denormalisierten Spalte auf feed_posts mit –
-- so bleibt sichtbar WER gespeichert hat weiterhin privat, nur die Anzahl wird
-- öffentlich mitgezählt.
--
-- Ausführen: Supabase Dashboard → SQL Editor → Inhalt einfügen → Run
-- Idempotent: kann gefahrlos mehrfach ausgeführt werden.

alter table public.feed_posts
  add column if not exists bookmark_count integer not null default 0;

-- Bestehende Bookmarks einmalig nachzählen (falls die Spalte neu ist).
update public.feed_posts p
  set bookmark_count = (select count(*) from public.feed_bookmarks b where b.post_id = p.id)
  where exists (select 1 from public.feed_bookmarks b where b.post_id = p.id);

create or replace function public.feed_bookmarks_count_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.feed_posts set bookmark_count = bookmark_count + 1 where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.feed_posts set bookmark_count = greatest(bookmark_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_feed_bookmarks_count on public.feed_bookmarks;

create trigger trg_feed_bookmarks_count
  after insert or delete on public.feed_bookmarks
  for each row execute function public.feed_bookmarks_count_trigger();

NOTIFY pgrst, 'reload schema';

-- phase101: Jedes Mitglied darf in die Pinnwand schreiben und Termine eintragen
-- (RLS erlaubte das schon: posts_insert / events_insert). Anpinnen bleibt
-- Admins vorbehalten – ein Trigger verhindert, dass Mitglieder is_pinned setzen.
create or replace function public.community_posts_pin_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if coalesce(new.is_pinned, false)
     and not (public.is_community_admin(new.community_id) or public.is_app_admin()) then
    if tg_op = 'INSERT' then
      new.is_pinned := false;
    else
      new.is_pinned := old.is_pinned;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_community_posts_pin_guard on public.community_posts;
create trigger trg_community_posts_pin_guard
  before insert or update of is_pinned on public.community_posts
  for each row execute function public.community_posts_pin_guard();

-- Titel ist im Formular optional, die Spalte war aber NOT NULL (Beiträge ohne Titel scheiterten).
alter table public.community_posts alter column title drop not null;

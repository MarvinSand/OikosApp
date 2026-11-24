-- Oikos Map: eigener Hintergrund (Farbe oder Foto).
-- bg_color: Hex-Farbe (#RRGGBB), bg_image_url: öffentliche URL im Bucket
-- oikos-map-backgrounds (<user_id>/<map_id>.webp|jpg, stark verkleinert).
alter table public.oikos_maps
  add column if not exists bg_color text,
  add column if not exists bg_image_url text;

do $$ begin
  alter table public.oikos_maps
    add constraint oikos_maps_bg_color_check
    check (bg_color is null or bg_color ~ '^#[0-9A-Fa-f]{6}$');
exception when duplicate_object then null; end $$;

insert into storage.buckets (id, name, public)
values ('oikos-map-backgrounds', 'oikos-map-backgrounds', true)
on conflict (id) do update set public = true;

drop policy if exists "oikos map backgrounds readable" on storage.objects;
create policy "oikos map backgrounds readable" on storage.objects for select
  using (bucket_id = 'oikos-map-backgrounds');

-- Schreiben/Ändern/Löschen nur im eigenen Ordner: <user_id>/<map_id>.webp
drop policy if exists "oikos map backgrounds insert own" on storage.objects;
create policy "oikos map backgrounds insert own" on storage.objects for insert
  with check (
    bucket_id = 'oikos-map-backgrounds'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "oikos map backgrounds update own" on storage.objects;
create policy "oikos map backgrounds update own" on storage.objects for update
  using (
    bucket_id = 'oikos-map-backgrounds'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "oikos map backgrounds delete own" on storage.objects;
create policy "oikos map backgrounds delete own" on storage.objects for delete
  using (
    bucket_id = 'oikos-map-backgrounds'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

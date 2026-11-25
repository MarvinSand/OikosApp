-- phase109: Name und Farbe des Mittelpunkts einer Oikos Map einstellbar. Idempotent.
alter table public.oikos_maps
  add column if not exists center_name text,
  add column if not exists center_color text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'oikos_maps_center_color_check') then
    alter table public.oikos_maps add constraint oikos_maps_center_color_check
      check (center_color is null or center_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'oikos_maps_center_name_check') then
    alter table public.oikos_maps add constraint oikos_maps_center_name_check
      check (center_name is null or char_length(center_name) <= 40);
  end if;
end $$;

comment on column public.oikos_maps.center_name is 'Optionaler Name in der Mitte der Map (statt Nutzername)';
comment on column public.oikos_maps.center_color is 'Optionale Farbe (#RRGGBB) des Mittelpunkts';

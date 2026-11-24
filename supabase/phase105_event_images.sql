-- phase105: Bilder in der Event-Beschreibung (bis zu 4, öffentliche URLs aus
-- dem Bucket feed-photos, Pfad <user>/events/…). Idempotent.
alter table public.world_map_activities
  add column if not exists image_urls text[];

comment on column public.world_map_activities.image_urls is
  'Bilder zur Event-Beschreibung (öffentliche Storage-URLs, max. 4)';

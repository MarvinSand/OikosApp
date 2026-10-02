-- Phase 66: Ersteller eines Events wird bei "Beigetreten" mitgezählt (Backfill)
--
-- Der Ersteller (author_id) eines world_map_activities-Events wurde beim Erstellen
-- bisher nicht automatisch in activity_participants eingetragen (nur die
-- Chat-Mitgliedschaft in conversation_members). Dadurch zeigten
-- ActivitySheet.jsx ("Beigetreten (N)"), der Kartenpin und die Drawer-Liste
-- den Ersteller nicht als Teilnehmer an, obwohl er faktisch dabei ist.
--
-- Der Frontend-Fix (createActivity() ruft ab jetzt join_activity() statt
-- create_activity_chat() auf) deckt neue Events ab. Dieser Backfill holt
-- bereits existierende Events nach.

insert into public.activity_participants (activity_id, user_id)
select id, author_id from public.world_map_activities
on conflict (activity_id, user_id) do nothing;

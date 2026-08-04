-- Fix: user deletion (via Supabase Dashboard or delete_user() RPC) fails with
-- "Failed to delete user: {}" because several foreign keys to auth.users(id)
-- have no ON DELETE action (defaults to NO ACTION / RESTRICT). Every user has
-- at least a profiles row, so deletion always failed. Add ON DELETE CASCADE
-- to match the rest of the schema (community_members, friendships, prayer_logs, etc.
-- already cascade correctly).

alter table public.profiles
  drop constraint if exists profiles_id_fkey,
  add constraint profiles_id_fkey
    foreign key (id) references auth.users(id) on delete cascade;

alter table public.oikos_people
  drop constraint if exists oikos_people_user_id_fkey,
  add constraint oikos_people_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.oikos_maps
  drop constraint if exists oikos_maps_user_id_fkey,
  add constraint oikos_maps_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.messages
  drop constraint if exists messages_sender_id_fkey,
  add constraint messages_sender_id_fkey
    foreign key (sender_id) references auth.users(id) on delete cascade;

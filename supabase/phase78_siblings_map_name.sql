-- phase78: Name der Systemkarte → „Meine Geschwister in Christus (mit Account)"
create or replace function public.ensure_siblings_map(p_user uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.oikos_maps (user_id, name, visibility, kind)
  values (p_user, 'Meine Geschwister in Christus (mit Account)', 'public', 'siblings')
  on conflict (user_id) where kind = 'siblings' do nothing;
  select id into v_id from public.oikos_maps where user_id = p_user and kind = 'siblings';
  return v_id;
end; $$;

update public.oikos_maps set name = 'Meine Geschwister in Christus (mit Account)'
 where kind = 'siblings' and name <> 'Meine Geschwister in Christus (mit Account)';

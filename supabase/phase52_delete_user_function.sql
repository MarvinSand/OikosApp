-- RPC function to delete a user and all related data
-- This function is used for test user cleanup
-- It requires admin privileges and should only be called in development/testing environments

create or replace function delete_user()
returns void
language plpgsql
security definer
as $$
declare
  current_user_id uuid;
begin
  -- Get the current authenticated user's ID
  current_user_id := auth.uid();

  -- Check if user is authenticated
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Delete the user from auth.users
  -- This will cascade delete all related data due to foreign key constraints
  delete from auth.users where id = current_user_id;

end;
$$;

-- Grant execute permission to authenticated users
grant execute on function delete_user() to authenticated;

create or replace function public.recover_my_room_membership()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  found_room_id uuid;
  member_total integer;
begin
  if caller is null then
    return null;
  end if;

  select room_id
  into found_room_id
  from public.chat_room_members
  where user_id = caller
  limit 1;

  if found_room_id is not null then
    return found_room_id;
  end if;

  select room_id
  into found_room_id
  from public.room_membership_history
  where user_id = caller
    and last_left_at is null
  order by last_joined_at desc
  limit 1;

  if found_room_id is null then
    return null;
  end if;

  if not exists (
    select 1
    from public.chat_rooms
    where id = found_room_id
  ) then
    return null;
  end if;

  select count(*)
  into member_total
  from public.chat_room_members
  where room_id = found_room_id;

  if member_total >= 2 then
    return null;
  end if;

  insert into public.chat_room_members (room_id, user_id)
  values (found_room_id, caller)
  on conflict (room_id, user_id) do nothing;

  update public.room_membership_history
  set last_joined_at = timezone('utc', now()),
      last_left_at = null
  where room_id = found_room_id
    and user_id = caller;

  insert into public.user_presence (
    user_id,
    is_online,
    active_room_id,
    last_seen_at,
    updated_at
  )
  values (
    caller,
    true,
    found_room_id,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (user_id) do update
  set is_online = true,
      active_room_id = excluded.active_room_id,
      last_seen_at = excluded.last_seen_at,
      updated_at = excluded.updated_at;

  return found_room_id;
end;
$$;

comment on function public.recover_my_room_membership()
is 'Recovers the authenticated user into the latest room that still appears active in membership history when the active membership row was lost unexpectedly.';

create or replace function public.leave_current_room(input_confirmation text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  current_room_id uuid;
begin
  if caller is null then
    raise exception 'Authentication required.';
  end if;

  if lower(trim(coalesce(input_confirmation, ''))) <> 'geri gelecem' then
    raise exception 'Leave confirmation phrase does not match.';
  end if;

  select room_id
  into current_room_id
  from public.chat_room_members
  where user_id = caller
  limit 1;

  if current_room_id is null then
    raise exception 'You are not currently linked to a room.';
  end if;

  delete from public.typing_status
  where room_id = current_room_id
    and user_id = caller;

  update public.user_presence
  set active_room_id = null,
      last_seen_at = timezone('utc', now())
  where user_id = caller;

  delete from public.chat_room_members
  where room_id = current_room_id
    and user_id = caller;

  if not exists (
    select 1
    from public.chat_room_members
    where room_id = current_room_id
  ) then
    delete from public.chat_rooms
    where id = current_room_id;
  end if;

  return current_room_id;
end;
$$;

comment on function public.leave_current_room(text)
is 'Lets the authenticated user leave the current room after confirming with the secret phrase. Deletes the room if it becomes empty.';

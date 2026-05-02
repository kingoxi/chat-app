create table if not exists public.room_membership_history (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  first_joined_at timestamptz not null default timezone('utc', now()),
  last_joined_at timestamptz not null default timezone('utc', now()),
  last_left_at timestamptz,
  primary key (room_id, user_id)
);

alter table public.room_membership_history enable row level security;

drop policy if exists "room_membership_history_select_own" on public.room_membership_history;
create policy "room_membership_history_select_own"
on public.room_membership_history
for select
using (auth.uid() = user_id);

drop policy if exists "room_membership_history_insert_own" on public.room_membership_history;
create policy "room_membership_history_insert_own"
on public.room_membership_history
for insert
with check (auth.uid() = user_id);

drop policy if exists "room_membership_history_update_own" on public.room_membership_history;
create policy "room_membership_history_update_own"
on public.room_membership_history
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into public.room_membership_history (room_id, user_id, first_joined_at, last_joined_at)
select room_id, user_id, joined_at, joined_at
from public.chat_room_members
on conflict (room_id, user_id) do update
set last_joined_at = excluded.last_joined_at;

create or replace function public.remember_room_membership(
  input_room_id uuid,
  input_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid := coalesce(input_user_id, auth.uid());
begin
  if target_user_id is null then
    raise exception 'Authentication required.';
  end if;

  insert into public.room_membership_history (
    room_id,
    user_id,
    first_joined_at,
    last_joined_at,
    last_left_at
  )
  values (
    input_room_id,
    target_user_id,
    timezone('utc', now()),
    timezone('utc', now()),
    null
  )
  on conflict (room_id, user_id) do update
  set last_joined_at = timezone('utc', now()),
      last_left_at = null;
end;
$$;

drop function if exists public.create_private_room(text);
create or replace function public.create_private_room(input_room_code text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  new_room_id uuid;
  normalized_room_code text := nullif(upper(trim(coalesce(input_room_code, ''))), '');
begin
  if caller is null then
    raise exception 'Authentication required.';
  end if;

  if exists (
    select 1 from public.chat_room_members where user_id = caller
  ) then
    raise exception 'You are already a member of another room.';
  end if;

  if normalized_room_code is not null then
    if normalized_room_code !~ '^[A-Z0-9_-]{4,24}$' then
      raise exception 'Room code must be 4-24 chars and use only letters, numbers, dash or underscore.';
    end if;

    if exists (
      select 1 from public.chat_rooms where room_code = normalized_room_code
    ) then
      raise exception 'Room code is already in use.';
    end if;
  end if;

  insert into public.chat_rooms (created_by, room_code)
  values (caller, coalesce(normalized_room_code, public.generate_room_code()))
  returning id into new_room_id;

  insert into public.chat_room_members (room_id, user_id)
  values (new_room_id, caller);

  perform public.remember_room_membership(new_room_id, caller);

  return new_room_id;
end;
$$;

create or replace function public.join_room_by_code(input_room_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  target_room_id uuid;
  member_total integer;
begin
  if caller is null then
    raise exception 'Authentication required.';
  end if;

  if exists (
    select 1 from public.chat_room_members where user_id = caller
  ) then
    raise exception 'You are already linked to a room.';
  end if;

  select id
  into target_room_id
  from public.chat_rooms
  where room_code = upper(trim(input_room_code));

  if target_room_id is null then
    raise exception 'Room code not found.';
  end if;

  select count(*)
  into member_total
  from public.chat_room_members
  where room_id = target_room_id;

  if member_total >= 2 then
    raise exception 'This room already has two members.';
  end if;

  insert into public.chat_room_members (room_id, user_id)
  values (target_room_id, caller);

  perform public.remember_room_membership(target_room_id, caller);

  return target_room_id;
end;
$$;

create or replace function public.leave_current_room(
  input_confirmation text,
  input_keep_room boolean default false
)
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

  update public.room_membership_history
  set last_left_at = timezone('utc', now())
  where room_id = current_room_id
    and user_id = caller;

  delete from public.chat_room_members
  where room_id = current_room_id
    and user_id = caller;

  if not exists (
    select 1
    from public.chat_room_members
    where room_id = current_room_id
  ) and not coalesce(input_keep_room, false) then
    delete from public.chat_rooms
    where id = current_room_id;
  end if;

  return current_room_id;
end;
$$;

create or replace function public.get_saved_rooms()
returns table (
  room_id uuid,
  room_code text,
  last_message_at timestamptz,
  last_joined_at timestamptz,
  last_left_at timestamptz,
  active_member_count integer,
  active_partner_name text
)
language sql
security definer
set search_path = public
as $$
  select
    history.room_id,
    rooms.room_code,
    rooms.last_message_at,
    history.last_joined_at,
    history.last_left_at,
    coalesce(active_members.member_count, 0)::integer as active_member_count,
    active_members.partner_name as active_partner_name
  from public.room_membership_history history
  join public.chat_rooms rooms
    on rooms.id = history.room_id
  left join lateral (
    select
      count(*)::integer as member_count,
      max(case when profiles.id <> auth.uid() then profiles.display_name end) as partner_name
    from public.chat_room_members members
    join public.profiles profiles
      on profiles.id = members.user_id
    where members.room_id = history.room_id
  ) active_members on true
  where history.user_id = auth.uid()
  order by history.last_joined_at desc, rooms.created_at desc;
$$;

comment on function public.get_saved_rooms()
is 'Returns the authenticated user''s remembered rooms so the invite screen can act like a room registry and re-entry list.';

comment on function public.leave_current_room(text, boolean)
is 'Lets the authenticated user leave the current room after confirming with the secret phrase. Deletes the room only if it becomes empty and the user does not choose to keep it.';

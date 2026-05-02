create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.generate_room_code()
returns text
language plpgsql
as $$
declare
  generated_code text;
begin
  loop
    generated_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
    exit when not exists (
      select 1 from public.chat_rooms where room_code = generated_code
    );
  end loop;

  return generated_code;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null default 'Lovebird',
  avatar_seed text not null default substring(replace(gen_random_uuid()::text, '-', '') from 1 for 10),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique default public.generate_room_code(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_message_at timestamptz
);

create table if not exists public.chat_room_members (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (room_id, user_id)
);

create table if not exists public.room_membership_history (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  first_joined_at timestamptz not null default timezone('utc', now()),
  last_joined_at timestamptz not null default timezone('utc', now()),
  last_left_at timestamptz,
  primary key (room_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 2000),
  status text not null default 'sent' check (status in ('sent', 'delivered', 'read')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz
);

create table if not exists public.typing_status (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_typing boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (room_id, user_id)
);

create table if not exists public.user_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  is_online boolean not null default false,
  active_room_id uuid references public.chat_rooms(id) on delete set null,
  last_seen_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists messages_room_created_at_idx
  on public.messages (room_id, created_at);

create index if not exists typing_status_room_updated_at_idx
  on public.typing_status (room_id, updated_at desc);

create index if not exists user_presence_last_seen_idx
  on public.user_presence (last_seen_at desc);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_current_timestamp_updated_at();

create trigger set_chat_rooms_updated_at
before update on public.chat_rooms
for each row execute function public.set_current_timestamp_updated_at();

create trigger set_user_presence_updated_at
before update on public.user_presence
for each row execute function public.set_current_timestamp_updated_at();

create or replace function public.sync_room_last_message_at()
returns trigger
language plpgsql
as $$
begin
  update public.chat_rooms
  set last_message_at = new.created_at
  where id = new.room_id;
  return new;
end;
$$;

create trigger messages_sync_room_last_message_at
after insert on public.messages
for each row execute function public.sync_room_last_message_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_seed)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(coalesce(new.email, 'lovebird@example.com'), '@', 1),
      'Lovebird'
    ),
    substring(replace(new.id::text, '-', '') from 1 for 10)
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_room_member(target_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    return false;
  end if;

  return exists (
    select 1
    from public.chat_room_members
    where room_id = target_room_id
      and user_id = caller
  );
end;
$$;

create or replace function public.shares_room_with(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    return false;
  end if;

  if caller = target_user_id then
    return true;
  end if;

  return exists (
    select 1
    from public.chat_room_members mine
    join public.chat_room_members theirs
      on mine.room_id = theirs.room_id
    where mine.user_id = caller
      and theirs.user_id = target_user_id
  );
end;
$$;

alter table public.profiles enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_room_members enable row level security;
alter table public.room_membership_history enable row level security;
alter table public.messages enable row level security;
alter table public.typing_status enable row level security;
alter table public.user_presence enable row level security;

create policy "profiles_select_self_or_partner"
on public.profiles
for select
using (public.shares_room_with(id));

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "chat_rooms_select_members"
on public.chat_rooms
for select
using (public.is_room_member(id));

create policy "chat_rooms_insert_owner"
on public.chat_rooms
for insert
with check (auth.uid() = created_by);

create policy "chat_room_members_select_self_or_same_room"
on public.chat_room_members
for select
using (
  auth.uid() = user_id
  or public.is_room_member(room_id)
);

create policy "chat_room_members_insert_self"
on public.chat_room_members
for insert
with check (auth.uid() = user_id);

create policy "room_membership_history_select_own"
on public.room_membership_history
for select
using (auth.uid() = user_id);

create policy "room_membership_history_insert_own"
on public.room_membership_history
for insert
with check (auth.uid() = user_id);

create policy "room_membership_history_update_own"
on public.room_membership_history
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "messages_select_room_members"
on public.messages
for select
using (public.is_room_member(room_id));

create policy "messages_insert_room_members"
on public.messages
for insert
with check (
  auth.uid() = sender_id
  and public.is_room_member(room_id)
);

create policy "messages_update_own"
on public.messages
for update
using (auth.uid() = sender_id and public.is_room_member(room_id))
with check (auth.uid() = sender_id and public.is_room_member(room_id));

create policy "messages_delete_own"
on public.messages
for delete
using (auth.uid() = sender_id and public.is_room_member(room_id));

create policy "typing_status_select_room_members"
on public.typing_status
for select
using (public.is_room_member(room_id));

create policy "typing_status_insert_self"
on public.typing_status
for insert
with check (
  auth.uid() = user_id
  and public.is_room_member(room_id)
);

create policy "typing_status_update_self"
on public.typing_status
for update
using (
  auth.uid() = user_id
  and public.is_room_member(room_id)
)
with check (
  auth.uid() = user_id
  and public.is_room_member(room_id)
);

create policy "user_presence_select_self_or_partner"
on public.user_presence
for select
using (public.shares_room_with(user_id));

create policy "user_presence_insert_self"
on public.user_presence
for insert
with check (auth.uid() = user_id);

create policy "user_presence_update_self"
on public.user_presence
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

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

create or replace function public.get_my_room_id()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  found_room_id uuid;
begin
  if caller is null then
    return null;
  end if;

  select room_id
  into found_room_id
  from public.chat_room_members
  where user_id = caller
  limit 1;

  return found_room_id;
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

create or replace function public.mark_room_messages_as_read(input_room_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  affected_count integer;
begin
  if caller is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.chat_room_members
    where room_id = input_room_id
      and user_id = caller
  ) then
    raise exception 'Room access denied.';
  end if;

  update public.messages
  set status = 'read',
      read_at = timezone('utc', now())
  where room_id = input_room_id
    and sender_id <> caller
    and read_at is null;

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

create or replace function public.touch_user_presence(
  input_room_id uuid default null,
  input_is_online boolean default true
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Authentication required.';
  end if;

  insert into public.user_presence (
    user_id,
    is_online,
    active_room_id,
    last_seen_at
  )
  values (
    caller,
    coalesce(input_is_online, true),
    input_room_id,
    timezone('utc', now())
  )
  on conflict (user_id) do update
  set is_online = excluded.is_online,
      active_room_id = excluded.active_room_id,
      last_seen_at = excluded.last_seen_at;
end;
$$;

create or replace function public.set_typing_status(
  input_room_id uuid,
  input_is_typing boolean
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.chat_room_members
    where room_id = input_room_id
      and user_id = caller
  ) then
    raise exception 'Room access denied.';
  end if;

  insert into public.typing_status (
    room_id,
    user_id,
    is_typing,
    updated_at
  )
  values (
    input_room_id,
    caller,
    input_is_typing,
    timezone('utc', now())
  )
  on conflict (room_id, user_id) do update
  set is_typing = excluded.is_typing,
      updated_at = excluded.updated_at;
end;
$$;

comment on function public.create_private_room(text)
is 'Creates a two-person room for the authenticated user and adds the creator as the first member.';

comment on function public.join_room_by_code(text)
is 'Joins an existing room by room code if the room has capacity.';

comment on function public.leave_current_room(text, boolean)
is 'Lets the authenticated user leave the current room after confirming with the secret phrase. Deletes the room if it becomes empty.';

comment on function public.get_saved_rooms()
is 'Returns the authenticated user''s remembered rooms so the invite screen can act like a room registry and re-entry list.';

comment on function public.touch_user_presence(uuid, boolean)
is 'Future push notification workers can reuse this table for reliable last-seen and online heartbeat data.';

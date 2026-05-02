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

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_self_or_partner" on public.profiles;
create policy "profiles_select_self_or_partner"
on public.profiles
for select
using (public.shares_room_with(id));

drop policy if exists "chat_rooms_select_members" on public.chat_rooms;
create policy "chat_rooms_select_members"
on public.chat_rooms
for select
using (public.is_room_member(id));

drop policy if exists "chat_room_members_select_same_room" on public.chat_room_members;
drop policy if exists "chat_room_members_select_self_or_same_room" on public.chat_room_members;
create policy "chat_room_members_select_self_or_same_room"
on public.chat_room_members
for select
using (
  auth.uid() = user_id
  or public.is_room_member(room_id)
);

drop policy if exists "messages_select_room_members" on public.messages;
create policy "messages_select_room_members"
on public.messages
for select
using (public.is_room_member(room_id));

drop policy if exists "messages_insert_room_members" on public.messages;
create policy "messages_insert_room_members"
on public.messages
for insert
with check (
  auth.uid() = sender_id
  and public.is_room_member(room_id)
);

drop policy if exists "typing_status_select_room_members" on public.typing_status;
create policy "typing_status_select_room_members"
on public.typing_status
for select
using (public.is_room_member(room_id));

drop policy if exists "typing_status_insert_self" on public.typing_status;
create policy "typing_status_insert_self"
on public.typing_status
for insert
with check (
  auth.uid() = user_id
  and public.is_room_member(room_id)
);

drop policy if exists "typing_status_update_self" on public.typing_status;
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

drop policy if exists "user_presence_select_self_or_partner" on public.user_presence;
create policy "user_presence_select_self_or_partner"
on public.user_presence
for select
using (public.shares_room_with(user_id));

comment on function public.is_room_member(uuid)
is 'Checks whether the authenticated user belongs to the given room without triggering recursive RLS evaluation.';

comment on function public.shares_room_with(uuid)
is 'Checks whether the authenticated user shares a room with the target user without recursive RLS.';

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_self_or_partner" on public.profiles;

create policy "profiles_select_self_or_partner"
on public.profiles
for select
using (
  auth.uid() = id
  or exists (
    select 1
    from public.chat_room_members mine
    join public.chat_room_members theirs
      on mine.room_id = theirs.room_id
    where mine.user_id = auth.uid()
      and theirs.user_id = profiles.id
  )
);

drop policy if exists "chat_room_members_select_same_room" on public.chat_room_members;
drop policy if exists "chat_room_members_select_self_or_same_room" on public.chat_room_members;

create policy "chat_room_members_select_self_or_same_room"
on public.chat_room_members
for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.chat_room_members mine
    where mine.room_id = chat_room_members.room_id
      and mine.user_id = auth.uid()
  )
);

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

comment on function public.get_my_room_id()
is 'Returns the current authenticated users room id without relying on recursive member-policy lookups.';

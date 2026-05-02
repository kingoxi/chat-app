create or replace function public.is_room_code_available(input_room_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_room_code text := nullif(upper(trim(coalesce(input_room_code, ''))), '');
begin
  if normalized_room_code is null then
    return true;
  end if;

  return not exists (
    select 1
    from public.chat_rooms
    where room_code = normalized_room_code
  );
end;
$$;

comment on function public.is_room_code_available(text)
is 'Lets the client check whether a custom room code is already taken before creating a private room.';

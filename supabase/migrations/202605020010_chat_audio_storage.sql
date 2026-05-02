insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-audio',
  'chat-audio',
  false,
  2097152,
  array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 2097152,
  allowed_mime_types = array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg'];

drop policy if exists "chat_audio_select_room_members" on storage.objects;
create policy "chat_audio_select_room_members"
on storage.objects
for select
using (
  bucket_id = 'chat-audio'
  and public.is_room_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "chat_audio_insert_self" on storage.objects;
create policy "chat_audio_insert_self"
on storage.objects
for insert
with check (
  bucket_id = 'chat-audio'
  and public.is_room_member(((storage.foldername(name))[1])::uuid)
  and auth.uid()::text = (storage.foldername(name))[2]
);

drop policy if exists "chat_audio_update_self" on storage.objects;
create policy "chat_audio_update_self"
on storage.objects
for update
using (
  bucket_id = 'chat-audio'
  and public.is_room_member(((storage.foldername(name))[1])::uuid)
  and auth.uid()::text = (storage.foldername(name))[2]
)
with check (
  bucket_id = 'chat-audio'
  and public.is_room_member(((storage.foldername(name))[1])::uuid)
  and auth.uid()::text = (storage.foldername(name))[2]
);

drop policy if exists "chat_audio_delete_self" on storage.objects;
create policy "chat_audio_delete_self"
on storage.objects
for delete
using (
  bucket_id = 'chat-audio'
  and public.is_room_member(((storage.foldername(name))[1])::uuid)
  and auth.uid()::text = (storage.foldername(name))[2]
);

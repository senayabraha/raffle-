create policy "Public read access to raffle images"
on storage.objects for select
to public
using (bucket_id = 'raffle-images');

create policy "Hosts can upload their own raffle images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'raffle-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Hosts can update their own raffle images"
on storage.objects for update
to authenticated
using (bucket_id = 'raffle-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Hosts can delete their own raffle images"
on storage.objects for delete
to authenticated
using (bucket_id = 'raffle-images' and (storage.foldername(name))[1] = auth.uid()::text);

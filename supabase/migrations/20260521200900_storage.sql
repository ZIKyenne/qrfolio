-- Créer le bucket pour les assets de pages
insert into storage.buckets (id, name, public) values ('page-assets', 'page-assets', true) on conflict do nothing;

-- Politique RLS: upload pour les utilisateurs connectés
create policy "Authenticated users can upload" on storage.objects
  for insert with check (bucket_id = 'page-assets' and auth.role() = 'authenticated');

-- Politique RLS: lecture publique
create policy "Public read access" on storage.objects
  for select using (bucket_id = 'page-assets');

-- Politique RLS: suppression par le propriétaire
create policy "Users can delete own files" on storage.objects
  for delete using (bucket_id = 'page-assets' and auth.uid()::text = (storage.foldername(name))[1]);

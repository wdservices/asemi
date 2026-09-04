create policy "docs_owner_all" on storage.objects for all to authenticated
  using (bucket_id = 'company-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin')))
  with check (bucket_id = 'company-docs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "images_owner_all" on storage.objects for all to authenticated
  using (bucket_id = 'product-images' and (public.owns_company(((storage.foldername(name))[1])::uuid) or public.has_role(auth.uid(), 'admin')))
  with check (bucket_id = 'product-images' and public.owns_company(((storage.foldername(name))[1])::uuid));
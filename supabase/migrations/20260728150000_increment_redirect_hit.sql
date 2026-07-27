-- Incrément atomique du compteur de hits d'une redirection domaine.
-- Remplace le read-then-write non atomique côté app (perte de mises à jour sous
-- trafic concurrent). SECURITY DEFINER : appelée par le client admin (service role)
-- depuis la route de résolution publique.
create or replace function public.increment_redirect_hit(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update domain_redirects
  set hit_count   = coalesce(hit_count, 0) + 1,
      last_hit_at = now()
  where id = p_id;
$$;

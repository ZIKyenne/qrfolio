-- P0-5 — Fermer l'insertion publique de leads.
--
-- La migration 016 avait créé `create policy "Insert lead public" on public.leads
-- for insert with check (true)` pour permettre au formulaire public d'écrire.
-- Depuis, l'écriture passe EXCLUSIVEMENT par /api/leads (service_role) qui
-- rate-limite, vérifie l'existence de la page et renseigne user_id via trigger.
-- La policy anonyme résiduelle laissait un attaquant muni de la clé anon
-- (publique) insérer des leads en masse en contournant ces protections
-- (spam / pollution ciblée des boîtes de leads). On la supprime.

drop policy if exists "Insert lead public" on public.leads;

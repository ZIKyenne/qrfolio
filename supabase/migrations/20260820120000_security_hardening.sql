-- ─────────────────────────────────────────────────────────────────────────────
-- Durcissement sécurité — items « faibles » de l'audit Trail of Bits (2026-08-20).
-- AUCUNE faille critique/élevée : ce sont des réductions de surface + hygiène.
--
-- ⚠️  À APPLIQUER EN STAGING D'ABORD, puis vérifier que :
--     • un membre d'équipe lit/écrit toujours les pages/QR partagés (RLS d'équipe),
--     • la création de compte génère toujours un ref_code (trigger),
--     • l'API /api/domains lit bien les limites de domaine.
--     Si tout passe → appliquer en prod.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Réduire la surface RPC exposée au rôle `anon`.
--    can_read_owner / can_write_owner ne servent QUE dans les policies RLS d'équipe,
--    évaluées pour le rôle `authenticated`. `anon` n'a aucune raison de les exécuter.
--    (SECURITY DEFINER + search_path déjà figé = pas de fuite ; ceci ferme juste l'accès direct.)
revoke execute on function public.can_read_owner(uuid)  from public, anon;
revoke execute on function public.can_write_owner(uuid) from public, anon;
grant  execute on function public.can_read_owner(uuid)  to authenticated;
grant  execute on function public.can_write_owner(uuid) to authenticated;

-- generate_ref_code() est une fonction de TRIGGER : le moteur l'appelle, jamais un
--    rôle client directement. On coupe donc tout EXECUTE direct.
revoke execute on function public.generate_ref_code() from public, anon, authenticated;

-- 2) plan_domain_limits : RLS activé mais AUCUNE policy → la lecture renvoyait vide
--    (l'API /api/domains retombait sur les valeurs par défaut du code). C'est une table
--    de configuration NON sensible (plan → nb de domaines). On autorise la lecture aux
--    utilisateurs authentifiés ; toute écriture reste réservée au service_role (qui
--    contourne la RLS côté serveur). Idempotent.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'plan_domain_limits'
      and policyname = 'Lecture limites domaine (authentifie)'
  ) then
    execute $p$ create policy "Lecture limites domaine (authentifie)"
      on public.plan_domain_limits for select to authenticated using (true); $p$;
  end if;
end $$;

-- 3) (OPTIONNEL — laissé COMMENTÉ car potentiellement cassant)
--    Déplacer l'extension pg_trgm hors du schéma `public` (best practice). À NE FAIRE
--    que si aucun index/opérateur ne référence `public.gin_trgm_ops` / `public.similarity`
--    sans schéma. Recréer les index trigram concernés après le déplacement.
--
--    create schema if not exists extensions;
--    alter extension pg_trgm set schema extensions;
--    -- puis vérifier/recréer les index GIN/GiST trigram éventuels.

-- Remarques (à faire HORS SQL, côté tableau de bord / infra) :
--   • Auth → activer « Leaked password protection » (HaveIBeenPwned).
--   • CSP → passer en applied avec nonces progressivement (voir next.config.mjs).
--   • Historique git → purger les anciens secrets (BFG / git filter-repo).

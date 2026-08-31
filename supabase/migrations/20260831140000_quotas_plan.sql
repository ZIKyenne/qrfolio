-- =====================================================================
--  QRowg — les limites de plan appliquées PAR LA BASE
--  À coller dans Supabase → SQL Editor → Run.
--
--  À passer APRÈS le déploiement du lot du 31 août (4e).
--  Ne supprime rien, ne modifie aucune ligne existante.
-- =====================================================================
--
--  LE PROBLÈME
--  Les limites de plan ne vivaient que dans les routes /api. Or la base est
--  joignable directement avec la clé publique : depuis la console de son
--  navigateur, un compte gratuit peut écrire dans ses propres tables — la
--  police RLS l'y autorise (« le propriétaire fait ce qu'il veut chez lui »),
--  et rien ne compte combien de lignes il y met.
--
--      fetch(URL + "/rest/v1/instant_qrs", { method:"POST",
--        headers:{ apikey: <clé publique>, Authorization:"Bearer "+jeton },
--        body: JSON.stringify([{ user_id:<le sien>, kind:"link",
--          payload:"…", dynamic:true, status:"active", short_code:"zzzz" }]) })
--
--  Cinquante fois de suite : cinquante QR modifiables sur un plan qui en donne
--  un. Et /q/<code> les sert sans jamais regarder le plan.
--
--  Le contournement était aussi ouvert par le bas : créer des QR « en pause »
--  ne consomme aucun quota, il suffisait ensuite de les repasser en actif un
--  par un. Les déclencheurs ci-dessous vérifient donc AUSSI ce passage.
--
--  CE QUI NE CHANGE PAS
--  Les routes /api continuent de vérifier avant d'écrire : elles rendent un
--  message clair et une proposition de mise à niveau. La base ne fait que
--  refuser ce qui ne devrait jamais arriver — c'est la ceinture, pas le siège.
-- =====================================================================


-- ── 1. LES LIMITES, UNE SEULE FOIS ───────────────────────────────────
-- Mêmes chiffres que apps/web/src/lib/plans.ts. `null` = illimité.

create or replace function public.limite_plan(p_plan text, p_quoi text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_quoi
    -- QR autonomes enregistrés (instant_qrs)
    when 'qr' then case coalesce(p_plan, 'free')
      when 'starter'  then 30   -- palier retiré ; une ligne héritée vaut Établissement
      when 'pro'      then 30
      when 'business' then null
      else 3 end
    -- …dont modifiables après impression, et actifs
    when 'dyn' then case coalesce(p_plan, 'free')
      when 'starter'  then 20
      when 'pro'      then 20
      when 'business' then null
      else 1 end
    -- QR de page ACTIFS (= pages visitables au scan)
    when 'pages' then case coalesce(p_plan, 'free')
      when 'starter'  then 10
      when 'pro'      then 10
      when 'business' then null
      else 1 end
  end
$$;

-- Le mot de passe et l'expiration programmée d'un lien sont vendus à partir du
-- plan Pro (caps.dynSecuriteLien). Ils s'écrivaient en base sans le moindre
-- contrôle : deux colonnes, et la fonctionnalité était prise.
create or replace function public.plan_a_securite_lien(p_plan text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_plan, 'free') in ('pro', 'business', 'starter')
$$;


-- ── 2. LES QR AUTONOMES ──────────────────────────────────────────────

create or replace function public.quota_instant_qrs()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_plan   text;
  v_max    integer;
  v_actuel integer;
begin
  -- `profiles.plan` est une ÉNUMÉRATION (subscription_plan), pas du texte : la
  -- conversion doit être explicite, ici comme à chaque appel de limite_plan.
  select plan::text into v_plan from public.profiles where id = new.user_id;
  -- Profil illisible (règle de lecture, ligne absente) : on retombe sur le plan
  -- gratuit. Se tromper vers le plus strict, jamais vers le plus permissif.

  -- a) Nombre total de QR enregistrés — à la création seulement.
  if tg_op = 'INSERT' then
    v_max := public.limite_plan(v_plan, 'qr');
    if v_max is not null then
      select count(*) into v_actuel from public.instant_qrs where user_id = new.user_id;
      if v_actuel >= v_max then
        raise exception 'Limite de % QR atteinte sur le plan %.', v_max, coalesce(v_plan, 'gratuit')
          using errcode = 'check_violation';
      end if;
    end if;
  end if;

  -- b) QR modifiables ACTIFS — à la création, et à chaque passage à l'état actif
  --    (sans quoi il suffisait d'en créer cinquante en pause puis de les réveiller).
  if new.dynamic and coalesce(new.status, 'active') = 'active'
     and (tg_op = 'INSERT'
          or not (coalesce(old.dynamic, false) and coalesce(old.status, 'active') = 'active')) then
    v_max := public.limite_plan(v_plan, 'dyn');
    if v_max is not null then
      select count(*) into v_actuel from public.instant_qrs
        where user_id = new.user_id
          and dynamic
          and coalesce(status, 'active') = 'active'
          and id <> new.id;
      if v_actuel >= v_max then
        raise exception 'Limite de % QR modifiables actifs atteinte sur le plan %.', v_max, coalesce(v_plan, 'gratuit')
          using errcode = 'check_violation';
      end if;
    end if;
  end if;

  -- c) Sécurité du lien (mot de passe, expiration) : à partir du plan Pro.
  if not public.plan_a_securite_lien(v_plan) then
    if new.password_hash is not null
       and (tg_op = 'INSERT' or old.password_hash is distinct from new.password_hash) then
      raise exception 'Le mot de passe sur un lien est réservé au plan Pro.'
        using errcode = 'check_violation';
    end if;
    if new.expires_at is not null
       and (tg_op = 'INSERT' or old.expires_at is distinct from new.expires_at) then
      raise exception 'L''expiration programmée est réservée au plan Pro.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end
$$;

drop trigger if exists quota_instant_qrs on public.instant_qrs;
create trigger quota_instant_qrs
  before insert or update on public.instant_qrs
  for each row execute function public.quota_instant_qrs();


-- ── 3. LES QR DE PAGE ────────────────────────────────────────────────
-- Le quota du plan ne compte que les QR de page ACTIFS (= visitables au scan) :
-- un QR en pause ou en brouillon ne consomme rien. Même règle que lib/quota.ts.

create or replace function public.quota_qr_codes()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_plan   text;
  v_max    integer;
  v_actuel integer;
begin
  if coalesce(new.status, 'active') <> 'active' then return new; end if;
  if tg_op = 'UPDATE' and coalesce(old.status, 'active') = 'active' then return new; end if;

  -- `profiles.plan` est une ÉNUMÉRATION (subscription_plan), pas du texte : la
  -- conversion doit être explicite, ici comme à chaque appel de limite_plan.
  select plan::text into v_plan from public.profiles where id = new.user_id;
  v_max := public.limite_plan(v_plan, 'pages');
  if v_max is null then return new; end if;

  select count(*) into v_actuel from public.qr_codes
    where user_id = new.user_id
      and coalesce(status, 'active') = 'active'
      and id <> new.id;

  if v_actuel >= v_max then
    raise exception 'Limite de % QR de page actifs atteinte sur le plan %.', v_max, coalesce(v_plan, 'gratuit')
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;

drop trigger if exists quota_qr_codes on public.qr_codes;
create trigger quota_qr_codes
  before insert or update on public.qr_codes
  for each row execute function public.quota_qr_codes();


-- ── 4. VÉRIFICATION ──────────────────────────────────────────────────
-- Deux résultats. Rien n'est écrit, rien n'est supprimé.

-- (1) Les deux déclencheurs existent. Doit renvoyer 2 lignes.
select event_object_table as table_protegee, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public' and trigger_name in ('quota_instant_qrs', 'quota_qr_codes')
order by 1, 4;

-- (2) Où en est chaque compte, et sous quelle limite. Aucune ligne ne doit
--     afficher « DÉPASSÉ » : les comptes existants ne sont jamais bloqués
--     rétroactivement, mais autant le savoir.
select
  coalesce(pr.plan::text, 'free') as plan,
  (select count(*) from public.instant_qrs i where i.user_id = pr.id) as qr_enregistres,
  coalesce(public.limite_plan(pr.plan::text, 'qr')::text, '∞') as limite_qr,
  (select count(*) from public.instant_qrs i
     where i.user_id = pr.id and i.dynamic and coalesce(i.status,'active') = 'active') as qr_modifiables_actifs,
  coalesce(public.limite_plan(pr.plan::text, 'dyn')::text, '∞') as limite_modifiables,
  (select count(*) from public.qr_codes q
     where q.user_id = pr.id and coalesce(q.status,'active') = 'active') as qr_pages_actifs,
  coalesce(public.limite_plan(pr.plan::text, 'pages')::text, '∞') as limite_pages,
  case when (select count(*) from public.instant_qrs i where i.user_id = pr.id)
            > coalesce(public.limite_plan(pr.plan::text, 'qr'), 2147483647)
         or (select count(*) from public.qr_codes q
               where q.user_id = pr.id and coalesce(q.status,'active') = 'active')
            > coalesce(public.limite_plan(pr.plan::text, 'pages'), 2147483647)
       then 'DÉPASSÉ' else 'ok' end as etat
from public.profiles pr
order by plan;

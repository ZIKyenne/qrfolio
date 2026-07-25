-- Durcissement : log_activity était la seule fonction SECURITY DEFINER sans
-- `set search_path` (flaggé "Function Search Path Mutable" par l'advisor Supabase).
-- On la redéfinit à l'identique en fixant search_path = public, comme toutes les
-- autres fonctions SECURITY DEFINER du projet. Idempotent (create or replace).

create or replace function public.log_activity(
  p_user_id      uuid,
  p_event_type   activity_event_type,
  p_title        text,
  p_description  text  default null,
  p_entity_id    uuid  default null,
  p_entity_type  text  default null,
  p_entity_label text  default null,
  p_metadata     jsonb default '{}'
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.activity_logs
    (user_id, event_type, title, description, entity_id, entity_type, entity_label, metadata)
  values
    (p_user_id, p_event_type, p_title, p_description, p_entity_id, p_entity_type, p_entity_label, p_metadata);
end;
$$;

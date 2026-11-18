-- Leave the app owner's own use out of Settings → Usage. Safe to run again.
-- The owner (anyone in app_admins) is no longer counted in opens, feature use or time in the app,
-- and the usage already recorded for the owner is removed.

create or replace function public.log_open(p_team uuid default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or is_app_admin() then return; end if;
  insert into app_usage (user_id, team_id) values (auth.uid(), p_team)
  on conflict (user_id, day) do update set opens = app_usage.opens + 1, last_seen = now(),
    team_id = coalesce(excluded.team_id, app_usage.team_id);
end $$;
revoke all on function public.log_open(uuid) from public;
grant execute on function public.log_open(uuid) to authenticated;

create or replace function public.log_features(p_counts jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare k text; v int;
begin
  if auth.uid() is null or p_counts is null or is_app_admin() then return; end if;
  for k, v in select key, least(greatest(coalesce((value)::text::int, 0), 0), 500) from jsonb_each(p_counts) loop
    if v > 0 and length(k) <= 40 then
      insert into feature_usage (user_id, feature, n) values (auth.uid(), k, v)
      on conflict (user_id, day, feature) do update set n = feature_usage.n + excluded.n;
    end if;
  end loop;
end $$;
revoke all on function public.log_features(jsonb) from public;
grant execute on function public.log_features(jsonb) to authenticated;

create or replace function public.log_visit(p_id uuid, p_team uuid default null, p_add int default 0, p_installed boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_id is null or is_app_admin() then return; end if;
  p_add := greatest(0, least(coalesce(p_add, 0), 120));   -- at most 2 minutes per update
  insert into app_visits (id, user_id, team_id, seconds, installed)
  values (p_id, auth.uid(), p_team, p_add, coalesce(p_installed, false))
  on conflict (id) do update set seconds = app_visits.seconds + p_add, last_at = now(),
    team_id = coalesce(excluded.team_id, app_visits.team_id)
  where app_visits.user_id = auth.uid();
end $$;
revoke all on function public.log_visit(uuid, uuid, int, boolean) from public;
grant execute on function public.log_visit(uuid, uuid, int, boolean) to authenticated;

-- Clear what was already recorded for the owner.
delete from public.app_usage     where user_id in (select u.id from auth.users u join public.app_admins a on lower(a.email) = lower(u.email));
delete from public.feature_usage where user_id in (select u.id from auth.users u join public.app_admins a on lower(a.email) = lower(u.email));
delete from public.app_visits    where user_id in (select u.id from auth.users u join public.app_admins a on lower(a.email) = lower(u.email));

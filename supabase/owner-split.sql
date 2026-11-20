-- Settings → Usage: count your own use separately. Safe to run again.
-- 1. Your use is recorded again (opens, features, time in the app).
-- 2. Every number on the Usage page leaves you and your own teams out.
-- 3. A new "Your own use" section shows your numbers on their own.

-- Who the owner is, and the owner's teams (made by you or that you're on).
create or replace function public.owner_ids() returns setof uuid
language sql stable security definer set search_path = public, auth as $$
  select u.id from auth.users u join app_admins a on lower(a.email) = lower(u.email)
$$;
create or replace function public.owner_teams() returns setof uuid
language sql stable security definer set search_path = public, auth as $$
  select team_id from team_members where user_id in (select owner_ids())
  union select id from teams where created_by in (select owner_ids())
$$;
revoke all on function public.owner_ids() from public;
revoke all on function public.owner_teams() from public;

-- Record the owner's use again (it's left out of the numbers below instead).
create or replace function public.log_open(p_team uuid default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
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
  if auth.uid() is null or p_counts is null then return; end if;
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
  if auth.uid() is null or p_id is null then return; end if;
  p_add := greatest(0, least(coalesce(p_add, 0), 120));   -- at most 2 minutes per update
  insert into app_visits (id, user_id, team_id, seconds, installed)
  values (p_id, auth.uid(), p_team, p_add, coalesce(p_installed, false))
  on conflict (id) do update set seconds = app_visits.seconds + p_add, last_at = now(),
    team_id = coalesce(excluded.team_id, app_visits.team_id)
  where app_visits.user_id = auth.uid();
end $$;
revoke all on function public.log_visit(uuid, uuid, int, boolean) from public;
grant execute on function public.log_visit(uuid, uuid, int, boolean) to authenticated;

-- Main numbers, coach list and features: other coaches only. Your own numbers come back under "me".
create or replace function public.usage_report() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare out jsonb;
begin
  if not is_app_admin() then raise exception 'Only the app''s owner can see usage.'; end if;
  with me as (select owner_ids() id),
  au as (select * from app_usage where user_id not in (select id from me)),
  fu as (select * from feature_usage where user_id not in (select id from me))
  select jsonb_build_object(
    'coaches', (select count(*) from auth.users where id not in (select id from me)),
    'teams', (select count(*) from teams where id not in (select owner_teams())),
    'active_today', (select count(distinct user_id) from au where day = current_date),
    'active_7', (select count(distinct user_id) from au where day > current_date - 7),
    'active_30', (select count(distinct user_id) from au where day > current_date - 30),
    'opens_7', (select coalesce(sum(opens), 0) from au where day > current_date - 7),
    'referred', (select count(*) from referrals where referred_user not in (select id from me)),
    'by_day', coalesce((select jsonb_agg(jsonb_build_object('day', d.day, 'coaches', d.n, 'opens', d.o) order by d.day)
       from (select day, count(distinct user_id) n, sum(opens) o from au where day > current_date - 30 group by day) d), '[]'::jsonb),
    'features', coalesce((select jsonb_agg(jsonb_build_object('feature', f.feature, 'uses', f.uses, 'coaches', f.coaches) order by f.uses desc)
       from (select feature, sum(n) uses, count(distinct user_id) coaches from fu where day > current_date - 30 group by feature) f), '[]'::jsonb),
    'users', coalesce((select jsonb_agg(r order by r->>'last_seen' desc nulls last) from (
       select jsonb_build_object(
         'email', u.email,
         'name', (select display_name from team_members m where m.user_id = u.id and display_name is not null limit 1),
         'joined', to_jsonb(u) ->> 'created_at',
         'last_sign_in', to_jsonb(u) ->> 'last_sign_in_at',
         'last_seen', (select max(last_seen) from app_usage a where a.user_id = u.id),
         'opens_30', (select coalesce(sum(opens), 0) from app_usage a where a.user_id = u.id and day > current_date - 30),
         'days_30', (select count(*) from app_usage a where a.user_id = u.id and day > current_date - 30),
         'opens_all', (select coalesce(sum(opens), 0) from app_usage a where a.user_id = u.id),
         'invited', (select count(*) from referrals x where x.referrer = u.id),
         'teams', (select coalesce(jsonb_agg(t.name order by t.name), '[]'::jsonb) from team_members m join teams t on t.id = m.team_id where m.user_id = u.id)
       ) r from auth.users u where u.id not in (select id from me)) x), '[]'::jsonb),
    'me', jsonb_build_object(
       'days_7', (select count(*) from app_usage where user_id in (select id from me) and day > current_date - 7),
       'days_30', (select count(*) from app_usage where user_id in (select id from me) and day > current_date - 30),
       'opens_30', (select coalesce(sum(opens), 0) from app_usage where user_id in (select id from me) and day > current_date - 30),
       'last_seen', (select max(last_seen) from app_usage where user_id in (select id from me)),
       'minutes_30', (select round(coalesce(sum(seconds), 0) / 60.0) from app_visits where user_id in (select id from me) and started_at > now() - interval '30 days'),
       'plays', (select count(*) from items where kind = 'plays' and coalesce(data->>'draft', '') = '' and team_id in (select owner_teams())),
       'teams', (select count(*) from owner_teams()),
       'features', coalesce((select jsonb_agg(jsonb_build_object('feature', f.feature, 'uses', f.uses) order by f.uses desc)
          from (select feature, sum(n) uses from feature_usage where user_id in (select id from me) and day > current_date - 30 group by feature order by 2 desc limit 8) f), '[]'::jsonb))
  ) into out;
  return out;
end $$;
revoke all on function public.usage_report() from public;
grant execute on function public.usage_report() to authenticated;

-- Built, scheduled, photos and "do coaches keep using it": other coaches and their teams only.
create or replace function public.usage_more() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare out jsonb;
begin
  if not is_app_admin() then raise exception 'Only the app''s owner can see usage.'; end if;
  with me as (select owner_ids() id), mt as (select owner_teams() id),
  au as (select * from app_usage where user_id not in (select id from me)),
  it as (select * from items where team_id not in (select id from mt)),
  tm as (select * from teams where id not in (select id from mt)),
  u as (select user_id, min(day) first_day, max(day) last_day, count(*) days from au group by user_id),
  j as (select u.*, least(u.first_day, coalesce((select x.created_at::date from auth.users x where x.id = u.user_id), u.first_day)) joined from u)
  select jsonb_build_object(
    'plays_total', (select count(*) from it where kind = 'plays' and coalesce(data->>'draft', '') = ''),
    'plays_edited_30', (select count(*) from it where kind = 'plays' and updated_at > now() - interval '30 days'),
    'plays_new_30', (select coalesce(sum(n), 0) from feature_usage where feature = 'play:new' and day > current_date - 30 and user_id not in (select id from me)),
    'teams_with_plays', (select count(distinct team_id) from it where kind = 'plays'),
    'drills_total', (select count(*) from it where kind = 'drills'),
    'plans_total', (select count(*) from it where kind = 'plans'),
    'games_total', (select coalesce(sum(jsonb_array_length(coalesce(settings->'games', '[]'::jsonb))), 0) from tm),
    'games_upcoming', (select count(*) from tm t, jsonb_array_elements(coalesce(t.settings->'games', '[]'::jsonb)) g where (g->>'date') >= current_date::text),
    'days_marked', (select coalesce(sum(jsonb_array_length(coalesce(settings->'special', '[]'::jsonb))), 0) from tm),
    'my_events', (select count(*) from coach_events where owner not in (select id from me)),
    'gym_bookings', (select count(*) from fac_bookings where requested_by is null or requested_by not in (select id from me)),
    'photo_total', (select count(*) from ai_usage where team_id not in (select id from mt)),
    'photo_30', (select count(*) from ai_usage where team_id not in (select id from mt) and created_at > now() - interval '30 days'),
    'photo_kinds', coalesce((select jsonb_agg(jsonb_build_object('kind', k.kind, 'n', k.n) order by k.n desc) from (select kind, count(*) n from ai_usage where team_id not in (select id from mt) group by kind) k), '[]'::jsonb),
    'avg_days_used', (select round(avg(days), 1) from u),
    'avg_span', (select round(avg(last_day - first_day + 1), 1) from u),
    'w1_base', (select count(*) from j where joined <= current_date - 7),
    'w1_kept', (select count(*) from j where joined <= current_date - 7 and last_day >= joined + 7),
    'm1_base', (select count(*) from j where joined <= current_date - 30),
    'm1_kept', (select count(*) from j where joined <= current_date - 30 and last_day >= joined + 30),
    'by_week', coalesce((select jsonb_agg(jsonb_build_object('week', w.wk, 'coaches', w.n, 'new_plays', w.p) order by w.wk) from (
        select date_trunc('week', d)::date wk,
               (select count(distinct a.user_id) from au a where a.day >= date_trunc('week', d)::date and a.day < date_trunc('week', d)::date + 7) n,
               (select coalesce(sum(f.n), 0) from feature_usage f where f.feature = 'play:new' and f.user_id not in (select id from me) and f.day >= date_trunc('week', d)::date and f.day < date_trunc('week', d)::date + 7) p
          from generate_series(current_date - 77, current_date, interval '7 days') d) w), '[]'::jsonb),
    'people', coalesce((select jsonb_agg(jsonb_build_object('email', x.email, 'first', j.first_day, 'last', j.last_day, 'days', j.days)) from j join auth.users x on x.id = j.user_id), '[]'::jsonb)
  ) into out;
  return out;
end $$;
revoke all on function public.usage_more() from public;
grant execute on function public.usage_more() to authenticated;

-- Time in the app: other coaches only.
create or replace function public.usage_time() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare out jsonb;
begin
  if not is_app_admin() then raise exception 'Only the app''s owner can see usage.'; end if;
  with v as (
    select *, (started_at at time zone 'America/Chicago')::date as d
    from app_visits where started_at > now() - interval '30 days' and seconds >= 5 and user_id not in (select owner_ids())),
  cd as (select user_id, count(distinct d) days from v group by user_id)
  select jsonb_build_object(
    'visits_30', (select count(*) from v),
    'avg_sec', (select round(avg(seconds)) from v),
    'median_sec', (select round(percentile_cont(0.5) within group (order by seconds)) from v),
    'total_min', (select round(sum(seconds) / 60.0) from v),
    'visits_per_day', (select round(count(*) / 30.0, 1) from v),
    'visits_per_coach_day', (select round(count(*)::numeric / nullif(count(distinct (user_id, d)), 0), 1) from v),
    'days_per_week', (select round(avg(days) * 7 / 30.0, 1) from cd),
    'installed_pct', (select round(100.0 * count(*) filter (where installed) / nullif(count(*), 0)) from v),
    'by_day', coalesce((select jsonb_agg(jsonb_build_object('day', g.day, 'visits', coalesce(x.visits, 0), 'minutes', coalesce(x.minutes, 0), 'coaches', coalesce(x.coaches, 0)) order by g.day)
       from generate_series((now() at time zone 'America/Chicago')::date - 13, (now() at time zone 'America/Chicago')::date, interval '1 day') g(day)
       left join (select d, count(*) visits, round(sum(seconds) / 60.0) minutes, count(distinct user_id) coaches from v group by d) x on x.d = g.day::date), '[]'::jsonb),
    'people', coalesce((select jsonb_agg(jsonb_build_object('email', au.email, 'visits', p.visits, 'avg_sec', p.avg_sec, 'minutes', p.minutes))
       from (select user_id, count(*) visits, round(avg(seconds)) avg_sec, round(sum(seconds) / 60.0) minutes from v group by user_id) p
       join auth.users au on au.id = p.user_id), '[]'::jsonb)
  ) into out;
  return out;
end $$;
revoke all on function public.usage_time() from public;
grant execute on function public.usage_time() to authenticated;

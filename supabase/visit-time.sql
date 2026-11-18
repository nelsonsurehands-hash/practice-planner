-- Time in the app (Settings → Usage → "Time in the app"). Safe to run again.
-- A visit starts when a coach opens the app (or comes back after 30 minutes away). While the app is on
-- screen it adds up the seconds, once a minute; time with the app in the background doesn't count.
create table if not exists public.app_visits (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  team_id     uuid references public.teams(id) on delete set null,
  started_at  timestamptz not null default now(),
  last_at     timestamptz not null default now(),
  seconds     int not null default 0,
  installed   boolean not null default false
);
create index if not exists app_visits_user_started on public.app_visits (user_id, started_at);
alter table public.app_visits enable row level security;   -- no policies: written by log_visit(), read by usage_time()

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

create or replace function public.usage_time() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare out jsonb;
begin
  if not is_app_admin() then raise exception 'Only the app''s owner can see usage.'; end if;
  with v as (
    select *, (started_at at time zone 'America/Chicago')::date as d
    from app_visits where started_at > now() - interval '30 days' and seconds >= 5),
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

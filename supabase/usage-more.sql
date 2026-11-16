-- More numbers for Settings → Usage (app owner only): what's been built, what's been scheduled,
-- photo imports, and whether coaches keep using the app over time. Safe to run again.
create or replace function public.usage_more() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare out jsonb;
begin
  if not is_app_admin() then raise exception 'Only the app''s owner can see usage.'; end if;
  with u as (select user_id, min(day) first_day, max(day) last_day, count(*) days from app_usage group by user_id),
  j as (select u.*, least(u.first_day, coalesce((select au.created_at::date from auth.users au where au.id = u.user_id), u.first_day)) joined from u)
  select jsonb_build_object(
    'plays_total', (select count(*) from items where kind = 'plays' and coalesce(data->>'draft', '') = ''),
    'plays_edited_30', (select count(*) from items where kind = 'plays' and updated_at > now() - interval '30 days'),
    'plays_new_30', (select coalesce(sum(n), 0) from feature_usage where feature = 'play:new' and day > current_date - 30),
    'teams_with_plays', (select count(distinct team_id) from items where kind = 'plays'),
    'drills_total', (select count(*) from items where kind = 'drills'),
    'plans_total', (select count(*) from items where kind = 'plans'),
    'games_total', (select coalesce(sum(jsonb_array_length(coalesce(settings->'games', '[]'::jsonb))), 0) from teams),
    'games_upcoming', (select count(*) from teams t, jsonb_array_elements(coalesce(t.settings->'games', '[]'::jsonb)) g where (g->>'date') >= current_date::text),
    'days_marked', (select coalesce(sum(jsonb_array_length(coalesce(settings->'special', '[]'::jsonb))), 0) from teams),
    'my_events', (select count(*) from coach_events),
    'gym_bookings', (select count(*) from fac_bookings),
    'photo_total', (select count(*) from ai_usage),
    'photo_30', (select count(*) from ai_usage where created_at > now() - interval '30 days'),
    'photo_kinds', coalesce((select jsonb_agg(jsonb_build_object('kind', k.kind, 'n', k.n) order by k.n desc) from (select kind, count(*) n from ai_usage group by kind) k), '[]'::jsonb),
    'avg_days_used', (select round(avg(days), 1) from u),
    'avg_span', (select round(avg(last_day - first_day + 1), 1) from u),
    'w1_base', (select count(*) from j where joined <= current_date - 7),
    'w1_kept', (select count(*) from j where joined <= current_date - 7 and last_day >= joined + 7),
    'm1_base', (select count(*) from j where joined <= current_date - 30),
    'm1_kept', (select count(*) from j where joined <= current_date - 30 and last_day >= joined + 30),
    'by_week', coalesce((select jsonb_agg(jsonb_build_object('week', w.wk, 'coaches', w.n, 'new_plays', w.p) order by w.wk) from (
        select date_trunc('week', d)::date wk,
               (select count(distinct a.user_id) from app_usage a where a.day >= date_trunc('week', d)::date and a.day < date_trunc('week', d)::date + 7) n,
               (select coalesce(sum(f.n), 0) from feature_usage f where f.feature = 'play:new' and f.day >= date_trunc('week', d)::date and f.day < date_trunc('week', d)::date + 7) p
          from generate_series(current_date - 77, current_date, interval '7 days') d) w), '[]'::jsonb),
    'people', coalesce((select jsonb_agg(jsonb_build_object('email', au.email, 'first', j.first_day, 'last', j.last_day, 'days', j.days)) from j join auth.users au on au.id = j.user_id), '[]'::jsonb)
  ) into out;
  return out;
end $$;
revoke all on function public.usage_more() from public;
grant execute on function public.usage_more() to authenticated;

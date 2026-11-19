-- First week (Settings → Usage): where new coaches drop off, how fast they get something built,
-- who brings in other people, weekly returning coaches, and new coaches who are stuck. Safe to run again.
-- The app owner (app_admins) is left out of everything.
create or replace function public.usage_firstweek() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare out jsonb;
begin
  if not is_app_admin() then raise exception 'Only the app''s owner can see usage.'; end if;
  with c as (   -- every coach except the owner
    select u.id, u.email, (to_jsonb(u) ->> 'created_at')::timestamptz as joined
    from auth.users u
    where not exists (select 1 from app_admins a where lower(a.email) = lower(u.email))
  ),
  s as (
    select c.*,
      exists (select 1 from team_members m where m.user_id = c.id) as has_team,
      exists (select 1 from team_members m join items i on i.team_id = m.team_id and i.kind = 'players'
              where m.user_id = c.id) as has_roster,
      -- first thing built: a practice plan with drills in it, or a saved play (by this coach)
      (select min(i.updated_at) from items i
        where i.updated_by = c.id and (
          (i.kind = 'plans' and jsonb_array_length(coalesce(i.data->'blocks', '[]'::jsonb)) > 0) or
          (i.kind = 'plays' and coalesce(i.data->>'draft', '') = ''))) as first_built,
      (select count(*) from app_usage a where a.user_id = c.id) as days_used,
      (select max(a.last_seen) from app_usage a where a.user_id = c.id) as last_seen,
      ( exists (select 1 from staff_invites x where x.created_by = c.id)
        or exists (select 1 from calendar_shares x where x.created_by = c.id)
        or exists (select 1 from playbooks x where x.created_by = c.id)
        or exists (select 1 from signup_boards x where x.created_by = c.id)
        or exists (select 1 from team_members m join team_members o on o.team_id = m.team_id and o.user_id <> m.user_id
                   where m.user_id = c.id and m.role = 'owner') ) as shared,
      (select t.name from team_members m join teams t on t.id = m.team_id where m.user_id = c.id order by m.joined_at limit 1) as team
    from c
  ),
  n as (select * from s where joined > now() - interval '60 days')   -- new coaches: the funnel
  select jsonb_build_object(
    'funnel', jsonb_build_object(
      'signed', (select count(*) from n),
      'team', (select count(*) from n where has_team),
      'roster', (select count(*) from n where has_roster),
      'built', (select count(*) from n where first_built is not null),
      'back', (select count(*) from n where days_used >= 2),
      'shared', (select count(*) from n where shared)),
    'quick_base', (select count(*) from n where joined <= now() - interval '3 days'),
    'quick', (select count(*) from n where joined <= now() - interval '3 days' and first_built <= joined + interval '3 days'),
    'shared_all', (select count(*) from s where shared),
    'coaches_all', (select count(*) from s),
    'week_now', (select count(distinct a.user_id) from app_usage a join c on c.id = a.user_id where a.day > current_date - 7),
    'week_prev', (select count(distinct a.user_id) from app_usage a join c on c.id = a.user_id where a.day <= current_date - 7 and a.day > current_date - 14),
    'stuck', coalesce((select jsonb_agg(jsonb_build_object('email', email, 'team', team, 'joined', joined, 'last_seen', last_seen,
                 'team_ok', has_team, 'roster', has_roster, 'built', first_built is not null, 'back', days_used >= 2, 'shared', shared) order by joined desc)
       from s where joined > now() - interval '30 days' and (first_built is null or days_used < 2)), '[]'::jsonb)
  ) into out;
  return out;
end $$;
revoke all on function public.usage_firstweek() from public;
grant execute on function public.usage_firstweek() to authenticated;

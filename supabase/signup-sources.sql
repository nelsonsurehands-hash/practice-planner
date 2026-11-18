-- Where new coaches came from (Settings → Usage). Safe to run again.
-- Each new coach's first link is already saved in referrals.code (fbad = the Facebook ad, fbpage = Facebook
-- page posts, google = Google search, a coach's invite code, parent/food/playbook/play pages…).
-- This reads it back for the owner: totals per source, new this week, and each coach's source.
create or replace function public.signup_sources() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare out jsonb;
begin
  if not is_app_admin() then raise exception 'Only the app''s owner can see usage.'; end if;
  with s as (
    select u.id, u.email, (to_jsonb(u) ->> 'created_at')::timestamptz as joined,
      case when r.referred_user is null then 'none'
           when r.referrer is not null then 'invite'
           else r.code end as src,
      (select coalesce(m.display_name, iu.email) from auth.users iu left join team_members m on m.user_id = iu.id
        where iu.id = r.referrer limit 1) as inviter
    from auth.users u
    left join referrals r on r.referred_user = u.id
    where not exists (select 1 from app_admins a where lower(a.email) = lower(u.email))
  )
  select jsonb_build_object(
    'by_source', coalesce((select jsonb_agg(jsonb_build_object('source', x.src, 'n', x.n, 'week', x.wk, 'today', x.td) order by x.n desc)
       from (select src, count(*) n,
                    count(*) filter (where joined > now() - interval '7 days') wk,
                    count(*) filter (where (joined at time zone 'America/Chicago')::date = (now() at time zone 'America/Chicago')::date) td
             from s group by src) x), '[]'::jsonb),
    'people', coalesce((select jsonb_agg(jsonb_build_object('email', email, 'source', src, 'inviter', inviter)) from s), '[]'::jsonb)
  ) into out;
  return out;
end $$;
revoke all on function public.signup_sources() from public;
grant execute on function public.signup_sources() to authenticated;

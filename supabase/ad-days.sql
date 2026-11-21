-- Ad timing (Settings → Usage → "When the ads work"): which days of the week and hours (Central time)
-- people from the Facebook ads land on the homepage and sign up. Anonymous counts only, like landing_events.
-- Also stamps the existing homepage counts with the Central-time day instead of the UTC day. Safe to run again.
create table if not exists public.landing_times (
  day   date not null,
  hour  smallint not null check (hour between 0 and 23),
  src   text not null,
  step  text not null,
  n     int  not null default 0,
  primary key (day, hour, src, step)
);
alter table public.landing_times enable row level security;   -- no policies: written by log_landing(), read by usage_ad_days()

create or replace function public.log_landing(p_src text, p_steps text[]) returns void
language plpgsql security definer set search_path = public as $$
declare s text; v_src text; v_now timestamp := now() at time zone 'America/Chicago';
begin
  v_src := lower(coalesce(p_src, 'direct'));
  if v_src !~ '^[a-z0-9]{1,20}$' then v_src := 'direct'; end if;
  if p_steps is null or array_length(p_steps, 1) > 10 then return; end if;
  foreach s in array p_steps loop
    if s in ('land','scroll','features','bottom','cta','form','signup','signin') then
      insert into landing_events (day, src, step, n) values (v_now::date, v_src, s, 1)
      on conflict (day, src, step) do update set n = landing_events.n + 1;
      insert into landing_times (day, hour, src, step, n) values (v_now::date, extract(hour from v_now)::smallint, v_src, s, 1)
      on conflict (day, hour, src, step) do update set n = landing_times.n + 1;
    end if;
  end loop;
end $$;
revoke all on function public.log_landing(text, text[]) from public;
grant execute on function public.log_landing(text, text[]) to anon, authenticated;

-- For the owner: ad visitors and sign-ups by weekday (0 = Sunday) and by hour, last 60 days, Central time.
-- "accounts" are finished accounts whose first link was an ad link (fbad, fbadplan…), by the day they joined.
create or replace function public.usage_ad_days() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare since date := (now() at time zone 'America/Chicago')::date - 60;
begin
  if not is_app_admin() then raise exception 'Only the app''s owner can see usage.'; end if;
  return jsonb_build_object(
    'since', (select min(day) from landing_times where src like 'fbad%'),
    'days', (select count(distinct day) from landing_times where src like 'fbad%' and day >= since),
    'by_dow', coalesce((select jsonb_agg(jsonb_build_object('dow', d.dow, 'land', d.land, 'form', d.form, 'signup', d.signup, 'days', d.days) order by d.dow)
       from (select extract(dow from day)::int dow,
                    sum(n) filter (where step = 'land') land, sum(n) filter (where step = 'form') form,
                    sum(n) filter (where step = 'signup') signup, count(distinct day) days
             from landing_times where src like 'fbad%' and day >= since group by 1) d), '[]'::jsonb),
    'by_hour', coalesce((select jsonb_agg(jsonb_build_object('hour', h.hour, 'land', h.land, 'signup', h.signup) order by h.hour)
       from (select hour, sum(n) filter (where step = 'land') land, sum(n) filter (where step = 'signup') signup
             from landing_times where src like 'fbad%' and day >= since group by 1) h), '[]'::jsonb),
    'accounts', coalesce((select jsonb_agg(jsonb_build_object('dow', a.dow, 'n', a.n) order by a.dow)
       from (select extract(dow from ((to_jsonb(u) ->> 'created_at')::timestamptz at time zone 'America/Chicago'))::int dow, count(*) n
             from auth.users u join referrals r on r.referred_user = u.id
             where r.referrer is null and r.code like 'fbad%'
               and (to_jsonb(u) ->> 'created_at')::timestamptz > now() - interval '60 days'
               and u.id not in (select owner_ids())
             group by 1) a), '[]'::jsonb)
  );
end $$;
revoke all on function public.usage_ad_days() from public;
grant execute on function public.usage_ad_days() to authenticated;

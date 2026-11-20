-- Homepage visitors (Settings → Usage): anonymous counts of how far people get on the homepage before
-- signing up. One row per day, source (the link they came from) and step, with a count. No names, emails,
-- cookies or IP addresses are stored. Safe to run again.
create table if not exists public.landing_events (
  day   date not null default current_date,
  src   text not null,
  step  text not null,
  n     int  not null default 0,
  primary key (day, src, step)
);
alter table public.landing_events enable row level security;   -- no policies: written by log_landing(), read by usage_landing()

create or replace function public.log_landing(p_src text, p_steps text[]) returns void
language plpgsql security definer set search_path = public as $$
declare s text; v_src text;
begin
  v_src := lower(coalesce(p_src, 'direct'));
  if v_src !~ '^[a-z0-9]{1,20}$' then v_src := 'direct'; end if;
  if p_steps is null or array_length(p_steps, 1) > 10 then return; end if;
  foreach s in array p_steps loop
    if s in ('land','scroll','features','bottom','cta','form','signup','signin') then
      insert into landing_events (src, step, n) values (v_src, s, 1)
      on conflict (day, src, step) do update set n = landing_events.n + 1;
    end if;
  end loop;
end $$;
revoke all on function public.log_landing(text, text[]) from public;
grant execute on function public.log_landing(text, text[]) to anon, authenticated;

create or replace function public.usage_landing() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_app_admin() then raise exception 'Only the app''s owner can see usage.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('src', src, 'step', step, 'n', n, 'n7', n7))
    from (select src, step, sum(n) n, sum(n) filter (where day > current_date - 7) n7
          from landing_events where day > current_date - 30 group by src, step) x), '[]'::jsonb);
end $$;
revoke all on function public.usage_landing() from public;
grant execute on function public.usage_landing() to authenticated;

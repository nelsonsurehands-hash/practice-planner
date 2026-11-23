-- Every page on the website (Settings → Usage → "Pages on the website"): anonymous counts of what visitors do
-- on each page (landed, scrolled, used the try-it, built something, saved it, tapped sign up), by the link they
-- came from, plus sign-ups and new teams credited to the first page they landed on. No names, emails, cookies
-- or IP addresses are stored: one row per day, hour (Central time), page, source and step, with a count.
-- Safe to run again.
create table if not exists public.page_events (
  day   date not null,
  hour  smallint not null check (hour between 0 and 23),
  page  text not null,
  src   text not null,
  step  text not null,
  n     int  not null default 0,
  primary key (day, hour, page, src, step)
);
alter table public.page_events enable row level security;   -- no policies: written by log_page(), read by usage_pages()

create or replace function public.log_page(p_page text, p_src text, p_steps text[]) returns void
language plpgsql security definer set search_path = public as $$
declare s text; v_src text; v_page text; v_now timestamp := now() at time zone 'America/Chicago';
begin
  v_page := lower(trim(both '/' from coalesce(p_page, '')));
  if v_page = '' then v_page := 'home'; end if;
  if v_page !~ '^[a-z0-9/-]{1,80}$' then return; end if;
  v_src := lower(coalesce(p_src, 'direct'));
  if v_src !~ '^[a-z0-9]{1,20}$' then v_src := 'direct'; end if;
  if p_steps is null or array_length(p_steps, 1) > 12 then return; end if;
  foreach s in array p_steps loop
    if s ~ '^[a-z0-9_]{1,24}$' then
      insert into page_events (day, hour, page, src, step, n) values (v_now::date, extract(hour from v_now)::smallint, v_page, v_src, s, 1)
      on conflict (day, hour, page, src, step) do update set n = page_events.n + 1;
    end if;
  end loop;
end $$;
revoke all on function public.log_page(text, text, text[]) from public;
grant execute on function public.log_page(text, text, text[]) to anon, authenticated;

-- For the owner: each page's steps over the last 30 days, split by source, with the last-7-days count.
create or replace function public.usage_pages() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare today date := (now() at time zone 'America/Chicago')::date;
begin
  if not is_app_admin() then raise exception 'Only the app''s owner can see usage.'; end if;
  return jsonb_build_object(
    'since', (select min(day) from page_events),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('page', page, 'src', src, 'step', step, 'n', n, 'n7', n7))
      from (select page, src, step, sum(n) n, sum(n) filter (where day > today - 7) n7
              from page_events where day > today - 30 group by page, src, step) x), '[]'::jsonb));
end $$;
revoke all on function public.usage_pages() from public;
grant execute on function public.usage_pages() to authenticated;

-- Coach feedback: a short "How can we help?" card new coaches see on Home after their first day.
-- Answers show on Settings → Usage → Feedback from coaches (owner only). Safe to run again.
create table if not exists public.feedback (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete set null default auth.uid(),
  team_id     uuid references public.teams(id) on delete set null,
  picks       text[] not null default '{}',
  message     text check (message is null or length(message) <= 2000),
  contact_ok  boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.feedback enable row level security;   -- no policies: written by send_feedback(), read by usage_feedback()

create or replace function public.send_feedback(p_team uuid, p_picks text[], p_message text, p_contact boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if (select count(*) from feedback where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 5 then return; end if;
  insert into feedback (user_id, team_id, picks, message, contact_ok)
  values (auth.uid(),
          case when exists (select 1 from team_members where user_id = auth.uid() and team_id = p_team) then p_team end,
          coalesce((select array_agg(left(x, 60)) from (select x from unnest(coalesce(p_picks, '{}')) x limit 12) s), '{}'),
          nullif(left(trim(coalesce(p_message, '')), 2000), ''),
          coalesce(p_contact, false));
end $$;
revoke all on function public.send_feedback(uuid, text[], text, boolean) from public;
grant execute on function public.send_feedback(uuid, text[], text, boolean) to authenticated;

create or replace function public.usage_feedback() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not is_app_admin() then raise exception 'Only the app''s owner can see usage.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('at', f.created_at, 'email', u.email, 'team', t.name, 'picks', to_jsonb(f.picks),
      'message', f.message, 'contact', f.contact_ok) order by f.created_at desc)
    from feedback f left join auth.users u on u.id = f.user_id left join teams t on t.id = f.team_id
    where f.user_id is null or f.user_id not in (select owner_ids())), '[]'::jsonb);
end $$;
revoke all on function public.usage_feedback() from public;
grant execute on function public.usage_feedback() to authenticated;

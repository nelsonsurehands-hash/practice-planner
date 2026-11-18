-- Settings → Your account → Delete my account. Safe to run again.
-- A coach can delete their own account. Teams they own:
--   * with other staff on it → handed to another coach on the staff (or a view-only member if that's all
--     there is), so assistants never lose a team;
--   * with nobody else → deleted, with everything in it (plans, plays, roster, schedule, sign-ups…).
-- Teams they only belong to: they're simply removed from the staff.
-- Their usage history goes with the account (those tables cascade on auth.users).

-- What would happen, shown on the confirm screen before anything is deleted.
create or replace function public.account_delete_preview() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'team', t.name,
    'action', case when m.role <> 'owner' then 'leave'
                   when exists (select 1 from team_members o where o.team_id = t.id and o.user_id <> auth.uid()) then 'handoff'
                   else 'delete' end,
    'to', (select coalesce(o.display_name, o.email) from team_members o
           where o.team_id = t.id and o.user_id <> auth.uid() and m.role = 'owner'
           order by (o.role = 'coach') desc, o.joined_at limit 1)
  ) order by t.name), '[]'::jsonb)
  from team_members m join teams t on t.id = m.team_id
  where m.user_id = auth.uid();
$$;
revoke all on function public.account_delete_preview() from public;
grant execute on function public.account_delete_preview() to authenticated;

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare me uuid := auth.uid(); r record; heir uuid;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  for r in select team_id from team_members where user_id = me and role = 'owner' loop
    select user_id into heir from team_members
      where team_id = r.team_id and user_id <> me
      order by (role = 'coach') desc, joined_at limit 1;
    if heir is null then
      delete from teams where id = r.team_id;                       -- nobody else on it: the team goes too
    else
      update team_members set role = 'owner' where team_id = r.team_id and user_id = heir;
      update teams set created_by = heir where id = r.team_id and created_by = me;
    end if;
  end loop;
  delete from auth.users where id = me;                             -- memberships, usage and invites cascade
end $$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

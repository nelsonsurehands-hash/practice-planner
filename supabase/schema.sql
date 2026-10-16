-- Coach Practice Planner: database setup for Supabase.
-- Run this in your project's SQL Editor (Dashboard → SQL Editor → New query → paste → Run).
-- Safe to re-run, and safe to run over the earlier version: it only adds what is missing
-- and replaces the functions and security rules.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
-- A team is one staff's planner for one sport (e.g. "Riverside 8th Grade Girls Basketball").
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  settings    jsonb not null default '{}'::jsonb,   -- sport, school, colors, season, games, special days
  join_code   text not null unique,                 -- coaches join the staff with this
  created_by  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);
alter table public.teams add column if not exists viewer_code text unique;   -- view-only access

create table if not exists public.team_members (
  team_id    uuid not null references public.teams(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'coach',
  email      text,
  joined_at  timestamptz not null default now(),
  primary key (team_id, user_id)
);
alter table public.team_members add column if not exists display_name text;
alter table public.team_members add column if not exists title text;          -- "Head Coach", "JV Assistant"…
alter table public.team_members drop constraint if exists team_members_role_check;
alter table public.team_members add constraint team_members_role_check check (role in ('owner','coach','viewer'));
create index if not exists team_members_user_idx on public.team_members(user_id);

-- Drills, practice plans and plays. One row per item; the item itself is JSON.
create table if not exists public.items (
  team_id     uuid not null references public.teams(id) on delete cascade,
  kind        text not null check (kind in ('drills','plans','plays')),
  id          text not null,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null,
  primary key (team_id, kind, id)
);
alter table public.items replica identity full;   -- live updates include deleted rows

-- ---------------------------------------------------------------------------
-- Helper checks (security definer so the rules below don't recurse)
-- ---------------------------------------------------------------------------
create or replace function public.member_role(t uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from team_members where team_id = t and user_id = auth.uid();
$$;
create or replace function public.is_member(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select member_role(t) is not null;
$$;
create or replace function public.is_editor(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(member_role(t) in ('owner','coach'), false);
$$;
create or replace function public.is_owner(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(member_role(t) = 'owner', false);
$$;

create or replace function public.random_join_code() returns text
language plpgsql volatile set search_path = public as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- no 0/O or 1/I mix-ups
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from teams where join_code = code or viewer_code = code);
  end loop;
  return code;
end $$;

-- Name to show for the signed-in coach: what they typed, else their account name, else their email.
create or replace function public.my_default_name(p_name text) returns text
language sql stable set search_path = public as $$
  select coalesce(nullif(trim(p_name), ''),
                  nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
                  split_part(auth.jwt() ->> 'email', '@', 1));
$$;

-- Give older teams a view-only code.
update public.teams set viewer_code = public.random_join_code() where viewer_code is null;

-- ---------------------------------------------------------------------------
-- Actions the app calls
-- ---------------------------------------------------------------------------
drop function if exists public.create_team(text, jsonb);
drop function if exists public.join_team(text);
drop function if exists public.new_join_code(uuid);

-- Create a team; the caller becomes its owner (head coach). Returns the new team id.
create or replace function public.create_team(p_name text, p_settings jsonb default '{}'::jsonb, p_display_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  insert into teams (name, settings, join_code, viewer_code, created_by)
    values (coalesce(nullif(trim(p_name), ''), 'My team'), coalesce(p_settings, '{}'::jsonb),
            random_join_code(), random_join_code(), auth.uid())
    returning id into new_id;
  insert into team_members (team_id, user_id, role, email, display_name, title)
    values (new_id, auth.uid(), 'owner', auth.jwt() ->> 'email', my_default_name(p_display_name), 'Head Coach');
  return new_id;
end $$;

-- Join with a staff code (edit access) or a view-only code. Returns the team id.
create or replace function public.join_team(p_code text, p_display_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid; r text;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select id, case when join_code = upper(trim(p_code)) then 'coach' else 'viewer' end into t, r
    from teams where join_code = upper(trim(p_code)) or viewer_code = upper(trim(p_code));
  if t is null then raise exception 'No team found with that code. Check it with your head coach.'; end if;
  insert into team_members (team_id, user_id, role, email, display_name, title)
    values (t, auth.uid(), r, auth.jwt() ->> 'email', my_default_name(p_display_name), case when r = 'coach' then 'Assistant Coach' else null end)
    on conflict (team_id, user_id) do nothing;   -- already on the staff: keep their current role
  return t;
end $$;

-- Owner only: change someone's role and/or title.
create or replace function public.set_member(p_team uuid, p_user uuid, p_role text default null, p_title text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_owner(p_team) then raise exception 'Only a head coach (owner) can change the staff.'; end if;
  if p_role is not null and p_role not in ('owner','coach','viewer') then raise exception 'Unknown role.'; end if;
  if p_role is not null and p_role <> 'owner'
     and (select role from team_members where team_id = p_team and user_id = p_user) = 'owner'
     and (select count(*) from team_members where team_id = p_team and role = 'owner') = 1 then
    raise exception 'A team needs at least one head coach (owner). Make someone else an owner first.';
  end if;
  update team_members
     set role = coalesce(p_role, role),
         title = case when p_title is null then title else nullif(trim(p_title), '') end
   where team_id = p_team and user_id = p_user;
end $$;

-- Owner removes someone, or anyone leaves a team themselves.
create or replace function public.remove_member(p_team uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (is_owner(p_team) or p_user = auth.uid()) then raise exception 'Only a head coach (owner) can remove someone.'; end if;
  if (select role from team_members where team_id = p_team and user_id = p_user) = 'owner'
     and (select count(*) from team_members where team_id = p_team and role = 'owner') = 1 then
    raise exception 'A team needs at least one head coach (owner). Make someone else an owner first.';
  end if;
  delete from team_members where team_id = p_team and user_id = p_user;
end $$;

-- Change your own name everywhere you coach.
create or replace function public.update_my_name(p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  update team_members set display_name = my_default_name(p_name) where user_id = auth.uid();
end $$;

-- Owner only: issue a new staff or view-only code (the old one stops working).
create or replace function public.new_join_code(p_team uuid, p_kind text default 'staff')
returns text language plpgsql security definer set search_path = public as $$
declare code text;
begin
  if not is_owner(p_team) then raise exception 'Only a head coach (owner) can change join codes.'; end if;
  code := random_join_code();
  if p_kind = 'viewer' then update teams set viewer_code = code where id = p_team;
  else update teams set join_code = code where id = p_team; end if;
  return code;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.create_team(text, jsonb, text)', 'public.join_team(text, text)',
    'public.set_member(uuid, uuid, text, text)', 'public.remove_member(uuid, uuid)',
    'public.update_my_name(text)', 'public.new_join_code(uuid, text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row-level security
--   viewers: read only · coaches: read and edit · owners: also manage the staff
--   nobody sees a team they are not on
-- ---------------------------------------------------------------------------
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.items enable row level security;

drop policy if exists "members read team" on public.teams;
drop policy if exists "members update team" on public.teams;
drop policy if exists "editors update team" on public.teams;
drop policy if exists "owner deletes team" on public.teams;
create policy "members read team"   on public.teams for select to authenticated using (is_member(id));
create policy "editors update team" on public.teams for update to authenticated using (is_editor(id)) with check (is_editor(id));
create policy "owner deletes team"  on public.teams for delete to authenticated using (is_owner(id));

drop policy if exists "see own and teammates" on public.team_members;
drop policy if exists "leave or remove" on public.team_members;
create policy "see own and teammates" on public.team_members for select to authenticated using (user_id = auth.uid() or is_member(team_id));
-- No insert/update/delete policies: staff changes only happen through the functions above.

drop policy if exists "members read items" on public.items;
drop policy if exists "members write items" on public.items;
drop policy if exists "members update items" on public.items;
drop policy if exists "members delete items" on public.items;
drop policy if exists "editors write items" on public.items;
drop policy if exists "editors update items" on public.items;
drop policy if exists "editors delete items" on public.items;
create policy "members read items"   on public.items for select to authenticated using (is_member(team_id));
create policy "editors write items"  on public.items for insert to authenticated with check (is_editor(team_id));
create policy "editors update items" on public.items for update to authenticated using (is_editor(team_id)) with check (is_editor(team_id));
create policy "editors delete items" on public.items for delete to authenticated using (is_editor(team_id));

-- ---------------------------------------------------------------------------
-- Live updates (a coach's change shows up on the rest of the staff's screens)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'items') then
    alter publication supabase_realtime add table public.items;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Player playbooks: share links players can open without an account
-- ---------------------------------------------------------------------------
create table if not exists public.playbooks (
  id          text primary key,                 -- random 10-character id in the share link
  team_id     uuid not null references public.teams(id) on delete cascade,
  title       text not null default 'Playbook',
  play_ids    text[],                           -- null = every play on the team
  active      boolean not null default true,    -- false = link turned off
  views       integer not null default 0,
  created_by  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);
alter table public.playbooks enable row level security;
drop policy if exists "members read playbooks" on public.playbooks;
drop policy if exists "editors add playbooks" on public.playbooks;
drop policy if exists "editors change playbooks" on public.playbooks;
drop policy if exists "editors delete playbooks" on public.playbooks;
create policy "members read playbooks"   on public.playbooks for select to authenticated using (is_member(team_id));
create policy "editors add playbooks"    on public.playbooks for insert to authenticated with check (is_editor(team_id) and length(id) >= 10);
create policy "editors change playbooks" on public.playbooks for update to authenticated using (is_editor(team_id)) with check (is_editor(team_id));
create policy "editors delete playbooks" on public.playbooks for delete to authenticated using (is_editor(team_id));

-- What a player's link returns: the team's name and colors, and the chosen plays. Nothing else.
create or replace function public.get_playbook(p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pb playbooks; t teams; result jsonb;
begin
  select * into pb from playbooks where id = p_id and active;
  if pb.id is null then return null; end if;
  select * into t from teams where id = pb.team_id;
  update playbooks set views = views + 1 where id = pb.id;
  select jsonb_build_object(
    'v', 1,
    'title', pb.title,
    'team', jsonb_build_object('name', t.name,
                               'sport', coalesce(t.settings->>'sport','basketball'),
                               'color', t.settings->>'color',
                               'school', t.settings->>'school',
                               'mascot', t.settings->>'mascot',
                               'teamLabel', t.settings->>'teamLabel'),
    'plays', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.data->>'name', 'type', i.data->>'type',
                                          'notes', coalesce(i.data->>'notes',''), 'frames', i.data->'frames')
                       order by i.data->>'type', i.data->>'name')
        from items i
       where i.team_id = pb.team_id and i.kind = 'plays'
         and (pb.play_ids is null or i.id = any(pb.play_ids))), '[]'::jsonb))
  into result;
  return result;
end $$;
revoke all on function public.get_playbook(text) from public;
grant execute on function public.get_playbook(text) to anon, authenticated;

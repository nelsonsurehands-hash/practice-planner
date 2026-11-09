-- When a game moves to a new date, carry everything tied to that game day along with it:
-- parents' food sign-ups, "no food needed" and custom food times, the gameplan, live stats and the bus list.
-- The app calls this after a coach saves a game with a new date (same opponent). Safe to run again.
create or replace function public.move_game_date(p_team uuid, p_from date, p_to date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare n_food int := 0; n_items int := 0; fk text := p_from::text; tk text := p_to::text;
begin
  if p_from = p_to then return '{}'::jsonb; end if;
  if not (can_edit(p_team, 'schedule') or can_edit(p_team, 'team')) then raise exception 'Not allowed to change this team''s schedule'; end if;
  update signup_entries set game_date = p_to where team_id = p_team and game_date = p_from;
  get diagnostics n_food = row_count;
  update signup_boards b set
    skip = case when fk = any(b.skip) then array_append(array_remove(array_remove(b.skip, fk), tk), tk) else b.skip end,
    dropoff = case when coalesce(b.dropoff->'games', '{}'::jsonb) ? fk
      then jsonb_set(b.dropoff, '{games}', ((b.dropoff->'games') - fk) || jsonb_build_object(tk, b.dropoff->'games'->fk)) else b.dropoff end
  where b.team_id = p_team;
  update items i set id = tk,
    data = case when i.data ? 'date' then jsonb_set(i.data, '{date}', to_jsonb(tk)) else i.data end
  where i.team_id = p_team and i.kind in ('gameplans', 'gamestats', 'trips') and i.id = fk
    and not exists (select 1 from items j where j.team_id = p_team and j.kind = i.kind and j.id = tk);
  get diagnostics n_items = row_count;
  return jsonb_build_object('signups', n_food, 'items', n_items);
end $$;
revoke all on function public.move_game_date(uuid, date, date) from public;
grant execute on function public.move_game_date(uuid, date, date) to authenticated;

-- Replies to coach feedback (Settings → Usage → Feedback from coaches → Reply). The coach sees the reply
-- on their Home screen the next time they open the app, signed "The Extra Coach team". Safe to run again.
alter table public.feedback add column if not exists reply         text check (reply is null or length(reply) <= 2000);
alter table public.feedback add column if not exists replied_at    timestamptz;
alter table public.feedback add column if not exists reply_seen_at timestamptz;

-- Owner: save (or change) the reply to one answer.
create or replace function public.reply_feedback(p_id bigint, p_reply text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_app_admin() then raise exception 'Only the app''s owner can reply.'; end if;
  update feedback set reply = nullif(left(trim(coalesce(p_reply, '')), 2000), ''),
                      replied_at = case when nullif(trim(coalesce(p_reply, '')), '') is null then null else now() end,
                      reply_seen_at = null
   where id = p_id;
end $$;
revoke all on function public.reply_feedback(bigint, text) from public;
grant execute on function public.reply_feedback(bigint, text) to authenticated;

-- Coach: replies to my answers that I haven't seen yet.
create or replace function public.my_feedback_replies() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'reply', reply, 'at', replied_at, 'message', message, 'picks', to_jsonb(picks)) order by replied_at), '[]'::jsonb)
    from feedback where user_id = auth.uid() and reply is not null and reply_seen_at is null;
$$;
revoke all on function public.my_feedback_replies() from public;
grant execute on function public.my_feedback_replies() to authenticated;

-- Coach: I've read it.
create or replace function public.seen_feedback_reply(p_id bigint) returns void
language sql security definer set search_path = public as $$
  update feedback set reply_seen_at = now() where id = p_id and user_id = auth.uid() and reply is not null;
$$;
revoke all on function public.seen_feedback_reply(bigint) from public;
grant execute on function public.seen_feedback_reply(bigint) to authenticated;

-- Owner's list, now with each answer's id and reply.
create or replace function public.usage_feedback() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not is_app_admin() then raise exception 'Only the app''s owner can see usage.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'at', f.created_at, 'email', u.email, 'team', t.name, 'picks', to_jsonb(f.picks),
      'message', f.message, 'contact', f.contact_ok, 'reply', f.reply, 'replied_at', f.replied_at, 'seen_at', f.reply_seen_at) order by f.created_at desc)
    from feedback f left join auth.users u on u.id = f.user_id left join teams t on t.id = f.team_id
    where f.user_id is null or f.user_id not in (select owner_ids())), '[]'::jsonb);
end $$;
revoke all on function public.usage_feedback() from public;
grant execute on function public.usage_feedback() to authenticated;

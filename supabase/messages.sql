-- Message center (the bell at the top of the app): every note a coach sent with the feedback card,
-- and the replies from The Extra Coach team. Needs supabase/feedback-replies.sql first. Safe to run again.

-- Coach: my messages and replies, newest first (last 6 months).
create or replace function public.my_messages() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'at', created_at, 'message', message, 'picks', to_jsonb(picks),
           'reply', reply, 'replied_at', replied_at, 'unread', reply is not null and reply_seen_at is null)
           order by coalesce(replied_at, created_at) desc), '[]'::jsonb)
    from feedback where user_id = auth.uid() and created_at > now() - interval '180 days';
$$;
revoke all on function public.my_messages() from public;
grant execute on function public.my_messages() to authenticated;

-- Coach: I opened the message center, so every reply is read.
create or replace function public.seen_all_replies() returns void
language sql security definer set search_path = public as $$
  update feedback set reply_seen_at = now() where user_id = auth.uid() and reply is not null and reply_seen_at is null;
$$;
revoke all on function public.seen_all_replies() from public;
grant execute on function public.seen_all_replies() to authenticated;

-- Email alerts (supabase/functions/notify-reply): who to email about a reply, for the owner only.
-- Only coaches who ticked "It's OK to email me back" are emailed.
create or replace function public.reply_email_target(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not is_app_admin() then raise exception 'Only the app''s owner can do this.'; end if;
  return (select jsonb_build_object('email', u.email, 'ok', f.contact_ok, 'reply', f.reply, 'message', f.message)
            from feedback f join auth.users u on u.id = f.user_id where f.id = p_id);
end $$;
revoke all on function public.reply_email_target(bigint) from public;
grant execute on function public.reply_email_target(bigint) to authenticated;

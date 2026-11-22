-- Never lose where a new coach came from. Safe to run again.
-- The app sends the link tag (?ref=fbad, a coach's invite code…) with the sign-up, but it was only saved
-- once the coach got back into the app in the same browser. Now the database saves it the moment the
-- account is made, and fills in the coaches who signed up with a tag that never got saved.

create or replace function public.ref_from_signup() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare c text := lower(trim(coalesce(new.raw_user_meta_data ->> 'ref', ''))); r uuid;
begin
  if c !~ '^[a-z0-9]{2,20}$' then return new; end if;
  select user_id into r from referral_codes where code = c;
  if r is null and c !~ '^[a-z]{2,20}$' then return new; end if;   -- not a coach's code and not a named source
  insert into referrals (referred_user, referrer, code) values (new.id, r, c) on conflict do nothing;
  return new;
exception when others then return new;   -- never block a sign-up
end $$;

drop trigger if exists ref_from_signup on auth.users;
create trigger ref_from_signup after insert on auth.users for each row execute function public.ref_from_signup();

-- Coaches who already signed up with a tag that was never saved.
insert into referrals (referred_user, referrer, code)
select u.id, rc.user_id, lower(trim(u.raw_user_meta_data ->> 'ref'))
  from auth.users u
  left join referral_codes rc on rc.code = lower(trim(u.raw_user_meta_data ->> 'ref'))
 where lower(trim(u.raw_user_meta_data ->> 'ref')) ~ '^[a-z0-9]{2,20}$'
   and (rc.user_id is not null or lower(trim(u.raw_user_meta_data ->> 'ref')) ~ '^[a-z]{2,20}$')
   and (rc.user_id is distinct from u.id)
   and not exists (select 1 from referrals x where x.referred_user = u.id)
on conflict do nothing;

-- How many coaches came in with no tag at all (shown as "No link"), for a quick check.
select count(*) filter (where r.referred_user is null) as no_link, count(*) as coaches
  from auth.users u left join referrals r on r.referred_user = u.id;

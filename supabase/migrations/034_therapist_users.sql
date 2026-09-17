-- Migration 034: verified therapist users (HIN) + therapist profile claims
--
-- A registrant who ticks "Ich bin Therapeut:in" and signs up with a personal
-- HIN identity (vorname.nachname@hin.ch) becomes a verified therapist user.
-- Verification is decided here, from auth.users.email, never from client
-- input: the checkbox only expresses intent. Because Supabase Auth refuses
-- logins until the address is confirmed, the flag is effectively gated on
-- email confirmation.
--
-- The verified name (from the HIN local part) is then matched against the
-- therapist directory: exactly one unclaimed row -> linked automatically;
-- anything else -> a claim in the moderation queue.
--
-- Live-schema notes (verified 2026-09-17 against the project):
--   * public.users has NO column-level UPDATE grants live (016 not effective),
--     so therapist_verified_at is protected by the guard trigger below.
--   * therapists.is_active (021) is NOT live; the therapist guard uses jsonb so
--     it works with or without that column.
--   * pg_trgm is installed (used for claim candidate scoring); unaccent is not.

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------
alter table public.users
  add column if not exists therapist_verified_at timestamptz;

alter table public.therapists
  add column if not exists user_id uuid references public.users(id) on delete set null,
  add column if not exists claimed_at timestamptz;

create unique index if not exists therapists_user_id_key
  on public.therapists (user_id) where user_id is not null;

-- ---------------------------------------------------------------------------
-- 2. HIN helpers
-- ---------------------------------------------------------------------------

-- Personal HIN identity: letters (and hyphens) in dot-separated parts, at least
-- two parts, exactly @hin.ch. Team/function mailboxes and own-domain HIN
-- members are intentionally excluded.
create or replace function public.is_hin_personal_email(p_email text)
returns boolean
language sql
immutable
as $$
  select p_email is not null
     and lower(p_email) ~ '^[a-z]+(-[a-z]+)*(\.[a-z]+(-[a-z]+)*)+@hin\.ch$'
$$;

-- Name key for matching: lowercase, umlauts -> ae/oe/ue, accents stripped,
-- everything but a-z removed. "Anna-Lena Müller" -> "annalenamueller".
create or replace function public.name_key(p text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    translate(
      replace(replace(replace(replace(lower(coalesce(p, '')), 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss'),
      'áàâãåéèêëíìîïóòôõúùûýÿçñ',
      'aaaaaeeeeiiiiooooouuuyycn'
    ),
    '[^a-z]', '', 'g')
$$;

-- Same, but umlauts collapse to a single vowel (müller -> muller) because HIN
-- local parts use either spelling.
create or replace function public.name_key_short(p text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    translate(
      replace(lower(coalesce(p, '')), 'ß', 'ss'),
      'äöüáàâãåéèêëíìîïóòôõúùûýÿçñ',
      'aouaaaaaeeeeiiiiooooouuuyycn'
    ),
    '[^a-z]', '', 'g')
$$;

-- Split "vorname.nachname@hin.ch" into (first, last). Extra parts go to the
-- surname ("anna.maria.muster" -> "anna", "maria muster"); hyphens are kept.
create or replace function public.hin_email_name_parts(p_email text, out first_name text, out last_name text)
language plpgsql
immutable
as $$
declare
  parts text[];
begin
  parts := string_to_array(split_part(lower(p_email), '@', 1), '.');
  first_name := initcap(parts[1]);
  last_name := initcap(array_to_string(parts[2:array_length(parts, 1)], ' '));
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Signup trigger: verify at row creation (auth blocks login until confirmed)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, username, therapist_verified_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    case
      when coalesce(new.raw_user_meta_data->>'is_therapist', '') in ('true', '1')
       and public.is_hin_personal_email(new.email)
      then now()
      else null
    end
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Guard: therapist_verified_at is server-managed
--    (extends 028's guard; internal functions opt out via remy.internal)
-- ---------------------------------------------------------------------------
create or replace function public.guard_users_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role user_role;
  internal boolean := coalesce(current_setting('remy.internal', true), '') = 'on';
begin
  new.id := old.id;  -- identity is immutable

  select role into caller_role
  from public.users
  where id = auth.uid() and is_banned = false;

  if new.role is distinct from old.role and coalesce(caller_role, 'user') <> 'admin' then
    new.role := old.role;
  end if;

  if new.is_banned is distinct from old.is_banned
     and coalesce(caller_role, 'user') not in ('moderator', 'admin') then
    new.is_banned := old.is_banned;
  end if;

  if new.therapist_verified_at is distinct from old.therapist_verified_at
     and coalesce(caller_role, 'user') <> 'admin'
     and not internal then
    new.therapist_verified_at := old.therapist_verified_at;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Email change away from HIN revokes verification and the profile link
-- ---------------------------------------------------------------------------
create or replace function public.handle_auth_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email and not public.is_hin_personal_email(new.email) then
    perform set_config('remy.internal', 'on', true);
    update public.users
       set therapist_verified_at = null
     where id = new.id and therapist_verified_at is not null;
    update public.therapists
       set user_id = null, claimed_at = null
     where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_auth_user_email_change();

-- ---------------------------------------------------------------------------
-- 6. Claims table
-- ---------------------------------------------------------------------------
create table if not exists public.therapist_claims (
  id serial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  therapist_id integer references public.therapists(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  resolution text check (resolution in ('auto', 'linked', 'created', 'rejected')),
  -- Verified name from the HIN address. Visible to the claimant and moderators only.
  hin_first_name text not null,
  hin_last_name text not null,
  note text,
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists therapist_claims_one_pending_per_user
  on public.therapist_claims (user_id) where status = 'pending';
create index if not exists therapist_claims_status_idx
  on public.therapist_claims (status, created_at);

alter table public.therapist_claims enable row level security;

drop policy if exists "Claimants and moderators can view claims" on public.therapist_claims;
create policy "Claimants and moderators can view claims" on public.therapist_claims
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('moderator', 'admin') and u.is_banned = false
    )
  );
-- No insert/update/delete policies: all writes go through the RPCs below.

grant select on public.therapist_claims to authenticated;
revoke insert, update, delete on public.therapist_claims from authenticated, anon;

-- ---------------------------------------------------------------------------
-- 7. therapists policies: close the open INSERT (M2) and let owners edit
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users can create therapists" on public.therapists;
create policy "Users create reviewed entries, staff create freely" on public.therapists
  for insert to authenticated with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('moderator', 'admin') and u.is_banned = false
    )
    or (created_by = auth.uid() and needs_review = true and user_id is null)
  );

drop policy if exists "Owners can update their therapist profile" on public.therapists;
create policy "Owners can update their therapist profile" on public.therapists
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Owners may edit profile content only. Moderation/ownership columns are
-- reverted for non-staff callers (jsonb so it tolerates columns that only
-- exist on some environments, e.g. is_active from migration 021).
create or replace function public.guard_therapists_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role user_role;
  internal boolean := coalesce(current_setting('remy.internal', true), '') = 'on';
  protected jsonb;
begin
  if internal then
    return new;
  end if;

  select role into caller_role
  from public.users
  where id = auth.uid() and is_banned = false;

  if coalesce(caller_role, 'user') in ('moderator', 'admin') then
    return new;
  end if;

  select jsonb_object_agg(key, value) into protected
  from jsonb_each(to_jsonb(old))
  where key in ('needs_review', 'reviewed_by', 'reviewed_at', 'created_by',
                'user_id', 'claimed_at', 'is_active');

  if protected is not null then
    new := jsonb_populate_record(new, protected);
  end if;
  return new;
end;
$$;

drop trigger if exists guard_therapists_privileged_columns on public.therapists;
create trigger guard_therapists_privileged_columns
  before update on public.therapists
  for each row execute function public.guard_therapists_privileged_columns();

-- ---------------------------------------------------------------------------
-- 8. Notifications helper (staff fan-out)
-- ---------------------------------------------------------------------------
create or replace function public.notify_staff(p_type notification_type, p_title text, p_message text, p_therapist_id integer default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, message, related_therapist_id)
  select id, p_type, p_title, p_message, p_therapist_id
  from public.users
  where role in ('moderator', 'admin') and is_banned = false;
end;
$$;

revoke execute on function public.notify_staff(notification_type, text, text, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. RPC: claim_therapist_profile()  — called by the verified user (idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.claim_therapist_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  verified timestamptz;
  v_email text;
  v_first text;
  v_last text;
  key_first text;
  key_last text;
  key_first_s text;
  key_last_s text;
  linked_id integer;
  existing_claim record;
  match_ids integer[];
  match_id integer;
  match_owner uuid;
  claim_id integer;
begin
  if caller is null then
    raise exception 'not authenticated';
  end if;

  select therapist_verified_at into verified from public.users where id = caller;
  if verified is null then
    return jsonb_build_object('status', 'not_verified');
  end if;

  select id into linked_id from public.therapists where user_id = caller;
  if linked_id is not null then
    return jsonb_build_object('status', 'linked', 'therapist_id', linked_id);
  end if;

  select * into existing_claim
  from public.therapist_claims
  where user_id = caller
  order by created_at desc
  limit 1;

  if existing_claim.id is not null and existing_claim.status = 'pending' then
    return jsonb_build_object('status', 'pending', 'claim_id', existing_claim.id);
  end if;
  if existing_claim.id is not null and existing_claim.status = 'rejected' then
    return jsonb_build_object('status', 'rejected', 'claim_id', existing_claim.id, 'note', existing_claim.note);
  end if;

  select email into v_email from auth.users where id = caller;
  if not public.is_hin_personal_email(v_email) then
    return jsonb_build_object('status', 'not_verified');
  end if;

  select first_name, last_name into v_first, v_last from public.hin_email_name_parts(v_email);
  key_first := public.name_key(v_first);
  key_last := public.name_key(v_last);
  key_first_s := public.name_key_short(v_first);
  key_last_s := public.name_key_short(v_last);

  select array_agg(id) into match_ids
  from public.therapists t
  where t.first_name <> ''
    and (
      (public.name_key(t.first_name) = key_first and public.name_key(t.last_name) = key_last)
      or (public.name_key_short(t.first_name) = key_first_s and public.name_key_short(t.last_name) = key_last_s)
    );

  perform set_config('remy.internal', 'on', true);

  if coalesce(array_length(match_ids, 1), 0) = 1 then
    match_id := match_ids[1];
    select user_id into match_owner from public.therapists where id = match_id;

    if match_owner is null then
      update public.therapists
         set user_id = caller, claimed_at = now()
       where id = match_id;

      insert into public.therapist_claims (user_id, therapist_id, status, resolution, hin_first_name, hin_last_name, reviewed_at)
      values (caller, match_id, 'approved', 'auto', v_first, v_last, now());

      return jsonb_build_object('status', 'linked', 'therapist_id', match_id);
    end if;
    -- Exactly one match but it belongs to someone else: a human must look.
  end if;

  insert into public.therapist_claims (user_id, therapist_id, status, hin_first_name, hin_last_name)
  values (caller, case when coalesce(array_length(match_ids, 1), 0) = 1 then match_ids[1] else null end, 'pending', v_first, v_last)
  returning id into claim_id;

  perform public.notify_staff(
    'therapist_pending',
    'Therapeutenprofil-Anfrage',
    format('%s %s möchte ein Therapeutenprofil übernehmen', v_first, v_last),
    null
  );

  return jsonb_build_object('status', 'pending', 'claim_id', claim_id);
end;
$$;

revoke execute on function public.claim_therapist_profile() from public, anon;
grant execute on function public.claim_therapist_profile() to authenticated;

-- ---------------------------------------------------------------------------
-- 10. RPC: get_therapist_claim_candidates(claim_id) — moderators
-- ---------------------------------------------------------------------------
create or replace function public.get_therapist_claim_candidates(p_claim_id integer)
returns table (
  therapist_id integer,
  first_name text,
  last_name text,
  form_of_address text,
  institution text,
  full_title text,
  canton text,
  city text,
  user_id uuid,
  score real
)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role user_role;
  c record;
  target text;
begin
  select role into caller_role from public.users where id = auth.uid() and is_banned = false;
  if coalesce(caller_role, 'user') not in ('moderator', 'admin') then
    raise exception 'forbidden';
  end if;

  select * into c from public.therapist_claims where id = p_claim_id;
  if c.id is null then
    raise exception 'claim not found';
  end if;

  target := public.name_key(c.hin_first_name || ' ' || c.hin_last_name);

  return query
  select t.id, t.first_name::text, t.last_name::text, t.form_of_address::text,
         t.institution::text, t.full_title, t.canton::text, t.city::text, t.user_id,
         greatest(
           similarity(public.name_key(t.first_name || ' ' || t.last_name), target),
           similarity(public.name_key(t.last_name), public.name_key(c.hin_last_name))
         ) as score
  from public.therapists t
  where t.first_name <> '' or t.last_name <> ''
  order by score desc, t.last_name, t.first_name
  limit 10;
end;
$$;

revoke execute on function public.get_therapist_claim_candidates(integer) from public, anon;
grant execute on function public.get_therapist_claim_candidates(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 11. RPC: resolve_therapist_claim(claim_id, action, therapist_id, note) — moderators
--     action: 'link' (to p_therapist_id) | 'create' (new row from HIN name) | 'reject'
-- ---------------------------------------------------------------------------
create or replace function public.resolve_therapist_claim(
  p_claim_id integer,
  p_action text,
  p_therapist_id integer default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  caller_role user_role;
  c record;
  owner uuid;
  new_id integer;
  claimant_canton text;
begin
  select role into caller_role from public.users where id = caller and is_banned = false;
  if coalesce(caller_role, 'user') not in ('moderator', 'admin') then
    raise exception 'forbidden';
  end if;

  select * into c from public.therapist_claims where id = p_claim_id for update;
  if c.id is null then
    raise exception 'claim not found';
  end if;
  if c.status <> 'pending' then
    raise exception 'claim already resolved';
  end if;

  perform set_config('remy.internal', 'on', true);

  if p_action = 'link' then
    if p_therapist_id is null then
      raise exception 'therapist_id required';
    end if;
    select user_id into owner from public.therapists where id = p_therapist_id;
    if not found then
      raise exception 'therapist not found';
    end if;
    if owner is not null and owner <> c.user_id then
      raise exception 'therapist already linked to another user';
    end if;

    update public.therapists
       set user_id = c.user_id, claimed_at = now()
     where id = p_therapist_id;

    update public.therapist_claims
       set status = 'approved', resolution = 'linked', therapist_id = p_therapist_id,
           note = p_note, reviewed_by = caller, reviewed_at = now()
     where id = p_claim_id;

    insert into public.notifications (user_id, type, title, message, related_therapist_id)
    values (c.user_id, 'system', 'Therapeutenprofil freigeschaltet',
            'Dein Therapeutenprofil wurde mit dir verknüpft. Du kannst es jetzt bearbeiten.', p_therapist_id);

    return jsonb_build_object('status', 'approved', 'therapist_id', p_therapist_id);

  elsif p_action = 'create' then
    select default_canton into claimant_canton from public.users where id = c.user_id;

    insert into public.therapists (form_of_address, first_name, last_name, canton, needs_review, created_by, user_id, claimed_at)
    values ('', c.hin_first_name, c.hin_last_name, nullif(claimant_canton, ''), true, c.user_id, c.user_id, now())
    returning id into new_id;

    update public.therapist_claims
       set status = 'approved', resolution = 'created', therapist_id = new_id,
           note = p_note, reviewed_by = caller, reviewed_at = now()
     where id = p_claim_id;

    insert into public.notifications (user_id, type, title, message, related_therapist_id)
    values (c.user_id, 'system', 'Therapeutenprofil erstellt',
            'Für dich wurde ein Therapeutenprofil angelegt. Bitte vervollständige es.', new_id);

    return jsonb_build_object('status', 'approved', 'therapist_id', new_id);

  elsif p_action = 'reject' then
    update public.therapist_claims
       set status = 'rejected', resolution = 'rejected',
           note = p_note, reviewed_by = caller, reviewed_at = now()
     where id = p_claim_id;

    insert into public.notifications (user_id, type, title, message)
    values (c.user_id, 'system', 'Therapeutenprofil-Anfrage abgelehnt',
            coalesce(nullif(p_note, ''), 'Deine Anfrage konnte nicht zugeordnet werden. Bitte melde dich bei der Moderation.'));

    return jsonb_build_object('status', 'rejected');
  end if;

  raise exception 'unknown action %', p_action;
end;
$$;

revoke execute on function public.resolve_therapist_claim(integer, text, integer, text) from public, anon;
grant execute on function public.resolve_therapist_claim(integer, text, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 12. RPC: unlink_therapist_profile(therapist_id) — moderators undo a link
-- ---------------------------------------------------------------------------
create or replace function public.unlink_therapist_profile(p_therapist_id integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role user_role;
begin
  select role into caller_role from public.users where id = auth.uid() and is_banned = false;
  if coalesce(caller_role, 'user') not in ('moderator', 'admin') then
    raise exception 'forbidden';
  end if;
  perform set_config('remy.internal', 'on', true);
  update public.therapists set user_id = null, claimed_at = null where id = p_therapist_id;
end;
$$;

revoke execute on function public.unlink_therapist_profile(integer) from public, anon;
grant execute on function public.unlink_therapist_profile(integer) to authenticated;

-- Migration 035: HIN-linked therapist profiles are not "wird geprüft"
--
-- needs_review marks unverified, user-submitted directory entries. A profile
-- created for a HIN-verified therapist by the claim flow is owned by an
-- identified professional, so it must not carry the review flag. Redefines
-- resolve_therapist_claim (create path now inserts needs_review = false) and
-- clears the flag on rows already linked to an account.

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
    values ('', c.hin_first_name, c.hin_last_name, nullif(claimant_canton, ''), false, c.user_id, c.user_id, now())
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

update public.therapists
   set needs_review = false
 where user_id is not null and needs_review = true;

-- ============================================================================
-- 029: Automated LLM post moderation (edge function `moderate-post`)
--
-- Adds the storage for the LLM verdict and lets the edge function (service
-- role) write moderation decisions past the 028 guard trigger. The moderation
-- workflow itself is unchanged: posts are born 'pending' + unpublished and
-- become visible only via the existing RLS gate
-- (moderation_status = 'approved' AND is_published = true, migration 016).
-- ============================================================================

-- Raw LLM verdict (violations array, model, timestamp) for audit + the
-- ModerationQueue. NULL = not yet machine-moderated.
alter table public.posts
  add column if not exists moderation_result jsonb;

comment on column public.posts.moderation_result is
  'Raw verdict of the moderate-post edge function: {provider, model, checked_at, violations:[{slug, severity, excerpt, reason}]}';

-- Pending-queue lookups (ModerationQueue, edge function). The existing
-- composite indexes are all partial on is_published = true and cannot serve
-- moderation_status = ''pending'' queries.
create index if not exists idx_posts_moderation_status
  on public.posts (moderation_status);

-- ---------------------------------------------------------------------------
-- Amend the 028 guard so non-end-user connections may set moderation columns.
-- The guard exists to stop END USERS (anon/authenticated via PostgREST) from
-- self-approving; as written it also clamped the service role (auth.uid() is
-- NULL there), which would revert the edge function's own status updates.
-- service_role and direct admin connections bypass RLS anyway — the guard was
-- never a boundary for them. Body otherwise identical to 028.
-- ---------------------------------------------------------------------------
create or replace function public.guard_posts_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_mod boolean;
begin
  -- Trusted, non-end-user paths: PostgREST service_role (edge functions) and
  -- direct connections (migrations, dashboard SQL). End-user API requests
  -- always carry an 'anon' or 'authenticated' JWT role claim.
  if coalesce(auth.role(), 'direct') not in ('anon', 'authenticated') then
    return new;
  end if;

  select exists(
    select 1 from public.users
    where id = auth.uid() and role in ('moderator', 'admin') and is_banned = false
  ) into is_mod;

  if is_mod then
    return new;  -- moderators/admins may set any moderation column
  end if;

  if tg_op = 'INSERT' then
    new.is_published := false;
    new.is_banned := false;
    if new.is_draft is not true then
      new.moderation_status := 'pending';
    end if;
  elsif tg_op = 'UPDATE' then
    new.user_id := old.user_id;             -- no authorship forgery
    new.is_banned := old.is_banned;         -- no self-unban
    new.is_published := old.is_published;   -- no self-publish
    -- authors may only move their own post to pending/null (re-moderation on edit),
    -- never to approved/rejected
    if new.moderation_status is distinct from old.moderation_status
       and new.moderation_status not in ('pending') then
      new.moderation_status := old.moderation_status;
    end if;
  end if;

  return new;
end;
$$;

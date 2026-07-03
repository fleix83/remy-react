-- ============================================================================
-- 030: Extend automated LLM moderation (029) to comments.
--
-- Comments already carry the full moderation workflow: moderation_status
-- (default 'pending'), is_published, rejection_reason, an approved-only RLS
-- SELECT gate, an idx_comments_moderation_status index, and the 028
-- guard_comments_moderation trigger. This migration only adds the verdict
-- column and gives the moderate-post edge function (service role) the same
-- guard bypass as 029 did for posts.
-- ============================================================================

alter table public.comments
  add column if not exists moderation_result jsonb;

comment on column public.comments.moderation_result is
  'Raw verdict of the moderate-post edge function: {provider, model, checked_at, violations:[{slug, severity, excerpt, reason}]}';

-- Same non-end-user bypass as guard_posts_moderation (029). Body otherwise
-- identical to 028.
create or replace function public.guard_comments_moderation()
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
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_published := false;
    new.moderation_status := 'pending';
  elsif tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    new.is_published := old.is_published;
    if new.moderation_status is distinct from old.moderation_status
       and new.moderation_status not in ('pending') then
      new.moderation_status := old.moderation_status;
    end if;
  end if;

  return new;
end;
$$;

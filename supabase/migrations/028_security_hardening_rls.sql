-- 028_security_hardening_rls.sql
--
-- Security hardening for the issues found in the 2026-07 review. Fixes are written
-- as BEFORE-trigger guards rather than grant revocations so that the EXISTING app
-- flows keep working unchanged:
--   * posts.service.createPost sends is_published=false, moderation_status='pending'|null
--   * posts.service.updatePost re-sets moderation_status to 'pending'|null on edit
--   * comments.service relies on the DB defaults ('pending' / false)
--   * moderators approve via direct UPDATE (moderation-queue.service.ts)
--   * update_user_role / toggle_user_ban SECURITY DEFINER RPCs
-- Non-privileged clients are blocked from forcing privileged columns; privileged
-- roles (author for content, moderator/admin for moderation, admin for roles) are
-- unaffected.
--
-- IMPORTANT: test on a Supabase branch before applying to the live project.
-- Applying this also requires the frontend change that stops selecting users.email
-- in ModerationQueue.tsx (shipped alongside this migration).

begin;

-- ---------------------------------------------------------------------------
-- C1: Remove email from public.users (revDSG / anonymity). Email stays in
-- auth.users for password reset. Rewrites the signup trigger to stop copying it
-- and pins its search_path (advisor 0011).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$;

alter table public.users drop column if exists email;

-- ---------------------------------------------------------------------------
-- C2: Prevent privilege escalation via direct UPDATE on public.users.
-- The RLS policy `USING (auth.uid() = id)` has no WITH CHECK, so any user could
-- set role='admin' or is_banned=false on their own row. Guard role/is_banned and
-- pin id. Role changes require admin; ban changes require moderator/admin (matching
-- the update_user_role / toggle_user_ban RPCs, which still work through this guard).
-- ---------------------------------------------------------------------------
create or replace function public.guard_users_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role user_role;
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

  return new;
end;
$$;

drop trigger if exists guard_users_privileged_columns on public.users;
create trigger guard_users_privileged_columns
  before update on public.users
  for each row execute function public.guard_users_privileged_columns();

-- ---------------------------------------------------------------------------
-- C3: Prevent moderation bypass on posts. Non-moderators cannot self-approve,
-- self-publish, self-unban, or reassign authorship. Authors may still edit their
-- own content and re-submit to 'pending' (the existing edit flow). Moderators are
-- unaffected, so the approval queue keeps working.
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

drop trigger if exists guard_posts_moderation on public.posts;
create trigger guard_posts_moderation
  before insert or update on public.posts
  for each row execute function public.guard_posts_moderation();

-- Comments: same intent (comments has no is_banned column).
create or replace function public.guard_comments_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_mod boolean;
begin
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

drop trigger if exists guard_comments_moderation on public.comments;
create trigger guard_comments_moderation
  before insert or update on public.comments
  for each row execute function public.guard_comments_moderation();

-- ---------------------------------------------------------------------------
-- M3: Messages are immutable except for the read receipt. The UPDATE policy
-- includes the receiver (to mark read) but has no WITH CHECK, letting a recipient
-- rewrite content or reassign sender/receiver. Pin everything except is_read.
-- ---------------------------------------------------------------------------
create or replace function public.guard_messages_immutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.sender_id := old.sender_id;
  new.receiver_id := old.receiver_id;
  new.content := old.content;
  new.created_at := old.created_at;
  new.post_messages_id := old.post_messages_id;
  return new;  -- only is_read may change
end;
$$;

drop trigger if exists guard_messages_immutable on public.messages;
create trigger guard_messages_immutable
  before update on public.messages
  for each row execute function public.guard_messages_immutable();

-- ---------------------------------------------------------------------------
-- Low: pin search_path on the remaining flagged functions (advisor 0011).
-- ---------------------------------------------------------------------------
alter function public.update_updated_at_column() set search_path = public;
alter function public.sync_all_therapists_for_designation() set search_path = public;
-- update_documents_updated_at() also flagged; uncomment if present:
-- alter function public.update_documents_updated_at() set search_path = public;

commit;

-- ---------------------------------------------------------------------------
-- FOLLOW-UPS (not included here because they need matching frontend changes and
-- their own testing — tracked separately):
--
-- M1  notifications INSERT `WITH CHECK (true)` lets any user forge a notification
--     to anyone. The proper fix is to generate notifications server-side (BEFORE
--     INSERT triggers on comments/messages) and revoke client INSERT. That requires
--     removing the client-side insert in comments.service.notifyPostAuthor first.
--
-- M2  therapists INSERT `WITH CHECK (true)` lets any authenticated user inject
--     directory rows. Confirm whether any non-admin "add therapist" flow exists; if
--     not, restrict INSERT to moderators/admins (import runs as staff).
--
-- H3  users SELECT `USING (true)` still exposes role / is_banned / created_at to
--     anon. Consider a public view with a minimal column projection and revoking
--     broad SELECT on the base table.
--
-- Also: revoke the over-broad DML grants on anon (anon should have no INSERT/UPDATE/
--     DELETE on these tables at all — RLS is currently the only thing stopping it).
-- ---------------------------------------------------------------------------

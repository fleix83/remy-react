-- ============================================================================
-- 031: Seed the admin-editable LLM moderation rules.
--
-- The moderate-post edge function reads site_content key 'moderation'
-- (value.rules) on every invocation; its hardcoded default is only a
-- fallback. Admins edit the rules in AdminDashboard -> CMS -> KI-Moderation
-- (site_content writes are admin-only per the 017 RLS policies). Note the
-- row is world-readable like all site_content — the moderation rules are
-- not secret.
-- ============================================================================

insert into public.site_content (key, value)
values (
  'moderation',
  jsonb_build_object('rules', $rules$
- therapist_pii (severity: block): The content exposes private or identifying
  information about a named or identifiable real therapist or other private
  person beyond a plain name-in-context: phone numbers, e-mail or postal
  addresses, private schedules or locations, family details, or an
  accumulation of details that pinpoints them. Sharing a personal experience
  that merely names a therapist is allowed; doxxing is not.
- hate_violence (severity: block): Hate speech or discrimination against any
  person or group, or threats/incitement of violence.
- harassment (severity: flag): Personal attacks, bullying, or demeaning,
  targeted hostility toward another forum member or person.
- spam (severity: flag): Advertising, promotional or affiliate links, SEO
  spam, repeated low-effort content, commercial solicitation.
- off_topic (severity: warn): Content clearly unrelated to psychotherapy,
  mental health, or the purpose of this forum.
$rules$::text)
)
on conflict (key) do nothing;

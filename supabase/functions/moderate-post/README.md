# moderate-post — automated LLM post & comment moderation

One chat-completion call per post **or comment** decides **approve / hold for
human / reject** (the webhook payload's `table` field selects the behavior).
Provider: **Infomaniak AI Services** (Swiss-hosted, no request storage, no
training on prompts — see `llm.ts` header). Fail-closed: on any error the post
simply stays `pending` and lands in the existing human ModerationQueue.

## How it fits the existing system

- Posts are already inserted as `moderation_status='pending'`, `is_published=false`
  and are invisible under the RLS gate (migration 016). Nothing changes there.
- Verdict mapping onto the existing enum:
  - any `block` violation → `rejected` (+ `rejection_reason`)
  - any `flag` violation → stays `pending` (human reviews it in ModerationQueue,
    with the LLM verdict in `posts.moderation_result`)
  - clean / only `warn` → `approved` + `is_published=true` (feed picks it up via
    the existing realtime subscription)
- Requires migration `029_llm_moderation.sql` (adds `moderation_result`, index,
  service-role bypass in the `guard_posts_moderation` trigger).
- **Comments** work identically (migration `030_llm_moderation_comments.sql`):
  they are also born `pending` + invisible under the comments RLS gate, and the
  same block/flag/clean mapping applies. Needs a **second webhook** on
  `public.comments` (same settings as the posts one). Approved comments reach
  open threads via the realtime UPDATE handler in `useCommentsRealtime.ts`.

## Setup

1. **Infomaniak**: in the [Manager](https://manager.infomaniak.com), order the
   (free-tier) **AI Services** product and create an API token. The product id
   is shown in the manager (or via authenticated `GET https://api.infomaniak.com/1/ai`).

2. **Secrets** (server-side only — never in the repo or frontend):

   ```bash
   supabase secrets set LLM_API_KEY=<infomaniak token>
   ```

   (or Dashboard → Edge Functions → Secrets; the name `Infomaniak` is accepted
   as an alias.) The AI product id is auto-discovered from the token via
   `GET /1/ai`; set an `LLM_PRODUCT_ID` secret only to override that.

3. **Deploy**:

   ```bash
   supabase functions deploy moderate-post
   ```

4. **Database Webhooks** (Dashboard → Integrations → Database Webhooks; first
   use enables the `pg_net` extension). Create one per table — `moderate_post`
   on `public.posts` and `moderate_comment` on `public.comments` — with
   identical settings:
   - Events: **INSERT** and **UPDATE**
   - Type: *Supabase Edge Functions* → `moderate-post`
   - HTTP Headers: add the auth header with the project **anon** key
     (`Authorization: Bearer <anon key>`) — the function verifies JWTs.
     Forged calls are harmless anyway: the function re-reads the post from the
     DB and only ever acts on `pending` rows.
   - Timeout: 5000 ms is fine — the function finishes its work regardless of
     whether the webhook waits for the response.

   UPDATE events are needed so edited posts and published drafts (both reset to
   `pending` by the existing guard/UI flow) get re-moderated. The function
   ignores UPDATEs where the text didn't change, so its own verdict writes
   don't re-trigger it.

## Test cases

Insert through the app UI as a normal user, or via SQL editor with a real
`user_id`. Expected result within a few seconds of the insert:

1. **Clean post → auto-approved, visible in the feed**

   ```sql
   insert into posts (user_id, category_id, title, content)
   values ('<test-user-uuid>', 1, 'Suche Erfahrungen mit Verhaltenstherapie',
           '<p>Ich habe vor zwei Monaten eine Verhaltenstherapie begonnen und bin unsicher, ob die Methode zu mir passt. Wie lange hat es bei euch gedauert, bis ihr Fortschritte gespürt habt?</p>');
   -- expect: moderation_status='approved', is_published=true, moderation_result.violations=[]
   ```

2. **Doxxing a named therapist with a phone number → rejected**

   ```sql
   insert into posts (user_id, category_id, title, content)
   values ('<test-user-uuid>', 1, 'Warnung vor Dr. Muster',
           '<p>Dr. Hans Muster aus Zürich ist schrecklich. Seine private Handynummer ist 079 123 45 67 — ruft ihn an und sagt ihm eure Meinung! Er wohnt an der Beispielstrasse 12.</p>');
   -- expect: moderation_status='rejected', rejection_reason mentions therapist_pii,
   --         moderation_result.violations contains {slug:'therapist_pii', severity:'block'}
   ```

3. **Spam → held for human review (stays pending, verdict attached)**

   ```sql
   insert into posts (user_id, category_id, title, content)
   values ('<test-user-uuid>', 1, 'Super Angebot',
           '<p>Kaufen Sie jetzt CBD-Öl mit 50% Rabatt auf www.spam-beispiel.example — nur heute!!! Jetzt klicken!</p>');
   -- expect: moderation_status stays 'pending' (visible in /admin/moderation),
   --         moderation_result.violations contains {slug:'spam', severity:'flag'}
   ```

Check outcomes: `select id, moderation_status, is_published, rejection_reason, moderation_result from posts order by id desc limit 3;`
Function logs: Dashboard → Edge Functions → moderate-post → Logs.

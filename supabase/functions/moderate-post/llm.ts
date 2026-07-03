// ---------------------------------------------------------------------------
// LLM provider seam — the ONLY module that talks to an LLM provider.
//
// Current provider: Infomaniak AI Services (api.infomaniak.com). Chosen for
// Swiss data protection (revDSG/nFADP): inference runs entirely in
// Switzerland, and Infomaniak states requests are neither stored nor used for
// training (https://www.infomaniak.com/en/hosting/ai-services). Post title +
// content are sent to this endpoint and nowhere else.
//
// To swap providers, reimplement chatCompletion() here — for any
// OpenAI-compatible chat-completions API that means changing BASE_URL, MODEL
// and auth only. index.ts is provider-agnostic.
// ---------------------------------------------------------------------------

// GA multilingual model, strong on German/French. Valid IDs: authenticated
// GET https://api.infomaniak.com/1/ai/models
const MODEL = 'mistralai/Mistral-Small-4-119B-2603'

// The AI Services product id is auto-discovered from the account (one AI
// product per organization, per Infomaniak FAQ 2845) and cached for the
// lifetime of the function instance. Set LLM_PRODUCT_ID to override.
let cachedProductId: string | null = null

async function resolveProductId(apiKey: string): Promise<string> {
  const explicit = Deno.env.get('LLM_PRODUCT_ID')
  if (explicit) return explicit
  if (cachedProductId) return cachedProductId

  const res = await fetch('https://api.infomaniak.com/1/ai', {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) {
    throw new Error(
      `AI product discovery failed (HTTP ${res.status}) — set the LLM_PRODUCT_ID secret manually`,
    )
  }
  const body = await res.json()
  const first = Array.isArray(body?.data) ? body.data[0] : body?.data
  const id = first?.id ?? first?.product_id
  if (id == null) {
    throw new Error('no AI product found on this account — set the LLM_PRODUCT_ID secret')
  }
  cachedProductId = String(id)
  return cachedProductId
}

export interface ChatCompletionRequest {
  system: string
  user: string
  /** JSON schema the model output must strictly follow. */
  schemaName: string
  schema: Record<string, unknown>
}

export interface ChatCompletionResult {
  /** Raw assistant message content (JSON text conforming to the schema). */
  content: string
  provider: string
  model: string
}

export async function chatCompletion(
  req: ChatCompletionRequest,
): Promise<ChatCompletionResult> {
  // Canonical secret name is LLM_API_KEY; 'Infomaniak' is accepted as an alias.
  const apiKey = Deno.env.get('LLM_API_KEY') ?? Deno.env.get('Infomaniak')
  if (!apiKey) {
    throw new Error('LLM_API_KEY (or Infomaniak) secret not configured')
  }
  const productId = await resolveProductId(apiKey)

  const res = await fetch(
    `https://api.infomaniak.com/2/ai/${productId}/openai/v1/chat/completions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        model: MODEL,
        stream: false, // Infomaniak's v2 endpoint streams by default
        max_completion_tokens: 2000,
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.user },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: req.schemaName, strict: true, schema: req.schema },
        },
      }),
    },
  )

  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`)
  }
  const body = await res.json()
  const content = body?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || content.length === 0) {
    throw new Error('LLM response contained no message content')
  }
  return { content, provider: 'infomaniak', model: body?.model ?? MODEL }
}

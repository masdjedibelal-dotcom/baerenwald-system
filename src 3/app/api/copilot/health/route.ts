import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import {
  claudeApiKeyLooksValid,
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeApiKeySource,
  getClaudeModel,
  isNetlifyAiGatewayBaseUrl,
  normalizeClaudeApiKey,
} from '@/lib/copilot/claude-api-key'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const claudeRaw = process.env.CLAUDE_API_KEY
  const anthropicRaw = process.env.ANTHROPIC_API_KEY
  const resolved = getClaudeApiKey()

  const checks: Record<string, unknown> = {
    env: {
      CLAUDE_API_KEY_set: !!normalizeClaudeApiKey(claudeRaw),
      ANTHROPIC_API_KEY_set: !!normalizeClaudeApiKey(anthropicRaw),
      resolved_from: getClaudeApiKeySource(),
      resolved_key_length: resolved.length,
      resolved_key_prefix: resolved ? `${resolved.slice(0, 12)}…` : null,
      resolved_key_format_ok: claudeApiKeyLooksValid(resolved),
      ANTHROPIC_BASE_URL_netlify_gateway: isNetlifyAiGatewayBaseUrl(),
      anthropic_uses_direct_api: true,
      TELEGRAM_BOT_TOKEN_set: !!process.env.TELEGRAM_BOT_TOKEN?.trim(),
      TELEGRAM_CHAT_ID_set: !!process.env.TELEGRAM_CHAT_ID?.trim(),
      SUPABASE_SERVICE_ROLE_KEY_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
      NEXT_PUBLIC_SUPABASE_URL_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
    },
    supabase_copilot_messages: { ok: false as boolean, error: null as string | null },
    anthropic_ping: { ok: false as boolean, error: null as string | null },
  }

  const { error: sbError } = await supabaseAdmin
    .from('copilot_messages')
    .select('id')
    .limit(1)

  if (sbError) {
    checks.supabase_copilot_messages = { ok: false, error: `${sbError.code}: ${sbError.message}` }
  } else {
    checks.supabase_copilot_messages = { ok: true, error: null }
  }

  if (!resolved) {
    checks.anthropic_ping = {
      ok: false,
      error: 'Kein API-Key (CLAUDE_API_KEY oder ANTHROPIC_API_KEY fehlt zur Laufzeit).',
    }
  } else if (!claudeApiKeyLooksValid(resolved)) {
    checks.anthropic_ping = {
      ok: false,
      error:
        'Key-Format unplausibel (erwartet sk-ant-… von console.anthropic.com, kein OpenAI-/Supabase-Key).',
    }
  } else {
    try {
      const client = createAnthropicClient(resolved)
      await client.messages.create({
        model: getClaudeModel(),
        max_tokens: 8,
        messages: [{ role: 'user', content: 'ping' }],
      })
      checks.anthropic_ping = { ok: true, error: null }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const status = e instanceof Anthropic.APIError ? e.status : undefined
      checks.anthropic_ping = { ok: false, error: status ? `${status}: ${msg}` : msg }
    }
  }

  const ok =
    (checks.supabase_copilot_messages as { ok: boolean }).ok &&
    (checks.anthropic_ping as { ok: boolean }).ok

  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 500 })
}

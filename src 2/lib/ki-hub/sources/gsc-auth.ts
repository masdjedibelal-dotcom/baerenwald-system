import 'server-only'

import { createSign, randomBytes } from 'crypto'
import { getPublicAppUrl } from '@/lib/utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const GSC_OAUTH_REFRESH_TOKEN_KEY = 'gsc_oauth_refresh_token'
export const GSC_OAUTH_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
export const GSC_OAUTH_STATE_COOKIE = 'gsc_oauth_state'

type ServiceAccount = {
  client_email: string
  private_key: string
}

type OAuthClientConfig = {
  clientId: string
  clientSecret: string
}

export type GscAuthMode = 'oauth' | 'service_account' | 'none'

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function getGscOAuthRedirectUri(): string {
  return `${getPublicAppUrl()}/api/ki-hub/gsc/oauth/callback`
}

export function getGscOAuthClientConfig(): OAuthClientConfig | null {
  const clientId = process.env.GSC_OAUTH_CLIENT_ID?.trim()
  const clientSecret = process.env.GSC_OAUTH_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

export function createGscOAuthState(): string {
  return randomBytes(24).toString('hex')
}

export function buildGscOAuthConsentUrl(state: string): string {
  const config = getGscOAuthClientConfig()
  if (!config) throw new Error('GSC_OAUTH_CLIENT_ID / GSC_OAUTH_CLIENT_SECRET fehlen')

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: getGscOAuthRedirectUri(),
    response_type: 'code',
    scope: GSC_OAUTH_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

function parseServiceAccount(): ServiceAccount | null {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON?.trim()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ServiceAccount
    if (!parsed.client_email || !parsed.private_key) return null
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n')
    return parsed
  } catch {
    return null
  }
}

export async function resolveGscRefreshToken(): Promise<string | null> {
  const fromEnv = process.env.GSC_OAUTH_REFRESH_TOKEN?.trim()
  if (fromEnv) return fromEnv

  const { data, error } = await supabaseAdmin
    .from('einstellungen')
    .select('value')
    .eq('key', GSC_OAUTH_REFRESH_TOKEN_KEY)
    .maybeSingle()

  if (error) return null
  const value = data?.value?.trim()
  return value || null
}

export async function saveGscOAuthRefreshToken(token: string): Promise<void> {
  const { error } = await supabaseAdmin.from('einstellungen').upsert(
    {
      key: GSC_OAUTH_REFRESH_TOKEN_KEY,
      value: token,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  )
  if (error) throw new Error(error.message)
}

export async function hasGscOAuthRefreshToken(): Promise<boolean> {
  return Boolean(await resolveGscRefreshToken())
}

export async function resolveGscAuthMode(): Promise<GscAuthMode> {
  const oauthClient = getGscOAuthClientConfig()
  if (oauthClient && (await resolveGscRefreshToken())) return 'oauth'
  if (parseServiceAccount()) return 'service_account'
  return 'none'
}

async function refreshOAuthAccessToken(
  config: OAuthClientConfig,
  refreshToken: string
): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    next: { revalidate: 0 },
  })

  const json = (await res.json()) as { access_token?: string; error_description?: string }
  if (!json.access_token) {
    throw new Error(json.error_description ?? 'GSC OAuth Token-Refresh fehlgeschlagen')
  }
  return json.access_token
}

async function getServiceAccountAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: GSC_OAUTH_SCOPE,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  )
  const signInput = `${header}.${payload}`
  const sign = createSign('RSA-SHA256')
  sign.update(signInput)
  sign.end()
  const signature = base64url(sign.sign(sa.private_key))
  const jwt = `${signInput}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
    next: { revalidate: 0 },
  })

  const json = (await res.json()) as { access_token?: string; error_description?: string }
  if (!json.access_token) {
    throw new Error(json.error_description ?? 'Google Service-Account Token fehlgeschlagen')
  }
  return json.access_token
}

export async function exchangeGscOAuthCode(code: string): Promise<{
  access_token: string
  refresh_token?: string
}> {
  const config = getGscOAuthClientConfig()
  if (!config) throw new Error('GSC_OAUTH_CLIENT_ID / GSC_OAUTH_CLIENT_SECRET fehlen')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: getGscOAuthRedirectUri(),
      grant_type: 'authorization_code',
    }),
    next: { revalidate: 0 },
  })

  const json = (await res.json()) as {
    access_token?: string
    refresh_token?: string
    error_description?: string
  }
  if (!json.access_token) {
    throw new Error(json.error_description ?? 'GSC OAuth Code-Austausch fehlgeschlagen')
  }
  return { access_token: json.access_token, refresh_token: json.refresh_token }
}

export async function fetchGscAccessToken(): Promise<{
  token: string
  mode: GscAuthMode
  serviceAccountEmail?: string
}> {
  const oauthClient = getGscOAuthClientConfig()
  const refreshToken = await resolveGscRefreshToken()
  if (oauthClient && refreshToken) {
    const token = await refreshOAuthAccessToken(oauthClient, refreshToken)
    return { token, mode: 'oauth' }
  }

  const sa = parseServiceAccount()
  if (sa) {
    const token = await getServiceAccountAccessToken(sa)
    return { token, mode: 'service_account', serviceAccountEmail: sa.client_email }
  }

  const oauthReady = Boolean(oauthClient)
  throw new Error(
    oauthReady
      ? 'GSC OAuth: Mit Google verbinden (KI Hub) oder GSC_OAUTH_REFRESH_TOKEN setzen'
      : 'GSC: GSC_OAUTH_CLIENT_ID/SECRET oder GSC_SERVICE_ACCOUNT_JSON fehlt'
  )
}

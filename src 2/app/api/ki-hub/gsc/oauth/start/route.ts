import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import {
  buildGscOAuthConsentUrl,
  createGscOAuthState,
  getGscOAuthClientConfig,
  getGscOAuthRedirectUri,
  GSC_OAUTH_STATE_COOKIE,
} from '@/lib/ki-hub/sources/gsc-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  if (!getGscOAuthClientConfig()) {
    return NextResponse.json(
      {
        error:
          'GSC_OAUTH_CLIENT_ID und GSC_OAUTH_CLIENT_SECRET in Netlify setzen. Redirect-URI in Google Cloud: ' +
          getGscOAuthRedirectUri(),
      },
      { status: 503 }
    )
  }

  const state = createGscOAuthState()
  cookies().set(GSC_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  return NextResponse.redirect(buildGscOAuthConsentUrl(state))
}

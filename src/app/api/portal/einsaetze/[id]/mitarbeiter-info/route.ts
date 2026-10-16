import { NextResponse, type NextRequest } from 'next/server'

import { mitarbeiterUeberEinsatzInformieren } from '@/lib/einsatz/mitarbeiter-info'
import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Partner-Portal → CRM: nach „Annehmen“ (bzw. Mitarbeiter ändern) den zugeordneten Mitarbeiter informieren.
 * Auth: Bearer-Token des eingeloggten Partners (Inhaber) — nur für eigene Einsätze.
 */
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const verifyToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!verifyToken) return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })
  const { data: auth } = await supabaseAdmin.auth.getUser(verifyToken)
  const userId = auth.user?.id
  if (!userId) return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })
  const { data: hw, error } = await supabaseAdmin.from('handwerker').select('id').eq('auth_user_id', userId).maybeSingle()
  if (error) logDbError('app/api/portal/einsaetze/mitarbeiter-info:handwerker', error)
  if (!hw) return NextResponse.json({ error: 'Kein Partner-Konto.' }, { status: 403 })
  const { data: e } = await supabaseAdmin.from('einsaetze').select('handwerker_id').eq('id', params.id).maybeSingle()
  if (!e || String(e.handwerker_id) !== String(hw.id)) return NextResponse.json({ error: 'Einsatz nicht gefunden.' }, { status: 404 })
  const r = await mitarbeiterUeberEinsatzInformieren(supabaseAdmin, params.id)
  if (!r.ok) return NextResponse.json({ error: r.message }, { status: 400 })
  return NextResponse.json({ ok: true, kanaele: r.kanaele })
}

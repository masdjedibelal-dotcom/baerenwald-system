import 'server-only'

import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { KiEmpfehlungRow, KiHubEmpfehlungenGrouped } from '@/lib/ki-hub/types'

export function groupEmpfehlungen(rows: KiEmpfehlungRow[]): KiHubEmpfehlungenGrouped {
  const kritisch: KiEmpfehlungRow[] = []
  const heute: KiEmpfehlungRow[] = []
  const markt: KiEmpfehlungRow[] = []
  const marketing: KiEmpfehlungRow[] = []
  const beobachten: KiEmpfehlungRow[] = []
  const gelernt: KiEmpfehlungRow[] = []

  for (const row of rows) {
    if (row.umgesetzt) continue
    if (row.bereich === 'markt') {
      markt.push(row)
      continue
    }
    if (row.prioritaet === 'kritisch') {
      kritisch.push(row)
      continue
    }
    if (row.bereich === 'strategie') {
      gelernt.push(row)
      continue
    }
    if (row.bereich === 'marketing') {
      marketing.push(row)
      continue
    }
    if (row.prioritaet === 'info') {
      beobachten.push(row)
      continue
    }
    heute.push(row)
  }

  return { kritisch, heute, markt, marketing, beobachten, gelernt }
}

export async function loadNeuesteEmpfehlungen(limit = 40): Promise<KiEmpfehlungRow[]> {
  const seit = new Date()
  seit.setHours(seit.getHours() - 36)

  const { data, error } = await supabaseAdmin
    .from('ki_empfehlungen')
    .select('*')
    .gte('analyse_lauf', seit.toISOString())
    .order('analyse_lauf', { ascending: false })
    .order('prioritaet', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('loadNeuesteEmpfehlungen', error.message)
    return []
  }
  return (data ?? []) as KiEmpfehlungRow[]
}

export async function loadEmpfehlungenFuerLauf(analyseLauf: string): Promise<KiEmpfehlungRow[]> {
  const { data, error } = await supabaseAdmin
    .from('ki_empfehlungen')
    .select('*')
    .eq('analyse_lauf', analyseLauf)
    .order('prioritaet', { ascending: true })

  if (error) return []
  return (data ?? []) as KiEmpfehlungRow[]
}

export async function markEmpfehlungUmgesetzt(
  empfehlungId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const now = new Date().toISOString()
  const { data: row, error } = await supabase
    .from('ki_empfehlungen')
    .update({ umgesetzt: true, umgesetzt_at: now, gesehen: true })
    .eq('id', empfehlungId)
    .select('id, titel, bereich, content')
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  if (!row) return { ok: false, message: 'Empfehlung nicht gefunden' }

  await supabaseAdmin.from('system_events').insert({
    quelle: 'ki_hub',
    event_typ: 'empfehlung_umgesetzt',
    severity: 'info',
    details: {
      empfehlung_id: empfehlungId,
      titel: row.titel,
      bereich: row.bereich,
      content_typ: (row.content as { typ?: string } | null)?.typ ?? null,
    },
  })

  return { ok: true }
}

export async function loadUmgesetzteEmpfehlungen7d(): Promise<
  Pick<KiEmpfehlungRow, 'titel' | 'bereich' | 'umgesetzt_at'>[]
> {
  const seit = new Date()
  seit.setDate(seit.getDate() - 7)

  const { data } = await supabaseAdmin
    .from('ki_empfehlungen')
    .select('titel, bereich, umgesetzt_at')
    .eq('umgesetzt', true)
    .gte('umgesetzt_at', seit.toISOString())
    .order('umgesetzt_at', { ascending: false })
    .limit(20)

  return (data ?? []) as Pick<KiEmpfehlungRow, 'titel' | 'bereich' | 'umgesetzt_at'>[]
}

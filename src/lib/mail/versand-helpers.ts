import { supabaseAdmin } from '@/lib/supabase-admin'

export function publicBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

/** Öffentlicher Projekt- oder Lead-Status-Link (ohne Login). */
export async function projektOderStatusLink(leadId: string | null | undefined): Promise<string> {
  const base = publicBaseUrl()
  if (!leadId) return base
  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('kunden_token')
    .eq('lead_id', leadId)
    .maybeSingle()
  const t = (auf as { kunden_token?: string | null } | null)?.kunden_token?.trim()
  if (t) return `${base}/projekt/${t}`
  return `${base}/status/${leadId}`
}

export function formatDatumDeFromIso(ymd: string | null | undefined): string {
  if (!ymd?.trim()) return '—'
  const s = ymd.includes('T') ? ymd.slice(0, 10) : ymd
  const [y, m, d] = s.split('-')
  if (!y || !m || !d) return ymd
  return `${d}.${m}.${y}`
}

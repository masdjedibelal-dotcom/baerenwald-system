import 'server-only'

import { fetchGscSummary } from '@/lib/ki-hub/sources/google'
import { fetchPostHogSummary } from '@/lib/ki-hub/sources/posthog'
import { fetchResendSummary } from '@/lib/ki-hub/sources/resend'
import type { KiHubQuelleResult } from '@/lib/ki-hub/types'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type MarketingMetricRow = {
  id: string
  quelle: string
  metrik: string
  wert: Record<string, unknown>
  zeitraum_start: string | null
  zeitraum_end: string | null
  created_at: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

async function persistMetric(
  quelle: string,
  metrik: string,
  wert: Record<string, unknown>,
  status: KiHubQuelleResult<Record<string, unknown>>['status']
): Promise<void> {
  const day = todayIso()
  await supabaseAdmin.from('marketing_metrics').insert({
    quelle,
    metrik,
    wert: { ...wert, sync_status: status },
    zeitraum_start: day,
    zeitraum_end: day,
  })
}

export async function syncMarketingMetrics(): Promise<{
  ok: true
  synced: string[]
  errors: string[]
}> {
  const synced: string[] = []
  const errors: string[] = []

  const [posthog, resend, google] = await Promise.all([
    fetchPostHogSummary(),
    fetchResendSummary(),
    fetchGscSummary(),
  ])

  const entries: Array<{
    quelle: string
    metrik: string
    result: KiHubQuelleResult<Record<string, unknown>>
  }> = [
    { quelle: 'posthog', metrik: 'summary_7d', result: posthog },
    { quelle: 'resend', metrik: 'delivery_summary', result: resend },
    { quelle: 'google', metrik: 'search_console_28d', result: google },
  ]

  for (const entry of entries) {
    try {
      await persistMetric(
        entry.quelle,
        entry.metrik,
        entry.result.data ?? { error: entry.result.error ?? null },
        entry.result.status
      )
      if (entry.result.status === 'ok') synced.push(entry.quelle)
      else errors.push(`${entry.quelle}: ${entry.result.error ?? 'unavailable'}`)
    } catch (e) {
      errors.push(`${entry.quelle}: ${e instanceof Error ? e.message : 'Fehler'}`)
    }
  }

  return { ok: true, synced, errors }
}

export async function loadLatestMarketingMetrics(): Promise<MarketingMetricRow[]> {
  const quellen = ['posthog', 'resend', 'google']
  const rows: MarketingMetricRow[] = []

  for (const quelle of quellen) {
    const { data } = await supabaseAdmin
      .from('marketing_metrics')
      .select('*')
      .eq('quelle', quelle)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) rows.push(data as MarketingMetricRow)
  }

  return rows
}

export function marketingMetricsToQuellen(
  rows: MarketingMetricRow[]
): {
  posthog: KiHubQuelleResult<Record<string, unknown>>
  resend: KiHubQuelleResult<Record<string, unknown>>
  google: KiHubQuelleResult<Record<string, unknown>>
} {
  const byQuelle = new Map(rows.map((r) => [r.quelle, r]))

  function mapRow(quelle: string): KiHubQuelleResult<Record<string, unknown>> {
    const row = byQuelle.get(quelle)
    if (!row) return { status: 'unavailable', error: 'Noch nicht synchronisiert' }
    const status = (row.wert.sync_status as KiHubQuelleResult<Record<string, unknown>>['status']) ?? 'ok'
    if (status !== 'ok') {
      return { status, error: String(row.wert.error ?? 'Fehler'), data: row.wert }
    }
    return { status: 'ok', data: row.wert }
  }

  return {
    posthog: mapRow('posthog'),
    resend: mapRow('resend'),
    google: mapRow('google'),
  }
}

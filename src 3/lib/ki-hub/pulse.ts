import type { FunnelOverviewErgebnis } from '@/lib/ki/types'
import type { KiHubLoadPayload, KiHubPulseCard } from '@/lib/ki-hub/types'

export function buildPulseCards(data: KiHubLoadPayload): KiHubPulseCard[] {
  const funnel = data.supabase.cluster.find((c) => c.bereich === 'funnel')
  const fk = funnel?.ergebnis as FunnelOverviewErgebnis | undefined

  const leadsKritisch = data.supabase.leads_offen.filter((l) => l.stunden_offen >= 48).length
  const anfragenStatus: KiHubPulseCard['status'] =
    leadsKritisch >= 3 ? 'critical' : leadsKritisch >= 1 ? 'warn' : 'ok'

  const netlifyState = data.technik.netlify.data?.state as string | undefined
  const technikStatus: KiHubPulseCard['status'] =
    netlifyState === 'error' ? 'critical' : netlifyState === 'ready' ? 'ok' : 'neutral'

  const posthogOk = data.marketing.posthog.status === 'ok'
  const resendRate = data.marketing.resend.data?.delivery_rate_pct as number | null | undefined
  const gscOk = data.marketing.google.status === 'ok'
  const gscClicks = data.marketing.google.data?.clicks as number | undefined
  const gscImpressions = data.marketing.google.data?.impressions as number | undefined
  const marketingStatus: KiHubPulseCard['status'] =
    posthogOk || gscOk ? 'ok' : 'neutral'

  return [
    {
      id: 'marketing',
      label: 'Marketing',
      status: marketingStatus,
      kpis: [
        {
          label: 'PostHog',
          value:
            posthogOk && data.marketing.posthog.data?.pageviews_7d != null
              ? `${data.marketing.posthog.data.pageviews_7d} Pageviews`
              : posthogOk
                ? '7 Tage aktiv'
                : '—',
        },
        {
          label: 'GSC',
          value: gscOk && gscClicks != null ? `${gscClicks} Klicks` : '—',
        },
        {
          label: 'Resend',
          value: resendRate != null ? `${resendRate}% Zustellung` : '—',
        },
      ],
      hint: posthogOk
        ? gscOk
          ? gscImpressions != null
            ? `${gscImpressions} Impressionen (28d)`
            : null
          : 'GSC: Mit Google verbinden (KI Hub → Marketing)'
        : 'PostHog: Personal API Key (Query Read) in Netlify setzen',
    },
    {
      id: 'anfragen',
      label: 'Anfragen',
      status: anfragenStatus,
      kpis: [
        { label: 'Offen', value: String(data.supabase.leads_offen.length) },
        { label: '>48h', value: String(leadsKritisch) },
        {
          label: '30 Tage',
          value: String(data.supabase.leads_30d_count),
        },
      ],
      hint:
        leadsKritisch > 0
          ? `${leadsKritisch} Anfrage${leadsKritisch > 1 ? 'n' : ''} warten auf Antwort`
          : null,
    },
    {
      id: 'auftraege',
      label: 'Aufträge',
      status: 'ok',
      kpis: [
        { label: 'Aktiv', value: String(data.supabase.auftraege_aktiv_count) },
        {
          label: 'Conversion',
          value:
            fk?.kennzahlen?.conversion_anfrage_zu_angebot != null
              ? `${fk.kennzahlen.conversion_anfrage_zu_angebot}%`
              : '—',
        },
      ],
      hint: null,
    },
    {
      id: 'handwerker',
      label: 'Handwerker',
      status: 'ok',
      kpis: [
        { label: 'Aktiv', value: String(data.supabase.handwerker_aktiv_count) },
        { label: 'Offen HW', value: '—' },
      ],
      hint: null,
    },
    {
      id: 'technik',
      label: 'Technik',
      status: technikStatus,
      kpis: [
        {
          label: 'Netlify',
          value: netlifyState ?? '—',
        },
        {
          label: 'Events 24h',
          value: String(data.supabase.system_events_24h.length),
        },
      ],
      hint: netlifyState === 'error' ? 'Deploy prüfen' : null,
    },
    {
      id: 'strategie',
      label: 'Strategie',
      status: data.supabase.cluster.length > 0 ? 'ok' : 'warn',
      kpis: [
        {
          label: 'Cluster',
          value: `${data.supabase.cluster.length}/11`,
        },
        {
          label: 'Umgesetzt 7d',
          value: String(data.umgesetzt_7d.length),
        },
      ],
      hint:
        data.supabase.cluster.length === 0
          ? 'Zuerst Cluster-Analysen aktualisieren'
          : null,
    },
  ]
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { MockCard } from '@/components/mock-ui/MockCard'
import { MockEmpty } from '@/components/mock-ui'
import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role'
import { logDbError } from '@/lib/errors/log-db-error'
import { formatDatum } from '@/lib/format/geld-datum'
import { istTeo } from '@/lib/marke'

export const metadata: Metadata = { title: 'Genannte Verwaltungen' }
export const dynamic = 'force-dynamic'

type Zeile = { id: string; created_at: string; kontakt_name: string | null; plz: string | null; funnel_daten: unknown }

/** Servus TEO: Verwaltungen, die Mieter oder Wohnungseigentümer im Website-Formular genannt haben — Akquise-Liste. */
export default async function GenannteVerwaltungenPage() {
  if (!istTeo) notFound()
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) notFound()
  const { data, error } = await gate.db
    .from('leads')
    .select('id, created_at, kontakt_name, plz, funnel_daten')
    .not('funnel_daten->bewohner->>verwaltung', 'is', null)
    .is('geloescht_am', null)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) logDbError('app/kunden/genannte-verwaltungen:leads', error)

  const gruppen = new Map<string, { name: string; anzahl: number; zuletzt: string; plz: Set<string>; leads: { id: string; wer: string; datum: string }[] }>()
  for (const r of (data ?? []) as Zeile[]) {
    const fd = (r.funnel_daten ?? {}) as { bewohner?: { verwaltung?: string | null; rolle?: string | null } }
    const name = fd.bewohner?.verwaltung?.trim()
    if (!name) continue
    const key = name.toLowerCase().replace(/\s+/g, ' ')
    const g = gruppen.get(key) ?? { name, anzahl: 0, zuletzt: r.created_at, plz: new Set<string>(), leads: [] }
    g.anzahl += 1
    if (r.plz) g.plz.add(r.plz)
    g.leads.push({ id: r.id, wer: [r.kontakt_name, fd.bewohner?.rolle === 'eigentuemer' ? 'Eigentümer' : 'Mieter'].filter(Boolean).join(' · '), datum: r.created_at })
    gruppen.set(key, g)
  }
  const liste = [...gruppen.values()].sort((a, b) => b.anzahl - a.anzahl || b.zuletzt.localeCompare(a.zuletzt))

  return (
    <div>
      <div className="dh-title" style={{ marginBottom: 16 }}>
        Genannte Verwaltungen
      </div>
      {liste.length === 0 ? (
        <MockEmpty icon="building" title="Noch keine genannt" hint="Erscheint, sobald Mieter oder Eigentümer im Website-Formular ihre Verwaltung angeben." />
      ) : (
        <div className="flex flex-col gap-3">
          {liste.map((g) => (
            <MockCard key={g.name} title={g.name}>
              <p className="m-0 mb-2 text-[length:var(--fs-meta)] text-muted">
                {g.anzahl === 1 ? '1 Meldung' : `${g.anzahl} Meldungen`}
                {g.plz.size ? ` · PLZ ${[...g.plz].join(', ')}` : ''} · zuletzt {formatDatum(g.zuletzt)}
              </p>
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {g.leads.map((l) => (
                  <li key={l.id}>
                    <Link className="link" href={`/anfragen/${l.id}`}>
                      {formatDatum(l.datum)} · {l.wer || 'Meldung'}
                    </Link>
                  </li>
                ))}
              </ul>
            </MockCard>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useTransition } from 'react'
import { FileDown } from 'lucide-react'
import { createNachtragEntwurfFromRegiebericht } from '@/app/(dashboard)/auftraege/actions'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { AuftragDetail, FormularEintrag } from '@/lib/types'
import { formatDatum } from '@/lib/utils'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { AuftragNachtragBaustoppSection } from '@/components/auftraege/AuftragNachtragBaustoppSection'

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

function bySubtyp(eintraege: FormularEintrag[], s: string) {
  return eintraege.filter(
    (e) => e.submitted_at && (e.formular_templates?.subtyp ?? '') === s
  )
}

function computeRegieBrutto(e: FormularEintrag): { stunden: number; brutto: number } {
  const daten = (e.daten ?? {}) as Record<string, unknown>
  const st = e.gesamtstunden != null ? Number(e.gesamtstunden) : num(daten.stunden_gesamt)
  const satz = num(daten.stundensatz)
  const lohn = st * satz
  const matDb = e.material_kosten != null ? Number(e.material_kosten) : null
  const mat = matDb != null && !Number.isNaN(matDb) ? matDb : num(daten.material_kosten)
  return { stunden: st, brutto: (lohn + mat) * 1.19 }
}

export function AuftragDokumentationPanel({
  detail,
  onChanged,
}: {
  detail: AuftragDetail
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const submitted = (detail.formular_eintraege ?? []).filter((e) => e.submitted_at) as FormularEintrag[]

  const bau = bySubtyp(submitted, 'bautagebuch').sort(
    (a, b) => (b.submitted_at ?? '').localeCompare(a.submitted_at ?? '')
  )
  const regie = bySubtyp(submitted, 'regiebericht').sort(
    (a, b) => (b.submitted_at ?? '').localeCompare(a.submitted_at ?? '')
  )
  const behind = bySubtyp(submitted, 'behinderung')
  const pruef = bySubtyp(submitted, 'pruefprotokoll')

  let regieStd = 0
  let regieBruttoSumme = 0
  for (const e of regie) {
    const r = computeRegieBrutto(e)
    regieStd += r.stunden
    regieBruttoSumme += r.brutto
  }

  let verzugSum = 0
  for (const e of behind) {
    const d = (e.daten ?? {}) as Record<string, unknown>
    verzugSum += Math.round(num(d.geschaetzter_verzug))
  }

  const pos = normalizeAngebotPositionen(detail.angebote?.positionen ?? [])
  const hatElektro = pos.some((p) => /elektro|elektrik|vde/i.test(p.gewerk_name))
  const hatElektroPruef = pruef.some((e) =>
    /elektro|vde/i.test(e.formular_templates?.name ?? '')
  )

  return (
    <div id="dokumentation" className="space-y-8 scroll-mt-24">
      <AuftragNachtragBaustoppSection detail={detail} onChanged={onChanged} />

      {hatElektro && !hatElektroPruef ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Kein Prüfprotokoll für Elektro vorhanden (laut Auftragspositionen).
        </p>
      ) : null}

      <section>
        <h2 className="mb-2 text-lg font-semibold text-ink">Bautagebuch</h2>
        <div className="space-y-2">
          {bau.slice(0, 3).map((e) => {
            const d = (e.daten ?? {}) as Record<string, unknown>
            return (
              <Card key={e.id} className="p-3 text-sm">
                <p className="font-medium text-ink">{formatDatum(str(d.datum))}</p>
                <p className="text-muted">{str(d.ausgefuehrte_arbeiten).slice(0, 160)}</p>
                <p className="text-xs text-muted">
                  {e.handwerker?.name ?? '—'} · {num(d.arbeitsstunden)} h
                </p>
              </Card>
            )
          })}
          {bau.length === 0 ? <p className="text-sm text-muted">Keine Einträge.</p> : null}
        </div>
        <p className="mt-2 text-xs text-muted">
          Weitere Einträge im Tab „Formulare“. Neuen Link über „Formular senden“ beim jeweiligen Gewerk.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-ink">Regieberichte</h2>
        <div className="space-y-2">
          {regie.map((e) => {
            const d = (e.daten ?? {}) as Record<string, unknown>
            const r = computeRegieBrutto(e)
            return (
              <Card key={e.id} className="flex flex-col gap-2 p-3 text-sm md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-ink">{formatDatum(str(d.datum))}</p>
                  <p className="text-muted">
                    {num(d['stunden_gesamt'])} h · {r.brutto.toFixed(2)} € brutto
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/api/auftraege/${detail.id}/regiebericht/${e.id}`}
                    className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium text-primary"
                  >
                    <FileDown className="h-4 w-4" aria-hidden />
                    PDF
                  </a>
                  <Button
                    type="button"
                    variant="secondary"
                    loading={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const res = await createNachtragEntwurfFromRegiebericht(detail.id, e.id)
                        if (res.ok) onChanged()
                        else alert(res.message)
                      })
                    }}
                  >
                    Als Nachtrag übernehmen
                  </Button>
                </div>
              </Card>
            )
          })}
          {regie.length === 0 ? <p className="text-sm text-muted">Keine Regieberichte.</p> : null}
        </div>
        <p className="mt-2 text-sm font-medium text-ink">
          Gesamt Zusatzstunden: {regieStd.toFixed(2)} h · Gesamt Zusatzkosten (brutto): {regieBruttoSumme.toFixed(2)} €
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-ink">Behinderungsanzeigen</h2>
        {behind.length === 0 ? (
          <p className="text-sm text-muted">Keine Anzeigen.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {behind.map((e) => {
              const d = (e.daten ?? {}) as Record<string, unknown>
              return (
                <li key={e.id} className="rounded-lg border border-border p-3">
                  <p className="font-medium">{formatDatum(str(d.datum))}</p>
                  <p className="text-muted">Grund: {str(d.grund)}</p>
                  <p className="text-muted">Verzug: ca. {Math.round(num(d.geschaetzter_verzug))} AT</p>
                </li>
              )
            })}
            <p className="font-medium">Gesamtverzug (Summe): {verzugSum} Arbeitstage</p>
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-ink">Prüfprotokolle</h2>
        {pruef.length === 0 ? (
          <p className="text-sm text-muted">Keine Prüfprotokolle.</p>
        ) : (
          <ul className="space-y-2">
            {pruef.map((e) => {
              const d = (e.daten ?? {}) as Record<string, unknown>
              const ergebnis = str(d.ergebnis)
              const ok = !ergebnis.toLowerCase().includes('nicht bestanden')
              return (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium">{e.gewerke?.name ?? e.formular_templates?.name ?? '—'}</p>
                    <p className="text-muted">
                      {formatDatum(str(d.datum_pruefung))} · {str(d.pruefer)}
                    </p>
                  </div>
                  <span
                    className={
                      ok ? 'rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-900' : 'rounded-full bg-red-100 px-2 py-1 text-xs text-red-900'
                    }
                  >
                    {ergebnis || '—'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}


'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ClipboardList } from 'lucide-react'
import { FormularFelderRenderer } from '@/components/formulare/FormularFelderRenderer'
import { Card } from '@/components/ui/Card'
import type { FormularFeld, VorabFormular } from '@/lib/types'
import {
  BEREICH_LABELS,
  FORMULAR_PHASE_LABELS,
  formatDatum,
  formatDatumZeit,
  formatPreis,
} from '@/lib/utils'
import { isVorOrtStruktur, type VorOrtFormDaten } from '@/lib/vorab-angebot-from-vorab'
import {
  FACHDETAILS_CONFIG,
  bereichMeta,
  fachdetailKeysForBereich,
  situationLabel,
} from '@/lib/vorab-formular-config'

function parseFelder(raw: unknown): FormularFeld[] {
  if (!Array.isArray(raw)) return []
  return raw as FormularFeld[]
}

function vorOrtBesuchDatum(v: VorabFormular, daten: VorOrtFormDaten): string {
  const raw = daten.abgeschlossen_am ?? v.updated_at ?? v.created_at
  return formatDatum(raw)
}

function fachdetailLabel(blockKey: string, value: string): string {
  const cfg = FACHDETAILS_CONFIG[blockKey]
  const o = cfg?.optionen.find((x) => x.value === value)
  return o?.label ?? value
}

function logistikHighlights(d: VorOrtFormDaten): string[] {
  const L = d.logistik
  const parts: string[] = []
  if (L.etage !== '' && L.etage != null) {
    parts.push(`${Number(L.etage)}. OG`)
    if (!L.aufzug && Number(L.etage) > 0) parts.push('kein Aufzug')
  }
  if (L.halteverbot) parts.push('Halteverbot nötig')
  if (L.schluesseluebergabe) parts.push('Schlüssel-Übergabe')
  return parts
}

function komplexitaetLabel(k: string): string {
  if (k === 'erhoeht') return 'Erhöht'
  if (k === 'komplex') return 'Komplex'
  return 'Standard'
}

export function LeadVorOrtAufnahmeSection({
  leadId,
  vorabFormulare,
}: {
  leadId: string
  vorabFormulare: VorabFormular[] | null | undefined
}) {
  const rows = vorabFormulare ?? []
  const strukturRow = rows.find((v) => isVorOrtStruktur(v.daten))

  return (
    <section aria-label="Vor-Ort Aufnahme">
      <h2 className="mb-3 text-base font-semibold text-ink">Vor-Ort Aufnahme</h2>
      {!strukturRow ? (
        <div className="rounded-lg border border-dashed border-border bg-canvas/80 p-6 text-center">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-muted" aria-hidden />
          <p className="text-sm text-muted">Noch keine Vor-Ort-Aufnahme</p>
          <Link
            href={`/anfragen/${leadId}/vorab`}
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white"
          >
            Jetzt aufnehmen
          </Link>
        </div>
      ) : (
        (() => {
          const daten = strukturRow.daten as VorOrtFormDaten
          const sit = daten.projekt.situation ? situationLabel(daten.projekt.situation) : '—'
          const bereicheTxt = daten.projekt.bereiche
            .map((b) => bereichMeta(b)?.label ?? BEREICH_LABELS[b] ?? b)
            .join(', ')
          const kalkAbw =
            daten.kalkulation.kalk_min !== '' &&
            daten.kalkulation.kalk_max !== '' &&
            !Number.isNaN(Number(daten.kalkulation.kalk_min)) &&
            !Number.isNaN(Number(daten.kalkulation.kalk_max))
          const logistik = logistikHighlights(daten)
          return (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="font-semibold text-emerald-900">✓ Vor-Ort Aufnahme</p>
                <p className="text-xs text-emerald-800">
                  Besuch / Stand: {vorOrtBesuchDatum(strukturRow, daten)}
                </p>
              </div>
              <div className="space-y-3 p-4 text-sm text-ink">
                <div>
                  <span className="text-muted">Situation: </span>
                  {sit}
                </div>
                <div>
                  <span className="text-muted">Bereiche: </span>
                  {bereicheTxt || '—'}
                </div>
                <div>
                  <span className="text-muted">Fachdetails: </span>
                  <ul className="mt-1 list-inside list-disc text-ink">
                    {daten.projekt.bereiche.flatMap((bereich) => {
                      const situation = daten.projekt.situation
                      const blockKeys = fachdetailKeysForBereich(bereich, situation)
                      const items: ReactNode[] = []
                      for (const blockKey of blockKeys) {
                        const storageKey = blockKey === 'elektro_kaputt' ? 'elektrik' : blockKey
                        const val = daten.fachdetails[storageKey]
                        if (!val) continue
                        items.push(
                          <li key={`${bereich}-${blockKey}`}>
                            {bereichMeta(bereich)?.label ?? bereich}: {fachdetailLabel(blockKey, val)}
                          </li>
                        )
                      }
                      return items
                    })}
                  </ul>
                </div>
                <div>
                  <span className="text-muted">Größen: </span>
                  <ul className="mt-1 list-inside list-disc">
                    {daten.projekt.bereiche.map((b) => {
                      const g = daten.groessen[b]
                      if (g === '' || g == null) return null
                      return (
                        <li key={b}>
                          {bereichMeta(b)?.label ?? b}: {String(g)}
                        </li>
                      )
                    })}
                  </ul>
                </div>
                {kalkAbw ? (
                  <div>
                    <span className="text-muted">Angepasste Kalkulation: </span>
                    {formatPreis(undefined, Number(daten.kalkulation.kalk_min), Number(daten.kalkulation.kalk_max))}
                  </div>
                ) : null}
                {logistik.length > 0 ? (
                  <div>
                    <span className="text-muted">Logistik: </span>
                    {logistik.join(' · ')}
                  </div>
                ) : null}
                <p>
                  <span className="rounded-full bg-canvas px-2 py-1 text-xs font-medium text-ink">
                    Komplexität: {komplexitaetLabel(daten.kalkulation.komplexitaet || 'standard')}
                  </span>
                </p>
                <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                  <Link
                    href={`/anfragen/${leadId}/vorab`}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink"
                  >
                    Bearbeiten
                  </Link>
                </div>
              </div>
            </Card>
          )
        })()
      )}
      {rows.some((v) => !isVorOrtStruktur(v.daten)) ? (
        <div className="mt-4 space-y-4">
          <h3 className="text-sm font-semibold text-muted">Weitere Vorab-Formulare (Legacy)</h3>
          {rows
            .filter((v) => !isVorOrtStruktur(v.daten))
            .map((v) => {
              const tpl = v.formular_templates
              const felder = tpl?.felder ? parseFelder(tpl.felder as unknown) : []
              const daten = (v.daten ?? {}) as Record<string, unknown>
              return (
                <Card key={v.id} className="p-4">
                  <p className="text-sm font-medium text-ink">{tpl?.name ?? 'Formular'}</p>
                  <p className="text-xs text-muted">
                    {tpl?.phase ? (FORMULAR_PHASE_LABELS[tpl.phase] ?? tpl.phase) : null}
                    {v.created_at ? ` · ${formatDatumZeit(v.created_at)}` : null}
                  </p>
                  {felder.length > 0 ? (
                    <div className="mt-4">
                      <FormularFelderRenderer felder={felder} daten={daten} readonly />
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted">Keine Felddefinition.</p>
                  )}
                </Card>
              )
            })}
        </div>
      ) : null}
    </section>
  )
}

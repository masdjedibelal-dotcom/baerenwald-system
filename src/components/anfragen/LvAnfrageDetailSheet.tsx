'use client'

import { useMemo } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { HwKonditionenPruefungTable } from '@/components/angebote/HwKonditionenPruefungTable'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { AnfragePartnerEinholungRow } from '@/app/(dashboard)/anfragen/anfrage-handwerker-anfragen-actions'
import { getHandwerkerEinreichungPdfUrl } from '@/app/(dashboard)/angebote/actions'
import { toast } from '@/components/ui/app-toast'
import { hasHwEinreichung, hwStatusLabel } from '@/lib/partner/handwerker-einreichung'
import { parseHwKonditionen } from '@/lib/partner/hw-konditionen'
import { parsePartnerLvZeilen } from '@/lib/angebote/partner-lv'
import { parseHwAnhangStoragePaths } from '@/lib/partner/partner-hw-dokument-typen'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import type { StatusTone } from '@/lib/status/status-tone'

function statusForBadge(z: AnfragePartnerEinholungRow): {
  status: string
  label: string
  tone?: StatusTone
} {
  if (hasHwEinreichung(z)) {
    const hw = (z.hw_status ?? 'eingereicht').toLowerCase()
    const toneByHw: Record<string, StatusTone> = {
      eingereicht: 'blau',
      bestaetigt: 'blau',
      uebernommen: 'gruen',
      abgelehnt: 'rot',
      rueckfrage: 'blau',
      offen: 'grau',
    }
    return {
      status: hw,
      label: hwStatusLabel(z.hw_status) || 'Eingereicht',
      tone: toneByHw[hw] ?? 'grau',
    }
  }
  const st = (z.status ?? 'ausstehend').toLowerCase()
  if (st === 'ausstehend') return { status: 'offen', label: 'Ausstehend' }
  if (st === 'angefragt') return { status: 'angefragt', label: 'Angefragt' }
  return { status: st, label: st }
}

export function LvAnfrageDetailSheet({
  row,
  open,
  onClose,
}: {
  row: AnfragePartnerEinholungRow | null
  open: boolean
  onClose: () => void
}) {
  const z = row
  const badge = z ? statusForBadge(z) : null
  const name =
    (z?.handwerker as { firma?: string | null } | null)?.firma?.trim() ||
    z?.handwerker?.name?.trim() ||
    'Handwerker'

  const vorgabe = useMemo(() => {
    if (!z?.angebot_positionen) return []
    return normalizeAngebotPositionen(z.angebot_positionen)
  }, [z?.angebot_positionen])

  const antwort = useMemo(
    () => (z ? parsePartnerLvZeilen(z.hw_konditionen) : []),
    [z]
  )
  const konditionen = z ? parseHwKonditionen(z.hw_konditionen) : null
  const eingereicht = z ? hasHwEinreichung(z) : false
  const unterlagePaths = z
    ? parseHwAnhangStoragePaths(z.hw_angebot_anhang_urls, z.hw_angebot_pdf_url)
    : []

  async function openPdf(index: number) {
    if (!z) return
    const res = await getHandwerkerEinreichungPdfUrl(z.id, 'angebot', index)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    window.open(res.url, '_blank', 'noopener,noreferrer')
  }

  if (!z) return null

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={name}
      subtitle={z.gewerke?.name ?? undefined}
      size="lg"
      headerEnd={<StatusBadge status={badge!.status} label={badge!.label} tone={badge!.tone} />}
    >
      <div className="space-y-5">
        {z.aufgabe_notiz?.trim() ? (
          <section>
            <h3 className="m-0 mb-2 text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-[var(--text-3)]">
              Notiz an Partner
            </h3>
            <p className="m-0 whitespace-pre-wrap text-[length:var(--fs-text)] text-[var(--text)]">
              {z.aufgabe_notiz.trim()}
            </p>
          </section>
        ) : null}

        <section>
          <h3 className="m-0 mb-2 text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-[var(--text-3)]">
            LV-Vorgabe
          </h3>
          {vorgabe.length ? (
            <ul className="m-0 list-none space-y-2 p-0">
              {vorgabe.map((p) => (
                <li
                  key={p.id}
                  className="rounded-lg border border-[var(--border)] px-3 py-2.5"
                >
                  <div className="font-semibold text-[var(--text)]">
                    {p.leistung?.trim() || p.leistung_name?.trim() || 'Position'}
                  </div>
                  <div className="mt-0.5 text-[length:var(--fs-meta)] text-[var(--text-3)]">
                    {[p.gewerk_name?.trim(), `${p.menge ?? 1} ${p.einheit ?? 'Stk.'}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-[length:var(--fs-meta)] text-[var(--text-3)]">
              Keine Positionen in der Vorgabe — Partner legt LV frei an.
            </p>
          )}
        </section>

        <section>
          <h3 className="m-0 mb-2 text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-[var(--text-3)]">
            Partner-Antwort
          </h3>
          {!eingereicht ? (
            <p className="m-0 text-[length:var(--fs-meta)] text-[var(--text-3)]">
              Noch keine Einreichung — der Partner kann Menge und Preis je Position anpassen.
            </p>
          ) : konditionen ? (
            <div className="space-y-3">
              <HwKonditionenPruefungTable z={z} />
              {antwort.length ? (
                <ul className="m-0 list-none space-y-2 p-0">
                  {antwort.map((p, i) => (
                    <li
                      key={`${p.leistung}-${i}`}
                      className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-[var(--text)]">{p.leistung}</div>
                        <div className="mt-0.5 text-[length:var(--fs-meta)] text-[var(--text-3)]">
                          {[p.gewerkName, `${p.menge} ${p.einheit}`].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-[length:var(--fs-text)] font-semibold tabular-nums">
                        {formatEurBetrag(p.einzelpreisNetto * p.menge)}
                        <div className="text-[length:var(--fs-meta)] font-normal text-[var(--text-3)]">
                          {formatEurBetrag(p.einzelpreisNetto)} / {p.einheit}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className="m-0 text-[length:var(--fs-meta)] text-[var(--text-3)]">
              Einreichung ohne auslesbare Positionen — ggf. nur PDF.
            </p>
          )}
        </section>

        {unterlagePaths.length ? (
          <section>
            <h3 className="m-0 mb-2 text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-[var(--text-3)]">
              Unterlagen
            </h3>
            <div className="flex flex-wrap gap-2">
              {unterlagePaths.map((_, i) => (
                <MockBtn key={i} sm kind="secondary" onClick={() => void openPdf(i)}>
                  PDF {unterlagePaths.length > 1 ? i + 1 : ''} öffnen
                </MockBtn>
              ))}
            </div>
          </section>
        ) : null}

        {z.hw_preis_brutto != null && Number(z.hw_preis_brutto) > 0 ? (
          <p className="m-0 text-[length:var(--fs-meta)] text-[var(--text-3)]">
            Summe brutto:{' '}
            <strong className="text-[var(--text)]">
              {formatEurBetrag(Number(z.hw_preis_brutto))}
            </strong>
          </p>
        ) : null}
      </div>
    </EditorSheet>
  )
}

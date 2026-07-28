'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DetailProp } from '@/components/ui/detail-prop'
import { formatDatum } from '@/lib/utils'
import type { LeistungDrawerAction, LeistungRow } from '@/components/leistungen/types'

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="ldr-sec">
      <div className="ldr-sec-h">{title}</div>
      {children}
    </section>
  )
}

/**
 * Leistungs-Drawer (EditorSheet): Lese-Abschnitte Position · Zuweisung · Dokumentation · Abnahme.
 * Aktionen ausschließlich als Footer-CTAs — keine Eingabefelder zwischen den Zeilen.
 */
export function LeistungDrawer({
  open,
  onClose,
  row,
  actions = [],
  secondaryHint,
}: {
  open: boolean
  onClose: () => void
  row: LeistungRow | null
  actions?: LeistungDrawerAction[]
  /** Hinweis unter Primärabschnitten (z. B. Dokument öffnen) */
  secondaryHint?: string | null
}) {
  const [showSecondary, setShowSecondary] = useState(false)

  if (!row) {
    return (
      <EditorSheet open={open} onClose={onClose} title="Leistung" size="lg">
        <p className="text-[length:var(--fs-text)] text-[var(--text-3)]">Keine Leistung ausgewählt.</p>
      </EditorSheet>
    )
  }

  const hasDoku = (row.dokumentationEintraege?.length ?? 0) > 0
  const hasZuweisung = Boolean(row.handwerkerName || row.zeitraumLabel || row.ekLabel)
  const hasAbnahme = Boolean(row.abnahmeLabel)

  const footer =
    actions.length > 0 ? (
      <div className="ldr-cta">
        {actions.map((a) => (
          <Button
            key={a.id}
            type="button"
            variant={a.variant ?? 'secondary'}
            disabled={a.disabled}
            onClick={a.onClick}
          >
            <span>{a.label}</span>
          </Button>
        ))}
      </div>
    ) : null

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={row.bezeichnung}
      size="lg"
      footer={footer}
    >
      <Section title="Position">
        <div className="props">
          <DetailProp label="Bezeichnung">{row.bezeichnung}</DetailProp>
          {row.beschreibung ? (
            <DetailProp label="Beschreibung">
              <span className="whitespace-pre-wrap">{row.beschreibung}</span>
            </DetailProp>
          ) : null}
          {row.gewerkName ? <DetailProp label="Gewerk">{row.gewerkName}</DetailProp> : null}
          <DetailProp label="Menge">{row.mengeLabel}</DetailProp>
          <DetailProp label="Preis">{row.preisLabel}</DetailProp>
          <DetailProp label="Status">
            <StatusBadge status={row.status} label={row.statusLabel} />
          </DetailProp>
        </div>
      </Section>

      <Section title="Zuweisung">
        {hasZuweisung ? (
          <div className="props">
            <DetailProp label="Handwerker">{row.handwerkerName ?? '—'}</DetailProp>
            {row.zeitraumLabel ? (
              <DetailProp label="Zeitraum">{row.zeitraumLabel}</DetailProp>
            ) : null}
            {row.ekLabel ? <DetailProp label="EK netto">{row.ekLabel}</DetailProp> : null}
          </div>
        ) : (
          <div className="ldr-empty">Noch kein Handwerker zugewiesen.</div>
        )}
      </Section>

      <button
        type="button"
        className="ldr-more"
        onClick={() => setShowSecondary((v) => !v)}
      >
        {showSecondary ? 'Weniger anzeigen' : 'Alles anzeigen'}
        {showSecondary ? (
          <ChevronUp className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        )}
      </button>

      {showSecondary ? (
        <>
          <Section title="Dokumentation">
            {hasDoku ? (
              <ul className="ldr-doku-list">
                {row.dokumentationEintraege!.map((e, i) => (
                  <li key={`${e.at ?? i}-${i}`}>
                    {e.at ? (
                      <span className="ldr-doku-at">{formatDatum(e.at.slice(0, 10))}</span>
                    ) : null}
                    <span>{e.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="ldr-empty">Noch keine Dokumentation.</div>
            )}
            {secondaryHint ? <p className="ldr-note">{secondaryHint}</p> : null}
          </Section>

          <Section title="Abnahme">
            {hasAbnahme ? (
              <div className="props">
                <DetailProp label="Stand">{row.abnahmeLabel}</DetailProp>
              </div>
            ) : (
              <div className="ldr-empty">Noch keine Abnahme-Angaben.</div>
            )}
          </Section>
        </>
      ) : null}
    </EditorSheet>
  )
}

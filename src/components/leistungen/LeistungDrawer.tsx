'use client'

import type { ReactNode } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DetailProp } from '@/components/ui/detail-prop'
import { formatDatum } from '@/lib/utils'
import type { LeistungDrawerAction, LeistungRow } from '@/components/leistungen/types'

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: string
  children: ReactNode
}) {
  return (
    <section className="ldr-sec">
      <div className="ldr-sec-h">
        <MockIcon ctx="empty" n={icon} size={14} />
        {title}
      </div>
      {children}
    </section>
  )
}

/**
 * Leistungs-Drawer (EditorSheet rechts): Position · Zuweisung · Dokumentation · Abnahme.
 * Aktionen ausschließlich als Footer-CTAs.
 */
export function LeistungDrawer({
  open,
  onClose,
  row,
  actions = [],
}: {
  open: boolean
  onClose: () => void
  row: LeistungRow | null
  actions?: LeistungDrawerAction[]
  /** @deprecated */
  secondaryHint?: string | null
}) {
  if (!row) {
    return (
      <EditorSheet open={open} onClose={onClose} title="Leistung" size="lg">
        <p className="text-[length:var(--fs-text)] text-[var(--text-3)]">Keine Leistung ausgewählt.</p>
      </EditorSheet>
    )
  }

  const hasDoku = (row.dokumentationEintraege?.length ?? 0) > 0
  const abgenommen =
    row.status === 'erledigt' ||
    row.status === 'abgenommen' ||
    (row.abnahmeLabel ?? '').toLowerCase().includes('abgenommen')

  const footer =
    actions.length > 0 ? (
      <div className="ldr-cta">
        {actions.map((a) => (
          <Button
            key={a.id}
            type="button"
            variant={a.variant ?? 'secondary'}
            disabled={a.disabled}
            onClick={() => {
              onClose()
              a.onClick()
            }}
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
      crumb={row.gewerkName ? `${row.gewerkName} >` : null}
      size="lg"
      footer={footer}
    >
      <Section title="Position" icon="file-text">
        <div className="props">
          {row.gewerkName ? <DetailProp label="Gewerk">{row.gewerkName}</DetailProp> : null}
          <DetailProp label="Menge">{row.mengeLabel}</DetailProp>
          <DetailProp label="Einzelpreis">
            {row.einzelpreisLabel ?? row.preisLabel}
          </DetailProp>
          <DetailProp label="Gesamt">
            <span className="ldr-gesamt">{row.preisLabel}</span>
          </DetailProp>
        </div>
      </Section>

      <Section title="Zuweisung" icon="link">
        <div className="props">
          <DetailProp label="Ausführung">{row.handwerkerName ?? '—'}</DetailProp>
          {row.anfrageStatusLabel ? (
            <DetailProp label="Anfrage">
              <StatusBadge status="gesendet" label={row.anfrageStatusLabel} />
            </DetailProp>
          ) : null}
          {row.zeitraumLabel ? (
            <DetailProp label="Zeitraum">{row.zeitraumLabel}</DetailProp>
          ) : null}
        </div>
      </Section>

      <Section title="Dokumentation" icon="clipboard-list">
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
          <div className="ldr-empty">
            Noch keine Einträge — hier wird der Fortschritt festgehalten.
          </div>
        )}
      </Section>

      <Section title="Abnahme" icon="checks">
        <div className="ldr-empty" style={abgenommen ? { borderStyle: 'solid' } : undefined}>
          {abgenommen
            ? row.abnahmeLabel || 'Abgenommen'
            : row.abnahmeLabel ||
              'Noch nicht abgenommen — Ergebnis und Notiz fließen ins Abnahmedokument.'}
        </div>
      </Section>
    </EditorSheet>
  )
}

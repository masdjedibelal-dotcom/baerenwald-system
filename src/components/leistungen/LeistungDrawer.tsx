'use client'

import type { ReactNode } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DetailProp } from '@/components/ui/detail-prop'
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
 * Leistungs-Drawer: Position · Zuweisung.
 * Aktionen (z. B. Zuweisung ändern) als Icon rechts oben — kein Footer-CTA.
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
  const headerEnd =
    actions.length > 0 ? (
      <div className="flex items-center gap-0.5">
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            className="editor-sheet__icon-btn"
            disabled={a.disabled}
            aria-label={a.label}
            title={a.label}
            onClick={() => {
              onClose()
              a.onClick()
            }}
          >
            <MockIcon ctx="default" n={a.icon ?? 'user'} size={20} />
          </button>
        ))}
      </div>
    ) : undefined

  if (!row) {
    return (
      <EditorSheet open={open} onClose={onClose} title="Leistung" size="lg">
        <p className="text-[length:var(--fs-text)] text-[var(--text-3)]">Keine Leistung ausgewählt.</p>
      </EditorSheet>
    )
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={row.bezeichnung}
      crumb={row.gewerkName ? `${row.gewerkName} >` : null}
      size="lg"
      headerEnd={headerEnd}
    >
      <Section title="Position" icon="file-text">
        <div className="props">
          {row.gewerkName ? <DetailProp label="Gewerk">{row.gewerkName}</DetailProp> : null}
          {row.istRegie ? (
            <DetailProp label="Vergütung">nach Aufwand — Final über Bautagebuch</DetailProp>
          ) : null}
          <DetailProp label={row.istRegie ? 'Schätzung' : 'Menge'}>{row.mengeLabel}</DetailProp>
          <DetailProp label={row.istRegie ? 'Stundensatz' : 'Einzelpreis'}>
            {row.einzelpreisLabel ?? row.preisLabel}
          </DetailProp>
          <DetailProp label="Gesamt">
            <span className="ldr-gesamt">{row.preisLabel}</span>
          </DetailProp>
          {row.istRegie ? (
            <p className="mt-2 text-[length:var(--fs-meta)] text-bw-text-muted">
              Handwerker muss Start-/Ende-Fotos, Stunden sowie Titel und Beschreibung im Portal
              führen (Pflicht).
            </p>
          ) : null}
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

      {row.istRegie || (row.handwerkerUpdates && row.handwerkerUpdates.length > 0) ? (
        <Section title="Handwerker-Updates" icon="camera">
          {row.regieSollIstLabel ? (
            <p className="mb-2 text-[length:var(--fs-meta)] text-bw-text-muted">
              {row.regieSollIstLabel}
              {row.istRegie
                ? ' — Grundlage für die Rechnung (nach Prüfung).'
                : null}
            </p>
          ) : row.istRegie ? (
            <p className="mb-2 text-[length:var(--fs-meta)] text-bw-text-muted">
              Noch keine Zeiten aus dem Bautagebuch — Rechnung nutzt die Schätzung, bis Updates
              vorliegen.
            </p>
          ) : null}
          {(row.handwerkerUpdates ?? []).length === 0 ? (
            <p className="text-[length:var(--fs-meta)] text-bw-text-muted">Keine Einträge.</p>
          ) : (
            <ul className="space-y-2">
              {(row.handwerkerUpdates ?? []).map((u, i) => (
                <li
                  key={`${u.at ?? i}-${i}`}
                  className="rounded-md border border-bw-border bg-bw-card px-3 py-2 text-[length:var(--fs-text)]"
                >
                  <div className="font-medium text-bw-text">{u.text}</div>
                  <div className="mt-0.5 text-[length:var(--fs-meta)] text-bw-text-muted">
                    {[
                      u.at ? formatDatumKurz(u.at) : null,
                      u.zeitLabel ? `${u.zeitLabel} Std.` : null,
                      u.fotoCount && u.fotoCount > 0 ? `${u.fotoCount} Foto(s)` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}
    </EditorSheet>
  )
}

function formatDatumKurz(iso: string): string {
  const d = iso.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return iso.slice(0, 16)
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}`
}

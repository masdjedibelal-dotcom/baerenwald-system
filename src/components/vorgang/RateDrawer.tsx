'use client'

import type { ReactNode } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockProp } from '@/components/mock-ui/MockProp'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { formatDatum } from '@/lib/utils'
import type { ZahlplanRateStatus } from '@/lib/rechnungen/zahlungsplan'

export type RateDrawerMahnung = {
  stufe: number
  datum: string
}

export type RateDrawerReklamation = {
  datum: string
  grund?: string | null
}

export type RateDrawerRate = {
  id: string
  label: string
  status: ZahlplanRateStatus
  betrag: number
  faellig?: string | null
  prozent?: number | null
  reNr?: string | null
  rechnungId?: string | null
  reklamation?: RateDrawerReklamation | null
}

export type RateDrawerCta = {
  id: string
  label: string
  icon?: string
  primary?: boolean
  onClick: () => void
  disabled?: boolean
}

function sec(title: string, icon: string, body: ReactNode) {
  return (
    <div className="rate-drawer-sec">
      <div className="rate-drawer-sec-h">
        <MockIcon ctx="btn" n={icon} size={13} />
        {title}
      </div>
      {body}
    </div>
  )
}

/**
 * Phase 7 — RateDrawer: Lese-Abschnitte + Footer-CTAs (EditorSheet).
 * Spec §9 / Mock ZahlplanCard.
 */
export function RateDrawer({
  open,
  rate,
  mahnungen = [],
  onClose,
  ctas = [],
}: {
  open: boolean
  rate: RateDrawerRate | null
  mahnungen?: RateDrawerMahnung[]
  onClose: () => void
  ctas?: RateDrawerCta[]
}) {
  if (!rate) {
    return (
      <EditorSheet open={open} onClose={onClose} title="Abschlag">
        <div className="rate-drawer-empty">Keine Rate ausgewählt.</div>
      </EditorSheet>
    )
  }

  const r = rate
  const haupt = ctas.find((c) => c.primary) ?? null
  const rest = ctas.filter((c) => c !== haupt)
  const ueberfaellig =
    r.status === 'gestellt' &&
    Boolean(r.faellig) &&
    new Date(String(r.faellig).slice(0, 10)) < new Date(new Date().toDateString())

  const footer =
    ctas.length > 0 ? (
      <div className="rate-drawer-cta">
        {haupt ? (
          <MockBtn
            kind="primary"
            icon={haupt.icon}
            disabled={haupt.disabled}
            onClick={haupt.onClick}
          >
            {haupt.label}
          </MockBtn>
        ) : null}
        {rest.map((c) => (
          <MockBtn
            key={c.id}
            kind="ghost"
            icon={c.icon}
            disabled={c.disabled}
            onClick={c.onClick}
          >
            {c.label}
          </MockBtn>
        ))}
      </div>
    ) : (
      <div className="rate-drawer-cta">
        <MockBtn kind="primary" onClick={onClose}>
          Schließen
        </MockBtn>
      </div>
    )

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={r.label || 'Abschlag'}
      subtitle={r.reNr || null}
      footer={footer}
      size="lg"
    >
      {sec(
        'Abschlag',
        'calculator',
        <div className="props">
          <MockProp label="Bezeichnung">{r.label || '—'}</MockProp>
          {r.prozent != null ? (
            <MockProp label="Anteil">{r.prozent} % der Auftragssumme</MockProp>
          ) : null}
          <MockProp label="Betrag">
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>
              {formatEurBetrag(r.betrag)}
            </span>
          </MockProp>
          <MockProp label="Fällig">
            {r.faellig ? formatDatum(String(r.faellig).slice(0, 10)) : '—'}
          </MockProp>
        </div>
      )}

      {sec(
        'Rechnung',
        'file-invoice',
        r.status === 'geplant' ? (
          <div className="rate-drawer-empty">Noch nicht gestellt.</div>
        ) : (
          <>
            <div className="props">
              <MockProp label="Nummer">{r.reNr || '—'}</MockProp>
              <MockProp label="Status">
                {r.status === 'bezahlt' ? 'Bezahlt' : 'Gestellt'}
              </MockProp>
              <MockProp label="Änderbar">
                {r.status === 'bezahlt' ? 'nur per Gutschrift' : 'direkt bearbeitbar'}
              </MockProp>
            </div>
            <div className="rate-drawer-note">
              {r.status === 'bezahlt'
                ? 'Bezahlt — Korrektur nur per Gutschrift.'
                : 'Änderbar bis Zahlungseingang.'}
            </div>
          </>
        )
      )}

      {sec(
        'Zahlung',
        'check',
        r.status === 'bezahlt' ? (
          <div className="props">
            <MockProp label="Eingang">
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>Vollständig bezahlt</span>
            </MockProp>
          </div>
        ) : (
          <div className="rate-drawer-empty">
            Offen
            {r.faellig ? ` · fällig ${formatDatum(String(r.faellig).slice(0, 10))}` : ''}.
          </div>
        )
      )}

      {r.reklamation
        ? sec(
            'Reklamation',
            'alert-triangle',
            <div className="props">
              <MockProp label="Gemeldet">
                {r.reklamation.datum
                  ? formatDatum(String(r.reklamation.datum).slice(0, 10))
                  : '—'}
              </MockProp>
              <MockProp label="Grund">{r.reklamation.grund || 'in Prüfung'}</MockProp>
              <MockProp label="Status">
                <StatusBadge status="reklamiert" label="Strittig — in Prüfung" tone="rot" />
              </MockProp>
            </div>
          )
        : null}

      {r.status !== 'geplant'
        ? sec(
            'Mahnungen',
            'alert-triangle',
            mahnungen.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {mahnungen.map((m) => (
                  <div
                    key={m.stufe}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      padding: '8px 0',
                      borderTop: '0.5px solid var(--border)',
                    }}
                  >
                    <StatusBadge
                      status="ueberfaellig"
                      label={`Stufe ${m.stufe}`}
                      tone="rot"
                    />
                    <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
                      gesendet {formatDatum(String(m.datum).slice(0, 10))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rate-drawer-empty">
                Keine Mahnung gesendet.
                {ueberfaellig ? ' Die Rechnung ist überfällig.' : ''}
              </div>
            )
          )
        : null}
    </EditorSheet>
  )
}

'use client'

import { useMemo, type ReactNode } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockProp } from '@/components/mock-ui/MockProp'
import { kundentypLabel } from '@/lib/lead-display-helpers'
import {
  kundeRechnungsempfaengerAusStammdaten,
  type KundeStammdatenFallback,
} from '@/lib/kunde-rechnungsempfaenger'
import { istKundeFirmaPflichtTyp, istKundeNurGewerbeTyp } from '@/lib/kunde-stammdaten'
import type { Kunde } from '@/lib/types'

export function KundenStammdatenCard({
  kunde,
  fallback,
  title = 'Stammdaten',
  action,
}: {
  kunde: Kunde | null | undefined
  fallback?: KundeStammdatenFallback | null
  title?: string
  collapsible?: boolean
  action?: ReactNode
}) {
  const kundenStamm = useMemo(
    () => kundeRechnungsempfaengerAusStammdaten(kunde, fallback),
    [kunde, fallback]
  )

  return (
    <MockCard title={title} icon="user" actions={action}>
      {!kunde ? (
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Kein Kunden-Stammdatensatz verknüpft.</p>
      ) : (
        <>
          {kundenStamm.fehlendeRechnungsfelder.length > 0 ? (
            <p
              className="mb-3 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-[12px] text-amber-950"
              style={{ marginBottom: 12 }}
            >
              Für Rechnungen fehlen: {kundenStamm.fehlendeRechnungsfelder.join(', ')}.
            </p>
          ) : null}
          <div className="props">
            {kundenStamm.kundennummer ? (
              <MockProp label="Kundennr.">{kundenStamm.kundennummer}</MockProp>
            ) : null}
            {istKundeFirmaPflichtTyp(kunde.typ) ? (
              <>
                <MockProp label="Firma">{kunde.name?.trim() || '—'}</MockProp>
                {kundenStamm.vorname ? (
                  <MockProp label="Vorname (Ansprechpartner)">{kundenStamm.vorname}</MockProp>
                ) : null}
                {kundenStamm.nachname ? (
                  <MockProp label="Nachname (Ansprechpartner)">{kundenStamm.nachname}</MockProp>
                ) : null}
              </>
            ) : (
              <>
                {kundenStamm.vorname ? (
                  <MockProp label="Vorname">{kundenStamm.vorname}</MockProp>
                ) : null}
                <MockProp label="Nachname">{kundenStamm.nachname || '—'}</MockProp>
              </>
            )}
            {kundenStamm.ansprechpartner && istKundeNurGewerbeTyp(kunde.typ) ? (
              <MockProp label="Ansprechpartner">{kundenStamm.ansprechpartner}</MockProp>
            ) : null}
            <MockProp label="Straße">{kundenStamm.strasse || '—'}</MockProp>
            <MockProp label="Hausnummer">{kundenStamm.hausnummer || '—'}</MockProp>
            <MockProp label="Postleitzahl">{kundenStamm.plz || '—'}</MockProp>
            <MockProp label="Ort">{kundenStamm.ort || '—'}</MockProp>
            <MockProp label="Kundentyp">{kundentypLabel(kunde.typ)}</MockProp>
            <MockProp label="Telefon" link>
              {kundenStamm.telefon ? (
                <a href={`tel:${kundenStamm.telefon.replace(/\s/g, '')}`}>{kundenStamm.telefon}</a>
              ) : (
                '—'
              )}
            </MockProp>
            <MockProp label="E-Mail" link>
              {kundenStamm.email ? (
                <a href={`mailto:${kundenStamm.email}`}>{kundenStamm.email}</a>
              ) : (
                '—'
              )}
            </MockProp>
            {kundenStamm.ust_id ? <MockProp label="USt-IdNr.">{kundenStamm.ust_id}</MockProp> : null}
          </div>
        </>
      )}
    </MockCard>
  )
}

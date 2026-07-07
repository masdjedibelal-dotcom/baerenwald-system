'use client'

import { useMemo, type ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { DetailProp } from '@/components/ui/detail-prop'
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
  collapsible = true,
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
    <Card collapsible={collapsible} title={title} action={action}>
      {!kunde ? (
        <p className="text-[13px] text-bw-text-muted">Kein Kunden-Stammdatensatz verknüpft.</p>
      ) : (
        <>
          {kundenStamm.fehlendeRechnungsfelder.length > 0 ? (
            <p className="mb-3 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-[12px] text-amber-950">
              Für Rechnungen fehlen: {kundenStamm.fehlendeRechnungsfelder.join(', ')}.
            </p>
          ) : null}
          <div className="props">
            {kundenStamm.kundennummer ? (
              <DetailProp label="Kundennr.">{kundenStamm.kundennummer}</DetailProp>
            ) : null}
            {istKundeFirmaPflichtTyp(kunde.typ) ? (
              <>
                <DetailProp label="Firma">{kunde.name?.trim() || '—'}</DetailProp>
                {kundenStamm.vorname ? (
                  <DetailProp label="Vorname (Ansprechpartner)">{kundenStamm.vorname}</DetailProp>
                ) : null}
                {kundenStamm.nachname ? (
                  <DetailProp label="Nachname (Ansprechpartner)">{kundenStamm.nachname}</DetailProp>
                ) : null}
              </>
            ) : (
              <>
                {kundenStamm.vorname ? (
                  <DetailProp label="Vorname">{kundenStamm.vorname}</DetailProp>
                ) : null}
                <DetailProp label="Nachname">{kundenStamm.nachname || '—'}</DetailProp>
              </>
            )}
            {kundenStamm.ansprechpartner && istKundeNurGewerbeTyp(kunde.typ) ? (
              <DetailProp label="Ansprechpartner">{kundenStamm.ansprechpartner}</DetailProp>
            ) : null}
            <DetailProp label="Straße">{kundenStamm.strasse || '—'}</DetailProp>
            <DetailProp label="Hausnummer">{kundenStamm.hausnummer || '—'}</DetailProp>
            <DetailProp label="Postleitzahl">{kundenStamm.plz || '—'}</DetailProp>
            <DetailProp label="Ort">{kundenStamm.ort || '—'}</DetailProp>
            <DetailProp label="Kundentyp">{kundentypLabel(kunde.typ)}</DetailProp>
            <DetailProp label="Telefon">
              {kundenStamm.telefon ? (
                <a href={`tel:${kundenStamm.telefon.replace(/\s/g, '')}`} className="text-bw-link">
                  {kundenStamm.telefon}
                </a>
              ) : (
                '—'
              )}
            </DetailProp>
            <DetailProp label="E-Mail">
              {kundenStamm.email ? (
                <a href={`mailto:${kundenStamm.email}`} className="text-bw-link">
                  {kundenStamm.email}
                </a>
              ) : (
                '—'
              )}
            </DetailProp>
            {kundenStamm.ust_id ? (
              <DetailProp label="USt-IdNr.">{kundenStamm.ust_id}</DetailProp>
            ) : null}
          </div>
        </>
      )}
    </Card>
  )
}

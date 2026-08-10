'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AuftragBautagebuchSection,
  type BautagebuchListenEintrag,
} from '@/components/auftraege/AuftragBautagebuchSection'
import { LeistungenTab, leistungenFromAngebotPositionen } from '@/components/leistungen'
import { listAuftragPositionEintraege } from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
import { istGewerkBeschreibungPosition } from '@/lib/dokument-zeilen'
import { normalizeAngebotPositionen, summenAusPositionen } from '@/lib/angebot-positionen'
import type { AuftragDetail, Rechnung } from '@/lib/types'

/**
 * Leistungen-Tab der Rechnung: gleiche Leistungen-/Bautagebuch-Ansicht wie beim Auftrag
 * (Start · Fortschritt · Ergebnis als Inserat-Cards aus position_eintraege).
 */
export function RechnungLeistungenMitBautagebuch({
  detail,
  auftragDetail,
  initialView = 'leistungen',
}: {
  detail: Rechnung
  auftragDetail?: AuftragDetail | null
  initialView?: 'leistungen' | 'bautagebuch'
}) {
  const [view, setView] = useState<'leistungen' | 'bautagebuch'>(initialView)
  const [bautagebuchEintraege, setBautagebuchEintraege] = useState<BautagebuchListenEintrag[]>([])

  useEffect(() => {
    setView(initialView)
  }, [initialView])

  const posMetaById = useMemo(() => {
    const m = new Map<string, { name: string; handwerkerName: string | null }>()
    for (const p of auftragDetail?.auftrag_positionen ?? []) {
      m.set(p.id, {
        name: p.leistung_name?.trim() || 'Leistung',
        handwerkerName: p.handwerker?.name?.trim() || null,
      })
    }
    return m
  }, [auftragDetail?.auftrag_positionen])

  const auftragId = detail.auftrag_id?.trim() || auftragDetail?.id?.trim() || null

  useEffect(() => {
    if (!auftragId) {
      setBautagebuchEintraege([])
      return
    }
    let cancelled = false
    void listAuftragPositionEintraege(auftragId).then((list) => {
      if (cancelled) return
      const enriched: BautagebuchListenEintrag[] = []
      for (const e of list) {
        const meta = e.position_id ? posMetaById.get(e.position_id) : null
        enriched.push({
          ...e,
          leistungName: meta?.name ?? null,
          handwerkerName: meta?.handwerkerName ?? null,
        })
      }
      setBautagebuchEintraege(enriched)
    })
    return () => {
      cancelled = true
    }
  }, [auftragId, auftragDetail?.updated_at, posMetaById])

  const pos = useMemo(
    () =>
      normalizeAngebotPositionen(detail.positionen ?? []).filter(
        (p) => !istGewerkBeschreibungPosition(p)
      ),
    [detail.positionen]
  )

  const mwstSatz =
    detail.mwst_satz != null && Number.isFinite(Number(detail.mwst_satz))
      ? Number(detail.mwst_satz)
      : 19
  const summen = summenAusPositionen(pos, mwstSatz)
  const netto =
    detail.netto != null && Number.isFinite(Number(detail.netto))
      ? Number(detail.netto)
      : summen.nettoMin
  const mwstBetrag =
    detail.mwst_betrag != null && Number.isFinite(Number(detail.mwst_betrag))
      ? Number(detail.mwst_betrag)
      : summen.mwstBetragMin
  const brutto =
    detail.brutto != null && Number.isFinite(Number(detail.brutto))
      ? Number(detail.brutto)
      : netto + mwstBetrag

  const rows = useMemo(
    () =>
      leistungenFromAngebotPositionen(
        pos,
        {
          status:
            detail.status === 'bezahlt'
              ? 'bezahlt'
              : detail.status === 'gesendet'
                ? 'gestellt'
                : 'entwurf',
          statusLabel:
            detail.status === 'bezahlt'
              ? 'Bezahlt'
              : detail.status === 'gesendet'
                ? 'Gestellt'
                : 'Entwurf',
        },
        { eigenleistungSubline: true }
      ),
    [pos, detail.status]
  )

  const hasAuftrag = Boolean(auftragId)

  return (
    <div className="space-y-4">
      {hasAuftrag ? (
        <div className="lt-view-seg" role="tablist" aria-label="Ansicht">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'leistungen'}
            className={view === 'leistungen' ? 'on' : undefined}
            onClick={() => setView('leistungen')}
          >
            Leistungen
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'bautagebuch'}
            className={view === 'bautagebuch' ? 'on' : undefined}
            onClick={() => setView('bautagebuch')}
          >
            Bautagebuch
            {bautagebuchEintraege.length > 0 ? (
              <span className="lt-view-seg__count">{bautagebuchEintraege.length}</span>
            ) : null}
          </button>
        </div>
      ) : null}

      {view === 'bautagebuch' && hasAuftrag ? (
        <AuftragBautagebuchSection
          eintraege={bautagebuchEintraege}
          disabled
          onAdd={() => undefined}
        />
      ) : (
        <LeistungenTab
          phase="rechnung"
          rows={rows}
          groupByGewerk
          footerNettoMwst={{ netto, mwstSatz, mwstBetrag, brutto }}
          emptyHint="Noch keine Positionen — über „Rechnung bearbeiten“ anlegen."
        />
      )}
    </div>
  )
}

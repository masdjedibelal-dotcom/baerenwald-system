'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import {
  ladeWhatsAppKontakteAuftrag,
  ladeWhatsAppKurz,
  type WaKontaktZeile,
} from '@/app/(dashboard)/whatsapp/actions'
import { MockBadge, MockBtn, MockCard } from '@/components/mock-ui'
import { WhatsAppChatSheet } from '@/components/whatsapp/WhatsAppChatSheet'
import { useWhatsAppStatus } from '@/components/whatsapp/useWhatsAppStatus'
import { safeAction } from '@/lib/actions/safe-action'
import { formatDatum } from '@/lib/format/geld-datum'

function wann(iso: string): string {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : formatDatum(iso)
}

function KontaktZeile({ k, onClick }: { k: WaKontaktZeile; onClick: () => void }) {
  return (
    <MockBtn type="button" className="einsatz-zeile" onClick={onClick}>
      <span className="einsatz-zeile__text">
        <span className="einsatz-zeile__titel">{k.name}</span>
        {k.rolle ? <span className="einsatz-zeile__sub">{k.rolle}</span> : null}
        <span className="einsatz-zeile__meta">
          {k.letzte
            ? `${k.letzte.richtung === 'aus' ? 'Sie: ' : ''}${k.letzte.text}`
            : k.hatNummer
              ? 'Noch keine Nachrichten'
              : 'Keine Handynummer hinterlegt'}
        </span>
      </span>
      <span className="einsatz-zeile__rechts">
        {k.ungelesen > 0 ? <MockBadge kind="neu">{k.ungelesen} neu</MockBadge> : null}
        {k.letzte ? <span className="wa-karte__zeit">{wann(k.letzte.at)}</span> : null}
      </span>
    </MockBtn>
  )
}

/**
 * Partner- bzw. Kunden-Akte: WhatsApp-Verlauf (allgemeiner Chat, Zuordnung je Nachricht).
 * `?chat=1` öffnet den Chat direkt (Glocke).
 */
export function WhatsAppKontaktKarte({ handwerkerId, kundeId, name }: { handwerkerId?: string; kundeId?: string; name: string }) {
  const status = useWhatsAppStatus()
  const params = useSearchParams()
  const [zeile, setZeile] = useState<WaKontaktZeile | null>(null)
  const [open, setOpen] = useState(false)

  const laden = useCallback(async () => {
    const res = await safeAction(ladeWhatsAppKurz({ handwerkerId, kundeId }))
    if (res.ok) setZeile({ ...res.zeile, name, rolle: '' })
  }, [handwerkerId, kundeId, name])

  useEffect(() => {
    if (status?.sichtbar) void laden()
  }, [status?.sichtbar, laden])

  useEffect(() => {
    if (status?.sichtbar && params.get('chat') === '1') setOpen(true)
  }, [status?.sichtbar, params])

  if (!status?.sichtbar) return null
  return (
    <>
      <MockCard
        title="WhatsApp"
        icon="brand-whatsapp"
        actions={
          <MockBtn sm kind="secondary" icon="brand-whatsapp" onClick={() => setOpen(true)}>
            Chat
          </MockBtn>
        }
      >
        {zeile ? <KontaktZeile k={zeile} onClick={() => setOpen(true)} /> : null}
      </MockCard>
      <WhatsAppChatSheet
        open={open}
        onClose={() => {
          setOpen(false)
          void laden()
        }}
        ziel={{ handwerkerId, kundeId }}
        name={name}
        onChanged={() => void laden()}
      />
    </>
  )
}

/**
 * Auftrag: WhatsApp mit Kunde und allen Partnern der Einsätze. Chat zeigt zuerst die Nachrichten
 * dieses Auftrags; was hier geschrieben wird, hängt am Auftrag. `?chat=<id>` öffnet direkt.
 */
export function AuftragWhatsAppCard({ auftragId, version = 0 }: { auftragId: string; version?: number }) {
  const status = useWhatsAppStatus()
  const params = useSearchParams()
  const [kontakte, setKontakte] = useState<WaKontaktZeile[] | null>(null)
  const [offen, setOffen] = useState<WaKontaktZeile | null>(null)

  const laden = useCallback(async () => {
    const res = await safeAction(ladeWhatsAppKontakteAuftrag(auftragId))
    setKontakte(res.ok ? res.kontakte : [])
    return res.ok ? res.kontakte : []
  }, [auftragId])

  useEffect(() => {
    if (!status?.sichtbar) return
    void laden().then((liste) => {
      const chat = params.get('chat')
      if (chat) setOffen(liste.find((k) => k.id === chat) ?? null)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- params nur beim Laden
  }, [status?.sichtbar, laden, version])

  if (!status?.sichtbar) return null
  return (
    <>
      <MockCard title="WhatsApp" icon="brand-whatsapp">
        {kontakte == null ? null : kontakte.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 'var(--fs-text)' }}>
            Noch kein Kunde oder Partner am Auftrag.
          </p>
        ) : (
          <div className="einsatz-liste">
            {kontakte.map((k) => (
              <KontaktZeile key={`${k.typ}:${k.id}`} k={k} onClick={() => setOffen(k)} />
            ))}
          </div>
        )}
      </MockCard>
      <WhatsAppChatSheet
        open={Boolean(offen)}
        onClose={() => {
          setOffen(null)
          void laden()
        }}
        ziel={offen?.typ === 'handwerker' ? { handwerkerId: offen.id } : { kundeId: offen?.id }}
        name={offen?.name ?? ''}
        auftragId={auftragId}
        onChanged={() => void laden()}
      />
    </>
  )
}

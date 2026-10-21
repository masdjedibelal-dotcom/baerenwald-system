'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'

import { MockBtn, MockCard } from '@/components/mock-ui'
import { MockTextarea } from '@/components/mock-ui/MockForm'
import { toast } from '@/components/ui/app-toast'
import { safeAction } from '@/lib/actions/safe-action'
import { formatDatumZeit } from '@/lib/format/geld-datum'
import {
  ladeVerwaltungNachrichten,
  sendeNachrichtAnVerwaltung,
  type VerwaltungNachricht,
} from '@/teo/hv/verwaltung-nachrichten-actions'

/** TEO: Nachrichten mit der Verwaltung zum Vorgang (Gegenstück zum Arbeitsplatz). */
export function VerwaltungNachrichtenCard({ leadId }: { leadId: string }) {
  const [liste, setListe] = useState<VerwaltungNachricht[] | null>(null)
  const [text, setText] = useState('')
  const [laeuft, starten] = useTransition()

  const laden = useCallback(async () => {
    const r = await safeAction(ladeVerwaltungNachrichten(leadId))
    setListe(r.ok ? r.liste : [])
  }, [leadId])

  useEffect(() => {
    void laden()
  }, [laden])

  function senden() {
    starten(async () => {
      const r = await safeAction(sendeNachrichtAnVerwaltung(leadId, text))
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setText('')
      await laden()
    })
  }

  return (
    <MockCard title="Nachrichten der Verwaltung" icon="messages">
      {liste?.length ? (
        <ol className="vw-nachrichten">
          {liste.map((n) => (
            <li key={n.id} className={n.vonTeo ? 'vw-nachricht vw-nachricht--teo' : 'vw-nachricht'}>
              <div className="vw-nachricht__kopf">
                <strong>{n.von}</strong>
                <span>{formatDatumZeit(n.wann)}</span>
              </div>
              <div className="vw-nachricht__text">{n.text}</div>
            </li>
          ))}
        </ol>
      ) : null}
      <MockTextarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Antwort an die Verwaltung" rows={3} />
      <div className="vw-nachrichten__fuss">
        <MockBtn kind="primary" sm type="button" disabled={laeuft || !text.trim()} onClick={senden}>
          Senden
        </MockBtn>
      </div>
    </MockCard>
  )
}

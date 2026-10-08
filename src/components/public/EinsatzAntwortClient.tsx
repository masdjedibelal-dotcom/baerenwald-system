'use client'

import { useState } from 'react'

import { MockBtn } from '@/components/mock-ui'
import { MockTextarea } from '@/components/mock-ui/MockForm'

/** Bestätigen auf der Einsatz-Seite: erst dieser Klick ändert den Status (Mail-Scanner öffnen Links automatisch). */
export function EinsatzAntwortClient({
  token,
  status,
  vorwahl,
}: {
  token: string
  status: string
  vorwahl: 'annehmen' | 'ablehnen' | null
}) {
  const [stand, setStand] = useState(status)
  const [modus, setModus] = useState<'annehmen' | 'ablehnen' | null>(vorwahl)
  const [grund, setGrund] = useState('')
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function senden(antwort: 'annehmen' | 'ablehnen') {
    setBusy(true)
    setFehler(null)
    try {
      const res = await fetch('/api/einsatz-antwort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, antwort, grund }),
      })
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; status?: string; message?: string }
      if (!res.ok || !json.ok) {
        setFehler(json.message || 'Das hat nicht geklappt. Bitte erneut versuchen.')
        return
      }
      setStand(json.status ?? stand)
    } catch {
      setFehler('Keine Verbindung. Bitte erneut versuchen.')
    } finally {
      setBusy(false)
    }
  }

  if (stand === 'angenommen' || stand === 'fertig') {
    return (
      <div className="einsatz-antwort__ergebnis is-ok">
        <strong>Danke, der Einsatz ist angenommen.</strong>
        <span>Bärenwald ist informiert. Updates und Fotos können Sie im Partner-Portal oder per WhatsApp schicken.</span>
      </div>
    )
  }
  if (stand === 'abgelehnt') {
    return (
      <div className="einsatz-antwort__ergebnis">
        <strong>Ihre Absage ist bei uns angekommen.</strong>
        <span>Danke für die schnelle Rückmeldung.</span>
      </div>
    )
  }

  return (
    <div className="einsatz-antwort__aktionen">
      {modus === 'ablehnen' ? (
        <>
          <label className="einsatz-antwort__label" htmlFor="grund">
            Grund (optional)
          </label>
          <MockTextarea
            id="grund"
            rows={3}
            value={grund}
            placeholder="z. B. Termin passt nicht, keine Kapazität …"
            onChange={(e) => setGrund(e.target.value)}
          />
          <div className="einsatz-antwort__knoepfe">
            <MockBtn kind="secondary" disabled={busy} onClick={() => setModus(null)}>
              Zurück
            </MockBtn>
            <MockBtn kind="primary" loading={busy} disabled={busy} onClick={() => void senden('ablehnen')}>
              Absage senden
            </MockBtn>
          </div>
        </>
      ) : (
        <div className="einsatz-antwort__knoepfe">
          <MockBtn kind="primary" icon="check" loading={busy && modus === 'annehmen'} disabled={busy} onClick={() => { setModus('annehmen'); void senden('annehmen') }}>
            Einsatz annehmen
          </MockBtn>
          <MockBtn kind="secondary" disabled={busy} onClick={() => setModus('ablehnen')}>
            Ablehnen
          </MockBtn>
        </div>
      )}
      {fehler ? <p className="field-error" role="alert">{fehler}</p> : null}
    </div>
  )
}

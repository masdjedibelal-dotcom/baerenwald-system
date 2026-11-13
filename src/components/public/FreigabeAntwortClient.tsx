'use client'

import { useState } from 'react'

import { MockBtn } from '@/components/mock-ui'
import { MockTextarea } from '@/components/mock-ui/MockForm'
import { MARKE } from '@/lib/marke'

/** Bestätigen auf der Freigabe-Seite: erst dieser Klick entscheidet (Mail-Scanner öffnen Links automatisch). */
export function FreigabeAntwortClient({
  token,
  status,
  vorwahl,
}: {
  token: string
  status: string
  vorwahl: 'freigegeben' | 'abgelehnt' | null
}) {
  const [stand, setStand] = useState(status)
  const [modus, setModus] = useState<'freigegeben' | 'abgelehnt' | null>(vorwahl)
  const [notiz, setNotiz] = useState('')
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function senden(aktion: 'freigegeben' | 'abgelehnt') {
    setBusy(true)
    setFehler(null)
    try {
      const res = await fetch('/api/freigabe-antwort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, aktion, notiz }),
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

  if (stand === 'freigegeben') {
    return (
      <div className="einsatz-antwort__ergebnis is-ok">
        <strong>Danke, das Angebot ist freigegeben.</strong>
        <span>{MARKE.name} beauftragt jetzt den Handwerker. Termin und Fotos bekommen Sie per E-Mail.</span>
      </div>
    )
  }
  if (stand === 'abgelehnt') {
    return (
      <div className="einsatz-antwort__ergebnis">
        <strong>Ihre Ablehnung ist bei uns angekommen.</strong>
        <span>Wir melden uns bei Ihnen, falls wir das Angebot anpassen können.</span>
      </div>
    )
  }
  if (stand !== 'ausstehend' && stand !== 'beschluss_ausstehend') {
    return (
      <div className="einsatz-antwort__ergebnis">
        <strong>Für diesen Vorgang ist keine Freigabe offen.</strong>
        <span>Bei Fragen erreichen Sie uns unter {MARKE.infoEmail}.</span>
      </div>
    )
  }

  return (
    <div className="einsatz-antwort__aktionen">
      {modus === 'abgelehnt' ? (
        <>
          <label className="einsatz-antwort__label" htmlFor="notiz">
            Grund (optional)
          </label>
          <MockTextarea
            id="notiz"
            rows={3}
            value={notiz}
            placeholder="z. B. zu teuer, erst Eigentümerversammlung, bitte Alternative …"
            onChange={(e) => setNotiz(e.target.value)}
          />
          <div className="einsatz-antwort__knoepfe">
            <MockBtn kind="secondary" disabled={busy} onClick={() => setModus(null)}>
              Zurück
            </MockBtn>
            <MockBtn kind="primary" loading={busy} disabled={busy} onClick={() => void senden('abgelehnt')}>
              Ablehnung senden
            </MockBtn>
          </div>
        </>
      ) : (
        <div className="einsatz-antwort__knoepfe">
          <MockBtn
            kind="primary"
            icon="check"
            loading={busy && modus === 'freigegeben'}
            disabled={busy}
            onClick={() => {
              setModus('freigegeben')
              void senden('freigegeben')
            }}
          >
            Angebot freigeben
          </MockBtn>
          <MockBtn kind="secondary" disabled={busy} onClick={() => setModus('abgelehnt')}>
            Ablehnen
          </MockBtn>
        </div>
      )}
      {fehler ? <p className="field-error" role="alert">{fehler}</p> : null}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'

import { MockBtn } from '@/components/mock-ui'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import {
  ladeMailInhalt,
  ladeVorgangMails,
  type VorgangMailIds,
  type VorgangMailZeile,
} from '@/app/(dashboard)/kommunikation/vorgang-mail-actions'

function datum(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Akte: alle Mails zum Vorgang (gesendet + Antworten), antippen = lesen, Antworten = Mail-Maske. */
export function VorgangMailsCard({
  ids,
  reloadKey,
  onSchreiben,
  onAntworten,
}: {
  ids: VorgangMailIds
  reloadKey: number
  onSchreiben: () => void
  onAntworten: (logId: string) => void
}) {
  const [zeilen, setZeilen] = useState<VorgangMailZeile[] | null>(null)
  const [offen, setOffen] = useState<VorgangMailZeile | null>(null)
  const [html, setHtml] = useState<string | null>(null)
  const idsKey = JSON.stringify(ids)

  useEffect(() => {
    let aktiv = true
    void ladeVorgangMails(JSON.parse(idsKey) as VorgangMailIds).then((r) => {
      if (aktiv) setZeilen(r)
    })
    return () => {
      aktiv = false
    }
  }, [idsKey, reloadKey])

  useEffect(() => {
    if (!offen) return
    setHtml(null)
    void ladeMailInhalt(offen.id).then((r) => setHtml(r.ok ? r.html : '<p>Inhalt nicht verfügbar.</p>'))
  }, [offen])

  return (
    <>
      <MockCard
        title="E-Mails"
        actions={
          <MockBtn type="button" kind="secondary" size="sm" onClick={onSchreiben}>
            Schreiben
          </MockBtn>
        }
      >
        {zeilen === null ? (
          <div className="vg-mails" aria-busy="true">
            {[0, 1].map((i) => (
              <div key={i} className="vg-mail vg-mail--skelett" />
            ))}
          </div>
        ) : zeilen.length === 0 ? (
          <p className="empty">Noch keine E-Mails zu diesem Vorgang.</p>
        ) : (
          <ul className="vg-mails">
            {zeilen.map((z) => (
              <li key={z.id}>
                <MockBtn type="button" className="vg-mail" onClick={() => setOffen(z)}>
                  <span className={z.richtung === 'empfangen' ? 'vg-mail__icon is-ein' : 'vg-mail__icon'} aria-hidden>
                    <MockIcon ctx="default" n={z.richtung === 'empfangen' ? 'mail' : 'send'} size={16} />
                  </span>
                  <span className="vg-mail__text">
                    <span className="vg-mail__betreff">{z.betreff}</span>
                    <span className="vg-mail__meta">
                      {z.richtung === 'empfangen' ? `Von ${z.von ?? ''}` : `An ${z.an}`} · {datum(z.am)}
                    </span>
                  </span>
                </MockBtn>
              </li>
            ))}
          </ul>
        )}
      </MockCard>

      <EditorSheet
        open={!!offen}
        onClose={() => setOffen(null)}
        title={offen?.betreff ?? 'E-Mail'}
        subtitle={offen ? `${offen.richtung === 'empfangen' ? `Von ${offen.von ?? ''}` : `An ${offen.an}`} · ${datum(offen.am)}` : null}
        context="detail"
        size="lg"
        primary={
          offen?.richtung === 'empfangen'
            ? {
                label: 'Antworten',
                onClick: () => {
                  const id = offen.id
                  setOffen(null)
                  onAntworten(id)
                },
              }
            : null
        }
      >
        {html === null ? (
          <div className="vg-mail vg-mail--skelett" style={{ height: 240 }} />
        ) : (
          <iframe className="vg-mail-inhalt" title="E-Mail" sandbox="" srcDoc={html} />
        )}
      </EditorSheet>
    </>
  )
}

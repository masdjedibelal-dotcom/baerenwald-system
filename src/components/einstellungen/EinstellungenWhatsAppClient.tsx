'use client'

import { useEffect, useState } from 'react'

import { loescheWhatsAppTestdaten, zaehleWhatsAppTestdaten } from '@/app/(dashboard)/whatsapp/actions'
import { EinstellungenSectionHeading } from '@/components/einstellungen/EinstellungenUi'
import { MockBadge, MockBtn } from '@/components/mock-ui'
import { toast } from '@/components/ui/app-toast'
import { openConfirmPopup } from '@/components/ui/ConfirmPopup'
import { safeAction } from '@/lib/actions/safe-action'
import { waNummerAnzeige } from '@/lib/whatsapp/telefon'
import type { VorlagenDefinition } from '@/lib/whatsapp/vorlagen'

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <EinstellungenSectionHeading className="mb-3.5">{title}</EinstellungenSectionHeading>
      <div>{children}</div>
    </div>
  )
}

/** WhatsApp (360dialog): Stand der Anbindung, Vorlagen zum Einreichen, Testdaten. */
export function EinstellungenWhatsAppClient({
  modus,
  nummer,
  webhookBereit,
  vorlagen,
}: {
  modus: 'mock' | '360dialog'
  nummer: string | null
  webhookBereit: boolean
  vorlagen: VorlagenDefinition[]
}) {
  const [testdaten, setTestdaten] = useState<number | null>(null)
  const echt = modus === '360dialog'

  useEffect(() => {
    safeAction(zaehleWhatsAppTestdaten())
      .then((n) => setTestdaten(typeof n === 'number' ? n : 0))
      .catch(() => setTestdaten(0))
  }, [])

  async function loeschen() {
    const res = await safeAction(loescheWhatsAppTestdaten())
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success(`${res.geloescht} Testnachrichten gelöscht`)
    setTestdaten(0)
  }

  return (
    <>
      <Sec title="WhatsApp">
        <div className="setting-row">
          <div>
            <div className="lbl">Anbindung</div>
            <div className="sub">
              {echt
                ? 'Verbunden über 360dialog — Nachrichten gehen wirklich raus.'
                : 'Testmodus — nichts geht an WhatsApp raus. Zum Anschauen im CRM (Staging).'}
            </div>
          </div>
          <MockBadge kind={echt ? 'aktiv' : 'warten'}>{echt ? '360dialog' : 'Testmodus'}</MockBadge>
        </div>
        <div className="setting-row">
          <div>
            <div className="lbl">Nummer</div>
            <div className="sub">{nummer ? waNummerAnzeige(nummer) : 'Bärenwald-Nummer (nach Anbindung)'}</div>
          </div>
        </div>
        <div className="setting-row">
          <div>
            <div className="lbl">Eingehende Nachrichten (Webhook)</div>
            <div className="sub">
              {webhookBereit ? 'Token gesetzt — /api/whatsapp/webhook?token=…' : 'Noch kein Webhook-Token gesetzt.'}
            </div>
          </div>
          <MockBadge kind={webhookBereit ? 'aktiv' : 'plain'}>{webhookBereit ? 'bereit' : 'offen'}</MockBadge>
        </div>
        {testdaten ? (
          <div className="setting-row">
            <div>
              <div className="lbl">Testnachrichten</div>
              <div className="sub">{testdaten} Nachrichten aus dem Testmodus. Vor dem Echtbetrieb löschen.</div>
            </div>
            <MockBtn
              sm
              kind="secondary"
              onClick={() =>
                openConfirmPopup({
                  title: 'Testnachrichten löschen?',
                  body: 'Alle Nachrichten aus dem Testmodus werden gelöscht. Echte Nachrichten bleiben.',
                  confirmLabel: 'Löschen',
                  danger: true,
                  onConfirm: () => loeschen(),
                })
              }
            >
              Löschen
            </MockBtn>
          </div>
        ) : null}
      </Sec>

      <Sec title="Vorlagen zum Einreichen">
        <p className="wa-einst-hinweis">
          Außerhalb von 24 Std. nach der letzten Nachricht des Kontakts erlaubt WhatsApp nur freigegebene Vorlagen.
          Diese drei im 360dialog-Hub einreichen — Sprache Deutsch, Kategorie „Utility“, Text genau so.
        </p>
        {vorlagen.map((v) => (
          <div key={v.name} className="wa-einst-vorlage">
            <div className="wa-einst-vorlage__kopf">
              <code>{v.name}</code>
              <span>{v.beschreibung}</span>
            </div>
            <pre>{v.text}</pre>
            {v.knoepfe?.length ? (
              <div className="wa-knoepfe">
                {v.knoepfe.map((k) => (
                  <span key={k} className="wa-knopf">
                    {k}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </Sec>

      <Sec title="Einrichtung">
        <ol className="wa-einst-schritte">
          <li>360dialog-Konto anlegen, Bärenwald-Nummer verbinden (bestehende Nummer: Koexistenz mit der WhatsApp-Business-App).</li>
          <li>Im 360dialog-Hub einen API-Key für den Kanal erzeugen.</li>
          <li>
            In Netlify (CRM) setzen: <code>WHATSAPP_PROVIDER=360dialog</code>, <code>D360_API_KEY</code>,{' '}
            <code>WHATSAPP_NUMMER</code>, <code>WHATSAPP_WEBHOOK_TOKEN</code> (beliebiger geheimer Wert).
          </li>
          <li>
            Webhook bei 360dialog eintragen: <code>/api/whatsapp/webhook?token=&lt;WHATSAPP_WEBHOOK_TOKEN&gt;</code>
          </li>
          <li>Die drei Vorlagen oben einreichen und Freigabe abwarten.</li>
          <li>Testnachrichten löschen, dann mit einem eigenen Handy testen.</li>
        </ol>
      </Sec>
    </>
  )
}

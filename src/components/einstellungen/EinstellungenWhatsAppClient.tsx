'use client'

import { useEffect,useState } from 'react'

import { loescheWhatsAppTestdaten,zaehleWhatsAppTestdaten } from '@/app/(dashboard)/whatsapp/actions'
import { EinstellungenSectionHeading } from '@/components/einstellungen/EinstellungenUi'
import { MockBadge,MockBtn } from '@/components/mock-ui'
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

type VorlageMitSid = VorlagenDefinition & { contentSid: string | null }

/** WhatsApp (Twilio): Stand der Anbindung, Vorlagen für den Content Template Builder, Testdaten. */
export function EinstellungenWhatsAppClient({
  modus,
  nummer,
  webhookUrl,
  vorlagen,
}: {
  modus: 'mock' | 'twilio'
  nummer: string | null
  webhookUrl: string
  vorlagen: VorlageMitSid[]
}) {
  const echt = modus === 'twilio'
  const [testdaten, setTestdaten] = useState<number | null>(null)

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
                ? 'Verbunden über Twilio — Nachrichten gehen wirklich raus.'
                : 'Testmodus — nichts geht an WhatsApp raus. Zum Anschauen im CRM (Staging).'}
            </div>
          </div>
          <MockBadge kind={echt ? 'aktiv' : 'warten'}>{echt ? 'Twilio' : 'Testmodus'}</MockBadge>
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
              In Twilio beim WhatsApp-Absender unter „Webhook URL for incoming messages“ (POST): <code>{webhookUrl}</code>
            </div>
          </div>
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
          Diese drei in Twilio unter Messaging → Content Template Builder anlegen (Sprache Deutsch, Kategorie „Utility“,
          Text genau so; Einsatz als Typ „Quick reply“ mit beiden Knöpfen) und für WhatsApp zur Freigabe einreichen.
          Die Content-SID (HX…) jeweils in Netlify eintragen.
        </p>
        {vorlagen.map((v) => (
          <div key={v.name} className="wa-einst-vorlage">
            <div className="wa-einst-vorlage__kopf">
              <code>{v.name}</code>
              <span>{v.beschreibung}</span>
              <MockBadge kind={v.contentSid ? 'aktiv' : 'plain'}>{v.contentSid ? 'hinterlegt' : 'Content-SID fehlt'}</MockBadge>
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
          <li>Twilio-Konto upgraden (mit dem Testkonto lässt sich keine eigene Nummer verbinden).</li>
          <li>
            Messaging → Senders → WhatsApp senders → „Create new sender“: Nummer eintragen, mit dem Facebook-Konto
            (Admin des Bärenwald-Unternehmens) verbinden, Anzeigename „Bärenwald“, Code per SMS bestätigen. Die Nummer
            darf nicht mehr in der normalen WhatsApp-App aktiv sein.
          </li>
          <li>
            Beim Absender als Webhook für eingehende Nachrichten eintragen (POST): <code>{webhookUrl}</code>
          </li>
          <li>Die drei Vorlagen oben im Content Template Builder anlegen und zur WhatsApp-Freigabe einreichen.</li>
          <li>
            In Netlify (CRM) setzen: <code>WHATSAPP_PROVIDER=twilio</code>, <code>TWILIO_ACCOUNT_SID</code>,{' '}
            <code>TWILIO_AUTH_TOKEN</code>, <code>TWILIO_WHATSAPP_NUMMER</code> (z. B. +4989…),{' '}
            <code>TWILIO_VORLAGE_EINSATZ</code>, <code>TWILIO_VORLAGE_BAUTAGEBUCH</code>, <code>TWILIO_VORLAGE_NACHRICHT</code>.
          </li>
          <li>Testnachrichten löschen, dann mit einem eigenen Handy testen.</li>
        </ol>
      </Sec>
    </>
  )
}

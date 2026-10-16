'use client'

import { useEffect,useState } from 'react'

import { loescheWhatsAppTestdaten,whatsappWebhookEintragen,zaehleWhatsAppTestdaten } from '@/app/(dashboard)/whatsapp/actions'
import { EinstellungenSectionHeading } from '@/components/einstellungen/EinstellungenUi'
import { MockBadge,MockBtn } from '@/components/mock-ui'
import { toast } from '@/components/ui/app-toast'
import { openConfirmPopup } from '@/components/ui/ConfirmPopup'
import { safeAction } from '@/lib/actions/safe-action'
import { waNummerAnzeige } from '@/lib/whatsapp/telefon'

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <EinstellungenSectionHeading className="mb-3.5">{title}</EinstellungenSectionHeading>
      <div>{children}</div>
    </div>
  )
}

/** WhatsApp (360dialog): Stand der Anbindung, Webhook, Testdaten. */
export function EinstellungenWhatsAppClient({
  modus,
  nummer,
  webhookUrl,
}: {
  modus: 'mock' | '360dialog'
  nummer: string | null
  /** null = WHATSAPP_WEBHOOK_TOKEN fehlt */
  webhookUrl: string | null
}) {
  const echt = modus === '360dialog'
  const [testdaten, setTestdaten] = useState<number | null>(null)
  const [webhookBusy, setWebhookBusy] = useState(false)
  // Token nicht im Klartext zeigen
  const webhookAnzeige = webhookUrl ? webhookUrl.replace(/token=[^&]+/, 'token=•••') : null

  async function webhookEintragen() {
    setWebhookBusy(true)
    const res = await safeAction(whatsappWebhookEintragen())
    setWebhookBusy(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success('Webhook bei 360dialog eingetragen')
  }

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
              {webhookAnzeige ? (
                <>
                  Adresse: <code>{webhookAnzeige}</code>
                </>
              ) : (
                <>
                  Erst <code>WHATSAPP_WEBHOOK_TOKEN</code> in Netlify setzen.
                </>
              )}
            </div>
          </div>
          {echt && webhookUrl ? (
            <MockBtn sm kind="secondary" disabled={webhookBusy} onClick={() => void webhookEintragen()}>
              {webhookBusy ? "Wird eingetragen…" : "Webhook eintragen"}
            </MockBtn>
          ) : null}
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

    </>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { saveEinstellungen } from '@/app/(dashboard)/einstellungen/actions'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { toast } from 'sonner'

export function EinstellungenForm({ initial }: { initial: FirmenEinstellungen }) {
  const [v, setV] = useState(initial)
  const [pending, startTransition] = useTransition()

  function set<K extends keyof FirmenEinstellungen>(key: K, value: string) {
    setV((s) => ({ ...s, [key]: value }))
  }

  function save() {
    startTransition(async () => {
      const r = await saveEinstellungen(v)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Gespeichert')
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="space-y-4 rounded-lg border border-border bg-surface p-4 shadow-card">
        <h2 className="text-lg font-semibold text-ink">Firma</h2>
        <Input label="Firmenname" value={v.firmenname} onChange={(e) => set('firmenname', e.target.value)} />
        <Input label="Straße + Hausnummer" value={v.strasse} onChange={(e) => set('strasse', e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="PLZ" value={v.plz} onChange={(e) => set('plz', e.target.value)} />
          <Input label="Ort" value={v.ort} onChange={(e) => set('ort', e.target.value)} />
        </div>
        <Input label="Telefon" value={v.telefon} onChange={(e) => set('telefon', e.target.value)} />
        <Input label="E-Mail" type="email" value={v.email} onChange={(e) => set('email', e.target.value)} />
        <Input label="Website" value={v.website} onChange={(e) => set('website', e.target.value)} />
        <Input label="USt-IdNr." value={v.ust_id} onChange={(e) => set('ust_id', e.target.value)} />
        <Input label="Steuernummer" value={v.steuernummer} onChange={(e) => set('steuernummer', e.target.value)} />
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-surface p-4 shadow-card">
        <h2 className="text-lg font-semibold text-ink">Bank</h2>
        <Input label="IBAN" value={v.iban} onChange={(e) => set('iban', e.target.value)} />
        <Input label="BIC" value={v.bic} onChange={(e) => set('bic', e.target.value)} />
        <Input label="Bank" value={v.bank_name} onChange={(e) => set('bank_name', e.target.value)} />
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-surface p-4 shadow-card">
        <h2 className="text-lg font-semibold text-ink">PDF & Fristen</h2>
        <Input
          label="Logo-URL (öffentlich erreichbar)"
          hint="Optional: Bild-URL für PDF-Kopf"
          value={v.logo_url}
          onChange={(e) => set('logo_url', e.target.value)}
        />
        <Input
          label="Zahlungsziel Standard (Tage)"
          type="number"
          min={1}
          value={v.zahlungsziel_tage}
          onChange={(e) => set('zahlungsziel_tage', e.target.value)}
        />
        <Input
          label="Angebot gültig (Tage)"
          type="number"
          min={1}
          value={v.angebot_gueltig_tage}
          onChange={(e) => set('angebot_gueltig_tage', e.target.value)}
        />
        <Textarea
          label="Fußzeile PDF"
          value={v.pdf_fusszeile}
          onChange={(e) => set('pdf_fusszeile', e.target.value)}
          rows={4}
        />
      </section>

      <Button type="button" variant="primary" loading={pending} onClick={() => save()}>
        Speichern
      </Button>
    </div>
  )
}

'use client'

import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { saveEinstellungen } from '@/app/(dashboard)/einstellungen/actions'
import { BrandLogo } from '@/components/brand/BrandLogo'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { toast } from '@/components/ui/app-toast'

const MWST_OPTIONS = [
  { value: '19', label: '19 %' },
  { value: '7', label: '7 %' },
  { value: '0', label: '0 %' },
]

export function FirmaBrandingForm({ initial }: { initial: FirmenEinstellungen }) {
  const [v, setV] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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

  async function onLogoFile(f: File | null) {
    if (!f) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.set('file', f)
      fd.set('filename', f.name)
      const res = await fetch('/api/einstellungen/logo', { method: 'POST', body: fd })
      const j = (await res.json()) as { url?: string; error?: string }
      if (!res.ok) {
        toast.error(j.error ?? 'Upload fehlgeschlagen')
        return
      }
      if (j.url) {
        setV((s) => ({ ...s, logo_url: j.url! }))
        toast.success('Logo hochgeladen — bitte speichern')
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function removeLogo() {
    setV((s) => ({ ...s, logo_url: '' }))
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card title="Firmeninfo">
        <div className="form-grid-2">
          <Input
            label="Firmenname"
            required
            value={v.firmenname}
            onChange={(e) => set('firmenname', e.target.value)}
          />
          <Input label="Rechtsform" value={v.rechtsform} onChange={(e) => set('rechtsform', e.target.value)} />
          <Input
            label="Geschäftsführer / Inhaber (PDF)"
            value={v.geschaeftsfuehrer}
            onChange={(e) => set('geschaeftsfuehrer', e.target.value)}
            placeholder="z. B. Beran Cakmak"
          />
          <Input label="Straße" value={v.strasse} onChange={(e) => set('strasse', e.target.value)} />
          <Input label="PLZ" value={v.plz} onChange={(e) => set('plz', e.target.value)} />
          <Input label="Ort" value={v.ort} onChange={(e) => set('ort', e.target.value)} />
          <Input
            label="Telefon"
            type="tel"
            value={v.telefon}
            onChange={(e) => set('telefon', e.target.value)}
          />
          <Input
            label="E-Mail"
            type="email"
            value={v.email}
            onChange={(e) => set('email', e.target.value)}
          />
          <Input
            label="Webseite"
            type="url"
            placeholder="https://"
            value={v.website}
            onChange={(e) => set('website', e.target.value)}
          />
        </div>
      </Card>

      <Card title="Steuer & Bank">
        <div className="form-grid-2">
          <Input label="USt-ID" value={v.ust_id} onChange={(e) => set('ust_id', e.target.value)} />
          <Input
            label="Steuernummer"
            value={v.steuernummer}
            onChange={(e) => set('steuernummer', e.target.value)}
          />
          <Input
            label="IBAN"
            hint="Wird im Angebots-PDF unter „Bankverbindung (Überweisung)“ ausgegeben."
            value={v.iban}
            onChange={(e) => set('iban', e.target.value)}
          />
          <Input label="BIC" value={v.bic} onChange={(e) => set('bic', e.target.value)} />
          <Input label="Bank" value={v.bank_name} onChange={(e) => set('bank_name', e.target.value)} />
        </div>
      </Card>

      <Card title="Angebot — Kosten & Anfahrt">
        <div className="form-grid-2">
          <Input
            label="Anfahrt Pauschale (netto, €)"
            type="number"
            min={0}
            step="0.01"
            value={v.anfahrt_pauschale_netto}
            onChange={(e) => set('anfahrt_pauschale_netto', e.target.value)}
          />
          <Input
            label="Bezeichnung Anfahrt"
            value={v.anfahrt_leistung_text}
            onChange={(e) => set('anfahrt_leistung_text', e.target.value)}
          />
          <Input
            label="Standard-Lohnanteil (%)"
            type="number"
            min={0}
            max={100}
            value={v.lohn_anteil_standard_prozent}
            onChange={(e) => set('lohn_anteil_standard_prozent', e.target.value)}
            hint="Derzeit ohne Wirkung: Bei Kostenart „Allgemein“ gibt es keine automatische Lohn-/Material-Aufteilung mehr. Nur bei expliziter Wahl „Arbeitskosten“ oder „Materialkosten“ (je 100 %)."
          />
        </div>
      </Card>

      <Card title="PDF-Einstellungen">
        <div className="form-grid-2">
          <Input
            label="Zahlungsziel (Tage)"
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
          <div className="w-full md:col-span-2">
            <label className="input-label" htmlFor="mwst_satz">
              MwSt. Standard
            </label>
            <select
              id="mwst_satz"
              className="input w-full max-w-xs"
              value={v.mwst_satz}
              onChange={(e) => set('mwst_satz', e.target.value)}
            >
              {MWST_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="flex cursor-pointer items-start gap-2 text-sm text-bw-text">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={v.kleinunternehmer === '1' || v.kleinunternehmer === 'true'}
                onChange={(e) => set('kleinunternehmer', e.target.checked ? '1' : '')}
              />
              <span>
                <span className="font-medium">Kleinunternehmer (§ 19 UStG)</span>
                <span className="mt-0.5 block text-xs text-bw-text-muted">
                  Auf Rechnungen wird keine Umsatzsteuer ausgewiesen; Pflichthinweis § 19 wird
                  automatisch ergänzt.
                </span>
              </span>
            </label>
          </div>
        </div>
        <div className="mt-4">
          <Textarea
            label="PDF Fußzeile"
            value={v.pdf_fusszeile}
            onChange={(e) => set('pdf_fusszeile', e.target.value)}
            rows={4}
          />
        </div>
      </Card>

      <Card title="Logo">
        <div className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => void onLogoFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="upload-area w-full"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? 'Wird hochgeladen…' : 'Logo auswählen (JPEG, PNG, WebP, SVG)'}
          </button>
          {v.logo_url ? (
            <div className="flex flex-wrap items-end gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={v.logo_url}
                alt="Logo-Vorschau"
                className="max-h-24 max-w-[240px] rounded border border-bw-border bg-white object-contain p-2"
              />
              <Button type="button" variant="secondary" onClick={removeLogo}>
                Eigenes Logo entfernen
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-bw-border bg-white p-4">
              <BrandLogo variant="green" height={44} />
              <p className="text-sm text-bw-text-muted">
                Standard-Baumlogo im CRM und in E-Mails. Optional eigenes Logo hochladen (ersetzt
                das Standardlogo in E-Mails).
              </p>
            </div>
          )}
        </div>
      </Card>

      <div className="flex justify-end pt-2">
        <Button type="button" variant="primary" loading={pending} onClick={() => save()}>
          Speichern
        </Button>
      </div>
    </div>
  )
}

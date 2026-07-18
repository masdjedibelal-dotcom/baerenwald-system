'use client'

import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockCard } from '@/components/mock-ui/MockCard'
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
        const next = { ...v, logo_url: j.url! }
        setV(next)
        const r = await saveEinstellungen(next)
        if (!r.ok) {
          toast.error(r.message)
          return
        }
        toast.success('Logo gespeichert')
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function removeLogo() {
    setV((s) => ({ ...s, logo_url: '' }))
    startTransition(async () => {
      const next = { ...v, logo_url: '' }
      const r = await saveEinstellungen(next)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Logo entfernt')
    })
  }

  const adresse = [v.strasse, [v.plz, v.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const bankLabel = [v.bank_name, v.iban ? `IBAN ${v.iban}` : ''].filter(Boolean).join(' · ') || '—'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <MockBtn sm kind="primary" icon="check" disabled={pending} onClick={() => save()}>
          Speichern
        </MockBtn>
      </div>

      <div className="einstellungen-firma-grid">
        <MockCard title="Stammdaten">
          <div className="space-y-3">
            <Input
              label="Firma"
              required
              value={v.firmenname}
              onChange={(e) => set('firmenname', e.target.value)}
            />
            <Input
              label="Inhaber"
              value={v.geschaeftsfuehrer}
              onChange={(e) => set('geschaeftsfuehrer', e.target.value)}
              placeholder="z. B. Beran Cakmak"
            />
            <div className="form-grid-2">
              <Input label="Straße" value={v.strasse} onChange={(e) => set('strasse', e.target.value)} />
              <Input label="Rechtsform" value={v.rechtsform} onChange={(e) => set('rechtsform', e.target.value)} />
              <Input label="PLZ" value={v.plz} onChange={(e) => set('plz', e.target.value)} />
              <Input label="Ort" value={v.ort} onChange={(e) => set('ort', e.target.value)} />
            </div>
            {adresse ? (
              <p className="text-[12px] text-[var(--text-3)]">Adresse: {adresse}</p>
            ) : null}
            <Input label="USt-IdNr." value={v.ust_id} onChange={(e) => set('ust_id', e.target.value)} />
            <Input
              label="Steuernummer"
              value={v.steuernummer}
              onChange={(e) => set('steuernummer', e.target.value)}
            />
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
            <div className="form-grid-2">
              <Input label="Bank" value={v.bank_name} onChange={(e) => set('bank_name', e.target.value)} />
              <Input label="BIC" value={v.bic} onChange={(e) => set('bic', e.target.value)} />
              <Input
                label="IBAN"
                value={v.iban}
                onChange={(e) => set('iban', e.target.value)}
                className="md:col-span-2"
              />
            </div>
            <p className="text-[12px] text-[var(--text-3)]">Bankverbindung: {bankLabel}</p>
          </div>
        </MockCard>

        <MockCard title="Brand & Rechnung">
          <div className="setting-row">
            <div>
              <div className="lbl">Logo</div>
              <div className="sub">Wird auf Rechnungen und Angeboten verwendet</div>
            </div>
            <MockBtn
              sm
              icon="upload"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? '…' : 'Hochladen'}
            </MockBtn>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => void onLogoFile(e.target.files?.[0] ?? null)}
          />
          {v.logo_url ? (
            <div className="mb-3 flex flex-wrap items-end gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={v.logo_url}
                alt="Logo-Vorschau"
                className="max-h-16 max-w-[180px] rounded border border-[var(--border)] bg-white object-contain p-2"
              />
              <MockBtn sm kind="ghost" onClick={removeLogo}>
                Entfernen
              </MockBtn>
            </div>
          ) : (
            <div className="mb-3 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-white p-3">
              <BrandLogo variant="green" height={36} />
              <p className="text-[12px] text-[var(--text-3)]">Standard-Logo aktiv</p>
            </div>
          )}

          <div className="setting-row">
            <div>
              <div className="lbl">Zahlungsziel</div>
              <div className="sub">Standardfrist nach Rechnungsversand</div>
            </div>
            <Input
              type="number"
              min={1}
              value={v.zahlungsziel_tage}
              onChange={(e) => set('zahlungsziel_tage', e.target.value)}
              className="w-[88px]"
            />
          </div>

          <div className="setting-row">
            <div>
              <div className="lbl">Angebot gültig</div>
              <div className="sub">Gültigkeit in Tagen</div>
            </div>
            <Input
              type="number"
              min={1}
              value={v.angebot_gueltig_tage}
              onChange={(e) => set('angebot_gueltig_tage', e.target.value)}
              className="w-[88px]"
            />
          </div>

          <div className="setting-row">
            <div>
              <div className="lbl">MwSt. Standard</div>
              <div className="sub">Standard-Steuersatz</div>
            </div>
            <select
              className="input w-[100px]"
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

          <label className="mt-2 flex cursor-pointer items-start gap-2 text-[13px] text-[var(--text)]">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={v.kleinunternehmer === '1' || v.kleinunternehmer === 'true'}
              onChange={(e) => set('kleinunternehmer', e.target.checked ? '1' : '')}
            />
            <span>
              <span className="font-medium">Kleinunternehmer (§ 19 UStG)</span>
              <span className="mt-0.5 block text-[11.5px] text-[var(--text-3)]">
                Keine Umsatzsteuer auf Rechnungen; Pflichthinweis wird ergänzt.
              </span>
            </span>
          </label>
        </MockCard>
      </div>

      <MockCard title="Angebot — Kosten & Anfahrt">
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
        </div>
      </MockCard>

      <MockCard title="PDF Fußzeile">
        <Textarea
          value={v.pdf_fusszeile}
          onChange={(e) => set('pdf_fusszeile', e.target.value)}
          rows={3}
        />
      </MockCard>

      <div className="flex justify-end">
        <Button type="button" variant="primary" loading={pending} onClick={() => save()}>
          Speichern
        </Button>
      </div>
    </div>
  )
}

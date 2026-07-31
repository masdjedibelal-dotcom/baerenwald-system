'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useMemo, useRef, useState } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { saveEinstellungen } from '@/app/(dashboard)/einstellungen/actions'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { toast } from '@/components/ui/app-toast'

function formatAdresse(v: FirmenEinstellungen): string {
  return [v.strasse, [v.plz, v.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

function formatBank(v: FirmenEinstellungen): string {
  const iban = v.iban?.trim()
  const short =
    iban && iban.length > 8 ? `IBAN …${iban.slice(-4)}` : iban ? `IBAN ${iban}` : ''
  return [v.bank_name?.trim(), short].filter(Boolean).join(' · ') || '—'
}

function parseAdresse(text: string, base: FirmenEinstellungen): FirmenEinstellungen {
  const next = { ...base }
  const parts = text.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) {
    next.strasse = text
    return next
  }
  next.strasse = parts[0] ?? text
  if (parts.length >= 2) {
    const m = parts[1]!.match(/^(\d{4,5})\s+(.+)$/)
    if (m) {
      next.plz = m[1]!
      next.ort = m[2]!
    } else {
      next.ort = parts[1]!
    }
  }
  return next
}

function parseBank(text: string, base: FirmenEinstellungen): FirmenEinstellungen {
  const next = { ...base }
  const ibanMatch = text.match(/IBAN\s*[.…]*\s*([A-Z0-9]+)/i)
  if (ibanMatch) {
    const raw = ibanMatch[1]!.replace(/[.…]/g, '')
    if (raw.length >= 8) next.iban = raw
  } else {
    const bare = text.match(/\b([A-Z]{2}\d{2}[A-Z0-9]{10,30})\b/i)
    if (bare) next.iban = bare[1]!.toUpperCase()
  }
  const namePart = text.split(/[·•|]/)[0]?.replace(/\s*IBAN.*/i, '').trim()
  if (namePart) next.bank_name = namePart
  return next
}

type EditDraft = {
  firmenname: string
  geschaeftsfuehrer: string
  adresse: string
  ust_id: string
  steuernummer: string
  handelsregister: string
  telefon: string
  email: string
  bank: string
}

/** Firma: Stammdaten-, Brand- und Rechnungs-Cards. */
export function FirmaBrandingForm({
  initial,
  naechsteRechnungsnummer,
}: {
  initial: FirmenEinstellungen
  naechsteRechnungsnummer?: string | null
}) {
  const [v, setV] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [draft, setDraft] = useState<EditDraft>(() => ({
    firmenname: initial.firmenname,
    geschaeftsfuehrer: initial.geschaeftsfuehrer,
    adresse: formatAdresse(initial),
    ust_id: initial.ust_id,
    steuernummer: initial.steuernummer,
    handelsregister: initial.pdf_fusszeile,
    telefon: initial.telefon,
    email: initial.email,
    bank: formatBank(initial) === '—' ? '' : formatBank(initial),
  }))
  const [editZahlungsziel, setEditZahlungsziel] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const zahlungszielLabel = useMemo(() => {
    const n = Number(v.zahlungsziel_tage) || 14
    return `${n} Tage`
  }, [v.zahlungsziel_tage])

  const reNrSub = useMemo(() => {
    const base = 'Format: RE-{JAHR}-{NNNN}'
    const nr = naechsteRechnungsnummer?.trim()
    return nr ? `${base} · aktuell ${nr}` : base
  }, [naechsteRechnungsnummer])

  const metaLine = useMemo(() => {
    const parts = [
      formatAdresse(v) || null,
      v.geschaeftsfuehrer?.trim() ? `Inhaber ${v.geschaeftsfuehrer.trim()}` : null,
    ].filter(Boolean)
    return parts.join(' · ')
  }, [v])

  function openEdit() {
    setDraft({
      firmenname: v.firmenname,
      geschaeftsfuehrer: v.geschaeftsfuehrer,
      adresse: formatAdresse(v),
      ust_id: v.ust_id,
      steuernummer: v.steuernummer,
      handelsregister: v.pdf_fusszeile,
      telefon: v.telefon,
      email: v.email,
      bank: formatBank(v) === '—' ? '' : formatBank(v),
    })
    setSheetOpen(true)
  }

  function saveStamm() {
    startTransition(async () => {
      let next: FirmenEinstellungen = {
        ...v,
        firmenname: draft.firmenname,
        geschaeftsfuehrer: draft.geschaeftsfuehrer,
        ust_id: draft.ust_id,
        steuernummer: draft.steuernummer,
        pdf_fusszeile: draft.handelsregister,
        telefon: draft.telefon,
        email: draft.email,
      }
      next = parseAdresse(draft.adresse, next)
      next = parseBank(draft.bank, next)
      const r = await saveEinstellungen(next)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setV(next)
      setSheetOpen(false)
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
        const next = { ...v, logo_url: j.url }
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

  function saveZahlungsziel(tage: string) {
    const cleaned = String(Math.max(1, Number(tage) || 14))
    const next = { ...v, zahlungsziel_tage: cleaned }
    setV(next)
    setEditZahlungsziel(false)
    startTransition(async () => {
      const r = await saveEinstellungen(next)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Zahlungsziel gespeichert')
    })
  }

  const detailRows: { label: string; value: string }[] = [
    { label: 'USt-IdNr.', value: v.ust_id?.trim() || '—' },
    { label: 'Steuernummer', value: v.steuernummer?.trim() || '—' },
    { label: 'Handelsregister', value: v.pdf_fusszeile?.trim() || '—' },
    { label: 'Bankverbindung', value: formatBank(v) },
  ]

  return (
    <div className="space-y-4">
      <MockCard
        title="Stammdaten"
        icon="clipboard-list"
        actions={
          <button
            type="button"
            className="qa-btn"
            title="Bearbeiten"
            aria-label="Stammdaten bearbeiten"
            onClick={openEdit}
          >
            <MockIcon ctx="default" n="pencil" size={14} />
          </button>
        }
      >
        <div className="vgid" style={{ marginBottom: 16 }}>
          <div className="vgid-name" style={{ fontSize: 'var(--fs-head)' }}>
            {v.firmenname?.trim() || '—'}
          </div>
          {metaLine ? (
            <div className="vgid-meta" style={{ marginTop: 4 }}>
              {metaLine}
            </div>
          ) : null}
          {(v.telefon?.trim() || v.email?.trim()) && (
            <div className="vgid-chips" style={{ marginTop: 12 }}>
              {v.telefon?.trim() ? (
                <a className="vgid-chip" href={`tel:${v.telefon.replace(/\s/g, '')}`}>
                  <MockIcon ctx="default" n="phone" size={14} />
                  {v.telefon.trim()}
                </a>
              ) : null}
              {v.email?.trim() ? (
                <a className="vgid-chip" href={`mailto:${v.email.trim()}`}>
                  <MockIcon ctx="default" n="mail" size={14} />
                  {v.email.trim()}
                </a>
              ) : null}
            </div>
          )}
        </div>

        <div className="props">
          {detailRows.map((r) => (
            <div key={r.label} className="prop">
              <div className="prop-l">{r.label}</div>
              <div className="prop-v">{r.value}</div>
            </div>
          ))}
        </div>
      </MockCard>

      <MockCard title="Brand" icon="photo">
        <div className="setting-row">
          <div>
            <div className="lbl">Logo</div>
            <div className="sub">Wird auf Rechnungen und Angeboten verwendet.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {v.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={v.logo_url}
                alt=""
                style={{
                  height: 28,
                  maxWidth: 72,
                  objectFit: 'contain',
                  borderRadius: 4,
                  border: '0.5px solid var(--border)',
                  background: '#fff',
                }}
              />
            ) : null}
            <MockBtn sm icon="upload" disabled={uploading || pending} onClick={() => fileRef.current?.click()}>
              {uploading ? '…' : 'Hochladen'}
            </MockBtn>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => void onLogoFile(e.target.files?.[0] ?? null)}
        />

        <div className="setting-row">
          <div>
            <div className="lbl">Primärfarbe</div>
            <div className="sub">Akzentfarbe in PDF-Vorlagen.</div>
          </div>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: 'var(--green)',
              border: '0.5px solid var(--border)',
            }}
            title="Markengrün"
          />
        </div>
      </MockCard>

      <MockCard title="Rechnung" icon="file-invoice">
        <div className="setting-row">
          <div>
            <div className="lbl">Rechnungsnummern</div>
            <div className="sub">{reNrSub}</div>
          </div>
          <MockBtn sm kind="ghost" onClick={() => toast.message('Rechnungsnummern: Anpassung folgt')}>
            Anpassen
          </MockBtn>
        </div>

        <div className="setting-row">
          <div>
            <div className="lbl">Zahlungsziel</div>
            <div className="sub">Standardfrist nach Rechnungsversand.</div>
          </div>
          {editZahlungsziel ? (
            <input
              className="txt"
              type="number"
              min={1}
              autoFocus
              defaultValue={v.zahlungsziel_tage || '14'}
              onBlur={(e) => saveZahlungsziel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveZahlungsziel((e.target as HTMLInputElement).value)
                if (e.key === 'Escape') setEditZahlungsziel(false)
              }}
              style={{ width: 72, height: 30, textAlign: 'right' }}
              aria-label="Zahlungsziel in Tagen"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditZahlungsziel(true)}
              style={{
                fontSize: 'var(--fs-text)',
                fontWeight: 500,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'var(--text)',
              }}
            >
              {zahlungszielLabel}
            </button>
          )}
        </div>
      </MockCard>

      <EditorSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Stammdaten bearbeiten"
        crumb="Firma >"
        size="lg"
        onConfirm={saveStamm}
        confirmDisabled={pending}
        confirmBusy={pending}
      >
        <div className="kunde-create">
          <MockFormSection title="Firma" icon="building">
            <MockField label="Firma" required full>
              <input
                className="input"
                value={draft.firmenname}
                onChange={(e) => setDraft((d) => ({ ...d, firmenname: e.target.value }))}
              />
            </MockField>
            <MockField label="Inhaber" full>
              <input
                className="input"
                value={draft.geschaeftsfuehrer}
                onChange={(e) => setDraft((d) => ({ ...d, geschaeftsfuehrer: e.target.value }))}
              />
            </MockField>
            <MockField label="Adresse" full>
              <input
                className="input"
                value={draft.adresse}
                onChange={(e) => setDraft((d) => ({ ...d, adresse: e.target.value }))}
                placeholder="Straße, PLZ Ort"
              />
            </MockField>
            <MockField label="Telefon">
              <input
                className="input"
                value={draft.telefon}
                onChange={(e) => setDraft((d) => ({ ...d, telefon: e.target.value }))}
              />
            </MockField>
            <MockField label="E-Mail">
              <input
                className="input"
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              />
            </MockField>
            <MockField label="USt-IdNr.">
              <input
                className="input"
                value={draft.ust_id}
                onChange={(e) => setDraft((d) => ({ ...d, ust_id: e.target.value }))}
              />
            </MockField>
            <MockField label="Steuernummer">
              <input
                className="input"
                value={draft.steuernummer}
                onChange={(e) => setDraft((d) => ({ ...d, steuernummer: e.target.value }))}
              />
            </MockField>
            <MockField label="Handelsregister" full>
              <input
                className="input"
                value={draft.handelsregister}
                onChange={(e) => setDraft((d) => ({ ...d, handelsregister: e.target.value }))}
                placeholder="HRB … · AG …"
              />
            </MockField>
            <MockField label="Bankverbindung" full>
              <input
                className="input"
                value={draft.bank}
                onChange={(e) => setDraft((d) => ({ ...d, bank: e.target.value }))}
                placeholder="Bank · IBAN …"
              />
            </MockField>
          </MockFormSection>
        </div>
      </EditorSheet>
    </div>
  )
}

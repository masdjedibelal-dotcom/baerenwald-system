'use client'

import { useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { saveEinstellungen } from '@/app/(dashboard)/einstellungen/actions'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { toast } from '@/components/ui/app-toast'

function Sec({
  title,
  actions,
  children,
}: {
  title: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
          paddingBottom: 8,
          borderBottom: '0.5px solid var(--border)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.01em' }}>{title}</span>
        <div style={{ flex: 1 }} />
        {actions}
      </div>
      <div>{children}</div>
    </div>
  )
}

type StammKey =
  | 'firmenname'
  | 'geschaeftsfuehrer'
  | 'adresse'
  | 'ust_id'
  | 'telefon'
  | 'email'
  | 'bank'

type StammRow = { key: StammKey; label: string; link?: boolean }

const STAMM_ROWS: StammRow[] = [
  { key: 'firmenname', label: 'Firma' },
  { key: 'geschaeftsfuehrer', label: 'Inhaber' },
  { key: 'adresse', label: 'Adresse' },
  { key: 'ust_id', label: 'USt-IdNr.' },
  { key: 'telefon', label: 'Telefon', link: true },
  { key: 'email', label: 'E-Mail', link: true },
  { key: 'bank', label: 'Bankverbindung' },
]

function formatAdresse(v: FirmenEinstellungen): string {
  return [v.strasse, [v.plz, v.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

function formatBank(v: FirmenEinstellungen): string {
  const iban = v.iban?.trim()
  const short =
    iban && iban.length > 8 ? `IBAN …${iban.slice(-4)}` : iban ? `IBAN ${iban}` : ''
  return [v.bank_name?.trim(), short].filter(Boolean).join(' · ') || '—'
}

function displayValue(v: FirmenEinstellungen, key: StammKey): string {
  if (key === 'adresse') return formatAdresse(v) || '—'
  if (key === 'bank') return formatBank(v)
  return (v[key] as string)?.trim() || '—'
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
    const m = parts[1].match(/^(\d{4,5})\s+(.+)$/)
    if (m) {
      next.plz = m[1]
      next.ort = m[2]
    } else {
      next.ort = parts[1]
    }
  }
  return next
}

function parseBank(text: string, base: FirmenEinstellungen): FirmenEinstellungen {
  const next = { ...base }
  const ibanMatch = text.match(/IBAN\s*[.…]*\s*([A-Z0-9]+)/i)
  if (ibanMatch) {
    const raw = ibanMatch[1].replace(/[.…]/g, '')
    if (raw.length >= 8) next.iban = raw
  } else {
    const bare = text.match(/\b([A-Z]{2}\d{2}[A-Z0-9]{10,30})\b/i)
    if (bare) next.iban = bare[1].toUpperCase()
  }
  const namePart = text.split(/[·•|]/)[0]?.replace(/\s*IBAN.*/i, '').trim()
  if (namePart) next.bank_name = namePart
  return next
}

export function FirmaBrandingForm({
  initial,
  naechsteRechnungsnummer,
}: {
  initial: FirmenEinstellungen
  /** z. B. „0184“ oder „2069“ für Anzeige unter Rechnungsnummern */
  naechsteRechnungsnummer?: string | null
}) {
  const [v, setV] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<StammKey, string>>(() => ({
    firmenname: initial.firmenname,
    geschaeftsfuehrer: initial.geschaeftsfuehrer,
    adresse: formatAdresse(initial),
    ust_id: initial.ust_id,
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

  function startEdit() {
    setDraft({
      firmenname: v.firmenname,
      geschaeftsfuehrer: v.geschaeftsfuehrer,
      adresse: formatAdresse(v),
      ust_id: v.ust_id,
      telefon: v.telefon,
      email: v.email,
      bank: formatBank(v) === '—' ? '' : formatBank(v),
    })
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
  }

  function saveStamm() {
    startTransition(async () => {
      let next: FirmenEinstellungen = {
        ...v,
        firmenname: draft.firmenname,
        geschaeftsfuehrer: draft.geschaeftsfuehrer,
        ust_id: draft.ust_id,
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
      setEditing(false)
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

  return (
    <div className="einstellungen-firma-grid">
      <Sec title="Stammdaten">
        <div className="props">
          {STAMM_ROWS.map((r) => {
            const value = displayValue(v, r.key)
            return (
              <div className="prop" key={r.key}>
                <div className="prop-l">{r.label}</div>
                {editing ? (
                  <input
                    className="txt"
                    style={{ height: 30 }}
                    value={draft[r.key]}
                    onChange={(e) => setDraft((d) => ({ ...d, [r.key]: e.target.value }))}
                    placeholder={r.key === 'bank' ? 'Bank · IBAN …' : undefined}
                  />
                ) : r.link && value !== '—' ? (
                  <div className="prop-v link">
                    {r.key === 'telefon' ? (
                      <a href={`tel:${value.replace(/\s/g, '')}`}>{value}</a>
                    ) : r.key === 'email' ? (
                      <a href={`mailto:${value}`}>{value}</a>
                    ) : (
                      value
                    )}
                  </div>
                ) : (
                  <div className="prop-v">{value}</div>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
          {editing ? (
            <>
              <MockBtn sm kind="primary" icon="check" disabled={pending} onClick={saveStamm}>
                Speichern
              </MockBtn>
              <MockBtn sm kind="ghost" disabled={pending} onClick={cancelEdit}>
                Abbrechen
              </MockBtn>
            </>
          ) : (
            <MockBtn sm onClick={startEdit}>
              Bearbeiten
            </MockBtn>
          )}
        </div>
      </Sec>

      <Sec title="Brand & Rechnung">
        <div className="setting-row">
          <div>
            <div className="lbl">Logo</div>
            <div className="sub">Wird auf Rechnungen und Angeboten verwendet</div>
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
            <div className="sub">Akzentfarbe in PDF-Vorlagen</div>
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
            <div className="sub">Standardfrist nach Rechnungsversand</div>
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
                fontSize: 13,
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
      </Sec>
    </div>
  )
}

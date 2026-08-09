'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useMemo, useState } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { saveEinstellungen } from '@/app/(dashboard)/einstellungen/actions'
import {
  firmZeileAdresse,
  type FirmenEinstellungen,
} from '@/lib/einstellungen-keys'
import { splitStrasseHausnummer } from '@/lib/kunde-stammdaten'
import { toast } from '@/components/ui/app-toast'

/** IBAN lesbar mit Leerzeichen (DE12 3456 …), Speichern ohne. */
function formatIbanAnzeige(iban: string): string {
  const clean = iban.replace(/\s+/g, '').toUpperCase()
  if (!clean) return ''
  return clean.replace(/(.{4})/g, '$1 ').trim()
}

function normalizeIban(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase()
}

function normalizeBic(bic: string): string {
  return bic.replace(/\s+/g, '').toUpperCase()
}

/** Legacy: Hausnummer steckte oft in `strasse` — beim Öffnen trennen. */
function resolveFirmaAnschrift(v: FirmenEinstellungen): { strasse: string; hausnummer: string } {
  const nr = v.hausnummer?.trim() || ''
  if (nr) return { strasse: v.strasse?.trim() || '', hausnummer: nr }
  const split = splitStrasseHausnummer(v.strasse?.trim() || '')
  return { strasse: split.strasse, hausnummer: split.hausnummer ?? '' }
}

type EditDraft = {
  firmenname: string
  geschaeftsfuehrer: string
  strasse: string
  hausnummer: string
  plz: string
  ort: string
  ust_id: string
  steuernummer: string
  handelsregister: string
  telefon: string
  email: string
  bank_name: string
  iban: string
  bic: string
}

function draftFromFirm(v: FirmenEinstellungen): EditDraft {
  const addr = resolveFirmaAnschrift(v)
  return {
    firmenname: v.firmenname,
    geschaeftsfuehrer: v.geschaeftsfuehrer,
    strasse: addr.strasse,
    hausnummer: addr.hausnummer,
    plz: v.plz ?? '',
    ort: v.ort ?? '',
    ust_id: v.ust_id,
    steuernummer: v.steuernummer,
    handelsregister: v.pdf_fusszeile,
    telefon: v.telefon,
    email: v.email,
    bank_name: v.bank_name ?? '',
    iban: formatIbanAnzeige(v.iban ?? ''),
    bic: (v.bic ?? '').toUpperCase(),
  }
}

/** Firma: nur Stammdaten. Logo/Brand/Rechnung bleiben System-Defaults (Wizard). */
export function FirmaBrandingForm({ initial }: { initial: FirmenEinstellungen }) {
  const [v, setV] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [draft, setDraft] = useState<EditDraft>(() => draftFromFirm(initial))

  const metaLine = useMemo(() => {
    const parts = [
      firmZeileAdresse(v) || null,
      v.geschaeftsfuehrer?.trim() ? `Inhaber ${v.geschaeftsfuehrer.trim()}` : null,
    ].filter(Boolean)
    return parts.join(' · ')
  }, [v])

  function openEdit() {
    setDraft(draftFromFirm(v))
    setSheetOpen(true)
  }

  function saveStamm() {
    startTransition(async () => {
      const next: FirmenEinstellungen = {
        ...v,
        firmenname: draft.firmenname,
        geschaeftsfuehrer: draft.geschaeftsfuehrer,
        strasse: draft.strasse.trim(),
        hausnummer: draft.hausnummer.trim(),
        plz: draft.plz.trim(),
        ort: draft.ort.trim(),
        ust_id: draft.ust_id,
        steuernummer: draft.steuernummer,
        pdf_fusszeile: draft.handelsregister,
        telefon: draft.telefon,
        email: draft.email,
        bank_name: draft.bank_name.trim(),
        iban: normalizeIban(draft.iban),
        bic: normalizeBic(draft.bic),
      }
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

  const detailRows: { label: string; value: string }[] = [
    { label: 'Adresse', value: firmZeileAdresse(v) || '—' },
    { label: 'USt-IdNr.', value: v.ust_id?.trim() || '—' },
    { label: 'Steuernummer', value: v.steuernummer?.trim() || '—' },
    { label: 'Handelsregister', value: v.pdf_fusszeile?.trim() || '—' },
    { label: 'Bankname', value: v.bank_name?.trim() || '—' },
    { label: 'IBAN', value: formatIbanAnzeige(v.iban ?? '') || '—' },
    { label: 'BIC', value: v.bic?.trim() || '—' },
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
            <MockIcon ctx="btn" n="pencil" size={16} />
          </button>
        }
      >
        <div className="mb-3">
          <div className="text-[length:var(--fs-head)] font-semibold text-[var(--text)]">
            {v.firmenname?.trim() || 'Firma'}
          </div>
          {metaLine ? (
            <div className="mt-1 text-[length:var(--fs-meta)] text-[var(--text-3)]">{metaLine}</div>
          ) : null}
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
          <MockFormSection title="Firma" icon="building" columns={2}>
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
            <MockField label="Straße">
              <input
                className="input"
                value={draft.strasse}
                onChange={(e) => setDraft((d) => ({ ...d, strasse: e.target.value }))}
                placeholder="Bärenwaldstraße"
                autoComplete="address-line1"
              />
            </MockField>
            <MockField label="Hausnummer">
              <input
                className="input"
                value={draft.hausnummer}
                onChange={(e) => setDraft((d) => ({ ...d, hausnummer: e.target.value }))}
                placeholder="20"
                autoComplete="address-line2"
              />
            </MockField>
            <div className="kunde-create__plz-ort full">
              <MockField label="PLZ">
                <input
                  className="input"
                  value={draft.plz}
                  onChange={(e) => setDraft((d) => ({ ...d, plz: e.target.value }))}
                  placeholder="81737"
                  autoComplete="postal-code"
                  inputMode="numeric"
                />
              </MockField>
              <MockField label="Ort">
                <input
                  className="input"
                  value={draft.ort}
                  onChange={(e) => setDraft((d) => ({ ...d, ort: e.target.value }))}
                  placeholder="München"
                  autoComplete="address-level2"
                />
              </MockField>
            </div>
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
          </MockFormSection>

          <MockFormSection title="Bankverbindung" icon="building">
            <MockField label="Bankname" full>
              <input
                className="input"
                value={draft.bank_name}
                onChange={(e) => setDraft((d) => ({ ...d, bank_name: e.target.value }))}
                placeholder="z. B. Postbank"
                autoComplete="off"
              />
            </MockField>
            <MockField label="IBAN" full>
              <input
                className="input"
                value={draft.iban}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, iban: formatIbanAnzeige(e.target.value) }))
                }
                placeholder="DE00 0000 0000 0000 0000 00"
                autoComplete="off"
                spellCheck={false}
              />
            </MockField>
            <MockField label="BIC" full>
              <input
                className="input"
                value={draft.bic}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, bic: normalizeBic(e.target.value) }))
                }
                placeholder="z. B. PBNKDEFF"
                autoComplete="off"
                spellCheck={false}
              />
            </MockField>
          </MockFormSection>
        </div>
      </EditorSheet>
    </div>
  )
}

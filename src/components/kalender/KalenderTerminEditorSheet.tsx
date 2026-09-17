'use client'

import { useEffect, useId, useMemo, useState, useTransition, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Combobox } from '@/components/ui/Combobox'
import { DateInput } from '@/components/ui/DateInput'
import { FilterRangeRow } from '@/components/ui/FilterRangeRow'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { TimeInput } from '@/components/ui/TimeInput'
import { toast } from '@/components/ui/app-toast'
import { confirmDelete } from '@/components/ui/confirm-delete'
import {
  deleteKalenderTermin,
  loadTerminLinkAdresse,
  saveKalenderTermin,
} from '@/app/(dashboard)/kalender/actions'
import { searchVorgaengeFuerTodo } from '@/app/(dashboard)/kalender/todo-actions'
import { listKundenFuerCombobox } from '@/app/(dashboard)/kunden/kunde-combobox-actions'
import { kalenderTypLabel } from '@/lib/kalender-styles'
import {
  formatTerminAdresse,
  parseTerminAdresse,
  TERMIN_KATEGORIE_OPTIONS,
  terminKategorieFarbe,
  terminKategorieLabel,
  terminTypToKategorie,
  type TerminKategorie,
  type TerminKatFarbe,
} from '@/lib/kalender/termin-kategorien'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import type { KalenderTermin, Kunde } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  kalenderTerminEndeVergangen,
} from '@/lib/kalender/termin-no-show-hint'

export type MockKat = TerminKatFarbe

/** @deprecated — nutze terminTypToKategorie / terminKategorieFarbe */
export function typToKat(typ: KalenderTermin['typ'] | string): MockKat {
  return terminKategorieFarbe(terminTypToKategorie(typ))
}

/** @deprecated — nutze terminKategorieLabel */
export function katLabel(kat: MockKat): string {
  if (kat === 'green') return 'Vor-Ort Termin'
  if (kat === 'yellow') return 'Abnahme'
  return 'Allgemein'
}

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatHm(t: string | null | undefined): string {
  if (!t?.trim()) return ''
  return t.trim().slice(0, 5)
}

function normalizeTimeInput(t: string): string | null {
  const v = t.trim()
  if (!v) return null
  if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`
  if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v
  return v
}

function applyAdresseParts(
  setStrasse: (v: string) => void,
  setHausnummer: (v: string) => void,
  setPlz: (v: string) => void,
  parts: { strasse: string; hausnummer: string; plz: string }
) {
  setStrasse(parts.strasse)
  setHausnummer(parts.hausnummer)
  setPlz(parts.plz)
}

function formatDatumLabel(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function Prop({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="prop">
      <span className="prop-l">{label}</span>
      <span className="prop-v">{children}</span>
    </div>
  )
}

function katDotColor(kat: MockKat): string {
  if (kat === 'yellow') return '#D9A800'
  if (kat === 'blue') return 'var(--blue-tx)'
  return 'var(--green)'
}

export type KalenderTerminEditorPrefill = {
  day?: Date
  startHour?: number
}

/**
 * Slideover / Bottom-Sheet: Termin ansehen → Bearbeiten, oder neu anlegen.
 */
export function KalenderTerminEditorSheet({
  open,
  termin,
  prefill,
  startInEdit = false,
  onClose,
  onSaved,
}: {
  open: boolean
  /** `null` = neu */
  termin: KalenderTermin | null
  prefill?: KalenderTerminEditorPrefill | null
  /** Bestehenden Termin direkt im Bearbeiten-Modus öffnen */
  startInEdit?: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const formId = useId()
  const [mode, setMode] = useState<'view' | 'edit'>('edit')
  const [pending, startTransition] = useTransition()
  const [titel, setTitel] = useState('')
  const [kategorie, setKategorie] = useState<TerminKategorie>('vor_ort')
  const [datum, setDatum] = useState('')
  const [von, setVon] = useState('09:00')
  const [bis, setBis] = useState('10:00')
  const [strasse, setStrasse] = useState('')
  const [hausnummer, setHausnummer] = useState('')
  const [plz, setPlz] = useState('')
  const [desc, setDesc] = useState('')
  const [kundeId, setKundeId] = useState('')
  const [vorgangKey, setVorgangKey] = useState('')
  const [leadId, setLeadId] = useState<string | null>(null)
  const [auftragId, setAuftragId] = useState<string | null>(null)
  const [kundeOpts, setKundeOpts] = useState<{ value: string; label: string; sub?: string }[]>([])
  const [kundenById, setKundenById] = useState<Map<string, Kunde>>(new Map())
  const [vorgangOpts, setVorgangOpts] = useState<{ value: string; label: string; sub?: string }[]>(
    []
  )

  const isNew = !termin
  const isView = !isNew && mode === 'view'

  useEffect(() => {
    if (!open) return
    setMode(termin ? (startInEdit ? 'edit' : 'view') : 'edit')
    if (termin) {
      setTitel(termin.titel)
      setKategorie(terminTypToKategorie(termin.typ))
      setDatum(termin.datum.slice(0, 10))
      setVon(formatHm(termin.uhrzeit_von) || '09:00')
      setBis(formatHm(termin.uhrzeit_bis) || '10:00')
      const parsed = parseTerminAdresse(termin.adresse)
      setStrasse(parsed.strasse)
      setHausnummer(parsed.hausnummer)
      setPlz(parsed.plz)
      setDesc(termin.beschreibung ?? '')
      setKundeId(termin.kunde_id ?? '')
      setLeadId(termin.lead_id)
      setAuftragId(termin.auftrag_id)
      if (termin.auftrag_id) setVorgangKey(`a:${termin.auftrag_id}`)
      else if (termin.lead_id) setVorgangKey(`l:${termin.lead_id}`)
      else setVorgangKey('')
    } else {
      const d = prefill?.day ?? new Date()
      setTitel('')
      setKategorie('vor_ort')
      setDatum(ymd(d))
      const sh = prefill?.startHour
      if (sh != null) {
        const vonStr = `${String(Math.floor(sh)).padStart(2, '0')}:${sh % 1 ? '30' : '00'}`
        const bisH = sh + 1
        const bisStr = `${String(Math.floor(bisH)).padStart(2, '0')}:${bisH % 1 ? '30' : '00'}`
        setVon(vonStr)
        setBis(bisStr)
      } else {
        setVon('09:00')
        setBis('10:00')
      }
      setStrasse('')
      setHausnummer('')
      setPlz('')
      setDesc('')
      setKundeId('')
      setVorgangKey('')
      setLeadId(null)
      setAuftragId(null)
    }

    void listKundenFuerCombobox().then((r) => {
      setKundenById(new Map(r.kunden.map((k) => [k.id, k])))
      setKundeOpts(
        r.kunden.map((k) => ({
          value: k.id,
          label: kundeDisplayName(k),
          sub: [k.plz, k.ort].filter(Boolean).join(' ') || undefined,
        }))
      )
    })
    void searchVorgaengeFuerTodo().then((r) => {
      if (r.ok) setVorgangOpts(r.options)
    })
  }, [open, termin, prefill, startInEdit])

  const kategorieOptions = useMemo(
    () => TERMIN_KATEGORIE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    []
  )

  const detailKat = typToKat(termin?.typ ?? kategorie)
  const detailZeit =
    von || bis
      ? `${formatHm(von)}${bis ? `–${formatHm(bis)}` : ''} Uhr`
      : '—'
  const adresseLabel = formatTerminAdresse({ strasse, hausnummer, plz }) || '—'
  const kundeLabel =
    kundenById.get(kundeId)
      ? kundeDisplayName(kundenById.get(kundeId)!)
      : termin?.auftraege?.kunden?.name?.trim() ||
        termin?.leads?.kontakt_name?.trim() ||
        (kundeId ? '—' : '—')
  const vorgangLabel =
    termin?.auftraege?.titel?.trim() ||
    (termin?.leads?.kontakt_name?.trim()
      ? `Anfrage · ${termin.leads.kontakt_name.trim()}`
      : null) ||
    vorgangOpts.find((o) => o.value === vorgangKey)?.label ||
    '—'
  const noShowHinweis =
    termin &&
    !termin.erledigt &&
    kalenderTerminEndeVergangen(termin) &&
    (termin.typ === 'besichtigung' ||
      termin.typ === 'vor_ort' ||
      termin.typ === 'aufmass' ||
      termin.lead_id)

  async function fillAdresseFromLink(opts: {
    kundeId?: string | null
    leadId?: string | null
    auftragId?: string | null
  }) {
    const res = await loadTerminLinkAdresse(opts)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    applyAdresseParts(setStrasse, setHausnummer, setPlz, {
      strasse: res.strasse,
      hausnummer: res.hausnummer,
      plz: res.plz,
    })
    if (!titel.trim()) setTitel(res.label)
  }

  function onKundeChange(id: string) {
    setKundeId(id)
    if (!id) return
    const k = kundenById.get(id)
    if (k) {
      applyAdresseParts(setStrasse, setHausnummer, setPlz, {
        strasse: k.strasse?.trim() || '',
        hausnummer: k.hausnummer?.trim() || '',
        plz: k.plz?.trim() || '',
      })
      if (!titel.trim()) setTitel(kundeDisplayName(k))
      return
    }
    void fillAdresseFromLink({ kundeId: id })
  }

  function onVorgangChange(key: string) {
    setVorgangKey(key)
    if (key.startsWith('a:')) {
      const id = key.slice(2)
      setAuftragId(id)
      setLeadId(null)
      void fillAdresseFromLink({ auftragId: id })
    } else if (key.startsWith('l:')) {
      const id = key.slice(2)
      setLeadId(id)
      setAuftragId(null)
      void fillAdresseFromLink({ leadId: id })
    } else {
      setLeadId(null)
      setAuftragId(null)
    }
  }

  function save() {
    startTransition(async () => {
      const adresse = formatTerminAdresse({ strasse, hausnummer, plz }) || null
      const res = await saveKalenderTermin({
        id: termin?.id,
        titel,
        typ: kategorie,
        datum,
        uhrzeit_von: normalizeTimeInput(von),
        uhrzeit_bis: normalizeTimeInput(bis),
        adresse,
        beschreibung: desc.trim() || null,
        lead_id: leadId,
        auftrag_id: auftragId,
        kunde_id: kundeId || null,
        zugewiesen_an: termin?.zugewiesen_an ?? null,
        erledigt: termin?.erledigt ?? false,
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success(
        termin ? 'Termin gespeichert' : `Termin „${titel.trim() || 'Neuer Termin'}“ angelegt`
      )
      onClose()
      onSaved()
    })
  }

  function onDelete() {
    if (!termin) return
    confirmDelete('Termin löschen?', async () => {
      const res = await deleteKalenderTermin(termin.id)
      if (!res.ok) {
        toast.error(res.message)
        throw new Error(res.message)
      }
      toast.success('Termin gelöscht')
      onClose()
      onSaved()
    })
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault()
    save()
  }

  const sheetTitle = isNew ? 'Neuer Termin' : isView ? 'Termin' : 'Termin bearbeiten'

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={sheetTitle}
      context="detail"
      size="md"
      confirmBusy={pending}
      onConfirm={
        isView
          ? undefined
          : () => {
              const form = document.getElementById(formId) as HTMLFormElement | null
              if (form?.reportValidity()) save()
            }
      }
      headerEnd={
        isView ? (
          <div className="cal-termin-detail__header-actions">
            <button
              type="button"
              className="btn ghost sm danger"
              disabled={pending}
              onClick={() => void onDelete()}
            >
              Löschen
            </button>
            <button type="button" className="btn ghost sm" onClick={() => setMode('edit')}>
              Bearbeiten
            </button>
          </div>
        ) : undefined
      }
    >
      {isView ? (
        <div className="cal-termin-detail">
          <div className="cal-termin-detail__card">
            <h3 className="cal-termin-detail__title">
              <span
                className="cal-termin-detail__kat-dot"
                style={{ background: katDotColor(detailKat) }}
                aria-hidden
              />
              <span>{titel.trim() || 'Ohne Titel'}</span>
            </h3>
            <div className="props">
              <Prop label="Kategorie">
                {terminKategorieLabel(kategorie)}
                <span className="text-[length:var(--fs-meta)] text-[var(--text-3)]">
                  {' '}
                  · {kalenderTypLabel(termin?.typ ?? kategorie)}
                </span>
              </Prop>
              <Prop label="Datum">{datum ? formatDatumLabel(datum) : '—'}</Prop>
              <Prop label="Zeit">{detailZeit}</Prop>
              <Prop label="Adresse">{adresseLabel}</Prop>
              <Prop label="Kunde">{kundeLabel}</Prop>
              <Prop label="Vorgang">{vorgangLabel}</Prop>
              <Prop label="Status">{termin?.erledigt ? 'Erledigt' : 'Offen'}</Prop>
              {desc.trim() ? (
                <Prop label="Notiz">
                  <span className="cal-termin-detail__notiz">{desc.trim()}</span>
                </Prop>
              ) : null}
            </div>
            {noShowHinweis ? (
              <p className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-[length:var(--fs-text)] text-[var(--text-3)]">
                Kunde nicht erschienen? In der Anfrage{' '}
                <strong className="font-medium text-[var(--text)]">Aktionen → Nicht erreichbar</strong>{' '}
                setzen.
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <form id={formId} onSubmit={submitForm} className="form-grid">
          <div className="full">
            <Input
              label="Titel"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="z.B. Vor-Ort Termin Koch"
              required
              autoFocus
            />
          </div>
          <div className="full">
            <Select
              label="Kategorie"
              value={kategorie}
              options={kategorieOptions}
              onChange={(e) => setKategorie(e.target.value as TerminKategorie)}
              required
            />
          </div>
          <div className="full">
            <span className="input-label">
              Datum
              <span className="ml-0.5 text-bw-accent" aria-hidden>
                *
              </span>
            </span>
            <DateInput
              size="sm"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              required
            />
          </div>
          <div className="full">
            <FilterRangeRow
              title="Uhrzeit"
              className="!mb-0"
              von={
                <TimeInput size="sm" value={von} onChange={(e) => setVon(e.target.value)} />
              }
              bis={
                <TimeInput size="sm" value={bis} onChange={(e) => setBis(e.target.value)} />
              }
            />
          </div>

          <div className="full">
            <Combobox
              label="Kunde (optional)"
              value={kundeId}
              options={[{ value: '', label: 'Kein Kunde' }, ...kundeOpts]}
              onChange={onKundeChange}
              placeholder="Kunde suchen…"
              emptyLabel="Kein Kunde"
            />
          </div>
          <div className="full">
            <Combobox
              label="Vorgang (optional)"
              value={vorgangKey}
              options={[{ value: '', label: 'Kein Vorgang' }, ...vorgangOpts]}
              onChange={onVorgangChange}
              placeholder="Anfrage oder Auftrag…"
              emptyLabel="Kein Vorgang"
            />
          </div>

          <div className="full form-grid" style={{ margin: 0 }}>
            <div className="full">
              <Input
                label="Anschrift"
                value={strasse}
                onChange={(e) => setStrasse(e.target.value)}
                placeholder="Musterstraße"
                autoComplete="street-address"
              />
            </div>
            <Input
              label="Hausnummer"
              value={hausnummer}
              onChange={(e) => setHausnummer(e.target.value)}
              placeholder="12"
            />
            <Input
              label="PLZ"
              value={plz}
              onChange={(e) => setPlz(e.target.value)}
              placeholder="80331"
              inputMode="numeric"
              autoComplete="postal-code"
            />
          </div>

          <div className="full">
            <Textarea
              label="Beschreibung"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
            />
          </div>
        </form>
      )}
    </EditorSheet>
  )
}

/** Runder + wie To-dos — für Kalender-Toolbar. */
export function KalenderAddButton({
  onClick,
  label = 'Neuer Termin',
}: {
  onClick: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      className="cal-toolbar__add"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <Plus className="h-5 w-5" aria-hidden />
    </button>
  )
}

export { terminKategorieLabel, terminTypToKategorie }

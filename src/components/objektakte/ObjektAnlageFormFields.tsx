'use client'

import { useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { MockField } from '@/components/mock-ui/MockForm'
import { DateInput } from '@/components/ui/DateInput'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import {
  OBJEKT_ANLAGE_STATUS,
  OBJEKT_ANLAGE_STATUS_LABELS,
  OBJEKT_ANLAGE_WARTUNGSINTERVALL,
  OBJEKT_ANLAGE_WARTUNGSINTERVALL_LABELS,
} from '@/lib/objektakte/labels'
import type { ObjektAnlageStatus, ObjektEinheit } from '@/lib/objektakte/types'
import type { ObjektAnlageWartungsintervall } from '@/lib/objektakte/labels'
import type { Gewerk } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/app-toast'

export type ObjektAnlageFormState = {
  bezeichnung: string
  gewerkId: string
  standort: string
  einheitId: string
  fotoUrl: string
  notiz: string
  status: ObjektAnlageStatus
  hersteller: string
  modell: string
  seriennummer: string
  einbauDatum: string
  anschaffungswert: string
  garantieBis: string
  gewaehrleistungBis: string
  wartungsintervall: ObjektAnlageWartungsintervall | ''
  letzteWartungAm: string
  dokumentUrls: string[]
}

export function emptyAnlageFormState(gewerke: Gewerk[]): ObjektAnlageFormState {
  return {
    bezeichnung: '',
    gewerkId: gewerke[0]?.id ?? '',
    standort: '',
    einheitId: '',
    fotoUrl: '',
    notiz: '',
    status: 'aktiv',
    hersteller: '',
    modell: '',
    seriennummer: '',
    einbauDatum: '',
    anschaffungswert: '',
    garantieBis: '',
    gewaehrleistungBis: '',
    wartungsintervall: '',
    letzteWartungAm: '',
    dokumentUrls: [],
  }
}

function fmtJahr(iso: string | null | undefined): string {
  if (!iso?.trim()) return ''
  if (/^\d{4}$/.test(iso.trim())) return iso.trim()
  const d = new Date(iso)
  if (!Number.isNaN(d.getTime())) return String(d.getFullYear())
  return iso.slice(0, 10)
}

export function anlageFormStateFromRow(a: {
  bezeichnung: string
  gewerk_id: string
  standort?: string | null
  objekt_einheit_id?: string | null
  foto_url?: string | null
  notiz?: string | null
  status: ObjektAnlageStatus
  hersteller?: string | null
  modell?: string | null
  seriennummer?: string | null
  einbau_datum?: string | null
  anschaffungswert_eur?: number | null
  garantie_bis?: string | null
  gewaehrleistung_bis?: string | null
  wartungsintervall?: ObjektAnlageWartungsintervall | null
  letzte_wartung_am?: string | null
  dokument_urls?: string[] | null
}): ObjektAnlageFormState {
  return {
    bezeichnung: a.bezeichnung,
    gewerkId: a.gewerk_id,
    standort: a.standort ?? '',
    einheitId: a.objekt_einheit_id ?? '',
    fotoUrl: a.foto_url ?? '',
    notiz: a.notiz ?? '',
    status: a.status,
    hersteller: a.hersteller ?? '',
    modell: a.modell ?? '',
    seriennummer: a.seriennummer ?? '',
    einbauDatum: fmtJahr(a.einbau_datum) || a.einbau_datum?.slice(0, 10) || '',
    anschaffungswert:
      a.anschaffungswert_eur != null && Number.isFinite(a.anschaffungswert_eur)
        ? String(a.anschaffungswert_eur).replace('.', ',')
        : '',
    garantieBis: a.garantie_bis?.slice(0, 10) ?? '',
    gewaehrleistungBis: a.gewaehrleistung_bis?.slice(0, 10) ?? '',
    wartungsintervall: a.wartungsintervall ?? '',
    letzteWartungAm: a.letzte_wartung_am?.slice(0, 10) ?? '',
    dokumentUrls: [...(a.dokument_urls ?? [])],
  }
}

export function anlageInputFromFormState(s: ObjektAnlageFormState) {
  const anschaffungswert = s.anschaffungswert.trim()
    ? Number(s.anschaffungswert.replace(/\./g, '').replace(',', '.'))
    : null
  return {
    bezeichnung: s.bezeichnung,
    gewerk_id: s.gewerkId,
    standort: s.standort,
    objekt_einheit_id: s.einheitId.trim() || null,
    foto_url: s.fotoUrl.trim() || null,
    notiz: s.notiz,
    status: s.status,
    hersteller: s.hersteller,
    modell: s.modell,
    seriennummer: s.seriennummer,
    einbau_datum: s.einbauDatum.trim() || null,
    anschaffungswert_eur: Number.isFinite(anschaffungswert as number)
      ? (anschaffungswert as number)
      : null,
    garantie_bis: s.garantieBis.trim() || null,
    gewaehrleistung_bis: s.gewaehrleistungBis.trim() || null,
    wartungsintervall: s.wartungsintervall || null,
    letzte_wartung_am: s.letzteWartungAm.trim() || null,
    dokument_urls: s.dokumentUrls,
  }
}

async function uploadKundeDatei(kundeId: string, file: File): Promise<string> {
  const fd = new FormData()
  fd.set('file', file)
  fd.set('filename', file.name)
  const res = await fetch(`/api/kunden/${kundeId}/dokument/upload`, {
    method: 'POST',
    body: fd,
  })
  const json = (await res.json()) as { url?: string; error?: string }
  if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload fehlgeschlagen')
  return json.url
}

type Props = {
  kundeId: string
  gewerke: Gewerk[]
  einheiten?: ObjektEinheit[]
  state: ObjektAnlageFormState
  onChange: (patch: Partial<ObjektAnlageFormState>) => void
  onDirty?: () => void
  /** Nur Bezeichnung + Gewerk sichtbar — Rest unter „Weitere Details“. */
  compact?: boolean
  detailsDefaultOpen?: boolean
  disabled?: boolean
}

export function ObjektAnlageFormFields({
  kundeId,
  gewerke,
  einheiten = [],
  state,
  onChange,
  onDirty,
  compact = false,
  detailsDefaultOpen = false,
  disabled = false,
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(detailsDefaultOpen)
  const [uploading, setUploading] = useState(false)
  const fotoRef = useRef<HTMLInputElement>(null)
  const dokRef = useRef<HTMLInputElement>(null)

  const gewerkOptions = gewerke.map((g) => ({ value: g.id, label: g.name }))
  const einheitOptions = einheiten
    .filter((e) => e.aktiv !== false)
    .map((e) => ({
      value: e.id,
      label: e.etage?.trim() ? `${e.bezeichnung} · ${e.etage}` : e.bezeichnung,
    }))

  function patch(p: Partial<ObjektAnlageFormState>) {
    onChange(p)
    onDirty?.()
  }

  async function uploadFoto(file: File) {
    setUploading(true)
    try {
      const url = await uploadKundeDatei(kundeId, file)
      patch({ fotoUrl: url })
      toast.success('Foto hochgeladen')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
      if (fotoRef.current) fotoRef.current.value = ''
    }
  }

  async function uploadDokumente(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 10)
    if (!list.length) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of list) {
        urls.push(await uploadKundeDatei(kundeId, file))
      }
      patch({ dokumentUrls: [...state.dokumentUrls, ...urls].slice(0, 20) })
      toast.success(list.length === 1 ? 'Dokument hochgeladen' : `${list.length} Dokumente hochgeladen`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
      if (dokRef.current) dokRef.current.value = ''
    }
  }

  const detailsBody = (
    <>
      <MockField label="Foto">
        <input
          ref={fotoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void uploadFoto(f)
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn sm ghost"
            disabled={disabled || uploading}
            onClick={() => fotoRef.current?.click()}
          >
            {state.fotoUrl ? 'Foto ersetzen' : 'Foto hochladen'}
          </button>
          {state.fotoUrl ? (
            <>
              <a
                href={state.fotoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-bw-link text-[length:var(--fs-meta)] hover:underline"
              >
                Ansehen
              </a>
              <button
                type="button"
                className="btn sm ghost"
                disabled={disabled}
                onClick={() => patch({ fotoUrl: '' })}
              >
                Entfernen
              </button>
            </>
          ) : null}
        </div>
      </MockField>

      <MockField label="Notiz">
        <Textarea
          value={state.notiz}
          onChange={(e) => patch({ notiz: e.target.value })}
          rows={3}
          placeholder="Besonderheiten, Zugang …"
          disabled={disabled}
        />
      </MockField>

      <MockField label="Status">
        <Select
          value={state.status}
          onChange={(e) => patch({ status: e.target.value as ObjektAnlageStatus })}
          disabled={disabled}
          options={OBJEKT_ANLAGE_STATUS.map((s) => ({
            value: s,
            label: OBJEKT_ANLAGE_STATUS_LABELS[s],
          }))}
        />
      </MockField>

      <MockField label="Hersteller">
        <input
          className="input"
          value={state.hersteller}
          onChange={(e) => patch({ hersteller: e.target.value })}
          placeholder="z. B. Viessmann"
          disabled={disabled}
        />
      </MockField>

      <MockField label="Modell / Typ">
        <input
          className="input"
          value={state.modell}
          onChange={(e) => patch({ modell: e.target.value })}
          placeholder="z. B. Vitodens 200-W"
          disabled={disabled}
        />
      </MockField>

      <MockField label="Seriennummer">
        <input
          className="input"
          value={state.seriennummer}
          onChange={(e) => patch({ seriennummer: e.target.value })}
          placeholder="Optional"
          disabled={disabled}
        />
      </MockField>

      <MockField label="Einbaudatum">
        <DateInput
          value={state.einbauDatum}
          onChange={(e) => patch({ einbauDatum: e.target.value })}
          disabled={disabled}
        />
      </MockField>

      <MockField label="Anschaffungs-/Neuwert (€)">
        <input
          className="input"
          inputMode="decimal"
          value={state.anschaffungswert}
          onChange={(e) => patch({ anschaffungswert: e.target.value })}
          placeholder="Optional"
          disabled={disabled}
        />
      </MockField>

      <MockField label="Garantie bis">
        <DateInput
          value={state.garantieBis}
          onChange={(e) => patch({ garantieBis: e.target.value })}
          disabled={disabled}
        />
      </MockField>

      <MockField label="Gewährleistung bis">
        <DateInput
          value={state.gewaehrleistungBis}
          onChange={(e) => patch({ gewaehrleistungBis: e.target.value })}
          disabled={disabled}
        />
      </MockField>

      <MockField label="Wartungsintervall">
        <Select
          value={state.wartungsintervall}
          onChange={(e) =>
            patch({
              wartungsintervall: e.target.value as ObjektAnlageWartungsintervall | '',
            })
          }
          disabled={disabled}
          options={[
            { value: '', label: '—' },
            ...OBJEKT_ANLAGE_WARTUNGSINTERVALL.map((w) => ({
              value: w,
              label: OBJEKT_ANLAGE_WARTUNGSINTERVALL_LABELS[w],
            })),
          ]}
        />
      </MockField>

      <MockField label="Letzte Wartung am">
        <DateInput
          value={state.letzteWartungAm}
          onChange={(e) => patch({ letzteWartungAm: e.target.value })}
          disabled={disabled}
        />
      </MockField>

      <MockField label="Dokumente">
        <input
          ref={dokRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => {
            if (e.target.files?.length) void uploadDokumente(e.target.files)
          }}
        />
        <div className="space-y-2">
          <button
            type="button"
            className="btn sm ghost"
            disabled={disabled || uploading}
            onClick={() => dokRef.current?.click()}
          >
            Dokumente hinzufügen
          </button>
          {state.dokumentUrls.length ? (
            <ul className="space-y-1">
              {state.dokumentUrls.map((url, i) => (
                <li key={`${url}-${i}`} className="flex items-center gap-2 text-[length:var(--fs-meta)]">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-bw-link hover:underline truncate"
                  >
                    Dokument {i + 1}
                  </a>
                  <button
                    type="button"
                    className="btn sm ghost shrink-0"
                    disabled={disabled}
                    onClick={() =>
                      patch({
                        dokumentUrls: state.dokumentUrls.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    Entfernen
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 'var(--fs-meta)' }}>
              Datenblatt, Garantieschein, Anschaffungsrechnung …
            </p>
          )}
        </div>
      </MockField>
    </>
  )

  return (
    <div className="space-y-3">
      <MockField label="Bezeichnung" required>
        <input
          className="input"
          value={state.bezeichnung}
          onChange={(e) => patch({ bezeichnung: e.target.value })}
          placeholder="z. B. Umwälzpumpe Heizungskeller"
          disabled={disabled}
        />
      </MockField>

      <MockField label="Gewerk" required>
        <Select
          value={state.gewerkId}
          onChange={(e) => patch({ gewerkId: e.target.value })}
          disabled={disabled}
          options={[{ value: '', label: 'Gewerk wählen …' }, ...gewerkOptions]}
        />
      </MockField>

      {!compact ? (
        <>
          <MockField label="Standort im Objekt">
            <input
              className="input"
              value={state.standort}
              onChange={(e) => patch({ standort: e.target.value })}
              placeholder="z. B. Keller, Raum 2"
              disabled={disabled}
            />
          </MockField>
          {einheitOptions.length ? (
            <MockField label="Einheit (optional)">
              <Select
                value={state.einheitId}
                onChange={(e) => patch({ einheitId: e.target.value })}
                disabled={disabled}
                options={[{ value: '', label: 'Keine Einheit' }, ...einheitOptions]}
              />
            </MockField>
          ) : null}
        </>
      ) : null}

      <div className="rounded-[10px] border border-[var(--line)]">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
          onClick={() => setDetailsOpen((o) => !o)}
          aria-expanded={detailsOpen}
        >
          <span className="font-medium text-[length:var(--fs-text)]">Weitere Details</span>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 transition-transform', detailsOpen && 'rotate-180')}
            aria-hidden
          />
        </button>
        {detailsOpen ? (
          <div className="space-y-3 border-t border-[var(--line)] px-3 py-3">
            {compact ? (
              <>
                <MockField label="Standort im Objekt">
                  <input
                    className="input"
                    value={state.standort}
                    onChange={(e) => patch({ standort: e.target.value })}
                    placeholder="z. B. Keller, Raum 2"
                    disabled={disabled}
                  />
                </MockField>
                {einheitOptions.length ? (
                  <MockField label="Einheit (optional)">
                    <Select
                      value={state.einheitId}
                      onChange={(e) => patch({ einheitId: e.target.value })}
                      disabled={disabled}
                      options={[{ value: '', label: 'Keine Einheit' }, ...einheitOptions]}
                    />
                  </MockField>
                ) : null}
              </>
            ) : null}
            {detailsBody}
          </div>
        ) : null}
      </div>

      {compact ? (
        <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 'var(--fs-meta)' }}>
          Standort, Garantie, Dokumente usw. optional unter „Weitere Details“.
        </p>
      ) : null}
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { MockBadge, MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { toast } from '@/components/ui/app-toast'
import {
  createCrmPositionEintrag,
  listAuftragPositionEintraege,
  setWeitereArbeitAnerkennung,
} from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
import {
  eintragTypLabel,
  formatZeitMinuten,
  isDokuUeberfaellig,
  lebenszyklusLabel,
  type EintragQuelle,
  type EintragTyp,
  type PositionEintrag,
} from '@/lib/auftraege/position-lebenszyklus'
import type { AuftragPosition } from '@/lib/types'
import { formatDatumZeit } from '@/lib/utils'

/**
 * CRM-Bautagebuch-Tab (§5): Positions-Gruppierung, Vorher/Nachher aus
 * position_eintraege + Fotos, CRM-Nacherfassung, Doku-überfällig-Badge.
 * Alt-Bautagebuch bleibt parallel read-only nutzbar.
 */
export function AuftragPositionLebenszyklusCard({
  auftragId,
  positionen,
  onChanged,
}: {
  auftragId: string
  positionen: AuftragPosition[]
  onChanged?: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [eintraege, setEintraege] = useState<PositionEintrag[]>([])
  const [formPosId, setFormPosId] = useState<string | null>(null)
  const [formTyp, setFormTyp] = useState<EintragTyp>('fortschritt')
  const [beschreibung, setBeschreibung] = useState('')
  const [quelle, setQuelle] = useState<EintragQuelle>('telefonisch')
  const [rueckgrund, setRueckgrund] = useState('')
  const [ereignisZeit, setEreignisZeit] = useState('')
  const [zeitStd, setZeitStd] = useState('')
  const [zeitMin, setZeitMin] = useState('')
  const [fotoPath, setFotoPath] = useState('')

  function reload() {
    startTransition(async () => {
      const list = await listAuftragPositionEintraege(auftragId)
      setEintraege(list)
    })
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auftragId])

  const byPos = useMemo(() => {
    const m = new Map<string, PositionEintrag[]>()
    for (const e of eintraege) {
      const arr = m.get(e.position_id) ?? []
      arr.push(e)
      m.set(e.position_id, arr)
    }
    return m
  }, [eintraege])

  const sortedPos = useMemo(
    () =>
      [...positionen].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.leistung_name.localeCompare(b.leistung_name)
      ),
    [positionen]
  )

  function openForm(posId: string, typ: EintragTyp) {
    setFormPosId(posId)
    setFormTyp(typ)
    setBeschreibung('')
    setQuelle('telefonisch')
    setRueckgrund('')
    setEreignisZeit('')
    setZeitStd('')
    setZeitMin('')
    setFotoPath('')
  }

  function submitForm() {
    if (!formPosId) return
    startTransition(async () => {
      const r = await createCrmPositionEintrag({
        positionId: formPosId,
        typ: formTyp,
        beschreibung,
        quelle,
        rueckdatiertGrund: rueckgrund || null,
        ereignisZeit: ereignisZeit ? new Date(ereignisZeit).toISOString() : null,
        zeitStd: zeitStd ? Number(zeitStd) : null,
        zeitMin: zeitMin ? Number(zeitMin) : null,
        fotoStoragePath: fotoPath.trim() || null,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success(`${eintragTypLabel(formTyp)} erfasst`)
      setFormPosId(null)
      reload()
      onChanged?.()
    })
  }

  function pruefen(posId: string, status: 'anerkannt' | 'abgelehnt' | 'in_pruefung') {
    startTransition(async () => {
      const r = await setWeitereArbeitAnerkennung({ positionId: posId, status })
      if (!r.ok) toast.error(r.message)
      else {
        toast.success(
          status === 'anerkannt'
            ? 'Anerkannt'
            : status === 'abgelehnt'
              ? 'Abgelehnt'
              : 'Rückfrage gesetzt'
        )
        onChanged?.()
      }
    })
  }

  async function uploadFoto(file: File) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('filename', file.name)
    const res = await fetch(`/api/auftraege/${auftragId}/timeline-foto/upload`, {
      method: 'POST',
      body: fd,
    })
    const json = (await res.json()) as { url?: string; error?: string }
    if (!res.ok || !json.url) {
      toast.error(json.error || 'Upload fehlgeschlagen')
      return
    }
    setFotoPath(json.url)
    toast.success('Foto hochgeladen')
  }

  if (!sortedPos.length) {
    return (
      <MockCard title="Bautagebuch (Positionen)">
        <MockEmpty title="Keine Positionen" hint="Leistungen anlegen, dann dokumentieren." />
      </MockCard>
    )
  }

  return (
    <MockCard
      title="Bautagebuch (Positionen)"
      actions={
        <MockBtn type="button" kind="ghost" sm disabled={pending} onClick={reload}>
          Aktualisieren
        </MockBtn>
      }
    >
      <div className="space-y-5">
        {sortedPos.map((pos) => {
          const rows = byPos.get(pos.id) ?? []
          const lastAt =
            rows.length > 0
              ? rows[rows.length - 1]?.ereignis_zeit || rows[rows.length - 1]?.created_at
              : null
          const ueberfaellig = isDokuUeberfaellig({
            leistungStatus: pos.leistung_status,
            gestartetAm: pos.gestartet_am,
            letzterEintragAt: lastAt,
          })
          const startFoto = rows.find((e) => e.typ === 'start')?.eintrag_fotos?.[0]
          const ergebnisFoto = [...rows]
            .reverse()
            .find((e) => e.typ === 'ergebnis')?.eintrag_fotos?.[0]
          const inPruefung = pos.anerkennung_status === 'in_pruefung'

          return (
            <section key={pos.id} className="border-b border-bw-border pb-4 last:border-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-bw-text">
                  {pos.leistung_name}
                </h3>
                <MockBadge kind={pos.leistung_status === 'erledigt' ? 'done' : 'order'}>
                  {lebenszyklusLabel(pos.leistung_status)}
                </MockBadge>
                {pos.typ === 'regie' ? <MockBadge kind="offer">Regie</MockBadge> : null}
                {pos.verguetung === 'aufwand' ? (
                  <MockBadge kind="offer">nach Aufwand</MockBadge>
                ) : null}
                {ueberfaellig ? <MockBadge kind="cancel">Doku überfällig (&gt;24 h)</MockBadge> : null}
                {inPruefung ? <MockBadge kind="offer">Weitere Arbeit · Prüfung</MockBadge> : null}
              </div>

              <div className="mb-3 flex flex-wrap gap-3">
                <FotoSlot label="Vorher" url={startFoto?.display_url} />
                <FotoSlot label="Nachher" url={ergebnisFoto?.display_url} />
              </div>

              {rows.length === 0 ? (
                <p className="mb-2 text-[12px] text-bw-text-muted">Noch keine Einträge.</p>
              ) : (
                <ul className="mb-3 space-y-2">
                  {rows.map((e) => (
                    <li
                      key={e.id}
                      className="rounded-md border border-bw-border bg-bw-surface-2/40 px-3 py-2 text-[12px]"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{eintragTypLabel(e.typ)}</span>
                        <span className="text-bw-text-muted">
                          {e.ereignis_zeit || e.created_at
                            ? formatDatumZeit(String(e.ereignis_zeit || e.created_at))
                            : '—'}
                        </span>
                        <span className="text-bw-text-muted">
                          · {e.erfasst_von === 'crm_intern' ? 'CRM' : 'Partner'}
                          {e.quelle ? ` · ${e.quelle}` : ''}
                        </span>
                        {e.zeit_minuten ? (
                          <span className="text-bw-text-muted">
                            · {formatZeitMinuten(e.zeit_minuten)}
                          </span>
                        ) : null}
                        {e.rueckdatiert_grund ? (
                          <MockBadge kind="offer">Rückdatiert</MockBadge>
                        ) : null}
                      </div>
                      {e.beschreibung ? (
                        <p className="mt-1 text-bw-text">{e.beschreibung}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2">
                {(!pos.gestartet_am || pos.leistung_status === 'offen') && (
                  <MockBtn
                    type="button"
                    sm
                    kind="ghost"
                    disabled={pending}
                    onClick={() => openForm(pos.id, 'start')}
                  >
                    Start (CRM)
                  </MockBtn>
                )}
                {(pos.leistung_status === 'in_arbeit' || pos.gestartet_am) &&
                  pos.leistung_status !== 'erledigt' && (
                    <>
                      <MockBtn
                        type="button"
                        sm
                        kind="ghost"
                        disabled={pending}
                        onClick={() => openForm(pos.id, 'fortschritt')}
                      >
                        Fortschritt
                      </MockBtn>
                      <MockBtn
                        type="button"
                        sm
                        kind="primary"
                        disabled={pending}
                        onClick={() => openForm(pos.id, 'ergebnis')}
                      >
                        Erledigt
                      </MockBtn>
                    </>
                  )}
                {inPruefung ? (
                  <>
                    <MockBtn
                      type="button"
                      sm
                      kind="primary"
                      disabled={pending}
                      onClick={() => pruefen(pos.id, 'anerkannt')}
                    >
                      Anerkennen
                    </MockBtn>
                    <MockBtn
                      type="button"
                      sm
                      kind="ghost"
                      disabled={pending}
                      onClick={() => pruefen(pos.id, 'in_pruefung')}
                    >
                      Rückfrage
                    </MockBtn>
                    <MockBtn
                      type="button"
                      sm
                      kind="danger"
                      disabled={pending}
                      onClick={() => pruefen(pos.id, 'abgelehnt')}
                    >
                      Ablehnen
                    </MockBtn>
                  </>
                ) : null}
              </div>

              {formPosId === pos.id ? (
                <div className="mt-3 space-y-2 rounded-md border border-bw-border bg-white p-3">
                  <p className="text-[12px] font-medium">
                    CRM-Nacherfassung · {eintragTypLabel(formTyp)}
                  </p>
                  <textarea
                    className="w-full rounded-md border border-bw-border px-2 py-1.5 text-[13px]"
                    rows={2}
                    placeholder="Beschreibung"
                    value={beschreibung}
                    onChange={(e) => setBeschreibung(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <label className="text-[11px] text-bw-text-muted">
                      Quelle
                      <select
                        className="mt-0.5 w-full rounded border border-bw-border px-2 py-1 text-[12px]"
                        value={quelle}
                        onChange={(e) => setQuelle(e.target.value as EintragQuelle)}
                      >
                        <option value="telefonisch">telefonisch</option>
                        <option value="foto_erhalten">foto_erhalten</option>
                        <option value="vor_ort">vor_ort</option>
                      </select>
                    </label>
                    <label className="text-[11px] text-bw-text-muted">
                      Ereignis (Rückdatierung)
                      <input
                        type="datetime-local"
                        className="mt-0.5 w-full rounded border border-bw-border px-2 py-1 text-[12px]"
                        value={ereignisZeit}
                        onChange={(e) => setEreignisZeit(e.target.value)}
                      />
                    </label>
                    <label className="text-[11px] text-bw-text-muted">
                      Std
                      <input
                        className="mt-0.5 w-full rounded border border-bw-border px-2 py-1 text-[12px]"
                        value={zeitStd}
                        onChange={(e) => setZeitStd(e.target.value)}
                      />
                    </label>
                    <label className="text-[11px] text-bw-text-muted">
                      Min
                      <input
                        className="mt-0.5 w-full rounded border border-bw-border px-2 py-1 text-[12px]"
                        value={zeitMin}
                        onChange={(e) => setZeitMin(e.target.value)}
                      />
                    </label>
                  </div>
                  {ereignisZeit ? (
                    <input
                      className="w-full rounded border border-bw-border px-2 py-1 text-[12px]"
                      placeholder="Grund für Rückdatierung (Pflicht)"
                      value={rueckgrund}
                      onChange={(e) => setRueckgrund(e.target.value)}
                    />
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-[12px]">
                      <span className="sr-only">Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) void uploadFoto(f)
                        }}
                      />
                    </label>
                    {fotoPath ? (
                      <span className="text-[11px] text-emerald-800">Foto gesetzt</span>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <MockBtn type="button" sm kind="primary" disabled={pending} onClick={submitForm}>
                      Speichern
                    </MockBtn>
                    <MockBtn
                      type="button"
                      sm
                      kind="ghost"
                      onClick={() => setFormPosId(null)}
                    >
                      Abbrechen
                    </MockBtn>
                  </div>
                </div>
              ) : null}
            </section>
          )
        })}
      </div>
      <p className="mt-3 text-[11px] text-bw-text-muted">
        Alt-Bautagebuch bleibt erhalten (read-only Altdaten). Neue Dokumentation läuft über
        Positions-Einträge.
      </p>
    </MockCard>
  )
}

function FotoSlot({ label, url }: { label: string; url?: string | null }) {
  return (
    <div className="h-20 w-28 overflow-hidden rounded-md border border-dashed border-bw-border bg-bw-surface-2">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-wide text-bw-text-muted">
          {label}
        </div>
      )}
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import FullCalendar from '@fullcalendar/react'
import type { EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core'
import type { DateClickArg } from '@fullcalendar/interaction'
import deLocale from '@fullcalendar/core/locales/de'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { createClient } from '@/lib/supabase'
import type { KalenderTermin } from '@/lib/types'
import { toast } from '@/components/ui/app-toast'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import {
  deleteKalenderTermin,
  moveKalenderTermin,
  saveKalenderTermin,
} from '@/app/(dashboard)/kalender/actions'
import { KalenderHeuteCard } from '@/components/kalender/KalenderHeuteCard'
import { KalenderTeamAuslastung } from '@/components/kalender/KalenderTeamAuslastung'
import { computeTeamAuslastung } from '@/lib/kalender-auslastung'
import { KALENDER_TYP_LABEL } from '@/lib/kalender-styles'

export const TYP_FARBEN: Record<KalenderTermin['typ'], string> = {
  besichtigung: '#C4922A',
  beginn: '#2E7D52',
  abnahme: '#0091AE',
  sonstiges: '#6B7280',
  intern: '#9333EA',
}

const TYP_OPTIONS: { value: KalenderTermin['typ']; label: string }[] = [
  { value: 'besichtigung', label: KALENDER_TYP_LABEL.besichtigung },
  { value: 'beginn', label: 'Beginn' },
  { value: 'abnahme', label: 'Abnahme' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

type UiView = 'tag' | 'woche' | 'monat' | 'liste'

const VIEW_MAP: Record<UiView, string> = {
  tag: 'timeGridDay',
  woche: 'timeGridWeek',
  monat: 'dayGridMonth',
  liste: 'listWeek',
}

const REVERSE_VIEW: Partial<Record<string, UiView>> = {
  timeGridDay: 'tag',
  timeGridWeek: 'woche',
  dayGridMonth: 'monat',
  listWeek: 'liste',
}

function normalizeTime(s: string): string {
  const t = s.trim()
  if (t.length === 5 && t.includes(':')) return `${t}:00`
  return t
}

function ymdFromDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function timeFromDate(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function KalenderClient() {
  const supabase = createClient()
  const calendarRef = useRef<InstanceType<typeof FullCalendar>>(null)
  const [mounted, setMounted] = useState(false)
  const [termine, setTermine] = useState<KalenderTermin[]>([])
  const [team, setTeam] = useState<{ id: string; name: string; telefon: string }[]>([])
  const [betreuerMap, setBetreuerMap] = useState<Map<string, string>>(() => new Map())
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [uiView, setUiView] = useState<UiView>('woche')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<KalenderTermin | null>(null)
  const [pending, startTransition] = useTransition()

  const [fTitel, setFTitel] = useState('')
  const [fTyp, setFTyp] = useState<KalenderTermin['typ']>('besichtigung')
  const [fDatum, setFDatum] = useState('')
  const [fVon, setFVon] = useState('')
  const [fBis, setFBis] = useState('')
  const [fAdr, setFAdr] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [fLeadId, setFLeadId] = useState('')
  const [fAuftragId, setFAuftragId] = useState('')
  const [fErledigt, setFErledigt] = useState(false)
  const [fZugewiesen, setFZugewiesen] = useState('')
  const [leadQ, setLeadQ] = useState('')
  const [auftragQ, setAuftragQ] = useState('')
  const [leadHits, setLeadHits] = useState<{ id: string; kontakt_name: string | null }[]>([])
  const [auftragHits, setAuftragHits] = useState<
    { id: string; titel: string | null; kunden?: { name: string } | null }[]
  >([])

  const plugins = useMemo(
    () => [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
    []
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const apply = () => setIsMobile(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const api = calendarRef.current?.getApi()
    if (!api) return
    const want = isMobile ? 'listWeek' : 'timeGridWeek'
    if (api.view.type !== want) {
      api.changeView(want)
      setUiView(isMobile ? 'liste' : 'woche')
    }
  }, [mounted, isMobile])

  const load = useCallback(async () => {
    setLoadErr(null)
    const { data, error } = await supabase
      .from('kalender_termine')
      .select(
        `
        *,
        leads(kontakt_name),
        auftraege(
          titel,
          kunden(name)
        )
      `
      )
      .order('datum', { ascending: true })

    if (error) {
      setLoadErr(error.message)
      return
    }
    const rows = (data ?? []) as KalenderTermin[]
    setTermine(rows)

    const { data: profiles } = await supabase.from('user_profiles').select('id, name, telefon').order('name')
    setTeam(
      (profiles ?? []).map((p) => ({
        id: p.id as string,
        name: (p.name as string)?.trim() || 'Team',
        telefon: (p.telefon as string)?.trim() || '',
      }))
    )

    const auftragIds = Array.from(
      new Set(rows.map((t) => t.auftrag_id).filter((id): id is string => Boolean(id)))
    )
    if (auftragIds.length) {
      const { data: aufRows } = await supabase
        .from('auftraege')
        .select('id, betreuer_id')
        .in('id', auftragIds)
      const m = new Map<string, string>()
      for (const row of aufRows ?? []) {
        const bid = row.betreuer_id as string | null
        if (bid) m.set(row.id as string, bid)
      }
      setBetreuerMap(m)
    } else {
      setBetreuerMap(new Map())
    }
  }, [supabase])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!leadQ.trim()) {
      setLeadHits([])
      return
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, kontakt_name')
        .ilike('kontakt_name', `%${leadQ.trim()}%`)
        .limit(8)
      setLeadHits((data ?? []) as { id: string; kontakt_name: string | null }[])
    }, 250)
    return () => clearTimeout(t)
  }, [leadQ, supabase])

  useEffect(() => {
    if (!auftragQ.trim()) {
      setAuftragHits([])
      return
    }
    const t = setTimeout(async () => {
      const q = `%${auftragQ.trim()}%`
      const { data } = await supabase
        .from('auftraege')
        .select('id, titel, kunden(name)')
        .ilike('titel', q)
        .limit(8)
      const rows = (data ?? []) as {
        id: string
        titel: string | null
        kunden?: { name: string } | { name: string }[] | null
      }[]
      setAuftragHits(
        rows.map((row) => {
          const ku = row.kunden
          const kunden =
            ku == null ? null : Array.isArray(ku) ? ku[0] ?? null : ku
          return { id: row.id, titel: row.titel, kunden }
        })
      )
    }, 250)
    return () => clearTimeout(t)
  }, [auftragQ, supabase])

  const teamAuslastung = useMemo(
    () => computeTeamAuslastung(termine, team, betreuerMap),
    [termine, team, betreuerMap]
  )

  const teamNameById = useMemo(() => new Map(team.map((m) => [m.id, m.name])), [team])

  const events: EventInput[] = useMemo(() => {
    return termine.map((t) => {
      const ymd = t.datum.slice(0, 10)
      const hasTime = Boolean(t.uhrzeit_von?.trim())
      const start = hasTime ? `${ymd}T${normalizeTime(t.uhrzeit_von!)}` : ymd
      const end =
        t.uhrzeit_bis?.trim() && hasTime ? `${ymd}T${normalizeTime(t.uhrzeit_bis)}` : undefined
      const ma = t.zugewiesen_an ? teamNameById.get(t.zugewiesen_an) : null
      const title = ma ? `${t.titel} · ${ma}` : t.titel
      return {
        id: t.id,
        title,
        start,
        end,
        allDay: !hasTime,
        backgroundColor: TYP_FARBEN[t.typ] ?? TYP_FARBEN.sonstiges,
        borderColor: TYP_FARBEN[t.typ] ?? TYP_FARBEN.sonstiges,
        extendedProps: { termin: t },
      }
    })
  }, [termine, teamNameById])

  function openNeu(prefillDatum?: string) {
    setEditing(null)
    setFTitel('')
    setFTyp('besichtigung')
    setFDatum(prefillDatum ?? new Date().toISOString().slice(0, 10))
    setFVon('')
    setFBis('')
    setFAdr('')
    setFDesc('')
    setFLeadId('')
    setFAuftragId('')
    setFErledigt(false)
    setFZugewiesen('')
    setLeadQ('')
    setAuftragQ('')
    setModalOpen(true)
  }

  function openEdit(t: KalenderTermin) {
    setEditing(t)
    setFTitel(t.titel)
    setFTyp(t.typ)
    setFDatum(t.datum.slice(0, 10))
    setFVon(t.uhrzeit_von?.slice(0, 5) ?? '')
    setFBis(t.uhrzeit_bis?.slice(0, 5) ?? '')
    setFAdr(t.adresse ?? '')
    setFDesc(t.beschreibung ?? '')
    setFLeadId(t.lead_id ?? '')
    setFAuftragId(t.auftrag_id ?? '')
    setFErledigt(t.erledigt)
    setFZugewiesen(t.zugewiesen_an ?? '')
    setLeadQ('')
    setAuftragQ('')
    setModalOpen(true)
  }

  function handleDateClick(arg: DateClickArg) {
    const d =
      arg.dateStr && arg.dateStr.length >= 10
        ? arg.dateStr.slice(0, 10)
        : ymdFromDate(arg.date)
    openNeu(d)
  }

  function handleEventClick(arg: EventClickArg) {
    const raw = arg.event.extendedProps as { termin?: KalenderTermin }
    if (raw.termin) openEdit(raw.termin)
  }

  async function handleEventDrop(info: EventDropArg) {
    const raw = info.event.extendedProps as { termin?: KalenderTermin }
    const t = raw.termin
    const start = info.event.start
    if (!t || !start) {
      info.revert()
      return
    }
    const ymd = ymdFromDate(start)
    const allDay = info.event.allDay
    const von = allDay ? null : normalizeTime(timeFromDate(start))
    const end = info.event.end
    const bis =
      !allDay && end ? normalizeTime(timeFromDate(end)) : allDay ? null : null
    const res = await moveKalenderTermin(t.id, ymd, von, bis)
    if (!res.ok) {
      toast.error(res.message)
      info.revert()
      return
    }
    toast.success('Termin verschoben')
    await load()
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await saveKalenderTermin({
        id: editing?.id,
        titel: fTitel,
        typ: fTyp,
        datum: fDatum,
        uhrzeit_von: fVon.trim() ? normalizeTime(fVon.trim()) : null,
        uhrzeit_bis: fBis.trim() ? normalizeTime(fBis.trim()) : null,
        adresse: fAdr.trim() || null,
        beschreibung: fDesc.trim() || null,
        lead_id: fLeadId || null,
        auftrag_id: fAuftragId || null,
        zugewiesen_an: fZugewiesen.trim() || null,
        erledigt: fErledigt,
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success('Termin gespeichert')
      setModalOpen(false)
      await load()
    })
  }

  async function onDelete() {
    if (!editing) return
    if (!confirm('Termin wirklich löschen?')) return
    const res = await deleteKalenderTermin(editing.id)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success('Termin gelöscht')
    setModalOpen(false)
    await load()
  }

  function changeUiView(v: UiView) {
    setUiView(v)
    const api = calendarRef.current?.getApi()
    if (api) api.changeView(VIEW_MAP[v])
  }

  const initialView = isMobile ? 'listWeek' : 'timeGridWeek'

  if (!mounted) {
    return (
      <div>
        <PageHeader
          action={
            <Button type="button" variant="primary" size="sm" disabled>
              + Termin
            </Button>
          }
        />
        <div className="rounded-lg border border-bw-border bg-bw-card p-8 text-center text-sm text-bw-text-muted">
          Kalender wird geladen …
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden flex-wrap gap-1 md:flex">
              {(['tag', 'woche', 'monat', 'liste'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => changeUiView(v)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    uiView === v
                      ? 'border-bw-primary bg-bw-primary text-white'
                      : 'border-bw-border bg-bw-card text-bw-text hover:bg-bw-hover'
                  )}
                >
                  {v === 'tag' ? 'Tag' : v === 'woche' ? 'Woche' : v === 'monat' ? 'Monat' : 'Liste'}
                </button>
              ))}
            </div>
            <Button type="button" variant="primary" size="sm" onClick={() => openNeu()}>
              + Termin
            </Button>
          </div>
        }
      />

      <div className="mb-3 flex flex-wrap gap-1 md:hidden">
        {(['tag', 'woche', 'monat', 'liste'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => changeUiView(v)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              uiView === v
                ? 'border-bw-primary bg-bw-primary text-white'
                : 'border-bw-border bg-bw-card text-bw-text hover:bg-bw-hover'
            )}
          >
            {v === 'tag' ? 'Tag' : v === 'woche' ? 'Woche' : v === 'monat' ? 'Monat' : 'Liste'}
          </button>
        ))}
      </div>

      {loadErr ? (
        <p className="mb-3 rounded-lg border border-status-cancel-bg bg-status-cancel-bg/10 px-3 py-2 text-sm text-status-cancel-text">
          {loadErr}
        </p>
      ) : null}

      <div className="fc-root-wrapper rounded-lg border border-bw-border bg-bw-card p-2 shadow-card md:p-3">
        <FullCalendar
          ref={calendarRef}
          key={`${initialView}`}
          plugins={plugins}
          initialView={initialView}
          locale={deLocale}
          firstDay={1}
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          height="auto"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: '',
          }}
          buttonText={{
            today: 'Heute',
            week: 'Woche',
            day: 'Tag',
            month: 'Monat',
            list: 'Liste',
          }}
          events={events}
          eventClassNames={(arg) => {
            const raw = arg.event.extendedProps as { termin?: KalenderTermin }
            const typ = raw.termin?.typ
            return typ ? [`fc-event-typ-${typ}`] : []
          }}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          editable
          eventDrop={handleEventDrop}
          datesSet={(arg) => {
            const t = REVERSE_VIEW[arg.view.type]
            if (t) setUiView(t)
          }}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <KalenderHeuteCard termine={termine} onTerminClick={openEdit} />
        <KalenderTeamAuslastung members={teamAuslastung} />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Termin bearbeiten' : 'Neuer Termin'}
        size="md"
      >
            <form onSubmit={submitForm} className="space-y-4 max-h-[60vh] overflow-y-auto">
              <Input label="Titel" value={fTitel} onChange={(e) => setFTitel(e.target.value)} required />
              <Select
                name="typ"
                label="Typ"
                value={fTyp}
                onChange={(e) => setFTyp(e.target.value as KalenderTermin['typ'])}
                options={TYP_OPTIONS}
              />
              <Input type="date" label="Datum" value={fDatum} onChange={(e) => setFDatum(e.target.value)} required />
              <Input type="time" label="Uhrzeit von" value={fVon} onChange={(e) => setFVon(e.target.value)} />
              <Input type="time" label="Uhrzeit bis" value={fBis} onChange={(e) => setFBis(e.target.value)} />
              <Input label="Adresse" value={fAdr} onChange={(e) => setFAdr(e.target.value)} />
              <Select
                name="zugewiesen"
                label="Vor-Ort Mitarbeiter"
                value={fZugewiesen}
                onChange={(e) => setFZugewiesen(e.target.value)}
                options={[
                  { value: '', label: '—' },
                  ...team.map((m) => ({
                    value: m.id,
                    label: m.telefon ? `${m.name} · ${m.telefon}` : m.name,
                  })),
                ]}
              />
              <Textarea label="Beschreibung" value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={3} />
              <div>
                <label className="mb-1 block text-sm font-medium text-bw-text">Lead suchen (optional)</label>
                <input
                  className="mb-1 w-full min-h-[44px] rounded-lg border border-bw-border bg-bw-card px-3 text-bw-text"
                  value={leadQ}
                  onChange={(e) => setLeadQ(e.target.value)}
                  placeholder="Name …"
                />
                {leadHits.length > 0 ? (
                  <ul className="max-h-32 overflow-y-auto rounded border border-bw-border text-sm">
                    {leadHits.map((h) => (
                      <li key={h.id}>
                        <button
                          type="button"
                          className="w-full px-2 py-2 text-left hover:bg-bw-hover"
                          onClick={() => {
                            setFLeadId(h.id)
                            setFAuftragId('')
                            setLeadQ(h.kontakt_name ?? h.id)
                          }}
                        >
                          {h.kontakt_name ?? h.id}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-bw-text">Auftrag suchen (optional)</label>
                <input
                  className="mb-1 w-full min-h-[44px] rounded-lg border border-bw-border bg-bw-card px-3 text-bw-text"
                  value={auftragQ}
                  onChange={(e) => setAuftragQ(e.target.value)}
                  placeholder="Titel …"
                />
                {auftragHits.length > 0 ? (
                  <ul className="max-h-32 overflow-y-auto rounded border border-bw-border text-sm">
                    {auftragHits.map((h) => (
                      <li key={h.id}>
                        <button
                          type="button"
                          className="w-full px-2 py-2 text-left hover:bg-bw-hover"
                          onClick={() => {
                            setFAuftragId(h.id)
                            setFLeadId('')
                            setAuftragQ(h.titel ?? h.kunden?.name ?? h.id)
                          }}
                        >
                          {h.titel ?? h.kunden?.name ?? h.id}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <label className="flex items-center gap-2 text-sm text-bw-text">
                <input type="checkbox" checked={fErledigt} onChange={(e) => setFErledigt(e.target.checked)} />
                Erledigt
              </label>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="submit" variant="primary" loading={pending} className="flex-1">
                  Speichern
                </Button>
                {editing ? (
                  <Button type="button" variant="danger" onClick={() => void onDelete()}>
                    Löschen
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                  Abbrechen
                </Button>
              </div>
            </form>
      </Modal>
    </div>
  )
}

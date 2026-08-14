'use client'

import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react'
import { Check, Circle, Flag } from 'lucide-react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Combobox } from '@/components/ui/Combobox'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { toast } from '@/components/ui/app-toast'
import { loadCrmTeamFuerTermin } from '@/app/(dashboard)/anfragen/actions'
import { listKundenFuerCombobox } from '@/app/(dashboard)/kunden/kunde-combobox-actions'
import { listHandwerkerAuswahlFuerGewerk } from '@/app/(dashboard)/auftraege/handwerker-actions'
import {
  deleteTodo,
  saveTodo,
  searchVorgaengeFuerTodo,
} from '@/app/(dashboard)/kalender/todo-actions'
import type { CrmTeamMitglied } from '@/lib/crm-team'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import type { CrmTodo, TodoPrioritaet } from '@/lib/types'
import { cn } from '@/lib/utils'

const PRIO: { value: TodoPrioritaet; label: string }[] = [
  { value: 'niedrig', label: 'Niedrig' },
  { value: 'normal', label: 'Normal' },
  { value: 'hoch', label: 'Hoch' },
]

export type TodoLockedLinks = {
  kundeId?: string | null
  leadId?: string | null
  auftragId?: string | null
  handwerkerId?: string | null
  label?: string | null
}

function formatFristLabel(iso: string | null | undefined): string {
  const raw = iso?.slice(0, 10)
  if (!raw) return '—'
  const d = new Date(`${raw}T12:00:00`)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function isFristOverdue(iso: string | null | undefined, erledigt: boolean): boolean {
  if (erledigt || !iso) return false
  const raw = iso.slice(0, 10)
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const due = new Date(`${raw}T12:00:00`)
  return due.getTime() < today.getTime()
}

function prioLabel(p: TodoPrioritaet): string {
  return PRIO.find((x) => x.value === p)?.label ?? p
}

function Prop({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="prop">
      <span className="prop-l">{label}</span>
      <span className="prop-v">{children}</span>
    </div>
  )
}

export function TodoEditorSheet({
  open,
  todo,
  lockedLinks,
  onClose,
  onSaved,
}: {
  open: boolean
  todo: CrmTodo | null
  lockedLinks?: TodoLockedLinks
  onClose: () => void
  onSaved: () => void
}) {
  const [mode, setMode] = useState<'view' | 'edit'>('edit')
  const [titel, setTitel] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [faelligAm, setFaelligAm] = useState('')
  const [prioritaet, setPrioritaet] = useState<TodoPrioritaet>('normal')
  const [zugewiesenAn, setZugewiesenAn] = useState('')
  const [kundeId, setKundeId] = useState('')
  const [leadId, setLeadId] = useState('')
  const [auftragId, setAuftragId] = useState('')
  const [handwerkerId, setHandwerkerId] = useState('')
  const [vorgangKey, setVorgangKey] = useState('')
  const [team, setTeam] = useState<CrmTeamMitglied[]>([])
  const [kundeOpts, setKundeOpts] = useState<{ value: string; label: string }[]>([])
  const [hwOpts, setHwOpts] = useState<{ value: string; label: string }[]>([])
  const [vorgangOpts, setVorgangOpts] = useState<{ value: string; label: string; sub?: string }[]>([])
  const [pending, startTransition] = useTransition()

  const linksLocked = Boolean(
    lockedLinks?.kundeId || lockedLinks?.leadId || lockedLinks?.auftragId || lockedLinks?.handwerkerId
  )
  const isNew = !todo
  const isView = !isNew && mode === 'view'

  useEffect(() => {
    if (!open) return
    setMode(todo ? 'view' : 'edit')
    setTitel(todo?.titel ?? '')
    setBeschreibung(todo?.beschreibung ?? '')
    setFaelligAm(todo?.faellig_am?.slice(0, 10) ?? '')
    setPrioritaet(todo?.prioritaet ?? 'normal')
    setZugewiesenAn(todo?.zugewiesen_an ?? '')
    setKundeId(todo?.kunde_id ?? lockedLinks?.kundeId ?? '')
    setLeadId(todo?.lead_id ?? lockedLinks?.leadId ?? '')
    setAuftragId(todo?.auftrag_id ?? lockedLinks?.auftragId ?? '')
    setHandwerkerId(todo?.handwerker_id ?? lockedLinks?.handwerkerId ?? '')
    if (todo?.auftrag_id) setVorgangKey(`a:${todo.auftrag_id}`)
    else if (todo?.lead_id) setVorgangKey(`l:${todo.lead_id}`)
    else if (lockedLinks?.auftragId) setVorgangKey(`a:${lockedLinks.auftragId}`)
    else if (lockedLinks?.leadId) setVorgangKey(`l:${lockedLinks.leadId}`)
    else setVorgangKey('')

    void loadCrmTeamFuerTermin().then(setTeam)
    if (!linksLocked) {
      void listKundenFuerCombobox().then((r) =>
        setKundeOpts(
          r.kunden.map((k) => ({
            value: k.id,
            label: kundeDisplayName(k),
          }))
        )
      )
      void listHandwerkerAuswahlFuerGewerk({}).then((r) => {
        if (!r.ok) return
        const all = [...r.empfohlen, ...r.alle]
        setHwOpts(
          all.map((h) => ({
            value: h.id,
            label: h.firma?.trim() || h.name,
          }))
        )
      })
      void searchVorgaengeFuerTodo().then((r) => {
        if (!r.ok) return
        setVorgangOpts(r.options)
      })
    }
  }, [open, todo, lockedLinks, linksLocked])

  const teamOptions = useMemo(
    () => [
      { value: '', label: 'Niemand' },
      ...team.map((m) => ({ value: m.id, label: m.name })),
    ],
    [team]
  )

  const zugewiesenLabel = useMemo(() => {
    if (!zugewiesenAn) return '—'
    return team.find((m) => m.id === zugewiesenAn)?.name ?? '—'
  }, [team, zugewiesenAn])

  const vorgangLabel = useMemo(() => {
    if (todo?.auftraege?.titel?.trim()) return todo.auftraege.titel.trim()
    if (todo?.leads?.kontakt_name?.trim()) return `Anfrage · ${todo.leads.kontakt_name.trim()}`
    if (lockedLinks?.label?.trim()) return lockedLinks.label.trim()
    const opt = vorgangOpts.find((o) => o.value === vorgangKey)
    return opt?.label ?? '—'
  }, [todo, lockedLinks, vorgangOpts, vorgangKey])

  const kundeLabel = useMemo(() => {
    if (todo?.kunden?.name?.trim()) return todo.kunden.name.trim()
    const opt = kundeOpts.find((o) => o.value === kundeId)
    return opt?.label ?? (kundeId ? '—' : '—')
  }, [todo, kundeOpts, kundeId])

  const handwerkerLabel = useMemo(() => {
    const fromTodo =
      todo?.handwerker?.firma?.trim() || todo?.handwerker?.name?.trim() || null
    if (fromTodo) return fromTodo
    const opt = hwOpts.find((o) => o.value === handwerkerId)
    return opt?.label ?? '—'
  }, [todo, hwOpts, handwerkerId])

  function applyVorgangKey(key: string) {
    setVorgangKey(key)
    if (key.startsWith('a:')) {
      setAuftragId(key.slice(2))
      setLeadId('')
    } else if (key.startsWith('l:')) {
      setLeadId(key.slice(2))
      setAuftragId('')
    } else {
      setLeadId('')
      setAuftragId('')
    }
  }

  function save() {
    startTransition(async () => {
      const res = await saveTodo({
        id: todo?.id,
        titel,
        beschreibung,
        faellig_am: faelligAm || null,
        prioritaet,
        zugewiesen_an: zugewiesenAn || null,
        kunde_id: kundeId || null,
        lead_id: leadId || null,
        auftrag_id: auftragId || null,
        handwerker_id: handwerkerId || null,
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success(isNew ? 'To-do angelegt' : 'To-do gespeichert')
      onClose()
      onSaved()
    })
  }

  function remove() {
    if (!todo) return
    if (!confirm('To-do wirklich löschen?')) return
    startTransition(async () => {
      const res = await deleteTodo(todo.id)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success('To-do gelöscht')
      onClose()
      onSaved()
    })
  }

  const sheetTitle = isNew ? 'Neues To-do' : isView ? 'To-do' : 'To-do bearbeiten'

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={sheetTitle}
      confirmBusy={pending}
      onConfirm={isView ? undefined : save}
      confirmDisabled={pending || !titel.trim()}
      manageHistory={false}
      headerEnd={
        isView ? (
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => setMode('edit')}
          >
            Bearbeiten
          </button>
        ) : undefined
      }
      footer={
        !isNew && !isView ? (
          <div className="flex w-full items-center justify-start gap-2">
            <button type="button" className="btn ghost danger" disabled={pending} onClick={remove}>
              Löschen
            </button>
          </div>
        ) : undefined
      }
    >
      {isView ? (
        <div className="todo-detail">
          <div className="todo-detail__card">
            <h3 className="todo-detail__title">
              <TodoPrioFlag prioritaet={prioritaet} />
              <span>{titel.trim() || 'Ohne Titel'}</span>
            </h3>
            <div className="props">
              <Prop label="Status">{todo?.erledigt ? 'Erledigt' : 'Offen'}</Prop>
              <Prop label="Frist">
                {(() => {
                  const raw = faelligAm || todo?.faellig_am
                  const label = formatFristLabel(raw)
                  const overdue = isFristOverdue(raw, Boolean(todo?.erledigt))
                  if (label === '—') return '—'
                  return (
                    <span
                      className={cn(
                        'todo-row__frist',
                        overdue && 'todo-row__frist--overdue'
                      )}
                    >
                      {label}
                    </span>
                  )
                })()}
              </Prop>
              <Prop label="Priorität">{prioLabel(prioritaet)}</Prop>
              <Prop label="Zuweisen">{zugewiesenLabel}</Prop>
              {beschreibung.trim() ? (
                <Prop label="Notiz">
                  <span className="todo-detail__notiz">{beschreibung.trim()}</span>
                </Prop>
              ) : null}
              {linksLocked && lockedLinks?.label ? (
                <Prop label="Verknüpft">{lockedLinks.label}</Prop>
              ) : (
                <>
                  <Prop label="Kunde">{kundeLabel}</Prop>
                  <Prop label="Vorgang">{vorgangLabel}</Prop>
                  <Prop label="Handwerker">{handwerkerLabel}</Prop>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="todo-editor space-y-4">
          <Input
            label="Titel"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="Was ist zu tun?"
            required
            autoFocus
          />
          <Textarea
            label="Beschreibung"
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
            rows={4}
            placeholder="Details, Notizen…"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              type="date"
              label="Frist"
              value={faelligAm}
              onChange={(e) => setFaelligAm(e.target.value)}
            />
            <div>
              <div className="mb-1 text-[length:var(--fs-text)] font-medium text-[var(--text-3)]">
                Priorität
              </div>
              <div className="seg">
                {PRIO.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className={cn(prioritaet === p.value && 'on')}
                    onClick={() => setPrioritaet(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Select
            label="Zuweisen"
            value={zugewiesenAn}
            options={teamOptions}
            onChange={(e) => setZugewiesenAn(e.target.value)}
          />

          {linksLocked ? (
            lockedLinks?.label ? (
              <p className="text-[length:var(--fs-text)] text-[var(--text-3)]">
                Verknüpft: {lockedLinks.label}
              </p>
            ) : null
          ) : (
            <div className="space-y-3 border-t border-[var(--border)] pt-3">
              <p className="text-[length:var(--fs-text)] font-medium text-[var(--text-3)]">
                Verknüpfung
              </p>
              <Combobox
                label="Kunde"
                options={[{ value: '', label: '— keiner —' }, ...kundeOpts]}
                value={kundeId}
                onChange={setKundeId}
                placeholder="Kunde suchen…"
              />
              <Combobox
                label="Vorgang"
                options={[{ value: '', label: '— keiner —' }, ...vorgangOpts]}
                value={vorgangKey}
                onChange={applyVorgangKey}
                placeholder="Anfrage / Auftrag…"
              />
              <Combobox
                label="Handwerker"
                options={[{ value: '', label: '— keiner —' }, ...hwOpts]}
                value={handwerkerId}
                onChange={setHandwerkerId}
                placeholder="Partner suchen…"
              />
            </div>
          )}
        </div>
      )}
    </EditorSheet>
  )
}

export function TodoCheckButton({
  erledigt,
  busy,
  onToggle,
}: {
  erledigt: boolean
  busy?: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className={cn('todo-check', erledigt && 'todo-check--done')}
      aria-label={erledigt ? 'Als offen markieren' : 'Abhaken'}
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
    >
      {erledigt ? <Check className="h-4 w-4" aria-hidden /> : <Circle className="h-4 w-4" aria-hidden />}
    </button>
  )
}

export function TodoPrioFlag({ prioritaet }: { prioritaet: TodoPrioritaet }) {
  if (prioritaet === 'normal') return null
  return (
    <Flag
      className={cn(
        'h-3.5 w-3.5 shrink-0',
        prioritaet === 'hoch' ? 'text-[var(--red-tx)]' : 'text-[var(--text-4)]'
      )}
      aria-label={prioritaet === 'hoch' ? 'Hohe Priorität' : 'Niedrige Priorität'}
    />
  )
}

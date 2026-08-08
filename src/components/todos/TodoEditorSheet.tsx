'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
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

  useEffect(() => {
    if (!open) return
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

  const isNew = !todo

  const teamOptions = useMemo(
    () => [
      { value: '', label: 'Niemand' },
      ...team.map((m) => ({ value: m.id, label: m.name })),
    ],
    [team]
  )

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

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={isNew ? 'Neues To-do' : 'To-do'}
      confirmBusy={pending}
      onConfirm={save}
      confirmDisabled={pending || !titel.trim()}
      manageHistory={false}
      footer={
        !isNew ? (
          <div className="flex w-full items-center justify-start gap-2">
            <button type="button" className="btn ghost danger" disabled={pending} onClick={remove}>
              Löschen
            </button>
          </div>
        ) : undefined
      }
    >
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

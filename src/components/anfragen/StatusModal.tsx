'use client'

import { useEffect, useState } from 'react'
import {
  Calendar,
  CircleX,
  Info,
  PhoneOff,
  Save,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import {
  loadCrmTeamFuerTermin,
  saveLeadAlsVerloren,
  saveLeadNichtErreichbar,
  saveLeadTerminVereinbart,
  undoLeadTerminVereinbart,
} from '@/app/(dashboard)/anfragen/actions'
import { TerminMitarbeiterSelect } from '@/components/anfragen/TerminMitarbeiterSelect'
import {
  TerminBestaetigungMailEditor,
  type TerminMailDraft,
} from '@/components/anfragen/TerminBestaetigungMailEditor'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { toast } from '@/components/ui/app-toast'
import type { LeadDetail } from '@/lib/types'
import type { CrmTeamMitglied } from '@/lib/crm-team'
import { anfrageAdresseAusPayload, formatAnfrageAdresseZeile } from '@/lib/anfrage-adresse'
import { leadKontaktAnzeigeName } from '@/lib/lead-display-helpers'
import { VERLOREN_GRUND_LABELS } from '@/lib/utils'

export type StatusModalKind = 'termin' | 'nicht_erreichbar' | 'verloren'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const META: Record<
  StatusModalKind,
  { title: string; icon: LucideIcon; saveLabel: string; danger?: boolean }
> = {
  termin: { title: 'Termin vereinbart', icon: Calendar, saveLabel: 'Termin speichern' },
  nicht_erreichbar: {
    title: 'Nicht erreichbar',
    icon: PhoneOff,
    saveLabel: 'Versuch speichern',
  },
  verloren: {
    title: 'Verloren',
    icon: CircleX,
    saveLabel: 'Als verloren markieren',
    danger: true,
  },
}

export function StatusModal({
  kind,
  lead,
  open,
  onClose,
  onSaved,
  onSuggestVerloren,
}: {
  kind: StatusModalKind | null
  lead: LeadDetail
  open: boolean
  onClose: () => void
  onSaved?: () => void
  /** Nach 3× Nicht erreichbar: Verloren-Sheet öffnen */
  onSuggestVerloren?: () => void
}) {
  const [datum, setDatum] = useState(todayISO())
  const [uhrzeit, setUhrzeit] = useState('10:00')
  const [notiz, setNotiz] = useState('')
  const [grund, setGrund] = useState('zu_teuer')
  const [mitarbeiterId, setMitarbeiterId] = useState('')
  const [team, setTeam] = useState<CrmTeamMitglied[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [mailToggle, setMailToggle] = useState(true)
  const [mailDraft, setMailDraft] = useState<TerminMailDraft | null>(null)
  const [saving, setSaving] = useState(false)

  const kontaktName = leadKontaktAnzeigeName(lead, 'Kundin/Kunde')
  const kontaktEmail = lead.kontakt_email?.trim() || ''
  const terminAdresse = (() => {
    const fd =
      lead.funnel_daten && typeof lead.funnel_daten === 'object' && !Array.isArray(lead.funnel_daten)
        ? (lead.funnel_daten as Record<string, unknown>)
        : null
    const addr = anfrageAdresseAusPayload({
      plz: lead.plz ?? undefined,
      funnel_daten: fd,
    })
    const k = lead.kunden
    const kundeAddr =
      k && typeof k === 'object' && 'adresse' in k
        ? {
            adresse: (k as { adresse?: string | null }).adresse,
            plz: (k as { plz?: string | null }).plz,
            ort: (k as { ort?: string | null }).ort,
          }
        : null
    return formatAnfrageAdresseZeile(addr, kundeAddr)
  })()
  const sub = `${kontaktName} · ${lead.id.slice(0, 8).toUpperCase()}`

  useEffect(() => {
    if (!open || !kind) return
    setDatum(todayISO())
    setUhrzeit('10:00')
    setNotiz('')
    setGrund('zu_teuer')
    setMitarbeiterId('')
    setMailToggle(true)
    setMailDraft(null)
    if (kind === 'termin') {
      setTeamLoading(true)
      void loadCrmTeamFuerTermin()
        .then((list) => setTeam(list))
        .finally(() => setTeamLoading(false))
    }
  }, [open, kind, lead.id])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open || !kind) return null

  const meta = META[kind]

  async function handleSave() {
    if (!kind) return
    setSaving(true)
    let res:
      | { ok: true; versuche?: number; vorschlagVerloren?: boolean }
      | { ok: false; message: string }

    if (kind === 'termin') {
      if (!datum.trim()) {
        setSaving(false)
        toast.error('Bitte Datum wählen.')
        return
      }
      if (!uhrzeit.trim()) {
        setSaving(false)
        toast.error('Bitte Uhrzeit wählen.')
        return
      }
      if (!mitarbeiterId.trim()) {
        setSaving(false)
        toast.error('Bitte Mitarbeiter für den Vor-Ort-Termin wählen.')
        return
      }
      if (mailToggle && kontaktEmail && !mailDraft?.to.length) {
        setSaving(false)
        toast.error('Bitte mindestens eine Empfänger-Adresse unter An angeben.')
        return
      }
      res = await saveLeadTerminVereinbart({
        leadId: lead.id,
        kontaktName,
        kontaktEmail: kontaktEmail || null,
        datum,
        uhrzeit,
        adresse: terminAdresse || null,
        notiz: notiz.trim() || null,
        zugewiesenAn: mitarbeiterId.trim(),
        mailSenden: mailToggle && Boolean(mailDraft?.to.length || kontaktEmail),
        mailTo: mailDraft?.to,
        mailCc: mailDraft?.cc,
        mailBetreff: mailDraft?.betreff,
        mailHtml: mailDraft?.html,
        mailBodyText: mailDraft?.bodyText,
      })
    } else if (kind === 'nicht_erreichbar') {
      res = await saveLeadNichtErreichbar({
        leadId: lead.id,
        kontaktName,
        notiz: notiz.trim() || null,
      })
    } else {
      res = await saveLeadAlsVerloren({
        leadId: lead.id,
        grund,
        notiz: notiz.trim() || null,
      })
    }

    setSaving(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }

    if (kind === 'termin') {
      toast.success(
        mailToggle && mailDraft?.to.length
          ? 'Termin gespeichert und Bestätigung per E-Mail versendet.'
          : 'Termin vereinbart',
        {
          action: {
            label: 'Rückgängig',
            onClick: () => {
              void undoLeadTerminVereinbart(lead.id).then((r) => {
                if (!r.ok) toast.error(r.message)
                else {
                  toast.success('Termin rückgängig')
                  onSaved?.()
                }
              })
            },
          },
        }
      )
    } else if (kind === 'nicht_erreichbar') {
      const versuche = res.versuche ?? 1
      const vorschlag = Boolean(res.vorschlagVerloren)
      toast.success(`Nicht erreichbar · Versuch ${versuche}`)
      onClose()
      onSaved?.()
      if (vorschlag) onSuggestVerloren?.()
      return
    } else {
      toast.success('Anfrage als verloren markiert.')
    }

    onClose()
    onSaved?.()
  }

  const formBody = (
        <div className="modal-compact-b">
          {kind === 'termin' ? (
            <div className="form-grid-2 grid gap-3 md:grid-cols-2">
              <label>
                <span className="input-label">Datum *</span>
                <input
                  type="date"
                  className="input"
                  value={datum}
                  min={todayISO()}
                  onChange={(e) => setDatum(e.target.value)}
                  required
                />
              </label>
              <label>
                <span className="input-label">Uhrzeit *</span>
                <input
                  type="time"
                  className="input"
                  value={uhrzeit}
                  onChange={(e) => setUhrzeit(e.target.value)}
                  required
                />
              </label>
              <TerminMitarbeiterSelect
                team={team}
                value={mitarbeiterId}
                onChange={setMitarbeiterId}
                loading={teamLoading}
                required
              />
              {terminAdresse ? (
                <p className="md:col-span-2 text-[length:var(--fs-meta)] text-bw-text-muted">
                  Ort: <strong className="text-bw-text">{terminAdresse}</strong>
                </p>
              ) : null}
              <div className="md:col-span-2">
                <Textarea
                  label="Notiz zum Termin"
                  value={notiz}
                  onChange={(e) => setNotiz(e.target.value)}
                  placeholder="Vor-Ort begehen, Maße aufnehmen, Wünsche notieren…"
                  rows={3}
                />
                <p className="form-field-hint mt-1">Wird im Kalender und in der Timeline gespeichert.</p>
              </div>
              <div className="md:col-span-2 space-y-3">
                {kontaktEmail ? (
                  <label className="flex cursor-pointer items-center gap-2 text-[length:var(--fs-text)]">
                    <input
                      type="checkbox"
                      checked={mailToggle}
                      onChange={(e) => setMailToggle(e.target.checked)}
                    />
                    Bestätigungs-Mail an Kunden ({kontaktEmail})
                  </label>
                ) : (
                  <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
                    Keine E-Mail beim Lead — Bestätigung nur im Kalender.
                  </p>
                )}
                <TerminBestaetigungMailEditor
                  active={mailToggle && Boolean(kontaktEmail)}
                  leadId={lead.id}
                  kontaktEmail={kontaktEmail}
                  kontaktName={kontaktName}
                  datum={datum}
                  uhrzeitVon={uhrzeit}
                  adresse={terminAdresse || null}
                  notiz={notiz.trim() || null}
                  zugewiesenAn={mitarbeiterId}
                  value={mailDraft}
                  onChange={setMailDraft}
                />
              </div>
              <div className="status-hint status-hint-green md:col-span-2">
                <Info className="h-4 w-4 shrink-0" aria-hidden />
                <span>
                  Status wird auf <strong>„Termin“</strong> gesetzt und ein Kalender-Eintrag angelegt.
                </span>
              </div>
            </div>
          ) : null}

          {kind === 'nicht_erreichbar' ? (
            <div className="space-y-3">
              <Textarea
                label="Notiz (optional)"
                value={notiz}
                onChange={(e) => setNotiz(e.target.value)}
                placeholder="Mailbox voll, keine Antwort, …"
                rows={3}
              />
              <div className="status-hint status-hint-neutral">
                <Info className="h-4 w-4 shrink-0 text-bw-text-muted" aria-hidden />
                <span>
                  Status bleibt unverändert. Der Versuch landet in der Timeline. Ab dem dritten
                  Versuch schlägt das System „Als verloren markieren“ vor.
                </span>
              </div>
            </div>
          ) : null}

          {kind === 'verloren' ? (
            <div className="space-y-3">
              <Select
                label="Warum verloren? *"
                name="grund"
                value={grund}
                onChange={(e) => setGrund(e.target.value)}
                options={Object.entries(VERLOREN_GRUND_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              <Textarea
                label="Anmerkung (optional)"
                value={notiz}
                onChange={(e) => setNotiz(e.target.value)}
                placeholder="Optional: Details zur Auswertung…"
                rows={2}
              />
              <div className="status-hint status-hint-neutral">
                <Info className="h-4 w-4 shrink-0 text-bw-text-muted" aria-hidden />
                <span>
                  Status wird auf <strong>„Verloren“</strong> gesetzt. Die Anfrage erscheint in der Übersicht
                  unter diesem Status.
                </span>
              </div>
            </div>
          ) : null}
        </div>
  )

  const formFooter = (
    <div className="sheet-footer-actions">
      <Button type="button" variant="secondary" onClick={onClose}>
        Abbrechen
      </Button>
      <Button
        type="button"
        variant={meta.danger ? 'danger' : 'primary'}
        loading={saving}
        className="inline-flex gap-1.5"
        onClick={() => void handleSave()}
      >
        <Save className="h-4 w-4" aria-hidden />
        {meta.saveLabel}
      </Button>
    </div>
  )

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={meta.title}
      context="detail"
      size="lg"
      footer={formFooter}
    >
      <p className="mb-4 text-[length:var(--fs-text)] text-bw-text-muted">{sub}</p>
      {formBody}
    </EditorSheet>
  )
}

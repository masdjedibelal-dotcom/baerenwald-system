'use client'

import { useEffect, useState } from 'react'
import {
  Calendar,
  CircleX,
  HelpCircle,
  Info,
  Save,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import {
  loadCrmTeamFuerTermin,
  saveLeadAlsVerloren,
  saveLeadRueckfrage,
  saveLeadTerminVereinbart,
} from '@/app/(dashboard)/anfragen/actions'
import { TerminMitarbeiterSelect } from '@/components/anfragen/TerminMitarbeiterSelect'
import {
  TerminBestaetigungMailEditor,
  type TerminMailDraft,
} from '@/components/anfragen/TerminBestaetigungMailEditor'
import { FormSheet } from '@/components/ui/FormSheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import { toast } from '@/components/ui/app-toast'
import type { LeadDetail } from '@/lib/types'
import type { CrmTeamMitglied } from '@/lib/crm-team'
import { anfrageAdresseAusPayload, formatAnfrageAdresseZeile } from '@/lib/anfrage-adresse'
import { leadKontaktAnzeigeName } from '@/lib/lead-display-helpers'
import { VERLOREN_GRUND_LABELS } from '@/lib/utils'

export type StatusModalKind = 'termin' | 'rueckfrage' | 'verloren'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const META: Record<
  StatusModalKind,
  { title: string; icon: LucideIcon; saveLabel: string; danger?: boolean }
> = {
  termin: { title: 'Termin vereinbart', icon: Calendar, saveLabel: 'Termin speichern' },
  rueckfrage: { title: 'Warte auf Antwort', icon: HelpCircle, saveLabel: 'Speichern' },
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
}: {
  kind: StatusModalKind | null
  lead: LeadDetail
  open: boolean
  onClose: () => void
  onSaved?: () => void
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
  const isMobile = useIsMobile()

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
  const Icon = meta.icon

  async function handleSave() {
    if (!kind) return
    setSaving(true)
    let res: { ok: true } | { ok: false; message: string }

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
    } else if (kind === 'rueckfrage') {
      if (!notiz.trim()) {
        setSaving(false)
        toast.error('Bitte einen kurzen Text eintragen.')
        return
      }
      res = await saveLeadRueckfrage({ leadId: lead.id, notiz: notiz.trim() })
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
    toast.success(
      kind === 'termin' && mailToggle && mailDraft?.to.length
        ? 'Termin gespeichert und Bestätigung per E-Mail versendet.'
        : kind === 'verloren'
          ? 'Anfrage als verloren markiert.'
          : 'Gespeichert'
    )
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
                <p className="md:col-span-2 text-xs text-bw-text-muted">
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
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={mailToggle}
                      onChange={(e) => setMailToggle(e.target.checked)}
                    />
                    Bestätigungs-Mail an Kunden ({kontaktEmail})
                  </label>
                ) : (
                  <p className="text-xs text-bw-text-muted">
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

          {kind === 'rueckfrage' ? (
            <div className="space-y-3">
              <Textarea
                label="Worum wartest du auf eine Antwort? *"
                value={notiz}
                onChange={(e) => setNotiz(e.target.value)}
                placeholder="Z. B. noch offene Infos vom Kunden, Rückruf angekündigt, Angebot abwarten…"
                rows={4}
              />
              <div className="status-hint status-hint-neutral">
                <Info className="h-4 w-4 shrink-0 text-bw-text-muted" aria-hidden />
                <span>
                  {lead.status === 'neu' ? (
                    <>
                      Status wird auf <strong>„Kontaktiert“</strong> gesetzt. Der Eintrag erscheint in der
                      Timeline.
                    </>
                  ) : (
                    <>
                      Status bleibt <strong>„Kontaktiert“</strong>, der Eintrag erscheint in der Timeline.
                    </>
                  )}
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
    <div className="flex w-full items-center gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={onClose}>
        Abbrechen
      </Button>
      <div className="flex-1" />
      <Button
        type="button"
        variant={meta.danger ? 'danger' : 'primary'}
        size="sm"
        loading={saving}
        className="inline-flex gap-1.5"
        onClick={() => void handleSave()}
      >
        <Save className="h-4 w-4" aria-hidden />
        {meta.saveLabel}
      </Button>
    </div>
  )

  if (isMobile) {
    return (
      <FormSheet open={open} onClose={onClose} breadcrumb="Anfragen" title={meta.title} footer={formFooter} width="lg">
        <p className="mb-4 text-sm text-bw-text-muted">{sub}</p>
        {formBody}
      </FormSheet>
    )
  }

  return (
    <div
      className="modal-overlay-center"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={kind === 'termin' ? 'modal-compact modal-compact-wide' : 'modal-compact'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-modal-title"
      >
        <header className="modal-compact-h">
          <div className={meta.danger ? 'modal-compact-icon modal-compact-icon-danger' : 'modal-compact-icon'}>
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="status-modal-title" className="modal-compact-title">
              {meta.title}
            </h2>
            <p className="modal-compact-sub">{sub}</p>
          </div>
        </header>

        {formBody}

        <footer className="modal-compact-f">{formFooter}</footer>
      </div>
    </div>
  )
}

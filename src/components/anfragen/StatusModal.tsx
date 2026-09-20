'use client'
import type { MockIconName } from '@/lib/mock-icons'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { DateInput } from '@/components/ui/DateInput'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'

import { MockField, MockInput } from '@/components/mock-ui/MockForm'
import { useEffect, useState } from 'react'
<<<<<<< Updated upstream
import { Combobox } from '@/components/ui/Combobox'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
=======
import {
  Calendar,
  CircleX,
  Info,
  PhoneOff,
  Save,
  type LucideIcon,
} from 'lucide-react'
import { MockBtn } from '@/components/mock-ui'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
>>>>>>> Stashed changes
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
import { TOAST } from '@/lib/copy'
import { useFieldErrors } from '@/lib/validation/form-schema'

export type StatusModalKind = 'termin' | 'nicht_erreichbar' | 'verloren'

function isHvKanal(kanal: string | null | undefined): boolean {
  const k = (kanal ?? '').trim().toLowerCase()
  return (
    k === 'hv_melder_link' ||
    k === 'hv_einladung' ||
    k === 'hv_direkt' ||
    k === 'hv_manuell' ||
    k.startsWith('hv_')
  )
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const META: Record<
  StatusModalKind,
  { title: string; icon: MockIconName; saveLabel: string; danger?: boolean }
> = {
  termin: { title: 'Termin vereinbart', icon: 'calendar', saveLabel: 'Termin speichern' },
  nicht_erreichbar: {
    title: 'Nicht erreichbar',
    icon: 'phone-off',
    saveLabel: 'Versuch speichern',
  },
  verloren: {
    title: 'Verloren',
    icon: 'circle-x',
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
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
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
    setMailToggle(!isHvKanal(lead.kanal))
    setMailDraft(null)
    if (kind === 'termin') {
      setTeamLoading(true)
      void loadCrmTeamFuerTermin()
        .then((list) => setTeam(list))
        .finally(() => setTeamLoading(false))
    }
  }, [open, kind, lead.id, lead.kanal])

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
        applyFieldErrors({ _form: TOAST.bitte_datum_waehlen })
        return
      }
      if (!uhrzeit.trim()) {
        setSaving(false)
        applyFieldErrors({ _form: TOAST.bitte_uhrzeit_waehlen })
        return
      }
      if (!mitarbeiterId.trim()) {
        setSaving(false)
        applyFieldErrors({ _form: TOAST.bitte_mitarbeiter_fuer_den_vor_ort_termin_waehle })
        return
      }
      if (mailToggle && kontaktEmail && !mailDraft?.to.length) {
        setSaving(false)
        applyFieldErrors({ _form: TOAST.bitte_mindestens_eine_empfaenger_adresse_unter_a })
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
      toast.systemError(res)
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
                if (!r.ok) toast.systemError(r)
                else {
                  toast.success(TOAST.termin_rueckgaengig)
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
      toast.success(TOAST.anfrage_als_verloren_markiert)
    }

    onClose()
    onSaved?.()
  }

  const formBody = (
        <div className="modal-compact-b">
          {kind === 'termin' ? (
            <div className="form-grid-2 grid gap-3 md:grid-cols-2">
        {fieldErrors._form ? <p className="field-error" role="alert">{fieldErrors._form}</p> : null}
        
              <label>
                <span className="input-label">Datum *</span>
                <DateInput value={datum} min={todayISO()} onChange={(e) => setDatum(e.target.value)} required />
              </label>
              <label>
                <span className="input-label">Uhrzeit *</span>
                <MockInput type="time" value={uhrzeit} onChange={(e) => setUhrzeit(e.target.value)} required />
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
                <MockField label="Notiz zum Termin"><RichTextEditor value={typeof (notiz) === 'string' ? (notiz) : ''} onChange={(__v) => setNotiz(__v)} placeholder="Vor-Ort begehen, Maße aufnehmen, Wünsche notieren…" minHeight={120} aria-label="Notiz zum Termin" /></MockField>
              </div>
              <div className="md:col-span-2 space-y-3">
                {kontaktEmail ? (
                  <label className="flex cursor-pointer items-center gap-2 text-[length:var(--fs-text)]">
                    <MockCheckbox
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
                <MockIcon n="info-circle" ctx="default" className="h-4 w-4 shrink-0" aria-hidden />
                <span>
                  Status wird auf <strong>„Termin“</strong> gesetzt und ein Kalender-Eintrag angelegt.
                </span>
              </div>
            </div>
          ) : null}

          {kind === 'nicht_erreichbar' ? (
            <div className="space-y-3">
              <MockField label="Notiz (optional)"><RichTextEditor value={typeof (notiz) === 'string' ? (notiz) : ''} onChange={(__v) => setNotiz(__v)} placeholder="Mailbox voll, keine Antwort, …" minHeight={120} aria-label="Notiz (optional)" /></MockField>
              <div className="status-hint status-hint-neutral">
                <MockIcon n="info-circle" ctx="default" className="h-4 w-4 shrink-0 text-bw-text-muted" aria-hidden />
                <span>
                  Status bleibt unverändert. Der Versuch landet in der Timeline. Ab dem dritten
                  Versuch schlägt das System „Als verloren markieren“ vor.
                </span>
              </div>
            </div>
          ) : null}

          {kind === 'verloren' ? (
            <div className="space-y-3">
              <Combobox label="Warum verloren? *" id="grund" name="grund" options={Object.entries(VERLOREN_GRUND_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))} value={grund == null ? '' : String(grund)} placeholder="Auswählen…" onChange={(next) => { setGrund(next); }} />
              <MockField label="Anmerkung (optional)"><RichTextEditor value={typeof (notiz) === 'string' ? (notiz) : ''} onChange={(__v) => setNotiz(__v)} placeholder="Optional: Details zur Auswertung…" minHeight={120} aria-label="Anmerkung (optional)" /></MockField>
              <div className="status-hint status-hint-neutral">
                <MockIcon n="info-circle" ctx="default" className="h-4 w-4 shrink-0 text-bw-text-muted" aria-hidden />
                <span>
                  Status wird auf <strong>„Verloren“</strong> gesetzt. Die Anfrage erscheint in der Übersicht
                  unter diesem Status.
                </span>
              </div>
            </div>
          ) : null}
        </div>
  )

<<<<<<< Updated upstream
  const saveAction = {
    label: meta.saveLabel,
    onClick: () => void handleSave(),
    busy: saving,
    icon: 'check' as const,
  }
=======
  const formFooter = (
    <div className="sheet-footer-actions">
      <MockBtn type="button" kind="secondary" onClick={onClose}>
        Abbrechen
      </MockBtn>
      <MockBtn
        type="button"
        kind={meta.danger ? 'danger' : 'primary'}
        loading={saving}
        className="inline-flex gap-1.5"
        onClick={() => void handleSave()}
      >
        <Save className="h-4 w-4" aria-hidden />
        {meta.saveLabel}
      </MockBtn>
    </div>
  )
>>>>>>> Stashed changes

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={meta.title}
      context="detail"
      size="lg"
      secondary={{ label: 'Abbrechen', onClick: onClose }}
      primary={meta.danger ? null : saveAction}
      danger={meta.danger ? saveAction : null}
    >
      <p className="mb-4 text-[length:var(--fs-text)] text-bw-text-muted">{sub}</p>
      {formBody}
    </EditorSheet>
  )
}

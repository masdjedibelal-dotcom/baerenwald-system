'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { updateLeadMelderUndLeistungsort } from '@/app/(dashboard)/anfragen/actions'
import { fetchKundenObjekte } from '@/app/actions/kunden-objekte'
import { listGewerkeFuerFab } from '@/app/(dashboard)/neu/fab-neu-actions'
import {
  draftFromLeadMelder,
  MelderLeistungsortFields,
  type MelderLeistungsortDraft,
} from '@/components/crm/MelderLeistungsortFields'
import { KundenObjektModal } from '@/components/kunden/KundenObjektModal'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { toast } from '@/components/ui/app-toast'
import { resolveLeadLeistungsort } from '@/lib/anfragen/resolve-lead-leistungsort'
import { resolveLeadKunde } from '@/lib/lead-display-helpers'
import { resolvePipelineKontext } from '@/lib/leads/pipeline-kontext'
import type { Gewerk, KundenObjekt, LeadDetail, OrgFreigabeStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { leadIstAkut } from '@/lib/anfragen/anfrage-akut-schwelle'

function telHref(tel: string) {
  return `tel:${tel.replace(/\s/g, '')}`
}

function melderName(lead: LeadDetail): string {
  const n = lead.melder_name?.trim()
  if (n) return n
  const k = resolveLeadKunde(lead.kunden)
  const name = k?.name?.trim()
  if (name) return name
  return lead.kontakt_name?.trim() || '—'
}

function melderAdresse(lead: LeadDetail): string {
  const k = resolveLeadKunde(lead.kunden)
  const strasse = [k?.strasse?.trim(), k?.hausnummer?.trim()].filter(Boolean).join(' ')
  const plzOrt = [k?.plz?.trim() || lead.plz?.trim(), k?.ort?.trim()].filter(Boolean).join(' ')
  const einheit = lead.melder_einheit?.trim()
  return [strasse, plzOrt, einheit ? `Einheit ${einheit}` : null].filter(Boolean).join(', ') || '—'
}

function formatEur(n: number): string {
  return `${n.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`
}

const FREIGABE_BADGE: Record<
  OrgFreigabeStatus,
  { label: string; tone: 'yel' | 'grn' | 'muted' | 'red' }
> = {
  ausstehend: { label: 'Ausstehend', tone: 'yel' },
  beschluss_ausstehend: { label: 'Wartet auf Beschluss', tone: 'yel' },
  freigegeben: { label: 'Freigegeben', tone: 'grn' },
  nicht_noetig: { label: 'Nicht nötig', tone: 'muted' },
  abgelehnt: { label: 'Abgelehnt', tone: 'red' },
}

function PropRow({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === '' || value === '—') {
    return (
      <div className="prop">
        <div className="prop-l">{label}</div>
        <div className="prop-v">—</div>
      </div>
    )
  }
  return (
    <div className="prop">
      <div className="prop-l">{label}</div>
      <div className="prop-v">{value}</div>
    </div>
  )
}

/**
 * HV-Meldung: Melder + Leistungsort.
 * Schwellen-Hinweis nur nach Angebot und nur wenn Direktauftrag unter Schwelle möglich ist.
 * Stift: Melder/Objekt im CRM nachträglich setzen (ohne Anfrage-Wizard).
 */
export function HvMeldungKontextCards({
  lead,
  direktAuftragUnterSchwelle,
  angebotId,
  onSaved,
}: {
  lead: LeadDetail
  /**
   * Nur am Angebot setzen, wenn Betrag ≤ Freigabe-Schwelle → Direktauftrag ohne HV.
   * Vorher / sonst: kein Schwellen-Hinweis.
   */
  direktAuftragUnterSchwelle?: {
    betragEur: number
    schwelleEur: number
  } | null
  angebotId?: string | null
  onSaved?: () => void
}) {
  if (resolvePipelineKontext(lead) !== 'hv_meldung') return null

  const objekt = lead.kunden_objekte
  const leistungsort = resolveLeadLeistungsort(lead)
  const agKundeId = lead.auftraggeber_kunde_id ?? lead.auftraggeber?.id ?? null
  const objektHref =
    objekt?.id && agKundeId ? `/kunden/${agKundeId}/objekte/${objekt.id}` : null
  const objektTitel = objekt?.titel?.trim() || null

  const freigabe = lead.org_freigabe_status
    ? FREIGABE_BADGE[lead.org_freigabe_status]
    : null
  const notfallAutopass = (lead.hv_meldung_status ?? '').trim() === 'notmassnahme'
  const istAkut = leadIstAkut(lead)

  const melderTel = lead.melder_telefon?.trim() || lead.kontakt_telefon?.trim() || null
  const melderMail = lead.melder_email?.trim() || lead.kontakt_email?.trim() || null

  const showDirektUnterSchwelle =
    direktAuftragUnterSchwelle != null &&
    Number.isFinite(direktAuftragUnterSchwelle.betragEur) &&
    direktAuftragUnterSchwelle.betragEur > 0 &&
    Number.isFinite(direktAuftragUnterSchwelle.schwelleEur) &&
    direktAuftragUnterSchwelle.schwelleEur > 0

  const [editOpen, setEditOpen] = useState(false)
  const [objektNeuOpen, setObjektNeuOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<MelderLeistungsortDraft>(() => draftFromLeadMelder(lead))
  const [objekte, setObjekte] = useState<KundenObjekt[]>([])
  const [gewerke, setGewerke] = useState<Gewerk[]>([])

  useEffect(() => {
    if (!editOpen) return
    setDraft(draftFromLeadMelder(lead))
  }, [editOpen, lead])

  useEffect(() => {
    if (!editOpen || !agKundeId) {
      setObjekte([])
      return
    }
    let cancelled = false
    void fetchKundenObjekte(agKundeId).then((rows) => {
      if (!cancelled) setObjekte(rows)
    })
    return () => {
      cancelled = true
    }
  }, [editOpen, agKundeId])

  useEffect(() => {
    if (!editOpen) return
    void listGewerkeFuerFab()
      .then((r) => setGewerke(r.ok ? (r.gewerke as Gewerk[]) : []))
      .catch(() => setGewerke([]))
  }, [editOpen])

  async function saveEdit() {
    if (saving) return
    setSaving(true)
    try {
      const r = await updateLeadMelderUndLeistungsort(lead.id, {
        melder_name: draft.melder_name || null,
        melder_email: draft.melder_email || null,
        melder_telefon: draft.melder_telefon || null,
        melder_einheit: draft.melder_einheit || null,
        kunde_objekt_id: draft.kunde_objekt_id,
        objekt_anlage_id: draft.objekt_anlage_id,
        angebotId: angebotId ?? null,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Melder & Leistungsort gespeichert')
      setEditOpen(false)
      onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="card">
        <div className="card-h">
          <div className="card-title title">Melder</div>
          <div className="inline-flex flex-wrap items-center gap-1">
            {istAkut || notfallAutopass ? (
              <span className={cn('hvk-badge', 'hvk-badge--yel')}>Direktauftrag</span>
            ) : null}
            {freigabe && freigabe.tone !== 'muted' ? (
              <span className={cn('hvk-badge', `hvk-badge--${freigabe.tone}`)}>
                {freigabe.label}
              </span>
            ) : null}
            <MockBtn
              sm
              kind="ghost"
              icon="pencil"
              title="Melder & Leistungsort bearbeiten"
              onClick={() => setEditOpen(true)}
            />
          </div>
        </div>
        <div className="card-b">
          {showDirektUnterSchwelle && direktAuftragUnterSchwelle ? (
            <div className="mb-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2,#f7f7f5)] px-3 py-2">
              <div className="text-[length:var(--fs-meta)] font-semibold text-[var(--text)]">
                Direktauftrag möglich — unter Freigabe-Schwelle
              </div>
              <p className="mt-0.5 text-[length:var(--fs-meta)] text-[var(--text-3)]">
                Angebotspreis {formatEur(direktAuftragUnterSchwelle.betragEur)} ≤ Schwelle{' '}
                {formatEur(direktAuftragUnterSchwelle.schwelleEur)}. Auftrag ohne HV-Freigabe /
                ohne Kundenmail anlegen.
              </p>
            </div>
          ) : null}
          <div className="detail-soft-block">
            <div className="props">
              <PropRow label="Name" value={melderName(lead)} />
              <PropRow
                label="Telefon"
                value={
                  melderTel ? (
                    <a className="link" href={telHref(melderTel)}>
                      {melderTel}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <PropRow
                label="E-Mail"
                value={
                  melderMail ? (
                    <a className="link" href={`mailto:${melderMail}`}>
                      {melderMail}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <PropRow label="Adresse" value={melderAdresse(lead)} />
            </div>
          </div>

          <div className="detail-soft-block">
            <div className="detail-soft-block__h">
              Leistungsort
              {objektTitel ? (
                <>
                  {' · '}
                  {objektHref ? (
                    <Link href={objektHref} className="link">
                      {objektTitel}
                    </Link>
                  ) : (
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{objektTitel}</span>
                  )}
                </>
              ) : null}
            </div>
            <div className="props">
              <PropRow label="Straße" value={leistungsort.strasse || '—'} />
              <PropRow label="Hausnummer" value={leistungsort.hausnummer || '—'} />
              <PropRow label="PLZ" value={leistungsort.plz || '—'} />
              <PropRow label="Ort" value={leistungsort.ort || '—'} />
              <PropRow
                label="Anlage / Teil"
                value={lead.objekt_anlagen?.bezeichnung?.trim() || '—'}
              />
            </div>
          </div>
        </div>
      </div>

      <EditorSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Melder & Leistungsort"
        headerEnd={
          <button
            type="button"
            className="editor-sheet__confirm-text"
            disabled={saving}
            onClick={() => void saveEdit()}
          >
            {saving ? '…' : 'Speichern'}
          </button>
        }
      >
        <MelderLeistungsortFields
          draft={draft}
          onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          objekte={objekte}
          onNeuObjekt={agKundeId ? () => setObjektNeuOpen(true) : undefined}
          disabled={saving}
          kundeId={agKundeId}
          gewerke={gewerke}
        />
      </EditorSheet>

      {agKundeId ? (
        <KundenObjektModal
          open={objektNeuOpen}
          onClose={() => setObjektNeuOpen(false)}
          kundeId={agKundeId}
          onSaved={(objekt) => {
            setObjekte((prev) => {
              if (prev.some((o) => o.id === objekt.id)) return prev
              return [...prev, objekt]
            })
            setDraft((prev) => ({ ...prev, kunde_objekt_id: objekt.id }))
            setObjektNeuOpen(false)
          }}
        />
      ) : null}
    </>
  )
}

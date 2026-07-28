'use client'

import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { toast } from '@/components/ui/app-toast'
import { updateLeadBeschreibung, updateLeadKontakt } from '@/app/(dashboard)/anfragen/actions'
import type { ProjektKontext } from '@/lib/crm/projekt-kontext-types'
import {
  angebotNrAnzeige,
  angebotStatusKurz,
  auftragStatusKurz,
  formatEurKurz,
  rechnungStatusKurz,
} from '@/lib/vorgang/projekt-kontext-labels'
import { hrefWithAkteFrom, type AkteFromRef } from '@/lib/vorgang/akte-from'
import { resolveLeadPreisAnzeige } from '@/lib/lead-display-helpers'
import { formatDatum, kanalLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { LeadDetail } from '@/lib/types'
import { useIsMobile } from '@/hooks/useIsMobile'

type PhaseKind = 'anfrage' | 'angebot' | 'auftrag' | 'rechnung'
type PhaseState = 'done' | 'current' | 'open'

type PhaseRowModel = {
  kind: PhaseKind
  label: string
  state: PhaseState
  kopf: string
  betrag?: string | null
  href: string | null
  sheetTitle: string
  props: { k: string; v: string }[]
  /** Keine Angebotsnummer in Anfrage-Props — Grep-Abnahme */
  editMode: 'anfrage-sheet' | 'navigate-canvas' | null
}

function hasAngebotRecord(
  a: ProjektKontext['angebote'][number] | undefined
): a is ProjektKontext['angebote'][number] {
  return Boolean(a?.id)
}

function hasRealAngebotNummer(a: ProjektKontext['angebote'][number] | undefined): boolean {
  return Boolean(a?.angebotsnr?.trim())
}

/**
 * Mock „Verlauf des Vorgangs“ — vier Phasen-Zeilen (.vgp-*), Sheet 560px / Bottom.
 */
export function VorgangPhasenVerlauf({
  kontext,
  fromRef,
  lead,
  onSaved,
  className,
}: {
  kontext: ProjektKontext | null | undefined
  fromRef?: AkteFromRef | null
  lead: LeadDetail
  onSaved?: () => void
  className?: string
}) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [readKind, setReadKind] = useState<PhaseKind | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const withFrom = (href: string) =>
    fromRef ? hrefWithAkteFrom(href, fromRef) : href

  const rows = useMemo(
    () => buildPhaseRows(kontext, lead, withFrom),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- withFrom stable via fromRef
    [kontext, lead, fromRef]
  )

  const active = rows.find((r) => r.kind === readKind) ?? null

  function openRow(row: PhaseRowModel) {
    if (row.state === 'open') return
    setEditOpen(false)
    setReadKind(row.kind)
  }

  function closeRead() {
    setEditOpen(false)
    setReadKind(null)
  }

  function onBearbeiten() {
    if (!active) return
    if (active.editMode === 'navigate-canvas' && active.href) {
      closeRead()
      router.push(active.href)
      return
    }
    if (active.editMode === 'anfrage-sheet') {
      setEditOpen(true)
    }
  }

  function onZurPhase() {
    if (!active?.href) return
    closeRead()
    router.push(active.href)
  }

  return (
    <>
      <div className={cn('card', className)}>
        <div className="card-h">
          <div className="card-title title">Verlauf des Vorgangs</div>
        </div>
        <div className="card-b">
          <div className="vgp-list" role="list">
            {rows.map((row, i) => {
              const isLast = i === rows.length - 1
              const clickable = row.state !== 'open'
              return (
                <div
                  key={row.kind}
                  role="listitem"
                  className={cn('vgp', row.state, isLast && 'last')}
                >
                  <button
                    type="button"
                    className="vgp-head"
                    disabled={!clickable}
                    onClick={() => openRow(row)}
                    aria-label={`${row.label}: ${row.kopf}`}
                  >
                    <span className="vgp-rail" aria-hidden>
                      <span className="vgp-dot" />
                    </span>
                    <span className="vgp-body">
                      <span className="vgp-top">
                        <span className="vgp-label">{row.label}</span>
                        <span
                          className={cn('vgp-kopf', row.state === 'open' && 'vgp-leer')}
                        >
                          {row.kopf}
                        </span>
                        {row.betrag ? (
                          <span className="vgp-betrag">{row.betrag}</span>
                        ) : null}
                      </span>
                    </span>
                    {clickable ? (
                      <ChevronRight className="vgp-chv" size={16} aria-hidden />
                    ) : null}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <EditorSheet
        open={Boolean(active) && !(editOpen && !isMobile)}
        onClose={closeRead}
        title={active?.sheetTitle ?? ''}
        size="lg"
        className={cn(editOpen && isMobile && 'editor-sheet--recessed')}
        overlayClassName={cn(editOpen && isMobile && 'editor-sheet-overlay--recessed')}
        footer={
          active && !editOpen ? (
            <div className="phase-sheet-footer">
              {active.editMode ? (
                <button type="button" className="btn ghost" onClick={onBearbeiten}>
                  Bearbeiten
                </button>
              ) : null}
              {active.href ? (
                <button type="button" className="btn primary" onClick={onZurPhase}>
                  Zur Phase
                </button>
              ) : (
                <button type="button" className="btn ghost" onClick={closeRead}>
                  Schließen
                </button>
              )}
            </div>
          ) : null
        }
      >
        {active ? (
          <div className="phase-sheet-props props">
            {active.props.map((p) => (
              <div key={p.k} className="prop">
                <span className="k">{p.k}</span>
                <span className="v">{p.v}</span>
              </div>
            ))}
          </div>
        ) : null}
      </EditorSheet>

      <AnfragePhaseEditSheet
        open={editOpen && readKind === 'anfrage'}
        lead={lead}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false)
          onSaved?.()
        }}
      />
    </>
  )
}

function buildPhaseRows(
  kontext: ProjektKontext | null | undefined,
  lead: LeadDetail,
  withFrom: (href: string) => string
): PhaseRowModel[] {
  const angebot = kontext?.angebote[0]
  const hasAngebot = hasAngebotRecord(angebot)
  const auftrag = kontext?.auftrag ?? null
  const latestRe = kontext
    ? [...kontext.rechnungen].sort((a, b) =>
        String(b.rechnungsdatum || b.created_at || '').localeCompare(
          String(a.rechnungsdatum || a.created_at || '')
        )
      )[0]
    : undefined
  const hasRechnung = Boolean(latestRe)

  const budget = resolveLeadPreisAnzeige(
    lead.kanal,
    lead.budget_ca,
    lead.preis_min,
    lead.preis_max,
    lead.funnel_daten
  )

  const anfrageTitel =
    kontext?.lead?.label?.trim() ||
    lead.situation?.trim() ||
    'Anfrage'

  // Zustände aus Daten, nicht aus Phasenfeld
  let anfrageState: PhaseState = 'current'
  let angebotState: PhaseState = 'open'
  let auftragState: PhaseState = 'open'
  let rechnungState: PhaseState = 'open'

  if (hasRechnung) {
    anfrageState = 'done'
    angebotState = 'done'
    auftragState = 'done'
    rechnungState = 'current'
  } else if (auftrag) {
    anfrageState = 'done'
    angebotState = 'done'
    auftragState = 'current'
  } else if (hasAngebot) {
    anfrageState = 'done'
    angebotState = 'current'
  }

  const anfrageKopf =
    anfrageState === 'done'
      ? `eingegangen ${lead.created_at ? formatDatum(lead.created_at) : '—'}`
      : anfrageState === 'current'
        ? lead.created_at
          ? `eingegangen ${formatDatum(lead.created_at)}`
          : 'in Bearbeitung'
        : 'noch nicht erstellt'

  // Anfrage-Props: keine angebot.nummer
  const anfrageProps: { k: string; v: string }[] = [
    {
      k: 'Eingegangen',
      v: lead.created_at ? formatDatum(lead.created_at) : '—',
    },
    { k: 'Quelle', v: kanalLabel(lead.kanal) || '—' },
    { k: 'Anliegen', v: anfrageTitel },
    { k: 'Budgetrahmen', v: budget === '—' ? '—' : budget },
    { k: 'Vorgang', v: lead.id.slice(0, 8).toUpperCase() },
  ]

  const angebotNr = hasAngebot
    ? angebotNrAnzeige(angebot!.angebotsnr, angebot!.id)
    : null

  return [
    {
      kind: 'anfrage',
      label: 'Anfrage',
      state: anfrageState,
      kopf: anfrageKopf,
      betrag: budget !== '—' ? budget : null,
      href: withFrom(`/anfragen/${lead.id}`),
      sheetTitle: 'Anfrage',
      props: anfrageProps,
      editMode: 'anfrage-sheet',
    },
    {
      kind: 'angebot',
      label: 'Angebot',
      state: angebotState,
      kopf:
        angebotState === 'open'
          ? 'noch nicht erstellt'
          : angebotState === 'current'
            ? angebotStatusKurz(angebot!.status, angebot!.status_einfach) ||
              'in Bearbeitung'
            : `angenommen ${angebot?.created_at ? formatDatum(angebot.created_at) : ''}`.trim(),
      betrag: hasAngebot
        ? formatEurKurz(
            angebot!.gesamt_fix ?? angebot!.gesamt_max ?? angebot!.gesamt_min
          )
        : null,
      href: hasAngebot ? withFrom(`/angebote/${angebot!.id}`) : null,
      sheetTitle: angebotNr ? `Angebot ${angebotNr}` : 'Angebot',
      props: hasAngebot
        ? [
            ...(hasRealAngebotNummer(angebot)
              ? [{ k: 'Nummer', v: angebot!.angebotsnr!.trim() }]
              : []),
            {
              k: 'Datum',
              v: angebot!.created_at ? formatDatum(angebot!.created_at) : '—',
            },
            {
              k: 'Summe',
              v:
                formatEurKurz(
                  angebot!.gesamt_fix ?? angebot!.gesamt_max ?? angebot!.gesamt_min
                ) || '—',
            },
            {
              k: 'Status',
              v: angebotStatusKurz(angebot!.status, angebot!.status_einfach),
            },
            {
              k: 'Gültigkeit',
              v: angebot!.gueltig_bis ? formatDatum(angebot!.gueltig_bis) : '—',
            },
          ]
        : [],
      editMode: hasAngebot ? 'navigate-canvas' : null,
    },
    {
      kind: 'auftrag',
      label: 'Auftrag',
      state: auftragState,
      kopf:
        auftragState === 'open'
          ? 'noch nicht erstellt'
          : auftragStatusKurz(auftrag!.status) || 'in Bearbeitung',
      betrag: null,
      href: auftrag ? withFrom(`/auftraege/${auftrag.id}`) : null,
      sheetTitle: auftrag?.titel?.trim() || 'Auftrag',
      props: auftrag
        ? [
            { k: 'Titel', v: auftrag.titel?.trim() || '—' },
            {
              k: 'Datum',
              v: auftrag.created_at ? formatDatum(auftrag.created_at) : '—',
            },
            { k: 'Status', v: auftragStatusKurz(auftrag.status) },
          ]
        : [],
      editMode: auftrag ? 'navigate-canvas' : null,
    },
    {
      kind: 'rechnung',
      label: 'Rechnung',
      state: rechnungState,
      kopf:
        rechnungState === 'open'
          ? 'noch nicht erstellt'
          : rechnungStatusKurz(latestRe!.status) || 'in Bearbeitung',
      betrag: hasRechnung ? formatEurKurz(latestRe!.brutto) : null,
      href: hasRechnung ? withFrom(`/rechnungen/${latestRe!.id}`) : null,
      sheetTitle: latestRe?.rechnungsnummer?.trim()
        ? `Rechnung ${latestRe.rechnungsnummer.trim()}`
        : 'Rechnung',
      props: hasRechnung
        ? [
            {
              k: 'Nummer',
              v: latestRe!.rechnungsnummer?.trim() || '—',
            },
            {
              k: 'Datum',
              v: latestRe!.rechnungsdatum
                ? formatDatum(latestRe!.rechnungsdatum)
                : '—',
            },
            { k: 'Summe', v: formatEurKurz(latestRe!.brutto) || '—' },
            { k: 'Status', v: rechnungStatusKurz(latestRe!.status) },
          ]
        : [],
      editMode: hasRechnung ? 'navigate-canvas' : null,
    },
  ]
}

function AnfragePhaseEditSheet({
  open,
  lead,
  onClose,
  onSaved,
}: {
  open: boolean
  lead: LeadDetail
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(lead.kontakt_name ?? '')
  const [telefon, setTelefon] = useState(lead.kontakt_telefon ?? '')
  const [email, setEmail] = useState(lead.kontakt_email ?? '')
  const [anliegen, setAnliegen] = useState(lead.situation ?? '')
  const [ort, setOrt] = useState(lead.kunden?.ort ?? '')
  const [plz, setPlz] = useState(lead.plz ?? lead.kunden?.plz ?? '')
  const [budgetVon, setBudgetVon] = useState(
    lead.preis_min != null ? String(lead.preis_min) : ''
  )
  const [budgetBis, setBudgetBis] = useState(
    lead.preis_max != null ? String(lead.preis_max) : lead.budget_ca != null ? String(lead.budget_ca) : ''
  )
  const [notiz, setNotiz] = useState(lead.kontakt_nachricht ?? '')
  const [pending, startTransition] = useTransition()

  // Sync when opening
  useEffect(() => {
    if (!open) return
    setName(lead.kontakt_name ?? '')
    setTelefon(lead.kontakt_telefon ?? '')
    setEmail(lead.kontakt_email ?? '')
    setAnliegen(lead.situation ?? '')
    setOrt(lead.kunden?.ort ?? '')
    setPlz(lead.plz ?? lead.kunden?.plz ?? '')
    setBudgetVon(lead.preis_min != null ? String(lead.preis_min) : '')
    setBudgetBis(
      lead.preis_max != null
        ? String(lead.preis_max)
        : lead.budget_ca != null
          ? String(lead.budget_ca)
          : ''
    )
    setNotiz(lead.kontakt_nachricht ?? '')
  }, [open, lead])

  function save() {
    startTransition(async () => {
      const k = await updateLeadKontakt(lead.id, {
        kontakt_name: name.trim() || '—',
        kontakt_telefon: telefon.trim() || null,
        kontakt_email: email.trim() || null,
        plz: plz.trim() || null,
      })
      if (!k.ok) {
        toast.error(k.message)
        return
      }
      const b = await updateLeadBeschreibung(lead.id, notiz)
      if (!b.ok) {
        toast.error(b.message)
        return
      }
      toast.success('Anfrage gespeichert')
      onSaved()
    })
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Anfrage bearbeiten"
      size="lg"
      dirty={false}
      overlayClassName="editor-sheet-overlay--stack"
      footer={
        <div className="phase-sheet-footer" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="btn ghost" onClick={onClose} disabled={pending}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={save}
            disabled={pending}
          >
            <MockIcon ctx="default" n="check" size={14} />
            Speichern
          </button>
        </div>
      }
    >
      <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        <p className="text-[length:var(--fs-meta)] font-bold uppercase tracking-wide text-bw-text-muted">
          Kontakt
        </p>
        <label className="field">
          <span>Name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>Telefon</span>
          <input className="input" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
        </label>
        <label className="field">
          <span>E-Mail</span>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <p className="text-[length:var(--fs-meta)] font-bold uppercase tracking-wide text-bw-text-muted mt-3">
          Anliegen
        </p>
        <label className="field">
          <span>Leistung / Projekt</span>
          <input
            className="input"
            value={anliegen}
            onChange={(e) => setAnliegen(e.target.value)}
            readOnly
            title="Vorhaben über Bearbeiten-Wizard ändern"
          />
        </label>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label className="field">
            <span>Region / Stadtteil</span>
            <input className="input" value={ort} onChange={(e) => setOrt(e.target.value)} readOnly />
          </label>
          <label className="field">
            <span>PLZ</span>
            <input className="input" value={plz} onChange={(e) => setPlz(e.target.value)} />
          </label>
          <label className="field">
            <span>Budget von</span>
            <input className="input" value={budgetVon} readOnly />
          </label>
          <label className="field">
            <span>Budget bis</span>
            <input className="input" value={budgetBis} readOnly />
          </label>
        </div>
        <label className="field">
          <span>Quelle</span>
          <input className="input" value={kanalLabel(lead.kanal)} readOnly />
        </label>
        <label className="field">
          <span>Notiz</span>
          <textarea
            className="input"
            rows={4}
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
          />
        </label>
      </div>
    </EditorSheet>
  )
}

/** @deprecated unused — kept for typecheck of optional children patterns */
export type VorgangPhasenVerlaufSlot = ReactNode

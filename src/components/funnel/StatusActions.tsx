'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronUp, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusActionsEntity = 'lead' | 'angebot' | 'auftrag' | 'rechnung'

export type StatusActionsProps = {
  typ: StatusActionsEntity
  status: string
  id: string
  data?: Record<string, unknown>
  onAction: (action: string, data?: unknown) => void
  disabled?: boolean
  /** Standard: fixierte Leiste (unten mobil / oben rechts Desktop). `inline`: eingebettet im Fluss (z. B. Angebots-Detail). */
  layout?: 'fixed' | 'inline'
}

type Tier = 'primary' | 'secondary' | 'destructive' | 'milestone'

type ActionBtn = {
  id: string
  label: string
  tier: Tier
  disabled?: boolean
}

type ActionInfo = { message: string; href?: string; hint?: string }

function num(data: Record<string, unknown> | undefined, key: string): number {
  const v = data?.[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function str(data: Record<string, unknown> | undefined, key: string): string | undefined {
  const v = data?.[key]
  return typeof v === 'string' ? v : undefined
}

function bool(data: Record<string, unknown> | undefined, key: string): boolean {
  return Boolean(data?.[key])
}

function buildModel(
  typ: StatusActionsEntity,
  status: string,
  id: string,
  data?: Record<string, unknown>
): { info?: ActionInfo; primary?: ActionBtn; secondary: ActionBtn[]; destructive: ActionBtn[]; milestone?: ActionBtn } {
  const secondary: ActionBtn[] = []
  const destructive: ActionBtn[] = []
  let info: ActionInfo | undefined
  let primary: ActionBtn | undefined
  let milestone: ActionBtn | undefined

  if (typ === 'lead') {
    if (status === 'neu') {
      primary = { id: 'lead.kontakt', label: '📞 Kontakt aufnehmen', tier: 'primary' }
      secondary.push(
        { id: 'lead.vor_ort_termin', label: '📋 Vor-Ort Termin', tier: 'secondary' },
        { id: 'navigate', label: '📄 Angebot erstellen', tier: 'secondary' }
      )
      destructive.push({ id: 'lead.nicht_qualifiziert', label: '✗ Nicht qualifiziert', tier: 'destructive' })
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'kontaktiert') {
      primary = { id: 'navigate', label: '📄 Angebot erstellen', tier: 'primary' }
      secondary.push(
        { id: 'lead.vor_ort_termin', label: '📋 Vor-Ort Termin', tier: 'secondary' },
        { id: 'lead.termin_anlegen', label: '📅 Termin anlegen', tier: 'secondary' }
      )
      destructive.push({ id: 'lead.kein_interesse', label: '✗ Nicht qualifiziert', tier: 'destructive' })
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'angebot') {
      info = { message: 'Angebot in Bearbeitung', href: str(data, 'angebot_href') ?? `/angebote/${str(data, 'angebot_id') ?? ''}` }
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'auftrag') {
      info = { message: 'Auftrag läuft', href: str(data, 'auftrag_href') ?? `/auftraege/${str(data, 'auftrag_id') ?? ''}` }
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'abgeschlossen') {
      info = {
        message: '✓ Abgeschlossen',
        hint: str(data, 'abgeschlossen_datum') ? `Am ${str(data, 'abgeschlossen_datum')}` : undefined,
      }
      return { info, primary, secondary, destructive, milestone }
    }
  }

  if (typ === 'angebot') {
    if (status === 'entwurf') {
      primary = { id: 'angebot.send_handwerker', label: '📧 An Handwerker senden', tier: 'primary' }
      secondary.push(
        { id: 'navigate', label: '✏️ Bearbeiten', tier: 'secondary' },
        { id: 'angebot.kopieren', label: '📋 Kopieren', tier: 'secondary' }
      )
      destructive.push({
        id: 'angebot.loeschen',
        label: '🗑️ Löschen',
        tier: 'destructive',
        disabled: bool(data, 'hat_auftrag'),
      })
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'gesendet_handwerker') {
      const ok = num(data, 'hw_angenommen')
      const total = num(data, 'hw_gesamt') || 1
      info = { message: `Warte auf Handwerker (${ok} von ${total} bestätigt)` }
      secondary.unshift({ id: 'angebot.hw_akzeptiert', label: '✅ Handwerker hat bestätigt', tier: 'secondary' })
      if (ok >= total && total > 0) {
        primary = { id: 'angebot.send_kunde', label: '📧 An Kunden senden', tier: 'primary' }
      }
      if (bool(data, 'hw_hat_abgelehnt')) {
        secondary.push({ id: 'angebot.add_handwerker', label: '➕ Anderen Handwerker', tier: 'secondary' })
      }
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'handwerker_akzeptiert') {
      primary = { id: 'angebot.send_kunde', label: '📧 An Kunden senden', tier: 'primary' }
      secondary.push({ id: 'navigate', label: '✏️ Angebot anpassen', tier: 'secondary' })
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'gesendet_kunde') {
      primary = { id: 'angebot.mark_kunde_akzeptiert', label: '✅ Kunde hat angenommen', tier: 'primary' }
      secondary.push({ id: 'angebot.nachfassen', label: '📞 Nachfassen', tier: 'secondary' })
      destructive.push({ id: 'angebot.kunde_abgelehnt', label: '❌ Kunde hat abgelehnt', tier: 'destructive' })
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'kunde_akzeptiert') {
      primary = { id: 'auftrag.create_modal', label: '🏗️ Auftrag erstellen', tier: 'primary' }
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'abgelehnt') {
      primary = { id: 'navigate', label: '📋 Angebot kopieren', tier: 'primary' }
      const grund = str(data, 'ablehnung_grund')
      if (grund) info = { message: `Ablehnung: ${grund}` }
      return { info, primary, secondary, destructive, milestone }
    }
  }

  if (typ === 'auftrag') {
    if (status === 'offen') {
      primary = { id: 'auftrag.start_arbeit', label: '▶️ Arbeiten starten', tier: 'primary' }
      secondary.push(
        { id: 'auftrag.termin', label: '📅 Termin anlegen', tier: 'secondary' },
        { id: 'auftrag.mail_kunde', label: '📧 Update an Kunden', tier: 'secondary' }
      )
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'in_arbeit') {
      primary = { id: 'auftrag.formular_hw', label: '📋 Formular an Handwerker', tier: 'primary' }
      secondary.push(
        { id: 'auftrag.mail_kunde', label: '📧 Update an Kunden', tier: 'secondary' },
        { id: 'auftrag.nachtrag', label: '⚠️ Nachtrag erstellen', tier: 'secondary' },
        { id: 'auftrag.termin', label: '📅 Termin', tier: 'secondary' }
      )
      milestone = { id: 'auftrag.zur_abnahme', label: '🏁 Zur Abnahme', tier: 'milestone' }
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'abnahme') {
      if (bool(data, 'alle_maengel_behoben')) {
        primary = { id: 'auftrag.abnahme_abschliessen', label: '✅ Abnahme abschließen', tier: 'primary' }
      } else {
        primary = { id: 'auftrag.protokoll', label: '📋 Protokoll generieren', tier: 'primary' }
      }
      secondary.push(
        { id: 'auftrag.mangel', label: '➕ Mangel hinzufügen', tier: 'secondary' },
        { id: 'auftrag.abnahme_mail', label: '📧 Abnahme-Termin Mail', tier: 'secondary' }
      )
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'abgeschlossen') {
      primary = { id: 'navigate', label: '🧾 Rechnung erstellen', tier: 'primary' }
      secondary.push(
        { id: 'navigate', label: '📄 Protokoll herunterladen', tier: 'secondary' },
        { id: 'auftrag.bewertung', label: '⭐ Bewertung anfragen', tier: 'secondary' }
      )
      return { info, primary, secondary, destructive, milestone }
    }
  }

  if (typ === 'rechnung') {
    if (status === 'entwurf') {
      primary = { id: 'rechnung.senden', label: '📧 Rechnung senden', tier: 'primary' }
      secondary.push(
        { id: 'navigate', label: '✏️ Bearbeiten', tier: 'secondary' },
        { id: 'navigate', label: '👁️ Vorschau', tier: 'secondary' }
      )
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'gesendet') {
      const tage = num(data, 'tage_ueberfaellig')
      if (tage > 0) {
        primary = { id: 'rechnung.zahlungserinnerung', label: '⚠️ Zahlungserinnerung', tier: 'primary' }
      }
      secondary.push({ id: 'rechnung.bezahlt', label: '✅ Als bezahlt markieren', tier: 'secondary' })
      const fd = str(data, 'faellig_am')
      info = { message: fd ? `Fällig am ${fd}` : 'Fälligkeit offen', hint: tage > 0 ? `${tage} Tage überfällig` : undefined }
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'bezahlt') {
      const b = str(data, 'bezahlt_am')
      info = { message: b ? `✓ Bezahlt am ${b}` : '✓ Bezahlt' }
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'storniert') {
      info = { message: 'Storniert' }
      return { info, primary, secondary, destructive, milestone }
    }
  }

  return { info, primary, secondary, destructive, milestone }
}

function hrefForSecondary(typ: StatusActionsEntity, id: string, btn: ActionBtn): string | null {
  if (btn.id !== 'navigate') return null
  if (btn.label.includes('Vor-Ort')) return `/anfragen/${id}/vorab`
  if (btn.label.includes('Angebot erstellen')) return `/angebote/neu?lead_id=${id}`
  if (btn.label.includes('Bearbeiten') && typ === 'angebot') return `/angebote/neu?angebot_id=${id}`
  if (btn.label.includes('Vorschau') && typ === 'rechnung') return `/api/rechnungen/${id}/pdf`
  if (btn.label.includes('Bearbeiten') && typ === 'rechnung') return `/rechnungen/${id}`
  if (btn.label.includes('Rechnung erstellen')) return `/rechnungen/neu?auftrag_id=${id}`
  if (btn.label.includes('Protokoll herunterladen')) return null
  return null
}

function btnClass(tier: Tier, disabled?: boolean) {
  const base = 'inline-flex items-center justify-center rounded-lg px-4 text-sm font-semibold transition-opacity'
  const dis = disabled ? ' opacity-40 cursor-not-allowed pointer-events-none' : ''
  if (tier === 'primary') {
    return cn(
      base,
      'min-h-[44px] bg-[#2E7D52] text-white hover:opacity-95',
      dis
    )
  }
  if (tier === 'destructive') {
    return cn(
      base,
      'min-h-[40px] border border-[#DC2626] bg-white text-[#DC2626] hover:bg-red-50',
      dis
    )
  }
  if (tier === 'milestone') {
    return cn(base, 'min-h-[40px] border border-[#1A3D2B] bg-[#F7F6F3] text-[#1A3D2B]', dis)
  }
  return cn(
    base,
    'min-h-[40px] border border-[#E5E3DF] bg-white text-[#1E1E1E] hover:bg-canvas',
    dis
  )
}

function InlineActions({
  model,
  run,
  primary,
  rest,
  disabled,
}: {
  model: ReturnType<typeof buildModel>
  run: (b: ActionBtn) => void
  primary: ActionBtn | undefined
  rest: ActionBtn[]
  disabled?: boolean
}) {
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <div className="mb-4 rounded-xl border border-bw-border bg-bw-card p-4 shadow-card">
      {model.info ? (
        <div className="mb-3 rounded-lg border border-bw-border bg-bw-bg px-3 py-2 text-sm text-bw-text">
          <p className="font-medium">{model.info.message}</p>
          {model.info.hint ? <p className="mt-1 text-xs text-bw-text-muted">{model.info.hint}</p> : null}
          {model.info.href ? (
            <Link href={model.info.href} className="mt-2 inline-block text-sm font-medium text-bw-link underline">
              Öffnen
            </Link>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
        {primary ? (
          <button
            type="button"
            className={cn(btnClass(primary.tier, primary.disabled || disabled), 'w-full sm:w-auto')}
            onClick={() => run(primary)}
          >
            {primary.label}
          </button>
        ) : null}
        {rest.length > 0 ? (
          <div className="relative w-full min-w-0 sm:w-auto">
            <button
              type="button"
              className={cn(btnClass('secondary', disabled), 'inline-flex w-full items-center justify-center gap-2 sm:w-auto')}
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-haspopup="true"
            >
              <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden />
              Weitere Aktionen
            </button>
            {moreOpen ? (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[min(60vh,320px)] overflow-y-auto rounded-lg border border-bw-border bg-bw-card p-2 shadow-lg sm:right-auto sm:min-w-[260px]">
                {rest.map((b) => (
                  <button
                    key={`${b.tier}-${b.label}`}
                    type="button"
                    className={cn(btnClass(b.tier, b.disabled || disabled), 'mb-1 w-full last:mb-0')}
                    onClick={() => {
                      setMoreOpen(false)
                      run(b)
                    }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function StatusActions({ typ, status, id, data, onAction, disabled, layout = 'fixed' }: StatusActionsProps) {
  const model = useMemo(() => buildModel(typ, status, id, data), [typ, status, id, data])
  const [sheet, setSheet] = useState(false)

  const run = (b: ActionBtn) => {
    if (b.disabled || disabled) return
    const href = hrefForSecondary(typ, id, b)
    if (href) {
      onAction('navigate', { href })
      return
    }
    if (b.id === 'angebot.kopieren' || (b.id === 'navigate' && typ === 'angebot' && b.label.includes('Angebot kopieren'))) {
      onAction('navigate', { href: `/angebote/neu?kopie_von=${id}` })
      return
    }
    if (b.id === 'navigate' && typ === 'auftrag' && b.label.includes('Protokoll')) {
      const url = str(data, 'abnahme_protokoll_url') ?? `/api/auftraege/${id}/protokoll`
      onAction('navigate', { href: url })
      return
    }
    onAction(b.id, { typ, entityId: id, label: b.label })
  }

  const primary = model.primary
  const rest = [...model.secondary, ...(model.milestone ? [model.milestone] : []), ...model.destructive]

  if (layout === 'inline') {
    return <InlineActions model={model} run={run} primary={primary} rest={rest} disabled={disabled} />
  }

  return (
    <>
      {/* Desktop */}
      <div
        className={cn(
          'pointer-events-auto z-header fixed right-4 top-4 hidden max-w-[min(100vw-2rem,520px)] flex-col gap-2 md:flex',
          'rounded-xl border border-border bg-surface/95 p-3 shadow-card backdrop-blur-sm'
        )}
      >
        {model.info ? (
          <div className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink">
            <p className="font-medium">{model.info.message}</p>
            {model.info.hint ? <p className="mt-1 text-xs text-muted">{model.info.hint}</p> : null}
            {model.info.href ? (
              <Link href={model.info.href} className="mt-2 inline-block text-sm font-medium text-primary underline">
                Öffnen
              </Link>
            ) : null}
          </div>
        ) : null}
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          {model.secondary.map((b) => (
            <button key={b.label} type="button" className={btnClass(b.tier, b.disabled || disabled)} onClick={() => run(b)}>
              {b.label}
            </button>
          ))}
          {model.milestone ? (
            <button
              type="button"
              className={btnClass(model.milestone.tier, model.milestone.disabled || disabled)}
              onClick={() => run(model.milestone!)}
            >
              {model.milestone.label}
            </button>
          ) : null}
          {primary ? (
            <button type="button" className={btnClass(primary.tier, primary.disabled || disabled)} onClick={() => run(primary)}>
              {primary.label}
            </button>
          ) : null}
          {model.destructive.length > 0 ? (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {model.destructive.map((b) => (
                <button key={b.label} type="button" className={btnClass(b.tier, b.disabled || disabled)} onClick={() => run(b)}>
                  {b.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Mobil */}
      <div
        className={cn(
          'pointer-events-auto z-header fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] flex flex-col gap-2 px-3 md:hidden',
          'pb-safe'
        )}
      >
        {model.info ? (
          <div className="rounded-lg border border-border bg-surface/95 px-3 py-2 text-sm shadow-card backdrop-blur-sm">
            <p className="font-medium text-ink">{model.info.message}</p>
            {model.info.hint ? <p className="text-xs text-muted">{model.info.hint}</p> : null}
          </div>
        ) : null}
        {primary ? (
          <button
            type="button"
            className={cn(btnClass(primary.tier, primary.disabled || disabled), 'w-full')}
            onClick={() => run(primary)}
          >
            {primary.label}
          </button>
        ) : null}
        {rest.length > 0 ? (
          <>
            <button
              type="button"
              className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg border border-[#E5E3DF] bg-white text-sm font-medium text-ink"
              onClick={() => setSheet((s) => !s)}
            >
              Weitere Aktionen
              <ChevronUp className={cn('h-4 w-4 transition-transform', sheet ? '' : 'rotate-180')} aria-hidden />
            </button>
            {sheet ? (
              <div className="max-h-[50dvh] space-y-2 overflow-y-auto rounded-xl border border-border bg-surface p-3 shadow-card">
                {rest.map((b) => (
                  <button
                    key={`${b.tier}-${b.label}`}
                    type="button"
                    className={cn(btnClass(b.tier, b.disabled || disabled), 'w-full')}
                    onClick={() => {
                      setSheet(false)
                      run(b)
                    }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  )
}

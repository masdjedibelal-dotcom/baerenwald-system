'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  ChevronUp,
  ClipboardList,
  Copy,
  Eye,
  FileText,
  Flag,
  Hammer,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Play,
  Plus,
  Receipt,
  Send,
  Star,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { IconText } from '@/components/ui/IconText'
import { cn } from '@/lib/utils'

export type StatusActionsEntity = 'lead' | 'angebot' | 'auftrag' | 'rechnung'

export type StatusActionsProps = {
  typ: StatusActionsEntity
  status: string
  id: string
  data?: Record<string, unknown>
  onAction: (action: string, data?: unknown) => void
  disabled?: boolean
  layout?: 'fixed' | 'inline'
}

type Tier = 'primary' | 'secondary' | 'destructive' | 'milestone'

type ActionBtn = {
  id: string
  label: string
  icon?: LucideIcon
  tier: Tier
  disabled?: boolean
  href?: string
}

type ActionInfo = { message: string; href?: string; hint?: string; icon?: LucideIcon }

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

function btnLabel(b: ActionBtn) {
  if (b.icon) {
    return (
      <IconText icon={b.icon} iconClassName={b.tier === 'primary' ? 'text-white' : undefined}>
        {b.label}
      </IconText>
    )
  }
  return b.label
}

function buildModel(
  typ: StatusActionsEntity,
  status: string,
  id: string,
  data?: Record<string, unknown>
): {
  info?: ActionInfo
  primary?: ActionBtn
  secondary: ActionBtn[]
  destructive: ActionBtn[]
  milestone?: ActionBtn
} {
  const secondary: ActionBtn[] = []
  const destructive: ActionBtn[] = []
  let info: ActionInfo | undefined
  let primary: ActionBtn | undefined
  let milestone: ActionBtn | undefined

  if (typ === 'lead') {
    if (status === 'neu') {
      primary = { id: 'lead.kontakt', label: 'Kontakt aufnehmen', icon: Phone, tier: 'primary' }
      secondary.push(
        { id: 'lead.termin_anlegen', label: 'Termin vereinbaren', icon: Calendar, tier: 'secondary' },
        {
          id: 'navigate',
          label: 'Angebot vorbereiten',
          icon: FileText,
          tier: 'secondary',
          href: `/angebote/neu?lead_id=${id}`,
        }
      )
      destructive.push({ id: 'lead.nicht_qualifiziert', label: 'Nicht qualifiziert', icon: X, tier: 'destructive' })
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'kontaktiert') {
      primary = {
        id: 'navigate',
        label: 'Angebot vorbereiten',
        icon: FileText,
        tier: 'primary',
        href: `/angebote/neu?lead_id=${id}`,
      }
      secondary.push({
        id: 'lead.termin_anlegen',
        label: 'Termin vereinbaren',
        icon: Calendar,
        tier: 'secondary',
      })
      destructive.push({ id: 'lead.kein_interesse', label: 'Nicht qualifiziert', icon: X, tier: 'destructive' })
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'angebot') {
      const href = str(data, 'angebot_href') ?? `/angebote/${str(data, 'angebot_id') ?? ''}`
      if (bool(data, 'angebot_angenommen')) {
        info = {
          message: 'Angebot vom Kunden angenommen',
          href,
          icon: Check,
        }
        primary = {
          id: 'navigate',
          label: 'Auftrag erstellen',
          icon: Building2,
          tier: 'primary',
          href,
        }
      } else {
        info = {
          message: 'Angebot in Bearbeitung',
          href,
          icon: FileText,
        }
      }
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'auftrag') {
      info = {
        message: 'Auftrag läuft',
        href: str(data, 'auftrag_href') ?? `/auftraege/${str(data, 'auftrag_id') ?? ''}`,
        icon: Hammer,
      }
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'abgeschlossen') {
      info = {
        message: 'Abgeschlossen',
        icon: Check,
        hint: str(data, 'abgeschlossen_datum') ? `Am ${str(data, 'abgeschlossen_datum')}` : undefined,
      }
      return { info, primary, secondary, destructive, milestone }
    }
  }

  if (typ === 'angebot') {
    if (status === 'entwurf') {
      primary = { id: 'angebot.send_handwerker', label: 'An Handwerker senden', icon: Send, tier: 'primary' }
      secondary.push(
        {
          id: 'navigate',
          label: 'Bearbeiten',
          icon: Pencil,
          tier: 'secondary',
          href: `/angebote/neu?angebot_id=${id}`,
        },
        { id: 'angebot.kopieren', label: 'Kopieren', icon: Copy, tier: 'secondary' }
      )
      destructive.push({
        id: 'angebot.loeschen',
        label: 'Löschen',
        icon: Trash2,
        tier: 'destructive',
        disabled: bool(data, 'hat_auftrag'),
      })
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'gesendet_handwerker') {
      const ok = num(data, 'hw_angenommen')
      const total = num(data, 'hw_gesamt') || 1
      info = { message: `Warte auf Handwerker (${ok} von ${total} bestätigt)` }
      secondary.unshift({
        id: 'angebot.hw_akzeptiert',
        label: 'Handwerker hat bestätigt',
        icon: Check,
        tier: 'secondary',
      })
      if (ok >= total && total > 0) {
        primary = { id: 'angebot.send_kunde', label: 'An Kunden senden', icon: Send, tier: 'primary' }
      }
      if (bool(data, 'hw_hat_abgelehnt')) {
        secondary.push({ id: 'angebot.add_handwerker', label: 'Anderen Handwerker', icon: Plus, tier: 'secondary' })
      }
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'handwerker_akzeptiert') {
      primary = { id: 'angebot.send_kunde', label: 'An Kunden senden', icon: Send, tier: 'primary' }
      secondary.push({
        id: 'navigate',
        label: 'Angebot anpassen',
        icon: Pencil,
        tier: 'secondary',
        href: `/angebote/neu?angebot_id=${id}`,
      })
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'gesendet_kunde') {
      primary = { id: 'angebot.mark_kunde_akzeptiert', label: 'Kunde hat angenommen', icon: Check, tier: 'primary' }
      secondary.push({ id: 'angebot.nachfassen', label: 'Nachfassen', icon: Mail, tier: 'secondary' })
      destructive.push({
        id: 'angebot.kunde_abgelehnt',
        label: 'Kunde hat abgelehnt',
        icon: X,
        tier: 'destructive',
      })
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'kunde_akzeptiert') {
      primary = { id: 'auftrag.create_modal', label: 'Auftrag erstellen', icon: Building2, tier: 'primary' }
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'abgelehnt') {
      const kopieHref =
        str(data, 'lead_id')
          ? `/anfragen/${str(data, 'lead_id')}?angebot_kopie_von=${id}`
          : `/angebote/neu?kopie_von=${id}`
      primary = {
        id: 'navigate',
        label: 'Angebot kopieren',
        icon: Copy,
        tier: 'primary',
        href: kopieHref,
      }
      const grund = str(data, 'ablehnung_grund')
      if (grund) info = { message: `Ablehnung: ${grund}` }
      return { info, primary, secondary, destructive, milestone }
    }
  }

  if (typ === 'auftrag') {
    if (status === 'offen') {
      primary = { id: 'auftrag.start_arbeit', label: 'Arbeiten starten', icon: Play, tier: 'primary' }
      secondary.push(
        { id: 'auftrag.termin', label: 'Termin anlegen', icon: Calendar, tier: 'secondary' },
        { id: 'auftrag.mail_kunde', label: 'Update an Kunden', icon: Mail, tier: 'secondary' }
      )
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'in_arbeit') {
      primary = { id: 'auftrag.formular_hw', label: 'Formular an Handwerker', icon: ClipboardList, tier: 'primary' }
      secondary.push(
        { id: 'auftrag.mail_kunde', label: 'Update an Kunden', icon: Mail, tier: 'secondary' },
        { id: 'auftrag.nachtrag', label: 'Nachtrag erstellen', icon: AlertTriangle, tier: 'secondary' },
        { id: 'auftrag.termin', label: 'Termin', icon: Calendar, tier: 'secondary' }
      )
      milestone = { id: 'auftrag.zur_abnahme', label: 'Zur Abnahme', icon: Flag, tier: 'milestone' }
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'abnahme') {
      primary = { id: 'auftrag.abnahme_abschliessen', label: 'Abnahme abschließen', icon: Check, tier: 'primary' }
      secondary.push(
        {
          id: 'navigate',
          label: str(data, 'abnahme_protokoll_url') ? 'Abnahmeprotokoll' : 'Abnahmeprotokoll erstellen',
          icon: ClipboardList,
          tier: 'secondary',
          href: str(data, 'abnahme_protokoll_url')
            ? `/auftraege/${id}/abnahme`
            : `/auftraege/${id}/abnahme/erstellen`,
        },
        { id: 'auftrag.mangel', label: 'Mangel hinzufügen', icon: Plus, tier: 'secondary' },
        { id: 'auftrag.abnahme_mail', label: 'Abnahme-Termin Mail', icon: Mail, tier: 'secondary' }
      )
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'abgeschlossen') {
      primary = {
        id: 'navigate',
        label: 'Rechnung erstellen',
        icon: Receipt,
        tier: 'primary',
        href: `/rechnungen/neu?auftrag_id=${id}`,
      }
      secondary.push(
        {
          id: 'navigate',
          label: 'Protokoll herunterladen',
          icon: FileText,
          tier: 'secondary',
          href: str(data, 'abnahme_protokoll_url') ?? `/auftraege/${id}#auftrag-abnahmeprotokoll`,
        },
        { id: 'auftrag.bewertung', label: 'Bewertung anfragen', icon: Star, tier: 'secondary' }
      )
      return { info, primary, secondary, destructive, milestone }
    }
  }

  if (typ === 'rechnung') {
    if (status === 'entwurf') {
      primary = { id: 'rechnung.senden', label: 'Rechnung senden', icon: Send, tier: 'primary' }
      secondary.push(
        { id: 'navigate', label: 'Bearbeiten', icon: Pencil, tier: 'secondary', href: `/rechnungen/${id}` },
        { id: 'navigate', label: 'Vorschau', icon: Eye, tier: 'secondary', href: `/api/rechnungen/${id}/pdf` }
      )
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'gesendet') {
      const tage = num(data, 'tage_ueberfaellig')
      if (tage > 0) {
        primary = { id: 'rechnung.zahlungserinnerung', label: 'Zahlungserinnerung', icon: AlertTriangle, tier: 'primary' }
      }
      secondary.push({ id: 'rechnung.bezahlt', label: 'Als bezahlt markieren', icon: Check, tier: 'secondary' })
      const fd = str(data, 'faellig_am')
      info = { message: fd ? `Fällig am ${fd}` : 'Fälligkeit offen', hint: tage > 0 ? `${tage} Tage überfällig` : undefined }
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'bezahlt') {
      const b = str(data, 'bezahlt_am')
      info = { message: b ? `Bezahlt am ${b}` : 'Bezahlt', icon: Check }
      return { info, primary, secondary, destructive, milestone }
    }
    if (status === 'storniert') {
      info = { message: 'Storniert' }
      return { info, primary, secondary, destructive, milestone }
    }
  }

  return { info, primary, secondary, destructive, milestone }
}

function btnClass(tier: Tier, disabled?: boolean) {
  const base = 'inline-flex items-center justify-center rounded-lg px-4 text-sm font-semibold transition-opacity'
  const dis = disabled ? ' opacity-40 cursor-not-allowed pointer-events-none' : ''
  if (tier === 'primary') {
    return cn(base, 'min-h-[44px] bg-[#2E7D52] text-white hover:opacity-95', dis)
  }
  if (tier === 'destructive') {
    return cn(base, 'min-h-[40px] border border-[#DC2626] bg-white text-[#DC2626] hover:bg-red-50', dis)
  }
  if (tier === 'milestone') {
    return cn(base, 'min-h-[40px] border border-[#1A3D2B] bg-[#F7F6F3] text-[#1A3D2B]', dis)
  }
  return cn(base, 'min-h-[40px] border border-[#E5E3DF] bg-white text-[#1E1E1E] hover:bg-canvas', dis)
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
          <p className="inline-flex items-center gap-1.5 font-medium">
            {model.info.icon ? <model.info.icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
            {model.info.message}
          </p>
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
            {btnLabel(primary)}
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
                    key={`${b.tier}-${b.id}-${b.label}`}
                    type="button"
                    className={cn(btnClass(b.tier, b.disabled || disabled), 'mb-1 w-full last:mb-0')}
                    onClick={() => {
                      setMoreOpen(false)
                      run(b)
                    }}
                  >
                    {btnLabel(b)}
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
    if (b.href) {
      onAction('navigate', { href: b.href })
      return
    }
    if (b.id === 'angebot.kopieren') {
      const leadId = str(data, 'lead_id')
      onAction('navigate', {
        href: leadId ? `/anfragen/${leadId}?angebot_kopie_von=${id}` : `/angebote/neu?kopie_von=${id}`,
      })
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
      <div
        className={cn(
          'pointer-events-auto z-header fixed right-4 top-4 hidden max-w-[min(100vw-2rem,520px)] flex-col gap-2 md:flex',
          'rounded-xl border border-border bg-surface/95 p-3 shadow-card backdrop-blur-sm'
        )}
      >
        {model.info ? (
          <div className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink">
            <p className="inline-flex items-center gap-1.5 font-medium">
              {model.info.icon ? <model.info.icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
              {model.info.message}
            </p>
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
            <button key={`${b.id}-${b.label}`} type="button" className={btnClass(b.tier, b.disabled || disabled)} onClick={() => run(b)}>
              {btnLabel(b)}
            </button>
          ))}
          {model.milestone ? (
            <button
              type="button"
              className={btnClass(model.milestone.tier, model.milestone.disabled || disabled)}
              onClick={() => run(model.milestone!)}
            >
              {btnLabel(model.milestone)}
            </button>
          ) : null}
          {primary ? (
            <button type="button" className={btnClass(primary.tier, primary.disabled || disabled)} onClick={() => run(primary)}>
              {btnLabel(primary)}
            </button>
          ) : null}
          {model.destructive.length > 0 ? (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {model.destructive.map((b) => (
                <button key={`${b.id}-${b.label}`} type="button" className={btnClass(b.tier, b.disabled || disabled)} onClick={() => run(b)}>
                  {btnLabel(b)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          'pointer-events-auto z-header fixed inset-x-0 bottom-[var(--mobile-bottom-nav-height)] flex flex-col gap-2 px-3 md:hidden',
          'pb-safe'
        )}
      >
        {model.info ? (
          <div className="rounded-lg border border-border bg-surface/95 px-3 py-2 text-sm shadow-card backdrop-blur-sm">
            <p className="inline-flex items-center gap-1.5 font-medium text-ink">
              {model.info.icon ? <model.info.icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
              {model.info.message}
            </p>
            {model.info.hint ? <p className="text-xs text-muted">{model.info.hint}</p> : null}
          </div>
        ) : null}
        {primary ? (
          <button
            type="button"
            className={cn(btnClass(primary.tier, primary.disabled || disabled), 'w-full')}
            onClick={() => run(primary)}
          >
            {btnLabel(primary)}
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
                    key={`${b.tier}-${b.id}-${b.label}`}
                    type="button"
                    className={cn(btnClass(b.tier, b.disabled || disabled), 'w-full')}
                    onClick={() => {
                      setSheet(false)
                      run(b)
                    }}
                  >
                    {btnLabel(b)}
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

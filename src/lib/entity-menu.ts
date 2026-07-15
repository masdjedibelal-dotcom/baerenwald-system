import type { ReactNode } from 'react'
import { confirmDelete } from '@/components/ui/confirm-delete'
import { toast } from '@/components/ui/app-toast'

export type EntityMenuType =
  | 'anfrage'
  | 'angebot'
  | 'auftrag'
  | 'rechnung'
  | 'kunde'
  | 'handwerker'
  | 'partner'

export type EntityMenuItem =
  | 'sep'
  | {
      icon?: string
      label: string
      hint?: string
      danger?: boolean
      onClick: () => void
    }

export type EntityMenuHandlers = {
  onEdit?: () => void
  onCopy?: () => void
  onPortal?: () => void
  onPortalLink?: () => void
  onStatus?: (kind: 'termin' | 'rueckfrage' | 'nicht_erreichbar' | 'verloren') => void
  onAngebot?: () => void
  onAccept?: () => void
  onPdf?: () => void
  onSend?: () => void
  onComplete?: () => void
  onEditAngebot?: () => void
  onInvoice?: () => void
  onEdit2?: () => void
  onMarkPaid?: () => void
  onToAuftrag?: () => void
  onDelete?: () => void
  deleteLabel?: string
  /** Menü-Text statt „Löschen“ (z. B. „Vorgang löschen“) */
  deleteMenuLabel?: string
  tel?: string | null
  mail?: string | null
  extra?: EntityMenuItem[]
}

type EntityLike = {
  status?: string | null
  statusKey?: string | null
  name?: string | null
  titel?: string | null
  title?: string | null
  tel?: string | null
  mail?: string | null
  customer?: { tel?: string; mail?: string; name?: string } | null
}

function dedupeSeps(items: EntityMenuItem[]): EntityMenuItem[] {
  const out: EntityMenuItem[] = []
  items.forEach((it) => {
    if (it === 'sep') {
      if (out.length === 0 || out[out.length - 1] === 'sep') return
    }
    out.push(it)
  })
  while (out.length && out[out.length - 1] === 'sep') out.pop()
  return out
}

/** Eine Quelle für alle ⋯-Menüs — 1:1 Mock entityMenu */
export function buildEntityMenu(
  type: EntityMenuType,
  entity: EntityLike,
  h: EntityMenuHandlers
): EntityMenuItem[] {
  const e = entity
  const st = e.statusKey ?? (typeof e.status === 'string' ? e.status : null)
  const tel = h.tel ?? e.tel ?? e.customer?.tel ?? null
  const mail = h.mail ?? e.mail ?? e.customer?.mail ?? null
  const A: EntityMenuItem[] = []

  if (h.onEdit) A.push({ icon: 'pencil', label: 'Bearbeiten', onClick: h.onEdit })
  if (h.onCopy) A.push({ icon: 'copy', label: 'Kopieren', onClick: h.onCopy })

  if (h.onPortal) {
    A.push('sep')
    A.push({ icon: 'external-link', label: 'Admin Login', onClick: h.onPortal })
    const linkLabel =
      type === 'handwerker'
        ? 'Handwerker-Link versenden'
        : type === 'partner'
          ? 'Partner-Link versenden'
          : 'Kundenportal-Link versenden'
    A.push({
      icon: 'send',
      label: linkLabel,
      onClick: () => {
        if (h.onPortalLink) h.onPortalLink()
        else toast.success(linkLabel.replace(' versenden', ' versendet'))
      },
    })
  }

  if (type === 'anfrage' && h.onStatus) {
    A.push('sep')
    A.push({ icon: 'calendar-event', label: 'Termin vereinbart', onClick: () => h.onStatus!('termin') })
    A.push({ icon: 'help', label: 'Rückfrage', onClick: () => h.onStatus!('rueckfrage') })
    A.push({
      icon: 'phone-off',
      label: 'Nicht erreichbar',
      onClick: () => h.onStatus!('nicht_erreichbar'),
    })
    A.push({
      icon: 'circle-x',
      label: 'Als verloren markieren',
      onClick: () => h.onStatus!('verloren'),
    })
  }
  if (type === 'anfrage' && h.onAngebot) {
    A.push('sep')
    A.push({ icon: 'file-invoice', label: 'Angebot erstellen', onClick: h.onAngebot })
  }

  if (type === 'angebot') {
    const versendet = st === 'gesendet_kunde' || st === 'gesendet'
    const erledigt = st === 'kunde_akzeptiert' || st === 'abgelehnt' || st === 'angenommen'
    const jeVersendet = Boolean(st && st !== 'entwurf')
    const before = A.length
    A.push('sep')
    if (h.onAccept && versendet) A.push({ icon: 'check', label: 'Angebot annehmen', onClick: h.onAccept })
    if (h.onPdf) A.push({ icon: 'download', label: 'Angebot PDF herunterladen', onClick: h.onPdf })
    if (h.onSend && !erledigt) {
      A.push({
        icon: 'send',
        label: jeVersendet ? 'Angebot nochmal versenden' : 'Angebot versenden',
        onClick: h.onSend,
      })
    }
    if (A.length === before + 1) A.pop()
  }

  if (type === 'auftrag') {
    const laufend = st === 'aktiv' || st === 'auftrag' || st === 'in_bearbeitung'
    const abschluss = st === 'fertig' || st === 'abnahme' || st === 'abgeschlossen'
    const before = A.length
    A.push('sep')
    if (h.onEditAngebot && !abschluss) {
      A.push({ icon: 'file-pencil', label: 'Angebot korrigieren', onClick: h.onEditAngebot })
    }
    if (h.onComplete && laufend) {
      A.push({ icon: 'checks', label: 'Auftrag abschließen', onClick: h.onComplete })
    }
    if (h.onInvoice && (abschluss || laufend)) {
      A.push({ icon: 'file-invoice', label: 'Rechnung erstellen', onClick: h.onInvoice })
    }
    if (A.length === before + 1) A.pop()
  }

  if (type === 'rechnung') {
    const offen = st === 'versendet' || st === 'ueberfaellig' || st === 'gesendet'
    const jeVersendet = Boolean(st && st !== 'entwurf')
    const erledigt = st === 'bezahlt' || st === 'storniert'
    const before = A.length
    A.push('sep')
    if (h.onEdit2 && !erledigt) A.push({ icon: 'file-pencil', label: 'Rechnung korrigieren', onClick: h.onEdit2 })
    if (h.onMarkPaid && offen) A.push({ icon: 'check', label: 'Als bezahlt markieren', onClick: h.onMarkPaid })
    if (h.onPdf) A.push({ icon: 'download', label: 'Rechnung herunterladen', onClick: h.onPdf })
    if (h.onSend && !erledigt) {
      A.push({
        icon: 'send',
        label: jeVersendet ? 'Rechnung nochmal versenden' : 'Rechnung versenden',
        onClick: h.onSend,
      })
    }
    if (h.onToAuftrag) A.push({ icon: 'briefcase', label: 'Zum Auftrag', onClick: h.onToAuftrag })
    if (A.length === before + 1) A.pop()
  }

  ;(h.extra ?? []).forEach((c) => A.push(c))

  if (tel || mail) A.push('sep')
  if (tel) {
    A.push({
      icon: 'phone',
      label: 'Anrufen',
      onClick: () => window.open(`tel:${String(tel).replace(/\D/g, '')}`),
    })
  }
  if (mail) {
    A.push({
      icon: 'mail',
      label: 'Mail schreiben',
      onClick: () => window.open(`mailto:${mail}`),
    })
  }

  if (h.onDelete) {
    A.push('sep')
    const label =
      h.deleteLabel ?? e.name ?? e.titel ?? e.title ?? e.customer?.name ?? 'Eintrag'
    A.push({
      icon: 'trash',
      label: h.deleteMenuLabel ?? 'Löschen',
      danger: true,
      onClick: () => confirmDelete(String(label), h.onDelete!),
    })
  }

  return dedupeSeps(A)
}

/** entityMenu-Items → ActionsMenu-Items mit MockIcon */
export function entityMenuToActionItems(
  items: EntityMenuItem[],
  iconFn: (name: string, size?: number) => ReactNode
): Array<
  | 'sep'
  | { label: string; icon?: ReactNode; hint?: string; danger?: boolean; onClick: () => void }
> {
  return items.map((it) => {
    if (it === 'sep') return 'sep'
    return {
      label: it.label,
      icon: it.icon ? iconFn(it.icon, 15) : undefined,
      hint: it.hint,
      danger: it.danger,
      onClick: it.onClick,
    }
  })
}

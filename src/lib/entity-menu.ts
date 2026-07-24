import type { ReactNode } from 'react'
import { confirmDelete } from '@/components/ui/confirm-delete'

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
  /** Admin-Impersonation / Admin Login */
  onPortal?: () => void
  /** Portal-Einladungsmail (Kunden-/Handwerker-/Partner-Link versenden) */
  onPortalLink?: () => void
  onStatus?: (kind: 'termin' | 'rueckfrage' | 'nicht_erreichbar' | 'verloren') => void
  /** Anfrage: Notfall melden → Auftrag mit Regie */
  onNotfall?: () => void
  onAngebot?: () => void
  /** Kunde / Handwerker: Pipeline anlegen */
  onCreateAnfrage?: () => void
  onCreateAngebot?: () => void
  onCreateAuftrag?: () => void
  onCreateRechnung?: () => void
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
  /** Override statt tel:/mailto: (CRM-Compose etc.) */
  onCall?: () => void
  onMail?: () => void
  extra?: EntityMenuItem[]
}

/** Kanonische Portal-Link-Labels — überall gleich. */
export function portalLinkMenuLabel(type: EntityMenuType): string {
  if (type === 'handwerker') return 'Handwerker-Link versenden'
  if (type === 'partner') return 'Partner-Link versenden'
  return 'Kundenportal-Link versenden'
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

  /* Portal-Aktionen ohne Sep davor — Gruppe mit Bearbeiten/Kopieren */
  if (h.onPortal) {
    A.push({ icon: 'external-link', label: 'Admin Login', onClick: h.onPortal })
  }
  if (h.onPortalLink) {
    const linkLabel = portalLinkMenuLabel(type)
    A.push({
      icon: 'send',
      label: linkLabel,
      onClick: h.onPortalLink,
    })
  }

  if (type === 'kunde' || type === 'handwerker') {
    const before = A.length
    A.push('sep')
    if (h.onCreateAnfrage) {
      A.push({ icon: 'inbox', label: 'Neue Anfrage', onClick: h.onCreateAnfrage })
    }
    if (h.onCreateAngebot) {
      A.push({ icon: 'file-invoice', label: 'Neues Angebot', onClick: h.onCreateAngebot })
    }
    if (h.onCreateAuftrag) {
      A.push({ icon: 'briefcase', label: 'Neuer Auftrag', onClick: h.onCreateAuftrag })
    }
    if (h.onCreateRechnung) {
      A.push({ icon: 'receipt', label: 'Neue Rechnung', onClick: h.onCreateRechnung })
    }
    if (A.length === before + 1) A.pop()
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
  /** Notfall / Angebot erstellen: nur wenn nicht schon Header-CTA (Handlers weglassen). */
  if (type === 'anfrage' && (h.onNotfall || h.onAngebot)) {
    A.push('sep')
    if (h.onNotfall) {
      A.push({ icon: 'alert-triangle', label: 'Notfall melden', onClick: h.onNotfall })
    }
    if (h.onAngebot) {
      A.push({ icon: 'file-invoice', label: 'Angebot erstellen', onClick: h.onAngebot })
    }
  }

  if (type === 'angebot') {
    const kannAnnehmen =
      st === 'gesendet_kunde' ||
      st === 'gesendet' ||
      st === 'abgelaufen' ||
      st === 'entwurf'
    const erledigt =
      st === 'kunde_akzeptiert' || st === 'abgelehnt' || st === 'angenommen'
    const jeVersendet = Boolean(st && st !== 'entwurf')
    const before = A.length
    A.push('sep')
    if (h.onAccept && kannAnnehmen) A.push({ icon: 'check', label: 'Angebot annehmen', onClick: h.onAccept })
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
    const laufend = st === 'offen' || st === 'in_arbeit' || st === 'aktiv' || st === 'in_bearbeitung'
    const abschluss = st === 'abnahme' || st === 'abgeschlossen' || st === 'fertig'
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

  /** Anrufen nur in Stammdaten (Kunde/Partner) — nicht in Vorgängen. */
  const isVorgangPhase =
    type === 'anfrage' || type === 'angebot' || type === 'auftrag' || type === 'rechnung'
  const showCall = !isVorgangPhase && (Boolean(tel) || Boolean(h.onCall))
  const showMail = Boolean(mail) || Boolean(h.onMail)
  if (showCall || showMail) A.push('sep')
  if (showCall) {
    A.push({
      icon: 'phone',
      label: 'Anrufen',
      onClick: () => {
        if (h.onCall) h.onCall()
        else if (tel) window.open(`tel:${String(tel).replace(/\D/g, '')}`)
      },
    })
  }
  if (showMail) {
    A.push({
      icon: 'mail',
      label: 'Mail schreiben',
      onClick: () => {
        if (h.onMail) h.onMail()
        else if (mail) window.open(`mailto:${mail}`)
      },
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

/**
 * Listen-Row-Menü (UX2-6): nur Öffnen / Kopieren / Löschen (+ PDF wenn gesetzt).
 * Keine Status-/Pipeline-Aktionen — die gehören ins Detail.
 */
export function buildListRowMenu(
  type: EntityMenuType,
  entity: EntityLike,
  h: Pick<EntityMenuHandlers, 'onEdit' | 'onCopy' | 'onPdf' | 'onDelete' | 'deleteLabel' | 'deleteMenuLabel'>
): EntityMenuItem[] {
  return buildEntityMenu(type, entity, {
    onEdit: h.onEdit,
    onCopy: h.onCopy,
    onPdf: h.onPdf,
    onDelete: h.onDelete,
    deleteLabel: h.deleteLabel,
    deleteMenuLabel: h.deleteMenuLabel,
  })
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

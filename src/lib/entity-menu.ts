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
  onStatus?: (kind: 'termin' | 'nicht_erreichbar' | 'verloren') => void
  /** Anfrage: Notfall melden → Auftrag mit Regie */
  onNotfall?: () => void
  onAngebot?: () => void
  /** Anfrage: Sheet mit allen Angeboten */
  onAngeboteVerwalten?: () => void
  /** Anfrage: Wiedervorlage setzen */
  onWiedervorlage?: () => void
  /** Anfrage: Duplikat zusammenführen */
  onZusammenfuehren?: () => void
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

/** Eine Quelle für alle ⋯-Menüs — 1:1 Mock entityMenu */
export type EntityLike = {
  status?: string | null
  statusKey?: string | null
  name?: string | null
  titel?: string | null
  title?: string | null
  tel?: string | null
  mail?: string | null
  customer?: { tel?: string; mail?: string; name?: string } | null
  /** Anfrage: Angebote vorhanden */
  hasAngebote?: boolean
  /** Anfrage: mind. ein angenommenes Angebot → kein „Verloren“ */
  hasAngenommenesAngebot?: boolean
  /** Anfrage: Duplikat erkannt (Band ggf. dismissed) → Menüeintrag */
  showZusammenfuehren?: boolean
}

/** Kanonische Portal-Link-Labels — überall gleich. */
export function portalLinkMenuLabel(type: EntityMenuType): string {
  if (type === 'handwerker') return 'Handwerker-Link versenden'
  if (type === 'partner') return 'Partner-Link versenden'
  return 'Kundenportal-Link versenden'
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

function anfrageStatusEarly(st: string | null): boolean {
  return st === 'neu' || st === 'kontaktiert'
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

  const isVorgangPhase =
    type === 'anfrage' || type === 'angebot' || type === 'auftrag' || type === 'rechnung'

  /** Anfrage: Status zuerst, dann Kontext, dann Bearbeiten/Kopieren/Admin, Löschen unten */
  if (type === 'anfrage') {
    if (h.onStatus && anfrageStatusEarly(st)) {
      A.push({
        icon: 'calendar-event',
        label: 'Termin vereinbart',
        onClick: () => h.onStatus!('termin'),
      })
      A.push({
        icon: 'phone-off',
        label: 'Nicht erreichbar',
        onClick: () => h.onStatus!('nicht_erreichbar'),
      })
    }
    if (h.onStatus && !e.hasAngenommenesAngebot && st !== 'abgebrochen') {
      A.push({
        icon: 'circle-x',
        label: 'Als verloren markieren',
        onClick: () => h.onStatus!('verloren'),
      })
    }

    const kontextBefore = A.length
    if (e.hasAngebote && h.onAngeboteVerwalten) {
      A.push('sep')
      A.push({
        icon: 'file-invoice',
        label: 'Angebote verwalten',
        onClick: h.onAngeboteVerwalten,
      })
    }
    if (h.onWiedervorlage) {
      if (A.length === kontextBefore) A.push('sep')
      A.push({ icon: 'clock', label: 'Wiedervorlage', onClick: h.onWiedervorlage })
    }
    if (e.showZusammenfuehren && h.onZusammenfuehren) {
      if (A.length === kontextBefore) A.push('sep')
      A.push({ icon: 'link', label: 'Zusammenführen', onClick: h.onZusammenfuehren })
    }

    A.push('sep')
    if (h.onEdit) A.push({ icon: 'pencil', label: 'Bearbeiten', onClick: h.onEdit })
    if (h.onCopy) A.push({ icon: 'copy', label: 'Kopieren', onClick: h.onCopy })
    if (h.onPortal) {
      A.push({ icon: 'external-link', label: 'Admin Login', onClick: h.onPortal })
    }

    const extraItems = (h.extra ?? []).filter((c) => {
      if (c === 'sep') return true
      const label = c.label.toLowerCase()
      if (label.includes('notfall')) return false
      if (label.includes('portal')) return false
      if (label === 'anrufen' || label.includes('mail schreiben') || label === 'kontakt') return false
      if (label.includes('rückfrage') || label.includes('rueckfrage')) return false
      return true
    })
    const extraNormal: EntityMenuItem[] = []
    const extraDanger: EntityMenuItem[] = []
    for (const c of extraItems) {
      if (c !== 'sep' && c.danger) extraDanger.push(c)
      else extraNormal.push(c)
    }
    if (extraNormal.length) {
      A.push('sep')
      extraNormal.forEach((c) => A.push(c))
    }
    if (h.onDelete || extraDanger.length) {
      A.push('sep')
      extraDanger.forEach((c) => A.push(c))
      if (h.onDelete) {
        const label =
          h.deleteLabel ?? e.name ?? e.titel ?? e.title ?? e.customer?.name ?? 'Eintrag'
        A.push({
          icon: 'trash',
          label: h.deleteMenuLabel ?? 'Löschen',
          danger: true,
          onClick: () => confirmDelete(String(label), h.onDelete!),
        })
      }
    }
    return dedupeSeps(A)
  }

  if (h.onEdit) A.push({ icon: 'pencil', label: 'Bearbeiten', onClick: h.onEdit })
  if (h.onCopy) A.push({ icon: 'copy', label: 'Kopieren', onClick: h.onCopy })

  /**
   * Phase 5c: Vorgang-⋯ nur Statuswechsel · Bearbeiten/Kopieren · Löschen.
   * Kontakt / Portal / Notfall → Stammdaten bzw. QuickBar, nicht Menü.
   * Ausnahme Anfrage: Admin Login (siehe Zweig oben).
   */
  if (!isVorgangPhase) {
    if (h.onPortal) {
      A.push({ icon: 'external-link', label: 'Als Kunde öffnen', onClick: h.onPortal })
    }
    if (h.onPortalLink) {
      const linkLabel = portalLinkMenuLabel(type)
      A.push({
        icon: 'send',
        label: linkLabel,
        onClick: h.onPortalLink,
      })
    }
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

  const extraItems = (h.extra ?? []).filter((c) => {
    if (c === 'sep') return true
    if (!isVorgangPhase) return true
    const label = c.label.toLowerCase()
    if (label.includes('notfall')) return false
    if (label.includes('portal')) return false
    if (label === 'anrufen' || label.includes('mail schreiben') || label === 'kontakt') return false
    return true
  })
  const extraNormal: EntityMenuItem[] = []
  const extraDanger: EntityMenuItem[] = []
  for (const c of extraItems) {
    if (c !== 'sep' && c.danger) extraDanger.push(c)
    else extraNormal.push(c)
  }
  if (extraNormal.length) {
    A.push('sep')
    extraNormal.forEach((c) => A.push(c))
  }

  /** Anrufen/Mail nur Kunde/Handwerker — Vorgänge: QuickBar / Stammdaten. */
  const showCall = !isVorgangPhase && (Boolean(tel) || Boolean(h.onCall))
  const showMail = !isVorgangPhase && (Boolean(mail) || Boolean(h.onMail))
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

  if (h.onDelete || extraDanger.length) {
    if (extraDanger.length) {
      A.push('sep')
      extraDanger.forEach((c) => A.push(c))
    }
    if (h.onDelete) {
      if (!extraDanger.length) A.push('sep')
      const label =
        h.deleteLabel ?? e.name ?? e.titel ?? e.title ?? e.customer?.name ?? 'Eintrag'
      A.push({
        icon: 'trash',
        label: h.deleteMenuLabel ?? 'Löschen',
        danger: true,
        onClick: () => confirmDelete(String(label), h.onDelete!),
      })
    }
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

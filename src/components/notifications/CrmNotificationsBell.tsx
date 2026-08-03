'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import {
  ctaLabel,
  getCrmNotificationUnreadCount,
  listCrmNotifications,
  markAllCrmNotificationsRead,
  markCrmNotificationRead,
  typHint,
  typIcon,
  typLabel,
  type CrmNotificationFilter,
  type CrmNotificationItem,
} from '@/app/(dashboard)/notifications/actions'
import { formatRelativeDate, cn } from '@/lib/utils'

/**
 * TopBar-Glocke: Unread-Badge · Liste · Klick öffnet direkt den Vorgang.
 */
export function CrmNotificationsBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<CrmNotificationFilter>('ungelesen')
  const [items, setItems] = useState<CrmNotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [detail, setDetail] = useState<CrmNotificationItem | null>(null)
  const [pending, startTransition] = useTransition()

  const reload = useCallback(
    (f: CrmNotificationFilter = filter) => {
      startTransition(async () => {
        const res = await listCrmNotifications(f)
        if (!res.ok) {
          setItems([])
          setUnreadCount(0)
          return
        }
        setItems(res.items)
        setUnreadCount(res.unreadCount)
      })
    },
    [filter]
  )

  useEffect(() => {
    let cancelled = false
    const loadBadge = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      void getCrmNotificationUnreadCount().then((n) => {
        if (cancelled) return
        setUnreadCount(n)
      })
    }
    loadBadge()
    const t = window.setInterval(loadBadge, 3 * 60_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') loadBadge()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    reload(filter)
  }, [open, filter, reload])

  function onOpen() {
    setDetail(null)
    setOpen(true)
  }

  function markLocalRead(item: CrmNotificationItem) {
    setUnreadCount((c) => Math.max(0, c - (item.gelesen ? 0 : 1)))
    if (filter === 'ungelesen') {
      setItems((prev) => prev.filter((x) => x.sourceKey !== item.sourceKey))
    } else {
      setItems((prev) =>
        prev.map((x) => (x.sourceKey === item.sourceKey ? { ...x, gelesen: true } : x))
      )
    }
  }

  /** Klick: gelesen markieren + direkt zum Vorgang. */
  function goToVorgang(item: CrmNotificationItem) {
    const href = item.href
    if (!item.gelesen) {
      markLocalRead(item)
      void markCrmNotificationRead(item.sourceKey)
    }
    setDetail(null)
    setOpen(false)
    router.push(href)
  }

  function openDetail(item: CrmNotificationItem) {
    setDetail(item)
    if (item.gelesen) return
    startTransition(async () => {
      const r = await markCrmNotificationRead(item.sourceKey)
      if (!r.ok) return
      markLocalRead(item)
      setDetail((cur) =>
        cur?.sourceKey === item.sourceKey ? { ...cur, gelesen: true } : cur
      )
    })
  }

  function closeDetail() {
    setDetail(null)
  }

  function onMarkAll() {
    startTransition(async () => {
      await markAllCrmNotificationsRead()
      setDetail(null)
      reload(filter)
    })
  }

  const badge = unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null

  return (
    <>
      <button
        type="button"
        className={cn('topbar-icon-btn topbar-notif-btn', open && 'is-open')}
        aria-label={
          unreadCount > 0
            ? `Benachrichtigungen, ${unreadCount} ungelesen`
            : 'Benachrichtigungen'
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onOpen}
      >
        <MockIcon ctx="btn" n="bell" size={18} />
        {badge ? <span className="topbar-notif-badge">{badge}</span> : null}
      </button>

      <EditorSheet
        open={open}
        onClose={() => {
          setDetail(null)
          setOpen(false)
        }}
        title="Updates"
        subtitle="Portal & externe Meldungen · letzte 7 Tage"
        context="detail"
        size="md"
        overlayClassName={detail ? 'editor-sheet-overlay--recessed' : undefined}
        headerEnd={
          unreadCount > 0 ? (
            <MockBtn sm kind="ghost" disabled={pending} onClick={onMarkAll}>
              Alle gelesen
            </MockBtn>
          ) : null
        }
      >
        <div className="crm-notif-filters" role="tablist" aria-label="Filter">
          {(
            [
              ['ungelesen', 'Ungelesen'],
              ['gelesen', 'Gelesen'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              className={cn('crm-notif-filter', filter === id && 'is-active')}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {pending && !items.length ? (
          <p className="crm-notif-empty">Lädt…</p>
        ) : !items.length ? (
          <p className="crm-notif-empty">
            {filter === 'ungelesen'
              ? 'Keine ungelesenen Updates.'
              : 'Noch keine gelesenen Updates.'}
          </p>
        ) : (
          <ul className="crm-notif-list">
            {items.map((item) => (
              <li key={item.sourceKey} className="crm-notif-list__item">
                <button
                  type="button"
                  className={cn('crm-notif-row', !item.gelesen && 'is-unread')}
                  onClick={() => goToVorgang(item)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    openDetail(item)
                  }}
                >
                  <span className="crm-notif-row__ico" aria-hidden>
                    <MockIcon ctx="default" n={typIcon(item.typ)} size={16} />
                  </span>
                  <span className="crm-notif-row__body">
                    <span className="crm-notif-row__title">{item.title}</span>
                    {item.subtitle ? (
                      <span className="crm-notif-row__sub">{item.subtitle}</span>
                    ) : null}
                    <span className="crm-notif-row__meta">
                      {formatRelativeDate(item.createdAt)}
                    </span>
                  </span>
                  {!item.gelesen ? <span className="crm-notif-row__dot" aria-hidden /> : null}
                  <span className="crm-notif-row__chev" aria-hidden>
                    <MockIcon ctx="default" n="chevron-right" size={14} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </EditorSheet>

      <EditorSheet
        open={Boolean(detail)}
        onClose={closeDetail}
        title={detail ? typLabel(detail.typ) : 'Update'}
        crumb="Updates >"
        context="detail"
        size="md"
        overlayClassName="editor-sheet-overlay--stack"
        manageHistory={Boolean(detail)}
      >
        {detail ? (
          <div className="crm-notif-detail">
            <p className="crm-notif-detail__title">{detail.title}</p>
            {detail.subtitle ? (
              <p className="crm-notif-detail__sub">{detail.subtitle}</p>
            ) : null}
            <p className="crm-notif-detail__meta">{formatRelativeDate(detail.createdAt)}</p>
            <p className="crm-notif-detail__hint">{typHint(detail.typ)}</p>
            <div className="crm-notif-detail__actions">
              <MockBtn kind="primary" icon="arrow-right" onClick={() => goToVorgang(detail)}>
                {ctaLabel(detail.typ)}
              </MockBtn>
            </div>
          </div>
        ) : null}
      </EditorSheet>
    </>
  )
}

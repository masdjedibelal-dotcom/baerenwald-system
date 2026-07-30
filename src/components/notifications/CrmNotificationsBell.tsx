'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import {
  listCrmNotifications,
  markAllCrmNotificationsRead,
  markCrmNotificationRead,
  typIcon,
  type CrmNotificationFilter,
  type CrmNotificationItem,
} from '@/app/(dashboard)/notifications/actions'
import { formatRelativeDate, cn } from '@/lib/utils'

/**
 * TopBar-Glocke: Unread-Badge · Panel (Desktop Slideover / Mobil Bottom Sheet)
 * mit Filter gelesen/ungelesen · letzte 7 Tage · externe Updates.
 */
export function CrmNotificationsBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<CrmNotificationFilter>('ungelesen')
  const [items, setItems] = useState<CrmNotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
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
      void listCrmNotifications('alle').then((res) => {
        if (cancelled || !res.ok) return
        setUnreadCount(res.unreadCount)
      })
    }
    loadBadge()
    const t = window.setInterval(loadBadge, 60_000)
    return () => {
      cancelled = true
      window.clearInterval(t)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    reload(filter)
  }, [open, filter, reload])

  function onOpen() {
    setOpen(true)
  }

  function onRowClick(item: CrmNotificationItem) {
    startTransition(async () => {
      if (!item.gelesen) {
        await markCrmNotificationRead(item.sourceKey)
        setUnreadCount((c) => Math.max(0, c - 1))
        setItems((prev) =>
          prev.map((x) => (x.sourceKey === item.sourceKey ? { ...x, gelesen: true } : x))
        )
      }
      setOpen(false)
      router.push(item.href)
    })
  }

  function onMarkAll() {
    startTransition(async () => {
      await markAllCrmNotificationsRead()
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
        onClose={() => setOpen(false)}
        title="Updates"
        subtitle="Externe Meldungen · letzte 7 Tage"
        context="detail"
        size="md"
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
              ['alle', 'Alle'],
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
              : filter === 'gelesen'
                ? 'Noch keine gelesenen Updates.'
                : 'Keine Updates in den letzten 7 Tagen.'}
          </p>
        ) : (
          <ul className="crm-notif-list">
            {items.map((item) => (
              <li key={item.sourceKey}>
                <button
                  type="button"
                  className={cn('crm-notif-row', !item.gelesen && 'is-unread')}
                  onClick={() => onRowClick(item)}
                >
                  <span className="crm-notif-row__ico" aria-hidden>
                    <MockIcon ctx="row" n={typIcon(item.typ)} size={18} />
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
                </button>
              </li>
            ))}
          </ul>
        )}
      </EditorSheet>
    </>
  )
}

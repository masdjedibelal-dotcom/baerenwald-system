'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import {
  ctaLabel,
  listCrmNotifications,
  markAllCrmNotificationsRead,
  markCrmNotificationRead,
  typIcon,
  typLabel,
  type CrmNotificationFilter,
  type CrmNotificationItem,
} from '@/app/(dashboard)/notifications/actions'
import { formatRelativeDate, cn } from '@/lib/utils'

/**
 * TopBar-Glocke: Unread-Badge · Liste · Detail-Sheet mit CTA zum Vorgang.
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
      void listCrmNotifications('ungelesen').then((res) => {
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
    setDetail(null)
    setOpen(true)
  }

  function markLocalRead(item: CrmNotificationItem) {
    setUnreadCount((c) => Math.max(0, c - 1))
    if (filter === 'ungelesen') {
      setItems((prev) => prev.filter((x) => x.sourceKey !== item.sourceKey))
    } else {
      setItems((prev) =>
        prev.map((x) => (x.sourceKey === item.sourceKey ? { ...x, gelesen: true } : x))
      )
    }
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

  function goToVorgang() {
    if (!detail) return
    const href = detail.href
    setDetail(null)
    setOpen(false)
    router.push(href)
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
              <li key={item.sourceKey}>
                <button
                  type="button"
                  className={cn('crm-notif-row', !item.gelesen && 'is-unread')}
                  onClick={() => openDetail(item)}
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

      <EditorSheet
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail ? typLabel(detail.typ) : 'Update'}
        crumb="Updates >"
        context="detail"
        size="md"
      >
        {detail ? (
          <div className="crm-notif-detail">
            <div className="crm-notif-detail__ico" aria-hidden>
              <MockIcon ctx="row" n={typIcon(detail.typ)} size={22} />
            </div>
            <p className="crm-notif-detail__title">{detail.title}</p>
            {detail.subtitle ? (
              <p className="crm-notif-detail__sub">{detail.subtitle}</p>
            ) : null}
            <p className="crm-notif-detail__meta">{formatRelativeDate(detail.createdAt)}</p>
            <p className="crm-notif-detail__hint">
              {detail.typ === 'neue_anfrage'
                ? 'Neue Anfrage aus dem Meldeformular oder Portal.'
                : detail.typ === 'handwerker_update'
                  ? 'Eintrag vom Partner im Bautagebuch.'
                  : 'Der Auftrag wurde als abgeschlossen markiert.'}
            </p>
            <div className="crm-notif-detail__actions">
              <MockBtn kind="primary" icon="arrow-right" onClick={goToVorgang}>
                {ctaLabel(detail.typ)}
              </MockBtn>
            </div>
          </div>
        ) : null}
      </EditorSheet>
    </>
  )
}

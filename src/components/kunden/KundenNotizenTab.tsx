'use client'

import { MockCard } from '@/components/mock-ui/MockCard'
import { MockNotizComposer } from '@/components/mock-ui/MockDetailCards'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { useTransition } from '@/components/ui/action-busy'

import { useMemo, useState } from 'react'
import { addKundenNotiz, deleteKundenNotiz } from '@/app/actions/kunden'
import { toast } from '@/components/ui/app-toast'
import type { KundenNotizRow } from '@/lib/types'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { formatTimelineStamp } from '@/lib/utils'
import { deleteWithUndo } from '@/lib/ui/delete-with-undo'
import { useIsMobile } from '@/hooks/useIsMobile'
import { TOAST } from '@/lib/copy'

function notizAutor(n: KundenNotizRow): string {
  const name = n.user_profiles?.name?.trim()
  if (name) return name
  if (n.erstellt_von) return 'Team'
  return 'System'
}

type DisplayNote = {
  id: string
  autor: string
  time: string
  text: string
  deletable: boolean
}

export function KundenNotizenTab({
  kundeId,
  notizen,
  legacyNotiz,
  onReload,
}: {
  kundeId: string
  notizen: KundenNotizRow[]
  /** Freitext-Feld `kunden.notizen` als Fallback, falls noch keine Zeilen existieren. */
  legacyNotiz?: string | null
  onReload: () => void
}) {
  const isMobile = useIsMobile()
  const [val, setVal] = useState('')
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set())
  const [pending, startTransition] = useTransition()

  const notes = useMemo((): DisplayNote[] => {
    const rows = [...notizen]
      .filter((n) => !hiddenIds.has(n.id))
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    if (rows.length > 0) {
      return rows.map((n) => ({
        id: n.id,
        autor: notizAutor(n),
        time: formatTimelineStamp(n.created_at),
        text: n.inhalt.trim(),
        deletable: true,
      }))
    }
    const legacy = legacyNotiz?.trim()
    if (legacy) {
      return [
        {
          id: 'legacy',
          autor: 'Notiz',
          time: '',
          text: legacy,
          deletable: false,
        },
      ]
    }
    return []
  }, [notizen, legacyNotiz, hiddenIds])

  function speichern() {
    const text = val.trim()
    if (!text || pending) return
    startTransition(async () => {
      const r = await addKundenNotiz(kundeId, text)
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(TOAST.notizHinzugefuegt)
      setVal('')
      onReload()
    })
  }

  function loeschen(id: string, _preview?: string) {
    if (id === 'legacy') return
    deleteWithUndo({
      key: `kunde-notiz:${id}`,
      removeOptimistic: () =>
        setHiddenIds((prev) => new Set(prev).add(id)),
      restoreOptimistic: () =>
        setHiddenIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        }),
      commit: async () => {
        const r = await deleteKundenNotiz(id, kundeId)
        if (!r.ok) {
          toast.systemError(r)
          setHiddenIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
          return
        }
        onReload()
      },
      message: TOAST.geloescht,
    })
  }

  return (
    <MockCard title={`Notizen · ${notes.length}`} icon="messages" className="dshell-framed">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: notes.length ? 14 : 0,
        }}
      >
        {notes.length === 0 ? (
          <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-4)', padding: '0.25rem 0' }}>
            {isMobile
              ? 'Noch keine Notizen. Über „Notiz“ oben hinzufügen.'
              : 'Noch keine Notizen — schreibe die erste unten.'}
          </div>
        ) : (
          notes.map((n) => (
            <div
              key={n.id}
              className="note"
              style={{
                position: 'relative',
                paddingRight: !isMobile && n.deletable ? 36 : undefined,
              }}
            >
              <div className="meta">
                {n.autor}
                {n.time ? ` · ${n.time}` : ''}
              </div>
              {!isMobile && n.deletable ? (
                <div style={{ position: 'absolute', top: 4, right: 4 }}>
                  <MockEntityRowMenu
                    title="Notiz"
                    items={
                      [
                        {
                          icon: 'trash',
                          label: 'Löschen',
                          danger: true,
                          disabled: pending,
                          onClick: () =>
                            loeschen(n.id, n.text.split('\n')[0] || 'Notiz'),
                        },
                      ] satisfies EntityMenuItem[]
                    }
                  />
                </div>
              ) : null}
              <div style={{ whiteSpace: 'pre-wrap' }}>{n.text}</div>
            </div>
          ))
        )}
      </div>

      {!isMobile ? (
        <MockNotizComposer
          value={val}
          onChange={setVal}
          onSubmit={speichern}
          disabled={pending}
          placeholder="Notiz schreiben"
        />
      ) : null}
    </MockCard>
  )
}

'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useMemo, useState } from 'react'
import { addKundenNotiz, deleteKundenNotiz } from '@/app/actions/kunden'
import { toast } from '@/components/ui/app-toast'
import type { KundenNotizRow } from '@/lib/types'
import { formatTimelineStamp } from '@/lib/utils'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockNotizComposer } from '@/components/mock-ui/MockDetailCards'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { useIsMobile } from '@/hooks/useIsMobile'

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
  const [pending, startTransition] = useTransition()

  const notes = useMemo((): DisplayNote[] => {
    const rows = [...notizen].sort(
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
  }, [notizen, legacyNotiz])

  function speichern() {
    const text = val.trim()
    if (!text || pending) return
    startTransition(async () => {
      const r = await addKundenNotiz(kundeId, text)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setVal('')
      onReload()
    })
  }

  function loeschen(id: string) {
    if (id === 'legacy') return
    if (!window.confirm('Notiz löschen?')) return
    startTransition(async () => {
      const r = await deleteKundenNotiz(id, kundeId)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      onReload()
    })
  }

  return (
    <MockCard title={`Notizen · ${notes.length}`} icon="messages">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: notes.length ? 14 : 0,
        }}
      >
        {notes.length === 0 ? (
          <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-4)', padding: '4px 0' }}>
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
                  <MockBtn
                    sm
                    kind="ghost"
                    icon="trash"
                    title="Löschen"
                    disabled={pending}
                    onClick={() => loeschen(n.id)}
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

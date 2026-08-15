'use client'

import { useEffect, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { toast } from '@/components/ui/app-toast'
import { useTransition } from '@/components/ui/action-busy'
import { mergeKunden } from '@/app/actions/kunden'
import { listKundenDuplikatVorschlaege } from '@/app/actions/kunden-ansprechpartner'
import { useRouter } from 'next/navigation'

type Vorschlag = Awaited<ReturnType<typeof listKundenDuplikatVorschlaege>>[number]

/**
 * Optionaler Assistent: schlägt ähnliche Kunden vor und führt Merge aus
 * (aufgelöster Kontakt wird Ansprechpartner am Survivor).
 */
export function KundenMergeAssistentSheet({
  open,
  onClose,
  onMerged,
}: {
  open: boolean
  onClose: () => void
  onMerged?: () => void
}) {
  const router = useRouter()
  const [rows, setRows] = useState<Vorschlag[]>([])
  const [loading, setLoading] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    void listKundenDuplikatVorschlaege(30).then((r) => {
      setRows(r)
      setLoading(false)
    })
  }, [open])

  function mergePair(v: Vorschlag, survivorId: string, mergeId: string) {
    startTransition(async () => {
      const r = await mergeKunden(survivorId, mergeId)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success(r.message)
      setRows((prev) => prev.filter((x) => x.a.id !== mergeId && x.b.id !== mergeId))
      onMerged?.()
      router.refresh()
    })
  }

  return (
    <EditorSheet open={open} onClose={onClose} title="Duplikate zusammenführen" size="lg">
      <p className="mb-3 text-[length:var(--fs-meta)] text-bw-text-muted">
        Vorschläge nach E-Mail, Telefon, Domain oder ähnlichem Namen. Der aufgelöste Kontakt wird
        als Ansprechpartner am behaltenen Kunden angelegt.
      </p>

      {loading ? (
        <p className="text-[length:var(--fs-text)] text-bw-text-muted">Suche…</p>
      ) : rows.length === 0 ? (
        <MockEmpty icon="users" title="Keine Vorschläge" hint="Aktuell keine offensichtlichen Duplikate." />
      ) : (
        <ul className="ap-merge-list">
          {rows.map((v) => (
            <li key={`${v.a.id}-${v.b.id}`} className="ap-merge-card">
              <div className="ap-merge-card__grund">{v.grund}</div>
              <div className="ap-merge-card__pair">
                <div>
                  <div className="ap-merge-card__name">{v.a.name}</div>
                  <div className="ap-merge-card__meta">
                    {[v.a.email, v.a.telefon].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                <div>
                  <div className="ap-merge-card__name">{v.b.name}</div>
                  <div className="ap-merge-card__meta">
                    {[v.b.email, v.b.telefon].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
              </div>
              <div className="ap-merge-card__actions">
                <MockBtn
                  sm
                  kind="secondary"
                  disabled={pending}
                  onClick={() => mergePair(v, v.a.id, v.b.id)}
                >
                  {v.a.name.slice(0, 18)} behalten
                </MockBtn>
                <MockBtn
                  sm
                  kind="secondary"
                  disabled={pending}
                  onClick={() => mergePair(v, v.b.id, v.a.id)}
                >
                  {v.b.name.slice(0, 18)} behalten
                </MockBtn>
              </div>
            </li>
          ))}
        </ul>
      )}
    </EditorSheet>
  )
}

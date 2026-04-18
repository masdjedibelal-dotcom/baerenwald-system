'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useSearchModal } from '@/components/layout/SearchContext'

type LeadHit = { id: string; kontakt_name: string | null; kontakt_email: string | null; status: string }
type KundeHit = { id: string; name: string; email: string | null }
type AuftragHit = { id: string; titel: string | null; status: string }
type HwHit = { id: string; name: string; firma: string | null }

function sanitizeTerm(raw: string) {
  return raw.trim().slice(0, 80).replace(/[%]/g, '')
}

function mergeById<T extends { id: string }>(rows: T[], limit: number) {
  const m = new Map<string, T>()
  for (const r of rows) {
    if (!m.has(r.id)) m.set(r.id, r)
  }
  return Array.from(m.values()).slice(0, limit)
}

export function GlobalSearch() {
  const { isOpen, close, open } = useSearchModal()
  const [q, setQ] = useState('')
  const [leads, setLeads] = useState<LeadHit[]>([])
  const [kunden, setKunden] = useState<KundeHit[]>([])
  const [auftraege, setAuftraege] = useState<AuftragHit[]>([])
  const [handwerker, setHandwerker] = useState<HwHit[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runSearch = useCallback(async (raw: string) => {
    const term = sanitizeTerm(raw)
    if (term.length < 2) {
      setLeads([])
      setKunden([])
      setAuftraege([])
      setHandwerker([])
      return
    }
    const pct = `%${term}%`
    const supabase = createClient()
    setLoading(true)
    try {
      const [
        leadsName,
        leadsEmail,
        kundenName,
        kundenEmail,
        aufRes,
        hwName,
        hwFirma,
      ] = await Promise.all([
        supabase
          .from('leads')
          .select('id, kontakt_name, kontakt_email, status')
          .ilike('kontakt_name', pct)
          .limit(5),
        supabase
          .from('leads')
          .select('id, kontakt_name, kontakt_email, status')
          .ilike('kontakt_email', pct)
          .limit(5),
        supabase.from('kunden').select('id, name, email').ilike('name', pct).limit(5),
        supabase.from('kunden').select('id, name, email').ilike('email', pct).limit(5),
        supabase.from('auftraege').select('id, titel, status').ilike('titel', pct).limit(5),
        supabase.from('handwerker').select('id, name, firma').ilike('name', pct).limit(5),
        supabase.from('handwerker').select('id, name, firma').ilike('firma', pct).limit(5),
      ])

      setLeads(
        mergeById(
          [...(leadsName.data ?? []), ...(leadsEmail.data ?? [])] as LeadHit[],
          5
        )
      )
      setKunden(
        mergeById(
          [...(kundenName.data ?? []), ...(kundenEmail.data ?? [])] as KundeHit[],
          5
        )
      )
      setAuftraege((aufRes.data ?? []) as AuftragHit[])
      setHandwerker(
        mergeById([...(hwName.data ?? []), ...(hwFirma.data ?? [])] as HwHit[], 5)
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setQ('')
      setLeads([])
      setKunden([])
      setAuftraege([])
      setHandwerker([])
      return
    }
    const t = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(t)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void runSearch(q)
    }, 300)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [q, isOpen, runSearch])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  useEffect(() => {
    const onDoc = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        open()
      }
    }
    window.addEventListener('keydown', onDoc)
    return () => window.removeEventListener('keydown', onDoc)
  }, [open])

  const total = leads.length + kunden.length + auftraege.length + handwerker.length

  return (
    <>
      {isOpen ? (
        <div className="fixed inset-0 z-[100] md:flex md:items-start md:justify-center md:pt-[12vh] md:p-4" role="dialog" aria-modal="true" aria-label="Suche">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Schließen" onClick={close} />
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 z-[101] flex max-h-[90dvh] flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-card md:relative md:bottom-auto md:max-h-[min(70vh,560px)] md:w-full md:max-w-lg md:rounded-xl'
            )}
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-5 w-5 shrink-0 text-muted" aria-hidden />
              <input
                ref={inputRef}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Anfragen, Kunden, Aufträge, Handwerker …"
                className="min-h-[44px] flex-1 border-0 bg-transparent text-base text-ink outline-none placeholder:text-muted"
                autoComplete="off"
                aria-label="Suchbegriff"
              />
              <button
                type="button"
                onClick={close}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted hover:bg-canvas"
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] p-3">
              {loading ? (
                <ul className="space-y-2" aria-busy="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <li key={i} className="h-10 animate-pulse rounded-lg bg-border/60" />
                  ))}
                </ul>
              ) : q.trim().length < 2 ? (
                <p className="text-sm text-muted">Mindestens 2 Zeichen eingeben.</p>
              ) : total === 0 ? (
                <p className="text-sm text-muted">Nichts gefunden für „{q.trim()}“.</p>
              ) : (
                <div className="space-y-5">
                  {leads.length > 0 ? (
                    <section>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        Anfragen ({leads.length})
                      </h3>
                      <ul className="space-y-1">
                        {leads.map((l) => (
                          <li key={l.id}>
                            <Link
                              href={`/anfragen/${l.id}`}
                              onClick={close}
                              className="block rounded-lg px-3 py-2 text-sm hover:bg-canvas"
                            >
                              <span className="font-medium text-ink">{l.kontakt_name ?? 'Ohne Namen'}</span>
                              {l.kontakt_email ? (
                                <span className="mt-0.5 block text-xs text-muted">{l.kontakt_email}</span>
                              ) : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  {kunden.length > 0 ? (
                    <section>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        Kunden ({kunden.length})
                      </h3>
                      <ul className="space-y-1">
                        {kunden.map((k) => (
                          <li key={k.id}>
                            {k.email ? (
                              <a
                                href={`mailto:${k.email}`}
                                onClick={close}
                                className="block rounded-lg px-3 py-2 text-sm hover:bg-canvas"
                              >
                                <span className="font-medium text-ink">{k.name}</span>
                                <span className="mt-0.5 block text-xs text-muted">{k.email}</span>
                              </a>
                            ) : (
                              <div className="rounded-lg px-3 py-2 text-sm">
                                <span className="font-medium text-ink">{k.name}</span>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  {auftraege.length > 0 ? (
                    <section>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        Aufträge ({auftraege.length})
                      </h3>
                      <ul className="space-y-1">
                        {auftraege.map((a) => (
                          <li key={a.id}>
                            <Link
                              href={`/auftraege/${a.id}`}
                              onClick={close}
                              className="block rounded-lg px-3 py-2 text-sm hover:bg-canvas"
                            >
                              <span className="font-medium text-ink">{a.titel ?? 'Ohne Titel'}</span>
                              <span className="mt-0.5 block text-xs text-muted">{a.status}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  {handwerker.length > 0 ? (
                    <section>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        Handwerker ({handwerker.length})
                      </h3>
                      <ul className="space-y-1">
                        {handwerker.map((h) => (
                          <li key={h.id}>
                            <Link
                              href={`/handwerker/${h.id}`}
                              onClick={close}
                              className="block rounded-lg px-3 py-2 text-sm hover:bg-canvas"
                            >
                              <span className="font-medium text-ink">{h.name}</span>
                              {h.firma ? <span className="mt-0.5 block text-xs text-muted">{h.firma}</span> : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

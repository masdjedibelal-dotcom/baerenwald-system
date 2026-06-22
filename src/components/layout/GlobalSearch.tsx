'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, X, Inbox, Wrench, HardHat, Receipt, Users, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { searchKundenGlobal } from '@/app/actions/kunden'
import { kundeDisplayName, type KundeListenNamePick } from '@/lib/kunde-stammdaten'
import { createClient } from '@/lib/supabase'
import type { Kunde } from '@/lib/types'

type SearchResultType = 'anfrage' | 'angebot' | 'auftrag' | 'handwerker' | 'rechnung' | 'kunde'

type LeadHit = { id: string; kontakt_name: string | null; kontakt_email: string | null; status: string | null }
type HwHit = { id: string; name: string; firma: string | null }
type KundeHit = KundeListenNamePick & Pick<Kunde, 'id' | 'email'>

interface SearchResult {
  id: string
  title: string
  subtitle: string
  type: SearchResultType
  href: string
}

const TYPE_CONFIG: Record<
  SearchResultType,
  { icon: typeof Inbox; label: string; color: string }
> = {
  anfrage: { icon: Inbox, label: 'Anfragen', color: 'text-bw-link' },
  angebot: { icon: FileText, label: 'Angebote', color: 'text-orange-600' },
  auftrag: { icon: Wrench, label: 'Aufträge', color: 'text-bw-success' },
  handwerker: { icon: HardHat, label: 'Handwerker', color: 'text-bw-accent' },
  rechnung: { icon: Receipt, label: 'Rechnungen', color: 'text-purple-500' },
  kunde: { icon: Users, label: 'Kunden', color: 'text-bw-mid' },
}

const TYPE_ORDER: SearchResultType[] = ['anfrage', 'angebot', 'auftrag', 'rechnung', 'kunde', 'handwerker']

function sanitizeTerm(raw: string) {
  return raw.trim().slice(0, 80).replace(/[%]/g, '')
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    const handleOpen = () => setOpen(true)

    document.addEventListener('keydown', handleKey)
    document.addEventListener('open-search', handleOpen)

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('open-search', handleOpen)
    }
  }, [])

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 100)
      setQuery('')
      setResults([])
      setSelected(0)
      return () => clearTimeout(t)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    const term = sanitizeTerm(q)
    if (term.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const pct = `%${term}%`
    const supabase = createClient()

    try {
      const [leadsName, leadsEmail, angeboteNr, auftraege, handwerkerName, handwerkerFirma, kundenHits, rechnungen] =
        await Promise.all([
          supabase.from('leads').select('id, kontakt_name, kontakt_email, status').ilike('kontakt_name', pct).limit(4),
          supabase.from('leads').select('id, kontakt_name, kontakt_email, status').ilike('kontakt_email', pct).limit(4),
          supabase
            .from('angebote')
            .select('id, angebotsnr, status, kunden(name)')
            .ilike('angebotsnr', pct)
            .limit(6),
          supabase.from('auftraege').select('id, titel, status').ilike('titel', pct).limit(4),
          supabase.from('handwerker').select('id, name, firma').ilike('name', pct).limit(4),
          supabase.from('handwerker').select('id, name, firma').ilike('firma', pct).limit(4),
          searchKundenGlobal(term),
          supabase.from('rechnungen').select('id, rechnungsnummer, status').ilike('rechnungsnummer', pct).limit(4),
        ])

      const leadMap = new Map<string, LeadHit>()
      for (const row of [...(leadsName.data ?? []), ...(leadsEmail.data ?? [])] as LeadHit[]) {
        if (row?.id) leadMap.set(row.id, row)
      }

      const hwMap = new Map<string, HwHit>()
      for (const row of [...(handwerkerName.data ?? []), ...(handwerkerFirma.data ?? [])] as HwHit[]) {
        if (row?.id) hwMap.set(row.id, row)
      }

      const kundeMap = new Map<string, KundeHit>()
      for (const row of kundenHits as KundeHit[]) {
        if (row?.id) kundeMap.set(row.id, row)
      }

      const flat: SearchResult[] = []

      for (const l of Array.from(leadMap.values())) {
        flat.push({
          id: l.id,
          title: l.kontakt_name || 'Unbekannt',
          subtitle: l.kontakt_email || l.status || '',
          type: 'anfrage',
          href: `/anfragen/${l.id}`,
        })
      }

      for (const a of angeboteNr.data ?? []) {
        const kunde = (a as { kunden?: { name?: string } | null }).kunden
        flat.push({
          id: a.id,
          title: a.angebotsnr?.trim() || `Angebot ${a.id.slice(0, 8)}`,
          subtitle: [kunde?.name, a.status].filter(Boolean).join(' · '),
          type: 'angebot',
          href: `/angebote/${a.id}`,
        })
      }

      for (const a of auftraege.data ?? []) {
        flat.push({
          id: a.id,
          title: a.titel || 'Auftrag',
          subtitle: a.status ?? '',
          type: 'auftrag',
          href: `/auftraege/${a.id}`,
        })
      }

      for (const h of Array.from(hwMap.values())) {
        flat.push({
          id: h.id,
          title: h.name,
          subtitle: h.firma || '',
          type: 'handwerker',
          href: `/handwerker/${h.id}`,
        })
      }

      for (const r of rechnungen.data ?? []) {
        flat.push({
          id: r.id,
          title: r.rechnungsnummer || 'Rechnung',
          subtitle: r.status ?? '',
          type: 'rechnung',
          href: `/rechnungen/${r.id}`,
        })
      }

      for (const k of Array.from(kundeMap.values())) {
        flat.push({
          id: k.id,
          title: kundeDisplayName(k),
          subtitle: k.email || '',
          type: 'kunde',
          href: `/kunden/${k.id}`,
        })
      }

      setResults(flat)
      setSelected(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void search(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, search])

  const navigate = (href: string) => {
    setOpen(false)
    if (!href) return
    if (href.startsWith('mailto:')) {
      window.location.href = href
      return
    }
    router.push(href)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => Math.min(s + 1, Math.max(results.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && results[selected]?.href) {
      navigate(results[selected].href)
    }
  }

  if (!open) return null

  const grouped = results.reduce(
    (acc, r) => {
      if (!acc[r.type]) acc[r.type] = []
      acc[r.type].push(r)
      return acc
    },
    {} as Record<string, SearchResult[]>
  )

  return (
    <div
      className="z-search fixed inset-0 flex animate-fade-in items-start justify-center bg-black/40 px-4 pt-[10vh]"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="w-full max-w-xl animate-slide-up overflow-hidden rounded-xl bg-bw-card shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Globale Suche"
      >
        <div className="flex items-center gap-3 border-b border-bw-border px-4 py-3">
          <Search className="h-5 w-5 flex-shrink-0 text-bw-light" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Suchen in Anfragen, Angeboten, Aufträgen, Rechnungen, Kunden…"
            className="flex-1 bg-transparent text-sm text-bw-text outline-none placeholder:text-bw-light"
            style={{ fontSize: '16px' }}
            autoComplete="off"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} className="text-bw-light hover:text-bw-text">
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <kbd className="hidden rounded bg-bw-hover px-2 py-1 font-mono text-xs text-bw-light md:block">ESC</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-bw-light">Suche...</div>
          ) : null}

          {!loading && query.length >= 2 && results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-bw-light">
              Keine Ergebnisse für „{query}“
            </div>
          ) : null}

          {!loading && query.length < 2 ? (
            <div className="px-4 py-6 text-center text-sm text-bw-light">Mindestens 2 Zeichen eingeben…</div>
          ) : null}

          {TYPE_ORDER.map((type) => {
            const items = grouped[type]
            if (!items?.length) return null
            const config = TYPE_CONFIG[type]
            const Icon = config.icon
            return (
              <div key={type}>
                <div className="sticky top-0 bg-bw-hover px-4 py-2 text-xs font-medium uppercase tracking-wide text-bw-light">
                  {config.label}
                </div>
                {items.map((item) => {
                  const globalIdx = results.findIndex((r) => r.id === item.id && r.type === item.type && r.href === item.href)
                  return (
                    <button
                      key={`${item.type}-${item.id}-${item.href}`}
                      type="button"
                      onClick={() => navigate(item.href)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                        globalIdx === selected ? 'bg-bw-hover' : 'hover:bg-bw-hover'
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-bw-hover ${config.color}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-bw-text">{item.title}</div>
                        <div className="truncate text-xs text-bw-light">{item.subtitle || '—'}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {results.length > 0 ? (
          <div className="flex items-center gap-4 border-t border-bw-border px-4 py-2 text-xs text-bw-light">
            <span>↑↓ Navigieren</span>
            <span>↵ Öffnen</span>
            <span>ESC Schließen</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

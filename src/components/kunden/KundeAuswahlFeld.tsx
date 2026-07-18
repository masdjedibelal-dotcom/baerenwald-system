'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { searchKunden } from '@/app/(dashboard)/angebote/actions'
import { Input } from '@/components/ui/Input'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import type { Kunde } from '@/lib/types'

type Props = {
  kundeId: string | null
  bekannterKunde?: Kunde | null
  onKundeIdChange: (id: string | null) => void
  onKundeGewaehlt?: (kunde: Kunde) => void
  disabled?: boolean
  label?: string
  hint?: string
}

export function KundeAuswahlFeld({
  kundeId,
  bekannterKunde,
  onKundeIdChange,
  onKundeGewaehlt,
  disabled,
  label = 'Bestehender Kunde',
  hint = 'Optional: Kunde suchen und Kontaktdaten übernehmen.',
}: Props) {
  const [suche, setSuche] = useState('')
  const [treffer, setTreffer] = useState<Kunde[]>([])
  const [suchen, setSuchen] = useState(false)
  const [ausgewaehlt, setAusgewaehlt] = useState<Kunde | null>(bekannterKunde ?? null)

  useEffect(() => {
    if (bekannterKunde) setAusgewaehlt(bekannterKunde)
  }, [bekannterKunde])

  useEffect(() => {
    if (!kundeId) {
      if (!bekannterKunde) setAusgewaehlt(null)
      return
    }
    if (ausgewaehlt?.id === kundeId) return
    if (bekannterKunde?.id === kundeId) {
      setAusgewaehlt(bekannterKunde)
      return
    }
  }, [kundeId, ausgewaehlt?.id, bekannterKunde])

  useEffect(() => {
    const q = suche.trim()
    if (disabled || q.length < 2) {
      setTreffer([])
      setSuchen(false)
      return
    }
    setSuchen(true)
    const t = setTimeout(() => {
      void searchKunden(q)
        .then((r) => setTreffer(r.kunden))
        .finally(() => setSuchen(false))
    }, 280)
    return () => clearTimeout(t)
  }, [suche, disabled])

  function waehle(k: Kunde) {
    setAusgewaehlt(k)
    onKundeIdChange(k.id)
    onKundeGewaehlt?.(k)
    setSuche('')
    setTreffer([])
  }

  function entfernen() {
    setAusgewaehlt(null)
    onKundeIdChange(null)
    setSuche('')
    setTreffer([])
  }

  const qLen = suche.trim().length
  const showResults = !ausgewaehlt && qLen >= 2

  return (
    <div className="space-y-2">
      <p className="text-xs text-bw-text-muted">{hint}</p>
      {ausgewaehlt ? (
        <div className="flex items-start justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--green-10)] px-3 py-2">
          <div className="min-w-0 text-sm">
            <p className="font-medium text-bw-text">{kundeDisplayName(ausgewaehlt)}</p>
            <p className="truncate text-xs text-bw-text-muted">
              {[ausgewaehlt.email, ausgewaehlt.telefon, [ausgewaehlt.plz, ausgewaehlt.ort].filter(Boolean).join(' ')]
                .filter(Boolean)
                .join(' · ') || '—'}
            </p>
          </div>
          {!disabled ? (
            <button
              type="button"
              className="shrink-0 rounded p-1 text-bw-text-muted hover:bg-bw-hover hover:text-bw-text"
              aria-label="Kundenverknüpfung entfernen"
              onClick={entfernen}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            label={label}
            name="kunde_suche"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Name, E-Mail oder Ort (mind. 2 Zeichen)"
            autoComplete="off"
            disabled={disabled}
          />
          {/* In-flow (kein absolute) — bleibt im Modal, deckendes Weiß */}
          {showResults ? (
            <ul
              className="m-0 max-h-56 list-none overflow-y-auto rounded-lg border border-[var(--border)] bg-white py-1"
              role="listbox"
              aria-label="Kundenvorschläge"
            >
              {suchen && treffer.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-bw-text-muted">Suche…</li>
              ) : null}
              {!suchen && treffer.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-bw-text-muted">Keine Kunden gefunden</li>
              ) : null}
              {treffer.map((k) => (
                <li key={k.id} role="option">
                  <button
                    type="button"
                    className="w-full border-0 bg-transparent px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-soft)]"
                    onClick={() => waehle(k)}
                  >
                    <span className="font-medium text-bw-text">{kundeDisplayName(k)}</span>
                    <span className="block text-xs text-bw-text-muted">
                      {[k.email, k.telefon, k.ort].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  )
}

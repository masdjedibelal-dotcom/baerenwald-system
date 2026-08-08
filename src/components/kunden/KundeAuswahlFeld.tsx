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
  /** Leer lassen, wenn äußeres Label (z. B. MockField „Kunde suchen“) schon da ist */
  label?: string
  hint?: string
}

function kundeMetaLines(k: Kunde): string[] {
  const lines: string[] = []
  if (k.email?.trim()) lines.push(k.email.trim())
  if (k.telefon?.trim()) lines.push(k.telefon.trim())
  const ort = [k.plz, k.ort].filter(Boolean).join(' ').trim()
  if (ort) lines.push(ort)
  const strasse = [k.strasse, k.hausnummer].filter(Boolean).join(' ').trim()
  if (strasse) lines.push(strasse)
  return lines
}

export function KundeAuswahlFeld({
  kundeId,
  bekannterKunde,
  onKundeIdChange,
  onKundeGewaehlt,
  disabled,
  label = 'Bestehender Kunde',
  hint,
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
    <div className="kunde-auswahl min-w-0 max-w-full space-y-2">
      {hint ? <p className="text-xs text-bw-text-muted">{hint}</p> : null}
      {ausgewaehlt ? (
        <div className="kunde-auswahl__picked flex min-w-0 max-w-full items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--green-10)] px-3 py-2.5">
          <div className="min-w-0 flex-1 overflow-hidden text-sm">
            <p className="m-0 break-words font-medium text-bw-text">
              {kundeDisplayName(ausgewaehlt)}
            </p>
            {kundeMetaLines(ausgewaehlt).map((line) => (
              <p
                key={line}
                className="m-0 mt-0.5 break-words text-xs leading-snug text-bw-text-muted"
              >
                {line}
              </p>
            ))}
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
        <div className="min-w-0 max-w-full space-y-2">
          <Input
            label={label || undefined}
            name="kunde_suche"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Name, E-Mail oder Ort (mind. 2 Zeichen)"
            autoComplete="off"
            disabled={disabled}
          />
          {showResults ? (
            <ul
              className="kunde-auswahl__list m-0 max-h-56 list-none overflow-y-auto overflow-x-hidden rounded-lg border border-[var(--border)] bg-white py-1"
              role="listbox"
              aria-label="Kundenvorschläge"
            >
              {suchen && treffer.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-bw-text-muted">Suche…</li>
              ) : null}
              {!suchen && treffer.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-bw-text-muted">Keine Kunden gefunden</li>
              ) : null}
              {treffer.map((k) => {
                const meta = kundeMetaLines(k)
                return (
                  <li key={k.id} role="option" className="min-w-0">
                    <button
                      type="button"
                      className="w-full min-w-0 border-0 bg-transparent px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-soft)]"
                      onClick={() => waehle(k)}
                    >
                      <span className="block break-words font-medium text-bw-text">
                        {kundeDisplayName(k)}
                      </span>
                      {meta.length ? (
                        <span className="mt-0.5 flex flex-col gap-0.5">
                          {meta.map((line) => (
                            <span
                              key={line}
                              className="block break-words text-xs leading-snug text-bw-text-muted"
                            >
                              {line}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="block text-xs text-bw-text-muted">—</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  )
}

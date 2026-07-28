'use client'

import { useRouter } from 'next/navigation'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import {
  createAnfrageHref,
  createAngebotHref,
  createKundeHref,
  createPartnerHref,
  createRechnungHref,
} from '@/lib/crm/create-entry'

/** FAB: nur kanonische Create-Entry-Pfade (siehe `@/lib/crm/create-entry`). */
const VORGANG_ITEMS: Array<{ ic: string; label: string; desc: string; href: string }> = [
  { ic: 'inbox', label: 'Anfrage', desc: 'Neuer Kundenbedarf', href: createAnfrageHref() },
  { ic: 'file-invoice', label: 'Angebot', desc: 'Positionen & Preis', href: createAngebotHref() },
  { ic: 'receipt', label: 'Rechnung', desc: 'Abschlag oder Schluss', href: createRechnungHref() },
]

const STAMM_ITEMS: Array<{ ic: string; label: string; desc: string; href: string }> = [
  { ic: 'users', label: 'Kunde', desc: 'Stammdaten', href: createKundeHref() },
  { ic: 'tool', label: 'Handwerker', desc: 'Ausführungspartner', href: createPartnerHref() },
]

export function MockNeuPopover({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()

  if (!open) return null

  function go(href: string) {
    onClose()
    router.push(href)
  }

  return (
    <div className="neu-pop-overlay" onClick={onClose} role="presentation">
      <div
        className="neu-pop"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Neu erstellen"
      >
        <div className="neu-pop-handle" aria-hidden>
          <span />
        </div>
        <div className="neu-pop-head">Neu erstellen</div>
        {VORGANG_ITEMS.map((it) => (
          <button
            key={it.label}
            type="button"
            className="neu-pop-item"
            onClick={() => go(it.href)}
          >
            <span className="neu-pop-ico">
              <MockIcon ctx="default" n={it.ic} size={18} />
            </span>
            <span className="neu-pop-txt">
              <span className="l">{it.label}</span>
              <span className="d">{it.desc}</span>
            </span>
          </button>
        ))}
        <div className="neu-pop-sep" />
        {STAMM_ITEMS.map((it) => (
          <button
            key={it.label}
            type="button"
            className="neu-pop-item"
            onClick={() => go(it.href)}
          >
            <span className="neu-pop-ico">
              <MockIcon ctx="default" n={it.ic} size={18} />
            </span>
            <span className="neu-pop-txt">
              <span className="l">{it.label}</span>
              <span className="d">{it.desc}</span>
            </span>
          </button>
        ))}
        <button type="button" className="neu-pop-cancel md:hidden" onClick={onClose}>
          Abbrechen
        </button>
      </div>
    </div>
  )
}

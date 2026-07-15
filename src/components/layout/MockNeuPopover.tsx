'use client'

import { useRouter } from 'next/navigation'
import { MockIcon } from '@/components/mock-ui/MockIcon'

/** Bestehende CRM-Routen (Variante B — kein /neu-Hub). */
const NEU_ITEMS: Array<'sep' | { ic: string; label: string; href: string; desc?: string }> = [
  { ic: 'inbox', label: 'Anfrage', href: '/anfragen/neu', desc: 'Neue Anfrage anlegen' },
  { ic: 'file-invoice', label: 'Angebot', href: '/angebote/neu', desc: 'Angebot erstellen' },
  { ic: 'receipt', label: 'Rechnung', href: '/rechnungen/neu', desc: 'Rechnung erstellen' },
  'sep',
  { ic: 'users', label: 'Kunde', href: '/kunden?neu=1', desc: 'Kundenstammdaten' },
  { ic: 'tool', label: 'Handwerker', href: '/handwerker?neu=1', desc: 'Handwerker anlegen' },
  { ic: 'building', label: 'Partner', href: '/partner?neu=1', desc: 'Partner anlegen' },
]

export function MockNeuPopover({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()

  if (!open) return null

  return (
    <div className="neu-pop-overlay" onClick={onClose} role="presentation">
      <div
        className="neu-pop"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Neu erstellen"
      >
        <div className="neu-pop-head">Neu erstellen</div>
        {NEU_ITEMS.map((it, i) =>
          it === 'sep' ? (
            <div key={`sep-${i}`} className="neu-pop-sep" />
          ) : (
            <button
              key={it.label}
              type="button"
              className="neu-pop-item"
              onClick={() => {
                onClose()
                router.push(it.href)
              }}
            >
              <span className="neu-pop-ico">
                <MockIcon n={it.ic} size={18} />
              </span>
              <span className="neu-pop-txt">
                <span className="l">{it.label}</span>
                {it.desc ? <span className="d">{it.desc}</span> : null}
              </span>
            </button>
          )
        )}
      </div>
    </div>
  )
}

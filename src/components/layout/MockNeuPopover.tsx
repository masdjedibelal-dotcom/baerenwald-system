'use client'

import { useRouter } from 'next/navigation'
import { MockIcon } from '@/components/mock-ui/MockIcon'

/** Mock Neu-Popover — Labels 1:1 Positivliste, bestehende CRM-Routen. */
const NEU_ITEMS: Array<'sep' | { ic: string; label: string; href: string }> = [
  { ic: 'inbox', label: 'Anfrage', href: '/anfragen/neu' },
  { ic: 'file-invoice', label: 'Angebot', href: '/angebote/neu' },
  { ic: 'briefcase', label: 'Auftrag', href: '/neu?art=auftrag' },
  { ic: 'receipt', label: 'Rechnung', href: '/rechnungen/neu' },
  'sep',
  { ic: 'users', label: 'Kunde', href: '/kunden?neu=1' },
  { ic: 'tool', label: 'Handwerker', href: '/handwerker?neu=1' },
  { ic: 'building', label: 'Partner', href: '/partner?neu=1' },
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
        aria-label="Neuen Vorgang erstellen"
      >
        <div className="neu-pop-head">Neuen Vorgang erstellen</div>
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
                <MockIcon ctx="default" n={it.ic} size={18} />
              </span>
              <span className="neu-pop-txt">
                <span className="l">{it.label}</span>
              </span>
            </button>
          )
        )}
      </div>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { MockIcon } from '@/components/mock-ui/MockIcon'

const NEU_ITEMS: Array<
  | 'sep'
  | { ic: string; label: string; href: string }
> = [
  { ic: 'inbox', label: 'Anfrage', href: '/neu?art=anfrage' },
  { ic: 'file-invoice', label: 'Angebot', href: '/neu?art=angebot' },
  { ic: 'briefcase', label: 'Auftrag', href: '/neu?art=auftrag' },
  { ic: 'receipt', label: 'Rechnung', href: '/neu?art=rechnung' },
  'sep',
  { ic: 'users', label: 'Kunde', href: '/neu?art=kunde' },
  { ic: 'tool', label: 'Handwerker', href: '/neu?art=handwerker' },
  { ic: 'building', label: 'Partner', href: '/neu?art=partner' },
]

export function MockNeuPopover({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()

  if (!open) return null

  return (
    <div className="neu-pop-overlay" onClick={onClose} role="presentation">
      <div className="neu-pop" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Neuen Vorgang erstellen">
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
                <MockIcon n={it.ic} size={18} />
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

export function FloatingAction() {
  const router = useRouter()

  return (
    <div className="fab-wrap fab-desktop">
      <button
        type="button"
        className="fab-btn"
        title="Neu erstellen"
        aria-label="Neu erstellen"
        onClick={() => router.push('/neu')}
      >
        <MockIcon n="plus" size={26} />
      </button>
    </div>
  )
}

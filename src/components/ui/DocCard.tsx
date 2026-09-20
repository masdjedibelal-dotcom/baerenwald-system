import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { cn } from '@/lib/utils'

export type DocType = 'offer' | 'invoice' | 'protocol' | 'other'

interface DocCardProps {
  type: DocType
  title: string
  subtitle: string
  onView?: () => void
  onDownload?: () => void
}

const DOC_CONFIG = {
  offer: {
    icon: 'file-text',
    bg: 'doc-icon-offer',
    color: 'text-warning',
  },
  invoice: {
    icon: 'receipt',
    bg: 'doc-icon-invoice',
    color: 'text-bw-success',
  },
  protocol: {
    icon: 'clipboard-list',
    bg: 'doc-icon-protocol',
    color: 'text-status-new-text',
  },
  other: {
    icon: 'file',
    bg: 'doc-icon-other',
    color: 'text-bw-text-muted',
  },
}

export function DocCard({ type, title, subtitle, onView, onDownload }: DocCardProps) {
  const config = DOC_CONFIG[type]

  return (
    <div className="doc-row">
      <div className={cn('doc-icon', config.bg)}>
        <MockIcon n={config.icon} ctx="default" size={20} className={config.color} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-bw-text">{title}</div>
        <div className="mt-0.5 text-xs text-bw-light">{subtitle}</div>
      </div>
      <div className="flex shrink-0 gap-1">
        {onView ? (
          <MockBtn className="rounded-button p-2 text-bw-link transition-colors hover:bg-bw-hover" type="button" onClick={onView} aria-label="Ansehen">
            <MockIcon n="eye" ctx="default" className="h-4 w-4" />
          </MockBtn>
        ) : null}
        {onDownload ? (
          <MockBtn className="rounded-button p-2 text-bw-mid transition-colors hover:bg-bw-hover" type="button" onClick={onDownload} aria-label="Herunterladen">
            <MockIcon n="download" ctx="default" className="h-4 w-4" />
          </MockBtn>
        ) : null}
      </div>
    </div>
  )
}

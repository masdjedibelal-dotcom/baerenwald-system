import {
  FileText,
  Receipt,
  ClipboardList,
  File,
  Eye,
  Download,
} from 'lucide-react'
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
    icon: FileText,
    bg: 'doc-icon-offer',
    color: 'text-orange-500',
  },
  invoice: {
    icon: Receipt,
    bg: 'doc-icon-invoice',
    color: 'text-green-500',
  },
  protocol: {
    icon: ClipboardList,
    bg: 'doc-icon-protocol',
    color: 'text-blue-500',
  },
  other: {
    icon: File,
    bg: 'doc-icon-other',
    color: 'text-gray-500',
  },
}

export function DocCard({ type, title, subtitle, onView, onDownload }: DocCardProps) {
  const config = DOC_CONFIG[type]
  const Icon = config.icon

  return (
    <div className="doc-card">
      <div className={cn('doc-icon', config.bg)}>
        <Icon className={cn('h-5 w-5', config.color)} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-bw-text">{title}</div>
        <div className="mt-0.5 text-xs text-bw-light">{subtitle}</div>
      </div>
      <div className="flex shrink-0 gap-1">
        {onView ? (
          <button
            type="button"
            onClick={onView}
            className="rounded-md p-2 text-bw-link transition-colors hover:bg-bw-hover"
            aria-label="Ansehen"
          >
            <Eye className="h-4 w-4" />
          </button>
        ) : null}
        {onDownload ? (
          <button
            type="button"
            onClick={onDownload}
            className="rounded-md p-2 text-bw-mid transition-colors hover:bg-bw-hover"
            aria-label="Herunterladen"
          >
            <Download className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

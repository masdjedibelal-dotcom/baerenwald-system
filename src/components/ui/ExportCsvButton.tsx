'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { cn } from '@/lib/utils'

type Props = {
  onClick: () => void
  className?: string
  /** Nur Icon (z. B. enge Mobile-Zeile). */
  iconOnly?: boolean
  variant?: 'secondary' | 'ghost'
}

/** Einheitlicher CSV-Export-Trigger für Listen. */
export function ExportCsvButton({
  onClick,
  className,
  iconOnly = false,
  variant = 'secondary',
}: Props) {
  return (
    <MockBtn
      type="button"
      kind={variant}
      sm
      onClick={onClick}
      aria-label="Als CSV exportieren"
      title="Als CSV exportieren"
      className={cn('shrink-0 gap-1.5', iconOnly && 'px-2.5', className)}
    >
      <MockIcon n="download" ctx="default" className="h-4 w-4" aria-hidden />
      {iconOnly ? <span className="sr-only">Export</span> : 'Export'}
    </MockBtn>
  )
}

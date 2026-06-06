import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Note({
  meta,
  children,
  className,
  variant = 'accent',
}: {
  meta?: ReactNode
  children: ReactNode
  className?: string
  /** accent: linker Markierungsstreifen; plain: Rahmen ohne Akzentstreifen */
  variant?: 'accent' | 'plain'
}) {
  return (
    <div className={cn(variant === 'plain' ? 'note-plain' : 'note', className)}>
      {meta ? <div className={variant === 'plain' ? 'note-plain-meta' : 'note-meta'}>{meta}</div> : null}
      <div>{children}</div>
    </div>
  )
}

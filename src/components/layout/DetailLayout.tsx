import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Standard-Layout für Detail-Seiten im Claude-Mockup-Stil:
 *
 *   ┌────────────────┬─────────────────────────────────────┐
 *   │  aside (320px) │  main (1fr)                         │
 *   │  sticky        │                                     │
 *   │  Cards stacken │  Tabs + Tab-Inhalt                  │
 *   └────────────────┴─────────────────────────────────────┘
 *
 * Auf <900 px: eine Spalte — Aside oben, Main darunter (kein Sticky).
 *
 * Beispiel:
 *   <DetailLayout
 *     aside={
 *       <>
 *         <Card title="Stammdaten">…</Card> (mit Titel automatisch einklappbar)
 *         <Card title="Compliance">…</Card>
 *       </>
 *     }
 *   >
 *     <Tabs … />
 *     {tabContent}
 *   </DetailLayout>
 */
export function DetailLayout({
  aside,
  children,
  className,
  asideClassName,
  mainClassName,
}: {
  aside?: ReactNode
  children: ReactNode
  className?: string
  asideClassName?: string
  mainClassName?: string
}) {
  if (!aside) {
    return <div className={cn('min-w-0', mainClassName, className)}>{children}</div>
  }

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col items-stretch gap-3 min-[900px]:flex-row min-[900px]:items-start min-[900px]:gap-4',
        className
      )}
    >
      <aside
        className={cn(
          'w-full flex-shrink-0 space-y-3',
          'min-[900px]:sticky min-[900px]:top-16 min-[900px]:max-h-[calc(100vh-5rem)] min-[900px]:w-[320px] min-[900px]:overflow-y-auto min-[900px]:pr-1',
          asideClassName
        )}
      >
        {aside}
      </aside>
      <main className={cn('min-w-0 flex-1 space-y-3 min-[900px]:space-y-4', mainClassName)}>{children}</main>
    </div>
  )
}

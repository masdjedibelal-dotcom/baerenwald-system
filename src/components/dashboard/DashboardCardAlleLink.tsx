import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DashboardCardAlleLink({
  href,
  children = 'Alle',
  className,
}: {
  href: string
  children?: ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md bg-bw-primary px-2.5 py-1 text-xs font-medium text-white transition-all hover:brightness-95 active:scale-[0.98]',
        className
      )}
    >
      {children}
      <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
    </Link>
  )
}

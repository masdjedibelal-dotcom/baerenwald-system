'use client'

import { cn } from '@/lib/utils'
import { kundenAvatarClass, kundenInitialen } from '@/components/kunden/TypBadge'

const AVATAR_TONE: Record<string, string> = {
  primary: 'bg-bw-primary text-white',
  soft: 'bg-bw-green-bg text-bw-primary',
  muted: 'bg-bw-bg-soft text-bw-text-muted',
}

/** Avatar mit Initialen (einheitlich in allen Listen). */
export function ListAvatar({
  name,
  typ,
  tone = 'primary',
  className,
  size = 'md',
}: {
  name: string
  typ?: string
  tone?: keyof typeof AVATAR_TONE
  className?: string
  size?: 'sm' | 'md'
}) {
  const sizeCls = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-[11px]'
  const colorCls = typ != null ? kundenAvatarClass(typ) : AVATAR_TONE[tone] ?? AVATAR_TONE.primary
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold',
        sizeCls,
        colorCls,
        className
      )}
      aria-hidden
    >
      {kundenInitialen(name)}
    </span>
  )
}

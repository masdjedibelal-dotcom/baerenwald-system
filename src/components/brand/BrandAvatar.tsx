import Image from 'next/image'
import { BRAND_ALT, BRAND_LOGO_BADGE } from '@/lib/brand'
import { cn } from '@/lib/utils'

type BrandAvatarProps = {
  /** Durchmesser in px */
  size?: number
  className?: string
  /** Für dekorative Nutzung (z. B. neben Name) */
  'aria-hidden'?: boolean
}

/**
 * Profil-/Marken-Avatar: immer das originale Bärenwald-Logo (Badge).
 */
export function BrandAvatar({
  size = 32,
  className,
  'aria-hidden': ariaHidden,
}: BrandAvatarProps) {
  return (
    <span
      className={cn('brand-avatar', className)}
      style={{ width: size, height: size }}
      aria-hidden={ariaHidden}
    >
      <Image
        src={BRAND_LOGO_BADGE}
        alt={ariaHidden ? '' : BRAND_ALT}
        width={size}
        height={size}
        className="brand-avatar__img"
      />
    </span>
  )
}

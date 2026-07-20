import Image from 'next/image'
import { BRAND_ALT, brandLogoPath, type BrandLogoVariant } from '@/lib/brand'
import { cn } from '@/lib/utils'

type BrandLogoProps = {
  variant?: BrandLogoVariant
  className?: string
  /** Anzeigehöhe in px — Breite proportional */
  height?: number
  priority?: boolean
}

export function BrandLogo({
  variant = 'white',
  className,
  height = 28,
  priority = false,
}: BrandLogoProps) {
  const src = brandLogoPath(variant)
  return (
    <Image
      src={src}
      alt={BRAND_ALT}
      width={Math.round(height * 1.15)}
      height={height}
      className={cn('h-auto w-auto object-contain', className)}
      style={{ height, width: 'auto', maxWidth: height * 1.4 }}
      priority={priority}
    />
  )
}

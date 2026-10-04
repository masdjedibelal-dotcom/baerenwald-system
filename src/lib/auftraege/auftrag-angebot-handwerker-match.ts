import type { AuftragPosition } from '@/lib/types';

type GewerkOpt = { id: string; name: string; slug: string }

export function gewerkIdFuerPosition(
  pos: Pick<AuftragPosition, 'gewerk_slug' | 'gewerk_name'>,
  gewerke: GewerkOpt[]
): string | null {
  const bySlug = pos.gewerk_slug?.trim()
    ? gewerke.find((g) => g.slug === pos.gewerk_slug)?.id
    : undefined
  if (bySlug) return bySlug
  const byName = gewerke.find((g) => g.name === pos.gewerk_name)?.id
  return byName ?? null
}

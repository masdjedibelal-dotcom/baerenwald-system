import {
  AlertTriangle,
  Bath,
  Building,
  Building2,
  DoorOpen,
  Droplets,
  Flame,
  Hammer,
  Home,
  Key,
  Layers,
  Paintbrush,
  Snowflake,
  Sparkles,
  Store,
  TreeDeciduous,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const BEREICH_MAP: Record<string, LucideIcon> = {
  bad: Bath,
  heizung: Flame,
  elektrik: Zap,
  waende: Paintbrush,
  boden: Layers,
  fenster: DoorOpen,
  dach: Home,
  fassade: Building,
  trockenbau: Hammer,
  sanitaer: Droplets,
  schimmel: AlertTriangle,
  garten: TreeDeciduous,
  reinigung: Sparkles,
  hausmeister: Key,
  winterdienst: Snowflake,
  gewerbe: Store,
}

export function BereichIcon({ value, className }: { value: string; className?: string }) {
  const Icon = BEREICH_MAP[value] ?? Building2
  return <Icon className={cn('h-4 w-4 shrink-0 text-bw-text-muted', className)} aria-hidden />
}

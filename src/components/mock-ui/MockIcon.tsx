'use client'

import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Filter,
  FolderOpen,
  Folders,
  Inbox,
  LayoutDashboard,
  ListChecks,
  MoreHorizontal,
  PanelLeft,
  PanelLeftClose,
  Phone,
  Plus,
  Receipt,
  Search,
  Settings,
  SlidersHorizontal,
  Star,
  Trash2,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  folders: Folders,
  'folder-open': FolderOpen,
  users: Users,
  tool: Wrench,
  building: Building2,
  calendar: Calendar,
  settings: Settings,
  search: Search,
  bell: Bell,
  filter: SlidersHorizontal,
  checks: ListChecks,
  download: Download,
  dots: MoreHorizontal,
  plus: Plus,
  inbox: Inbox,
  'file-invoice': FileText,
  briefcase: Briefcase,
  receipt: Receipt,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'arrow-left': ArrowLeft,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'arrows-sort': ArrowUpDown,
  check: Check,
  x: X,
  trash: Trash2,
  phone: Phone,
  'alert-triangle': AlertTriangle,
  clock: Clock,
  'star-filled': Star,
  layout: PanelLeft,
  eye: ArrowRight,
  forms: FileText,
  plug: SlidersHorizontal,
  'shield-check': Check,
  list: ListChecks,
  'arrow-right': ArrowRight,
}

type MockIconProps = {
  n: string
  size?: number
  className?: string
  style?: React.CSSProperties
}

export function MockIcon({ n, size = 16, className, style }: MockIconProps) {
  const Icon = ICON_MAP[n] ?? SlidersHorizontal
  return (
    <Icon
      className={cn('shrink-0', className)}
      size={size}
      style={style}
      aria-hidden
    />
  )
}

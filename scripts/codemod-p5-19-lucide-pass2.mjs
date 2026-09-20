#!/usr/bin/env node
/**
 * P5-19 Pass 2: icon: LucideComp / icon={LucideComp} → MockIcon-Namen.
 * Usage: node scripts/codemod-p5-19-lucide-pass2.mjs [--dry]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const DRY = process.argv.includes('--dry')

const LUCIDE_TO_N = {
  Activity: 'activity',
  AlertCircle: 'alert-triangle',
  AlertTriangle: 'alert-triangle',
  AlignLeft: 'list',
  ArrowDown: 'arrow-down',
  ArrowLeft: 'arrow-left',
  ArrowLeftRight: 'arrows-exchange',
  ArrowRight: 'arrow-right',
  ArrowUp: 'arrow-up',
  ArrowUpDown: 'arrows-exchange',
  Bell: 'bell',
  Bold: 'text-caption',
  Briefcase: 'briefcase',
  Building2: 'building',
  Calculator: 'calculator',
  Calendar: 'calendar',
  CalendarDays: 'calendar-event',
  CalendarPlus: 'calendar-plus',
  Camera: 'photo',
  Check: 'check',
  CheckCheck: 'checks',
  CheckCircle: 'circle-check-filled',
  CheckCircle2: 'circle-check-filled',
  CheckSquare: 'checklist',
  ChevronDown: 'chevron-down',
  ChevronLeft: 'chevron-left',
  ChevronRight: 'chevron-right',
  ChevronUp: 'chevron-up',
  Circle: 'circle',
  CircleCheck: 'circle-check-filled',
  CircleX: 'circle-x',
  ClipboardList: 'clipboard-list',
  ClipboardPen: 'file-pencil',
  Clock: 'clock',
  CloudRain: 'droplet',
  CloudUpload: 'cloud-upload',
  Copy: 'copy',
  Download: 'download',
  Droplets: 'droplet',
  Edit2: 'pencil',
  Equal: 'equal',
  ExternalLink: 'external-link',
  Eye: 'eye',
  EyeOff: 'eye',
  File: 'file',
  FileCheck: 'file-text',
  FilePen: 'file-pencil',
  FileText: 'file-text',
  FileUp: 'upload',
  FileWarning: 'file-off',
  Files: 'files',
  Filter: 'filter',
  Flag: 'tag',
  FolderOpen: 'folder-open',
  Folders: 'folders',
  Forward: 'mail-forward',
  Globe: 'world',
  GripVertical: 'grip-vertical',
  Hash: 'tag',
  HelpCircle: 'help',
  History: 'history',
  Hourglass: 'hourglass',
  Image: 'photo',
  ImageIcon: 'photo',
  ImagePlus: 'photo-plus',
  Import: 'database-import',
  Inbox: 'inbox',
  Info: 'info-circle',
  Italic: 'text-caption',
  Layers2: 'stack-2',
  LayoutDashboard: 'layout-dashboard',
  LayoutGrid: 'layout',
  LayoutTemplate: 'layout-kanban',
  Link: 'link',
  Link2: 'link',
  List: 'list',
  ListChecks: 'checklist',
  ListOrdered: 'list-numbers',
  Loader2: 'hourglass',
  LogIn: 'arrow-right',
  LogOut: 'arrow-left',
  Mail: 'mail',
  MapPin: 'map-pin',
  MessageCircle: 'message',
  MessageSquare: 'message',
  MessagesSquare: 'messages',
  Mic: 'microphone',
  Minus: 'minus',
  Monitor: 'layout',
  MoreHorizontal: 'dots',
  Paperclip: 'file',
  Pencil: 'pencil',
  Percent: 'percentage',
  Phone: 'phone',
  PhoneOff: 'phone-off',
  Pilcrow: 'text-caption',
  Play: 'player-play-filled',
  Plug: 'plug',
  Plus: 'plus',
  Receipt: 'receipt',
  RefreshCw: 'history',
  RemoveFormatting: 'text-caption',
  Save: 'device-floppy',
  Search: 'search',
  Send: 'send',
  Settings: 'settings',
  Shield: 'shield-check',
  ShieldCheck: 'shield-check',
  ShieldX: 'shield-x',
  Smartphone: 'phone',
  Sparkles: 'sparkles',
  Square: 'circle',
  Star: 'star',
  Tag: 'tag',
  Trash2: 'trash',
  TrendingUp: 'trending-up',
  Trophy: 'trophy',
  Type: 'text-caption',
  Underline: 'text-caption',
  Upload: 'upload',
  User: 'user',
  UserPlus: 'user',
  UserX: 'user-off',
  Users: 'users',
  Wrench: 'tool',
  X: 'x',
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.tsx$/.test(name)) out.push(p)
  }
  return out
}

let changed = 0
for (const file of walk(join(ROOT, 'src'))) {
  let src = readFileSync(file, 'utf8')
  const orig = src

  // icon: Comp → icon: 'name'  (and icon={Comp} → icon="name")
  for (const [comp, n] of Object.entries(LUCIDE_TO_N)) {
    src = src.replace(new RegExp(`\\bicon:\\s*${comp}\\b`, 'g'), `icon: '${n}'`)
    src = src.replace(new RegExp(`\\bicon=\\{${comp}\\}`, 'g'), `icon="${n}"`)
  }

  // LucideIcon type leftovers → MockIconName
  if (/LucideIcon/.test(src)) {
    if (!/from ['"]@\/lib\/mock-icons['"]/.test(src) && !/type MockIconName/.test(src)) {
      src = `import type { MockIconName } from '@/lib/mock-icons'\n` + src
    }
    src = src.replace(/\bLucideIcon\b/g, 'MockIconName')
  }

  // <Icon className=... /> where Icon comes from map — leave for manual; 
  // Pattern: const Icon = ... already string

  if (src !== orig) {
    changed++
    if (!DRY) writeFileSync(file, src)
    console.log(`${DRY ? '[dry] ' : ''}${relative(ROOT, file)}`)
  }
}
console.log(`files=${changed}`)

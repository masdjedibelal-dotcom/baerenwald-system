#!/usr/bin/env node
/**
 * P5-19: lucide-react → MockIcon (CRM).
 * Usage: node scripts/codemod-p5-19-lucide-to-mockicon.mjs [--dry]
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const DRY = process.argv.includes('--dry')
const SRC = join(ROOT, 'src')

/** Lucide-Komponente → MockIcon `n` (nur vorhandene Tabler-SVGs). */
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

function inferCtx(before) {
  const b = before.toLowerCase()
  if (/\bbtn|button|mockbtn/.test(b)) return 'btn'
  if (/\bsidebar|bottomnav/.test(b)) return 'sidebar'
  if (/\bnav|tab\b/.test(b)) return 'nav'
  if (/\bempty/.test(b)) return 'empty'
  if (/\brow|menu|action/.test(b)) return 'row'
  return 'default'
}

let filesChanged = 0
let iconsReplaced = 0
const skipped = []

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  if (/\/MockIcon\.tsx$|\/mock-icons\.ts$|\/mock-icon-svgs/.test(rel)) continue

  let src = readFileSync(file, 'utf8')
  if (!/from\s+['"]lucide-react['"]/.test(src)) continue

  const importRe = /import\s*(?:type\s+)?\{([^}]+)\}\s*from\s*['"]lucide-react['"]\s*;?/g
  const imported = new Map() // localName → mock n
  let typeOnly = false
  let m
  while ((m = importRe.exec(src))) {
    for (const part of m[1].split(',')) {
      const bit = part.trim()
      if (!bit) continue
      if (bit.startsWith('type ')) {
        typeOnly = true
        continue
      }
      const [left, right] = bit.split(/\s+as\s+/)
      const orig = left.trim()
      const local = (right || left).trim()
      if (orig === 'LucideIcon' || local === 'LucideIcon') {
        typeOnly = true
        continue
      }
      const n = LUCIDE_TO_N[orig]
      if (!n) {
        skipped.push(`${rel}: unmapped ${orig}`)
        continue
      }
      imported.set(local, n)
    }
  }

  if (imported.size === 0) {
    // nur type LucideIcon — Import entfernen wenn möglich
    if (typeOnly) {
      const next = src.replace(importRe, '')
      if (next !== src) {
        src = next
        filesChanged++
        if (!DRY) writeFileSync(file, src)
        console.log(`${DRY ? '[dry] ' : ''}${rel} (type-only import removed)`)
      }
    }
    continue
  }

  // JSX self-closing: <Check ... />
  for (const [local, n] of imported) {
    const tagRe = new RegExp(`<${local}(\\s[^>/]*)?\\s*/>`, 'g')
    src = src.replace(tagRe, (full, attrs = '') => {
      iconsReplaced++
      const a = attrs || ''
      // size / className / strokeWidth / aria-* behalten
      let size = ''
      let className = ''
      let rest = a
      const sizeM = a.match(/\bsize=\{(\d+)\}/)
      if (sizeM) {
        size = ` size={${sizeM[1]}}`
        rest = rest.replace(sizeM[0], '')
      }
      const sizeNum = a.match(/\bsize=\{?"?(\d+)"?\}?/)
      // className
      const cnM = a.match(/\bclassName=\{?(`[^`]*`|"[^"]*"|'[^']*'|\{[^}]*\})\}?/)
      if (cnM) {
        className = ` className={${cnM[1].startsWith('{') ? cnM[1].slice(1, -1) : cnM[1]}}`
        // simplify: keep original className=...
        className = ` ${cnM[0]}`
        rest = rest.replace(cnM[0], '')
      }
      // strip strokeWidth / absoluteStrokeWidth / color (MockIcon handles)
      rest = rest
        .replace(/\bstrokeWidth=\{[^}]+\}/g, '')
        .replace(/\babsoluteStrokeWidth(?:=\{[^}]*\})?/g, '')
        .replace(/\bcolor=["'][^"']*["']/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      const ctx = inferCtx(full + a)
      const extra = rest ? ` ${rest}` : ''
      return `<MockIcon n="${n}" ctx="${ctx}"${size}${className}${extra} />`
    })
  }

  // Remove lucide import(s)
  src = src.replace(importRe, '')

  // Ensure MockIcon import
  if (!/from\s+['"]@\/components\/mock-ui\/MockIcon['"]/.test(src)) {
    const clientM = src.match(/^['"]use client['"];?\s*\n/)
    const insertAt = clientM ? clientM[0].length : 0
    src =
      src.slice(0, insertAt) +
      `import { MockIcon } from '@/components/mock-ui/MockIcon'\n` +
      src.slice(insertAt)
  }

  // leftover bare identifier usage (Icon={Check} etc.) — flag
  for (const local of imported.keys()) {
    const bare = new RegExp(`\\b${local}\\b`)
    if (bare.test(src)) {
      skipped.push(`${rel}: leftover ${local}`)
    }
  }

  filesChanged++
  if (!DRY) writeFileSync(file, src)
  console.log(`${DRY ? '[dry] ' : ''}${rel}`)
}

console.log(`files=${filesChanged} icons≈${iconsReplaced}${DRY ? ' (dry)' : ''}`)
if (skipped.length) {
  console.log('skipped/leftover:')
  for (const s of skipped.slice(0, 40)) console.log(' ', s)
  if (skipped.length > 40) console.log(`  … +${skipped.length - 40}`)
}

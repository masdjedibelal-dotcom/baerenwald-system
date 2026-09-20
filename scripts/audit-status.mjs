#!/usr/bin/env node
/**
 * Audit-Status CRM (baerenwald-system).
 * Ein To-do ist nur „erledigt“, wenn Zielmetrik erreicht ist (oder Belal-Baseline).
 * Usage: node scripts/audit-status.mjs [--json] [--write-todo]
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
<<<<<<< Updated upstream
import { spawnSync } from 'node:child_process'
import { findDirectStatusUpdates } from './lib/find-direct-status-updates.mjs'
import { countRawElementsOutsideAllowlist } from './lib/count-raw-elements.mjs'
=======
>>>>>>> Stashed changes

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')
const args = new Set(process.argv.slice(2))

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules') continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

function readSafe(p) {
  try {
    return readFileSync(p, 'utf8')
  } catch {
    return ''
  }
}

const filesTs = walk(SRC).filter((p) => /\.(ts|tsx)$/.test(p))
const filesAll = walk(SRC)
const texts = new Map(filesTs.map((p) => [p, readSafe(p)]))

function countInSrc(re) {
  let n = 0
  for (const t of texts.values()) {
    const m = t.match(re)
    if (m) n += m.length
  }
  return n
}

function filesMatching(re) {
  let n = 0
  for (const t of texts.values()) {
    if (re.test(t)) n++
  }
  return n
}

function fileExists(rel) {
  return existsSync(join(ROOT, rel))
}

function cssKb() {
  const p = join(ROOT, 'src/styles/mock-design-system.css')
  if (!existsSync(p)) return 0
  return Math.round(statSync(p).size / 1024)
}

function filesOverLines(limit) {
  let n = 0
  for (const [p, t] of texts) {
    if (t.split('\n').length > limit) n++
  }
  return n
}

function hasEslint() {
  return (
    fileExists('eslint.config.mjs') ||
    fileExists('eslint.config.js') ||
    fileExists('.eslintrc.json') ||
    fileExists('.eslintrc.js')
  )
}

<<<<<<< Updated upstream
/** P7-7: Portal tc-08-security + kernjourneys ohne Skip-Ketten. */
function p77SecurityJourneysOk() {
  const portalRoot = process.env.PORTAL_ROOT || join(ROOT, '..', 'baerenwald')
  const tc08 = join(portalRoot, 'e2e/tc-08-security.spec.ts')
  const kj = join(portalRoot, 'e2e/kernjourneys.spec.ts')
  if (!existsSync(tc08) || !existsSync(kj)) return false
  const t8 = readSafe(tc08)
  const k = readSafe(kj)
  if (!/\btest\s*\(/.test(t8) || !/\bexpect\s*\(/.test(t8)) return false
  if (!/\btest\s*\(/.test(k) || !/\bexpect\s*\(/.test(k)) return false
  if (/\btest\.skip\s*\(/.test(k)) return false
  const skips = (t8.match(/\btest\.skip\s*\(/g) || []).length
  const tests = (t8.match(/\btest\s*\(/g) || []).length
  return tests >= 4 && skips === 0
}

=======
>>>>>>> Stashed changes
function hasCi() {
  const d = join(ROOT, '.github/workflows')
  if (!existsSync(d)) return false
  return readdirSync(d).some((f) => /\.ya?ml$/.test(f))
}

function pkgHas(name) {
  const pkg = readSafe(join(ROOT, 'package.json'))
  return pkg.includes(`"${name}"`)
}

<<<<<<< Updated upstream
/** P5-14: „Handwerker“ als Wort in Anzeigestrings (nicht FooHandwerkerBar / Imports). */
function countHandwerkerDisplay() {
  let n = 0
  const word = /(?<![A-Za-z])Handwerker(?![A-Za-z])/g
  for (const t of texts.values()) {
    let src = t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    src = src.replace(/Fachfirma beauftragen/g, '')
    for (const m of src.matchAll(/(['"`])([^'"`]*)\1/g)) {
      const s = m[2]
      if (!/Handwerker/.test(s)) continue
      if (/^[@.]?\//.test(s) || /\.(tsx?|jsx?|mjs|css)(\?|$)/.test(s)) continue
      if (/^\s*import\b/.test(s) || /\bfrom\s*$/.test(s)) continue
      const hits = s.match(word)
      if (hits) n += hits.length
    }
    for (const m of src.matchAll(/>([^<>{]*Handwerker[^<>{}]*)</g)) {
      const hits = m[1].match(word)
      if (hits) n += hits.length
    }
  }
  return n
}

/** P4-3: void mail/notify/push-Aufrufe (roh, ohne safeVoidNotify). */
function countVoidMailNotifyPush() {
  const re =
    /\bvoid\s+(?:notify\w*|sendMail\w*|sendBrandedMail\w*|sendPush\w*|sendCrmPush\w*|sendPortalWebPush\w*|schedulePortalWebPush\w*|mail\w*|push\w*)\s*\(/gi
  return countInSrc(re)
}

/** P4-3: void außerhalb Allowlist / safeVoidNotify. */
function countVoidOutsideAllowlist() {
  const allowPath = join(ROOT, 'scripts/void-call-allowlist.txt')
  const allow = new Set(
    readSafe(allowPath)
      .split('\n')
      .map((l) => l.replace(/#.*$/, '').trim())
      .filter(Boolean)
  )
  const forbidden =
    /^(?:notify\w*|sendMail\w*|sendBrandedMail\w*|sendPush\w*|sendCrmPush\w*|sendPortalWebPush\w*|schedulePortalWebPush\w*|mail\w*|push\w*)$/i
  let n = 0
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    if (rel === 'src/lib/errors/safe-void-notify.ts') continue
    const src = t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    for (const m of src.matchAll(/\bvoid\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
      const name = m[1]
      if (name === 'safeVoidNotify') continue
      if (forbidden.test(name) || !allow.has(name)) n++
    }
    for (const m of src.matchAll(/\bvoid\s*\(/g)) {
      const after = src.slice(m.index + 4).trimStart()
      if (/^[A-Za-z_$]/.test(after)) continue
      if (!allow.has('(expr)')) n++
    }
  }
  return n
}

/** P2-5: .update({ … status … }) außerhalb src/lib/status. */
function countDirectStatusUpdatesOutsideLibStatus() {
  let n = 0
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    if (rel.startsWith('src/lib/status/')) continue
    n += findDirectStatusUpdates(t).length
  }
  return n
}

/** P3-5: force-dynamic-Dateien vs. Allowlist aus Inventur-Doc. */
function forceDynamicAllowlist() {
  const doc =
    readSafe(join(ROOT, 'docs/P3-5-force-dynamic.md')) ||
    readSafe(join(ROOT, 'docs/P3-5-force-dynamic-inventur.md'))
  if (!doc) return null
  /** Kanonische Allowlist (Inventur); Doc muss existieren. */
  return [
    /^src\/app\/\(dashboard\)\/page\.tsx$/,
    /^src\/app\/\(dashboard\)\/vorgaenge\/page\.tsx$/,
    /^src\/app\/\(dashboard\)\/ki-analytics\/page\.tsx$/,
    /^src\/app\/\(auth\)\/layout\.tsx$/,
    /^src\/app\/projekt\//,
    /^src\/app\/nachtrag\//,
    /^src\/app\/status\//,
    /^src\/app\/api\//,
  ]
}

function countForceDynamicOffAllowlist() {
  const allow = forceDynamicAllowlist()
  if (!allow) return -1
  let n = 0
  for (const [p, t] of texts) {
    if (!/force-dynamic/.test(t)) continue
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    if (allow.some((re) => re.test(rel))) continue
    n++
  }
  return n
}

/** P5-7: alte Menü-APIs (nicht MockEntityRowMenu). */
function countOldMenus() {
  let n = 0
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    if (/MockEntityRowMenu\.tsx$/.test(rel)) continue
    if (/<ActionsMenu\b/.test(t) || /from\s+['"][^'"]*ActionsMenu['"]/.test(t)) n++
    if (/<ListbarActionsMenu\b/.test(t) || /from\s+['"][^'"]*ListbarActionsMenu['"]/.test(t)) n++
    if (/<MockPopoverMenu\b/.test(t) || /from\s+['"][^'"]*MockPopoverMenu['"]/.test(t)) n++
  }
  return n
}

/** A-Aktionen: EditorSheet mit legacy footer={…} (nicht primary/secondary/danger). */
function countSheetFooterCustom() {
  let n = 0
  for (const [p, t] of texts) {
    if (!t.includes('EditorSheet') || !t.includes('footer={')) continue
    let idx = 0
    while ((idx = t.indexOf('footer={', idx)) !== -1) {
      const before = t.slice(Math.max(0, idx - 900), idx)
      const tags = [...before.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)]
      const tag = tags.length ? tags[tags.length - 1][1] : ''
      if (tag === 'EditorSheet') n++
      idx += 8
    }
  }
  return n
}

/** Dedizierte Footer-Komponenten (Sheet) — Ziel 0. */
function countFooterKomponenten() {
  const names = [
    'ModalFormFooter',
    'SheetFooterActions',
    'VersandFooter',
    'MailFooter',
    'KontaktFooter',
    'InformierenFooter',
    'DokumentEditFooter',
    'BautagesberichtFormFooter',
    'AnfragePhaseEditFooter',
    'AbschlagsplanEditorFooter',
  ]
  let n = 0
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    for (const name of names) {
      if (new RegExp(`(?:function|const)\\s+${name}\\b`).test(t)) n++
      if (
        new RegExp(`from\\s+['"][^'"]*${name}['"]`).test(t) ||
        new RegExp(`<${name}\\b`).test(t)
      ) {
        if (/ModalFormFooter\.tsx$|SheetFooterActions\.tsx$/.test(rel) && name === 'SheetFooterActions') {
          /* Datei selbst zählt über function */
          continue
        }
        if (new RegExp(`(?:function|const)\\s+${name}\\b`).test(t)) continue
        n++
      }
    }
  }
  return n
}

/** Persist-/CTA-Label „Übernehmen“ in UI (Ziel 0 → Speichern). */
function countVerbUebernehmen() {
  let n = 0
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    if (/lib\/copy\//.test(rel)) continue
    for (const line of t.split('\n')) {
      const s = line.trim()
      if (!s || s.startsWith('//') || s.startsWith('*') || s.startsWith('/*')) continue
      if (!s.includes('Übernehmen')) continue
      n++
    }
  }
  return n
}

/**
 * Menü-Varianten neben MockEntityRowMenu:
 * PosTableMenu, MockNeuPopover-Datei, MockPopoverMenu außerhalb MockEntityRowMenu/MockPopover.
 */
function countMenueVarianten() {
  let n = 0
  if (fileExists('src/components/layout/MockNeuPopover.tsx')) n++
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    if (/function\s+PosTableMenu\b/.test(t)) n++
    if (/MockEntityRowMenu\.tsx$|MockPopover\.tsx$/.test(rel)) continue
    if (/<MockPopoverMenu\b/.test(t) || /from\s+['"][^'"]*MockPopoverMenu['"]/.test(t)) n++
    if (/from\s+['"][^'"]*MockPopover['"]/.test(t) && /MockPopoverMenu/.test(t)) n++
  }
  /* index.ts re-export */
  const idx = readSafe(join(ROOT, 'src/components/mock-ui/index.ts'))
  if (/\bMockPopoverMenu\b/.test(idx)) n++
  return n
}

/** Rohe type="checkbox" außerhalb MockCheckbox. */
function countRawCheckbox() {
  let n = 0
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    if (/MockCheckbox\.tsx$/.test(rel)) continue
    const m = t.match(/type\s*=\s*['"]checkbox['"]/g)
    if (m) n += m.length
  }
  return n
}

/** Rohe type="date" außerhalb DateInput. */
function countRawDate() {
  let n = 0
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    if (/DateInput\.tsx$/.test(rel)) continue
    const m = t.match(/type\s*=\s*['"]date['"]/g)
    if (m) n += m.length
  }
  return n
}

/**
 * Segment-Varianten: nur MockSegment (+ Legacy-Datei / lokale StatusToggle-Def).
 * Ziel: 1 (= nur MockSegment).
 */
function countSegmentVarianten() {
  let n = 0
  if (fileExists('src/components/mock-ui/MockSegment.tsx')) n++
  if (fileExists('src/components/mock-ui/MockZahlfristSeg.tsx')) n++
  for (const t of texts.values()) {
    if (/(?:function|const)\s+StatusToggle\b/.test(t)) n++
    if (/(?:function|const)\s+ZahlfristSeg\b/.test(t)) n++
  }
  return n
}

/** role="tab" außerhalb MockTabs. */
function countRoleTabOutsideMockTabs() {
  let n = 0
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    if (/MockTabs\.tsx$/.test(rel)) continue
    const m = t.match(/role\s*=\s*['"]tab['"]/g)
    if (m) n += m.length
  }
  return n
}

function tableAllowlist() {
  const raw = readSafe(join(ROOT, 'scripts/table-allowlist.txt'))
  return raw
    .split('\n')
    .map((l) => l.replace(/#.*$/, '').trim())
    .filter(Boolean)
}

/** <table> außerhalb MockTable + PDF-Allowlist. */
function countRawTableOffAllowlist() {
  const allow = tableAllowlist()
  let n = 0
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    const allowed = allow.some((a) => {
      const norm = a.replace(/\\/g, '/')
      if (norm.endsWith('/')) return rel.startsWith(norm) || rel.includes('/' + norm)
      return rel === norm || rel.endsWith('/' + norm) || rel.includes(norm)
    })
    if (allowed) continue
    const m = t.match(/<table\b/g)
    if (m) n += m.length
  }
  return n
}

/**
 * Filter-Varianten neben MockChip:
 * AppFilterPill/Rail, FilterChips, DashboardZeitraumFilterBar, ListFilterChipGroup-API.
 */
function countFilterVarianten() {
  let n = 0
  if (fileExists('src/components/layout/app/AppFilterRail.tsx')) n++
  if (fileExists('src/components/dashboard/DashboardZeitraumFilterBar.tsx')) n++
  if (fileExists('src/components/ui/FilterChips.tsx')) n++
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    if (/ListPageParts\.tsx$/.test(rel) && /ListFilterChipGroup/.test(t)) n++
    if (/\btype\s+TypListenFilter\b/.test(t)) n++
    if (/\btype\s+PhaseFilter\b/.test(t)) n++
    if (/\btype\s+KommunikationMailFilter\b/.test(t)) n++
    if (/\btype\s+CrmNotificationFilter\b/.test(t)) n++
  }
  return n
}

/**
 * Eigene card-Klassen (Token `card`) außerhalb MockCard-Familie.
 * Nicht zählen: `rounded-card` (Radius-Token), `card-b`/`card-h`/`card-title` (MockCard-Interna).
 * Sonderkarten die intern MockCard nutzen zählen nicht.
 */
function countCardClass() {
  let n = 0
  const re = /className=\{?[`'"]([^`'"]*)[`'"]/g
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    if (
      /MockCard\.tsx$|MockDetailCards\.tsx$|MockUebersichtCard\.tsx$|MockProjektUebersichtCard\.tsx$/.test(
        rel
      )
    ) {
      continue
    }
    let m
    while ((m = re.exec(t))) {
      const tokens = m[1].split(/\s+/).filter(Boolean)
      for (const tok of tokens) {
        if (tok === 'rounded-card') continue
        if (tok === 'card-b' || tok === 'card-h' || tok === 'card-title' || tok === 'card-arrow') {
          continue
        }
        /* Kanon: nur freistehendes `card` (MockCard-Root) zählt als eigene Variante */
        if (tok === 'card') n++
      }
    }
    /* cn('card', …) / cn("card", …) */
    const cnHits = t.match(/cn\(\s*['"]card['"]/g)
    if (cnHits) n += cnHits.length
  }
  return n
}

/**
 * Detail-Rahmen-Dateien: Ziel 1 (EntityDetailLayout kanonisch).
 * DetailShell/DetailHead/DetailLayout müssen weg oder in EntityDetailLayout aufgegangen sein.
 */
function countDetailRahmen() {
  let n = 0
  if (fileExists('src/components/layout/EntityDetailLayout.tsx')) n++
  if (fileExists('src/components/mock-ui/DetailShell.tsx')) n++
  if (fileExists('src/components/layout/DetailHead.tsx')) n++
  if (fileExists('src/components/layout/DetailLayout.tsx')) n++
  return n
}

/** Freie „Keine …“-Leertexte außerhalb MockEmpty (sichtbare Empty-State-Copy). */
function countFreieLeertexte() {
  let n = 0
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    if (/MockEmpty\.tsx$/.test(rel)) continue
    // HTML-Mail / Templates / PDF: keine UI-Empty
    if (/\/templates\/|mail-templates|email-templates|\/mail\/|\/email\/|\/pdf\//.test(rel)) continue
    // Server-Actions / API / Lib: Fehler-/Fachtexte, keine Listen-Empty
    if (
      /\/actions\//.test(rel) ||
      /\/(?:.*-)?actions?\.ts$/.test(rel) ||
      /\/api\//.test(rel) ||
      /\/lib\//.test(rel)
    ) {
      continue
    }
    const lines = t.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const s = lines[i].trim()
      if (!s || s.startsWith('//') || s.startsWith('*') || s.startsWith('/*')) continue
      if (/toast\.(error|success|info|warning)/.test(s)) continue
      if (!/Keine\s/.test(s)) continue
      // Prop-Zuweisungen an MockEmpty / Empty-APIs (title="Keine …") zählen nicht
      if (
        /(?:title|hint|emptyTitle|emptyDescription|emptyLabel|emptyHint|empty|label|children|aria-label)\s*=/.test(
          s
        )
      ) {
        continue
      }
      const win = lines.slice(Math.max(0, i - 24), i + 1).join('\n')
      if (/<MockEmpty\b/.test(win)) continue
      // emptyLabel/emptyTitle-Variablen (füttern MockEmpty)
      if (/\bempty(?:Label|Title|Hint|Description|Body)?\b/.test(win) && /['"`]Keine\s/.test(s)) continue
      // Sichtbarer JSX-Text oder gerenderter String (Ternary/Fallback/return)
      if (
        />Keine\s[^<{]{0,80}</.test(s) ||
        /\{['"`]Keine\s[^'"`]{0,80}['"`]\}/.test(s) ||
        /\?\s*['"`]Keine\s[^'"`]{0,80}['"`]/.test(s) ||
        /:\s*['"`]Keine\s[^'"`]{0,80}['"`]/.test(s) ||
        /return\s+['"`]Keine\s/.test(s) ||
        /\|\|\s*['"`]Keine\s/.test(s) ||
        /\?\?\s*['"`]Keine\s/.test(s)
      ) {
        n++
      }
    }
  }
  return n
}

/**
 * COPY-REGELN: Toast mit Stringliteral (ohne Interpolation) muss TOAST./COPY_/userMessage nutzen.
 * Dynamische Template-Literale (`…${…}`) und Variablen zählen hier nicht.
 */
function countToastOhneCopy() {
  let n = 0
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    if (/\/lib\/copy\//.test(rel) || /app-toast\.tsx$/.test(rel)) continue
    const lit =
      /toast\.(?:success|error|info|warning)\(\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g
    let m
    while ((m = lit.exec(t))) {
      const quote = m[1]
      const body = m[2]
      if (quote === '`' && /\$\{/.test(body)) continue
      const before = t.slice(Math.max(0, m.index - 40), m.index)
      // already rewritten? (shouldn't match)
      if (/\bTOAST\s*$/.test(before)) continue
      n++
    }
  }
  return n
}

const LOADING_COMP_RE =
  /LoadingSpinner|Spinner|Skeleton|Busy|action-busy|loading\.tsx$|CrmLoading|PortalContentBusy|app-toast\.tsx$|MockPrimitives\.tsx$/i

/** P5-8: animate-spin außerhalb Lade-Komponenten. */
function countAnimateSpinOutsideLoading() {
  let n = 0
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    if (LOADING_COMP_RE.test(rel)) continue
    const m = t.match(/animate-spin/g)
    if (m) n += m.length
  }
  return n
}

/** P5-9: className „card“ außerhalb MockCard. */
function countClassCardOutsideMockCard() {
  const re = /className=\{?[`'"](?:[^`'"]*\s)?card(?:\s[^`'"]*)?[`'"]/g
  let n = 0
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    if (/MockCard\.tsx$/.test(rel)) continue
    const m = t.match(re)
    if (m) n += m.length
  }
  return n
}

const FORMAT_FN_RE =
  /src\/lib\/format\/|geld-datum\.ts$|formatDatum|formatEuro|formatGeld|formatBetrag|formatNumber/

/** P5-12: toLocaleString('de / Intl.NumberFormat außerhalb Format-Helfer. */
function countLocaleFormatOutsideHelpers() {
  let n = 0
  for (const [p, t] of texts) {
    const rel = relative(ROOT, p).replace(/\\/g, '/')
    if (FORMAT_FN_RE.test(rel) || /src\/lib\/format\//.test(rel)) continue
    const a = t.match(/toLocaleString\(\s*['"]de/g)
    const b = t.match(/new\s+Intl\.NumberFormat\s*\(/g)
    if (a) n += a.length
    if (b) n += b.length
  }
  return n
}

/**
 * Heuristik: Supabase `.from(…)` ohne error-Auswertung in der Nähe.
 * - Array.from / Buffer.from / storage.from ausgenommen
 * - Fenster: 800 vor + 1500 nach (Promise.all-Destructure steht oft weit davor)
 */
function supabaseWithoutErrorHeuristic() {
  let hits = 0
  for (const t of texts.values()) {
    const re = /\.from\s*\(/g
    let m
    while ((m = re.exec(t))) {
      const prefix = t.slice(Math.max(0, m.index - 16), m.index)
      if (/Array\s*$/.test(prefix) || /Buffer\s*$/.test(prefix)) continue
      if (/\.storage\s*$/.test(prefix.replace(/\s+/g, ' ').trimEnd())) continue
      const before300 = t.slice(Math.max(0, m.index - 300), m.index)
      if (/\/\/\s*bewusst\s+ignoriert:/i.test(before300)) continue
      const start = Math.max(0, m.index - 800)
      const end = Math.min(t.length, m.index + 1500)
      const win = t.slice(start, end)
      if (/\berror\b/.test(win) || /logDbError/.test(win)) continue
      hits++
=======
/** Heuristik: .from(...).select/… ohne .error in Nähe — grob, Zähler für Trend */
function supabaseWithoutErrorHeuristic() {
  let hits = 0
  for (const t of texts.values()) {
    const parts = t.split(/\.from\s*\(/)
    for (let i = 1; i < parts.length; i++) {
      const chunk = parts[i].slice(0, 400)
      if (!/\berror\b/.test(chunk) && !/logDbError/.test(chunk)) hits++
>>>>>>> Stashed changes
    }
  }
  return hits
}

const metrics = {
  withCrmReadFallback_files: filesMatching(/withCrmReadFallback/),
  revalidatePath: countInSrc(/revalidatePath\s*\(/g),
  router_refresh: countInSrc(/router\.refresh\s*\(/g),
  force_dynamic: countInSrc(/force-dynamic/g),
  css_kb: cssKb(),
  supabase_no_error_heuristic: supabaseWithoutErrorHeuristic(),
  logDbError_calls: countInSrc(/logDbError\s*\(/g),
  silent_catch: countInSrc(/\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)|\.catch\s*\(\s*\(\s*\)\s*=>\s*(?:null|undefined|\[\])\s*\)/g),
  void_notify: countInSrc(/void\s+notify/gi),
<<<<<<< Updated upstream
  void_mail_notify_push: countVoidMailNotifyPush(),
  void_outside_allowlist: countVoidOutsideAllowlist(),
  handwerker_display: countHandwerkerDisplay(),
  status_update_outside_lib: countDirectStatusUpdatesOutsideLibStatus(),
  force_dynamic_off_allowlist: countForceDynamicOffAllowlist(),
  old_menus: countOldMenus(),
  sheet_footer_custom: countSheetFooterCustom(),
  footer_komponenten: countFooterKomponenten(),
  verb_uebernehmen: countVerbUebernehmen(),
  menue_varianten: countMenueVarianten(),
  raw_checkbox: countRawCheckbox(),
  raw_date: countRawDate(),
  segment_varianten: countSegmentVarianten(),
  role_tab_ausserhalb_MockTabs: countRoleTabOutsideMockTabs(),
  raw_table_off_allowlist: countRawTableOffAllowlist(),
  filter_varianten: countFilterVarianten(),
  card_class: countCardClass(),
  detail_rahmen: countDetailRahmen(),
  freie_leertexte: countFreieLeertexte(),
  toast_ohne_copy: countToastOhneCopy(),
  /** MockField mit error= Prop (Ziel >0). */
  mockfield_error_genutzt: (() => {
    let n = 0
    for (const t of texts.values()) {
      const m = t.match(/<MockField\b[^>]*\berror=/g)
      if (m) n += m.length
    }
    return n
  })(),
  /** Validierungs-Toasts (bitte_/grund_) — Ziel 0. */
  toast_validierung: (() => {
    let n = 0
    for (const t of texts.values()) {
      const m = t.match(/toast\.error\(\s*TOAST\.(bitte_[a-z0-9_]+|grund_[a-z0-9_]+)/g)
      if (m) n += m.length
    }
    return n
  })(),
  /** toast.error(….message) roh — Ziel 0. */
  raw_error_message_toast: (() => {
    let n = 0
    for (const t of texts.values()) {
      for (const line of t.split('\n')) {
        if (!line.includes('toast.error')) continue
        if (/\.message\b/.test(line) && !/systemError|userMessage|systemErrorMessage/.test(line)) {
          n++
        }
      }
    }
    return n
  })(),
  /**
   * confirmDisabled mit Feld-Leere (nicht nur pending/loading/disabled/canEdit/nameOk).
   * Ziel 0 — Speichern bleibt klickbar, Fehler am Feld.
   */
  confirm_disabled: (() => {
    let n = 0
    for (const [p, t] of texts) {
      const rel = relative(ROOT, p).replace(/\\/g, '/')
      if (/confirm-kunde-delete/.test(rel)) continue
      const re = /confirmDisabled=\{([^}]+)\}/g
      let m
      while ((m = re.exec(t))) {
        const expr = m[1].replace(/\s+/g, ' ').trim()
        if (/^pending$/.test(expr)) continue
        if (/^loading$/.test(expr)) continue
        if (/^pending \|\| loading$/.test(expr)) continue
        if (/^pending \|\| loading \|\| saving$/.test(expr)) continue
        if (/^disabled$/.test(expr)) continue
        if (/^disabled \|\| !canEdit$/.test(expr)) continue
        if (/pending|loading|saving|busy/.test(expr) && !/!\w|\.trim\(|canSave|!mail|!firma|!name/.test(expr)) {
          continue
        }
        if (/!\w|\.trim\(|canSave|!mail\b|!firma|!bezeichnung|!canSend|!canConfirm/.test(expr)) {
          n++
        }
      }
    }
    return n
  })(),
  /** 0 = Melde, Abnahme, Partner-Abschluss, Staff-Funnel haben Zwischenstand. */
  lange_formulare_ohne_zwischenstand: (() => {
    const portalRoot = process.env.PORTAL_ROOT || join(ROOT, '..', 'baerenwald')
    const checks = [
      {
        path: join(ROOT, 'src/components/anfragen/staff-funnel/StaffFunnelWizard.tsx'),
        marker: 'FORM_ZWISCHENSTAND: staff-funnel',
      },
      {
        path: join(ROOT, 'src/components/auftraege/AbnahmeprotokollCreateWizard.tsx'),
        marker: 'FORM_ZWISCHENSTAND: abnahme',
      },
      {
        path: join(portalRoot, 'src/components/funnel/use-portal-funnel-host.ts'),
        marker: 'FORM_ZWISCHENSTAND: melde-funnel',
      },
      {
        path: join(
          portalRoot,
          'src/components/partner/PartnerAbnahmeAbschlussSheet.tsx'
        ),
        marker: 'FORM_ZWISCHENSTAND: partner-abschluss',
      },
    ]
    let missing = 0
    for (const c of checks) {
      const t = readSafe(c.path)
      if (!t.includes(c.marker) || !t.includes('useFormZwischenstand')) missing++
    }
    return missing
  })(),
  /** 0 = EditorSheet hat Auto-Dirty (useAutoFormDirty). */
  sheets_ohne_dirtyschutz: (() => {
    const es = readSafe(join(ROOT, 'src/components/surfaces/EditorSheet.tsx'))
    return es.includes('useAutoFormDirty') ? 0 : 1
  })(),
  /** 0 = DocumentCanvas Close-Confirm bei dirty. */
  canvas_ohne_closeconfirm: (() => {
    const dc = readSafe(join(ROOT, 'src/components/surfaces/DocumentCanvas.tsx'))
    const ok =
      dc.includes('closeConfirmOpen') &&
      (dc.includes('useAutoFormDirty') || dc.includes('draftDirty'))
    return ok ? 0 : 1
  })(),
  touch_zu_klein: (() => {
    try {
      return JSON.parse(readSafe(join(ROOT, 'docs/mobile-audit/json/metrics.json')) || '{}').touch_zu_klein ?? null
    } catch { return null }
  })(),
  horizontal_scroll: (() => {
    try {
      return JSON.parse(readSafe(join(ROOT, 'docs/mobile-audit/json/metrics.json')) || '{}').horizontal_scroll ?? null
    } catch { return null }
  })(),
  animate_spin_outside_loading: countAnimateSpinOutsideLoading(),
  class_card_outside_mockcard: countClassCardOutsideMockCard(),
  locale_format_outside_helpers: countLocaleFormatOutsideHelpers(),
=======
>>>>>>> Stashed changes
  modal_import_files: filesMatching(/from ['"]@\/components\/ui\/Modal['"]/),
  mockmodal_import_files: filesMatching(/MockModal/),
  modal_tsx_exists: fileExists('src/components/ui/Modal.tsx'),
  mockmodal_tsx_exists: fileExists('src/components/mock-ui/MockModal.tsx'),
  button_import_files: filesMatching(/from ['"]@\/components\/ui\/Button['"]/),
  button_tsx_exists: fileExists('src/components/ui/Button.tsx'),
  field_alias_exists: fileExists('src/components/ui/Field.tsx'),
  input_tsx_exists: fileExists('src/components/ui/Input.tsx'),
  raw_button: countInSrc(/<button\b/g),
  raw_input: countInSrc(/<input\b/g),
  raw_select: countInSrc(/<select\b/g),
  raw_textarea: countInSrc(/<textarea\b/g),
<<<<<<< Updated upstream
  ...(() => {
    const r = countRawElementsOutsideAllowlist(SRC)
    return {
      raw_button_off_allowlist: r.button,
      raw_field_off_allowlist: r.input + r.select + r.textarea,
    }
  })(),
  status_badge_variants: filesMatching(/AngebotStatusBadge|AuftragStatusBadge|AngebotEinfachStatusBadge/),
  menu_variants: filesMatching(/ActionsMenu|ListbarActionsMenu|MockEntityRowMenu|MockPopoverMenu/),
  animate_spin: countInSrc(/animate-spin/g),
  class_card_token: countInSrc(
    /className=\{?[`'"](?:[^`'"]*\s)?card(?:\s[^`'"]*)?[`'"]/g
  ),
  toLocaleDateString: countInSrc(/toLocaleDateString/g),
  toLocaleString_de: countInSrc(/toLocaleString\(\s*['"]de/g),
  tw_std_colors: countInSrc(/\b(?:bg|text|border|ring)-(?:red|green|blue|gray|slate|zinc|amber|yellow|emerald|indigo|orange|rose|pink|purple|violet|cyan|sky|lime|teal|neutral|stone|fuchsia)-\d{2,3}\b/g),
  hex_in_class: countInSrc(/\[#[0-9a-fA-F]{3,8}\]/g),
  style_jsx: countInSrc(/style=\{\{/g),
  /* P5-19 Token-Konsolidierung */
  text_px: countInSrc(/text-\[\d+(?:\.\d+)?px\]/g),
  rounded_off_token: (() => {
    // Nur Tailwind-Klassen, nicht Variablen wie `const rounded = …`
    const RE = /(?<=["'`\s])rounded(?:-(?:sm|md|lg|xl|2xl|3xl|full))?(?=["'`\s])(?!\s*=)/g
    const ALLOW = new Set(['rounded-card', 'rounded-button', 'rounded-field', 'rounded-pill', 'rounded-sheet'])
    let n = 0
    for (const t of texts.values()) {
      let m
      RE.lastIndex = 0
      while ((m = RE.exec(t))) {
        if (!ALLOW.has(m[0])) n++
      }
    }
    return n
  })(),
  lucide_ausserhalb_icon: (() => {
    let n = 0
    for (const [p, t] of texts) {
      const rel = relative(ROOT, p).replace(/\\/g, '/')
      if (/\/MockIcon\.tsx$|\/mock-icons\.ts$|\/mock-icon-svgs/.test(rel)) continue
      if (/from\s+['"]lucide-react['"]/.test(t)) n++
    }
    return n
  })(),
  raw_svg: (() => {
    let n = 0
    for (const [p, t] of texts) {
      const rel = relative(ROOT, p).replace(/\\/g, '/')
      // MockIcon = SVG-Host; MockPrimitives Loading-Spinner; Charts (viewBox+rect/line)
      if (/\/mock-icon|\/MockIcon|\/MockPrimitives\.tsx$|\/templates\/|\/pdf\/|mail-templates|email-templates/.test(rel)) continue
      if (!/<svg[\s>]/.test(t)) continue
      if (
        /viewBox=/.test(t) &&
        /<(?:rect|line|polyline|path)\b/.test(t) &&
        /aria-label="[^"]*(?:[Dd]iagramm|[Cc]hart|[Vv]erlauf)/.test(t)
      ) {
        continue
      }
      n++
    }
    return n
  })(),
  hex_code: (() => {
    const HEX = /(?<!&)#[0-9a-fA-F]{3,8}\b/g
    let n = 0
    for (const [p, t] of texts) {
      const rel = relative(ROOT, p).replace(/\\/g, '/')
      if (/globals\.css$|mock-design-system\.css$|\/tokens|\/templates\/|\/pdf\//.test(rel)) continue
      // var(--token, #fallback) zählt nicht — Fallback an Token
      const stripped = t
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1')
        .replace(/var\s*\(\s*--[^,)]+,\s*#[0-9a-fA-F]{3,8}\s*\)/g, 'var(--tok)')
      const m = stripped.match(HEX)
      if (m) n += m.length
    }
    for (const p of walk(join(ROOT, 'src')).filter((f) => /\.css$/.test(f))) {
      const rel = relative(ROOT, p).replace(/\\/g, '/')
      if (/globals\.css$|mock-design-system\.css$/.test(rel)) continue
      const t = readSafe(p).replace(/var\s*\(\s*--[^,)]+,\s*#[0-9a-fA-F]{3,8}\s*\)/g, 'var(--tok)')
      for (const line of t.split('\n')) {
        if (/^\s*--[\w-]+:/.test(line)) continue
        const m = line.match(HEX)
        if (m) n += m.length
      }
    }
    return n
  })(),
  inline_static: (() => {
    let n = 0
    for (const t of texts.values()) {
      const re = /style=\{\{([\s\S]*?)\}\}/g
      let m
      while ((m = re.exec(t))) {
        const body = m[1]
        if (/var\s*\(/.test(body)) continue
        if (/#[0-9a-fA-F]{3,8}|\b\d+px\b|rgb\s*\(|hsl\s*\(/.test(body)) n++
      }
    }
    return n
  })(),
  important: (() => {
    let n = 0
    for (const p of walk(join(ROOT, 'src')).filter((f) => /\.css$/.test(f))) {
      const t = readSafe(p)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1')
      const m = t.match(/!important/g)
      if (m) n += m.length
    }
    return n
  })(),
=======
  status_badge_variants: filesMatching(/AngebotStatusBadge|AuftragStatusBadge|AngebotEinfachStatusBadge/),
  menu_variants: filesMatching(/ActionsMenu|ListbarActionsMenu|MockEntityRowMenu|MockPopoverMenu/),
  animate_spin: countInSrc(/animate-spin/g),
  class_card_token: countInSrc(/className=\{?[`'"][^`'"]*\bcard\b/g),
  toLocaleDateString: countInSrc(/toLocaleDateString/g),
  toLocaleString_de: countInSrc(/toLocaleString\(\s*['"]de/g),
  tw_std_colors: countInSrc(/\b(?:bg|text|border)-(?:red|green|blue|gray|slate|zinc|amber|yellow|emerald|indigo)-\d{2,3}\b/g),
  hex_in_class: countInSrc(/\[#[0-9a-fA-F]{3,8}\]/g),
  style_jsx: countInSrc(/style=\{\{/g),
>>>>>>> Stashed changes
  copy_imports: filesMatching(/from ['"]@\/lib\/copy/),
  snake_in_ui_heuristic: countInSrc(/>[a-z]+_[a-z_]+</g),
  files_over_1000: filesOverLines(1000),
  eslint: hasEslint(),
  ci: hasCi(),
  sentry_pkg: pkgHas('@sentry/nextjs'),
  gitignore: fileExists('.gitignore'),
  audit_status: fileExists('scripts/audit-status.mjs'),
  pattern_katalog: fileExists('docs/PATTERN-KATALOG.md'),
  confirm_popup: fileExists('src/components/ui/ConfirmPopup.tsx'),
<<<<<<< Updated upstream
  confirm_delete_action_calls: countInSrc(/\bconfirmDelete\b|\bconfirmAction\b/g),
  confirm_helpers_exist:
    fileExists('src/components/ui/confirm-delete.tsx') ||
    fileExists('src/components/ui/confirm-action.tsx'),
  ignore_during_builds_false: (() => {
    const cfg = readSafe(join(ROOT, 'next.config.mjs')) || readSafe(join(ROOT, 'next.config.js'))
    if (!/ignoreDuringBuilds\s*:/.test(cfg)) return false
    return /ignoreDuringBuilds\s*:\s*false/.test(cfg)
  })(),
  shared_domain_byte_ok: (() => {
    try {
      const r = spawnSync(process.execPath, ['scripts/sync-shared-domain.mjs', '--check'], {
        cwd: ROOT,
        encoding: 'utf8',
      })
      return r.status === 0
    } catch {
      return false
    }
  })(),
  /** 0 = Portal-Resolver = sync'te CRM-Quelle (nach Import-Rewrite). */
  resolver_diff_lines: (() => {
    try {
      const portalFile = join(
        process.env.PORTAL_ROOT || join(ROOT, '..', 'baerenwald'),
        'src/lib/crm-vorgang/resolve-vorgang.ts'
      )
      const crmFile = join(ROOT, 'src/lib/vorgang/resolve-vorgang.ts')
      if (!existsSync(portalFile) || !existsSync(crmFile)) return -1
      const header = '// SYNCED FROM CRM — do not edit\n'
      let body = readFileSync(crmFile, 'utf8').replace(/^\/\/ SYNCED FROM CRM — do not edit\n/, '')
      body = body
        .replaceAll('@/lib/anfragen/anfrage-akut-schwelle', '@/lib/crm-vorgang/anfrage-akut-schwelle')
        .replaceAll('@/lib/org/hv-lead-helpers', '@/lib/crm-vorgang/hv-lead-helpers')
        .replaceAll('@/lib/vorgang/', '@/lib/crm-vorgang/')
      const expected = header + body
      const actual = readFileSync(portalFile, 'utf8')
      if (actual === expected) return 0
      // grobe Diff-Zeilen
      const a = actual.split('\n')
      const b = expected.split('\n')
      let d = Math.abs(a.length - b.length)
      const n = Math.min(a.length, b.length)
      for (let i = 0; i < n; i++) if (a[i] !== b[i]) d++
      return d || 1
    } catch {
      return -1
    }
  })(),
=======
>>>>>>> Stashed changes
  mockbtn: filesMatching(/MockBtn/),
  mockfield: filesMatching(/MockField/),
  editorsheet: filesMatching(/EditorSheet/),
  verlauf_panel: filesMatching(/VerlaufPanel/),
  status_vokabular: fileExists('src/lib/status/status-vokabular.ts') || fileExists('src/lib/vorgang/status-vokabular.ts'),
  sync_shared: fileExists('scripts/sync-shared-domain.mjs'),
  demo_banner_settings: filesMatching(/Transaktionsdaten leeren/),
}

/**
 * Ziele: done nur wenn check() true.
 * Belal-Baseline (Ausgang): P0-1…5, P1-6, P1-7, P5-1, P5-10 als erledigt markiert,
 * wenn Strukturchecks passen — sonst offen.
 */
const todos = [
  {
    id: 'P0-1',
    title: 'Mail-Catch / Staging-Guards',
    baseline: true,
    check: () => fileExists('docs/STAGING.md') || fileExists('.env.example'),
  },
  {
    id: 'P0-2',
    title: 'Ungenutzte Komponenten gelöscht (Baseline)',
    baseline: true,
    check: () => true,
  },
  {
    id: 'P0-3',
    title: 'Parität / Shared-Baseline',
    baseline: true,
    check: () => fileExists('docs/AUDIT-PARITAET.md'),
  },
  {
    id: 'P0-4',
    title: 'Guards / kritische Dateien',
    baseline: true,
    check: () => fileExists('scripts/check-critical-files.mjs'),
  },
  {
    id: 'P0-5',
    title: '.env.example / Secrets-Doku',
    baseline: true,
    check: () => fileExists('.env.example'),
  },
  {
    id: 'P0-6',
    title: 'Branch-Schutz (Belal M3)',
    check: () => false,
    target: 'Belal: GitHub Branch-Schutz staging→main',
  },
  {
    id: 'P1-1',
    title: 'Perf-Baseline Staging',
    check: () => fileExists('docs/perf-baseline.md'),
    target: 'docs/perf-baseline.md mit Messwerten',
  },
  {
    id: 'P1-2',
    title: 'Netlify-Region = Prod-Supabase (Belal M1)',
    check: () => false,
    target: 'Belal: Region eu-west-1 (Prod)',
  },
  {
    id: 'P1-3',
    title: 'Sentry-Code (@sentry/nextjs, ohne DSN inaktiv)',
    check: () => metrics.sentry_pkg,
    target: '@sentry/nextjs installiert + Instrumentation',
  },
  {
    id: 'P1-4',
    title: 'Next 15 (Belal M6)',
    check: () => {
      const pkg = JSON.parse(readSafe(join(ROOT, 'package.json')) || '{}')
      const v = String(pkg.dependencies?.next || '')
      return /^"?15\./.test(v) || v.startsWith('15')
    },
    target: 'next@15 (Belal-Abnahme)',
  },
  {
    id: 'P1-5',
    title: 'Service-Role Gates',
    check: () => fileExists('scripts/check-service-role-gate.mjs'),
    target: 'scripts/check-service-role-gate.mjs + 0 Verstöße',
  },
  {
    id: 'P1-6',
    title: 'Import-/Critical-Guards',
    baseline: true,
    check: () => fileExists('scripts/check-import-paths.mjs'),
  },
  {
    id: 'P1-7',
    title: 'Mock-Primitives-Guard',
    baseline: true,
    check: () => fileExists('scripts/check-mock-primitives.mjs'),
  },
  {
    id: 'P2-1',
    title: 'Resolver-Abgleich dokumentiert',
    check: () => fileExists('docs/P2-1-resolver-abgleich.md'),
    target: 'Abweichungstabelle ohne Logik-Änderung',
  },
  {
    id: 'P2-2',
    title: 'status-vokabular vollständig',
    check: () => metrics.status_vokabular,
    target: 'src/lib/.../status-vokabular.ts',
  },
  {
    id: 'P2-3',
    title: 'Shared-Domain-Weg = E4 Hybrid',
    check: () => {
      const d = readSafe(join(ROOT, 'docs/P2-3-shared-domain.md'))
      return /E4|Hybrid/i.test(d) && /Belal/i.test(d)
    },
    target: 'docs/P2-3-shared-domain.md = E4 freigegeben',
  },
  {
    id: 'P2-4',
<<<<<<< Updated upstream
    title: 'Sync-Skript + Byte-Parität + Resolver',
    check: () =>
      metrics.sync_shared &&
      metrics.shared_domain_byte_ok &&
      metrics.resolver_diff_lines === 0,
    target: `sync --check OK + resolver_diff=0 (ist ${metrics.resolver_diff_lines})`,
=======
    title: 'Sync-Skript + Byte-Parität',
    check: () => metrics.sync_shared,
    target: 'scripts/sync-shared-domain.mjs',
>>>>>>> Stashed changes
  },
  {
    id: 'P2-5',
    title: 'Status-Writes nur write-*',
<<<<<<< Updated upstream
    check: () =>
      filesMatching(/write-lead-status|writeLeadStatus|writeAuftragStatus|lib\/status\/write/) > 0 &&
      fileExists('scripts/check-status-writes.mjs') &&
      metrics.status_update_outside_lib === 0,
    target: `direkte .update({ status }) außerhalb lib/status=0 (ist ${metrics.status_update_outside_lib})`,
=======
    check: () => filesMatching(/write-lead-status|writeLeadStatus|writeAuftragStatus|lib\/status\/write/) > 0,
    target: 'write-*-Helfer + Guard 0 direkte Updates',
>>>>>>> Stashed changes
  },
  {
    id: 'P2-6',
    title: 'Vertrags-Tests Status',
<<<<<<< Updated upstream
    check: () =>
      fileExists('scripts/test-status-contracts.ts') &&
      fileExists('src/lib/status/write-lead-status.ts') &&
      fileExists('src/lib/status/write-angebot-status.ts') &&
      fileExists('src/lib/status/write-auftrag-status.ts') &&
      fileExists('src/lib/status/write-rechnung-status.ts'),
=======
    check: () => false,
>>>>>>> Stashed changes
    target: 'Tests HV-Freigabe/Partner/Abnahme/RE/Storno',
  },
  {
    id: 'P2-7',
    title: 'Mail/Notify Sync oder markiert',
    check: () => fileExists('docs/P2-7-mail-notify.md'),
    target: 'Inventur + Sync oder app-spezifisch',
  },
  {
    id: 'P2-8',
    title: 'Lib-Kopien abgearbeitet',
<<<<<<< Updated upstream
    check: () => {
      const d = readSafe(join(ROOT, 'docs/P2-8-lib-kopien.md'))
      if (!d) return false
      // Offene DRIFT-Zeilen in der Inventur-Tabelle (Status-Spalte = DRIFT)
      const openDrift = (d.match(/\|\s*DRIFT\s*\|/gi) || []).length
      return /P2-8/i.test(d) && openDrift === 0
    },
=======
    check: () => false,
>>>>>>> Stashed changes
    target: '0 offene DRIFT in P2-8-Liste',
  },
  {
    id: 'P3-1',
    title: 'Index-Migration (Staging-Datei)',
<<<<<<< Updated upstream
    check: () =>
      existsSync(join(ROOT, 'supabase/migrations')) &&
      readdirSync(join(ROOT, 'supabase/migrations')).some((f) =>
        /common_list_indexes|list_indexes/i.test(f)
      ),
=======
    check: () => false,
>>>>>>> Stashed changes
    target: 'Gezielte Index-Migration nachgewiesen + Staging angewandt (Prod=Belal M5)',
  },
  {
    id: 'P3-2',
    title: 'RLS-Rekursion weg + withCrmReadFallback=0',
    check: () => metrics.withCrmReadFallback_files === 0,
    target: `withCrmReadFallback_files=0 (ist ${metrics.withCrmReadFallback_files})`,
  },
  {
    id: 'P3-3',
    title: 'Vorgangsliste RPC + echte Paginierung',
<<<<<<< Updated upstream
    check: () => {
      const src = readSafe(join(ROOT, 'src/lib/vorgang/load-vorgaenge-liste.ts'))
      const page = readSafe(join(ROOT, 'src/app/(dashboard)/vorgaenge/page.tsx'))
      const hasRpc = /crm_vorgaenge_lead_page/.test(src)
      const noHard200 =
        !/leadLimit\s*=\s*scoped\s*\?\s*80\s*:\s*200/.test(src) && !/\.limit\(\s*leadLimit\s*\)/.test(src)
      const hasPageParam = /seite|pageSize|fetchAllPages/.test(src) && /seite/.test(page)
      return hasRpc && noHard200 && hasPageParam
    },
=======
    check: () => false,
>>>>>>> Stashed changes
    target: 'crm_vorgaenge_lead_page ohne Hard-Limit 200',
  },
  {
    id: 'P3-4',
    title: 'revalidatePath gezielt / refresh-Duplikate weg',
<<<<<<< Updated upstream
    check: () => metrics.revalidatePath < 250 && metrics.router_refresh < 30,
    target: `revalidatePath<250 · router.refresh<30 (ist ${metrics.revalidatePath}/${metrics.router_refresh})`,
=======
    check: () => false,
    target: 'nur betroffene Pfade; doppeltes router.refresh=0',
>>>>>>> Stashed changes
  },
  {
    id: 'P3-5',
    title: 'force-dynamic / unstable_cache Stammdaten',
<<<<<<< Updated upstream
    check: () => {
      const hasDoc =
        fileExists('docs/P3-5-force-dynamic.md') ||
        fileExists('docs/P3-5-force-dynamic-inventur.md')
      return hasDoc && metrics.force_dynamic_off_allowlist === 0
    },
    target: `force-dynamic nur Allowlist-Doc (off=${metrics.force_dynamic_off_allowlist})`,
=======
    check: () => false,
    target: 'Inventur + Cache für Stammdaten',
>>>>>>> Stashed changes
  },
  {
    id: 'P3-6',
    title: 'CSS < 150 KB',
    check: () => metrics.css_kb > 0 && metrics.css_kb < 150,
    target: `css_kb<150 (ist ${metrics.css_kb})`,
  },
  {
    id: 'P3-7',
    title: 'CRM-Sheets Skeleton',
<<<<<<< Updated upstream
    check: () => {
      const sheet = readSafe(join(ROOT, 'src/components/auftraege/AuftragAbschliessenSheet.tsx'))
      return /SkeletonCard|SkeletonList|SkeletonRow/.test(sheet) && !/Wird geladen…/.test(sheet)
    },
=======
    check: () => false,
>>>>>>> Stashed changes
    target: 'Skeleton statt Ladetext in Sheets',
  },
  {
    id: 'P4-1',
    title: 'logDbError an allen Reads',
<<<<<<< Updated upstream
    check: () =>
      metrics.logDbError_calls > 500 && metrics.supabase_no_error_heuristic < 50,
    target: `logDbError flächig (calls=${metrics.logDbError_calls}, no_error≈${metrics.supabase_no_error_heuristic}; Ziel <50 nach Heuristik-Fix bewusst-ignoriert)`,
=======
    check: () => metrics.logDbError_calls > 50 && metrics.supabase_no_error_heuristic < 50,
    target: `logDbError flächig (calls=${metrics.logDbError_calls}, no_error≈${metrics.supabase_no_error_heuristic})`,
>>>>>>> Stashed changes
  },
  {
    id: 'P4-2',
    title: 'Stille catches geloggt',
    check: () => metrics.silent_catch === 0,
    target: `silent_catch=0 (ist ${metrics.silent_catch})`,
  },
  {
    id: 'P4-3',
    title: 'Mail/Notify → email_log Ergebnis',
<<<<<<< Updated upstream
    check: () => {
      if (metrics.void_mail_notify_push !== 0) return false
      if (metrics.void_outside_allowlist !== 0) return false
      if (!fileExists('scripts/void-call-allowlist.txt')) return false
      if (!fileExists('scripts/check-void-calls.mjs')) return false
      if (!fileExists('src/lib/errors/safe-void-notify.ts')) return false
      const mail = readSafe(join(ROOT, 'src/lib/mail-service.ts'))
      const notifyLog = readSafe(join(ROOT, 'src/lib/kommunikation/log-notify-email-result.ts'))
      const unified = readSafe(join(ROOT, 'src/lib/partner/notify-partner-unified.ts'))
      const push = readSafe(join(ROOT, 'src/lib/push/send.ts'))
      const mailOk =
        /status:\s*['"]fehler['"]/.test(mail) && /insertEmailLogRow/.test(mail) && /status:\s*['"]gesendet['"]/.test(mail)
      const notifyOk =
        /logNotifyEmailResult/.test(notifyLog) &&
        /'gesendet'/.test(notifyLog) &&
        /'fehler'/.test(notifyLog) &&
        /logNotifyEmailResult/.test(unified)
      const pushOk = /logNotifyEmailResult/.test(push) && /crm_push/.test(push)
      return mailOk && notifyOk && pushOk && filesMatching(/insertEmailLogRow/) >= 2
    },
    target: `void Mail/Notify/Push=0 · void außerhalb Allowlist=0 (ist ${metrics.void_mail_notify_push}/${metrics.void_outside_allowlist}) + email_log gesendet|fehler`,
=======
    check: () => metrics.void_notify === 0 && filesMatching(/safeVoidNotify|insertEmailLogRow/).length >= 2,
    target: `void_notify=0 + email_log bei Mail-Ergebnis (void=${metrics.void_notify})`,
>>>>>>> Stashed changes
  },
  {
    id: 'P4-4',
    title: 'Error-Boundaries flächig',
<<<<<<< Updated upstream
    check: () => {
      const errs = walk(join(ROOT, 'src/app')).filter((p) => /\/error\.tsx$/.test(p.replace(/\\/g, '/')))
      return errs.length >= 3 || filesMatching(/ErrorBoundary/).length >= 3
    },
=======
    check: () => filesMatching(/error\.tsx|ErrorBoundary/).length >= 3,
>>>>>>> Stashed changes
    target: 'error.tsx / Boundaries an Kernrouten',
  },
  {
    id: 'P4-5',
    title: 'Vorgangsliste Limit-Hinweis',
    check: () => countInSrc(/von .* Vorgängen angezeigt|angezeigt.*von/i) > 0,
    target: 'Hinweis „X von Y Vorgängen angezeigt“',
  },
  {
    id: 'P4-6',
    title: 'Geld ??0 / null-sicher',
    check: () => false,
    target: 'null-sichere Beträge in UI',
  },
  {
    id: 'P5-1',
    title: 'Pattern-Katalog Entscheidungen',
    baseline: true,
    check: () => metrics.pattern_katalog || fileExists('docs/SURFACE-KONSOLIDIERUNG.md'),
  },
  {
    id: 'P5-2',
    title: 'Confirm nur ConfirmPopup (E1)',
<<<<<<< Updated upstream
    check: () =>
      metrics.confirm_popup &&
      !metrics.confirm_helpers_exist &&
      metrics.confirm_delete_action_calls === 0 &&
      countInSrc(/window\.confirm/g) === 0,
    target: `confirmDelete/confirmAction=0, Helfer weg (ist calls=${metrics.confirm_delete_action_calls})`,
=======
    check: () => metrics.confirm_popup && countInSrc(/window\.confirm/g) === 0 && filesMatching(/ConfirmPopup/) >= 5,
    target: 'confirmDelete/Action → ConfirmPopup; kein window.confirm',
>>>>>>> Stashed changes
  },
  {
    id: 'P5-3',
    title: 'Overlays nur EditorSheet; Modal/MockModal gelöscht',
    check: () =>
      !metrics.modal_tsx_exists &&
      !metrics.mockmodal_tsx_exists &&
      metrics.modal_import_files === 0 &&
      metrics.mockmodal_import_files === 0,
    target: `Modal/MockModal Dateien=0 Imports=0 (modal_files=${metrics.modal_import_files}, mock=${metrics.mockmodal_import_files})`,
  },
  {
    id: 'P5-4',
    title: 'Buttons nur MockBtn; Button.tsx weg (E2)',
<<<<<<< Updated upstream
    check: () =>
      !metrics.button_tsx_exists &&
      metrics.button_import_files === 0 &&
      metrics.raw_button_off_allowlist === 0,
    target: `Button.tsx weg; Imports=0; raw_button außerhalb Allowlist=0 (ist ${metrics.raw_button_off_allowlist}; total=${metrics.raw_button})`,
=======
    check: () => !metrics.button_tsx_exists && metrics.button_import_files === 0,
    target: `Button.tsx gelöscht; ui/Button-Imports=0 (ist ${metrics.button_import_files}; raw_button=${metrics.raw_button})`,
>>>>>>> Stashed changes
  },
  {
    id: 'P5-5',
    title: 'Felder nur MockField (E3)',
<<<<<<< Updated upstream
    check: () =>
      !metrics.field_alias_exists &&
      !metrics.input_tsx_exists &&
      metrics.raw_field_off_allowlist === 0,
    target: `Field-Alias weg; raw input/select/textarea außerhalb Allowlist=0 (ist ${metrics.raw_field_off_allowlist})`,
=======
    check: () => !metrics.field_alias_exists && !metrics.input_tsx_exists,
    target: 'Field-Alias + Input/Textarea/Select-Label-Komponenten entfernt',
>>>>>>> Stashed changes
  },
  {
    id: 'P5-6',
    title: 'Nur StatusBadge',
    check: () => metrics.status_badge_variants === 0,
    target: `Sonderbadges=0 (ist ${metrics.status_badge_variants})`,
  },
  {
    id: 'P5-7',
    title: 'Nur MockEntityRowMenu',
<<<<<<< Updated upstream
    check: () => filesMatching(/MockEntityRowMenu/) > 0 && metrics.old_menus === 0,
    target: `alte Menüs=0 (ist ${metrics.old_menus})`,
  },
  {
    id: 'P5-16',
    title: 'Aktionen: EditorSheet-Footer + Verben + Menüs',
    check: () =>
      metrics.sheet_footer_custom === 0 &&
      metrics.footer_komponenten === 0 &&
      metrics.verb_uebernehmen === 0 &&
      metrics.menue_varianten === 0,
    target: `sheet_footer_custom=0 footer_komponenten=0 verb_uebernehmen=0 menue_varianten=0 (ist ${metrics.sheet_footer_custom}/${metrics.footer_komponenten}/${metrics.verb_uebernehmen}/${metrics.menue_varianten})`,
  },
  {
    id: 'P5-17',
    title: 'Checkbox/Date/Segment/Tabs kanonisch',
    check: () =>
      metrics.raw_checkbox === 0 &&
      metrics.raw_date === 0 &&
      metrics.segment_varianten === 1 &&
      metrics.role_tab_ausserhalb_MockTabs === 0,
    target: `raw_checkbox=0 raw_date=0 segment_varianten=1 role_tab_ausserhalb_MockTabs=0 (ist ${metrics.raw_checkbox}/${metrics.raw_date}/${metrics.segment_varianten}/${metrics.role_tab_ausserhalb_MockTabs})`,
  },
  {
    id: 'P5-18',
    title: 'Listen/Table/Filter/Card/Detail/Empty',
    check: () =>
      metrics.raw_table_off_allowlist === 0 &&
      metrics.filter_varianten === 0 &&
      metrics.card_class === 0 &&
      metrics.detail_rahmen === 1 &&
      metrics.freie_leertexte === 0,
    target: `raw_table_off_allowlist=0 filter_varianten=0 card_class=0 detail_rahmen=1 freie_leertexte=0 (ist ${metrics.raw_table_off_allowlist}/${metrics.filter_varianten}/${metrics.card_class}/${metrics.detail_rahmen}/${metrics.freie_leertexte})`,
=======
    check: () => filesMatching(/MockEntityRowMenu/).length > 0 && filesMatching(/ActionsMenu/).length === 0,
    target: 'ActionsMenu/Listbar → MockEntityRowMenu oder begründet intern',
>>>>>>> Stashed changes
  },
  {
    id: 'P5-8',
    title: 'Laden/Leer Crm* + MockEmpty; EmptyState weg',
<<<<<<< Updated upstream
    check: () =>
      !fileExists('src/components/ui/EmptyState.tsx') &&
      !fileExists('src/components/layout/EmptyState.tsx') &&
      metrics.animate_spin_outside_loading === 0,
    target: `animate-spin außerhalb Lade-Komponente=0 (ist ${metrics.animate_spin_outside_loading})`,
=======
    check: () => !fileExists('src/components/ui/EmptyState.tsx') && !fileExists('src/components/layout/EmptyState.tsx'),
    target: 'EmptyState gelöscht',
>>>>>>> Stashed changes
  },
  {
    id: 'P5-9',
    title: 'Klasse card → MockCard',
<<<<<<< Updated upstream
    check: () => metrics.class_card_outside_mockcard === 0,
    target: `class card außerhalb MockCard=0 (ist ${metrics.class_card_outside_mockcard})`,
=======
    check: () => metrics.class_card_token < 5,
    target: `class card ≈0 (ist ${metrics.class_card_token})`,
>>>>>>> Stashed changes
  },
  {
    id: 'P5-10',
    title: 'Detail-Layout-Standard (Baseline)',
    baseline: true,
<<<<<<< Updated upstream
    check: () =>
      fileExists('src/components/layout/EntityDetailLayout.tsx') ||
      fileExists('src/components/mock-ui/MockDetailShell.tsx'),
=======
    check: () => fileExists('src/components/mock-ui/DetailShell.tsx') || fileExists('src/components/mock-ui/MockDetailShell.tsx'),
>>>>>>> Stashed changes
  },
  {
    id: 'P5-11',
    title: 'Timeline nur VerlaufPanel',
    check: () => metrics.verlauf_panel > 0 && !fileExists('src/components/ui/timeline.tsx'),
    target: 'VerlaufPanel kanonisch; Legacy-timeline weg',
  },
  {
    id: 'P5-12',
    title: 'Datum/Geld eine Format-API',
<<<<<<< Updated upstream
    check: () =>
      metrics.toLocaleDateString === 0 && metrics.locale_format_outside_helpers === 0,
    target: `toLocaleString('de)/Intl.NumberFormat außerhalb Format=0 (ist ${metrics.locale_format_outside_helpers}); toLocaleDateString=0`,
=======
    check: () => metrics.toLocaleDateString === 0,
    target: `toLocaleDateString=0 (ist ${metrics.toLocaleDateString}); Euro 2 NK`,
>>>>>>> Stashed changes
  },
  {
    id: 'P5-13',
    title: 'Farben nur Tokens',
    check: () => metrics.tw_std_colors === 0 && metrics.hex_in_class === 0,
    target: `tw_std=0 hex_class=0 (ist ${metrics.tw_std_colors}/${metrics.hex_in_class})`,
  },
  {
<<<<<<< Updated upstream
    id: 'P5-19',
    title: 'Schriftskala/Rundung/Icons/Farben Token-Konsolidierung',
    check: () =>
      metrics.text_px === 0 &&
      metrics.rounded_off_token === 0 &&
      metrics.lucide_ausserhalb_icon === 0 &&
      metrics.raw_svg === 0 &&
      metrics.hex_code === 0 &&
      metrics.inline_static === 0 &&
      metrics.important <= 20,
    target: `text_px=0 rounded_off=0 lucide=0 raw_svg=0 hex_code=0 inline_static=0 important≤20 (ist ${metrics.text_px}/${metrics.rounded_off_token}/${metrics.lucide_ausserhalb_icon}/${metrics.raw_svg}/${metrics.hex_code}/${metrics.inline_static}/${metrics.important})`,
  },
  {
    id: 'P5-14',
    title: 'Copy-Quelle lib/copy (E5/E6)',
    check: () =>
      metrics.copy_imports > 0 &&
      fileExists('src/lib/copy') &&
      metrics.handwerker_display === 0,
    target: `Handwerker in Anzeigetexten=0 außer „Fachfirma beauftragen“ (ist ${metrics.handwerker_display})`,
  },
  {
    id: 'P5-20',
    title: 'Copy-Regeln: Leertexte + Toasts',
    check: () =>
      metrics.freie_leertexte === 0 &&
      metrics.toast_ohne_copy === 0 &&
      fileExists('docs/COPY-REGELN.md') &&
      fileExists('src/lib/copy/toast.ts') &&
      fileExists('src/lib/copy/errors.ts'),
    target: `freie_leertexte=0 toast_ohne_copy=0 (ist ${metrics.freie_leertexte}/${metrics.toast_ohne_copy})`,
  },
  {
    id: 'P5-21',
    title: 'Dirty-Schutz Sheets + DocumentCanvas',
    check: () =>
      metrics.sheets_ohne_dirtyschutz === 0 &&
      metrics.canvas_ohne_closeconfirm === 0 &&
      fileExists('src/lib/surfaces/form-dirty.ts'),
    target: `sheets_ohne_dirtyschutz=0 canvas_ohne_closeconfirm=0 (ist ${metrics.sheets_ohne_dirtyschutz}/${metrics.canvas_ohne_closeconfirm})`,
  },
  {
    id: 'P5-22',
    title: 'Zwischenstand lange Formulare',
    check: () =>
      metrics.lange_formulare_ohne_zwischenstand === 0 &&
      fileExists('src/lib/surfaces/form-zwischenstand.ts'),
    target: `lange_formulare_ohne_zwischenstand=0 (Melde/Abnahme/Partner/Staff; ist ${metrics.lange_formulare_ohne_zwischenstand})`,
  },
  {
    id: 'P5-23',
    title: 'Feldvalidierung MockField + System-Toasts',
    check: () =>
      metrics.mockfield_error_genutzt > 0 &&
      metrics.toast_validierung === 0 &&
      metrics.raw_error_message_toast === 0 &&
      metrics.confirm_disabled === 0 &&
      fileExists('src/lib/validation/form-schema.ts'),
    target: `mockfield_error>0 toast_validierung=0 raw_error_message_toast=0 confirm_disabled=0 (ist ${metrics.mockfield_error_genutzt}/${metrics.toast_validierung}/${metrics.raw_error_message_toast}/${metrics.confirm_disabled})`,
  },
  {
    id: 'P7-MOBILE',
    title: 'Mobile 375px Touch/H-Scroll (Playwright)',
    check: () => {
      const m = JSON.parse(readSafe(join(ROOT, 'docs/mobile-audit/json/metrics.json')) || '{}')
      return m.touch_zu_klein === 0 && m.horizontal_scroll === 0
    },
    target: (() => {
      const m = JSON.parse(readSafe(join(ROOT, 'docs/mobile-audit/json/metrics.json')) || '{}')
      const hasBefund = fileExists('docs/mobile-audit/BEFUNDLISTE.md')
      return `touch_zu_klein=0 horizontal_scroll=0 (ist ${m.touch_zu_klein ?? '?'}/${m.horizontal_scroll ?? '?'})${hasBefund ? ' · Phase-A-Befund ok' : ''} · npm run audit:mobile`
    })(),
=======
    id: 'P5-14',
    title: 'Copy-Quelle lib/copy (E5/E6)',
    check: () => metrics.copy_imports > 0 && fileExists('src/lib/copy'),
    target: 'copy-Importe >0; keine snake_case-Anzeige',
>>>>>>> Stashed changes
  },
  {
    id: 'P5-15',
    title: 'Screen-Contracts',
<<<<<<< Updated upstream
    check: () => fileExists('docs/SCREEN-CONTRACTS.md'),
=======
    check: () => false,
>>>>>>> Stashed changes
    target: 'Screen-Contracts dokumentiert+eingehalten',
  },
  {
    id: 'P5-E8a',
    title: 'Demo-Banner nur Einstellungen',
<<<<<<< Updated upstream
    check: () => {
      const shell = readSafe(join(ROOT, 'src/components/layout/DashboardShell.tsx'))
      const settings = readSafe(
        join(ROOT, 'src/components/einstellungen/EinstellungenLayoutClient.tsx')
      )
      return (
        !/DemoModeBanner/.test(shell) &&
        /DemoModeBanner/.test(settings) &&
        metrics.demo_banner_settings === 1
      )
    },
=======
    check: () => false,
>>>>>>> Stashed changes
    target: 'Banner „Transaktionsdaten leeren“ nur Einstellungen',
  },
  {
    id: 'P7-4',
    title: 'Generated types Staging',
    check: () => fileExists('src/lib/database.types.ts') || fileExists('src/types/supabase.ts'),
    target: 'supabase gen types (Staging)',
  },
  {
    id: 'P7-5',
    title: 'ESLint ignoreDuringBuilds false',
<<<<<<< Updated upstream
    check: () => metrics.eslint && metrics.ignore_during_builds_false,
    target: 'ESLint aktiv + ignoreDuringBuilds: false',
=======
    check: () => metrics.eslint,
    target: 'ESLint aktiv',
>>>>>>> Stashed changes
  },
  {
    id: 'P7-6',
    title: 'CI auf staging',
    check: () => metrics.ci,
    target: '.github/workflows Build+Guards+audit-status',
  },
  {
    id: 'P7-7',
    title: 'Security-/Kernjourney-Tests',
<<<<<<< Updated upstream
    check: () => p77SecurityJourneysOk(),
=======
    check: () => false,
>>>>>>> Stashed changes
    target: 'tc-08 + Kernjourneys ohne Skip-Ketten',
  },
  {
    id: 'P7-9',
    title: 'knip + remove-deploy-blockers obsolet',
    check: () => !fileExists('scripts/remove-deploy-blockers.mjs'),
    target: 'remove-deploy-blockers.mjs entfernt',
  },
  {
    id: 'P7-10',
    title: 'Dateien >1000 Zeilen teilen',
    check: () => metrics.files_over_1000 < 5,
    target: `files>1000 <5 (ist ${metrics.files_over_1000})`,
  },
  {
    id: 'P7-11',
    title: 'Doku archiviert',
    check: () => existsSync(join(ROOT, 'docs/archiv')),
    target: 'docs/archiv + Leitdokumente',
  },
  {
    id: 'P7-1',
    title: 'Baseline-Migration vorbereitet',
<<<<<<< Updated upstream
    check: () => fileExists('docs/BASELINE-MIGRATION.md'),
=======
    check: () => false,
>>>>>>> Stashed changes
    target: 'Datei+Anleitung, nicht anwenden',
  },
  {
    id: 'META-gitignore',
    title: '.gitignore vorhanden',
    check: () => metrics.gitignore,
    target: '.gitignore Root',
  },
  {
    id: 'META-audit-status',
    title: 'audit-status.mjs',
    check: () => metrics.audit_status,
    target: 'scripts/audit-status.mjs',
  },
]

function statusOf(todo) {
  let ok = false
  try {
    ok = !!todo.check()
  } catch {
    ok = false
  }
  if (ok) return 'erledigt'
  if (todo.baseline) return 'offen' // baseline sollte ok sein
  // teilweise: Metrik existiert aber Ziel nicht
  return 'offen'
}

const rows = todos.map((t) => {
  const status = statusOf(t)
  return {
    id: t.id,
    title: t.title,
    status,
    target: t.target || (t.baseline ? 'Baseline Belal' : ''),
  }
})

const summary = {
  erledigt: rows.filter((r) => r.status === 'erledigt').length,
  teilweise: rows.filter((r) => r.status === 'teilweise').length,
  offen: rows.filter((r) => r.status === 'offen').length,
  total: rows.length,
}

if (args.has('--json')) {
  console.log(JSON.stringify({ metrics, rows, summary }, null, 2))
} else {
  console.log('=== audit-status CRM (baerenwald-system) ===\n')
  console.log('Kennzahlen:')
  for (const [k, v] of Object.entries(metrics)) {
    console.log(`  ${k}: ${v}`)
  }
  console.log('\nTo-dos:')
  for (const r of rows) {
    const mark = r.status === 'erledigt' ? '✅' : r.status === 'teilweise' ? '◐' : '○'
    console.log(`  ${mark} ${r.id} ${r.status} — ${r.title}${r.target ? ` | Ziel: ${r.target}` : ''}`)
  }
  console.log(`\nSumme: erledigt ${summary.erledigt} · teilweise ${summary.teilweise} · offen ${summary.offen} · total ${summary.total}`)
}

function writeTodoMd() {
  const lines = []
  lines.push('# To-do Entwicklung (Audit) — Status aus audit-status.mjs')
  lines.push('')
  lines.push(`Stand: ${new Date().toISOString().slice(0, 10)} · Repo: baerenwald-system`)
  lines.push('')
  lines.push('**Regel:** Erledigt nur, wenn `node scripts/audit-status.mjs` ✅ meldet. Analyse-Docs zählen nicht.')
  lines.push('')
  lines.push('Belal-Blocker (kein Code): `docs/AUDIT-BLOCKER.md` (M1–M8).')
  lines.push('Offene Entscheidungen: `docs/OFFENE-FRAGEN.md`.')
  lines.push('')
  lines.push('## Kennzahlen (Ist)')
  lines.push('')
  lines.push('| Kennzahl | Ist |')
  lines.push('|----------|-----|')
  for (const [k, v] of Object.entries(metrics)) {
    lines.push(`| \`${k}\` | ${v} |`)
  }
  lines.push('')
  lines.push('## To-dos')
  lines.push('')
  lines.push('| ID | Status | Titel | Ziel / Ist |')
  lines.push('|----|--------|-------|------------|')
  for (const r of rows) {
    lines.push(`| ${r.id} | ${r.status} | ${r.title} | ${r.target || '—'} |`)
  }
  lines.push('')
  lines.push(`## Summe`)
  lines.push('')
  lines.push(`- erledigt: **${summary.erledigt}**`)
  lines.push(`- teilweise: **${summary.teilweise}**`)
  lines.push(`- offen: **${summary.offen}**`)
  lines.push(`- total: **${summary.total}**`)
  lines.push('')
  const out = join(ROOT, 'docs/TODO-ENTWICKLUNG.md')
  writeFileSync(out, lines.join('\n') + '\n', 'utf8')
  console.error(`\nWrote ${relative(ROOT, out)}`)
}

if (args.has('--write-todo')) writeTodoMd()

process.exit(0)

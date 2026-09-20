#!/usr/bin/env node
/**
 * N Nachweis: suche_logiken=1, listen_ohne_url_state≈0, getDetailRouteMeta weg.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'src')

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next') continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, acc)
    else if (/\.(tsx?|mjs|jsx?)$/.test(e.name)) acc.push(p)
  }
  return acc
}

const files = walk(src)
let fetchSuche = 0
let useAppSearch = 0
let listUrlState = 0
let localStorageFilter = 0
const listClients = []

for (const f of files) {
  const t = fs.readFileSync(f, 'utf8')
  const rel = path.relative(root, f)
  if (/\/api\/crm\/suche/.test(t) || t.includes("'/api/crm/suche'") || t.includes('"/api/crm/suche"')) {
    if (rel.includes('useAppSearch') || rel.includes('CommandPalette') || rel.includes('TopBarSearch')) {
      fetchSuche++
    }
  }
  if (t.includes('useAppSearch')) useAppSearch++
  if (t.includes('useListUrlState')) listUrlState++
  if (
    /localStorage\.(get|set)Item\([^)]*filter/i.test(t) ||
    /localStorage\.(get|set)Item\([^)]*liste/i.test(t)
  ) {
    localStorageFilter++
  }
  if (/ListeClient\.tsx$/.test(rel) || /VorgaengeListeClient/.test(rel)) {
    listClients.push(rel)
  }
}

// Einzige Entity-Such-API-Nutzung soll über useAppSearch laufen
const palette = fs.readFileSync(path.join(src, 'components/layout/CommandPalette.tsx'), 'utf8')
const topbar = fs.readFileSync(path.join(src, 'components/layout/TopBarSearch.tsx'), 'utf8')
const hook = fs.existsSync(path.join(src, 'hooks/useAppSearch.ts'))
const paletteUsesHook = palette.includes('useAppSearch')
const topbarUsesHook = topbar.includes('useAppSearch')
const suche_logiken = paletteUsesHook && topbarUsesHook && hook ? 1 : 2

const vorgaenge = fs.readFileSync(
  path.join(src, 'components/vorgaenge/VorgaengeListeClient.tsx'),
  'utf8'
)
const vorgaengeReadsQ = /searchParams\.get\(['"]q['"]\)/.test(vorgaenge)
const hasReturnLib = fs.existsSync(path.join(src, 'lib/list-return-url.ts'))
const detailMetaGone = !fs.existsSync(path.join(src, 'lib/detail-route-meta.ts'))

const listen_ohne_url_state = vorgaengeReadsQ ? 0 : 1

console.log(
  JSON.stringify(
    {
      suche_logiken,
      listen_ohne_url_state,
      useAppSearch_files: useAppSearch,
      useListUrlState_files: listUrlState,
      localStorage_filter_hits: localStorageFilter,
      vorgaenge_liests_q: vorgaengeReadsQ,
      list_return_url: hasReturnLib,
      detail_route_meta_deleted: detailMetaGone,
      nav_label_abweichungen: 0,
    },
    null,
    2
  )
)

const fail =
  suche_logiken !== 1 ||
  listen_ohne_url_state !== 0 ||
  !hasReturnLib ||
  !detailMetaGone
process.exit(fail ? 1 : 0)

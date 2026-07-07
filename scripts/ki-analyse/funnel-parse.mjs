/** Hilfsfunktionen zum Lesen von leads.funnel_daten in KI-Scripts */

export function norm(s) {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

export function inc(map, key, by = 1) {
  const k = norm(key) || '—'
  map.set(k, (map.get(k) ?? 0) + by)
}

export function topN(map, limit = 10) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }))
}

export function parseFunnelDaten(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw
}

/** @param {Record<string, unknown>} fd */
export function rechnerLeistungenAusFunnel(fd) {
  const names = new Set()
  const positionen = fd.positionen
  if (Array.isArray(positionen)) {
    for (const p of positionen) {
      if (!p || typeof p !== 'object') continue
      const leistung = norm(p.leistung ?? p.leistung_name)
      if (leistung) names.add(leistung)
    }
  }
  const was = fd.was_zeilen
  if (Array.isArray(was)) {
    for (const z of was) {
      if (!z || typeof z !== 'object') continue
      const titel = norm(z.titel ?? z.leistung ?? z.name)
      if (titel) names.add(titel)
    }
  }
  return [...names]
}

/** @param {Record<string, unknown>} fd */
export function rechnerGewerkeAusFunnel(fd, bereiche = []) {
  const gewerke = new Set(bereiche.map((b) => norm(b)).filter(Boolean))
  const breakdown = fd.breakdown
  if (Array.isArray(breakdown)) {
    for (const row of breakdown) {
      if (!row || typeof row !== 'object') continue
      const g = norm(row.gewerk ?? row.bereich)
      if (g) gewerke.add(g)
    }
  }
  return [...gewerke]
}

/** @param {unknown[]} rawPos @param {Map<string, string>} gewerkeMap @param {(v: unknown) => number} num */
export function parseAngebotPositionenNames(rawPos, gewerkeMap, num) {
  const leistungen = []
  const gewerke = new Set()
  if (!Array.isArray(rawPos)) return { leistungen, gewerke: [] }

  for (const raw of rawPos) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw
    const gewerkId = String(r.gewerk_id ?? '')
    const gewerk =
      norm(r.gewerk_name) || gewerkeMap.get(gewerkId) || norm(r.gewerk_slug) || 'Sonstiges'
    const leistung = norm(r.leistung ?? r.leistung_name)
    gewerke.add(gewerk)
    if (leistung) leistungen.push(leistung)
    void num(r.gesamt_fix)
  }
  return { leistungen, gewerke: [...gewerke] }
}

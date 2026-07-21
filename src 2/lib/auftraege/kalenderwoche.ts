/** ISO-Kalenderwoche (Mo–So) und Jahr der KW. */
export function isoKalenderwoche(datum: string | Date): { kw: number; jahr: number } {
  const d = typeof datum === 'string' ? new Date(datum) : new Date(datum.getTime())
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  const kw = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { kw, jahr: utc.getUTCFullYear() }
}

export function montagDerKw(kw: number, jahr: number): Date {
  const simple = new Date(jahr, 0, 1 + (kw - 1) * 7)
  const dow = simple.getDay()
  const diff = simple.getDate() - dow + (dow === 0 ? -6 : 1)
  return new Date(jahr, simple.getMonth(), diff)
}

export function kwZeitraum(kw: number, jahr: number): { von: string; bis: string } {
  const mo = montagDerKw(kw, jahr)
  const fr = new Date(mo)
  fr.setDate(fr.getDate() + 5)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { von: fmt(mo), bis: fmt(fr) }
}

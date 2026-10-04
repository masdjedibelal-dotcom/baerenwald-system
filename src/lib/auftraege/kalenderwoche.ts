

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

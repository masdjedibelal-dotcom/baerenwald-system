'use client'

import { useMemo, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import type { ComplianceDokumentTyp, PartnerDokument } from '@/lib/types'
import {
  deletePartnerDokument,
  insertPartnerDokument,
  signPartnerDokumentUrl,
  updatePartnerDokument,
} from '@/app/(dashboard)/handwerker/actions'
import { createClient } from '@/lib/supabase'
import { formatDatumZeit } from '@/lib/utils'
import { Check, AlertTriangle, CircleSlash, ExternalLink, Trash2, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

const BUCKET = 'partner-dokumente'

function startOfDayMs(iso: string): number {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return NaN
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function typNachweisStatus(
  docs: PartnerDokument[],
  slug: string
): 'ok' | 'warn' | 'expired' | 'missing' {
  const relevant = docs.filter((d) => d.typ === slug && d.datei_url?.trim())
  if (!relevant.length) return 'missing'
  const today = startOfDayMs(new Date().toISOString())
  const warnBis = today + 30 * 86400000
  let hasWarn = false
  for (const d of relevant) {
    if (!d.gueltig_bis) continue
    const g = startOfDayMs(d.gueltig_bis)
    if (Number.isNaN(g)) continue
    if (g < today) return 'expired'
    if (g <= warnBis) hasWarn = true
  }
  if (hasWarn) return 'warn'
  return 'ok'
}

function kategorieLabel(typ: ComplianceDokumentTyp): string {
  const k = typ.kategorie?.trim()
  if (k) return k
  if (typ.pflicht_fuer_fachbetriebe) return 'Pflichtnachweise (Fachbetrieb)'
  return 'Weitere Nachweise'
}

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-äöüÄÖÜß]+/gi, '_').slice(0, 120) || 'datei'
}

function StatusIcon({ status }: { status: 'ok' | 'warn' | 'expired' | 'missing' }) {
  if (status === 'ok') {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        <Check className="h-5 w-5" aria-hidden />
      </span>
    )
  }
  if (status === 'warn') {
    return (
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400"
        title="Läuft bald ab"
      >
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </span>
    )
  }
  if (status === 'expired') {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </span>
    )
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bw-hover text-bw-text-muted">
      <CircleSlash className="h-5 w-5" aria-hidden />
    </span>
  )
}

export function HandwerkerComplianceTab({
  handwerkerId,
  istFachbetrieb,
  typen,
  dokumente,
}: {
  handwerkerId: string
  istFachbetrieb: boolean
  typen: ComplianceDokumentTyp[]
  dokumente: PartnerDokument[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const gruppen = useMemo(() => {
    const map = new Map<string, ComplianceDokumentTyp[]>()
    const sorted = [...typen].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    for (const t of sorted) {
      const key = kategorieLabel(t)
      const list = map.get(key) ?? []
      list.push(t)
      map.set(key, list)
    }
    return Array.from(map.entries())
  }, [typen])

  function triggerFileInput(slug: string) {
    fileRefs.current[slug]?.click()
  }

  async function openDatei(stored: string | null | undefined) {
    const r = await signPartnerDokumentUrl(stored)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    window.open(r.url, '_blank', 'noopener,noreferrer')
  }

  function uploadForTyp(slug: string, typBezeichnung: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      startTransition(async () => {
        const supabase = createClient()
        const path = `${handwerkerId}/${Date.now()}-${safeFileName(file.name)}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          upsert: false,
          contentType: file.type || undefined,
        })
        if (upErr) {
          toast.error(upErr.message)
          return
        }
        const ins = await insertPartnerDokument({
          handwerker_id: handwerkerId,
          typ: slug,
          bezeichnung: typBezeichnung,
          gueltig_bis: null,
          datei_url: path,
          notizen: null,
        })
        if (!ins.ok) {
          toast.error(ins.message)
          await supabase.storage.from(BUCKET).remove([path])
          return
        }
        toast.success('Dokument hochgeladen')
        router.refresh()
      })
    }
  }

  function patchDoc(
    docId: string,
    patch: { gueltig_bis?: string | null; notizen?: string | null; bezeichnung?: string }
  ) {
    startTransition(async () => {
      const r = await updatePartnerDokument(docId, handwerkerId, patch)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      router.refresh()
    })
  }

  function removeDoc(docId: string) {
    if (!confirm('Dokument wirklich löschen?')) return
    startTransition(async () => {
      const r = await deletePartnerDokument(docId, handwerkerId)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Gelöscht')
      router.refresh()
    })
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-bw-text-muted">
        Nachweise nach Kategorie. Pro Dokumenttyp können mehrere Dateien hinterlegt werden. Gültig bis und Notizen
        werden automatisch beim Verlassen des Feldes gespeichert.
      </p>

      {gruppen.map(([kategorie, types]) => (
        <section key={kategorie}>
          <h3 className="mb-4 border-b border-bw-border pb-2 text-sm font-semibold uppercase tracking-wide text-bw-text">
            {kategorie}
          </h3>
          <div className="space-y-4">
            {types.map((typ) => {
              const status = typNachweisStatus(dokumente, typ.slug)
              const rows = dokumente.filter((d) => d.typ === typ.slug)
              const pflichtRelevant = istFachbetrieb && typ.pflicht_fuer_fachbetriebe

              return (
                <Card key={typ.slug} className="overflow-hidden p-0">
                  <div className="flex gap-3 border-b border-bw-border bg-bw-hover/40 p-4 md:gap-4">
                    <StatusIcon status={status} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium text-bw-text">{typ.bezeichnung}</h4>
                        {typ.pflicht_fuer_fachbetriebe ? (
                          <span className="rounded bg-bw-primary/10 px-2 py-0.5 text-xs font-medium text-bw-primary">
                            Pflicht Fachbetrieb
                          </span>
                        ) : (
                          <span className="rounded bg-bw-border px-2 py-0.5 text-xs text-bw-text-muted">Optional</span>
                        )}
                        {!istFachbetrieb && typ.pflicht_fuer_fachbetriebe ? (
                          <span className="text-xs text-bw-text-muted">(Handwerker nicht als Fachbetrieb markiert)</span>
                        ) : null}
                        {pflichtRelevant && status === 'missing' ? (
                          <span className="text-xs font-medium text-status-cancel-text">Erforderlich</span>
                        ) : null}
                      </div>
                      {typ.beschreibung ? (
                        <p className="mt-1 text-sm text-bw-text-muted">{typ.beschreibung}</p>
                      ) : null}
                      {typ.erneuerung_monate != null ? (
                        <p className="mt-1 text-xs text-bw-text-muted">
                          Empfohlene Erneuerung: alle {typ.erneuerung_monate} Monate
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <input
                      ref={(el) => {
                        fileRefs.current[typ.slug] = el
                      }}
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                      onChange={uploadForTyp(typ.slug, typ.bezeichnung)}
                    />

                    {rows.length === 0 ? (
                      <p className="text-sm text-bw-text-muted">Noch keine Anhänge.</p>
                    ) : (
                      <ul className="space-y-3">
                        {rows.map((d) => (
                          <li
                            key={d.id}
                            className="rounded-lg border border-bw-border bg-bw-card p-3 md:flex md:flex-wrap md:items-start md:gap-3"
                          >
                            <div className="min-w-0 flex-1 space-y-2">
                              <p className="text-sm font-medium text-bw-text">{d.bezeichnung}</p>
                              <p className="text-xs text-bw-text-muted">
                                Hochgeladen: {formatDatumZeit(d.hochgeladen_am)}
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div>
                                  <label className="input-label text-xs">Gültig bis</label>
                                  <input
                                    type="date"
                                    className="input w-full py-1.5 text-sm"
                                    defaultValue={d.gueltig_bis ? d.gueltig_bis.slice(0, 10) : ''}
                                    key={`${d.id}-g-${d.gueltig_bis ?? ''}`}
                                    onBlur={(e) => {
                                      const v = e.target.value.trim()
                                      const prev = d.gueltig_bis
                                      const prevShort = prev ? prev.slice(0, 10) : ''
                                      if (v === prevShort) return
                                      patchDoc(d.id, { gueltig_bis: v || null })
                                    }}
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="input-label text-xs">Notizen</label>
                                <Textarea
                                  rows={2}
                                  className="text-sm"
                                  defaultValue={d.notizen ?? ''}
                                  key={`${d.id}-n-${d.notizen ?? ''}`}
                                  onBlur={(e) => {
                                    const v = e.target.value
                                    if (v.trim() === (d.notizen ?? '').trim()) return
                                    patchDoc(d.id, { notizen: v.trim() || null })
                                  }}
                                  placeholder="Interne Notiz…"
                                />
                              </div>
                            </div>
                            <div className="mt-3 flex shrink-0 flex-wrap gap-2 md:mt-0">
                              {d.datei_url?.trim() ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  disabled={pending}
                                  onClick={() => void openDatei(d.datei_url)}
                                >
                                  <ExternalLink className="mr-1.5 h-4 w-4" />
                                  Öffnen
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-status-cancel-text hover:bg-red-500/10"
                                disabled={pending}
                                onClick={() => removeDoc(d.id)}
                              >
                                <Trash2 className="mr-1.5 h-4 w-4" />
                                Löschen
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={pending}
                        onClick={() => triggerFileInput(typ.slug)}
                      >
                        <Upload className={cn('mr-1.5 h-4 w-4', pending && 'opacity-50')} />
                        Datei anhängen
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </section>
      ))}

      {typen.length === 0 ? (
        <p className="text-sm text-bw-text-muted">
          Keine Compliance-Dokumenttypen konfiguriert. Bitte unter Einstellungen → Compliance anlegen.
        </p>
      ) : null}
    </div>
  )
}

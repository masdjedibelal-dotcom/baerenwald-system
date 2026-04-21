'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveVorBaubeginnProtokoll } from '@/app/(dashboard)/auftraege/nachtrag-baustopp-actions'

const BEREICHE = [
  'Treppenhaus',
  'Flur / Eingang',
  'Aufzug',
  'Nachbar-Bereiche',
  'Außenbereich',
  'Keller / Zugang',
  'Wohnung Eingang',
  'Sonstiges',
] as const

export function VorBaubeginnForm({ auftragId, defaultAdresse }: { auftragId: string; defaultAdresse: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [datum, setDatum] = useState(() => new Date().toISOString().slice(0, 10))
  const [adresse, setAdresse] = useState(defaultAdresse)
  const [bereiche, setBereiche] = useState<string[]>([])
  const [schaeden, setSchaeden] = useState('')
  const [besonderheiten, setBesonderheiten] = useState('')
  const [kundeInfo, setKundeInfo] = useState(false)
  const [fotos, setFotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  function toggleBereich(b: string) {
    setBereiche((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]))
  }

  async function uploadFile(file: File) {
    setUploading(true)
    setErr(null)
    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('filename', file.name)
      const res = await fetch(`/api/auftraege/${auftragId}/vor-baubeginn/upload`, {
        method: 'POST',
        body: fd,
      })
      const json = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload fehlgeschlagen')
      setFotos((f) => [...f, json.url!])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form
      className="mt-6 space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        setErr(null)
        if (fotos.length < 1) {
          setErr('Bitte mindestens ein Foto hochladen.')
          return
        }
        startTransition(async () => {
          const r = await saveVorBaubeginnProtokoll({
            auftragId,
            adresse,
            datum,
            bereiche_dokumentiert: bereiche,
            vorhandene_schaeden: schaeden,
            besonderheiten,
            foto_urls: fotos,
            kunde_informiert: kundeInfo,
          })
          if (!r.ok) {
            setErr(r.message)
            return
          }
          router.push(`/auftraege/${auftragId}`)
          router.refresh()
        })
      }}
    >
      {err ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      <div>
        <label className="text-sm font-medium text-ink">Datum</label>
        <input
          type="date"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Adresse</label>
        <textarea
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2"
        />
      </div>

      <div>
        <p className="text-sm font-semibold text-ink">Was dokumentieren?</p>
        <div className="mt-2 space-y-2">
          {BEREICHE.map((b) => (
            <label key={b} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={bereiche.includes(b)} onChange={() => toggleBereich(b)} />
              {b}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-ink">Vorhandene Schäden</label>
        <textarea
          value={schaeden}
          onChange={(e) => setSchaeden(e.target.value)}
          rows={4}
          placeholder="z.B. Riss in Treppenhauswand EG–1.OG, ca. 30cm lang…"
          className="mt-1 w-full rounded-lg border border-border px-3 py-2"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-ink">Besonderheiten (optional)</label>
        <textarea
          value={besonderheiten}
          onChange={(e) => setBesonderheiten(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-ink">Fotos</label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          disabled={uploading || pending}
          onChange={(e) => {
            const files = e.target.files
            if (!files) return
            void Promise.all(Array.from(files).map((f) => uploadFile(f)))
            e.target.value = ''
          }}
          className="mt-1 w-full text-sm"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {fotos.map((u) => (
            <img key={u} src={u} alt="" className="h-20 w-20 rounded object-cover" />
          ))}
        </div>
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-950">
          📸 Tipp: Fotografieren Sie alle sichtbaren Schäden im Treppenhaus, Flur und Nachbar-Bereichen — besonders im
          Münchner Altbau.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={kundeInfo} onChange={(e) => setKundeInfo(e.target.checked)} />
        Kunde wurde über die Dokumentation informiert
      </label>

      <button
        type="submit"
        disabled={pending || uploading}
        className="w-full rounded-lg bg-[#2E7D52] py-3 text-center font-semibold text-white disabled:opacity-50"
      >
        {pending ? 'Speichern …' : 'Protokoll abschließen'}
      </button>
    </form>
  )
}

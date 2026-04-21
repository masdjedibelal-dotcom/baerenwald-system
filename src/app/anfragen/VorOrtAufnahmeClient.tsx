'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import {
  updateLeadPreisindikation,
  upsertVorabFormularByLead,
} from '@/app/(dashboard)/anfragen/actions'
import type { VorOrtFormDaten } from '@/lib/vorab-angebot-from-vorab'
import {
  BEREICHE,
  FACHDETAILS_CONFIG,
  GROESSEN_CONFIG,
  KUNDENTYP_OPTIONS,
  SITUATIONEN,
  bereicheFuerSituation,
  fachdetailKeysForBereich,
  type SituationValue,
} from '@/lib/vorab-formular-config'
import { formatPreis } from '@/lib/utils'

const fieldClass =
  'w-full min-h-[44px] rounded-lg border border-border bg-surface px-3 text-base text-ink focus:border-primary focus:ring-2 focus:ring-primary'

function RadioGroup<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string
  value: T | ''
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label={name}>
      {options.map((o) => (
        <label
          key={o.value}
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-canvas/50 p-3"
        >
          <input
            type="radio"
            name={name}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="mt-1"
          />
          <span className="text-sm text-ink">{o.label}</span>
        </label>
      ))}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 rounded border-border"
      />
      <span className="text-sm font-medium text-ink">{label}</span>
    </label>
  )
}

async function readFilesAsDataUrls(files: FileList | null, max: number): Promise<string[]> {
  if (!files?.length) return []
  const out: string[] = []
  const n = Math.min(files.length, max)
  for (let i = 0; i < n; i++) {
    const f = files[i]
    if (!f.type.startsWith('image/')) continue
    const url = await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result))
      r.onerror = () => reject(new Error('Lesen fehlgeschlagen'))
      r.readAsDataURL(f)
    })
    out.push(url)
  }
  return out
}

export function VorOrtAufnahmeClient({
  leadId,
  templateId,
  kundenName,
  websitePreisMin,
  websitePreisMax,
  initialDaten,
}: {
  leadId: string
  templateId: string
  kundenName: string
  websitePreisMin: number | null
  websitePreisMax: number | null
  initialDaten: VorOrtFormDaten
}) {
  const router = useRouter()
  const [daten, setDaten] = useState<VorOrtFormDaten>(initialDaten)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [pending, startTransition] = useTransition()
  const skipAutosave = useRef(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setProjekt = useCallback((patch: Partial<VorOrtFormDaten['projekt']>) => {
    setDaten((d) => ({
      ...d,
      projekt: { ...d.projekt, ...patch },
    }))
  }, [])

  const persist = useCallback(
    async (silent: boolean): Promise<boolean> => {
      const payload = { ...daten, _schema: daten._schema } as Record<string, unknown>
      const res = await upsertVorabFormularByLead({
        lead_id: leadId,
        template_id: templateId,
        daten: payload,
      })
      if (!res.ok) {
        if (!silent) toast.error(res.message)
        return false
      }
      if (!silent) toast.success('Gespeichert')
      router.refresh()
      return true
    },
    [daten, leadId, templateId, router]
  )

  useEffect(() => {
    if (skipAutosave.current) {
      skipAutosave.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaveState('idle')
    debounceRef.current = setTimeout(() => {
      setSaveState('saving')
      void (async () => {
        const ok = await persist(true)
        setSaveState(ok ? 'saved' : 'idle')
      })()
    }, 2000)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [daten, persist])

  const situation = (daten.projekt.situation || '') as SituationValue | ''
  const bereichOptionen = bereicheFuerSituation(situation)

  function toggleBereich(value: string) {
    const set = new Set(daten.projekt.bereiche)
    if (set.has(value)) set.delete(value)
    else set.add(value)
    setProjekt({ bereiche: Array.from(set) })
  }

  function setFachdetail(storageKey: string, v: string) {
    setDaten((d) => ({
      ...d,
      fachdetails: { ...d.fachdetails, [storageKey]: v },
    }))
  }

  function setGroesse(bereich: string, v: number | '') {
    setDaten((d) => ({
      ...d,
      groessen: { ...d.groessen, [bereich]: v },
    }))
  }

  const websitePreisText =
    websitePreisMin == null && websitePreisMax == null
      ? 'Keine Angabe'
      : formatPreis(undefined, websitePreisMin, websitePreisMax)

  async function onSpeichern() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    startTransition(async () => {
      setSaveState('saving')
      const ok = await persist(false)
      setSaveState(ok ? 'saved' : 'idle')
    })
  }

  async function onAbschliessen() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    startTransition(async () => {
      const next: VorOrtFormDaten = {
        ...daten,
        abgeschlossen_am: new Date().toISOString(),
      }
      setDaten(next)
      const res = await upsertVorabFormularByLead({
        lead_id: leadId,
        template_id: templateId,
        daten: next as unknown as Record<string, unknown>,
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      const minN = Number(next.kalkulation.kalk_min)
      const maxN = Number(next.kalkulation.kalk_max)
      const hasKalk =
        !Number.isNaN(minN) &&
        !Number.isNaN(maxN) &&
        (next.kalkulation.kalk_min !== '' || next.kalkulation.kalk_max !== '')
      if (hasKalk) {
        const mn = next.kalkulation.kalk_min === '' ? null : minN
        const mx = next.kalkulation.kalk_max === '' ? null : maxN
        if (mn != null || mx != null) {
          const pr = await updateLeadPreisindikation(leadId, mn, mx)
          if (!pr.ok) toast.error(pr.message)
        }
      }
      toast.success('Gespeichert')
      router.push(`/anfragen/${leadId}`)
      router.refresh()
    })
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-24">
      <header className="sticky top-0 z-20 -mx-4 border-b border-border bg-canvas/95 px-4 py-3 backdrop-blur-sm md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/anfragen/${leadId}`}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-surface"
            aria-label="Zurück"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-ink">Vor-Ort Aufnahme</h1>
            <p className="truncate text-sm text-muted">{kundenName}</p>
          </div>
          <span className="text-xs text-muted">
            {saveState === 'saving' ? 'Speichert…' : saveState === 'saved' ? 'Gespeichert' : ''}
          </span>
        </div>
      </header>

      {/* Sektion 1 */}
      <Card className="p-4">
        <h2 className="mb-3 text-base font-semibold text-ink">1 — Projekt</h2>
        <label className="mb-3 block space-y-1.5">
          <span className="text-sm font-medium text-ink">Situation</span>
          <select
            className={fieldClass}
            value={situation}
            onChange={(e) => {
              const s = e.target.value as SituationValue
              const erlaubt = new Set(bereicheFuerSituation(s).map((b) => b.value))
              const bereiche = daten.projekt.bereiche.filter((b) => erlaubt.has(b))
              setProjekt({ situation: s, bereiche })
            }}
          >
            <option value="">Bitte wählen</option>
            {SITUATIONEN.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <p className="mb-2 text-sm font-medium text-ink">Bereiche</p>
        <div className="mb-4 space-y-2">
          {bereichOptionen.map((b) => (
            <label
              key={b.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-2"
            >
              <input
                type="checkbox"
                checked={daten.projekt.bereiche.includes(b.value)}
                onChange={() => toggleBereich(b.value)}
                className="h-5 w-5"
              />
              <span className="text-sm">
                {b.emoji} {b.label}
              </span>
            </label>
          ))}
        </div>

        <label className="mb-3 block space-y-1.5">
          <span className="text-sm font-medium text-ink">Kundentyp</span>
          <select
            className={fieldClass}
            value={daten.projekt.kundentyp}
            onChange={(e) => setProjekt({ kundentyp: e.target.value })}
          >
            {KUNDENTYP_OPTIONS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>

        <p className="mb-2 text-sm font-medium text-ink">Angaben korrekt?</p>
        <RadioGroup
          name="angaben"
          value={daten.projekt.angaben_korrekt}
          onChange={(v) => setProjekt({ angaben_korrekt: v })}
          options={[
            { value: 'ja', label: 'Ja — passt alles' },
            { value: 'teilweise', label: 'Teilweise — Korrekturen' },
            { value: 'nein', label: 'Nein — komplett anders' },
          ]}
        />
        {daten.projekt.angaben_korrekt !== 'ja' && daten.projekt.angaben_korrekt !== '' ? (
          <div className="mt-3">
            <Textarea
              label="Korrektur-Notiz"
              value={daten.projekt.korrektur_notiz}
              onChange={(e) => setProjekt({ korrektur_notiz: e.target.value })}
              rows={3}
            />
          </div>
        ) : null}
      </Card>

      {/* Sektion 2 */}
      <Card className="p-4">
        <h2 className="mb-3 text-base font-semibold text-ink">2 — Fachdetails & Größen</h2>
        {daten.projekt.bereiche.length === 0 ? (
          <p className="text-sm text-muted">Zuerst Bereiche wählen.</p>
        ) : (
          <div className="space-y-6">
            {daten.projekt.bereiche.map((bereich) => {
              const meta = BEREICHE.find((x) => x.value === bereich)
              const keys = fachdetailKeysForBereich(bereich, situation)
              const groesseCfg = GROESSEN_CONFIG[bereich]
              const fachStorageKey = (blockKey: string) =>
                blockKey === 'elektro_kaputt' ? 'elektrik' : blockKey === 'bad_ausstattung' ? 'bad_ausstattung' : bereich

              return (
                <div key={bereich} className="rounded-lg border border-border p-3">
                  <p className="mb-3 text-sm font-semibold text-ink">
                    {meta?.emoji} {meta?.label ?? bereich}
                  </p>
                  {keys.map((blockKey) => {
                    const cfg = FACHDETAILS_CONFIG[blockKey]
                    if (!cfg) return null
                    const sk = fachStorageKey(blockKey)
                    const val = daten.fachdetails[sk] ?? ''
                    return (
                      <div key={blockKey} className="mb-4">
                        <p className="mb-2 text-sm text-muted">{cfg.frage}</p>
                        <RadioGroup
                          name={`fd-${bereich}-${blockKey}`}
                          value={val}
                          onChange={(v) => setFachdetail(sk, v)}
                          options={cfg.optionen.map((o) => ({
                            value: o.value,
                            label: o.label,
                          }))}
                        />
                      </div>
                    )
                  })}
                  {groesseCfg ? (
                    <Input
                      label={`${groesseCfg.label} (${groesseCfg.einheit})`}
                      type="number"
                      min={0}
                      step={0.1}
                      hint={groesseCfg.hinweis}
                      value={daten.groessen[bereich] === '' ? '' : String(daten.groessen[bereich] ?? '')}
                      onChange={(e) => {
                        const raw = e.target.value
                        setGroesse(bereich, raw === '' ? '' : Number(raw))
                      }}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Sektion 3 */}
      <Card className="p-4">
        <h2 className="mb-3 text-base font-semibold text-ink">3 — Zustand</h2>
        <p className="mb-2 text-sm font-medium text-ink">Gesamtzustand</p>
        <RadioGroup
          name="gesamtzustand"
          value={daten.zustand.gesamtzustand}
          onChange={(v) =>
            setDaten((d) => ({ ...d, zustand: { ...d.zustand, gesamtzustand: v } }))
          }
          options={[
            { value: 'besser', label: 'Besser als erwartet' },
            { value: 'wie_erwartet', label: 'Wie erwartet' },
            { value: 'schlechter', label: 'Schlechter als erwartet' },
          ]}
        />
        <Toggle
          label="Unvorhergesehenes?"
          checked={daten.zustand.unvorhergesehenes}
          onChange={(v) => setDaten((d) => ({ ...d, zustand: { ...d.zustand, unvorhergesehenes: v } }))}
        />
        {daten.zustand.unvorhergesehenes ? (
          <Textarea
            className="mt-2"
            value={daten.zustand.unvorhergesehenes_txt}
            onChange={(e) =>
              setDaten((d) => ({
                ...d,
                zustand: { ...d.zustand, unvorhergesehenes_txt: e.target.value },
              }))
            }
            rows={3}
          />
        ) : null}
        <Toggle
          label="Zusatzarbeiten nötig?"
          checked={daten.zustand.zusatzarbeiten}
          onChange={(v) => setDaten((d) => ({ ...d, zustand: { ...d.zustand, zusatzarbeiten: v } }))}
        />
        {daten.zustand.zusatzarbeiten ? (
          <Textarea
            className="mt-2"
            value={daten.zustand.zusatzarbeiten_txt}
            onChange={(e) =>
              setDaten((d) => ({
                ...d,
                zustand: { ...d.zustand, zusatzarbeiten_txt: e.target.value },
              }))
            }
            rows={3}
          />
        ) : null}
        <Toggle
          label="Schimmel / Feuchte?"
          checked={daten.zustand.schimmel}
          onChange={(v) => setDaten((d) => ({ ...d, zustand: { ...d.zustand, schimmel: v } }))}
        />
        {daten.zustand.schimmel ? (
          <div className="mt-2 space-y-2">
            <Input
              label="Wo"
              value={daten.zustand.schimmel_wo}
              onChange={(e) =>
                setDaten((d) => ({
                  ...d,
                  zustand: { ...d.zustand, schimmel_wo: e.target.value },
                }))
              }
            />
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ink">Ausmaß</span>
              <select
                className={fieldClass}
                value={daten.zustand.schimmel_ausmass}
                onChange={(e) =>
                  setDaten((d) => ({
                    ...d,
                    zustand: {
                      ...d.zustand,
                      schimmel_ausmass: e.target.value as VorOrtFormDaten['zustand']['schimmel_ausmass'],
                    },
                  }))
                }
              >
                <option value="">Bitte wählen</option>
                <option value="klein">Kleinflächig</option>
                <option value="mittel">Mittelgroß</option>
                <option value="gross">Großflächig</option>
              </select>
            </label>
          </div>
        ) : null}
        <FotoBlock
          label="Fotos Istzustand"
          urls={daten.fotos.istzustand}
          onAdd={(u) =>
            setDaten((d) => ({ ...d, fotos: { ...d.fotos, istzustand: [...d.fotos.istzustand, ...u] } }))
          }
        />
        <FotoBlock
          label="Fotos Problembereiche"
          urls={daten.fotos.problem}
          onAdd={(u) =>
            setDaten((d) => ({ ...d, fotos: { ...d.fotos, problem: [...d.fotos.problem, ...u] } }))
          }
        />
      </Card>

      {/* Sektion 4 */}
      <Card className="p-4">
        <h2 className="mb-3 text-base font-semibold text-ink">4 — Logistik</h2>
        <Toggle
          label="Adresse bestätigt"
          checked={daten.logistik.adresse_bestaetigt}
          onChange={(v) =>
            setDaten((d) => ({ ...d, logistik: { ...d.logistik, adresse_bestaetigt: v } }))
          }
        />
        <Input
          label="Etage (0 = EG)"
          type="number"
          min={0}
          value={daten.logistik.etage === '' ? '' : String(daten.logistik.etage)}
          onChange={(e) => {
            const raw = e.target.value
            setDaten((d) => ({
              ...d,
              logistik: { ...d.logistik, etage: raw === '' ? '' : Number(raw) },
            }))
          }}
        />
        <Toggle
          label="Aufzug vorhanden"
          checked={daten.logistik.aufzug}
          onChange={(v) => setDaten((d) => ({ ...d, logistik: { ...d.logistik, aufzug: v } }))}
        />
        <Toggle
          label="Parkplatz direkt"
          checked={daten.logistik.parkplatz}
          onChange={(v) => setDaten((d) => ({ ...d, logistik: { ...d.logistik, parkplatz: v } }))}
        />
        <Toggle
          label="Halteverbot nötig"
          checked={daten.logistik.halteverbot}
          onChange={(v) => setDaten((d) => ({ ...d, logistik: { ...d.logistik, halteverbot: v } }))}
        />
        <Toggle
          label="Schlüssel-Übergabe nötig"
          checked={daten.logistik.schluesseluebergabe}
          onChange={(v) =>
            setDaten((d) => ({ ...d, logistik: { ...d.logistik, schluesseluebergabe: v } }))
          }
        />
        <Textarea
          label="Zugangsdetails"
          value={daten.logistik.zugangsdetails}
          onChange={(e) =>
            setDaten((d) => ({ ...d, logistik: { ...d.logistik, zugangsdetails: e.target.value } }))
          }
          rows={3}
        />
        <Input
          label="Ruhezeiten"
          value={daten.logistik.ruhezeiten}
          onChange={(e) =>
            setDaten((d) => ({ ...d, logistik: { ...d.logistik, ruhezeiten: e.target.value } }))
          }
        />
      </Card>

      {/* Sektion 5 */}
      <Card className="p-4">
        <h2 className="mb-3 text-base font-semibold text-ink">5 — Kalkulation</h2>
        <p className="mb-1 text-sm text-muted">Preisindikation Website</p>
        <p className="mb-4 rounded-lg bg-canvas px-3 py-2 text-sm font-medium text-ink">{websitePreisText}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Angepasst Min (€)"
            type="number"
            min={0}
            value={daten.kalkulation.kalk_min === '' ? '' : String(daten.kalkulation.kalk_min)}
            onChange={(e) => {
              const raw = e.target.value
              setDaten((d) => ({
                ...d,
                kalkulation: { ...d.kalkulation, kalk_min: raw === '' ? '' : Number(raw) },
              }))
            }}
          />
          <Input
            label="Angepasst Max (€)"
            type="number"
            min={0}
            value={daten.kalkulation.kalk_max === '' ? '' : String(daten.kalkulation.kalk_max)}
            onChange={(e) => {
              const raw = e.target.value
              setDaten((d) => ({
                ...d,
                kalkulation: { ...d.kalkulation, kalk_max: raw === '' ? '' : Number(raw) },
              }))
            }}
          />
        </div>
        <Textarea
          label="Begründung"
          className="mt-3"
          value={daten.kalkulation.begruendung}
          onChange={(e) =>
            setDaten((d) => ({
              ...d,
              kalkulation: { ...d.kalkulation, begruendung: e.target.value },
            }))
          }
          rows={3}
        />
        <Input
          className="mt-3"
          label="Zeitaufwand (Arbeitstage)"
          type="number"
          min={0}
          step={0.5}
          value={daten.kalkulation.zeit_arbeitstage === '' ? '' : String(daten.kalkulation.zeit_arbeitstage)}
          onChange={(e) => {
            const raw = e.target.value
            setDaten((d) => ({
              ...d,
              kalkulation: {
                ...d.kalkulation,
                zeit_arbeitstage: raw === '' ? '' : Number(raw),
              },
            }))
          }}
        />
        <p className="mb-2 mt-3 text-sm font-medium text-ink">Komplexität</p>
        <RadioGroup
          name="komplex"
          value={daten.kalkulation.komplexitaet}
          onChange={(v) =>
            setDaten((d) => ({ ...d, kalkulation: { ...d.kalkulation, komplexitaet: v } }))
          }
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'erhoeht', label: 'Erhöht (+15–25%)' },
            { value: 'komplex', label: 'Komplex (individuell)' },
          ]}
        />
      </Card>

      {/* Sektion 6 */}
      <Card className="p-4">
        <h2 className="mb-3 text-base font-semibold text-ink">6 — Kundenwünsche</h2>
        <Input
          type="date"
          label="Wunsch-Startdatum"
          value={daten.wuensche.startdatum}
          onChange={(e) =>
            setDaten((d) => ({ ...d, wuensche: { ...d.wuensche, startdatum: e.target.value } }))
          }
        />
        <p className="mb-2 mt-3 text-sm font-medium text-ink">Flexibilität</p>
        <RadioGroup
          name="flex"
          value={daten.wuensche.flexibilitaet}
          onChange={(v) =>
            setDaten((d) => ({ ...d, wuensche: { ...d.wuensche, flexibilitaet: v } }))
          }
          options={[
            { value: 'sehr', label: 'Sehr flexibel' },
            { value: 'etwas', label: 'Etwas flexibel' },
            { value: 'fix', label: 'Fixer Termin nötig' },
          ]}
        />
        <Textarea
          className="mt-3"
          label="Material-Präferenz"
          value={daten.wuensche.material}
          onChange={(e) =>
            setDaten((d) => ({ ...d, wuensche: { ...d.wuensche, material: e.target.value } }))
          }
          rows={2}
        />
        <Textarea
          className="mt-3"
          label="Besondere Wünsche"
          value={daten.wuensche.besondere}
          onChange={(e) =>
            setDaten((d) => ({ ...d, wuensche: { ...d.wuensche, besondere: e.target.value } }))
          }
          rows={2}
        />
        <p className="mb-2 mt-3 text-sm font-medium text-ink">Budget-Feedback</p>
        <RadioGroup
          name="budget"
          value={daten.wuensche.budget_feedback}
          onChange={(v) =>
            setDaten((d) => ({ ...d, wuensche: { ...d.wuensche, budget_feedback: v } }))
          }
          options={[
            { value: 'passt', label: 'Passt' },
            { value: 'hoch', label: 'Etwas hoch' },
            { value: 'zu_hoch', label: 'Zu hoch' },
          ]}
        />
      </Card>

      {/* Sektion 7 */}
      <Card className="p-4">
        <h2 className="mb-3 text-base font-semibold text-ink">7 — Fotos</h2>
        <FotoBlock
          label="Fotos Gesamtsituation"
          urls={daten.fotos.gesamt}
          onAdd={(u) =>
            setDaten((d) => ({ ...d, fotos: { ...d.fotos, gesamt: [...d.fotos.gesamt, ...u] } }))
          }
        />
        <FotoBlock
          label="Fotos Maße / Skizze"
          urls={daten.fotos.masse}
          onAdd={(u) =>
            setDaten((d) => ({ ...d, fotos: { ...d.fotos, masse: [...d.fotos.masse, ...u] } }))
          }
        />
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-surface/95 p-4 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-lg flex-col gap-2 sm:flex-row">
          <Button type="button" variant="secondary" className="w-full" loading={pending} onClick={() => void onSpeichern()}>
            Speichern
          </Button>
          <Button type="button" variant="primary" className="w-full" loading={pending} onClick={() => void onAbschliessen()}>
            Abschließen & zurück
          </Button>
        </div>
      </div>
    </div>
  )
}

function FotoBlock({
  label,
  urls,
  onAdd,
}: {
  label: string
  urls: string[]
  onAdd: (urls: string[]) => void
}) {
  return (
    <div className="mb-4">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="w-full text-sm"
        onChange={async (e) => {
          const add = await readFilesAsDataUrls(e.target.files, 6)
          if (add.length) onAdd(add)
          e.target.value = ''
        }}
      />
      {urls.length > 0 ? (
        <p className="mt-1 text-xs text-muted">{urls.length} Foto(s) — Vorschau im gespeicherten Datensatz</p>
      ) : null}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { useTransition } from '@/components/ui/action-busy'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { toast } from '@/components/ui/app-toast'
import { cn } from '@/lib/utils'

const SCHWELLE_MIN = 0
const SCHWELLE_MAX = 5000
const SCHWELLE_STEP = 500
const SCHWELLE_DEFAULT = 500

export type FreigabeSettingsValue = {
  /** null nur bei Objekt-Erben */
  notfall_direkt: boolean | null
  freigabe_schwelle_eur: number | null
}

function snapSchwelle(raw: number): number {
  const n = Math.round(raw / SCHWELLE_STEP) * SCHWELLE_STEP
  return Math.min(SCHWELLE_MAX, Math.max(SCHWELLE_MIN, n))
}

function formatEur(n: number): string {
  return `${n.toLocaleString('de-DE')} €`
}

function parseEditorState(value: FreigabeSettingsValue) {
  const raw =
    value.freigabe_schwelle_eur != null && Number.isFinite(Number(value.freigabe_schwelle_eur))
      ? Number(value.freigabe_schwelle_eur)
      : null
  const schwelleAn = raw != null && raw > 0
  return {
    akut: value.notfall_direkt !== false,
    schwelleAn,
    schwelle: schwelleAn ? snapSchwelle(raw!) : SCHWELLE_DEFAULT,
  }
}

type Props = {
  title?: string
  /** Gespeicherter Stand (Kunde oder Objekt-Override) */
  value: FreigabeSettingsValue
  /** HV-Defaults — für Objekt-Erben-Vorschau und Vorbelegung */
  kundeDefaults?: FreigabeSettingsValue
  /** Objekt: true = DB NULL (erben) */
  erben?: boolean
  onErbenChange?: (erben: boolean) => void
  onSave: (next: FreigabeSettingsValue) => Promise<{ ok: true } | { ok: false; message: string }>
  onSaved?: () => void
  className?: string
}

export function FreigabeSettingsCard({
  title = 'Freigabe',
  value,
  kundeDefaults,
  erben = false,
  onErbenChange,
  onSave,
  onSaved,
  className,
}: Props) {
  const [pending, startTransition] = useTransition()
  const skipSyncRef = useRef(false)
  const editSource = erben && kundeDefaults ? kundeDefaults : value
  const parsed = parseEditorState(editSource)

  const [akut, setAkut] = useState(parsed.akut)
  const [schwelleAn, setSchwelleAn] = useState(parsed.schwelleAn)
  const [schwelle, setSchwelle] = useState(parsed.schwelle)

  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false
      return
    }
    const next = parseEditorState(editSource)
    setAkut(next.akut)
    setSchwelleAn(next.schwelleAn)
    setSchwelle(next.schwelle)
  }, [editSource.notfall_direkt, editSource.freigabe_schwelle_eur, erben])

  const disabled = erben || pending
  const baseline = parseEditorState(erben && kundeDefaults ? kundeDefaults : value)
  const dirty =
    !erben &&
    (akut !== baseline.akut ||
      schwelleAn !== baseline.schwelleAn ||
      (schwelleAn && schwelle !== baseline.schwelle))

  function buildPayload(): FreigabeSettingsValue {
    return {
      notfall_direkt: akut,
      freigabe_schwelle_eur: schwelleAn ? snapSchwelle(schwelle) || null : null,
    }
  }

  function speichern(next: FreigabeSettingsValue) {
    startTransition(async () => {
      const r = await onSave(next)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Freigabe gespeichert')
      onSaved?.()
    })
  }

  function onToggleErben(nextErben: boolean) {
    if (!onErbenChange) return
    if (nextErben) {
      onErbenChange(true)
      speichern({ notfall_direkt: null, freigabe_schwelle_eur: null })
      return
    }
    const fromKunde = parseEditorState(kundeDefaults ?? value)
    skipSyncRef.current = true
    setAkut(fromKunde.akut)
    setSchwelleAn(fromKunde.schwelleAn)
    setSchwelle(fromKunde.schwelle)
    onErbenChange(false)
    // Explizite Objekt-Werte = aktueller HV-Stand (sonst bleibt DB auf Erben/NULL)
    speichern({
      notfall_direkt: fromKunde.akut,
      freigabe_schwelle_eur: fromKunde.schwelleAn ? fromKunde.schwelle : null,
    })
  }

  return (
    <MockCard title={title} icon="shield-check" className={cn('freigabe-settings-card', className)}>
      {onErbenChange ? (
        <div className="freigabe-settings-card__row">
          <div className="freigabe-settings-card__row-text">
            <div className="freigabe-settings-card__label">HV-Standard übernehmen</div>
            <div className="freigabe-settings-card__hint">
              Aus = eigene Regeln nur für dieses Objekt
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={erben}
            className={cn('switch', erben && 'on')}
            disabled={pending}
            onClick={() => onToggleErben(!erben)}
          />
        </div>
      ) : null}

      {erben && kundeDefaults ? (
        <p className="freigabe-settings-card__erben-note">
          Wie Hausverwaltung
          {kundeDefaults.freigabe_schwelle_eur != null &&
          Number(kundeDefaults.freigabe_schwelle_eur) > 0
            ? ` · Schwelle ${formatEur(snapSchwelle(Number(kundeDefaults.freigabe_schwelle_eur)))}`
            : ' · ohne Schwelle'}
          {kundeDefaults.notfall_direkt !== false ? ' · Akut direkt' : ''}
        </p>
      ) : null}

      <div className={cn('freigabe-settings-card__body', erben && 'is-muted')}>
        <div className="freigabe-settings-card__row">
          <div className="freigabe-settings-card__row-text">
            <div className="freigabe-settings-card__label">Akut ohne Freigabe</div>
            <div className="freigabe-settings-card__hint">Notfall darf direkt beauftragt werden</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={akut}
            className={cn('switch', akut && 'on')}
            disabled={disabled}
            onClick={() => setAkut((v) => !v)}
          />
        </div>

        <div className="freigabe-settings-card__row">
          <div className="freigabe-settings-card__row-text">
            <div className="freigabe-settings-card__label">Schwellenwert</div>
            <div className="freigabe-settings-card__hint">
              Unter der Schwelle: Auto-Auftrag ohne Freigabe
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={schwelleAn}
            className={cn('switch', schwelleAn && 'on')}
            disabled={disabled}
            onClick={() => setSchwelleAn((v) => !v)}
          />
        </div>

        {schwelleAn ? (
          <div className="freigabe-settings-card__slider">
            <div className="freigabe-settings-card__slider-head">
              <span>Automatisch bis</span>
              <strong>{formatEur(schwelle)}</strong>
            </div>
            <input
              type="range"
              className="freigabe-settings-card__range"
              min={SCHWELLE_MIN}
              max={SCHWELLE_MAX}
              step={SCHWELLE_STEP}
              value={schwelle}
              disabled={disabled}
              aria-label="Schwellenwert in Euro"
              onChange={(e) => setSchwelle(snapSchwelle(Number(e.target.value)))}
            />
            <div className="freigabe-settings-card__slider-ends">
              <span>0 €</span>
              <span>5.000 €</span>
            </div>
          </div>
        ) : null}
      </div>

      {!erben ? (
        <div className="freigabe-settings-card__actions">
          <MockBtn sm kind="primary" disabled={pending || !dirty} onClick={() => speichern(buildPayload())}>
            Speichern
          </MockBtn>
        </div>
      ) : null}
    </MockCard>
  )
}

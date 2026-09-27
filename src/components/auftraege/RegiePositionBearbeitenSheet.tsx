'use client'

import { useCallback, useEffect, useState } from 'react'
import { MockField, MockInput, MockTextarea } from '@/components/mock-ui/MockForm'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import {
  loadRegiePositionFuerBearbeitung,
  updateRegiePositionInPruefung,
  type RegiePositionBearbeitenSnapshot,
} from '@/app/(dashboard)/auftraege/partner-positions-anfrage-actions'
import { formatEuro, formatNumber } from '@/lib/format/geld-datum'
import { toast } from '@/components/ui/app-toast'
import { actionBusy } from '@/components/ui/action-busy'

type FieldErrors = {
  titel?: string
  stunden?: string
  stundensatz?: string
  stundensatz_kunde?: string
  begruendung?: string
}

function toDisplayStunden(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return ''
  return formatNumber(n, { decimals: 1 })
}

function toDisplaySatz(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return ''
  return formatNumber(n, { decimals: 2 })
}

function parseStunden(raw: string): { ok: true; value: number } | { ok: false; message: string } {
  const s = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!s) return { ok: false, message: 'Stunden fehlen.' }
  if (!/^\d+(\.\d)?$/.test(s)) {
    return { ok: false, message: 'Stunden mit einer Nachkommastelle eingeben.' }
  }
  const n = Number(s)
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, message: 'Stunden müssen größer als 0 sein.' }
  }
  return { ok: true, value: n }
}

function parseSatz(
  raw: string,
  label: string
): { ok: true; value: number } | { ok: false; message: string } {
  const s = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!s) return { ok: false, message: `${label} fehlt.` }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) {
    return { ok: false, message: `${label} mit zwei Nachkommastellen eingeben.` }
  }
  const n = Number(s)
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, message: `${label} muss größer als 0 sein.` }
  }
  return { ok: true, value: n }
}

function parseOptionalNumber(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
  return String(a ?? '').trim() === String(b ?? '').trim()
}

function sameNum(a: number | null, b: number | null): boolean {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  return Object.is(a, b)
}

/**
 * Korrektur einer Regie-Position in Prüfung — EditorSheet detail.
 * Speichern ändert anerkennung_status nicht.
 */
export function RegiePositionBearbeitenSheet({
  open,
  positionId,
  onClose,
  onSaved,
}: {
  open: boolean
  positionId: string | null
  onClose: () => void
  onSaved?: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [baseline, setBaseline] = useState<RegiePositionBearbeitenSnapshot | null>(null)
  const [keinAufschlag, setKeinAufschlag] = useState(false)

  const [titel, setTitel] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [stunden, setStunden] = useState('')
  const [stundensatz, setStundensatz] = useState('')
  const [stundensatzKunde, setStundensatzKunde] = useState('')
  const [begruendung, setBegruendung] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})

  const reset = useCallback(() => {
    setTitel('')
    setBeschreibung('')
    setStunden('')
    setStundensatz('')
    setStundensatzKunde('')
    setBegruendung('')
    setErrors({})
    setLoadError(null)
    setKeinAufschlag(false)
    setBaseline(null)
  }, [])

  useEffect(() => {
    if (!open || !positionId) {
      reset()
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    void loadRegiePositionFuerBearbeitung(positionId).then((r) => {
      if (cancelled) return
      setLoading(false)
      if (!r.ok) {
        setLoadError(r.message)
        return
      }
      const p = r.position
      setBaseline(p)
      setTitel(p.titel)
      setBeschreibung(p.beschreibung ?? '')
      setStunden(toDisplayStunden(p.stunden))
      setStundensatz(toDisplaySatz(p.stundensatz))
      setStundensatzKunde(toDisplaySatz(p.stundensatz_kunde))
      setKeinAufschlag(p.keinAufschlagHinterlegt)
      setBegruendung('')
      setErrors({})
    })
    return () => {
      cancelled = true
    }
  }, [open, positionId, reset])

  const stundenNum = parseOptionalNumber(stunden)
  const satzPartner = parseOptionalNumber(stundensatz)
  const satzKunde = parseOptionalNumber(stundensatzKunde)
  const betragPartner =
    stundenNum != null && satzPartner != null && stundenNum > 0 && satzPartner > 0
      ? stundenNum * satzPartner
      : null
  const betragKunde =
    stundenNum != null && satzKunde != null && stundenNum > 0 && satzKunde > 0
      ? stundenNum * satzKunde
      : null

  function close() {
    if (pending) return
    onClose()
  }

  function save() {
    if (!positionId || pending || loading || !baseline) return

    const pStunden = parseStunden(stunden)
    const pPartner = parseSatz(stundensatz, 'Partnersatz')
    const pKunde = parseSatz(stundensatzKunde, 'Kundensatz')

    const next: FieldErrors = {}
    const t = titel.trim()
    if (!t) next.titel = 'Titel fehlt.'
    if (!pStunden.ok) next.stunden = pStunden.message
    if (!pPartner.ok) next.stundensatz = pPartner.message
    if (!pKunde.ok) next.stundensatz_kunde = pKunde.message

    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }
    if (!pStunden.ok || !pPartner.ok || !pKunde.ok) return

    const materialChanged =
      !sameText(baseline.titel, t) ||
      !sameNum(baseline.stunden, pStunden.value) ||
      !sameNum(baseline.stundensatz, pPartner.value) ||
      !sameNum(baseline.stundensatz_kunde, pKunde.value)

    if (materialChanged && !begruendung.trim()) {
      setErrors({
        begruendung:
          'Begründung ist Pflicht, wenn Titel, Stunden oder Sätze geändert werden.',
      })
      return
    }
    setErrors({})

    setPending(true)
    void actionBusy
      .run('Korrektur wird gespeichert…', async () => {
        const r = await updateRegiePositionInPruefung({
          positionId,
          titel: t,
          beschreibung: beschreibung.trim() || null,
          stunden: pStunden.value,
          stundensatz: pPartner.value,
          stundensatz_kunde: pKunde.value,
          begruendung: begruendung.trim() || null,
        })
        if (!r.ok) {
          if (r.message.includes('Begründung')) {
            setErrors({ begruendung: r.message })
          }
          toast.systemError(r)
          throw new Error(r.message)
        }
        toast.success(r.message ?? 'Gespeichert')
        onClose()
        onSaved?.()
      })
      .finally(() => setPending(false))
  }

  return (
    <EditorSheet
      open={open && Boolean(positionId)}
      onClose={close}
      title="Regie-Position bearbeiten"
      context="detail"
      size="md"
      primary={{
        label: pending ? '…' : 'Speichern',
        onClick: save,
        disabled: pending || loading || Boolean(loadError),
        busy: pending,
      }}
      secondary={{
        label: 'Abbrechen',
        onClick: close,
        disabled: pending,
      }}
    >
      {loading ? (
        <p className="text-[length:var(--fs-text)] text-bw-text-muted">Wird geladen…</p>
      ) : loadError ? (
        <p className="text-[length:var(--fs-text)] text-[var(--danger)]" role="alert">
          {loadError}
        </p>
      ) : (
        <div className="form-grid form-grid--sheet">
          <MockField label="Titel" required error={errors.titel} name="titel" full>
            <MockInput
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              disabled={pending}
            />
          </MockField>

          <MockField label="Beschreibung" name="beschreibung" full>
            <MockTextarea
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              rows={3}
              disabled={pending}
            />
          </MockField>

          <MockField label="Stunden" required error={errors.stunden} name="stunden">
            <MockInput
              inputMode="decimal"
              value={stunden}
              onChange={(e) => setStunden(e.target.value)}
              disabled={pending}
            />
          </MockField>

          <MockField
            label="Partnersatz (€/h)"
            required
            error={errors.stundensatz}
            name="stundensatz"
          >
            <MockInput
              inputMode="decimal"
              value={stundensatz}
              onChange={(e) => setStundensatz(e.target.value)}
              disabled={pending}
            />
          </MockField>

          <MockField
            label="Kundensatz (€/h)"
            required
            error={errors.stundensatz_kunde}
            hint={keinAufschlag ? 'kein Aufschlag hinterlegt' : undefined}
            name="stundensatz_kunde"
          >
            <MockInput
              inputMode="decimal"
              value={stundensatzKunde}
              onChange={(e) => setStundensatzKunde(e.target.value)}
              disabled={pending}
            />
          </MockField>

          <div className="full space-y-1 text-[length:var(--fs-meta)] text-bw-text-muted tabular-nums">
            <p>
              Partner{' '}
              {stundenNum != null
                ? formatNumber(stundenNum, { decimals: 1 })
                : '—'}{' '}
              Std ×{' '}
              {satzPartner != null
                ? formatEuro(satzPartner, { style: 'currency' })
                : '—'}{' '}
              ={' '}
              {betragPartner != null
                ? formatEuro(betragPartner, { style: 'currency' })
                : '—'}
            </p>
            <p>
              Kunde{' '}
              {stundenNum != null
                ? formatNumber(stundenNum, { decimals: 1 })
                : '—'}{' '}
              Std ×{' '}
              {satzKunde != null
                ? formatEuro(satzKunde, { style: 'currency' })
                : '—'}{' '}
              ={' '}
              {betragKunde != null
                ? formatEuro(betragKunde, { style: 'currency' })
                : '—'}
            </p>
          </div>

          <MockField
            label="Begründung"
            required
            error={errors.begruendung}
            hint="Pflicht bei Änderung von Titel, Stunden oder Sätzen. Nur Beschreibung: optional."
            name="begruendung"
            full
          >
            <MockTextarea
              value={begruendung}
              onChange={(e) => setBegruendung(e.target.value)}
              rows={3}
              disabled={pending}
            />
          </MockField>
        </div>
      )}
    </EditorSheet>
  )
}

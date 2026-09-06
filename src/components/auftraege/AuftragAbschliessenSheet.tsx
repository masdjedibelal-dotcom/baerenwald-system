'use client'

import { useEffect, useMemo, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import {
  AbnahmeBegehListe,
  AbnahmeMaengelCheckliste,
  AbnahmeProgressBar,
  countAbgenommeneLeistungen,
} from '@/components/auftraege/AbnahmeBegehListe'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import { actionBusy } from '@/components/ui/action-busy'
import {
  abschliessenMitHwProtokoll,
  getAbschliessenKontext,
  saveAbnahmeAndAbschliessen,
  type AbschliessenHwProtokollVorschau,
} from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import { updateAuftragStatusFromUi } from '@/app/(dashboard)/auftraege/actions'
import { emptyAbnahmeProtokollMeta } from '@/lib/auftraege/abnahme-protokoll-meta'
import {
  maengelFromCheckItems,
  type AbnahmeMangelCheckItem,
  type AbnahmePunkt,
} from '@/lib/auftraege/abnahme-protokoll-types'
import { heuteYmd } from '@/lib/angebot-einfach'
import { formatDatum } from '@/lib/utils'
import type { AuftragPosition } from '@/lib/types'

type Step = 'loading' | 'hw' | 'frage' | 'checkliste'

/**
 * Auftrag abschließen (Abnahme optional):
 * - Mit HW-Protokoll: Vorschau übernehmen oder ohne Abnahme schließen
 * - Ohne HW-Protokoll: Frage → optional manuelle Checkliste oder direkt schließen
 * Abschluss ohne Abnahme wird nie durch fehlende HW-Teilabnahme blockiert.
 */
export function AuftragAbschliessenSheet({
  open,
  onClose,
  auftragId,
  positionen,
  onDone,
  onNachRechnung,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  positionen: AuftragPosition[]
  onDone?: () => void
  /** Nach Abschluss ohne Abnahme — z. B. Rechnung öffnen */
  onNachRechnung?: () => void
}) {
  const [pending, setPending] = useState(false)
  const [pendingKind, setPendingKind] = useState<'save' | 'send' | null>(null)
  const [step, setStep] = useState<Step>('loading')
  const [hwProtokolle, setHwProtokolle] = useState<AbschliessenHwProtokollVorschau[]>([])
  const [punkte, setPunkte] = useState<AbnahmePunkt[]>([])
  const [maengelItems, setMaengelItems] = useState<AbnahmeMangelCheckItem[]>([])
  const [notizen, setNotizen] = useState('')

  useEffect(() => {
    if (!open) return
    setStep('loading')
    setHwProtokolle([])
    setPunkte([])
    setMaengelItems([])
    setNotizen('')
    setPendingKind(null)
    let cancelled = false
    void getAbschliessenKontext(auftragId).then((ctx) => {
      if (cancelled) return
      // Nur wenn tatsächlich HW-Protokolle vorliegen — sonst nie Freigabe-Pipeline erzwingen.
      if (ctx.mode === 'hw' && ctx.protokolle.length) {
        setHwProtokolle(ctx.protokolle)
        setStep('hw')
      } else {
        setStep('frage')
      }
    })
    return () => {
      cancelled = true
    }
  }, [open, auftragId])

  const progress = useMemo(() => countAbgenommeneLeistungen(punkte), [punkte])

  function abschliessenOhneAbnahme() {
    if (pending) return
    setPending(true)
    void actionBusy
      .run('Auftrag wird abgeschlossen…', async () => {
        const r = await updateAuftragStatusFromUi(auftragId, 'abgeschlossen')
        if (!r.ok) {
          toast.error(r.message)
          throw new Error(r.message)
        }
        toast.success('Auftrag abgeschlossen')
        onClose()
        onDone?.()
        onNachRechnung?.()
      })
      .finally(() => setPending(false))
  }

  function speichernMitHwProtokoll(sendToKunde: boolean) {
    if (pending) return
    setPendingKind(sendToKunde ? 'send' : 'save')
    setPending(true)
    void actionBusy
      .run(
        sendToKunde ? 'Wird gespeichert und gesendet…' : 'Auftrag wird abgeschlossen…',
        async () => {
          const r = await abschliessenMitHwProtokoll({
            auftragId,
            sendToKunde,
          })
          if (!r.ok) {
            toast.error(r.message)
            throw new Error(r.message)
          }
          if (r.sendWarning) {
            toast.error(`Abgeschlossen, Versand fehlgeschlagen: ${r.sendWarning}`)
          } else {
            toast.success(
              r.sentToKunde
                ? 'Protokoll gesendet — Auftrag abgeschlossen'
                : 'Auftrag abgeschlossen'
            )
          }
          onClose()
          onDone?.()
        }
      )
      .finally(() => {
        setPending(false)
        setPendingKind(null)
      })
  }

  function speichernMitAbnahme(sendToKunde: boolean) {
    if (pending) return
    setPendingKind(sendToKunde ? 'send' : 'save')
    setPending(true)
    void actionBusy
      .run(
        sendToKunde ? 'Wird gespeichert und gesendet…' : 'Abnahme wird gespeichert…',
        async () => {
          const maengel = maengelFromCheckItems(maengelItems)
          const hatMaengel = maengel.length > 0
          const meta = emptyAbnahmeProtokollMeta({
            abnahme_ergebnis: hatMaengel ? 'mit_vorbehalt' : 'abgenommen',
          })
          const r = await saveAbnahmeAndAbschliessen({
            auftragId,
            abnahmeDatum: heuteYmd(),
            punkte,
            maengel,
            notizen: notizen.trim() || null,
            meta,
            sendToKunde,
          })
          if (!r.ok) {
            toast.error(r.message)
            throw new Error(r.message)
          }
          if (r.sendWarning) {
            toast.error(
              `Gespeichert und abgeschlossen, Versand fehlgeschlagen: ${r.sendWarning}`
            )
          } else {
            toast.success(
              r.sentToKunde
                ? 'Protokoll gesendet — Auftrag abgeschlossen'
                : 'Abnahme gespeichert — Auftrag abgeschlossen'
            )
          }
          onClose()
          onDone?.()
        }
      )
      .finally(() => {
        setPending(false)
        setPendingKind(null)
      })
  }

  if (step === 'loading') {
    return (
      <EditorSheet open={open} onClose={onClose} title="Auftrag abschließen" size="md">
        <p className="text-[length:var(--fs-text)] text-[var(--text-2)] m-0">Wird geladen…</p>
      </EditorSheet>
    )
  }

  if (step === 'hw') {
    return (
      <EditorSheet
        open={open}
        onClose={onClose}
        title="Auftrag abschließen"
        size="lg"
        footer={
          <div className="sheet-footer-actions zahlplan-editor-footer">
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={abschliessenOhneAbnahme}
            >
              Ohne Abnahme
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              loading={pending && pendingKind === 'save'}
              onClick={() => speichernMitHwProtokoll(false)}
            >
              Speichern
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={pending}
              loading={pending && pendingKind === 'send'}
              onClick={() => speichernMitHwProtokoll(true)}
            >
              Senden
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <p className="m-0 text-[length:var(--fs-text)] text-[var(--text-2)] leading-relaxed">
            Handwerker-Protokoll vorhanden — optional übernehmen. Auftrag kann auch ohne
            Abnahme geschlossen werden.
          </p>
          {hwProtokolle.map((p) => (
            <HwProtokollVorschau key={p.id} protokoll={p} />
          ))}
        </div>
      </EditorSheet>
    )
  }

  if (step === 'frage') {
    return (
      <EditorSheet
        open={open}
        onClose={onClose}
        title="Auftrag abschließen"
        size="md"
        footer={
          <div className="sheet-footer-actions zahlplan-editor-footer">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={abschliessenOhneAbnahme}
            >
              Ohne Abnahme
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={pending}
              loading={pending}
              onClick={() => setStep('checkliste')}
            >
              Abnahme erstellen
            </Button>
          </div>
        }
      >
        <p className="text-[length:var(--fs-text)] text-[var(--text-2)] leading-relaxed m-0">
          Abnahme ist optional. Du kannst den Auftrag direkt abschließen oder ein
          Abnahmeprotokoll mit Leistungs-Checkliste und Mängeln erstellen. Signatur erfolgt
          vor Ort / im Portal — nicht hier.
        </p>
      </EditorSheet>
    )
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Abnahmeprotokoll"
      size="lg"
      dirty={!pending}
      footer={
        <div className="sheet-footer-actions zahlplan-editor-footer">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            loading={pending && pendingKind === 'save'}
            onClick={() => speichernMitAbnahme(false)}
          >
            Speichern
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={pending}
            loading={pending && pendingKind === 'send'}
            onClick={() => speichernMitAbnahme(true)}
          >
            Senden
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <AbnahmeProgressBar done={progress.done} total={progress.total} />
        <div>
          <h3 className="m-0 mb-2 text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-[var(--text-3)]">
            Leistungen
          </h3>
          <AbnahmeBegehListe
            punkte={punkte}
            onChange={setPunkte}
            katalogPositionen={positionen}
          />
        </div>
        <div>
          <h3 className="m-0 mb-2 text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-[var(--text-3)]">
            Mängel (optional)
          </h3>
          <AbnahmeMaengelCheckliste items={maengelItems} onChange={setMaengelItems} />
        </div>
        <label className="block">
          <span className="lt-field-lbl">Notizen</span>
          <Textarea
            long
            plain
            value={notizen}
            onChange={(e) => setNotizen(e.target.value)}
            placeholder="Optional"
          />
        </label>
      </div>
    </EditorSheet>
  )
}

function HwProtokollVorschau({
  protokoll: p,
}: {
  protokoll: AbschliessenHwProtokollVorschau
}) {
  const okCount = p.punkte.filter((x) => String(x.status).toLowerCase() === 'ok').length
  const offenMaengel = p.maengel.filter((m) => {
    const st = String(m.status ?? 'offen').toLowerCase()
    return st !== 'behoben' && st !== 'abgenommen'
  })

  return (
    <section className="space-y-3">
      <div>
        <h3 className="m-0 text-[length:var(--fs-text)] font-semibold text-[var(--text-1)]">
          {p.handwerkerName}
        </h3>
        <p className="m-0 mt-1 text-[length:var(--fs-meta)] text-[var(--text-3)]">
          {[
            p.abnahmeDatum ? `Datum ${formatDatum(p.abnahmeDatum)}` : null,
            p.ort ? `Ort: ${p.ort}` : null,
            p.ergebnisLabel,
            p.freigabeStatus === 'zur_freigabe' ? 'Noch zur Freigabe — wird beim Speichern freigegeben' : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {(p.unterzeichnerHw || p.unterzeichnerKunde) && (
          <p className="m-0 mt-1 text-[length:var(--fs-meta)] text-[var(--text-3)]">
            {[
              p.unterzeichnerHw ? `HW: ${p.unterzeichnerHw}` : null,
              p.unterzeichnerKunde ? `Kunde: ${p.unterzeichnerKunde}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>

      {p.pdfUrl ? (
        <div className="overflow-hidden rounded-[var(--radius-md,8px)] border border-[var(--border)] bg-[var(--surface-2,#f6f6f4)]">
          <iframe
            title={`Abnahmeprotokoll ${p.handwerkerName}`}
            src={p.pdfUrl}
            className="h-[min(52vh,420px)] w-full bg-white"
          />
          <div className="border-t border-[var(--border)] px-3 py-2">
            <a
              href={p.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[length:var(--fs-meta)] text-[var(--accent)] underline-offset-2 hover:underline"
            >
              PDF in neuem Tab öffnen
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-[var(--radius-md,8px)] border border-[var(--border)] p-3">
          <p className="m-0 text-[length:var(--fs-meta)] text-[var(--text-3)]">
            PDF noch nicht erzeugt — Inhalt aus dem Protokoll:
          </p>
          <AbnahmeProgressBar done={okCount} total={p.punkte.length} />
          {p.punkte.length > 0 ? (
            <ul className="m-0 list-none space-y-1.5 p-0">
              {p.punkte.map((pkt, i) => (
                <li
                  key={pkt.id || pkt.leistung_id || `p-${i}`}
                  className="text-[length:var(--fs-text)] text-[var(--text-1)]"
                >
                  <span className="text-[var(--text-3)]">
                    {String(pkt.status).toLowerCase() === 'ok' ? '✓' : '○'}{' '}
                  </span>
                  {(pkt.leistung_name ?? pkt.beschreibung)?.trim() || 'Leistung'}
                </li>
              ))}
            </ul>
          ) : null}
          {offenMaengel.length > 0 ? (
            <div>
              <p className="m-0 mb-1 text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-[var(--text-3)]">
                Mängel
              </p>
              <ul className="m-0 list-disc space-y-1 pl-5">
                {offenMaengel.map((m, i) => (
                  <li key={m.punkt_id || `m-${i}`} className="text-[length:var(--fs-text)]">
                    {m.titel?.trim() || m.beschreibung?.trim() || 'Mangel'}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="m-0 text-[length:var(--fs-meta)] text-[var(--text-3)]">Keine offenen Mängel</p>
          )}
          {p.notizen?.trim() ? (
            <p className="m-0 text-[length:var(--fs-text)] text-[var(--text-2)] whitespace-pre-wrap">
              {p.notizen.trim()}
            </p>
          ) : null}
        </div>
      )}
    </section>
  )
}

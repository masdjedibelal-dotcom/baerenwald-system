'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockField, MockTextarea } from '@/components/mock-ui/MockForm'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import {
  AbnahmeBegehListe,
  AbnahmeMaengelCheckliste,
  AbnahmeProgressBar,
  countAbgenommeneLeistungen,
} from '@/components/auftraege/AbnahmeBegehListe'
<<<<<<< Updated upstream
import { SkeletonCard } from '@/components/ui/Skeleton'
=======
import { MockBtn } from '@/components/mock-ui'
import { Textarea } from '@/components/ui/Textarea'
>>>>>>> Stashed changes
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
  buildAbnahmePunkteInitial,
  maengelFromCheckItems,
  type AbnahmeMangelCheckItem,
  type AbnahmePunkt,
} from '@/lib/auftraege/abnahme-protokoll-types'
import { heuteYmd } from '@/lib/angebot-einfach'
import { formatDatum } from '@/lib/utils'
import type { AuftragPosition } from '@/lib/types'
import { C } from '@/lib/tokens/colors'
import { TOAST } from '@/lib/copy'

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
  const router = useRouter()
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

  function openAbnahmeWizard() {
    // Kein onClose() vor push: EditorSheet-Cleanup macht sonst history.back()
    // und frisst die neue URL (wirkt mobil wie „Abnahme starten tut nichts“).
    router.push(`/auftraege/${auftragId}/abnahme/erstellen`)
  }

  function abschliessenOhneAbnahme() {
    if (pending) return
    setPending(true)
    void actionBusy
      .run('Auftrag wird abgeschlossen…', async () => {
        const r = await updateAuftragStatusFromUi(auftragId, 'abgeschlossen')
        if (!r.ok) {
          toast.systemError(r)
          throw new Error(r.message)
        }
        toast.success(TOAST.auftrag_abgeschlossen)
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
            toast.systemError(r)
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
    const readyPunkte =
      punkte.length > 0
        ? punkte
        : buildAbnahmePunkteInitial({ positionen }).map((p) => ({
            ...p,
            status: 'ok' as const,
          }))
    if (!readyPunkte.some((p) => p.status === 'ok' || p.status === 'mangel')) {
      toast.error(TOAST.mindestens_eine_leistung_fuer_die_abnahme_auswae_2)
      return
    }
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
            punkte: readyPunkte,
            maengel,
            notizen: notizen.trim() || null,
            meta,
            sendToKunde,
          })
          if (!r.ok) {
            toast.systemError(r)
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
      <EditorSheet
        open={open}
        onClose={onClose}
        title="Auftrag abschließen"
        size="md"
        manageHistory={false}
      >
        <div className="space-y-3" role="status" aria-busy="true" aria-label="Wird geladen">
          <SkeletonCard />
          <SkeletonCard />
        </div>
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
        manageHistory={false}
<<<<<<< Updated upstream
        secondary={{
          label: 'Speichern',
          disabled: pending,
          busy: pending && pendingKind === 'save',
          onClick: () => speichernMitHwProtokoll(false),
        }}
        primary={{
          label: 'Senden',
          disabled: pending,
          busy: pending && pendingKind === 'send',
          onClick: () => speichernMitHwProtokoll(true),
        }}
=======
        footer={
          <div className="sheet-footer-actions zahlplan-editor-footer">
            <MockBtn
              type="button"
              kind="ghost"
              disabled={pending}
              onClick={abschliessenOhneAbnahme}
            >
              Ohne Abnahme
            </MockBtn>
            <MockBtn
              type="button"
              kind="secondary"
              disabled={pending}
              loading={pending && pendingKind === 'save'}
              onClick={() => speichernMitHwProtokoll(false)}
            >
              Speichern
            </MockBtn>
            <MockBtn
              type="button"
              kind="primary"
              disabled={pending}
              loading={pending && pendingKind === 'send'}
              onClick={() => speichernMitHwProtokoll(true)}
            >
              Senden
            </MockBtn>
          </div>
        }
>>>>>>> Stashed changes
      >
        <div className="space-y-5">
          <p className="m-0 text-[length:var(--fs-text)] text-[var(--text-2)] leading-relaxed">
            Partner-Protokoll vorhanden — optional übernehmen. Auftrag kann auch ohne
            Abnahme geschlossen werden.
          </p>
          {hwProtokolle.map((p) => (
            <HwProtokollVorschau key={p.id} protokoll={p} />
          ))}
<<<<<<< Updated upstream
          <div className="flex flex-wrap gap-2">
            <MockBtn
              type="button"
              kind="ghost"
              disabled={pending}
              onClick={abschliessenOhneAbnahme}
            >
              Ohne Abnahme
            </MockBtn>
            <MockBtn type="button" kind="secondary" onClick={openAbnahmeWizard}>
              Eigenes Abnahmeprotokoll erstellen
            </MockBtn>
          </div>
=======
          <MockBtn type="button" kind="secondary" onClick={openAbnahmeWizard}>
            Eigenes Abnahmeprotokoll erstellen
          </MockBtn>
>>>>>>> Stashed changes
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
        manageHistory={false}
<<<<<<< Updated upstream
        secondary={{
          label: 'Ohne Abnahme',
          disabled: pending,
          onClick: abschliessenOhneAbnahme,
        }}
        primary={{
          label: 'Abnahme erstellen',
          disabled: pending,
          onClick: openAbnahmeWizard,
        }}
=======
        footer={
          <div className="sheet-footer-actions zahlplan-editor-footer">
            <MockBtn
              type="button"
              kind="secondary"
              disabled={pending}
              onClick={abschliessenOhneAbnahme}
            >
              Ohne Abnahme
            </MockBtn>
            <MockBtn type="button" kind="primary" disabled={pending} onClick={openAbnahmeWizard}>
              Abnahme erstellen
            </MockBtn>
          </div>
        }
>>>>>>> Stashed changes
      >
        <p className="text-[length:var(--fs-text)] text-[var(--text-2)] leading-relaxed m-0">
          Abnahme ist optional. Du kannst den Auftrag direkt abschließen oder ein
          Abnahmeprotokoll mit Leistungen, Mängeln und Unterschriften erstellen.
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
      manageHistory={false}
      dirty={!pending}
<<<<<<< Updated upstream
      secondary={{
        label: 'Speichern',
        disabled: pending,
        busy: pending && pendingKind === 'save',
        onClick: () => speichernMitAbnahme(false),
      }}
      primary={{
        label: 'Senden',
        disabled: pending,
        busy: pending && pendingKind === 'send',
        onClick: () => speichernMitAbnahme(true),
      }}
=======
      footer={
        <div className="sheet-footer-actions zahlplan-editor-footer">
          <MockBtn
            type="button"
            kind="secondary"
            disabled={pending}
            loading={pending && pendingKind === 'save'}
            onClick={() => speichernMitAbnahme(false)}
          >
            Speichern
          </MockBtn>
          <MockBtn
            type="button"
            kind="primary"
            disabled={pending}
            loading={pending && pendingKind === 'send'}
            onClick={() => speichernMitAbnahme(true)}
          >
            Senden
          </MockBtn>
        </div>
      }
>>>>>>> Stashed changes
    >
      <div className="space-y-5">
        <AbnahmeProgressBar done={progress.done} total={progress.total || positionen.length} />
        <div>
          <h3 className="m-0 mb-2 text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-[var(--text-3)]">
            Leistungen
          </h3>
          <AbnahmeBegehListe
            punkte={
              punkte.length
                ? punkte
                : buildAbnahmePunkteInitial({ positionen }).map((p) => ({
                    ...p,
                    status: 'ok' as const,
                  }))
            }
            onChange={setPunkte}
            katalogPositionen={positionen}
          />
        </div>
        <div>
          <h3 className="m-0 mb-2 text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-[var(--text-3)]">
            Mängel (optional)
          </h3>
          <AbnahmeMaengelCheckliste
            items={maengelItems}
            onChange={setMaengelItems}
            auftragId={auftragId}
          />
        </div>
        <label className="block">
          <span className="lt-field-lbl">Notizen</span>
          <MockTextarea value={notizen} onChange={(e) => setNotizen(e.target.value)} placeholder="Optional" rows={14} className="resize-y py-2 ta--long" />
        </label>
        <MockBtn type="button" kind="ghost" sm onClick={openAbnahmeWizard}>
          Vollständiges Protokoll mit Unterschriften…
        </MockBtn>
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
        <div className={`overflow-hidden rounded-[var(--radius-md,8px)] border border-[var(--border)] bg-[var(--surface-2,${C.bgSoft})]`}>
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
            <p className="m-0 text-[length:var(--fs-meta)] text-[var(--text-3)]">Offene Mängel: keine</p>
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

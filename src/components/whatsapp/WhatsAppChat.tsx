'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import {
  ladeWhatsAppVerlauf,
  sendeWhatsApp,
  sendeWhatsAppAnhang,
  simuliereWhatsAppAntwort,
  whatsAppAlsDokument,
  whatsAppMarkieren,
  whatsAppUebernehmen,
  whatsAppZuordnen,
  type WaNachricht,
  type WaVerlauf,
  type WaZiel,
} from '@/app/(dashboard)/whatsapp/actions'
import { MockBadge, MockBtn, MockSegment } from '@/components/mock-ui'
import { MockField, MockInput, MockTextarea } from '@/components/mock-ui/MockForm'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockPopover } from '@/components/mock-ui/MockPopover'
import { useIsMobile } from '@/hooks/useIsMobile'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { toast } from '@/components/ui/app-toast'
import { ClearableNumberInput } from '@/components/ui/ClearableNumberInput'
import { safeAction } from '@/lib/actions/safe-action'
import { createClient } from '@/lib/supabase'
import { formatDatum } from '@/lib/format/geld-datum'
import { DOKUMENT_ARTEN, DOKUMENT_ART_LABEL, type DokumentArt } from '@/lib/types'
import { cn } from '@/lib/utils'
import { waNummerAnzeige } from '@/lib/whatsapp/telefon'

const MARKIERUNG: Record<'update' | 'regie' | 'erledigt', string> = {
  update: 'Als Update übernommen',
  regie: 'Als Regie übernommen',
  erledigt: 'Erledigt',
}

function uhrzeit(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function tag(iso: string): string {
  const d = new Date(iso)
  const heute = new Date()
  const gestern = new Date()
  gestern.setDate(heute.getDate() - 1)
  if (d.toDateString() === heute.toDateString()) return 'Heute'
  if (d.toDateString() === gestern.toDateString()) return 'Gestern'
  return formatDatum(iso)
}

/** ✓ gesendet · ✓✓ zugestellt · blaue ✓✓ gelesen · ! Fehler */
function Haken({ status }: { status: string }) {
  if (status === 'fehler') return <span className="wa-haken wa-haken--fehler">!</span>
  if (status === 'wartend') return <MockIcon ctx="default" n="clock" size={12} className="wa-haken" />
  return (
    <span className={cn('wa-haken', status === 'gelesen' && 'wa-haken--gelesen')} aria-label={status}>
      {status === 'zugestellt' || status === 'gelesen' ? '✓✓' : '✓'}
    </span>
  )
}

function Laden({ m }: { m: NonNullable<WaNachricht['medium']> }) {
  return (
    <a
      className="wa-laden"
      href={m.download}
      download={m.name}
      target="_blank"
      rel="noreferrer"
      title="Herunterladen"
      aria-label={`${m.name} herunterladen`}
      onClick={(e) => e.stopPropagation()}
    >
      <MockIcon ctx="default" n="download" size={16} />
    </a>
  )
}

/** Foto, Video, Sprachnachricht oder Dokument — anzeigen/abspielen und herunterladen. */
function Medium({ m, onLoad }: { m: NonNullable<WaNachricht['medium']>; onLoad?: () => void }) {
  const mime = m.mime ?? ''
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()
  if (mime.startsWith('image/')) {
    return (
      <span className="wa-medium">
        <a href={m.url} target="_blank" rel="noreferrer" className="wa-bild" onClick={stop}>
          {/* eslint-disable-next-line @next/next/no-img-element -- befristete Storage-Links */}
          <img src={m.url} alt={m.name} onLoad={onLoad} />
        </a>
        <Laden m={m} />
      </span>
    )
  }
  if (mime.startsWith('video/')) {
    return (
      <span className="wa-medium">
        <video className="wa-video" src={m.url} controls playsInline preload="metadata" onLoadedMetadata={onLoad} onClick={stop} />
        <Laden m={m} />
      </span>
    )
  }
  if (mime.startsWith('audio/')) {
    return (
      <span className="wa-audio" onClick={stop}>
        <MockIcon ctx="default" n="microphone" size={16} />
        <audio src={m.url} controls preload="metadata" />
        <Laden m={m} />
      </span>
    )
  }
  return (
    <span className="wa-datei">
      <a href={m.url} target="_blank" rel="noreferrer" className="wa-datei__name" onClick={stop}>
        <MockIcon ctx="default" n="file-text" size={18} />
        <span>{m.name}</span>
      </a>
      <Laden m={m} />
    </span>
  )
}

/**
 * Ein Chat im Postfach „Nachrichten“: kompletter Verlauf mit dem Kontakt (über alle Aufträge).
 * Eingehende Nachricht antippen → einordnen (Auftrag/Einsatz wählen, Update/Regie/Dokument/erledigt).
 */
export function WhatsAppChat({
  ziel,
  name,
  zurueck,
  onChanged,
}: {
  ziel: WaZiel
  name: string
  /** Mobil: Zurück zur Liste */
  zurueck?: ReactNode
  onChanged?: () => void
}) {
  const [verlauf, setVerlauf] = useState<WaVerlauf | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [senden, setSenden] = useState(false)
  const [simText, setSimText] = useState('')
  const [simOffen, setSimOffen] = useState(false)
  const [anhang, setAnhang] = useState<File | null>(null)
  const dateiRef = useRef<HTMLInputElement>(null)
  const [aktiv, setAktiv] = useState<{ n: WaNachricht; el: HTMLElement } | null>(null)
  const listeRef = useRef<HTMLDivElement>(null)
  const zielKey = `${ziel.handwerkerId ?? ''}|${ziel.kundeId ?? ''}|${ziel.telefon ?? ''}`

  const laden = useCallback(async () => {
    const res = await safeAction(ladeWhatsAppVerlauf(ziel, { gelesen: true }))
    if (!res.ok) {
      setFehler(res.message)
      return
    }
    setFehler(null)
    setVerlauf(res)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ziel über zielKey
  }, [zielKey])

  useEffect(() => {
    setVerlauf(null)
    setText('')
    setAnhang(null)
    setAktiv(null)
    void laden().then(() => onChanged?.())
    // Neue Nachrichten (Webhook) nachladen, solange der Chat offen ist
    const t = window.setInterval(() => void laden(), 15000)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onChanged nur nach dem ersten Laden (Zähler)
  }, [laden])

  const sichtbar = verlauf?.nachrichten ?? []

  const nachUnten = useCallback(() => {
    const el = listeRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  useEffect(() => {
    nachUnten()
  }, [sichtbar.length, nachUnten])

  async function absenden() {
    if (!text.trim() && !anhang) return
    setSenden(true)
    const kontext = { ziel, auftragId: null, einsatzId: null }
    let res: { ok: true } | { ok: false; message: string } = { ok: true }
    if (anhang) {
      res = await anhangSenden(anhang, kontext)
      // Sprachnachrichten haben bei WhatsApp keine Bildunterschrift → Text getrennt hinterher
      if (res.ok && text.trim() && anhang.type.startsWith('audio/')) {
        res = await safeAction(sendeWhatsApp({ ...kontext, text }))
      }
    } else {
      res = await safeAction(sendeWhatsApp({ ...kontext, text }))
    }
    setSenden(false)
    if (!res.ok) {
      toast.error(res.message)
      await laden()
      return
    }
    setText('')
    setAnhang(null)
    await laden()
    onChanged?.()
  }

  /** Datei direkt in den privaten Bucket laden (große Videos), dann über den Server senden. */
  async function anhangSenden(
    datei: File,
    kontext: { ziel: WaZiel; auftragId: string | null; einsatzId: string | null }
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    const ext = (datei.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
    const pfad = `crm/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`
    const mime = datei.type || 'application/octet-stream'
    const { error } = await createClient()
      .storage.from('whatsapp-medien')
      .upload(pfad, datei, { contentType: mime, upsert: false })
    if (error) return { ok: false, message: 'Anhang konnte nicht hochgeladen werden.' }
    return safeAction(
      sendeWhatsAppAnhang({
        ...kontext,
        pfad,
        name: datei.name,
        mime,
        text: datei.type.startsWith('audio/') ? undefined : text.trim() || undefined,
      })
    )
  }

  function dateiGewaehlt(liste: FileList | null) {
    const datei = liste?.[0] ?? null
    if (dateiRef.current) dateiRef.current.value = ''
    if (!datei) return
    // WhatsApp-Grenzen: Fotos 5 MB, Video/Audio 16 MB, Dokumente 100 MB
    const mb = datei.size / 1024 / 1024
    const grenze = datei.type === 'image/jpeg' || datei.type === 'image/png' ? 5 : /^(video|audio)\//.test(datei.type) ? 16 : 100
    if (mb > grenze) {
      toast.error(`Datei zu groß — WhatsApp erlaubt hier höchstens ${grenze} MB.`)
      return
    }
    setAnhang(datei)
  }

  async function simulieren(input: {
    text?: string
    knopf?: { id: string; titel: string }
    medium?: 'bild' | 'dokument' | 'audio' | 'video'
  }) {
    const res = await safeAction(simuliereWhatsAppAntwort({ ziel, ...input }))
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    setSimText('')
    await laden()
    onChanged?.()
  }

  // Offene Knöpfe der letzten ausgehenden Nachricht (Testmodus: „Annehmen“ tippen)
  const offeneKnoepfe = useMemo(() => {
    const liste = verlauf?.nachrichten ?? []
    const letzteAus = [...liste].reverse().find((n) => n.richtung === 'aus' && n.knoepfe.length)
    if (!letzteAus) return []
    const beantwortet = liste.some(
      (n) => n.richtung === 'ein' && n.knopf_id && letzteAus.knoepfe.some((k) => k.id === n.knopf_id)
    )
    return beantwortet ? [] : letzteAus.knoepfe
  }, [verlauf])

  const mock = verlauf?.modus === 'mock'
  let letzterTag = ''

  return (
    <>
      <section className="wa-pane">
        <header className="wa-pane__kopf">
          {zurueck}
          <div className="wa-pane__titel">
            <span className="wa-pane__name">{name || verlauf?.kontakt?.name || 'WhatsApp'}</span>
            {verlauf?.kontakt ? <span className="wa-pane__nr">{waNummerAnzeige(verlauf.kontakt.nummer)}</span> : null}
          </div>
        </header>
        <div className="wa-chat">
          {mock ? (
            <div className="wa-hinweis">
              <MockIcon ctx="default" n="info-circle" size={15} />
              <span>
                Testmodus: Es geht nichts an WhatsApp raus. Antworten des Kontakts unten simulieren.
              </span>
            </div>
          ) : null}

          <div className="wa-verlauf" ref={listeRef}>
            {fehler ? <p className="wa-leer">{fehler}</p> : null}
            {!verlauf && !fehler ? <p className="wa-leer">Wird geladen …</p> : null}
            {verlauf && !sichtbar.length ? (
              <p className="wa-leer">Noch keine Nachrichten.</p>
            ) : null}
            {sichtbar.map((n) => {
              const t = tag(n.created_at)
              const trenner = t !== letzterTag
              letzterTag = t
              const ein = n.richtung === 'ein'
              const zuordnung = n.einsatz_titel || n.auftrag_titel
              return (
                <div key={n.id} className="wa-zeile-wrap">
                  {trenner ? <div className="wa-tag">{t}</div> : null}
                  <div className={cn('wa-zeile', ein ? 'wa-zeile--ein' : 'wa-zeile--aus')}>
                    {/* div statt Button: Videos, Audio und Links in der Blase bleiben bedienbar */}
                    <div
                      className={cn('wa-blase', ein ? 'wa-blase--ein' : 'wa-blase--aus', n.ungelesen && 'is-neu')}
                      {...(ein
                        ? {
                            role: 'button',
                            tabIndex: 0,
                            title: 'Nachricht einordnen',
                            onClick: (e: React.MouseEvent<HTMLElement>) => setAktiv({ n, el: e.currentTarget }),
                            onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setAktiv({ n, el: e.currentTarget })
                              }
                            },
                          }
                        : {})}
                    >
                      {n.vorlage ? <span className="wa-vorlage">Vorlage</span> : null}
                      {n.medium ? <Medium m={n.medium} onLoad={nachUnten} /> : null}
                      {n.text ? <span className="wa-text">{n.text}</span> : null}
                      {n.knoepfe.length ? (
                        <span className="wa-knoepfe">
                          {n.knoepfe.map((k) => (
                            <span key={k.id} className="wa-knopf">
                              {k.titel}
                            </span>
                          ))}
                        </span>
                      ) : null}
                      <span className="wa-meta">
                        {zuordnung ? (
                          <span className="wa-zuordnung">{zuordnung}</span>
                        ) : ein && !n.auftrag_id ? (
                          <span className="wa-zuordnung wa-zuordnung--offen">nicht zugeordnet</span>
                        ) : null}
                        <span>{uhrzeit(n.created_at)}</span>
                        {!ein ? <Haken status={n.status} /> : null}
                      </span>
                      {n.markierung ? <span className="wa-markierung">{MARKIERUNG[n.markierung]}</span> : null}
                      {n.fehler ? <span className="wa-fehler">{n.fehler}</span> : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {verlauf?.ohneNummer ? (
            <p className="wa-leer">Keine Handynummer hinterlegt — bitte in den Stammdaten eintragen.</p>
          ) : verlauf ? (
            <div className="wa-eingabe">
              {!verlauf.imFenster ? (
                <p className="wa-fenster">
                  Seit über 24 Std. keine Nachricht vom Kontakt: Ihre Nachricht geht als Vorlage „Nachricht von
                  Bärenwald“ raus.
                </p>
              ) : null}
              {anhang ? (
                <div className="wa-anhang">
                  <MockIcon
                    ctx="default"
                    n={anhang.type.startsWith('audio/') ? 'microphone' : anhang.type.startsWith('image/') ? 'camera' : 'paperclip'}
                    size={15}
                  />
                  <span className="wa-anhang__name">{anhang.name}</span>
                  <span className="wa-anhang__groesse">{(anhang.size / 1024 / 1024).toFixed(1).replace('.', ',')} MB</span>
                  <MockBtn icon="x" title="Anhang entfernen" disabled={senden} onClick={() => setAnhang(null)} />
                </div>
              ) : null}
              <div className="wa-eingabe__zeile">
                <MockBtn
                  kind="secondary"
                  icon="paperclip"
                  title="Anhang: Foto, Video, Sprachnachricht oder Dokument"
                  disabled={senden}
                  onClick={() => dateiRef.current?.click()}
                />
                <input
                  ref={dateiRef}
                  type="file"
                  hidden
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/3gpp,audio/*,application/pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => dateiGewaehlt(e.target.files)}
                />
                <MockTextarea
                  className="wa-eingabe__feld"
                  rows={2}
                  value={text}
                  placeholder={anhang ? 'Bildunterschrift (optional) …' : 'Nachricht schreiben …'}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void absenden()
                  }}
                />
                <MockBtn
                  kind="primary"
                  icon="send"
                  aria-label="Senden"
                  disabled={(!text.trim() && !anhang) || senden}
                  loading={senden}
                  onClick={() => void absenden()}
                >
                  <span className="wa-senden-text">Senden</span>
                </MockBtn>
              </div>
              {mock && !simOffen ? (
                <MockBtn sm kind="ghost" icon="info-circle" className="wa-sim__auf" onClick={() => setSimOffen(true)}>
                  Antwort simulieren (Testmodus)
                </MockBtn>
              ) : null}
              {mock && simOffen ? (
                <div className="wa-sim">
                  <div className="wa-sim__kopf">
                    <span className="wa-sim__titel">Antwort von {name || verlauf?.kontakt?.name || 'Kontakt'} simulieren</span>
                    <MockBtn icon="x" title="Einklappen" onClick={() => setSimOffen(false)} />
                  </div>
                  {offeneKnoepfe.length ? (
                    <div className="wa-sim__knoepfe">
                      {offeneKnoepfe.map((k) => (
                        <MockBtn key={k.id} sm kind="secondary" onClick={() => void simulieren({ knopf: k })}>
                          Tippt „{k.titel}“
                        </MockBtn>
                      ))}
                    </div>
                  ) : null}
                  <div className="wa-eingabe__zeile">
                    <MockInput
                      className="wa-eingabe__feld"
                      value={simText}
                      placeholder="Text des Kontakts …"
                      onChange={(e) => setSimText(e.target.value)}
                    />
                    <MockBtn sm kind="secondary" disabled={!simText.trim()} onClick={() => void simulieren({ text: simText })}>
                      Empfangen
                    </MockBtn>
                  </div>
                  <div className="wa-sim__knoepfe">
                    <MockBtn sm kind="secondary" icon="camera" onClick={() => void simulieren({ medium: 'bild', text: simText || undefined })}>
                      Foto
                    </MockBtn>
                    <MockBtn sm kind="secondary" icon="paperclip" onClick={() => void simulieren({ medium: 'dokument', text: simText || undefined })}>
                      PDF
                    </MockBtn>
                    <MockBtn sm kind="secondary" icon="microphone" onClick={() => void simulieren({ medium: 'audio' })}>
                      Sprachnachricht
                    </MockBtn>
                    <MockBtn sm kind="secondary" icon="player-play-filled" onClick={() => void simulieren({ medium: 'video', text: simText || undefined })}>
                      Video
                    </MockBtn>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <NachrichtEinordnen
        nachricht={aktiv?.n ?? null}
        anker={aktiv?.el ?? null}
        laufend={verlauf?.laufend ?? []}
        istPartner={Boolean(ziel.handwerkerId)}
        onClose={() => setAktiv(null)}
        onDone={async () => {
          setAktiv(null)
          await laden()
          onChanged?.()
        }}
      />
    </>
  )
}

/** Eingehende Nachricht: zuordnen, als Update/Regie übernehmen, als Dokument speichern, erledigt. */
function NachrichtEinordnen({
  nachricht,
  anker,
  laufend,
  istPartner,
  onClose,
  onDone,
}: {
  nachricht: WaNachricht | null
  /** Angetippte Blase — Desktop: Popover daran, Handy: Blatt von unten */
  anker: HTMLElement | null
  laufend: WaVerlauf['laufend']
  istPartner: boolean
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const [zielId, setZielId] = useState<string | null>(null)
  const [modus, setModus] = useState<null | 'regie' | 'dokument'>(null)
  const [stunden, setStunden] = useState(0)
  const [satz, setSatz] = useState(0)
  const [regieText, setRegieText] = useState('')
  const [art, setArt] = useState<DokumentArt>('sonstiges')
  const [busy, setBusy] = useState(false)
  const mobil = useIsMobile()
  const ankerRef = useRef<HTMLElement | null>(null)
  ankerRef.current = anker

  useEffect(() => {
    if (!nachricht) return
    setZielId(istPartner ? nachricht.einsatz_id : nachricht.auftrag_id)
    setModus(null)
    setStunden(0)
    setSatz(0)
    setRegieText(nachricht.text ?? '')
    setArt('sonstiges')
  }, [nachricht, istPartner])

  if (!nachricht) return null
  const gewaehlt = laufend.find((l) => l.id === zielId) ?? null
  const zuordnungGeaendert = (istPartner ? nachricht.einsatz_id : nachricht.auftrag_id) !== zielId

  async function lauf<T extends { ok: boolean }>(p: Promise<T>, okText: string) {
    setBusy(true)
    const res = (await safeAction(p)) as T & { message?: string }
    setBusy(false)
    if (!res.ok) {
      toast.error(res.message ?? 'Fehler')
      return false
    }
    toast.success(okText)
    return true
  }

  async function zuordnungSpeichern(): Promise<boolean> {
    if (!zuordnungGeaendert) return true
    return lauf(
      whatsAppZuordnen(nachricht!.id, {
        auftragId: gewaehlt?.auftrag_id ?? null,
        einsatzId: istPartner ? gewaehlt?.id ?? null : null,
      }),
      gewaehlt ? `Zugeordnet: ${gewaehlt.auftrag_titel || gewaehlt.titel}` : 'Zuordnung entfernt'
    )
  }

  async function aktion(was: 'update' | 'regie' | 'dokument' | 'erledigt' | 'zuordnen') {
    if (!(await zuordnungSpeichern())) return
    let ok = true
    if (was === 'update') ok = await lauf(whatsAppUebernehmen({ id: nachricht!.id, als: 'update' }), 'Als Update im Einsatz gespeichert')
    if (was === 'regie') {
      ok = await lauf(
        whatsAppUebernehmen({ id: nachricht!.id, als: 'regie', stunden, stundensatz: satz || null, text: regieText }),
        'Regie im Einsatz gespeichert'
      )
    }
    if (was === 'dokument') ok = await lauf(whatsAppAlsDokument(nachricht!.id, art), 'In den Dokumenten gespeichert')
    if (was === 'erledigt') {
      ok = await lauf(
        whatsAppMarkieren(nachricht!.id, nachricht!.markierung === 'erledigt' ? null : 'erledigt'),
        nachricht!.markierung === 'erledigt' ? 'Wieder offen' : 'Als erledigt markiert'
      )
    }
    if (ok) await onDone()
  }

  const hatEinsatz = istPartner && Boolean(gewaehlt)
  const einsatzLaeuft = gewaehlt?.status === 'angenommen'

  const primary =
    modus === 'regie'
      ? { label: 'Regie speichern', disabled: busy || stunden <= 0 || !regieText.trim() || !hatEinsatz, onClick: () => void aktion('regie') }
      : modus === 'dokument'
        ? { label: 'Speichern', disabled: busy || !gewaehlt, onClick: () => void aktion('dokument') }
        : zuordnungGeaendert
          ? { label: 'Zuordnung speichern', disabled: busy, onClick: () => void aktion('zuordnen') }
          : null
  const erledigtLabel = nachricht.markierung === 'erledigt' ? 'Wieder offen' : 'Erledigt'

  const inhalt = (
      <div className="wa-einordnen">
        {mobil ? (
  <div className="wa-zitat">
          {nachricht.medium ? <Medium m={nachricht.medium} /> : null}
          {nachricht.text ? <p>{nachricht.text}</p> : null}
        </div>
        ) : null}

        <MockField label={istPartner ? 'Gehört zu Einsatz' : 'Gehört zu Auftrag'}>
          {laufend.length ? (
            <div className="einsatz-partner-liste" role="radiogroup">
              {laufend.map((l) => {
                const on = zielId === l.id
                return (
                  <MockBtn
                    key={l.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`einsatz-partner${on ? ' is-on' : ''}`}
                    onClick={() => setZielId(on ? null : l.id)}
                  >
                    <span className="einsatz-partner__dot" aria-hidden />
                    <span className="einsatz-partner__name">
                      {istPartner ? `${l.auftrag_titel} · ${l.titel}` : l.titel}
                    </span>
                    {istPartner ? (
                      <span className="einsatz-partner__hint">{l.status === 'gesendet' ? 'gesendet' : 'läuft'}</span>
                    ) : null}
                  </MockBtn>
                )
              })}
            </div>
          ) : (
            <p className="einsatz-partner-leer">
              {istPartner ? 'Kein laufender Einsatz bei diesem Partner.' : 'Kein laufender Auftrag bei diesem Kunden.'}
            </p>
          )}
        </MockField>

        {modus === null ? (
          <div className="wa-einordnen__aktionen">
            {istPartner ? (
              <>
                <MockBtn
                  kind="secondary"
                  icon="plus"
                  disabled={busy || !hatEinsatz || !einsatzLaeuft}
                  title={!einsatzLaeuft ? 'Erst möglich, wenn der Einsatz angenommen ist' : undefined}
                  onClick={() => void aktion('update')}
                >
                  Als Update übernehmen
                </MockBtn>
                <MockBtn
                  kind="secondary"
                  icon="clock"
                  disabled={busy || !hatEinsatz || !einsatzLaeuft}
                  onClick={() => setModus('regie')}
                >
                  Als Regie übernehmen
                </MockBtn>
              </>
            ) : null}
            {nachricht.medium ? (
              <MockBtn kind="secondary" icon="file-text" disabled={busy || !gewaehlt} onClick={() => setModus('dokument')}>
                Als Dokument speichern
              </MockBtn>
            ) : null}
          </div>
        ) : null}

        {modus === 'regie' ? (
          <>
            <MockField label="Beschreibung" required>
              <MockTextarea rows={3} value={regieText} onChange={(e) => setRegieText(e.target.value)} />
            </MockField>
            <MockField label="Stunden" required>
              <ClearableNumberInput className="txt" min={0} value={stunden} onValueChange={(v) => setStunden(Number(v) || 0)} />
            </MockField>
            <MockField label="Stundensatz (€/h)">
              <ClearableNumberInput className="txt" min={0} value={satz} onValueChange={(v) => setSatz(Number(v) || 0)} />
            </MockField>
          </>
        ) : null}

        {modus === 'dokument' ? (
          <MockField label="Art">
            <MockSegment
              value={art}
              onChange={setArt}
              options={DOKUMENT_ARTEN.map((a) => ({ value: a, label: DOKUMENT_ART_LABEL[a] }))}
              aria-label="Art des Dokuments"
            />
          </MockField>
        ) : null}

        {nachricht.markierung ? <MockBadge kind="aktiv">{MARKIERUNG[nachricht.markierung]}</MockBadge> : null}
      </div>
  )

  if (mobil) {
    return (
      <EditorSheet
        open
        onClose={onClose}
        title="Nachricht einordnen"
        crumb={formatDatum(nachricht.created_at)}
        secondary={{ label: erledigtLabel, kind: 'ghost', disabled: busy, onClick: () => void aktion('erledigt') }}
        primary={primary ? { ...primary, icon: 'check', busy } : null}
      >
        {inhalt}
      </EditorSheet>
    )
  }

  return (
    <MockPopover open onClose={onClose} anchorRef={ankerRef} align="left" width={360}>
      <div className="wa-pop">
        <div className="wa-pop__kopf">
          <span>Nachricht einordnen</span>
          <MockBtn icon="x" title="Schließen" onClick={onClose} />
        </div>
        {inhalt}
        <div className="wa-pop__fuss">
          <MockBtn sm kind="ghost" disabled={busy} onClick={() => void aktion('erledigt')}>
            {erledigtLabel}
          </MockBtn>
          {primary ? (
            <MockBtn sm kind="primary" icon="check" disabled={primary.disabled} loading={busy} onClick={primary.onClick}>
              {primary.label}
            </MockBtn>
          ) : null}
        </div>
      </div>
    </MockPopover>
  )
}

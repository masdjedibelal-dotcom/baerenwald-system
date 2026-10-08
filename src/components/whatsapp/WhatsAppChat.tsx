'use client'

import { useCallback,useEffect,useMemo,useRef,useState,type ReactNode } from 'react'

import {
ladeWhatsAppVerlauf,
sendeWhatsApp,
sendeWhatsAppAnhang,
simuliereWhatsAppAntwort,
type WaNachricht,
type WaVerlauf,
type WaZiel,
} from '@/app/(dashboard)/whatsapp/actions'
import { MockBtn } from '@/components/mock-ui'
import { MockInput,MockTextarea } from '@/components/mock-ui/MockForm'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'
import { WhatsAppAuswahlAktion } from '@/components/whatsapp/WhatsAppAuswahlAktion'
import { toast } from '@/components/ui/app-toast'
import { safeAction } from '@/lib/actions/safe-action'
import { createClient } from '@/lib/supabase'
import { formatDatum } from '@/lib/format/geld-datum'
import { cn } from '@/lib/utils'
import { waNummerAnzeige } from '@/lib/whatsapp/telefon'

const MARKIERUNG: Record<NonNullable<WaNachricht['markierung']>, string> = {
  update: 'Als Update übernommen',
  regie: 'Als Regie übernommen',
  erledigt: 'Erledigt',
  tagebuch: 'Ins Tagebuch übernommen',
  dokument: 'In den Dokumenten gespeichert',
  fertig: 'Einsatz als erledigt gemeldet',
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
  /** Auswahl-Modus (nur Partner): ausgewählte Nachrichten, null = aus */
  const [auswahl, setAuswahl] = useState<Set<string> | null>(null)
  const [aktionOffen, setAktionOffen] = useState(false)
  const istPartner = Boolean(ziel.handwerkerId)
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
    setAuswahl(null)
    setAktionOffen(false)
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

  /** Nachricht in die Auswahl (startet den Auswahl-Modus beim ersten Antippen) */
  function umschalten(id: string) {
    setAuswahl((prev) => {
      const next = new Set(prev ?? [])
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const mock = verlauf?.modus === 'mock'
  let letzterTag = ''

  return (
    <>
      <section className="wa-pane">
        <header className="wa-pane__kopf">
          {zurueck}
          <div className="wa-pane__titel">
            <span className="wa-pane__name">
              {name || verlauf?.kontakt?.name || 'WhatsApp'}
              <span className={cn('wa-typ', `wa-typ--${ziel.handwerkerId ? 'handwerker' : ziel.kundeId ? 'kunde' : 'unbekannt'}`)}>
                {ziel.handwerkerId ? 'Partner' : ziel.kundeId ? 'Kunde' : 'Unbekannt'}
              </span>
            </span>
            {verlauf?.kontakt ? <span className="wa-pane__nr">{waNummerAnzeige(verlauf.kontakt.nummer)}</span> : null}
          </div>
          {istPartner && verlauf?.nachrichten.length ? (
            <MockBtn
              sm
              kind={auswahl ? 'primary' : 'secondary'}
              icon={auswahl ? 'x' : 'check'}
              className="wa-pane__auswahl"
              onClick={() => setAuswahl(auswahl ? null : new Set())}
            >
              {auswahl ? 'Abbrechen' : 'Auswählen'}
            </MockBtn>
          ) : null}
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
                    {auswahl ? (
                      <MockCheckbox
                        className="wa-zeile__wahl"
                        checked={auswahl.has(n.id)}
                        onChange={() => umschalten(n.id)}
                        aria-label="Nachricht auswählen"
                      />
                    ) : null}
                    <div
                      className={cn(
                        'wa-blase',
                        ein ? 'wa-blase--ein' : 'wa-blase--aus',
                        n.ungelesen && 'is-neu',
                        auswahl?.has(n.id) && 'is-gewaehlt',
                        istPartner && 'is-waehlbar'
                      )}
                      {...(istPartner
                        ? {
                            role: 'button',
                            tabIndex: 0,
                            title: auswahl ? 'Auswählen' : 'Nachricht übernehmen (Tagebuch, Update, Dokument …)',
                            onClick: () => umschalten(n.id),
                            onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                umschalten(n.id)
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

          {auswahl ? (
            <div className="wa-auswahlleiste">
              <span>
                {auswahl.size
                  ? `${auswahl.size} Nachricht${auswahl.size === 1 ? '' : 'en'} ausgewählt`
                  : 'Nachrichten antippen, die Sie übernehmen möchten'}
              </span>
              <MockBtn kind="primary" icon="arrow-right" disabled={!auswahl.size} onClick={() => setAktionOffen(true)}>
                Weiter
              </MockBtn>
            </div>
          ) : verlauf?.ohneNummer ? (
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

      {istPartner ? (
        <WhatsAppAuswahlAktion
          open={aktionOffen}
          ids={auswahl ? sichtbar.filter((n) => auswahl.has(n.id)).map((n) => n.id) : []}
          laufend={verlauf?.laufend ?? []}
          onClose={() => setAktionOffen(false)}
          onDone={() => {
            setAuswahl(null)
            void laden()
            onChanged?.()
          }}
        />
      ) : null}
    </>
  )
}

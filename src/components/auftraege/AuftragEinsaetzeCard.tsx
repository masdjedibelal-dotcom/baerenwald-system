'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  createEinsatz,
  einsatzFertigErfassen,
  einsatzRechnungErfassen,
  einsatzRegieErfassen,
  einsatzRueckmeldungErfassen,
  einsatzUpdateErfassen,
  einsatzUpdatesGesehen,
  listEinsaetze,
  loadEinsatzFormular,
  regieEntscheiden,
  zurueckziehenEinsatz,
  type EinsatzMitteilung,
  type EinsatzGewerkOption,
  type EinsatzPartnerOption,
  type EinsatzStatus,
  type EinsatzZeile,
} from '@/app/(dashboard)/auftraege/einsatz-actions'
import { MockBadge, MockBtn, MockCard, MockSegment } from '@/components/mock-ui'
import { MockChip } from '@/components/mock-ui/MockPrimitives'
import { MockField, MockInput, MockTextarea } from '@/components/mock-ui/MockForm'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { ClearableNumberInput } from '@/components/ui/ClearableNumberInput'
import { openConfirmPopup } from '@/components/ui/ConfirmPopup'
import { DateInput } from '@/components/ui/DateInput'
import { FotoDropZone } from '@/components/ui/FotoDropZone'
import { safeAction } from '@/lib/actions/safe-action'
import { formatDatum, formatEuro } from '@/lib/format/geld-datum'
import { toast } from '@/components/ui/app-toast'
import { WhatsAppChatSheet } from '@/components/whatsapp/WhatsAppChatSheet'
import { useWhatsAppStatus } from '@/components/whatsapp/useWhatsAppStatus'

// Farben: gesendet blau · in Auftrag gelb · fertig grün · abgelehnt/entzogen rot
const STATUS: Record<EinsatzStatus, { label: string; kind: string }> = {
  gesendet: { label: 'Gesendet', kind: 'neu' },
  angenommen: { label: 'In Auftrag', kind: 'warten' },
  abgelehnt: { label: 'Abgelehnt', kind: 'storniert' },
  fertig: { label: 'Fertig', kind: 'aktiv' },
}

/** Grund, den „Partner entziehen“ setzt — Anzeige „Entzogen“ statt „Abgelehnt“. */
const ENTZOGEN_GRUND = 'Von Bärenwald entzogen'

function statusAnzeige(e: { status: EinsatzStatus; ablehnung_grund: string | null }) {
  if (e.status === 'abgelehnt' && e.ablehnung_grund === ENTZOGEN_GRUND) {
    return { label: 'Entzogen', kind: 'storniert' }
  }
  return STATUS[e.status] ?? STATUS.gesendet
}

const MELDUNG_LABEL: Record<EinsatzMitteilung['typ'], string> = {
  update: 'Update',
  regie: 'Regie',
  behinderung: 'Update',
}

const REGIE_STAND: Record<EinsatzMitteilung['status'], string> = {
  offen: '',
  uebernommen: ' (angenommen)',
  erledigt: ' (abgelehnt)',
}

function datum(iso: string | null): string {
  return iso ? formatDatum(iso) : ''
}

/** Ein Tag oder Zeitraum — gleicher Tag nur einmal. */
function termin(von: string | null, bis: string | null): string {
  if (von && bis && von.slice(0, 10) !== bis.slice(0, 10)) return `${datum(von)} bis ${datum(bis)}`
  return datum(von || bis)
}

type VerlaufEintrag = {
  key: string
  at: string
  art: string
  text: string
  dateien: { name: string; url: string }[]
  neu: boolean
  m?: EinsatzMitteilung
}

/** Alles, was zu einem Einsatz passiert ist, neueste Meldung oben. */
function verlauf(e: EinsatzZeile): VerlaufEintrag[] {
  const vonBw = (v: 'partner' | 'bw' | null | undefined) => (v === 'bw' ? ' · von Bärenwald eingetragen' : '')
  const liste: VerlaufEintrag[] = [
    {
      key: 'gesendet',
      at: e.gesendet_at,
      art: 'An Partner gesendet',
      text: '',
      dateien: [],
      neu: false,
    },
  ]
  if (e.angenommen_at) {
    liste.push({ key: 'angenommen', at: e.angenommen_at, art: `Angenommen${vonBw(e.angenommen_von)}`, text: '', dateien: [], neu: false })
  }
  if (e.status === 'abgelehnt') {
    liste.push(
      e.ablehnung_grund === ENTZOGEN_GRUND
        ? { key: 'abgelehnt', at: e.gesendet_at, art: 'Von Bärenwald entzogen', text: '', dateien: [], neu: false }
        : { key: 'abgelehnt', at: e.gesendet_at, art: 'Abgelehnt', text: e.ablehnung_grund ?? '', dateien: [], neu: false }
    )
  }
  for (const m of e.mitteilungen) {
    const art =
      m.typ === 'regie'
        ? `Regie${m.stunden ? `, ${String(m.stunden).replace('.', ',')} Std` : ''}${
            m.stundensatz ? ` à ${formatEuro(m.stundensatz)}` : ''
          }${m.erfasst_von === 'bw' ? '' : REGIE_STAND[m.status]}`
        : MELDUNG_LABEL[m.typ]
    liste.push({ key: m.id, at: m.created_at, art: `${art}${vonBw(m.erfasst_von)}`, text: m.text, dateien: m.dateien, neu: m.status === 'offen', m })
  }
  if (e.fertig_at) {
    liste.push({ key: 'fertig', at: e.fertig_at, art: `Erledigt gemeldet${vonBw(e.fertig_von)}`, text: e.fertig_text ?? '', dateien: e.fertig_dateien, neu: false })
  }
  if (e.rechnung_eingereicht_at) {
    liste.push({
      key: 'rechnung',
      at: e.rechnung_eingereicht_at,
      art: `Rechnung hochgeladen${e.rechnung_bezahlt_at ? ' · bezahlt' : ''}${vonBw(e.rechnung_von)}`,
      text: '',
      dateien: e.rechnung_pdf_url ? [{ name: 'PDF öffnen', url: e.rechnung_pdf_url }] : [],
      neu: false,
    })
  }
  return liste.sort((a, b) => String(b.at).localeCompare(String(a.at)))
}

type Form = {
  handwerkerId: string
  titel: string
  anweisung: string
  /** Ein Tag oder Zeitraum */
  terminArt: 'tag' | 'zeitraum'
  terminVon: string
  terminBis: string
  ort: string
  kontaktVorOrt: string
  ekBetrag: number
  ekArt: 'netto' | 'brutto'
}

/**
 * Einsätze am Auftrag: je Partner-Auftrag eine Zeile mit Stand und „neu“-Zähler.
 * Antippen öffnet den Einsatz mit Verlauf (Updates, Zusatzarbeit, Behinderung, Erledigt, Rechnung).
 */
export function AuftragEinsaetzeCard({ auftragId }: { auftragId: string }) {
  const [einsaetze, setEinsaetze] = useState<EinsatzZeile[] | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [partner, setPartner] = useState<EinsatzPartnerOption[]>([])
  const [gewerkOptionen, setGewerkOptionen] = useState<EinsatzGewerkOption[]>([])
  /** Filter-Chip: ohne Gewerk keine Partner-Auswahl (zu viele, falsche Treffer) */
  const [gewerkFilter, setGewerkFilter] = useState<string | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  // Updates, die in dieser Sitzung geöffnet wurden: zählen in der Zeile nicht mehr als neu.
  const [gesehen, setGesehen] = useState<Set<string>>(new Set())
  /** „Für den Partner eintragen“: welches Formular gerade offen ist */
  const [erfassen, setErfassen] = useState<null | 'abgelehnt' | 'update' | 'fertig' | 'rechnung' | 'regie'>(null)
  const [rStunden, setRStunden] = useState(0)
  const [rSatz, setRSatz] = useState(0)
  const [eText, setEText] = useState('')
  const [eFotos, setEFotos] = useState<File[]>([])
  const [ePdf, setEPdf] = useState<File | null>(null)
  const wa = useWhatsAppStatus()
  /** Versandweg beim Anlegen — nur wenn WhatsApp im CRM sichtbar ist */
  const [kanal, setKanal] = useState<'mail' | 'whatsapp' | 'beides'>('mail')
  const [chatOffen, setChatOffen] = useState(false)
  const detail = einsaetze?.find((e) => e.id === detailId) ?? null
  const setDetail = (e: EinsatzZeile | null) => setDetailId(e?.id ?? null)

  async function detailOeffnen(e: EinsatzZeile) {
    setDetail(e)
    if (!e.mitteilungen.some((m) => m.typ === 'update' && m.status === 'offen')) return
    const res = await safeAction(einsatzUpdatesGesehen(e.id))
    if (!res.ok) return
    // Im offenen Blatt bleibt „neu“ sichtbar, die Zeile zählt ab jetzt nicht mehr mit.
    setGesehen((g) => new Set([...g, e.id]))
  }

  const laden = useCallback(async () => {
    const res = await safeAction(listEinsaetze(auftragId))
    setEinsaetze(res.ok ? res.einsaetze : [])
  }, [auftragId])

  useEffect(() => {
    void laden()
  }, [laden])

  async function oeffnen() {
    setOpen(true)
    setForm(null)
    const res = await safeAction(loadEinsatzFormular(auftragId))
    if (!res.ok) {
      toast.error(res.message)
      setOpen(false)
      return
    }
    setPartner(res.partner)
    setKanal('mail')
    setGewerkOptionen(res.gewerke)
    setGewerkFilter(res.gewerkVorschlag)
    setForm({
      handwerkerId: '',
      titel: res.vorbelegung.titel,
      anweisung: '',
      terminArt:
        res.vorbelegung.termin_bis && res.vorbelegung.termin_bis !== res.vorbelegung.termin_von
          ? 'zeitraum'
          : 'tag',
      terminVon: res.vorbelegung.termin_von ?? '',
      terminBis: res.vorbelegung.termin_bis ?? '',
      ort: res.vorbelegung.ort,
      kontaktVorOrt: res.vorbelegung.kontakt_vor_ort,
      ekBetrag: 0,
      ekArt: 'netto',
    })
  }

  async function senden(ohneMail = false) {
    if (!form) return
    setSaving(true)
    const res = await safeAction(
      createEinsatz({
        auftragId,
        handwerkerId: form.handwerkerId,
        titel: form.titel,
        anweisung: form.anweisung,
        terminVon: form.terminVon || null,
        // Ein Tag: Ende = Beginn
        terminBis: (form.terminArt === 'tag' ? form.terminVon : form.terminBis) || null,
        // Ort und Kontakt kommen aus den Stammdaten des Vorgangs (keine eigenen Felder mehr)
        ort: form.ort,
        kontaktVorOrt: form.kontaktVorOrt,
        ekBetrag: form.ekBetrag || null,
        ekArt: form.ekArt,
        ohneMail,
        kanal: wa?.sichtbar ? kanal : 'mail',
      })
    )
    setSaving(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    const mitMail = !ohneMail && (!wa?.sichtbar || kanal !== 'whatsapp')
    if (mitMail && !res.mailGesendet) {
      toast.error('Einsatz angelegt, aber die Mail an den Partner ging nicht raus. Bitte Partner-E-Mail prüfen.')
    }
    if (!ohneMail && res.whatsappFehler) {
      toast.error(`Einsatz angelegt, aber WhatsApp ging nicht raus: ${res.whatsappFehler}`)
    }
    setOpen(false)
    await laden()
  }

  async function zurueckziehen(id: string) {
    const res = await safeAction(zurueckziehenEinsatz(id))
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    setDetail(null)
    await laden()
  }

  async function regie(id: string, entscheidung: 'angenommen' | 'abgelehnt') {
    const res = await safeAction(regieEntscheiden(id, entscheidung))
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    if (entscheidung === 'angenommen') {
      toast.success('Regie angenommen. Neue Positionen über „Auftrag bearbeiten“ eintragen und neu senden.')
    }
    await laden()
  }

  function erfassenOeffnen(art: NonNullable<typeof erfassen>) {
    setRStunden(0)
    setRSatz(0)
    setEText('')
    setEFotos([])
    setEPdf(null)
    setErfassen(art)
  }

  async function angenommenEintragen(id: string) {
    const res = await safeAction(einsatzRueckmeldungErfassen(id, 'angenommen'))
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    await laden()
  }

  async function erfassenSpeichern() {
    if (!detail || !erfassen) return
    setSaving(true)
    let res: { ok: true } | { ok: false; message: string }
    if (erfassen === 'abgelehnt') {
      res = await safeAction(einsatzRueckmeldungErfassen(detail.id, 'abgelehnt', eText))
    } else if (erfassen === 'regie') {
      res = await safeAction(
        einsatzRegieErfassen({ einsatzId: detail.id, text: eText, stunden: rStunden, stundensatz: rSatz || null })
      )
    } else {
      const fd = new FormData()
      fd.set('einsatzId', detail.id)
      fd.set('text', eText)
      for (const f of eFotos) fd.append('dateien', f)
      if (ePdf) fd.set('rechnungPdf', ePdf)
      res = await safeAction(
        erfassen === 'update'
          ? einsatzUpdateErfassen(fd)
          : erfassen === 'fertig'
            ? einsatzFertigErfassen(fd)
            : einsatzRechnungErfassen(fd)
      )
    }
    setSaving(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    setErfassen(null)
    await laden()
  }

  const erfassenOk =
    erfassen === 'abgelehnt'
      ? Boolean(eText.trim())
      : erfassen === 'regie'
        ? Boolean(eText.trim() && rStunden > 0)
      : erfassen === 'update'
        ? Boolean(eText.trim() || eFotos.length)
        : erfassen === 'rechnung'
          ? Boolean(ePdf)
          : true

  const setF = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f))
  const ok = Boolean(form?.handwerkerId && form.titel.trim())

  return (
    <>
      <MockCard
        title="Einsätze"
        icon="tool"
        actions={
          <MockBtn sm kind="secondary" icon="plus" onClick={() => { oeffnen() }}>
            Einsatz
          </MockBtn>
        }
      >
        {einsaetze == null ? null : einsaetze.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 'var(--fs-text)' }}>Noch kein Einsatz.</p>
        ) : (
          <div className="einsatz-liste">
            {einsaetze.map((e) => {
              const st = statusAnzeige(e)
              const neu = e.mitteilungen.filter(
                (m) => m.status === 'offen' && !(m.typ !== 'regie' && gesehen.has(e.id))
              ).length
              const letzte = e.mitteilungen[e.mitteilungen.length - 1]
              const meta = letzte
                ? `${MELDUNG_LABEL[letzte.typ]} vom ${datum(letzte.created_at)}`
                : [
                    termin(e.termin_von, e.termin_bis),
                    e.ek_betrag != null ? `EK ${formatEuro(e.ek_betrag)} ${e.ek_art}` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')
              return (
                <MockBtn key={e.id} type="button" className="einsatz-zeile" onClick={() => { detailOeffnen(e) }}>
                  <span className="einsatz-zeile__text">
                    <span className="einsatz-zeile__titel">{e.partner_name}</span>
                    <span className="einsatz-zeile__sub">{e.titel}</span>
                    {meta ? <span className="einsatz-zeile__meta">{meta}</span> : null}
                  </span>
                  <span className="einsatz-zeile__rechts">
                    {neu > 0 ? <MockBadge kind="neu">{neu} neu</MockBadge> : null}
                    <MockBadge kind={st.kind}>{st.label}</MockBadge>
                  </span>
                </MockBtn>
              )
            })}
          </div>
        )}
      </MockCard>

      <EditorSheet
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.partner_name ?? 'Einsatz'}
        crumb={detail?.titel}
        secondary={
          detail && (detail.status === 'gesendet' || detail.status === 'abgelehnt')
            ? { label: 'Zurückziehen', kind: 'ghost', onClick: () => { zurueckziehen(detail.id) } }
            : detail && detail.status === 'angenommen'
              ? {
                  label: 'Partner entziehen',
                  kind: 'ghost',
                  onClick: () =>
                    openConfirmPopup({
                      title: 'Einsatz entziehen?',
                      sub: detail.partner_name,
                      body: 'Der Partner sieht den Einsatz danach nicht mehr in seinem Portal. Seine Updates bleiben hier im Verlauf.',
                      confirmLabel: 'Entziehen',
                      danger: true,
                      onConfirm: () => zurueckziehen(detail.id),
                    }),
                }
              : null
        }
        primary={
          detail && detail.status === 'angenommen'
            ? { label: 'Fertig gemeldet', icon: 'check', onClick: () => erfassenOeffnen('fertig') }
            : null
        }
      >
        {detail ? (
          <div className="einsatz-blatt">
            <div className="einsatz-karte">
              <div className="einsatz-kopf">
                <MockBadge kind={statusAnzeige(detail).kind}>
                  {statusAnzeige(detail).label}
                </MockBadge>
                <span className="einsatz-kopf__meta">
                  {[
                    termin(detail.termin_von, detail.termin_bis),
                    detail.ort ?? '',
                    detail.ek_betrag != null ? `EK ${formatEuro(detail.ek_betrag)} ${detail.ek_art}` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
              {detail.anweisung ? <p className="einsatz-anweisung">{detail.anweisung}</p> : null}
              {wa?.sichtbar ? (
                <div className="einsatz-aktionen">
                  <MockBtn sm kind="secondary" icon="brand-whatsapp" onClick={() => setChatOffen(true)}>
                    WhatsApp
                  </MockBtn>
                </div>
              ) : null}
              {/* Für den Partner eintragen (Telefon/WhatsApp) — gleiche Schritte wie im Portal */}
              {detail.status === 'gesendet' ? (
                <div className="einsatz-aktionen">
                  <MockBtn sm kind="primary" icon="check" onClick={() => { angenommenEintragen(detail.id) }}>
                    Hat angenommen
                  </MockBtn>
                  <MockBtn sm kind="secondary" onClick={() => erfassenOeffnen('abgelehnt')}>
                    Hat abgelehnt
                  </MockBtn>
                </div>
              ) : detail.status === 'angenommen' || detail.status === 'fertig' ? (
                // „Fertig gemeldet“ steht als Hauptknopf unten im Blatt
                <div className="einsatz-aktionen">
                  <MockBtn sm kind="secondary" icon="clock" onClick={() => erfassenOeffnen('regie')}>
                    Regie melden
                  </MockBtn>
                  {detail.status === 'angenommen' ? (
                    <MockBtn sm kind="secondary" icon="plus" onClick={() => erfassenOeffnen('update')}>
                      Update erfassen
                    </MockBtn>
                  ) : null}
                  {!detail.rechnung_eingereicht_at ? (
                    <MockBtn sm kind="secondary" icon="file-invoice" onClick={() => erfassenOeffnen('rechnung')}>
                      Rechnung hochladen
                    </MockBtn>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="einsatz-gruppe">
              <div className="einsatz-gruppe__kopf">
                <span className="einsatz-gruppe__titel">Verlauf</span>
              </div>
              <ol className="einsatz-verlauf">
                {verlauf(detail).map((v) => (
                  <li key={v.key} className={`einsatz-eintrag${v.neu ? ' einsatz-eintrag--neu' : ''}`}>
                    <div className="einsatz-eintrag__kopf">
                      <span className="einsatz-eintrag__art">{v.art}</span>
                      <span className="einsatz-eintrag__datum">{datum(v.at)}</span>
                    </div>
                    {v.text ? <div className="einsatz-eintrag__text">{v.text}</div> : null}
                    {v.dateien.length ? (
                      <div className="einsatz-eintrag__dateien">
                        {v.dateien.map((d) => (
                          <a key={d.url} href={d.url} target="_blank" rel="noreferrer">
                            {d.name}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {v.m && v.m.typ === 'regie' && v.m.status === 'offen' ? (
                      <div className="einsatz-eintrag__aktionen">
                        <MockBtn sm kind="primary" onClick={() => { regie((v.m as EinsatzMitteilung).id, 'angenommen') }}>
                          Annehmen
                        </MockBtn>
                        <MockBtn sm kind="secondary" onClick={() => { regie((v.m as EinsatzMitteilung).id, 'abgelehnt') }}>
                          Ablehnen
                        </MockBtn>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : null}
      </EditorSheet>

      <EditorSheet
        open={Boolean(erfassen && detail)}
        onClose={() => setErfassen(null)}
        title={
          erfassen === 'abgelehnt'
            ? 'Hat abgelehnt'
            : erfassen === 'regie'
              ? 'Regie melden'
              : erfassen === 'update'
              ? 'Update erfassen'
              : erfassen === 'fertig'
                ? 'Fertig gemeldet'
                : 'Rechnung hochladen'
        }
        crumb={detail?.partner_name}
        primary={{
          label: 'Speichern',
          disabled: !erfassenOk || saving,
          busy: saving,
          onClick: () => { erfassenSpeichern() },
        }}
      >
        {erfassen === 'abgelehnt' ? (
          <MockField label="Grund" required>
            <MockTextarea rows={3} value={eText} onChange={(ev) => setEText(ev.target.value)} />
          </MockField>
        ) : null}
        {erfassen === 'regie' ? (
          <>
            <MockField label="Beschreibung" required>
              <MockTextarea rows={3} value={eText} onChange={(ev) => setEText(ev.target.value)} />
            </MockField>
            <MockField label="Stunden" required>
              <ClearableNumberInput
                className="txt"
                min={0}
                value={rStunden}
                onValueChange={(v) => setRStunden(Number(v) || 0)}
              />
            </MockField>
            <MockField label="Stundensatz (€/h)">
              <ClearableNumberInput
                className="txt"
                min={0}
                value={rSatz}
                onValueChange={(v) => setRSatz(Number(v) || 0)}
              />
            </MockField>
          </>
        ) : null}
        {erfassen === 'update' || erfassen === 'fertig' ? (
          <>
            <MockField label={erfassen === 'fertig' ? 'Was wurde gemacht?' : 'Text'}>
              <MockTextarea rows={3} value={eText} onChange={(ev) => setEText(ev.target.value)} />
            </MockField>
            <MockField label="Fotos">
              <FotoDropZone
                multiple
                label={eFotos.length ? `${eFotos.length} Foto(s) ausgewählt` : 'Fotos hinzufügen'}
                onFiles={(files) => setEFotos((prev) => [...prev, ...files].slice(0, 10))}
              />
            </MockField>
          </>
        ) : null}
        {erfassen === 'fertig' || erfassen === 'rechnung' ? (
          <>
            <MockField label={erfassen === 'fertig' ? 'Rechnung (PDF, optional)' : 'Rechnung (PDF)'}>
              <FotoDropZone
                accept="application/pdf"
                label={ePdf ? ePdf.name : 'PDF hinzufügen'}
                onFiles={(files) => setEPdf(files[0] ?? null)}
              />
            </MockField>
            <p className="text-muted" style={{ fontSize: 'var(--fs-meta)', margin: 0 }}>
              Die Rechnung landet in den Dokumenten des Vorgangs. Dort markieren Sie sie als bezahlt.
            </p>
          </>
        ) : null}
      </EditorSheet>

      <EditorSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Einsatz anlegen"
        secondary={{
          // Ohne Mail — bleibt „Gesendet“, bis der Partner (oder wir für ihn) annimmt
          label: 'Nur eintragen',
          disabled: !ok || saving,
          onClick: () => { senden(true) },
        }}
        primary={{
          label: 'Senden',
          icon: 'send',
          disabled: !ok || saving,
          busy: saving,
          onClick: () => { senden() },
        }}
      >
        {form ? (
          <>
            <MockField label="Gewerk">
              <div className="einsatz-gewerk-chips">
                {gewerkOptionen.map((g) => (
                  <MockChip
                    key={g.slug}
                    active={gewerkFilter === g.slug}
                    onClick={() => {
                      setGewerkFilter(gewerkFilter === g.slug ? null : g.slug)
                      setF({ handwerkerId: '' })
                    }}
                  >
                    {g.name}
                  </MockChip>
                ))}
              </div>
            </MockField>
            <MockField label="Partner" required>
              {/* Sichtbare Liste statt Auswahlfeld */}
              {!gewerkFilter ? (
                <p className="einsatz-partner-leer">Zuerst ein Gewerk wählen.</p>
              ) : (() => {
                const liste = partner.filter((p) => p.gewerke.includes(gewerkFilter))
                if (!liste.length) return <p className="einsatz-partner-leer">Kein Partner für dieses Gewerk.</p>
                return (
                  <div className="einsatz-partner-liste" role="radiogroup" aria-label="Partner">
                    {liste.map((p) => {
                      const on = form.handwerkerId === p.id
                      return (
                        <MockBtn
                          key={p.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          className={`einsatz-partner${on ? ' is-on' : ''}`}
                          onClick={() => setF({ handwerkerId: p.id })}
                        >
                          <span className="einsatz-partner__dot" aria-hidden />
                          <span className="einsatz-partner__name">{p.label}</span>
                          {wa?.sichtbar && kanal !== 'mail' ? (
                            p.whatsapp ? null : <span className="einsatz-partner__hint">keine Handynummer</span>
                          ) : p.email ? null : (
                            <span className="einsatz-partner__hint">keine E-Mail</span>
                          )}
                        </MockBtn>
                      )
                    })}
                  </div>
                )
              })()}
            </MockField>
            {wa?.sichtbar ? (
              <MockField
                label="Senden per"
                hint={
                  kanal === 'mail'
                    ? undefined
                    : 'WhatsApp mit Knöpfen „Annehmen“ / „Ablehnen“ — die Antwort landet direkt im Einsatz.'
                }
              >
                <MockSegment
                  value={kanal}
                  onChange={setKanal}
                  options={[
                    { value: 'mail', label: 'E-Mail' },
                    { value: 'whatsapp', label: 'WhatsApp' },
                    { value: 'beides', label: 'Beides' },
                  ]}
                  aria-label="Versandweg"
                />
              </MockField>
            ) : null}
            <MockField label="Titel" required>
              <MockInput value={form.titel} onChange={(ev) => setF({ titel: ev.target.value })} />
            </MockField>
            <MockField label="Anweisung" hint="Was ist zu tun? Der Partner sieht diesen Text.">
              <MockTextarea
                rows={5}
                value={form.anweisung}
                onChange={(ev) => setF({ anweisung: ev.target.value })}
              />
            </MockField>
            <MockField label="Termin">
              <MockSegment
                value={form.terminArt}
                onChange={(next) => setF({ terminArt: next })}
                options={[
                  { value: 'tag', label: 'Ein Tag' },
                  { value: 'zeitraum', label: 'Zeitraum' },
                ]}
                aria-label="Ein Tag oder Zeitraum"
              />
            </MockField>
            {form.terminArt === 'tag' ? (
              <MockField label="Tag">
                <DateInput value={form.terminVon} onChange={(ev) => setF({ terminVon: ev.target.value })} />
              </MockField>
            ) : (
              <>
                <MockField label="Von">
                  <DateInput value={form.terminVon} onChange={(ev) => setF({ terminVon: ev.target.value })} />
                </MockField>
                <MockField label="Bis">
                  <DateInput value={form.terminBis} onChange={(ev) => setF({ terminBis: ev.target.value })} />
                </MockField>
              </>
            )}
            <MockField label="EK" hint="So, wie der Partner abrechnet: netto bei §13b, sonst brutto.">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <ClearableNumberInput
                  className="txt"
                  min={0}
                  value={form.ekBetrag}
                  onValueChange={(v) => setF({ ekBetrag: Number(v) || 0 })}
                  style={{ textAlign: 'right' }}
                />
                <MockSegment
                  value={form.ekArt}
                  onChange={(next) => setF({ ekArt: next })}
                  options={[
                    { value: 'netto', label: 'netto' },
                    { value: 'brutto', label: 'brutto' },
                  ]}
                  aria-label="EK netto oder brutto"
                />
              </div>
            </MockField>
          </>
        ) : (
          <p style={{ color: 'var(--text-3)' }}>Wird geladen …</p>
        )}
      </EditorSheet>

      {detail ? (
        <WhatsAppChatSheet
          open={chatOffen}
          onClose={() => setChatOffen(false)}
          ziel={{ handwerkerId: detail.handwerker_id }}
          name={detail.partner_name}
          auftragId={auftragId}
          einsatzId={detail.id}
          onChanged={() => void laden()}
        />
      ) : null}
    </>
  )
}

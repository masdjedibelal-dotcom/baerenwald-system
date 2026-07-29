'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createHandwerker,
  insertPartnerDokument,
} from '@/app/(dashboard)/handwerker/actions'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { VERSICHERUNG_TYP_SLUG } from '@/lib/handwerker-versicherung'
import { toast } from '@/components/ui/app-toast'

type GewerkOpt = { id: string; name: string; slug: string }

const GEWERBEANMELDUNG_TYP = 'gewerbeanmeldung'

/** MM/YYYY oder YYYY-MM-DD → ISO-Datum (Monatsende). */
function parseVersicherungBis(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const m = t.match(/^(\d{1,2})[./](\d{4})$/)
  if (!m) return null
  const month = Number(m[1])
  const year = Number(m[2])
  if (month < 1 || month > 12) return null
  const lastDay = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

function buildNotizen(notiz: string, stundensatz: string): string | null {
  const parts: string[] = []
  const satz = stundensatz.trim().replace(',', '.')
  if (satz) parts.push(`Stundensatz: ${satz} €/h`)
  if (notiz.trim()) parts.push(notiz.trim())
  return parts.length ? parts.join('\n\n') : null
}

/** Handwerker anlegen — EditorSheet, Host z. B. `/neu?art=handwerker`. */
export function PartnerCreateSheet({
  open,
  onClose,
  gewerkeOptionen = [],
  stayOnPage = false,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  gewerkeOptionen?: GewerkOpt[]
  stayOnPage?: boolean
  onSaved?: (id: string) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [firma, setFirma] = useState('')
  const [gewerkSlug, setGewerkSlug] = useState('')
  const [einsatzgebiet, setEinsatzgebiet] = useState('')
  const [tel, setTel] = useState('')
  const [mail, setMail] = useState('')
  const [stundensatz, setStundensatz] = useState('')
  const [versicherungBis, setVersicherungBis] = useState('')
  const [gewerbeanmeldung, setGewerbeanmeldung] = useState(true)
  const [notizen, setNotizen] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!open) return
    setFirma('')
    setGewerkSlug('')
    setEinsatzgebiet('')
    setTel('')
    setMail('')
    setStundensatz('')
    setVersicherungBis('')
    setGewerbeanmeldung(true)
    setNotizen('')
    setErr(null)
    setDirty(false)
  }, [open])

  function mark(updater: () => void) {
    updater()
    setDirty(true)
  }

  function submit() {
    setErr(null)
    if (!firma.trim()) {
      setErr('Firmenname ist Pflicht.')
      return
    }
    if (!gewerkSlug.trim()) {
      setErr('Gewerk ist Pflicht.')
      return
    }
    if (!tel.trim()) {
      setErr('Telefon ist Pflicht.')
      return
    }
    if (versicherungBis.trim() && !parseVersicherungBis(versicherungBis)) {
      setErr('Versicherung: Bitte MM/JJJJ oder JJJJ-MM-TT angeben.')
      return
    }

    startTransition(async () => {
      const r = await createHandwerker({
        firma: firma.trim() || null,
        vorname: null,
        nachname: null,
        email: mail.trim() || null,
        telefon: tel.trim() || null,
        whatsapp: null,
        webseite: null,
        adresse: einsatzgebiet.trim() || null,
        gewerke: [gewerkSlug],
        subkategorie: null,
        ist_fachbetrieb: true,
        partner_kategorie_id: null,
        steuernummer: null,
        ustid: null,
        iban: null,
        aktiv: true,
        notizen: buildNotizen(notizen, stundensatz),
      })
      if (!r.ok) {
        setErr(r.message)
        toast.error(r.message)
        return
      }

      const gueltigBis = parseVersicherungBis(versicherungBis)
      if (gueltigBis) {
        await insertPartnerDokument({
          handwerker_id: r.id,
          typ: VERSICHERUNG_TYP_SLUG,
          bezeichnung: 'Betriebshaftpflichtversicherung',
          gueltig_bis: gueltigBis,
          datei_url: null,
          notizen: 'Bei Anlage erfasst',
        })
      }
      if (gewerbeanmeldung) {
        await insertPartnerDokument({
          handwerker_id: r.id,
          typ: GEWERBEANMELDUNG_TYP,
          bezeichnung: 'Gewerbeanmeldung / Gewerbeschein',
          gueltig_bis: null,
          datei_url: null,
          notizen: 'vorgelegt und geprüft',
        })
      }

      toast.success('Handwerker angelegt')
      setDirty(false)
      onSaved?.(r.id)
      if (!stayOnPage) {
        router.push(`/handwerker/${r.id}`)
        return
      }
      onClose()
    })
  }

  const footer = (
    <div className="hw-create-footer">
      <button type="button" className="btn ghost" onClick={onClose} disabled={pending}>
        Abbrechen
      </button>
      <MockBtn kind="primary" icon="user-plus" disabled={pending} onClick={submit}>
        {pending ? '…' : 'Handwerker anlegen'}
      </MockBtn>
    </div>
  )

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Handwerker anlegen"
      crumb="Handwerker >"
      context="detail"
      dirty={dirty}
      size="lg"
      footer={footer}
      className="hw-create-sheet"
    >
      <div className="hw-create">
        {err ? <p className="hw-create__err">{err}</p> : null}

        <MockFormSection title="Betrieb" icon="tool">
          <MockField label="Firmenname" required full>
            <input
              className="input"
              value={firma}
              onChange={(e) => mark(() => setFirma(e.target.value))}
              placeholder="Max Sanitär GmbH"
              autoComplete="organization"
            />
          </MockField>
          <MockField label="Gewerk" required>
            <select
              className="input"
              value={gewerkSlug}
              onChange={(e) => mark(() => setGewerkSlug(e.target.value))}
              aria-label="Gewerk"
            >
              <option value="">Gewerk wählen…</option>
              {gewerkeOptionen.map((g) => (
                <option key={g.id} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </select>
          </MockField>
          <MockField label="Einsatzgebiet">
            <input
              className="input"
              value={einsatzgebiet}
              onChange={(e) => mark(() => setEinsatzgebiet(e.target.value))}
              placeholder="München-Süd"
            />
          </MockField>
        </MockFormSection>

        <MockFormSection title="Kontakt" icon="phone" columns={2}>
          <MockField label="Telefon" required>
            <input
              className="input"
              type="tel"
              value={tel}
              onChange={(e) => mark(() => setTel(e.target.value))}
              placeholder="0170 123 456"
              autoComplete="tel"
            />
          </MockField>
          <MockField label="E-Mail">
            <input
              className="input"
              type="email"
              value={mail}
              onChange={(e) => mark(() => setMail(e.target.value))}
              placeholder="info@…"
              autoComplete="email"
            />
          </MockField>
        </MockFormSection>

        <MockFormSection title="Konditionen & Compliance" icon="refresh">
          <MockField label="Stundensatz (€)">
            <div className="txt-prefix">
              <span className="prefix">€/h</span>
              <input
                className="input"
                inputMode="decimal"
                value={stundensatz}
                onChange={(e) => mark(() => setStundensatz(e.target.value))}
                placeholder="65"
              />
            </div>
          </MockField>
          <MockField label="Versicherung gültig bis">
            <input
              className="input"
              value={versicherungBis}
              onChange={(e) => mark(() => setVersicherungBis(e.target.value))}
              placeholder="12/2026"
            />
          </MockField>
          <MockField label="Gewerbeanmeldung" full>
            <div className="hw-create__switch-row">
              <button
                type="button"
                role="switch"
                aria-checked={gewerbeanmeldung}
                className={gewerbeanmeldung ? 'switch on' : 'switch'}
                onClick={() => mark(() => setGewerbeanmeldung((v) => !v))}
                title={
                  gewerbeanmeldung
                    ? 'Gewerbeanmeldung: vorgelegt und geprüft'
                    : 'Gewerbeanmeldung: nicht geprüft'
                }
              />
              <span className="hw-create__switch-label">vorgelegt und geprüft</span>
            </div>
          </MockField>
          <MockField
            label="Interne Notiz"
            full
            hint="Stärken, Erfahrungen, Spezialgebiete"
          >
            <textarea
              className="input ta"
              rows={4}
              value={notizen}
              onChange={(e) => mark(() => setNotizen(e.target.value))}
              placeholder="z.B. besonders sauber, kommt pünktlich…"
            />
          </MockField>
        </MockFormSection>
      </div>
    </EditorSheet>
  )
}

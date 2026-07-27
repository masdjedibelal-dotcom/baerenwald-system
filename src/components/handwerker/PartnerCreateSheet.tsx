'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createHandwerker } from '@/app/(dashboard)/handwerker/actions'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockChip } from '@/components/mock-ui/MockPrimitives'
import { MockField } from '@/components/mock-ui/MockForm'
import { toast } from '@/components/ui/app-toast'

type GewerkOpt = { id: string; name: string; slug: string }

/** Partner (Handwerker) anlegen — EditorSheet, Host z. B. `/neu?art=handwerker`. */
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
  const [vorname, setVorname] = useState('')
  const [nachname, setNachname] = useState('')
  const [tel, setTel] = useState('')
  const [mail, setMail] = useState('')
  const [gewerkSlugs, setGewerkSlugs] = useState<Set<string>>(() => new Set())
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!open) return
    setFirma('')
    setVorname('')
    setNachname('')
    setTel('')
    setMail('')
    setGewerkSlugs(new Set())
    setDirty(false)
  }, [open])

  function mark(updater: () => void) {
    updater()
    setDirty(true)
  }

  function toggleGewerk(slug: string) {
    mark(() => {
      setGewerkSlugs((prev) => {
        const n = new Set(prev)
        if (n.has(slug)) n.delete(slug)
        else n.add(slug)
        return n
      })
    })
  }

  function submit() {
    if (!firma.trim() && !vorname.trim() && !nachname.trim()) {
      toast.error('Firma oder Name nötig.')
      return
    }
    startTransition(async () => {
      const r = await createHandwerker({
        firma: firma.trim() || null,
        vorname: vorname.trim() || null,
        nachname: nachname.trim() || null,
        email: mail.trim() || null,
        telefon: tel.trim() || null,
        whatsapp: null,
        webseite: null,
        adresse: null,
        gewerke: Array.from(gewerkSlugs),
        subkategorie: null,
        ist_fachbetrieb: true,
        partner_kategorie_id: null,
        steuernummer: null,
        ustid: null,
        iban: null,
        aktiv: true,
        notizen: null,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Gespeichert')
      setDirty(false)
      onSaved?.(r.id)
      if (!stayOnPage) {
        router.push(`/handwerker/${r.id}`)
        return
      }
      onClose()
    })
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Partner"
      context="detail"
      dirty={dirty}
      confirmBusy={pending}
      onConfirm={submit}
      size="lg"
    >
      <div className="space-y-3">
        <MockField label="Firma" full>
          <input
            className="inp"
            value={firma}
            onChange={(e) => mark(() => setFirma(e.target.value))}
          />
        </MockField>
        <div className="form-grid-2 grid gap-3 md:grid-cols-2">
          <MockField label="Vorname">
            <input
              className="inp"
              value={vorname}
              onChange={(e) => mark(() => setVorname(e.target.value))}
            />
          </MockField>
          <MockField label="Nachname">
            <input
              className="inp"
              value={nachname}
              onChange={(e) => mark(() => setNachname(e.target.value))}
            />
          </MockField>
        </div>
        <div className="form-grid-2 grid gap-3 md:grid-cols-2">
          <MockField label="Telefon">
            <input className="inp" value={tel} onChange={(e) => mark(() => setTel(e.target.value))} />
          </MockField>
          <MockField label="E-Mail">
            <input
              className="inp"
              type="email"
              value={mail}
              onChange={(e) => mark(() => setMail(e.target.value))}
            />
          </MockField>
        </div>
        {gewerkeOptionen.length > 0 ? (
          <div>
            <p className="mb-2 text-[12px] text-bw-text-muted">Gewerke</p>
            <div className="flex flex-wrap gap-1.5">
              {gewerkeOptionen.map((g) => (
                <MockChip
                  key={g.id}
                  active={gewerkSlugs.has(g.slug)}
                  onClick={() => toggleGewerk(g.slug)}
                >
                  {g.name}
                </MockChip>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </EditorSheet>
  )
}

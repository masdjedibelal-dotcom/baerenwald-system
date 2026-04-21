'use client'

import { useState } from 'react'
import { Plus, Inbox, Calendar, StickyNote, Clock } from 'lucide-react'
import { Modal, Button } from '@/components/ui'
import { useRouter } from 'next/navigation'

const ACTIONS = [
  {
    icon: Inbox,
    label: 'Neue Anfrage',
    color: 'bg-bw-accent',
    action: 'anfrage',
  },
  {
    icon: Calendar,
    label: 'Neuer Termin',
    color: 'bg-bw-link',
    action: 'termin',
  },
  {
    icon: StickyNote,
    label: 'Neue Notiz',
    color: 'bg-bw-success',
    action: 'notiz',
  },
  {
    icon: Clock,
    label: 'Wiedervorlage',
    color: 'bg-purple-500',
    action: 'wiedervorlage',
  },
] as const

export function FloatingAction() {
  const [open, setOpen] = useState(false)
  const [modal, setModal] = useState<string | null>(null)
  const router = useRouter()

  const handleAction = (action: string) => {
    setOpen(false)
    if (action === 'anfrage') {
      router.push('/anfragen/neu')
    } else {
      setModal(action)
    }
  }

  return (
    <>
      {open ? (
        <>
          <div className="z-header fixed inset-0" onClick={() => setOpen(false)} role="presentation" />

          <div className="z-header fixed bottom-24 right-4 flex flex-col items-end space-y-2">
            {ACTIONS.map((item, i) => {
              const Icon = item.icon
              return (
                <div
                  key={item.action}
                  className="flex animate-slide-up items-center gap-3"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="whitespace-nowrap rounded-lg bg-bw-dark px-3 py-1.5 text-sm text-white shadow-md">{item.label}</div>
                  <button
                    type="button"
                    onClick={() => handleAction(item.action)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md transition-all hover:opacity-90 active:scale-95 ${item.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                </div>
              )
            })}
          </div>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`fab ${open ? 'rotate-45 bg-bw-dark' : ''}`}
        aria-label="Schnellaktionen"
      >
        <Plus className="h-6 w-6" />
      </button>

      <Modal
        open={modal === 'termin'}
        onClose={() => setModal(null)}
        title="Neuer Termin"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={() => setModal(null)}>
              Abbrechen
            </Button>
            <Button variant="primary" type="button" onClick={() => setModal(null)}>
              Speichern
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="input-label">Titel *</label>
            <input className="input" placeholder="Besichtigung…" />
          </div>
          <div className="form-grid-2">
            <div>
              <label className="input-label">Datum *</label>
              <input type="date" className="input" />
            </div>
            <div>
              <label className="input-label">Uhrzeit</label>
              <input type="time" className="input" />
            </div>
          </div>
          <div>
            <label className="input-label">Adresse</label>
            <input className="input" placeholder="Straße, PLZ München" />
          </div>
        </div>
      </Modal>

      <Modal
        open={modal === 'wiedervorlage'}
        onClose={() => setModal(null)}
        title="Wiedervorlage setzen"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={() => setModal(null)}>
              Abbrechen
            </Button>
            <Button variant="primary" type="button" onClick={() => setModal(null)}>
              Speichern
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="form-grid-2">
            <div>
              <label className="input-label">Datum *</label>
              <input type="date" className="input" />
            </div>
            <div>
              <label className="input-label">Uhrzeit</label>
              <input type="time" className="input" defaultValue="09:00" />
            </div>
          </div>
          <div>
            <label className="input-label">Notiz</label>
            <textarea className="input" rows={3} placeholder="Wegen Preis nachfragen…" />
          </div>
        </div>
      </Modal>

      <Modal
        open={modal === 'notiz'}
        onClose={() => setModal(null)}
        title="Neue Notiz"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={() => setModal(null)}>
              Abbrechen
            </Button>
            <Button variant="primary" type="button" onClick={() => setModal(null)}>
              Speichern
            </Button>
          </div>
        }
      >
        <div>
          <label className="input-label">Notiz *</label>
          <textarea className="input" rows={5} placeholder="Notiz eingeben…" />
        </div>
      </Modal>
    </>
  )
}

'use client'

import { MockCard } from '@/components/mock-ui/MockCard'
import { MockProp } from '@/components/mock-ui/MockProp'
import { MockBtn, MockBadge } from '@/components/mock-ui/MockPrimitives'
import { toast } from '@/components/ui/app-toast'

const ROLLEN: { rolle: string; beschreibung: string; aktiv: boolean }[] = [
  { rolle: 'Inhaber', beschreibung: 'Voller Zugriff inkl. Finanzen & Einstellungen', aktiv: true },
  { rolle: 'Projektleitung', beschreibung: 'Aufträge, Handwerker, Termine', aktiv: true },
  { rolle: 'Backoffice', beschreibung: 'Rechnungen, Kunden, Dokumente', aktiv: true },
  { rolle: 'Nur Lesen', beschreibung: 'Ansicht ohne Bearbeitung', aktiv: false },
]

export function EinstellungenSicherheitClient() {
  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <MockCard title="Datenschutz & DSGVO" icon="shield-check">
        <div className="props">
          <MockProp label="Serverstandort">
            <span style={{ fontWeight: 600 }}>🇩🇪 Deutschland (Frankfurt)</span>
          </MockProp>
          <MockProp label="Verschlüsselung">AES-256 · TLS 1.3</MockProp>
          <MockProp label="AV-Vertrag">
            <span style={{ color: 'var(--green)', fontWeight: 500 }}>✓ unterschrieben</span>
          </MockProp>
          <MockProp label="Löschfristen">Anfragen 24 Mon. · Rechnungen 10 Jahre</MockProp>
          <MockProp label="Daten-Export">jederzeit (CSV / DATEV)</MockProp>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <MockBtn sm icon="download" onClick={() => toast.success('Datenexport gestartet (Demo)')}>
            Datenexport
          </MockBtn>
          <MockBtn sm icon="file-text" onClick={() => toast.success('AV-Vertrag geöffnet (Demo)')}>
            AV-Vertrag
          </MockBtn>
        </div>
      </MockCard>

      <MockCard title="Rollen & Rechte" icon="users">
        {ROLLEN.map((r) => (
          <div key={r.rolle} className="setting-row">
            <div>
              <div className="lbl">{r.rolle}</div>
              <div className="sub">{r.beschreibung}</div>
            </div>
            <MockBadge kind={r.aktiv ? 'aktiv' : 'plain'}>{r.aktiv ? 'Aktiv' : 'Verfügbar'}</MockBadge>
          </div>
        ))}
      </MockCard>

      <MockCard title="Revisionssicherheit" icon="history">
        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
          Alle Änderungen an Angeboten, Aufträgen und Rechnungen werden protokolliert (wer, wann, was).
          GoBD-konforme Aufbewahrung, unveränderbare Rechnungs-PDFs.
        </div>
        <div style={{ marginTop: 10 }}>
          <MockBtn sm icon="list" onClick={() => toast.success('Änderungsprotokoll geöffnet (Demo)')}>
            Änderungsprotokoll
          </MockBtn>
        </div>
      </MockCard>

      <MockCard title="DATEV-Schnittstelle" icon="calculator">
        <div className="setting-row">
          <div>
            <div className="lbl">Buchungsstapel-Export</div>
            <div className="sub">Monatlich an Steuerberater</div>
          </div>
          <MockBadge kind="aktiv">Aktiv</MockBadge>
        </div>
        <div className="setting-row">
          <div>
            <div className="lbl">Berater-Nummer</div>
            <div className="sub">DATEV-Mandant</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>1234567 / 89</div>
        </div>
      </MockCard>
    </div>
  )
}

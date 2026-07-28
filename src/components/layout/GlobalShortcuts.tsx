'use client'

import { useEffect, useState } from 'react'
import { useAssistent } from '@/components/assistent/AssistentProvider'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { MockIcon } from '@/components/mock-ui/MockIcon'

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return Boolean(el.closest('[contenteditable="true"], .cmdk, .cbx-pop'))
}

const SHORTCUTS = [
  { keys: '⌘K', label: 'Suche öffnen' },
  { keys: '⌘J', label: 'Assistent' },
  { keys: 'n', label: 'Neu erstellen' },
  { keys: '/', label: 'Suche fokussieren' },
  { keys: '?', label: 'Tastenkürzel-Übersicht' },
  { keys: 'Esc', label: 'Schließen / zurück' },
]

/**
 * Spec §14 Desktop-Kürzel: ⌘K · ⌘J · n · / · ? · Esc
 * ⌘K/ / öffnen CommandPalette; TopBarSearch bleibt per Klick.
 */
export function GlobalShortcuts({ onNeu }: { onNeu?: () => void }) {
  const { toggle: toggleAssistent, setOpen: setAssistentOpen, open: assistentOpen } = useAssistent()
  const [cmdOpen, setCmdOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey
      const key = e.key

      if (meta && key.toLowerCase() === 'k') {
        e.preventDefault()
        setHelpOpen(false)
        setCmdOpen(true)
        return
      }
      if (meta && key.toLowerCase() === 'j') {
        e.preventDefault()
        toggleAssistent()
        return
      }

      if (key === 'Escape') {
        if (helpOpen) {
          e.preventDefault()
          setHelpOpen(false)
          return
        }
        if (cmdOpen) {
          e.preventDefault()
          setCmdOpen(false)
          return
        }
        if (assistentOpen) {
          e.preventDefault()
          setAssistentOpen(false)
          return
        }
        return
      }

      if (isTypingTarget(e.target)) return

      if (key === '/' && !meta) {
        e.preventDefault()
        setHelpOpen(false)
        setCmdOpen(true)
        return
      }
      if (key === '?' && !meta) {
        e.preventDefault()
        setCmdOpen(false)
        setHelpOpen(true)
        return
      }
      if (key.toLowerCase() === 'n' && !meta) {
        e.preventDefault()
        onNeu?.()
        document.dispatchEvent(new Event('open-neu'))
        return
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [assistentOpen, cmdOpen, helpOpen, onNeu, setAssistentOpen, toggleAssistent])

  return (
    <>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      {helpOpen ? (
        <div
          className="cmdk-overlay cmdk-pop"
          role="dialog"
          aria-modal="true"
          aria-label="Tastenkürzel"
          onClick={(e) => {
            if ((e.target as HTMLElement).classList.contains('cmdk-overlay')) setHelpOpen(false)
          }}
        >
          <div className="cmdk shortcuts-help">
            <div className="cmdk-input">
              <MockIcon ctx="default" n="help" size={18} />
              <span style={{ flex: 1, fontWeight: 600 }}>Tastenkürzel</span>
              <kbd>ESC</kbd>
            </div>
            <div className="cmdk-list">
              {SHORTCUTS.map((s) => (
                <div key={s.keys} className="cmdk-item shortcuts-help-row">
                  <kbd className="shortcuts-help-kbd">{s.keys}</kbd>
                  <span style={{ flex: 1 }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockNotizComposer } from '@/components/mock-ui/MockDetailCards'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { useTransition } from '@/components/ui/action-busy'

import { useMemo, useState } from 'react';
import { addLeadNotizRow, deleteLeadNotizRow } from "@/app/(dashboard)/anfragen/actions";
import { leadNotizFotoUrls } from "@/lib/anfragen/lead-notiz-fotos";
import { toast } from "@/components/ui/app-toast";
import type { LeadNotizRow } from "@/lib/types";
import type { EntityMenuItem } from "@/lib/entity-menu";
import { richTextToPlain } from "@/lib/rich-text";
import { formatTimelineStamp } from "@/lib/utils";
import { deleteWithUndo } from '@/lib/ui/delete-with-undo'
import { useIsMobile } from "@/hooks/useIsMobile";
import { TOAST } from '@/lib/copy'

function leadNotizErstellerLabel(n: LeadNotizRow): string {
  const name = n.user_profiles?.name?.trim();
  if (name) return name;
  if (n.erstellt_von) return "Nutzer:in";
  return "System";
}

function istBildAnhangUrl(url: string): boolean {
  const u = url.split("?")[0].toLowerCase();
  if (u.includes("/lead-notizen-fotos/")) return true;
  return /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(u);
}

export function AnfrageNotizenTab({
  leadId,
  notizen,
  onReload,
}: {
  leadId: string;
  notizen: LeadNotizRow[];
  onReload: () => void;
}) {
  const [val, setVal] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const isMobile = useIsMobile();
  const [pending, startTransition] = useTransition();

  const allgemeineNotizen = useMemo(
    () =>
      notizen.filter(
        (n) => !n.kalender_termin_id?.trim() && !hiddenIds.has(n.id)
      ),
    [notizen, hiddenIds],
  );

  function speichern() {
    const text = val.trim();
    if (!text || pending) return;
    startTransition(async () => {
      const r = await addLeadNotizRow(leadId, text);
      if (!r.ok) {
        toast.systemError(r);
        return;
      }
      toast.success(TOAST.notizHinzugefuegt);
      setVal("");
      onReload();
      // revalidatePath in addLeadNotizRow — onReload reicht für Client-State
    });
  }

  function loeschen(id: string, _preview?: string) {
    deleteWithUndo({
      key: `lead-notiz:${id}`,
      removeOptimistic: () =>
        setHiddenIds((prev) => new Set(prev).add(id)),
      restoreOptimistic: () =>
        setHiddenIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        }),
      commit: async () => {
        const r = await deleteLeadNotizRow(id, leadId)
        if (!r.ok) {
          toast.systemError(r)
          setHiddenIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
          return
        }
        onReload()
      },
      message: TOAST.geloescht,
    })
  }

  return (
    <>
      <MockCard title={`Notizen · ${allgemeineNotizen.length}`} icon="messages" className="dshell-framed">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: allgemeineNotizen.length ? 14 : 0,
          }}
        >
          {allgemeineNotizen.length === 0 ? (
            <div style={{ fontSize: 'var(--fs-meta)', color: "var(--text-4)", padding: "0.25rem 0" }}>
              {isMobile
                ? "Noch keine Notizen. Über „Notiz“ oben hinzufügen."
                : "Noch keine Notizen — schreibe die erste unten."}
            </div>
          ) : (
            allgemeineNotizen.map((n) => {
              const text = richTextToPlain(n.inhalt ?? "").trim();
              const fotos = leadNotizFotoUrls(n).filter(istBildAnhangUrl);
              const autor = leadNotizErstellerLabel(n);
              const time = formatTimelineStamp(n.created_at);
              return (
                <div
                  key={n.id}
                  className="note"
                  style={{ position: "relative", paddingRight: isMobile ? 0 : 36 }}
                >
                  <div className="meta">
                    {autor}
                    {time ? ` · ${time}` : ""}
                  </div>
                  {!isMobile ? (
                    <div style={{ position: "absolute", top: 4, right: 4 }}>
                      <MockEntityRowMenu
                        title="Notiz"
                        items={
                          [
                            {
                              icon: "trash",
                              label: "Löschen",
                              danger: true,
                              disabled: pending,
                              onClick: () =>
                                loeschen(n.id, text.split("\n")[0] || "Notiz"),
                            },
                          ] satisfies EntityMenuItem[]
                        }
                      />
                    </div>
                  ) : null}
                  {text ? (
                    <div style={{ whiteSpace: "pre-wrap" }}>{text}</div>
                  ) : null}
                  {fotos.length ? (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: text ? 8 : 4,
                      }}
                    >
                      {fotos.map((url) => (
                        <MockBtn key={url} type="button" onClick={() => setLightboxUrl(url)} style={{
                            width: 72,
                            height: 54,
                            borderRadius: 8,
                            overflow: "hidden",
                            border: "0.03125rem solid var(--border)",
                            padding: 0,
                            background: "var(--bg)",
                            cursor: "pointer",
                          }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </MockBtn>
                      ))}
                    </div>
                  ) : n.datei_url && !istBildAnhangUrl(n.datei_url) ? (
                    <a
                      href={n.datei_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link"
                      style={{ display: "inline-block", marginTop: 6, fontSize: 'var(--fs-meta)' }}
                    >
                      Anhang öffnen
                    </a>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {!isMobile ? (
          <MockNotizComposer
            value={val}
            onChange={setVal}
            onSubmit={speichern}
            disabled={pending}
            placeholder="Notiz schreiben"
          />
        ) : null}
      </MockCard>

      <EditorSheet
        open={!!lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        title="Foto"
        secondary={{ label: 'Schließen', onClick: () => setLightboxUrl(null) }}
      >
        {lightboxUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lightboxUrl}
            alt="Notiz-Foto"
            style={{ width: "100%", borderRadius: 8, display: "block" }}
          />
        ) : null}
      </EditorSheet>
    </>
  );
}

"use client";
import { useTransition } from '@/components/ui/action-busy'

import { useMemo, useState } from 'react';
import { useRouter } from "next/navigation";
import { addLeadNotizRow, deleteLeadNotizRow } from "@/app/(dashboard)/anfragen/actions";
import { leadNotizFotoUrls } from "@/lib/anfragen/lead-notiz-fotos";
import { toast } from "@/components/ui/app-toast";
import type { LeadNotizRow } from "@/lib/types";
import { richTextToPlain } from "@/lib/rich-text";
import { formatTimelineStamp } from "@/lib/utils";
import { MockCard } from "@/components/mock-ui/MockCard";
import { MockNotizComposer } from "@/components/mock-ui/MockDetailCards";
import { MockBtn } from "@/components/mock-ui/MockPrimitives";
import { MockModal } from "@/components/mock-ui/MockModal";
import { useIsMobile } from "@/hooks/useIsMobile";

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
  const router = useRouter();
  const [val, setVal] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [pending, startTransition] = useTransition();

  const allgemeineNotizen = useMemo(
    () => notizen.filter((n) => !n.kalender_termin_id?.trim()),
    [notizen],
  );

  function speichern() {
    const text = val.trim();
    if (!text || pending) return;
    startTransition(async () => {
      const r = await addLeadNotizRow(leadId, text);
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      setVal("");
      onReload();
      router.refresh();
    });
  }

  function loeschen(id: string) {
    if (!window.confirm("Notiz löschen?")) return;
    startTransition(async () => {
      const r = await deleteLeadNotizRow(id, leadId);
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      onReload();
      router.refresh();
    });
  }

  return (
    <>
      <MockCard title={`Notizen · ${allgemeineNotizen.length}`} icon="messages">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: allgemeineNotizen.length ? 14 : 0,
          }}
        >
          {allgemeineNotizen.length === 0 ? (
            <div style={{ fontSize: 'var(--fs-meta)', color: "var(--text-4)", padding: "4px 0" }}>
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
                      <MockBtn
                        sm
                        kind="ghost"
                        icon="trash"
                        title="Löschen"
                        disabled={pending}
                        onClick={() => loeschen(n.id)}
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
                        <button
                          key={url}
                          type="button"
                          onClick={() => setLightboxUrl(url)}
                          style={{
                            width: 72,
                            height: 54,
                            borderRadius: 8,
                            overflow: "hidden",
                            border: "0.5px solid var(--border)",
                            padding: 0,
                            background: "var(--bg)",
                            cursor: "pointer",
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </button>
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

      <MockModal
        open={!!lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        icon="photo"
        title="Foto"
        footer={
          <MockBtn sm kind="primary" icon="x" onClick={() => setLightboxUrl(null)}>
            Schließen
          </MockBtn>
        }
      >
        {lightboxUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lightboxUrl}
            alt="Notiz-Foto"
            style={{ width: "100%", borderRadius: 8, display: "block" }}
          />
        ) : null}
      </MockModal>
    </>
  );
}

"use client";
import { useTransition } from '@/components/ui/action-busy'

import { useMemo, useRef, useState } from 'react';
import {
  deleteLeadDokument,
  insertLeadDokument,
} from "@/app/(dashboard)/anfragen/dokumente-actions";
import { toast } from "@/components/ui/app-toast";
import {
  rechnungIstAlsAkteUnterlage,
} from "@/lib/auftraege/auftrag-dokumente-helpers";
import { rechnungDokumentBezeichnung } from "@/lib/rechnungen/zahlungsplan";
import type { LeadDokumentRow } from "@/lib/types";
import { MockDokumenteCard } from "@/components/mock-ui/MockDetailCards";
import { MockIcon } from "@/components/mock-ui/MockIcon";
import { MockBtn } from "@/components/mock-ui/MockPrimitives";
import { DokMobileCard } from "@/components/ui/DokMobileCard";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";

type AngebotKurz = {
  id: string;
  created_at: string;
  angebotsnr?: string | null;
  pdf_url?: string | null;
};

type RechnungKurz = {
  id: string;
  created_at?: string | null;
  rechnungsnummer?: string | null;
  status?: string | null;
  rechnungsdatum?: string | null;
  gesendet_at?: string | null;
  pdf_url?: string | null;
  rechnung_art?: string | null;
  abschlag_index?: number | null;
  beleg_typ?: string | null;
};

type DocRow = {
  id: string;
  name: string;
  href: string;
  created_at: string;
  groesse_bytes: number | null;
  quelle: "upload" | "angebot" | "rechnung";
  dokumentId?: string;
  beschreibung: string;
  freigabe: boolean;
};

const COLS = "minmax(0, 1fr) auto auto";

function formatBytes(n: number | null | undefined): string | null {
  if (n == null || n <= 0) return null;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDatum(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function openDokumentDatei(url: string) {
  const href = url.trim();
  if (!href) return;
  window.open(href, "_blank", "noopener,noreferrer");
}

export function AnfrageDokumenteTab({
  leadId,
  dokumente,
  angebote,
  rechnungen = [],
  immerRechnungIds = [],
  onReload,
}: {
  leadId: string
  dokumente: LeadDokumentRow[]
  angebote: AngebotKurz[]
  rechnungen?: RechnungKurz[]
  /** Auch Entwürfe / sonst ausgefilterte Rechnungen (z. B. aktuelle RE in der Akte). */
  immerRechnungIds?: string[]
  onReload: () => void
}) {
  const [meta, setMeta] = useState<
    Record<string, { name?: string; beschreibung: string; freigabe: boolean; created_at?: string }>
  >({});
  const [editId, setEditId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const docs = useMemo((): DocRow[] => {
    const rows: DocRow[] = dokumente.map((d) => {
      const m = meta[`upload-${d.id}`];
      return {
        id: `upload-${d.id}`,
        name: m?.name?.trim() || d.name.trim() || "Dokument",
        href: d.datei_url,
        created_at: m?.created_at || d.created_at,
        groesse_bytes: d.groesse_bytes,
        quelle: "upload",
        dokumentId: d.id,
        beschreibung: m?.beschreibung ?? "",
        freigabe: m?.freigabe ?? false,
      };
    });

    for (const a of angebote) {
      const id = `angebot-${a.id}`;
      const m = meta[id];
      const defaultName = a.angebotsnr?.trim()
        ? `Angebot ${a.angebotsnr.trim()}`
        : `Angebot ${a.id.slice(0, 8).toUpperCase()}`;
      rows.push({
        id,
        name: m?.name?.trim() || defaultName,
        href: a.pdf_url?.trim() || `/api/angebote/${a.id}/pdf`,
        created_at: m?.created_at || a.created_at,
        groesse_bytes: null,
        quelle: "angebot",
        beschreibung: m?.beschreibung ?? "",
        freigabe: m?.freigabe ?? true,
      });
    }

    for (const r of rechnungen) {
      const force = immerRechnungIds.includes(r.id)
      if (!force && !rechnungIstAlsAkteUnterlage(r)) continue
      const id = `rechnung-${r.id}`
      const m = meta[id]
      const st = (r.status ?? "").toLowerCase()
      const art =
        (r.beleg_typ ?? "").toLowerCase() === "gutschrift"
          ? "Gutschrift"
          : rechnungDokumentBezeichnung(r.rechnung_art, r.abschlag_index)
      const defaultName = r.rechnungsnummer?.trim() || art
      const defaultBeschreibung = force && st === "entwurf"
        ? "Rechnungs-PDF"
        : `${art} · ${st || "—"}`
      rows.push({
        id,
        name: m?.name?.trim() || defaultName,
        href: r.pdf_url?.trim() || `/api/rechnungen/${r.id}/pdf`,
        created_at:
          m?.created_at ||
          r.gesendet_at ||
          r.rechnungsdatum ||
          r.created_at ||
          new Date().toISOString(),
        groesse_bytes: null,
        quelle: "rechnung",
        beschreibung: m?.beschreibung?.trim() || defaultBeschreibung,
        freigabe: m?.freigabe ?? (st === "gesendet" || st === "bezahlt" || st === "versendet"),
      })
    }

    return rows.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
  }, [dokumente, angebote, rechnungen, immerRechnungIds, meta])

  const upd = (id: string, patch: Partial<{ name: string; beschreibung: string; freigabe: boolean; created_at: string }>) => {
    setMeta((prev) => {
      const cur = prev[id] ?? { beschreibung: "", freigabe: false };
      return { ...prev, [id]: { ...cur, ...patch } };
    });
  };

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 5);
    if (!list.length) return;
    setUploading(true);
    try {
      for (const file of list) {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("filename", file.name);
        const res = await fetch(`/api/anfragen/${leadId}/dokument/upload`, {
          method: "POST",
          body: fd,
        });
        const json = (await res.json()) as {
          url?: string;
          groesse_bytes?: number;
          error?: string;
        };
        if (!res.ok || !json.url) throw new Error(json.error ?? "Upload fehlgeschlagen");

        const ins = await insertLeadDokument({
          leadId,
          name: file.name,
          datei_url: json.url,
          groesse_bytes: json.groesse_bytes ?? file.size,
        });
        if (!ins.ok) throw new Error(ins.message);
      }

      toast.success(
        list.length === 1 ? "Dokument hochgeladen" : `${list.length} Dokumente hochgeladen`,
      );
      startTransition(() => onReload());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeDoc(row: DocRow) {
    if (row.quelle !== "upload" || !row.dokumentId) return;
    if (!confirm(`„${row.name}" wirklich löschen?`)) return;
    startTransition(async () => {
      const r = await deleteLeadDokument(row.dokumentId!, leadId);
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      toast.success("Dokument gelöscht");
      if (editId === row.id) setEditId(null);
      onReload();
    });
  }

  const busy = uploading || pending;

  return (
    <>
      <MockDokumenteCard count={docs.length}>
        {!isMobile ? (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                if (e.target.files?.length) void uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />

            <div
              className={cn(
                "dok-upload-zone",
                dragOver && "dok-upload-zone-active",
                busy && "pointer-events-none opacity-60",
              )}
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
              }}
            >
              <MockIcon ctx="btn" n="cloud-upload" size={18} />
              {uploading ? "Wird hochgeladen…" : "Dateien hier ablegen oder klicken"}
            </div>
          </>
        ) : null}

        {docs.length === 0 ? (
          <p className="py-4 text-center text-[length:var(--fs-meta)] text-bw-text-muted">
            {isMobile
              ? 'Noch keine Dokumente. Über „Dokument“ oben hochladen.'
              : 'Noch keine Dokumente.'}
          </p>
        ) : isMobile ? (
          <div className="dok-cards">
            {docs.map((d) => {
              const sizeLabel = formatBytes(d.groesse_bytes);
              const meta = [formatDatum(d.created_at), sizeLabel].filter(Boolean).join(" · ");
              return (
                <DokMobileCard
                  key={d.id}
                  title={d.name}
                  meta={meta}
                  onClick={() => openDokumentDatei(d.href)}
                  badge={
                    <span className={cn("dok-card__tag", d.freigabe && "is-kunde")}>
                      {d.freigabe ? "Kunde" : "intern"}
                    </span>
                  }
                />
              );
            })}
          </div>
        ) : (
          <div className="dok-list">
            {docs.map((d) => {
              const editing = editId === d.id;
              const sizeLabel = formatBytes(d.groesse_bytes);
              const meta = [formatDatum(d.created_at), sizeLabel].filter(Boolean).join(" · ");
              return (
                <div
                  key={d.id}
                  className={cn("list-row", !editing && "dok-list__row--openable")}
                  style={{
                    gridTemplateColumns: COLS,
                    cursor: editing ? "default" : "pointer",
                    alignItems: "center",
                  }}
                  role={editing ? undefined : "button"}
                  tabIndex={editing ? undefined : 0}
                  onClick={() => {
                    if (!editing) openDokumentDatei(d.href);
                  }}
                  onKeyDown={(e) => {
                    if (editing) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openDokumentDatei(d.href);
                    }
                  }}
                >
                  {editing ? (
                    <div
                      className="dok-list__main min-w-0"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <input
                        className="txt"
                        value={d.name}
                        onChange={(e) => upd(d.id, { name: e.target.value })}
                        style={{ height: 30 }}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="dok-list__main min-w-0">
                      <div className="dok-list__name">
                        {d.name}
                        {meta ? (
                          <span className="dok-list__name-size"> · {meta}</span>
                        ) : null}
                      </div>
                    </div>
                  )}
                  <label
                    className="dok-list__freigabe"
                    style={{ cursor: "pointer" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={d.freigabe}
                      onChange={(e) => upd(d.id, { freigabe: e.target.checked })}
                    />
                    <span className={d.freigabe ? "is-kunde" : undefined}>
                      {d.freigabe ? "Kunde" : "intern"}
                    </span>
                  </label>
                  <div
                    className="dok-list__actions"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {editing ? (
                      <MockBtn
                        sm
                        kind="ghost"
                        icon="check"
                        title="Fertig"
                        onClick={() => setEditId(null)}
                      />
                    ) : (
                      <MockBtn
                        sm
                        kind="ghost"
                        icon="eye"
                        title="Ansehen"
                        onClick={() => openDokumentDatei(d.href)}
                      />
                    )}
                    {d.quelle === "upload" ? (
                      <MockBtn
                        sm
                        kind="ghost"
                        icon="trash"
                        title="Löschen"
                        disabled={busy}
                        className="dok-list__action--extra"
                        onClick={() => removeDoc(d)}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </MockDokumenteCard>
    </>
  );
}

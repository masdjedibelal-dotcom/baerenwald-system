/* ============ Vorgänge — ein vereinter Vorgang, gefiltert nach Phase ============ */
/* Alle Entitäten (Anfrage, Angebot, Auftrag, Rechnung) sind EIN Vorgang.
   Phase = Spalte + Filter. Tabelle mit Multi-Select-Bulk + Zeilen-⋯ + Drill-Down. */

const PHASE_META = {
  anfrage:  { label: "Anfrage",  kind: "neu",    icon: "inbox",        screen: "anfragen" },
  angebot:  { label: "Angebot",  kind: "warten", icon: "file-invoice", screen: "angebote" },
  auftrag:  { label: "Auftrag",  kind: "aktiv",  icon: "briefcase",    screen: "auftraege" },
  rechnung: { label: "Rechnung", kind: "fertig", icon: "receipt",      screen: "rechnungen" }
};

/* Wer muss als Nächstes handeln (Aktion nötig). UI-Labels je Actor. */
const ACTOR_LABEL = { freigabe: "Wartet auf Freigabe (HV)" };
/* Nur echte, offene Aktionen (gelb): Freigabe durch die Hausverwaltung ausstehend. */
const NEEDS_ACTION = {
  "anfrage:L-2024-0142": "freigabe",
  "angebot:AN-2026-0083": "freigabe"
};
/* Kontext-Badges je Vorgang: notfall / wartetFreigabe (Zustand) + kanal (Quelle: hv|website|direkt).
   Vier Beispiel-Kombis: nur Kanal · Notfall+HV · Wartet+HV · alle drei. */
const CTX_MAP = {
  "anfrage:L-2024-0139":   { kanal: "website" },                                  // nur Kanal
  "anfrage:L-2024-0142":   { notfall: true, kanal: "hv" },                        // Notfall + HV-Meldung
  "angebot:AN-2026-0083":  { wartetFreigabe: true, kanal: "hv" },                 // Wartet auf Freigabe + HV-Meldung
  "auftrag:AU-2024-0042":  { notfall: true, wartetFreigabe: true, kanal: "hv" },  // alle drei
  "angebot:AN-2026-0081":  { kanal: "direkt" },
  "auftrag:AU-2024-0039":  { kanal: "hv" },
  "rechnung:RE-2026-0138": { kanal: "hv" }
};
if (typeof window !== "undefined") window.CTX_MAP = CTX_MAP;

/* Org-Kontext für HV-Meldungen: verknüpft einen Vorgang mit Hausverwaltung (Auftraggeber),
   Objekt, Wohneinheit und Melder (Mieter). Nur gesetzt, wenn kanal === "hv". */
const HV_CONTEXT = {
  "anfrage:L-2024-0142": {
    verwaltungId: "C-004", sachbearbeiter: "Frau Dr. Weidmann", sbTel: "089 5566-120", sbMail: "weidmann@hausverwaltung-weiss.de",
    objektId: "OBJ-01", einheitId: "WE-01",
    melder: { name: "Familie Osman", rolle: "Mieter", tel: "0176 5544332", mail: "osman@mail.de" },
    meldungAm: "Heute · 08:54", ticket: "HV-2026-0417"
  },
  "auftrag:AU-2024-0042": {
    verwaltungId: "C-004", sachbearbeiter: "Frau Dr. Weidmann", sbTel: "089 5566-120", sbMail: "weidmann@hausverwaltung-weiss.de",
    objektId: "OBJ-02", einheitId: "WE-05",
    melder: { name: "Frau Reithmeier", rolle: "Mieter", tel: "0151 998877", mail: "reithmeier@gmx.de" },
    meldungAm: "12.07. · 16:20", ticket: "HV-2026-0388"
  },
  "angebot:AN-2026-0083": {
    verwaltungId: "C-004", sachbearbeiter: "Frau Dr. Weidmann", sbTel: "089 5566-120", sbMail: "weidmann@hausverwaltung-weiss.de",
    objektId: "OBJ-01", einheitId: "WE-02",
    melder: { name: "Herr Bauer", rolle: "Mieter", tel: "0170 1122334", mail: "bauer@web.de" },
    meldungAm: "10.07. · 09:30", ticket: "HV-2026-0361"
  }
};
if (typeof window !== "undefined") window.HV_CONTEXT = HV_CONTEXT;

function buildVorgaenge() {
  const rows = [];
  LEADS.forEach(l => rows.push({
    key: "anfrage:" + l.id, phase: "anfrage", id: l.id, screen: "anfragen",
    titel: l.project, kunde: l.name, initials: l.initials, color: l.color, ort: l.area,
    wert: (l.budgetLo + l.budgetHi) / 2, wertLabel: `${(l.budgetLo/1000).toFixed(0)}–${(l.budgetHi/1000).toFixed(0)} T€`,
    statusKey: l.status, status: STATUSES[l.status], datum: "2026-07-10", zeit: ((l.received||"").split("· ")[1]||"").trim(), tel: l.tel, mail: l.mail
  }));
  ANGEBOTE.forEach(a => rows.push({
    key: "angebot:" + a.id, phase: "angebot", id: a.id, screen: "angebote",
    titel: a.titel, kunde: a.customer.name, initials: a.customer.initials, color: "", ort: "",
    wert: a.nettoTotal, wertLabel: formatEUR(a.nettoTotal),
    statusKey: a.status, status: ANGEBOT_STATUSES[a.status], datum: a.erstellt, tel: a.customer.tel, mail: a.customer.mail
  }));
  ORDERS.forEach(o => {
    const cust = (typeof CUSTOMERS !== "undefined") ? CUSTOMERS.find(c => c.id === o.customerId) : null;
    rows.push({
    key: "auftrag:" + o.id, phase: "auftrag", id: o.id, screen: "auftraege",
    titel: o.title, kunde: o.customer, initials: (o.customer||"").split(" ").map(s=>s[0]).slice(0,2).join(""), color: "", ort: o.area,
    wert: o.value, wertLabel: formatEUR(o.value),
    tel: cust && cust.tel, mail: cust && cust.mail,
    handwerkerIds: o.handwerkerIds || [], partnerId: o.partnerId || null,
    statusKey: o.status, status: STATUSES[o.status] || { label: o.status, kind: "aktiv" }, datum: o.end, progress: o.progress
  }); });
  (typeof RECHNUNGEN !== "undefined" ? RECHNUNGEN : []).forEach(r => rows.push({
    key: "rechnung:" + r.id, phase: "rechnung", id: r.id, screen: "rechnungen",
    titel: r.titel, kunde: r.customer.name, initials: r.customer.initials, color: "", ort: "",
    wert: r.bruttoTotal, wertLabel: formatEUR(r.bruttoTotal),
    tel: r.customer.tel, mail: r.customer.mail, refAuftrag: r.auftragId,
    statusKey: r.status, status: RECHNUNG_STATUSES[r.status] || { label: r.status, kind: "fertig" }, datum: r.faellig
  }));
  rows.forEach(r => { r.actor = NEEDS_ACTION[r.key] || null; r.needsAction = !!r.actor; r.ctx = CTX_MAP[r.key] || null; });
  return rows;
}

const VORGANG_PHASES = ["alle", "anfrage", "angebot", "auftrag", "rechnung"];

function VorgaengeList({ navigate, query, setQuery, filter, setFilter, showToast, openStatusModal, openAngebotWizard, restrictKunde, restrictHandwerker, restrictPartner, embedded }) {
  const _q = React.useState("");
  const _f = React.useState("alle");
  if (setQuery === undefined) { query = _q[0]; setQuery = _q[1]; }
  if (setFilter === undefined) { filter = _f[0]; setFilter = _f[1]; }
  const baseAll = React.useMemo(buildVorgaenge, []);
  const base = React.useMemo(() => {
    if (restrictKunde) return baseAll.filter(v => (v.kunde || "") === restrictKunde);
    if (restrictHandwerker) return baseAll.filter(v => (v.handwerkerIds || []).includes(restrictHandwerker));
    if (restrictPartner) return baseAll.filter(v => v.partnerId === restrictPartner);
    return baseAll;
  }, [baseAll, restrictKunde, restrictHandwerker, restrictPartner]);
  const [dupes, setDupes] = React.useState([]);
  const all = React.useMemo(() => {
    const arr = [...base];
    dupes.forEach(d => {
      const i = arr.findIndex(r => r.key === d.afterKey);
      if (i >= 0) arr.splice(i + 1, 0, d.row); else arr.push(d.row);
    });
    return arr;
  }, [base, dupes]);
  const [menuKey, setMenuKey] = React.useState(null); // row ⋯ open
  const [sort, setSort] = React.useState({ col: null, dir: 1 });
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState([]);
  const [fKunde, setFKunde] = React.useState("");
  const [fTitel, setFTitel] = React.useState("");
  const [fWertVon, setFWertVon] = React.useState("");
  const [fWertBis, setFWertBis] = React.useState("");
  const [fDatumVon, setFDatumVon] = React.useState("");
  const [fDatumBis, setFDatumBis] = React.useState("");
  const [onlyAction, setOnlyAction] = React.useState(false);
  const resetFilters = () => { setFilter("alle"); setStatusFilter([]); setQuery(""); setFKunde(""); setFTitel(""); setFWertVon(""); setFWertBis(""); setFDatumVon(""); setFDatumBis(""); setOnlyAction(false); };
  const activeFilterCount = (filter !== "alle" ? 1 : 0) + statusFilter.length + (query ? 1 : 0) + (fKunde ? 1 : 0) + (fTitel ? 1 : 0) + (fWertVon ? 1 : 0) + (fWertBis ? 1 : 0) + (fDatumVon ? 1 : 0) + (fDatumBis ? 1 : 0) + (onlyAction ? 1 : 0);
  const menuRefs = React.useRef({});
  const [deleted, setDeleted] = React.useState({});
  const [selectMode, setSelectMode] = React.useState(false);
  const [selected, setSelected] = React.useState({}); // key -> true
  const toggleSel = (key) => setSelected(s => ({ ...s, [key]: !s[key] }));
  const [statusOverride, setStatusOverride] = React.useState({}); // key -> {label, kind}
  const [bulkStatusOpen, setBulkStatusOpen] = React.useState(false);
  const bulkStatusRef = React.useRef(null);
  const BULK_STATI = [
    { label: "Neu", kind: "neu" },
    { label: "In Arbeit", kind: "aktiv" },
    { label: "Warten", kind: "warten" },
    { label: "Fertig", kind: "fertig" },
    { label: "Storniert", kind: "storniert" }
  ];
  const effStatus = (v) => statusOverride[v.key] || v.status;

  const dateKey = (v) => {
    const d = String(v.datum || "");
    let m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return m[1] + m[2] + m[3] + (v.zeit || "").replace(/\D/g, "");
    m = d.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) return m[3] + m[2] + m[1] + (v.zeit || "").replace(/\D/g, "");
    return d;
  };
  const sortKeys = {
    kunde: v => (v.kunde || "").toLowerCase(),
    titel: v => (v.titel || "").toLowerCase(),
    phase: v => (PHASE_META[v.phase] ? PHASE_META[v.phase].label : "").toLowerCase(),
    wert: v => Number(v.wert || 0),
    datum: v => dateKey(v),
    status: v => (v.status && v.status.label || "").toLowerCase(),
    aktion: v => v.actor ? (ACTOR_LABEL[v.actor] || "").toLowerCase() : "zzz"
  };
  const toggleSort = (col) => setSort(s => s.col === col ? { col, dir: -s.dir } : { col, dir: 1 });
  const SortHead = ({ col, children, right }) => (
    <div onClick={() => toggleSort(col)}
         style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4, justifyContent: right ? "flex-end" : "flex-start", userSelect: "none" }}>
      {children}
      <Icon n={sort.col === col ? (sort.dir === 1 ? "arrow-up" : "arrow-down") : "arrows-sort"} size={12}
            style={{ opacity: sort.col === col ? 1 : 0.35 }} />
    </div>
  );

  const filteredBase = all.filter(v => {
    if (deleted[v.key]) return false;
    if (filter !== "alle" && v.phase !== filter) return false;
    if (statusFilter.length && !(effStatus(v) && statusFilter.includes(effStatus(v).label))) return false;
    if (query && !((v.titel + " " + v.kunde + " " + v.id + " " + (v.ort||"")).toLowerCase().includes(query.toLowerCase()))) return false;
    if (fKunde && !((v.kunde||"").toLowerCase().includes(fKunde.toLowerCase()))) return false;
    if (fTitel && !((v.titel||"").toLowerCase().includes(fTitel.toLowerCase()))) return false;
    if (fWertVon && Number(v.wert||0) < Number(fWertVon)) return false;
    if (fWertBis && Number(v.wert||0) > Number(fWertBis)) return false;
    if (fDatumVon && dateKey(v) < fDatumVon.replace(/-/g,"")) return false;
    if (fDatumBis && dateKey(v) > fDatumBis.replace(/-/g,"")) return false;
    if (onlyAction && !v.needsAction) return false;
    return true;
  });
  const statusOptions = React.useMemo(() => {
    const s = new Set();
    all.forEach(v => { if (v.status && v.status.label) s.add(v.status.label); });
    return [...s];
  }, [all]);
  const filtered = React.useMemo(() => {
    const fn = sort.col ? sortKeys[sort.col] : null;
    const withIdx = filteredBase.map((v, i) => ({ v, i }));
    withIdx.sort((a, b) => {
      if (fn) { const av = fn(a.v), bv = fn(b.v); if (av < bv) return -1 * sort.dir; if (av > bv) return 1 * sort.dir; }
      return a.i - b.i;
    });
    return withIdx.map(x => x.v);
  }, [filteredBase, sort]);
  const actionCount = filtered.filter(v => v.needsAction).length;
  const restCount = filtered.length - actionCount;
  const counts = VORGANG_PHASES.reduce((a, p) => { a[p] = p === "alle" ? all.length : all.filter(v => v.phase === p).length; return a; }, {});
  const pager = usePager(filtered.length, 12);
  const pageRows = pager.slice(filtered);

  const duplicate = (v) => {
    const baseTitel = (v.titel || "Vorgang").replace(/ \(Kopie( \d+)?\)$/, "");
    const copies = all.filter(r => r.titel && (r.titel === baseTitel + " (Kopie)" || r.titel.startsWith(baseTitel + " (Kopie "))).length;
    const n = copies + 1;
    const newTitel = baseTitel + (n === 1 ? " (Kopie)" : " (Kopie " + n + ")");
    const row = { ...v, key: v.key + ":copy:" + Date.now(), titel: newTitel };
    setDupes(d => [...d, { afterKey: v.key, row }]);
    showToast && showToast("Kopiert: " + newTitel);
  };

  const rowMenu = (v) => {
    const isAnfrage = v.phase === "anfrage";
    const isAngebot = v.phase === "angebot";
    const isAuftrag = v.phase === "auftrag";
    const isRechnung = v.phase === "rechnung";
    return entityMenu(v.phase, v, {
      onEdit: isAnfrage ? () => window.__openEdit && window.__openEdit("anfrage", LEADS.find(x => x.id === v.id) || v)
            : isAuftrag ? () => window.__openEdit && window.__openEdit("auftrag", ORDERS.find(x => x.id === v.id) || v)
            : isAngebot ? () => { const a = ANGEBOTE.find(x => x.id === v.id); openAngebotWizard && openAngebotWizard((a && LEADS.find(l => l.id === a.leadId)) || LEADS[0]); }
            : () => navigate(v.screen, v.id),
      onCopy: () => duplicate(v),
      onAngebot: isAnfrage ? () => openAngebotWizard && openAngebotWizard(LEADS.find(x => x.id === v.id) || v) : undefined,
      onAccept: isAngebot ? () => showToast && showToast("Angebot angenommen") : undefined,
      onComplete: isAuftrag ? () => showToast && showToast("Auftrag abgeschlossen (Demo)") : undefined,
      onMarkPaid: isRechnung ? () => showToast && showToast("Als bezahlt markiert") : undefined,
      onPdf: isAngebot ? () => showToast && showToast("Angebot-PDF heruntergeladen")
           : isRechnung ? () => showToast && showToast("Rechnung heruntergeladen") : undefined,
      onSend: isAngebot ? () => showToast && showToast("Angebot erneut versendet")
            : isRechnung ? () => showToast && showToast("Rechnung erneut versendet") : undefined,
      onToAuftrag: isRechnung && v.refAuftrag ? () => navigate("auftraege", v.refAuftrag) : undefined,
      onDelete: () => { setDeleted(d => ({ ...d, [v.key]: true })); showToast && showToast("Vorgang gelöscht (Demo)"); }
    });
  };

  return (
    <div>
      <div className="listbar">
        <div className="listbar-chips">
          {VORGANG_PHASES.map(p => (
            <Chip key={p} active={filter === p} onClick={() => setFilter(p)} count={counts[p]}
                  icon={p !== "alle" ? PHASE_META[p].icon : null}>
              {p === "alle" ? "Alle" : PHASE_META[p].label}
            </Chip>
          ))}
          <span style={{ width: 1, alignSelf: "stretch", margin: "4px 2px", background: "var(--border)", flexShrink: 0 }}></span>
          <Chip active={onlyAction} onClick={() => setOnlyAction(v => !v)} icon="bell" count={actionCount}>
            Aktion nötig
          </Chip>
        </div>
        <div className="listbar-actions">
          <Btn icon="filter" kind={activeFilterCount ? "primary" : "ghost"} sm onClick={() => setFilterOpen(true)}>
            <span className="listbar-btn-label">Filter &amp; Suchen{activeFilterCount ? ` (${activeFilterCount})` : ""}</span>
          </Btn>
          <Btn icon="checks" kind={selectMode ? "primary" : "ghost"} sm onClick={() => { setSelectMode(m => !m); setSelected({}); }}>
            <span className="listbar-btn-label">{selectMode ? `Auswahl (${Object.values(selected).filter(Boolean).length})` : "Auswählen"}</span>
          </Btn>
          <Btn icon="download" kind="ghost" sm onClick={() => showToast && showToast("Export gestartet")}>
            <span className="listbar-btn-label">Export</span>
          </Btn>
        </div>
      </div>

      <Modal open={filterOpen} onClose={() => setFilterOpen(false)} icon="filter" title="Filter &amp; Suchen" sub="Vorgänge eingrenzen"
        footer={<>
          <Btn kind="ghost" onClick={resetFilters}>Zurücksetzen</Btn>
          <div style={{ flex: 1 }}></div>
          <Btn kind="primary" onClick={() => setFilterOpen(false)}>Anwenden ({filtered.length})</Btn>
        </>}>
        <div className="form-section-h">Suche</div>
        <div className="input" style={{ marginBottom: 16 }}>
          <Icon n="search" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Kunde, Vorgang, Ort, Nummer…" autoFocus />
        </div>

        <div className="form-grid" style={{ marginBottom: 16 }}>
          <Field label="Kunde"><Txt value={fKunde} onChange={setFKunde} placeholder="Name enthält…" /></Field>
          <Field label="Vorgang"><Txt value={fTitel} onChange={setFTitel} placeholder="Titel enthält…" /></Field>
        </div>

        <div className="form-section-h">Phase</div>
        <div className="chiprow" style={{ marginBottom: 16 }}>
          {VORGANG_PHASES.map(p => (
            <Chip key={p} active={filter === p} onClick={() => setFilter(p)} icon={p !== "alle" ? PHASE_META[p].icon : null}>
              {p === "alle" ? "Alle" : PHASE_META[p].label}
            </Chip>
          ))}
        </div>

        <div className="form-section-h">Status</div>
        <div className="chiprow" style={{ marginBottom: 16 }}>
          {statusOptions.map(s => (
            <Chip key={s} active={statusFilter.includes(s)}
              onClick={() => setStatusFilter(f => f.includes(s) ? f.filter(x => x !== s) : [...f, s])}>{s}</Chip>
          ))}
        </div>

        <div className="form-grid" style={{ marginBottom: 16 }}>
          <Field label="Wert von (€)"><Txt type="number" value={fWertVon} onChange={setFWertVon} placeholder="0" /></Field>
          <Field label="Wert bis (€)"><Txt type="number" value={fWertBis} onChange={setFWertBis} placeholder="—" /></Field>
        </div>

        <div className="form-grid">
          <Field label="Datum von"><Txt type="date" value={fDatumVon} onChange={setFDatumVon} /></Field>
          <Field label="Datum bis"><Txt type="date" value={fDatumBis} onChange={setFDatumBis} /></Field>
        </div>
      </Modal>

      <div className={"listcard" + (selectMode ? " vg-selectmode" : "")}>
        <div className="vg-row head">
          {selectMode ? (
            <div className="vg-check" onClick={(e) => { e.stopPropagation(); const all = filtered.length > 0 && filtered.every(v => selected[v.key]); if (all) setSelected({}); else { const n = {}; filtered.forEach(v => n[v.key] = true); setSelected(n); } }}>
              <span className={"vg-box" + (filtered.length > 0 && filtered.every(v => selected[v.key]) ? " on" : "")}>
                {filtered.length > 0 && filtered.every(v => selected[v.key]) ? <Icon n="check" size={12} /> : null}
              </span>
            </div>
          ) : null}
          <SortHead col="kunde">Kunde</SortHead>
          <SortHead col="titel">Vorgang</SortHead>
          <SortHead col="aktion">Aktion</SortHead>
          <SortHead col="phase">Phase</SortHead>
          <SortHead col="wert" right>Wert</SortHead>
          <SortHead col="datum">Datum</SortHead>
          <SortHead col="status">Status</SortHead>
          <div></div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon="folder-open" title="Keine Vorgänge" hint="Filter zurücksetzen oder neuen Vorgang anlegen" />
        ) : (() => {
          const renderRow = (v) => {
            if (!menuRefs.current[v.key]) menuRefs.current[v.key] = React.createRef();
            return (
            <div key={v.key} className={"vg-row" + (selected[v.key] ? " sel" : "")}
                 onClick={() => selectMode ? toggleSel(v.key) : navigate(v.screen, v.id)}>
              {selectMode ? (
                <div className="vg-check" onClick={(e) => { e.stopPropagation(); toggleSel(v.key); }}>
                  <span className={"vg-box" + (selected[v.key] ? " on" : "")}>
                    {selected[v.key] ? <Icon n="check" size={12} /> : null}
                  </span>
                </div>
              ) : null}
              <div className="vg-kunde">
                <span>{v.kunde}</span>
              </div>
              <div className="vg-vorgang">
                <div className="t" title={v.titel}>{v.titel}</div>
              </div>
              <div className="vg-aktion">{v.actor ? <span className={"act-badge act-" + v.actor}>{ACTOR_LABEL[v.actor]}</span> : null}</div>
              <div className="vg-phase"><span className="ph-neutral">{PHASE_META[v.phase] ? <Icon n={PHASE_META[v.phase].icon} size={13} /> : null}{PHASE_META[v.phase] ? PHASE_META[v.phase].label : ""}</span></div>
              <div className="vg-wert" style={{ textAlign: "right", fontWeight: 500, fontVariantNumeric: "tabular-nums", fontSize: 13 }}>{v.wertLabel}</div>
              <div className="vg-datum" style={{ fontSize: 12.5, color: "var(--text-3)" }}>{formatDate(v.datum)}{v.zeit ? " · " + v.zeit : ""}</div>
              <div className="vg-status"><span className={"st-dot st-" + effStatus(v).kind}><span className="d"></span>{effStatus(v).label}</span></div>
              <div className="vg-actions" onClick={(e) => e.stopPropagation()}>
                <span ref={menuRefs.current[v.key]} style={{ display: "inline-flex" }}>
                  <button className="qa-btn" title="Aktionen" onClick={() => setMenuKey(menuKey === v.key ? null : v.key)}>
                    <Icon n="dots" size={16} />
                  </button>
                </span>
                <Popover open={menuKey === v.key} onClose={() => setMenuKey(null)} anchorRef={menuRefs.current[v.key]} align="right" width={210}>
                  {rowMenu(v).map((it, i) => it === "sep"
                    ? <div key={"s"+i} className="pop-sep"></div>
                    : <button key={it.label} className={"pop-item" + (it.danger ? " danger" : "")} onClick={() => { setMenuKey(null); it.onClick(); }}>
                        <Icon n={it.icon} size={15} />{it.label}
                      </button>
                  )}
                </Popover>
              </div>
            </div>
            );
          };
          const out = [];
          pageRows.forEach(v => {
            out.push(renderRow(v));
          });
          return out;
        })()}
      </div>
      <Pager {...pager} unit="Vorgänge" />
    </div>
  );
}

Object.assign(window, { VorgaengeList, PHASE_META });

/* ============ Baerenwald CRM — List / Index screens ============ */

const { useState: uS } = React;

/* ---------- Dashboard → „Heute" (Tages-Cockpit, nicht KPI-Wand) ---------- */
function Dashboard({ navigate }) {
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
  })();
  const dateStr = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });

  const kpis = [
    { icon: "inbox", label: "Neue Anfragen", value: LEADS.filter(l => l.status === "neu" || l.status === "kontaktiert").length, go: () => navigate("anfragen") },
    { icon: "file-invoice", label: "Offene Angebote", value: (typeof ANGEBOTE !== "undefined" ? ANGEBOTE.filter(a => a.status !== "kunde_akzeptiert" && a.status !== "abgelehnt").length : 0), go: () => navigate("angebote") },
    { icon: "tool", label: "Aktive Aufträge", value: ORDERS.filter(o => o.status === "aktiv").length, go: () => navigate("auftraege") },
    { icon: "receipt", label: "Offene Rechnungen", value: (typeof RECHNUNGEN !== "undefined" ? RECHNUNGEN.filter(r => r.status === "versendet" || r.status === "ueberfaellig").length : 0), go: () => navigate("rechnungen") }
  ];

  const angebote = typeof ANGEBOTE !== "undefined" ? ANGEBOTE : [];
  const rechnungen = typeof RECHNUNGEN !== "undefined" ? RECHNUNGEN : [];
  const phasen = [
    { key: "anfragen", title: "Anfragen", icon: "inbox", rows: LEADS.slice(0, 4).map(l => ({ id: l.id, t: l.name, s: l.project, badge: STATUSES[l.status] })) },
    { key: "angebote", title: "Angebote", icon: "file-invoice", rows: angebote.slice(0, 4).map(a => ({ id: a.id, t: a.titel, s: a.id, badge: (typeof ANGEBOT_STATUSES !== "undefined" ? ANGEBOT_STATUSES[a.status] : null) })) },
    { key: "auftraege", title: "Aufträge", icon: "tool", rows: ORDERS.filter(o => o.status === "aktiv").slice(0, 4).map(o => ({ id: o.id, t: o.title, s: "bis " + formatDate(o.end), badge: STATUSES[o.status] })) },
    { key: "rechnungen", title: "Rechnungen", icon: "receipt", rows: rechnungen.slice(0, 4).map(r => ({ id: r.id, t: r.titel, s: formatEUR(r.bruttoTotal), badge: (typeof RECHNUNG_STATUSES !== "undefined" ? RECHNUNG_STATUSES[r.status] : null) })) }
  ];

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 13.5, color: "var(--text-3)" }}>{dateStr}</div>
        <div style={{ fontSize: 22, fontWeight: 650, letterSpacing: "-0.02em", marginTop: 2 }}>{greeting}, Beran</div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 22 }}>
        {kpis.map((k, i) => (
          <button key={i} type="button" className="kpi-card" onClick={k.go}>
            <div className="kpi-ico"><Icon n={k.icon} size={19} /></div>
            <div style={{ minWidth: 0 }}>
              <div className="kpi-val">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="phase-grid">
        {phasen.map(p => (
          <Card key={p.key} title={p.title} icon={p.icon} actions={<Btn sm kind="ghost" icon="arrow-right" onClick={() => navigate(p.key)} />}>
            <div style={{ margin: -14 }}>
              {p.rows.length === 0 ? (
                <div style={{ padding: 14, fontSize: 12.5, color: "var(--text-4)" }}>Nichts offen</div>
              ) : p.rows.map(r => (
                <div key={r.id} className="list-row" style={{ gridTemplateColumns: "1fr auto", alignItems: "center", gap: 8 }} onClick={() => navigate(p.key, r.id)}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.t}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.s}</div>
                  </div>
                  {r.badge ? <Badge kind={r.badge.kind}>{r.badge.label}</Badge> : null}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- Anfragen List ---------- */
function AnfragenList({ selectId, onSelect, query, setQuery, filter, setFilter }) {
  const filtered = LEADS.filter(l => {
    if (filter !== "all" && l.status !== filter) return false;
    if (query && !((l.name + " " + l.project + " " + l.area).toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  });

  const counts = {
    all: LEADS.length,
    neu: LEADS.filter(l => l.status === "neu").length,
    kontaktiert: LEADS.filter(l => l.status === "kontaktiert").length,
    termin: LEADS.filter(l => l.status === "termin").length,
    angebot: LEADS.filter(l => l.status === "angebot").length
  };
  const pager = usePager(filtered.length, 10);
  const pageRows = pager.slice(filtered);

  return (
    <div>
      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Anfragen suchen..." />
        <div style={{ flex: 1 }}></div>
        <Btn icon="filter" kind="ghost" sm>Filter</Btn>
        <Btn icon="download" kind="ghost" sm>Export</Btn>
      </div>

      <div className="chiprow">
        <Chip active={filter === "all"} onClick={() => setFilter("all")} count={counts.all}>Alle</Chip>
        <Chip active={filter === "neu"} onClick={() => setFilter("neu")} count={counts.neu}>Neu</Chip>
        <Chip active={filter === "kontaktiert"} onClick={() => setFilter("kontaktiert")} count={counts.kontaktiert}>Kontaktiert</Chip>
        <Chip active={filter === "termin"} onClick={() => setFilter("termin")} count={counts.termin}>Termin</Chip>
        <Chip active={filter === "angebot"} onClick={() => setFilter("angebot")} count={counts.angebot}>Angebot</Chip>
      </div>

      <div className="listcard">
        <div className="list-row head" style={{ gridTemplateColumns: "110px 1.6fr 1.4fr 120px 110px 100px 116px" }}>
          <div>Nr.</div>
          <div>Anfrage</div>
          <div>Kunde</div>
          <div style={{ textAlign: "right" }}>Betrag</div>
          <div>Eingang</div>
          <div>Status</div>
          <div></div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon="inbox-off" title="Keine Anfragen gefunden" hint="Suchbegriff anpassen oder Filter zurücksetzen" />
        ) : pageRows.map(l => (
          <LeadQuickRow key={l.id} l={l} active={selectId === l.id} onSelect={onSelect} />
        ))}
      </div>
      <Pager {...pager} unit="Anfragen" />
    </div>
  );
}

/* Lead-Zeile mit Hover-Quick-Actions + Status-Popover (Progressive Disclosure) */
function LeadQuickRow({ l, active, onSelect }) {
  const [statusPop, setStatusPop] = React.useState(false);
  const statusRef = React.useRef(null);
  const telDigits = (l.tel || "").replace(/\D/g, "");
  const stat = STATUSES[l.status];
  return (
    <div className={"list-row" + (active ? " active" : "")}
         style={{ gridTemplateColumns: "110px 1.6fr 1.4fr 120px 110px 100px 116px" }}
         onClick={() => onSelect(l.id)}>
      <div style={{ color: "var(--text-3)", fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{l.id}</div>
      <div style={{ fontWeight: 600 }}>{l.project}</div>
      <div style={{ color: "var(--text-2)" }}>{l.name}</div>
      <div style={{ fontWeight: 500, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {(l.budgetLo/1000).toFixed(0)}–{(l.budgetHi/1000).toFixed(0)} T€
      </div>
      <div style={{ color: "var(--text-3)" }}>{formatDate("2026-07-10")}{((l.received||"").split("· ")[1]) ? " · " + (l.received.split("· ")[1]).trim() : ""}</div>
      <span ref={statusRef} onClick={(e) => { e.stopPropagation(); setStatusPop(true); }} style={{ cursor: "pointer" }}>
        <Badge kind={stat.kind}>{stat.label}</Badge>
        <Popover open={statusPop} onClose={() => setStatusPop(false)} anchorRef={statusRef} align="right" width={200}>
          <div className="pop-h">Status setzen</div>
          {["neu", "kontaktiert", "termin", "angebot", "auftrag", "verloren"].map(s => (
            <button key={s} className="pop-item" onClick={() => setStatusPop(false)}>
              <span className="dot" style={{ width: 8, height: 8, borderRadius: "50%", background: ({neu:"var(--blue-tx)",kontaktiert:"var(--blue-tx)",termin:"var(--grn-tx)",angebot:"#D9A800",auftrag:"var(--green)",verloren:"var(--red-tx)"})[s] }}></span>
              {STATUSES[s].label}
              {l.status === s ? <Icon n="check" size={14} style={{ marginLeft: "auto", color: "var(--green)" }} /> : null}
            </button>
          ))}
        </Popover>
      </span>
      <div className="row-actions" onClick={(e) => e.stopPropagation()} style={{ justifyContent: "flex-end" }}>
        <button className="qa-btn" title="Anrufen" onClick={() => window.open("tel:" + telDigits)}><Icon n="phone" size={15} /></button>
        <button className="qa-btn" title="WhatsApp" onClick={() => window.open(`https://wa.me/${telDigits}`, "_blank")}><Icon n="brand-whatsapp" size={15} /></button>
        <button className="qa-btn" title="Mehr"><Icon n="dots" size={15} /></button>
      </div>
    </div>
  );
}

/* ---------- Aufträge: Kanban ---------- */
const PROGRESS_LEGEND = (
  <div style={{
    display: "flex", gap: 16, marginTop: 14, padding: "8px 12px",
    background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 6,
    fontSize: 12, color: "var(--text-3)", width: "fit-content"
  }}>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--green)" }}></span>
      in Arbeit
    </span>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#D9A800" }}></span>
      pausiert
    </span>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--border-strong)" }}></span>
      offen
    </span>
  </div>
);

function AuftraegeKanban({ onSelect, view, setView, query, setQuery }) {
  // Kanban removed — always list view
  return <AuftraegeList onSelect={onSelect} query={query} setQuery={setQuery} />;
}

function AuftraegeList({ onSelect, query, setQuery }) {
  const [filter, setFilter] = React.useState("alle");
  const filtered = ORDERS.filter(o => {
    if (filter !== "alle" && o.status !== filter) return false;
    if (query && !(o.title + " " + o.customer + " " + o.id).toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });
  const counts = {
    alle: ORDERS.length,
    aktiv: ORDERS.filter(o => o.status === "aktiv").length,
    fertig: ORDERS.filter(o => o.status === "fertig").length
  };
  const pager = usePager(filtered.length, 10);
  const pageRows = pager.slice(filtered);
  return (
    <div>
      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Aufträge suchen..." />
        <div style={{ flex: 1 }}></div>
        <Btn icon="filter" kind="ghost" sm>Filter</Btn>
        <Btn icon="download" kind="ghost" sm>Export</Btn>
      </div>

      <div className="chiprow">
        <Chip active={filter === "alle"} count={counts.alle} onClick={() => setFilter("alle")}>Alle</Chip>
        <Chip active={filter === "aktiv"} count={counts.aktiv} onClick={() => setFilter("aktiv")}>Aktiv</Chip>
        <Chip active={filter === "fertig"} count={counts.fertig} onClick={() => setFilter("fertig")}>Fertig</Chip>
      </div>

      <div className="listcard">
        <div className="list-row head" style={{ gridTemplateColumns: "100px 2fr 1.2fr 100px 1fr 110px 100px 60px" }}>
          <div>Nr.</div>
          <div>Auftrag</div>
          <div>Kunde</div>
          <div style={{ textAlign: "right" }}>Betrag</div>
          <div>Fortschritt</div>
          <div>Lieferdatum</div>
          <div>Status</div>
          <div></div>
        </div>
        {pageRows.map(o => (
          <div key={o.id} className="list-row" style={{ gridTemplateColumns: "100px 2fr 1.2fr 100px 1fr 110px 100px 60px" }} onClick={() => onSelect(o.id)}>
            <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "ui-monospace, monospace" }}>{o.id}</div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{o.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>{o.area}</div>
            </div>
            <div style={{ fontSize: 13 }}>{o.customer}</div>
            <div style={{ fontSize: 13, fontWeight: 500, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatEUR(o.value)}</div>
            <div><Progress value={o.progress} warn={o.progress < 30 && o.progress > 0} /></div>
            <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>{formatDate(o.end)}</div>
            <div><Badge kind={STATUSES[o.status].kind}>{STATUSES[o.status].label}</Badge></div>
            <div className="row-actions" onClick={(e) => e.stopPropagation()} style={{ justifyContent: "flex-end" }}>
              <button className="qa-btn" title="Mehr"><Icon n="dots" size={15} /></button>
            </div>
          </div>
        ))}
      </div>
      <Pager {...pager} unit="Aufträge" />
      {PROGRESS_LEGEND}
    </div>
  );
}

/* ---------- Kunden List ---------- */
function KundenList({ onSelect, navigate, query, setQuery, filter, setFilter }) {
  const [sel, setSel] = React.useState({});
  const [selectMode, setSelectMode] = React.useState(false);
  const toggle = (id) => setSel(s => ({ ...s, [id]: !s[id] }));
  const srt = useSort();
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [fName, setFName] = React.useState("");
  const activeFilterCount = (filter !== "all" ? 1 : 0) + (query ? 1 : 0) + (fName ? 1 : 0);
  const resetFilters = () => { setFilter("all"); setQuery(""); setFName(""); };
  const base = CUSTOMERS.filter(c => {
    if (filter === "privat" && c.type !== "Privat") return false;
    if (filter === "gewerbe" && c.type !== "Gewerbe") return false;
    if (filter === "hausverwaltung" && c.type !== "Hausverwaltung") return false;
    if (query && !((c.name + " " + c.area + " " + c.id + " " + c.tel + " " + c.mail).toLowerCase().includes(query.toLowerCase()))) return false;
    if (fName && !((c.name||"").toLowerCase().includes(fName.toLowerCase()))) return false;
    return true;
  });
  const filtered = srt.apply(base, {
    name: c => (c.name||"").toLowerCase(),
    type: c => (c.type||"").toLowerCase(),
    tel: c => (c.tel||""),
    mail: c => (c.mail||"").toLowerCase()
  });
  const pager = usePager(filtered.length, 10);
  const pageRows = pager.slice(filtered);

  return (
    <div>
      <div className="listbar">
        <div className="listbar-chips">
          <Chip active={filter === "all"} onClick={() => setFilter("all")} count={CUSTOMERS.length}>Alle</Chip>
          <Chip active={filter === "privat"} onClick={() => setFilter("privat")} count={CUSTOMERS.filter(c=>c.type==="Privat").length}>Privat</Chip>
          <Chip active={filter === "hausverwaltung"} onClick={() => setFilter("hausverwaltung")} count={CUSTOMERS.filter(c=>c.type==="Hausverwaltung").length}>Hausverwaltung</Chip>
          <Chip active={filter === "gewerbe"} onClick={() => setFilter("gewerbe")} count={CUSTOMERS.filter(c=>c.type==="Gewerbe").length}>Gewerbe</Chip>
        </div>
        <div className="listbar-actions">
          <Btn icon="filter" kind={activeFilterCount ? "primary" : "ghost"} sm onClick={() => setFilterOpen(true)}><span className="listbar-btn-label">Filter &amp; Suchen{activeFilterCount ? ` (${activeFilterCount})` : ""}</span></Btn>
          <Btn icon="checks" kind={selectMode ? "primary" : "ghost"} sm onClick={() => { setSelectMode(m => !m); setSel({}); }}><span className="listbar-btn-label">{selectMode ? `Auswahl (${Object.values(sel).filter(Boolean).length})` : "Auswählen"}</span></Btn>
          <Btn icon="download" kind="ghost" sm><span className="listbar-btn-label">Export</span></Btn>
        </div>
      </div>

      <Modal open={filterOpen} onClose={() => setFilterOpen(false)} icon="filter" title="Filter &amp; Suchen" sub="Kunden eingrenzen"
        footer={<>
          <Btn kind="ghost" onClick={resetFilters}>Zurücksetzen</Btn>
          <div style={{ flex: 1 }}></div>
          <Btn kind="primary" onClick={() => setFilterOpen(false)}>Anwenden ({filtered.length})</Btn>
        </>}>
        <div className="form-section-h">Suche</div>
        <div className="input" style={{ marginBottom: 16 }}>
          <Icon n="search" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, Telefon, E-Mail…" autoFocus />
        </div>
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <Field label="Name"><Txt value={fName} onChange={setFName} placeholder="Name enthält…" /></Field>
        </div>
        <div className="form-section-h">Typ</div>
        <div className="chiprow">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>Alle</Chip>
          <Chip active={filter === "privat"} onClick={() => setFilter("privat")}>Privat</Chip>
          <Chip active={filter === "hausverwaltung"} onClick={() => setFilter("hausverwaltung")}>Hausverwaltung</Chip>
          <Chip active={filter === "gewerbe"} onClick={() => setFilter("gewerbe")}>Gewerbe</Chip>
        </div>
      </Modal>

      <div className={"listcard" + (selectMode ? " vg-selectmode" : "")}>
        <div className="list-row head" style={{ gridTemplateColumns: (selectMode ? "40px " : "") + "1.4fr 1fr 1.2fr 1.6fr 60px" }}>
          {selectMode ? <div className="vg-check" onClick={(e) => { e.stopPropagation(); const all = filtered.length > 0 && filtered.every(c => sel[c.id]); if (all) setSel({}); else { const n = {}; filtered.forEach(c => n[c.id] = true); setSel(n); } }}><span className={"vg-box" + (filtered.length > 0 && filtered.every(c => sel[c.id]) ? " on" : "")}>{filtered.length > 0 && filtered.every(c => sel[c.id]) ? <Icon n="check" size={12} /> : null}</span></div> : null}
          <SortHead col="name" sort={srt.sort} onSort={srt.toggle}>Kunde</SortHead>
          <SortHead col="type" sort={srt.sort} onSort={srt.toggle}>Typ</SortHead>
          <SortHead col="tel" sort={srt.sort} onSort={srt.toggle}>Telefon</SortHead>
          <SortHead col="mail" sort={srt.sort} onSort={srt.toggle}>Email</SortHead>
          <div></div>
        </div>
        {pageRows.map(c => (
          <div key={c.id} className={"list-row" + (sel[c.id] ? " sel" : "")} style={{ gridTemplateColumns: (selectMode ? "40px " : "") + "1.4fr 1fr 1.2fr 1.6fr 60px" }} onClick={() => selectMode ? toggle(c.id) : onSelect(c.id)}>
            {selectMode ? <div className="vg-check" onClick={(e) => { e.stopPropagation(); toggle(c.id); }}><span className={"vg-box" + (sel[c.id] ? " on" : "")}>{sel[c.id] ? <Icon n="check" size={12} /> : null}</span></div> : null}
            <div className="lc-title" style={{ fontWeight: 600 }}>{c.name}</div>
            <div className="lc-pills"><span className="pill-tag">{c.type}</span></div>
            <div style={{ color: "var(--text-2)" }}>{c.tel}</div>
            <div style={{ color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.mail}</div>
            <div className="row-actions always" onClick={(e) => e.stopPropagation()} style={{ justifyContent: "flex-end" }}>
              <Menu align="right" trigger={<button className="qa-btn" title="Aktionen"><Icon n="dots" size={16} /></button>}
                items={entityMenu("kunde", c, { onOpen: () => onSelect(c.id), onEdit: () => onSelect(c.id) })} />
            </div>
          </div>
        ))}
      </div>
      <Pager {...pager} unit="Kunden" />
    </div>
  );
}

/* ---------- Handwerker List ---------- */
function HandwerkerList({ onSelect, navigate, query, setQuery }) {
  const [sel, setSel] = React.useState({});
  const [selectMode, setSelectMode] = React.useState(false);
  const toggle = (id) => setSel(s => ({ ...s, [id]: !s[id] }));
  const srt = useSort();
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [gewerk, setGewerk] = React.useState("alle");
  const [compOnly, setCompOnly] = React.useState(false);
  const [fName, setFName] = React.useState("");
  const activeFilterCount = (gewerk !== "alle" ? 1 : 0) + (compOnly ? 1 : 0) + (query ? 1 : 0) + (fName ? 1 : 0);
  const resetFilters = () => { setGewerk("alle"); setCompOnly(false); setQuery(""); setFName(""); };
  const base = TRADES.filter(t => {
    if (gewerk !== "alle" && !(t.category||"").toLowerCase().includes(gewerk.toLowerCase())) return false;
    if (compOnly && t.compliance === "ok") return false;
    if (query && !((t.name + " " + t.category + " " + t.tel + " " + t.mail).toLowerCase().includes(query.toLowerCase()))) return false;
    if (fName && !((t.name||"").toLowerCase().includes(fName.toLowerCase()))) return false;
    return true;
  });
  const filtered = srt.apply(base, {
    name: t => (t.name||"").toLowerCase(),
    category: t => (t.category||"").toLowerCase(),
    tel: t => (t.tel||""),
    mail: t => (t.mail||"").toLowerCase(),
    rating: t => Number(t.rating||0),
    status: t => (t.activeOrders > 0 ? 1 : 0)
  });
  const pager_hw = usePager(filtered.length, 10);
  const pageRows_hw = pager_hw.slice(filtered);
  return (
    <div>
      <div className="listbar">
        <div className="listbar-chips">
          <Chip active={gewerk === "alle"} onClick={() => setGewerk("alle")} count={TRADES.length}>Alle Gewerke</Chip>
          <Chip active={gewerk === "Sanitär"} onClick={() => setGewerk("Sanitär")}>Sanitär</Chip>
          <Chip active={gewerk === "Elektrik"} onClick={() => setGewerk("Elektrik")}>Elektrik</Chip>
          <Chip active={gewerk === "Fliesen"} onClick={() => setGewerk("Fliesen")}>Fliesen</Chip>
          <Chip active={gewerk === "Maler"} onClick={() => setGewerk("Maler")}>Maler</Chip>
          <Chip active={gewerk === "Boden"} onClick={() => setGewerk("Boden")}>Boden</Chip>
          <Chip active={compOnly} icon="alert-triangle" count={TRADES.filter(t=>t.compliance!=="ok").length} onClick={() => setCompOnly(v => !v)}>Compliance</Chip>
        </div>
        <div className="listbar-actions">
          <Btn icon="filter" kind={activeFilterCount ? "primary" : "ghost"} sm onClick={() => setFilterOpen(true)}><span className="listbar-btn-label">Filter &amp; Suchen{activeFilterCount ? ` (${activeFilterCount})` : ""}</span></Btn>
          <Btn icon="checks" kind={selectMode ? "primary" : "ghost"} sm onClick={() => { setSelectMode(m => !m); setSel({}); }}><span className="listbar-btn-label">{selectMode ? `Auswahl (${Object.values(sel).filter(Boolean).length})` : "Auswählen"}</span></Btn>
          <Btn icon="download" kind="ghost" sm><span className="listbar-btn-label">Export</span></Btn>
        </div>
      </div>

      <Modal open={filterOpen} onClose={() => setFilterOpen(false)} icon="filter" title="Filter &amp; Suchen" sub="Handwerker eingrenzen"
        footer={<>
          <Btn kind="ghost" onClick={resetFilters}>Zurücksetzen</Btn>
          <div style={{ flex: 1 }}></div>
          <Btn kind="primary" onClick={() => setFilterOpen(false)}>Anwenden ({filtered.length})</Btn>
        </>}>
        <div className="form-section-h">Suche</div>
        <div className="input" style={{ marginBottom: 16 }}>
          <Icon n="search" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, Gewerk, Telefon, E-Mail…" autoFocus />
        </div>
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <Field label="Name"><Txt value={fName} onChange={setFName} placeholder="Name enthält…" /></Field>
        </div>
        <div className="form-section-h">Gewerk</div>
        <div className="chiprow" style={{ marginBottom: 16 }}>
          {["alle","Sanitär","Elektrik","Fliesen","Maler","Boden"].map(g => (
            <Chip key={g} active={gewerk === g} onClick={() => setGewerk(g)}>{g === "alle" ? "Alle" : g}</Chip>
          ))}
        </div>
        <div className="form-section-h">Compliance</div>
        <div className="chiprow">
          <Chip active={!compOnly} onClick={() => setCompOnly(false)}>Alle</Chip>
          <Chip active={compOnly} onClick={() => setCompOnly(true)}>Nur zu prüfen</Chip>
        </div>
      </Modal>

      <div className={"listcard" + (selectMode ? " vg-selectmode" : "")}>
        <div className="list-row head" style={{ gridTemplateColumns: (selectMode ? "40px " : "") + "minmax(120px,1.6fr) minmax(90px,1fr) 118px minmax(120px,1.6fr) 72px 96px 40px" }}>
          {selectMode ? <div className="vg-check" onClick={(e) => { e.stopPropagation(); const all = filtered.length > 0 && filtered.every(t => sel[t.id]); if (all) setSel({}); else { const n = {}; filtered.forEach(t => n[t.id] = true); setSel(n); } }}><span className={"vg-box" + (filtered.length > 0 && filtered.every(t => sel[t.id]) ? " on" : "")}>{filtered.length > 0 && filtered.every(t => sel[t.id]) ? <Icon n="check" size={12} /> : null}</span></div> : null}
          <SortHead col="name" sort={srt.sort} onSort={srt.toggle}>Name</SortHead>
          <SortHead col="category" sort={srt.sort} onSort={srt.toggle}>Gewerk</SortHead>
          <SortHead col="tel" sort={srt.sort} onSort={srt.toggle}>Telefon</SortHead>
          <SortHead col="mail" sort={srt.sort} onSort={srt.toggle}>Email</SortHead>
          <SortHead col="rating" sort={srt.sort} onSort={srt.toggle} right>Bewertung</SortHead>
          <SortHead col="status" sort={srt.sort} onSort={srt.toggle}>Status</SortHead>
          <div></div>
        </div>
        {pageRows_hw.map(t => (
          <div key={t.id} className={"list-row" + (sel[t.id] ? " sel" : "")} style={{ gridTemplateColumns: (selectMode ? "40px " : "") + "minmax(120px,1.6fr) minmax(90px,1fr) 118px minmax(120px,1.6fr) 72px 96px 40px" }} onClick={() => selectMode ? toggle(t.id) : onSelect(t.id)}>
            {selectMode ? <div className="vg-check" onClick={(e) => { e.stopPropagation(); toggle(t.id); }}><span className={"vg-box" + (sel[t.id] ? " on" : "")}>{sel[t.id] ? <Icon n="check" size={12} /> : null}</span></div> : null}
            <div className="lc-title" style={{ fontWeight: 600 }}>{t.name}</div>
            <div className="lc-pills" style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {t.category.split(/[·,]/).map((g, i) => (
                <span key={i} className="pill-tag">{g.trim()}</span>
              ))}
            </div>
            <div style={{ color: "var(--text-2)", whiteSpace: "nowrap" }}>{t.tel}</div>
            <div style={{ color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.mail}</div>
            <div style={{ textAlign: "center" }}><span className="rating"><Icon n="star-filled" size={12} />{t.rating.toFixed(1)}</span></div>
            <div className="lc-status"><Badge kind={t.activeOrders > 0 ? "aktiv" : "fertig"}>{t.activeOrders > 0 ? "Aktiv" : "Verfügbar"}</Badge></div>
            <div className="row-actions always" onClick={(e) => e.stopPropagation()} style={{ justifyContent: "flex-end" }}>
              <Menu align="right" trigger={<button className="qa-btn" title="Aktionen"><Icon n="dots" size={16} /></button>}
                items={entityMenu("handwerker", t, { onOpen: () => onSelect(t.id), onEdit: () => onSelect(t.id) })} />
            </div>
          </div>
        ))}
      </div>
      <Pager {...pager_hw} unit="Handwerker" />
    </div>
  );
}

/* ---------- Partner List ---------- */
function PartnerList({ query, setQuery, onSelect, navigate, onEdit }) {
  const [sel, setSel] = React.useState({});
  const [selectMode, setSelectMode] = React.useState(false);
  const toggle = (id) => setSel(s => ({ ...s, [id]: !s[id] }));
  const srt = useSort();
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [kategorie, setKategorie] = React.useState("alle");
  const [fName, setFName] = React.useState("");
  const KATS = ["alle","Versicherung","Finanzierung","Makler","Planung","Logistik"];
  const activeFilterCount = (kategorie !== "alle" ? 1 : 0) + (query ? 1 : 0) + (fName ? 1 : 0);
  const resetFilters = () => { setKategorie("alle"); setQuery(""); setFName(""); };
  const base = PARTNERS.filter(p => {
    if (kategorie !== "alle" && !(p.category||"").toLowerCase().includes(kategorie.toLowerCase())) return false;
    if (query && !((p.name + " " + p.category + " " + (p.contact||"") + " " + (p.tel||"") + " " + (p.mail||"")).toLowerCase().includes(query.toLowerCase()))) return false;
    if (fName && !((p.name||"").toLowerCase().includes(fName.toLowerCase()))) return false;
    return true;
  });
  const filtered = srt.apply(base, {
    name: p => (p.name||"").toLowerCase(),
    category: p => (p.category||"").toLowerCase(),
    contact: p => (p.contact||"").toLowerCase(),
    tel: p => (p.tel||""),
    mail: p => (p.mail||"").toLowerCase()
  });
  const pager = usePager(filtered.length, 10);
  const pageRows = pager.slice(filtered);
  const go = (p) => onSelect ? onSelect(p.id) : (onEdit && onEdit(p));
  return (
    <div>
      <div className="listbar">
        <div className="listbar-chips">
          {KATS.map(k => (
            <Chip key={k} active={kategorie === k} onClick={() => setKategorie(k)} count={k === "alle" ? PARTNERS.length : undefined}>{k === "alle" ? "Alle" : k}</Chip>
          ))}
        </div>
        <div className="listbar-actions">
          <Btn icon="filter" kind={activeFilterCount ? "primary" : "ghost"} sm onClick={() => setFilterOpen(true)}><span className="listbar-btn-label">Filter &amp; Suchen{activeFilterCount ? ` (${activeFilterCount})` : ""}</span></Btn>
          <Btn icon="checks" kind={selectMode ? "primary" : "ghost"} sm onClick={() => { setSelectMode(m => !m); setSel({}); }}><span className="listbar-btn-label">{selectMode ? `Auswahl (${Object.values(sel).filter(Boolean).length})` : "Auswählen"}</span></Btn>
          <Btn icon="download" kind="ghost" sm><span className="listbar-btn-label">Export</span></Btn>
        </div>
      </div>

      <Modal open={filterOpen} onClose={() => setFilterOpen(false)} icon="filter" title="Filter &amp; Suchen" sub="Partner eingrenzen"
        footer={<>
          <Btn kind="ghost" onClick={resetFilters}>Zurücksetzen</Btn>
          <div style={{ flex: 1 }}></div>
          <Btn kind="primary" onClick={() => setFilterOpen(false)}>Anwenden ({filtered.length})</Btn>
        </>}>
        <div className="form-section-h">Suche</div>
        <div className="input" style={{ marginBottom: 16 }}>
          <Icon n="search" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, Kategorie, Ansprechpartner…" autoFocus />
        </div>
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <Field label="Name"><Txt value={fName} onChange={setFName} placeholder="Name enthält…" /></Field>
        </div>
        <div className="form-section-h">Kategorie</div>
        <div className="chiprow">
          {KATS.map(k => (
            <Chip key={k} active={kategorie === k} onClick={() => setKategorie(k)}>{k === "alle" ? "Alle" : k}</Chip>
          ))}
        </div>
      </Modal>

      <div className={"listcard" + (selectMode ? " vg-selectmode" : "")}>
        <div className="list-row head" style={{ gridTemplateColumns: (selectMode ? "40px " : "") + "1.6fr 1fr 1.2fr 1.1fr 1.5fr 90px 60px" }}>
          {selectMode ? <div className="vg-check" onClick={(e) => { e.stopPropagation(); const all = filtered.length > 0 && filtered.every(p => sel[p.id]); if (all) setSel({}); else { const n = {}; filtered.forEach(p => n[p.id] = true); setSel(n); } }}><span className={"vg-box" + (filtered.length > 0 && filtered.every(p => sel[p.id]) ? " on" : "")}>{filtered.length > 0 && filtered.every(p => sel[p.id]) ? <Icon n="check" size={12} /> : null}</span></div> : null}
          <SortHead col="name" sort={srt.sort} onSort={srt.toggle}>Name</SortHead>
          <SortHead col="category" sort={srt.sort} onSort={srt.toggle}>Kategorie</SortHead>
          <SortHead col="contact" sort={srt.sort} onSort={srt.toggle}>Ansprechpartner</SortHead>
          <SortHead col="tel" sort={srt.sort} onSort={srt.toggle}>Telefon</SortHead>
          <SortHead col="mail" sort={srt.sort} onSort={srt.toggle}>Email</SortHead>
          <div>Status</div>
          <div></div>
        </div>
        {pageRows.map(p => (
          <div key={p.id} className={"list-row" + (sel[p.id] ? " sel" : "")} style={{ gridTemplateColumns: (selectMode ? "40px " : "") + "1.6fr 1fr 1.2fr 1.1fr 1.5fr 90px 60px" }} onClick={() => selectMode ? toggle(p.id) : go(p)}>
            {selectMode ? <div className="vg-check" onClick={(e) => { e.stopPropagation(); toggle(p.id); }}><span className={"vg-box" + (sel[p.id] ? " on" : "")}>{sel[p.id] ? <Icon n="check" size={12} /> : null}</span></div> : null}
            <div className="lc-title" style={{ fontWeight: 600 }}>{p.name}</div>
            <div className="lc-pills"><span className="pill-tag">{p.category}</span></div>
            <div style={{ fontSize: 13, color: "var(--text-2)" }}>{p.contact}</div>
            <div style={{ fontSize: 13, color: "var(--text-2)" }}>{p.tel}</div>
            <div style={{ fontSize: 13, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.mail}</div>
            <div className="lc-status"><Badge kind="aktiv">Aktiv</Badge></div>
            <div className="row-actions always" onClick={(e) => e.stopPropagation()} style={{ justifyContent: "flex-end" }}>
              <Menu align="right" trigger={<button className="qa-btn" title="Aktionen"><Icon n="dots" size={16} /></button>}
                items={entityMenu("partner", p, { onOpen: () => go(p), onEdit: () => onEdit && onEdit(p) })} />
            </div>
          </div>
        ))}
      </div>
      <Pager {...pager} unit="Partner" />
    </div>
  );
}

/* ---------- Kalender ---------- */
function Kalender() {
  const month = "Mai 2026";
  const [view, setView] = React.useState("monat");
  const [openEvt, setOpenEvt] = React.useState(null);
  const [neu, setNeu] = React.useState(null); // { day, start } | {}

  const days = [];
  for (let d = 27; d <= 30; d++) days.push({ d, muted: true });
  for (let d = 1; d <= 31; d++) days.push({ d, muted: false });
  let next = 1;
  while (days.length < 42) days.push({ d: next++, muted: true });

  const events = {
    14: [{ t: "Vor-Ort Koch", c: "green" }, { t: "Abnahme Weidner", c: "yellow" }],
    15: [{ t: "Anruf Schmidt", c: "blue" }, { t: "Maler Huber", c: "green" }, { t: "+2 mehr", c: "" }],
    16: [{ t: "Sanitär Müller", c: "green" }],
    18: [{ t: "Kickoff Schmidt", c: "blue" }],
    20: [{ t: "Maler Huber Abnahme", c: "yellow" }],
    22: [{ t: "Endabnahme Weidner", c: "yellow" }],
    27: [{ t: "Vor-Ort Diehl", c: "green" }]
  };

  // Termine im Zeitraster (Start-/Endstunde als Dezimal)
  const HOURS = [];
  for (let h = 7; h <= 19; h++) HOURS.push(h);
  const hourTop = (v) => (v - HOURS[0]) * 52;
  const weekDays = [
    { dow: "Mo", d: 12 }, { dow: "Di", d: 13 }, { dow: "Mi", d: 14, today: true }, { dow: "Do", d: 15 },
    { dow: "Fr", d: 16 }, { dow: "Sa", d: 17 }, { dow: "So", d: 18 }
  ];
  const weekEvents = {
    12: [{ t: "Kickoff Weidner", s: "09:00", start: 9, end: 10.5, c: "blue", where: "Maxvorstadt" }],
    13: [{ t: "Anruf Schmidt", s: "11:00", start: 11, end: 11.5, c: "blue", where: "Telefon" }],
    14: [{ t: "Vor-Ort Koch", s: "10:00", start: 10, end: 11, c: "green", where: "Schwabing" }, { t: "Abnahme Weidner", s: "14:30", start: 14.5, end: 15.5, c: "yellow", where: "Maxvorstadt" }],
    15: [{ t: "Maler Huber", s: "08:30", start: 8.5, end: 12, c: "green", where: "Bogenhausen" }, { t: "Sanitär Müller", s: "13:00", start: 13, end: 15, c: "green", where: "Neuhausen" }],
    16: [{ t: "Vor-Ort Diehl", s: "09:30", start: 9.5, end: 10.5, c: "green", where: "Sendling" }],
    17: [], 18: []
  };
  const dayCol = weekDays[2]; // Mi 14.
  const dayEvents = weekEvents[14];

  const nav = (
    <div className="toolbar">
      <Btn icon="chevron-left" sm />
      <div style={{ fontSize: 16, fontWeight: 600, padding: "0 8px" }}>{view === "tag" ? "Mittwoch, 14. Mai 2026" : month}</div>
      <Btn icon="chevron-right" sm />
      <Btn sm>Heute</Btn>
      <Btn sm kind="primary" icon="plus" onClick={() => setNeu({})}>Neuer Termin</Btn>
      <div style={{ flex: 1 }}></div>
      <div style={{ display: "flex", gap: 4, padding: 2, background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 6 }}>
        <Btn sm kind={view === "tag" ? "primary" : "ghost"} onClick={() => setView("tag")}>Tag</Btn>
        <Btn sm kind={view === "woche" ? "primary" : "ghost"} onClick={() => setView("woche")}>Woche</Btn>
        <Btn sm kind={view === "monat" ? "primary" : "ghost"} onClick={() => setView("monat")}>Monat</Btn>
      </div>
    </div>
  );

  if (view === "monat") {
    return (
      <div>
        {nav}
        <div className="cal-grid">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(d => <div key={d} className="cal-head">{d}</div>)}
          {days.map((c, i) => {
            const isToday = !c.muted && c.d === 15;
            const evs = c.muted ? null : events[c.d];
            return (
              <div key={i} className={"cal-cell" + (c.muted ? " muted" : "") + (isToday ? " today" : "")} onClick={() => !c.muted && setNeu({ day: c.d })}>
                <div className="day-num">{c.d}</div>
                {evs ? evs.map((e, j) => <div key={j} className={"cal-evt " + (e.c || "")} onClick={(ev) => { ev.stopPropagation(); if (!/mehr$/.test(e.t)) setOpenEvt({ t: e.t, c: e.c, day: c.d }); }}>{e.t}</div>) : null}
              </div>
            );
          })}
        </div>
        <TerminModal evt={openEvt} onClose={() => setOpenEvt(null)} />
        <TerminCreateModal draft={neu} onClose={() => setNeu(null)} />
      </div>
    );
  }

  // Zeitraster: Tag oder Woche
  const cols = view === "tag" ? [dayCol] : weekDays;
  const colEvents = (dnum) => (view === "tag" ? dayEvents : (weekEvents[dnum] || []));
  const gridCols = "56px " + cols.map(() => "1fr").join(" ");

  return (
    <div>
      {nav}
      <div className="tg">
        <div className="tg-head" style={{ gridTemplateColumns: gridCols }}>
          <div className="tg-corner"></div>
          {cols.map(c => (
            <div key={c.d} className={"tg-daycol" + (c.today || (view === "tag") ? " today" : "")}>
              <div className="dow">{c.dow}</div>
              <div className="dnum">{c.d}</div>
            </div>
          ))}
        </div>
        <div className="tg-body">
          <div className="tg-rows" style={{ display: "grid", gridTemplateColumns: gridCols }}>
            <div className="tg-timecol">
              {HOURS.map(h => <div key={h} className="tg-hour"><span className="tg-hlabel">{String(h).padStart(2, "0")}:00</span></div>)}
            </div>
            {cols.map(c => (
              <div key={c.d} className="tg-col" style={{ position: "relative" }}>
                {HOURS.map(h => <div key={h} className="tg-hour" onClick={() => setNeu({ day: c.d, start: h })}></div>)}
                {colEvents(c.d).map((e, j) => (
                  <div key={j} className={"tg-event " + (e.c || "")} style={{ top: hourTop(e.start), height: Math.max(24, (e.end - e.start) * 52 - 4) }} onClick={() => setOpenEvt({ ...e, day: c.d })}>
                    <div className="te-t">{e.t}</div>
                    <div className="te-s">{e.s}{e.where ? " · " + e.where : ""}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <TerminModal evt={openEvt} onClose={() => setOpenEvt(null)} />
      <TerminCreateModal draft={neu} onClose={() => setNeu(null)} />
    </div>
  );
}

function TerminCreateModal({ draft, onClose }) {
  if (!draft) return null;
  const two = (n) => String(Math.floor(n)).padStart(2, "0") + ":" + (n % 1 ? "30" : "00");
  const [titel, setTitel] = React.useState("");
  const [kat, setKat] = React.useState("green");
  const [datum, setDatum] = React.useState("2026-05-" + String(draft.day || 14).padStart(2, "0"));
  const [von, setVon] = React.useState(draft.start != null ? two(draft.start) : "09:00");
  const [bis, setBis] = React.useState(draft.start != null ? two(draft.start + 1) : "10:00");
  const [ort, setOrt] = React.useState("");
  const save = () => { if (window.__toast) window.__toast("Termin „" + (titel || "Neuer Termin") + "“ angelegt"); onClose(); };
  return (
    <Modal open onClose={onClose} icon="calendar-plus" title="Neuer Termin" sub="Kalender"
      footer={<><Btn sm kind="ghost" onClick={onClose}>Abbrechen</Btn><div style={{ flex: 1 }}></div><Btn sm kind="primary" icon="check" onClick={save}>Termin anlegen</Btn></>}>
      <div className="form-grid">
        <Field label="Titel" full required><Txt value={titel} onChange={setTitel} placeholder="z.B. Vor-Ort Termin Koch" autoFocus /></Field>
        <Field label="Kategorie" full>
          <Seg value={kat} onChange={setKat} options={[{ value: "green", label: "Vor-Ort / Arbeit" }, { value: "blue", label: "Kontakt / Kickoff" }, { value: "yellow", label: "Abnahme" }]} />
        </Field>
        <Field label="Datum"><Txt type="date" value={datum} onChange={setDatum} /></Field>
        <div></div>
        <Field label="Von"><Txt type="time" value={von} onChange={setVon} /></Field>
        <Field label="Bis"><Txt type="time" value={bis} onChange={setBis} /></Field>
        <Field label="Ort" full><Txt value={ort} onChange={setOrt} placeholder="Stadtteil / Adresse" /></Field>
      </div>
    </Modal>
  );
}

function TerminModal({ evt, onClose }) {
  if (!evt) return null;
  const dotColor = evt.c === "yellow" ? "#D9A800" : evt.c === "blue" ? "var(--blue-tx)" : "var(--green)";
  const two = (n) => String(Math.floor(n)).padStart(2, "0") + ":" + (n % 1 ? "30" : "00");
  const zeit = evt.start != null ? (two(evt.start) + "–" + two(evt.end) + " Uhr") : (evt.s || "");
  return (
    <Modal open onClose={onClose} icon="calendar-event" title={evt.t} sub="Mai 2026"
      footer={<><Btn sm kind="ghost" icon="pencil" onClick={onClose}>Bearbeiten</Btn><div style={{ flex: 1 }}></div><Btn sm kind="primary" icon="x" onClick={onClose}>Schließen</Btn></>}>
      <div className="props">
        <Prop label="Kategorie"><span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: dotColor }}></span>{evt.c === "yellow" ? "Abnahme" : evt.c === "blue" ? "Kontakt / Kickoff" : "Vor-Ort / Arbeit"}</span></Prop>
        {zeit ? <Prop label="Zeit">{zeit}</Prop> : null}
        {evt.where ? <Prop label="Ort">{evt.where}</Prop> : null}
      </div>
    </Modal>
  );
}

function EditableProps({ rows: initialRows }) {
  const [editing, setEditing] = React.useState(false);
  const [rows, setRows] = React.useState(initialRows);
  const [draft, setDraft] = React.useState(initialRows);
  const start = () => { setDraft(rows); setEditing(true); };
  const save = () => { setRows(draft); setEditing(false); };
  const cancel = () => { setDraft(rows); setEditing(false); };
  return (
    <div>
      <div className="props">
        {rows.map((r, i) => (
          <div className="prop" key={r.label}>
            <div className="prop-l">{r.label}</div>
            {editing ? (
              <input className="txt" style={{ height: 30 }} value={draft[i].value}
                onChange={(e) => setDraft(draft.map((d, j) => j === i ? { ...d, value: e.target.value } : d))} />
            ) : (
              <div className={"prop-v" + (r.link ? " link" : "")}>{r.value}</div>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
        {editing ? (
          <>
            <Btn sm kind="primary" icon="check" onClick={save}>Speichern</Btn>
            <Btn sm kind="ghost" onClick={cancel}>Abbrechen</Btn>
          </>
        ) : (
          <Btn sm onClick={start}>Bearbeiten</Btn>
        )}
      </div>
    </div>
  );
}

/* ---------- Einstellungen ---------- */
function Sec({ title, icon, actions, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 8, borderBottom: "0.5px solid var(--border)" }}>
        {icon ? <Icon n={icon} size={16} style={{ color: "var(--text-3)" }} /> : null}
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.01em" }}>{title}</span>
        <div style={{ flex: 1 }}></div>
        {actions}
      </div>
      <div>{children}</div>
    </div>
  );
}
function Einstellungen() {
  const [tab, setTab] = uS("firma");
  const [notif, setNotif] = uS({ leads: true, abnahme: true, rechnung: false, system: true });
  const [preisKat, setPreisKat] = uS("Sanitär");
  const tst = (m) => window.__toast && window.__toast(m);
  const S = (tab) => (
    <div>
      {tab === "firma" ? (
        <div className="grid-2">
          <Sec title="Stammdaten">
            <EditableProps rows={[
              { label: "Firma", value: "Bärenwald Bau & Sanierung GmbH" },
              { label: "Inhaber", value: "Beran Bärenwald" },
              { label: "Adresse", value: "Lindwurmstr. 88, 80337 München" },
              { label: "USt-IdNr.", value: "DE 287 442 109" },
              { label: "Telefon", value: "089 / 552 87 100", link: true },
              { label: "E-Mail", value: "info@baerenwald-bau.de", link: true },
              { label: "Bankverbindung", value: "Sparkasse München · IBAN ...4421" }
            ]} />
          </Sec>

          <Sec title="Brand & Rechnung">
            <div className="setting-row">
              <div><div className="lbl">Logo</div><div className="sub">Wird auf Rechnungen und Angeboten verwendet</div></div>
              <Btn sm icon="upload">Hochladen</Btn>
            </div>
            <div className="setting-row">
              <div><div className="lbl">Primärfarbe</div><div className="sub">Akzentfarbe in PDF-Vorlagen</div></div>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--green)", border: "0.5px solid var(--border)" }}></div>
            </div>
            <div className="setting-row">
              <div><div className="lbl">Rechnungsnummern</div><div className="sub">Format: RE-{"{JAHR}"}-{"{NNNN}"} · aktuell 0184</div></div>
              <Btn sm kind="ghost">Anpassen</Btn>
            </div>
            <div className="setting-row">
              <div><div className="lbl">Zahlungsziel</div><div className="sub">Standardfrist nach Rechnungsversand</div></div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>14 Tage</div>
            </div>
          </Sec>
        </div>
      ) : tab === "team" ? (
        <Sec title="Teammitglieder" actions={<Btn sm icon="plus" kind="primary" onClick={() => tst("Teammitglied einladen (Demo)")}>Einladen</Btn>}>
          <div style={{ margin: 0 }}>
            <div className="list-row head" style={{ gridTemplateColumns: "42px 2fr 1.5fr 1fr 90px" }}>
              <div></div><div>Name</div><div>E-Mail</div><div>Rolle</div><div></div>
            </div>
            {SETTINGS_TEAM.map(m => (
              <div key={m.initials} className="list-row" style={{ gridTemplateColumns: "42px 2fr 1.5fr 1fr 90px" }}>
                <Avatar initials={m.initials} color={m.initials === "BB" ? "green" : ""} />
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{m.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>{m.mail}</div>
                <div><Badge kind="plain">{m.role}</Badge></div>
                <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                  <Menu align="right" trigger={<button className="qa-btn" title="Aktionen"><Icon n="dots" size={16} /></button>}
                    items={[
                      { icon: "pencil", label: "Bearbeiten", onClick: () => tst("Teammitglied bearbeiten (Demo)") },
                      { icon: "user", label: "Rolle ändern", onClick: () => tst("Rolle ändern (Demo)") },
                      { icon: "mail", label: "E-Mail schreiben", onClick: () => window.open("mailto:" + m.mail) },
                      "sep",
                      { icon: "trash", label: "Entfernen", danger: true, onClick: () => tst("Teammitglied entfernt (Demo)") }
                    ]} />
                </div>
              </div>
            ))}
          </div>
        </Sec>
      ) : tab === "preise" ? (
        <div>
          <div className="listbar" style={{ marginBottom: 12 }}>
            <div className="listbar-chips">
              {["Sanitär", "Elektrik", "Maler", "Fliesen", "Boden"].map(k => (
                <Chip key={k} active={preisKat === k} onClick={() => setPreisKat(k)}>{k}</Chip>
              ))}
            </div>
            <div className="listbar-actions">
              <Btn sm icon="plus" kind="primary" onClick={() => tst("Neue Leistung (Demo)")}>Neue Leistung</Btn>
            </div>
          </div>
          <PosTable
            groups={[{
              id: "pl", gewerk: preisKat, titel: "18 Leistungen",
              items: [
                ["Badewanne demontieren", "pauschal", "180–250 €"],
                ["Dusche bodengleich einbauen", "pauschal", "800–1.400 €"],
                ["WC neu installieren", "pauschal", "320–480 €"],
                ["Waschtisch + Armatur", "Stück", "180 €"],
                ["Heizkörper austauschen", "Stück", "240 €"],
                ["Sanitärinstallation Bad", "pauschal", "2.800–4.200 €"]
              ].map(([n, u, p], i) => ({ id: "pl-" + i, name: n, mengeLabel: u, preisLabel: p }))
            }]}
            onAddItem={() => tst("Neue Leistung (Demo)")}
            itemActions={() => [
              { icon: "pencil", label: "Bearbeiten", onClick: () => tst("Leistung bearbeiten (Demo)") },
              { icon: "copy", label: "Kopieren", onClick: () => tst("Leistung kopiert (Demo)") },
              "sep",
              { icon: "trash", label: "Löschen", danger: true, onClick: () => tst("Leistung gelöscht (Demo)") }
            ]}
          />
        </div>
      ) : tab === "formulare" ? (
        <Sec title="Formulare · 4" icon="forms" actions={<Btn sm kind="primary" icon="plus" onClick={() => tst("Neues Formular (Demo)")}>Formular</Btn>}>
          <div style={{ margin: 0 }}>
            <div className="list-row head" style={{ gridTemplateColumns: "28px 1.6fr 1fr 120px 70px" }}>
              <div></div><div>Name</div><div>Typ</div><div>Genutzt</div><div></div>
            </div>
            {[
              { name: "Abnahmeprotokoll Standard", fields: 12, type: "Abnahme", used: 24 },
              { name: "Bautagebuch täglich", fields: 8, type: "Update", used: 86 },
              { name: "Checkliste Vorab Begehung", fields: 6, type: "Vorab", used: 41 },
              { name: "Mangelanzeige", fields: 9, type: "Service", used: 12 }
            ].map(f => (
              <div key={f.name} className="list-row" style={{ gridTemplateColumns: "28px 1.6fr 1fr 120px 70px", cursor: "default", alignItems: "center" }}>
                <Icon n="file-text" size={18} style={{ color: "var(--text-3)" }} />
                <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}<span style={{ color: "var(--text-4)", fontWeight: 400 }}> · {f.fields} Felder</span></div>
                <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>{f.type}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>{f.used}× genutzt</div>
                <div style={{ display: "flex", gap: 0, justifyContent: "flex-end" }}>
                  <Btn sm kind="ghost" icon="pencil" title="Editor" onClick={() => tst("Formular-Editor (Demo)")} />
                  <Menu align="right" trigger={<button className="qa-btn" title="Aktionen"><Icon n="dots" size={15} /></button>}
                    items={[
                      { icon: "pencil", label: "Bearbeiten", onClick: () => tst("Formular bearbeiten (Demo)") },
                      { icon: "copy", label: "Duplizieren", onClick: () => tst("Formular dupliziert (Demo)") },
                      "sep",
                      { icon: "trash", label: "Löschen", danger: true, onClick: () => tst("Formular gelöscht (Demo)") }
                    ]} />
                </div>
              </div>
            ))}
          </div>
        </Sec>
      ) : tab === "benachrichtigungen" ? (
        <Sec title="Benachrichtigungen">
          <div className="setting-row">
            <div><div className="lbl">Neue Anfragen</div><div className="sub">Sofortige Benachrichtigung bei Web-Leads</div></div>
            <Switch on={notif.leads} onChange={v => setNotif({ ...notif, leads: v })} />
          </div>
          <div className="setting-row">
            <div><div className="lbl">Anstehende Abnahmen</div><div className="sub">24h vor jedem Abnahmetermin</div></div>
            <Switch on={notif.abnahme} onChange={v => setNotif({ ...notif, abnahme: v })} />
          </div>
          <div className="setting-row">
            <div><div className="lbl">Überfällige Rechnungen</div><div className="sub">Wöchentlich · jeden Montag 09:00</div></div>
            <Switch on={notif.rechnung} onChange={v => setNotif({ ...notif, rechnung: v })} />
          </div>
          <div className="setting-row">
            <div><div className="lbl">System-Updates</div><div className="sub">Wartung, neue Funktionen</div></div>
            <Switch on={notif.system} onChange={v => setNotif({ ...notif, system: v })} />
          </div>
        </Sec>
      ) : tab === "integration" ? (
        <Sec title="Integrationen">
          {[
            { name: "DATEV Export", desc: "Buchhaltungs-Schnittstelle", on: true },
            { name: "GMX / Web.de Mail", desc: "SMTP für Rechnungsversand", on: true },
            { name: "Webformular Lead-Sync", desc: "baerenwald-bau.de Kontaktformular", on: true },
            { name: "Telekom CallCenter", desc: "Anruf-Logging & Anrufnotizen", on: false },
            { name: "Google Calendar", desc: "Termine synchronisieren", on: true },
            { name: "WhatsApp Business", desc: "Kundenkommunikation", on: false }
          ].map(it => (
            <div key={it.name} className="setting-row">
              <div><div className="lbl">{it.name}</div><div className="sub">{it.desc}</div></div>
              <Switch on={it.on} onChange={() => tst(it.name + (it.on ? " deaktiviert" : " aktiviert") + " (Demo)")} />
            </div>
          ))}
        </Sec>
      ) : (
        <div className="grid-2" style={{ alignItems: "start" }}>
          <Sec title="Datenschutz & DSGVO" icon="shield-check">
            <div className="props">
              <Prop label="Serverstandort"><span style={{ fontWeight: 600 }}>🇩🇪 Deutschland (Frankfurt)</span></Prop>
              <Prop label="Verschlüsselung">AES-256 · TLS 1.3</Prop>
              <Prop label="AV-Vertrag"><span style={{ color: "var(--green)", fontWeight: 500 }}>✓ unterschrieben</span></Prop>
              <Prop label="Löschfristen">Anfragen 24 Mon. · Rechnungen 10 Jahre</Prop>
              <Prop label="Daten-Export">jederzeit (CSV / DATEV)</Prop>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <Btn sm icon="download">Datenexport</Btn>
              <Btn sm icon="file-text">AV-Vertrag</Btn>
            </div>
          </Sec>

          <Sec title="Rollen & Rechte" icon="users">
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                ["Inhaber", "Voller Zugriff inkl. Finanzen & Einstellungen", "aktiv"],
                ["Projektleitung", "Aufträge, Handwerker, Termine", "aktiv"],
                ["Backoffice", "Rechnungen, Kunden, Dokumente", "aktiv"],
                ["Nur Lesen", "Ansicht ohne Bearbeitung", "plain"]
              ].map(([r, d, k]) => (
                <div key={r} className="setting-row">
                  <div><div className="lbl">{r}</div><div className="sub">{d}</div></div>
                  <Badge kind={k}>{k === "aktiv" ? "Aktiv" : "Verfügbar"}</Badge>
                </div>
              ))}
            </div>
          </Sec>

          <Sec title="Revisionssicherheit" icon="history">
            <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
              Alle Änderungen an Angeboten, Aufträgen und Rechnungen werden protokolliert (wer, wann, was). GoBD-konforme Aufbewahrung, unveränderbare Rechnungs-PDFs.
            </div>
            <div style={{ marginTop: 10 }}><Btn sm icon="list">Änderungsprotokoll</Btn></div>
          </Sec>

          <Sec title="DATEV-Schnittstelle" icon="calculator">
            <div className="setting-row">
              <div><div className="lbl">Buchungsstapel-Export</div><div className="sub">Monatlich an Steuerberater</div></div>
              <Badge kind="aktiv">Aktiv</Badge>
            </div>
            <div className="setting-row">
              <div><div className="lbl">Berater-Nummer</div><div className="sub">DATEV-Mandant</div></div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>1234567 / 89</div>
            </div>
          </Sec>
        </div>
      )}
    </div>
  );
  return (
    <DetailShell
      defaultGroup="firma"
      groups={[
        { id: "firma", label: "Firma", icon: "building", render: () => S("firma") },
        { id: "team", label: "Team", icon: "users", count: 3, render: () => S("team") },
        { id: "preise", label: "Preislisten", icon: "list", render: () => S("preise") },
        { id: "formulare", label: "Formulare", icon: "forms", render: () => S("formulare") },
        { id: "benachrichtigungen", label: "Benachrichtigungen", icon: "bell", render: () => S("benachrichtigungen") },
        { id: "integration", label: "Integrationen", icon: "plug", render: () => S("integration") },
        { id: "sicherheit", label: "Sicherheit & DSGVO", icon: "shield-check", render: () => S("sicherheit") }
      ]}
    />
  );
}
const MEHR_ITEMS = [
  { id: "kunden", label: "Kunden", icon: "users", desc: "Kundenstamm" },
  { id: "handwerker", label: "Handwerker", icon: "tool", desc: "Partnerbetriebe" },
  { id: "partner", label: "Partner", icon: "building", desc: "Netzwerk" },
  { id: "einstellungen", label: "Einstellungen", icon: "settings", desc: "Firma & Team" }
];

function MehrScreen({ navigate }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", marginBottom: 16, background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: "var(--r)" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--green)", color: "white", display: "grid", placeItems: "center", fontSize: 15, fontWeight: 600 }}>BB</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Beran Bärenwald</div>
          <div style={{ fontSize: 12, color: "var(--text-3)" }}>Inhaber · Bärenwald München</div>
        </div>
        <Btn sm icon="settings" kind="ghost" onClick={() => navigate("einstellungen", null)}>Profil</Btn>
      </div>

      <div className="mehr-grid">
        {MEHR_ITEMS.map(it => (
          <button key={it.id} type="button" className="mehr-tile" onClick={() => navigate(it.id, null)}>
            <div className="mehr-tile-icon"><Icon n={it.icon} size={24} /></div>
            <div className="mehr-tile-label">{it.label}</div>
            <div className="mehr-tile-desc">{it.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Neu erstellen (einheitlicher Wizard-Screen) ---------- */
function NeuErstellenScreen({ navigate, preset, openNew, openAngebotWizard, openRechnungWizard, showToast }) {
  const presetMap = {
    anfrage: ["vorgang", "anfrage"], angebot: ["vorgang", "angebot"],
    auftrag: ["vorgang", "auftrag"], rechnung: ["vorgang", "rechnung"],
    kunde: ["kunde", ""], handwerker: ["handwerker", ""], partner: ["partner", ""]
  };
  const [art, setArt] = React.useState(preset ? presetMap[preset][0] : "");
  const [vorgangTyp, setVorgangTyp] = React.useState(preset ? presetMap[preset][1] : "");
  const [f, setF] = React.useState({});
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));

  React.useEffect(() => {
    if (preset && presetMap[preset]) { setArt(presetMap[preset][0]); setVorgangTyp(presetMap[preset][1]); }
  }, [preset]);

  const titelMap = { anfrage: "Neue Anfrage", angebot: "Neues Angebot", auftrag: "Neuer Auftrag", rechnung: "Neue Rechnung", kunde: "Neuer Kunde", handwerker: "Neuer Handwerker", partner: "Neuer Partner" };
  const wizTitel = preset ? (titelMap[preset] || "Neuer Vorgang") : "Neu erstellen";
  const backTo = () => navigate(art === "kunde" ? "kunden" : art === "handwerker" ? "handwerker" : art === "partner" ? "partner" : "vorgaenge");

  const artOptions = [
    { v: "vorgang", ic: "folders", label: "Vorgang", d: "Anfrage, Angebot, Auftrag, Rechnung" },
    { v: "kunde", ic: "users", label: "Kunde", d: "Neuen Kunden anlegen" },
    { v: "handwerker", ic: "tool", label: "Handwerker", d: "Partnerbetrieb anlegen" },
    { v: "partner", ic: "building", label: "Partner", d: "Netzwerk-Partner anlegen" }
  ];
  const vorgangOptions = [
    { v: "anfrage", ic: "inbox", label: "Anfrage" },
    { v: "angebot", ic: "file-invoice", label: "Angebot" },
    { v: "auftrag", ic: "briefcase", label: "Auftrag" },
    { v: "rechnung", ic: "receipt", label: "Rechnung" }
  ];

  const save = (label) => { showToast && showToast(label + " angelegt (Demo)"); navigate("vorgaenge"); };

  return (
    <div className="neu-wiz">
      <div className="neu-wiz-top">
        <button className="qa-btn" title="Abbrechen" onClick={backTo}><Icon n="x" size={18} /></button>
        <div className="neu-wiz-ttl">{wizTitel}</div>
      </div>
      <div className="neu-wiz-body">

      {/* Schritt 1: Was erstellen? — nur ohne Vorauswahl */}
      {!preset ? (
        <>
          <div className="form-section-h" style={{ marginTop: 4 }}>Was möchtest du erstellen?</div>
          <div className="neu-vorgang-grid" style={{ marginBottom: 22 }}>
            {artOptions.map(o => (
              <button key={o.v} className={"neu-vorgang-tile" + (art === o.v ? " sel" : "")}
                onClick={() => { setArt(o.v); setVorgangTyp(""); }}>
                <div className="ico"><Icon n={o.ic} size={22} /></div>
                <div className="t">{o.label}</div>
                <div className="d">{o.d}</div>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {/* Schritt 2: Vorgangstyp — nur ohne Vorauswahl */}
      {!preset && art === "vorgang" ? (
        <>
          <div className="form-section-h">Vorgangstyp</div>
          <div className="chiprow" style={{ marginBottom: 22 }}>
            {vorgangOptions.map(o => (
              <Chip key={o.v} active={vorgangTyp === o.v} icon={o.ic} onClick={() => setVorgangTyp(o.v)}>{o.label}</Chip>
            ))}
          </div>
        </>
      ) : null}

      {/* Schritt 3: Felder inline */}
      {art === "vorgang" && vorgangTyp === "anfrage" ? (
        <div className="neu-fields">
          <div className="form-section-h">Anfrage-Daten</div>
          <div className="form-grid">
            <Field label="Name" required><Txt value={f.name} onChange={v => set("name", v)} placeholder="Kundenname" autoFocus /></Field>
            <Field label="Telefon"><Txt value={f.tel} onChange={v => set("tel", v)} placeholder="089 …" /></Field>
            <Field label="Projekt / Leistung" full><Txt value={f.project} onChange={v => set("project", v)} placeholder="z.B. Badsanierung" /></Field>
            <Field label="Region"><Txt value={f.area} onChange={v => set("area", v)} placeholder="Stadtteil" /></Field>
            <Field label="Kanal"><Sel value={f.kanal} onChange={v => set("kanal", v)} options={["Website","Telefon","WhatsApp","E-Mail","Empfehlung"]} placeholder="wählen…" /></Field>
          </div>
          <div className="neu-actions"><Btn kind="ghost" onClick={() => navigate("vorgaenge")}>Abbrechen</Btn><div style={{ flex: 1 }}></div><Btn kind="primary" icon="check" onClick={() => save("Anfrage")}>Anfrage anlegen</Btn></div>
        </div>
      ) : null}

      {art === "vorgang" && vorgangTyp === "auftrag" ? (
        <div className="neu-fields">
          <div className="form-section-h">Auftrags-Daten</div>
          <div className="form-grid">
            <Field label="Titel" required full><Txt value={f.title} onChange={v => set("title", v)} placeholder="z.B. Badsanierung Koch" autoFocus /></Field>
            <Field label="Kunde"><Sel value={f.customer} onChange={v => set("customer", v)} options={CUSTOMERS.map(c => c.name)} placeholder="wählen…" /></Field>
            <Field label="Auftragswert (€)"><Txt type="number" value={f.value} onChange={v => set("value", v)} placeholder="0" /></Field>
            <Field label="Region"><Txt value={f.area} onChange={v => set("area", v)} placeholder="Stadtteil" /></Field>
          </div>
          <div className="neu-actions"><Btn kind="ghost" onClick={() => navigate("vorgaenge")}>Abbrechen</Btn><div style={{ flex: 1 }}></div><Btn kind="primary" icon="check" onClick={() => save("Auftrag")}>Auftrag anlegen</Btn></div>
        </div>
      ) : null}

      {art === "vorgang" && (vorgangTyp === "angebot" || vorgangTyp === "rechnung") ? (
        <div className="neu-fields">
          <div style={{ padding: "16px 0", fontSize: 13, color: "var(--text-2)" }}>
            {vorgangTyp === "angebot" ? "Angebote werden im mehrstufigen Angebots-Wizard erstellt." : "Rechnungen werden aus einem Auftrag erstellt."}
          </div>
          <div className="neu-actions">
            <Btn kind="ghost" onClick={() => navigate("vorgaenge")}>Abbrechen</Btn><div style={{ flex: 1 }}></div>
            {vorgangTyp === "angebot"
              ? <Btn kind="primary" icon="arrow-right" onClick={() => { if (LEADS[0]) openAngebotWizard(LEADS[0]); }}>Angebots-Wizard öffnen</Btn>
              : <Btn kind="primary" icon="arrow-right" onClick={() => openRechnungWizard && openRechnungWizard(ORDERS[0])}>Rechnungs-Wizard öffnen</Btn>}
          </div>
        </div>
      ) : null}

      {art === "kunde" ? (
        <div className="neu-fields">
          <div className="form-section-h">Kunden-Daten</div>
          <div className="form-grid">
            <Field label="Name" required full><Txt value={f.name} onChange={v => set("name", v)} placeholder="Name / Firma" autoFocus /></Field>
            <Field label="Typ"><Sel value={f.type} onChange={v => set("type", v)} options={["Privat","Hausverwaltung","Gewerbe"]} placeholder="wählen…" /></Field>
            <Field label="Telefon"><Txt value={f.tel} onChange={v => set("tel", v)} placeholder="089 …" /></Field>
            <Field label="E-Mail" full><Txt value={f.mail} onChange={v => set("mail", v)} placeholder="mail@…" /></Field>
          </div>
          <div className="neu-actions"><Btn kind="ghost" onClick={() => navigate("kunden")}>Abbrechen</Btn><div style={{ flex: 1 }}></div><Btn kind="primary" icon="check" onClick={() => { showToast && showToast("Kunde angelegt (Demo)"); navigate("kunden"); }}>Kunde anlegen</Btn></div>
        </div>
      ) : null}

      {art === "handwerker" ? (
        <div className="neu-fields">
          <div className="form-section-h">Handwerker-Daten</div>
          <div className="form-grid">
            <Field label="Name" required full><Txt value={f.name} onChange={v => set("name", v)} placeholder="Betrieb / Name" autoFocus /></Field>
            <Field label="Gewerk"><Txt value={f.category} onChange={v => set("category", v)} placeholder="z.B. Sanitär" /></Field>
            <Field label="Telefon"><Txt value={f.tel} onChange={v => set("tel", v)} placeholder="0170 …" /></Field>
            <Field label="E-Mail" full><Txt value={f.mail} onChange={v => set("mail", v)} placeholder="mail@…" /></Field>
          </div>
          <div className="neu-actions"><Btn kind="ghost" onClick={() => navigate("handwerker")}>Abbrechen</Btn><div style={{ flex: 1 }}></div><Btn kind="primary" icon="check" onClick={() => { showToast && showToast("Handwerker angelegt (Demo)"); navigate("handwerker"); }}>Handwerker anlegen</Btn></div>
        </div>
      ) : null}

      {art === "partner" ? (
        <div className="neu-fields">
          <div className="form-section-h">Partner-Daten</div>
          <div className="form-grid">
            <Field label="Name" required full><Txt value={f.name} onChange={v => set("name", v)} placeholder="Firma / Name" autoFocus /></Field>
            <Field label="Kategorie"><Sel value={f.category} onChange={v => set("category", v)} options={["Versicherung","Finanzierung","Makler","Planung","Logistik"]} placeholder="wählen…" /></Field>
            <Field label="Ansprechpartner"><Txt value={f.contact} onChange={v => set("contact", v)} placeholder="Name" /></Field>
            <Field label="Telefon"><Txt value={f.tel} onChange={v => set("tel", v)} placeholder="089 …" /></Field>
            <Field label="E-Mail" full><Txt value={f.mail} onChange={v => set("mail", v)} placeholder="mail@…" /></Field>
          </div>
          <div className="neu-actions"><Btn kind="ghost" onClick={() => navigate("partner")}>Abbrechen</Btn><div style={{ flex: 1 }}></div><Btn kind="primary" icon="check" onClick={() => { showToast && showToast("Partner angelegt (Demo)"); navigate("partner"); }}>Partner anlegen</Btn></div>
        </div>
      ) : null}
      </div>
    </div>
  );
}

/* ---------- Partner Detail ---------- */
function PartnerDetail({ id, navigate, onEdit, showToast }) {
  const p = PARTNERS.find(x => x.id === id) || PARTNERS[0];
  const pVermittelt = p.deals || 0;
  const pUmsatz = pVermittelt * 8500;
  const pOffen = Math.round(pUmsatz * 0.08 * 0.4);
  const pStats = [
    { icon: "inbox", label: "Vermittelt", value: pVermittelt },
    { icon: "file-invoice", label: "Angebote", value: Math.round(pVermittelt * 0.8) },
    { icon: "tool", label: "Aufträge", value: Math.round(pVermittelt * 0.6) },
    { icon: "calculator", label: "Umsatz", value: formatEUR(pUmsatz) },
    { icon: "trending-up", label: "Ø Vorgang", value: formatEUR(pVermittelt ? Math.round(pUmsatz / pVermittelt) : 0) },
    { icon: "clock", label: "Offen", value: formatEUR(pOffen) }
  ];
  return (
    <div>
      <div className="detail-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="dh-title">{p.name}</div>
          <div className="dh-meta">
            <Badge kind="aktiv">Aktiv</Badge>
            <Badge kind={p.portalAktiv === false ? "storniert" : "aktiv"}><Icon n={p.portalAktiv === false ? "circle-x" : "plug"} size={10} /> Portal {p.portalAktiv === false ? "inaktiv" : "aktiv"}</Badge>
            <span>{p.category}</span>
            <span className="sep">·</span>
            <span>{p.deals} Vorgänge vermittelt</span>
          </div>
        </div>
        <Menu align="right" trigger={<button className="qa-btn" title="Aktionen"><Icon n="dots" size={18} /></button>}
          items={entityMenu("partner", p, {
            onEdit: () => onEdit && onEdit(p),
            onPortal: () => navigate("portal"),
            onCopy: () => showToast && showToast("Partner kopiert (Demo)"),
            onDelete: () => showToast && showToast("Partner gelöscht (Demo)")
          })} />
      </div>

      <DetailShell
        defaultGroup="uebersicht"
        groups={[
          { id: "uebersicht", label: "Übersicht", icon: "layout-dashboard", render: () => (
            <UebersichtCard stats={pStats} />
          )},
          { id: "stammdaten", label: "Stammdaten", icon: "clipboard-list", render: () => (
            <Card title="Kontakt">
              <div className="props">
                <Prop label="Firma">{p.name}</Prop>
                <Prop label="Kategorie">{p.category}</Prop>
                <Prop label="Ansprechpartner">{p.contact}</Prop>
                <Prop label="Telefon" link>{p.tel}</Prop>
                <Prop label="E-Mail" link>{p.mail || "—"}</Prop>
              </div>
            </Card>
          )},
          { id: "vorgaenge", label: "Vorgänge", icon: "folders", render: () => (
            <VorgaengeList navigate={navigate} restrictPartner={p.id} embedded />
          )},
          { id: "dokumente", label: "Dokumente", icon: "files", render: () => (
            <DokumenteCard seed={[
              { id: "pa-d1", kind: "datei", name: "Rahmenvereinbarung.pdf", date: "10.01.2026", size: "210 KB", freigabe: false }
            ]} />
          )},
          { id: "notizen", label: "Notizen", icon: "messages", render: () => (
            <NotizenCard seed={[
              { autor: "Beran", time: "02.06.2026", text: "Zuverlässiger Partner, schnelle Rückmeldungen. Konditionen zuletzt bestätigt." }
            ]} />
          )}
        ]}
      />
    </div>
  );
}

Object.assign(window, {
  Dashboard, AnfragenList, AuftraegeKanban, KundenList, HandwerkerList,
  PartnerList, PartnerDetail, Kalender, Einstellungen, MehrScreen, NeuErstellenScreen
});

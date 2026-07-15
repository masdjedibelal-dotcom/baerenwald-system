/* ============ Baerenwald CRM — Main app shell & routing ============ */

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "layout-dashboard", section: "Arbeit" },
  { id: "vorgaenge", label: "Vorgänge", icon: "folders", section: "Arbeit" },
  { id: "kunden", label: "Kunden", icon: "users", section: "Stammdaten" },
  { id: "handwerker", label: "Handwerker", icon: "tool", section: "Stammdaten" },
  { id: "partner", label: "Partner", icon: "building", section: "Stammdaten" },
  { id: "kalender", label: "Kalender", icon: "calendar", section: "Planung" }
];

// Bottom-Nav (mobil): 4 Kern-Tabs + „Mehr"
const MOBILE_PRIMARY = ["dashboard", "vorgaenge", "kalender"];

const SCREEN_TITLES = {
  dashboard: "Dashboard",
  vorgaenge: "Vorgänge",
  neu: "Neu erstellen",
  anfragen: "Anfrage",
  angebote: "Angebot",
  auftraege: "Auftrag",
  rechnungen: "Rechnung",
  kunden: "Kunden",
  handwerker: "Handwerker",
  partner: "Partner",
  objekte: "Objekte",
  kalender: "Kalender",
  einstellungen: "Einstellungen",
  portal: "Kundenportal · Vorschau",
  login: "Login · Vorschau",
  onboarding: "Onboarding · Vorschau",
  mehr: "Mehr"
};

function App() {
  const [screen, setScreen] = React.useState("dashboard");
  const [selectedId, setSelectedId] = React.useState(null);
  const [form, setForm] = React.useState(null); // { kind, initial }
  const [toast, setToast] = React.useState(null);
  const [statusModal, setStatusModal] = React.useState(null); // { kind, lead }
  const [sbCollapsed, setSbCollapsed] = React.useState(() => typeof window !== "undefined" && window.innerWidth <= 760);
  const [angebotWizard, setAngebotWizard] = React.useState(null); // lead

  const openStatusModal = (kind, lead) => setStatusModal({ kind, lead });
  const openAngebotWizard = (lead) => setAngebotWizard(lead);
  const [rechnungWizard, setRechnungWizard] = React.useState(null);
  const openRechnungWizard = (order, prefill) => setRechnungWizard({ order, prefill });
  const [objektWizard, setObjektWizard] = React.useState(null); // { verwaltungId } | {}
  React.useEffect(() => { window.__openObjektWizard = (verwaltungId) => setObjektWizard({ verwaltungId: verwaltungId || null }); }, []);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQ, setSearchQ] = React.useState("");
  const [recentSearches, setRecentSearches] = React.useState(["Koch", "Badsanierung", "Weidner"]);
  const searchWrapRef = React.useRef(null);
  const addRecent = (q) => { q = q.trim(); if (!q) return; setRecentSearches(r => [q, ...r.filter(x => x !== q)].slice(0, 5)); };
  React.useEffect(() => {
    if (!searchOpen) return;
    const h = (e) => { if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) setSearchOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [searchOpen]);
  const [fabOpen, setFabOpen] = React.useState(false);
  const fabRef = React.useRef(null);
  const [neuVorgangOpen, setNeuVorgangOpen] = React.useState(false);
  const [neuType, setNeuType] = React.useState(null);
  const openNeu = (kind) => {
    setNeuVorgangOpen(false);
    if (kind === "angebot") { setSelectedId(null); if (LEADS[0]) openAngebotWizard(LEADS[0]); return; }
    setNeuType(kind); setSelectedId(null); setScreen("neu");
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  // Command palette (⌘K)
  const [cmdkOpen, setCmdkOpen] = React.useState(false);
  React.useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); setCmdkOpen(o => !o); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Auto-Tooltip: bei abgeschnittenem Text vollen Inhalt als title anzeigen
  React.useEffect(() => {
    const h = (e) => {
      const el = e.target;
      if (!el || el.nodeType !== 1) return;
      if (el.hasAttribute("title")) return;
      const truncated = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
      if (truncated) {
        const txt = (el.textContent || "").trim();
        if (txt) el.setAttribute("title", txt);
      }
    };
    document.addEventListener("mouseover", h, true);
    return () => document.removeEventListener("mouseover", h, true);
  }, []);
  const commands = React.useMemo(() => {
    return null; // Suche arbeitet jetzt entitätsbasiert über searchEntities
  }, []);

  // Entitäts-Suche: Kunden, Anfragen, Aufträge, Angebote, Rechnungen, Handwerker, Partner
  const searchEntities = (raw) => {
    const q = (raw || "").trim().toLowerCase();
    if (!q) return [];
    const hits = [];
    LEADS.forEach(l => { if ((l.name + " " + l.project + " " + (l.area || "") + " " + l.id).toLowerCase().includes(q)) hits.push({ id: "l" + l.id, icon: "inbox", label: l.name, sub: "Anfrage · " + l.project, run: () => navigate("anfragen", l.id) }); });
    ORDERS.forEach(o => { if ((o.title + " " + o.customer + " " + (o.area || "") + " " + o.id).toLowerCase().includes(q)) hits.push({ id: "o" + o.id, icon: "briefcase", label: o.title, sub: "Auftrag · " + o.customer, run: () => navigate("auftraege", o.id) }); });
    (typeof ANGEBOTE !== "undefined" ? ANGEBOTE : []).forEach(a => { if ((a.titel + " " + a.kunde + " " + a.id).toLowerCase().includes(q)) hits.push({ id: "a" + a.id, icon: "file-invoice", label: a.titel, sub: "Angebot · " + a.kunde, run: () => navigate("angebote", a.id) }); });
    CUSTOMERS.forEach(c => { if ((c.name + " " + (c.ort || "") + " " + (c.email || "")).toLowerCase().includes(q)) hits.push({ id: "c" + c.id, icon: "users", label: c.name, sub: "Kunde" + (c.ort ? " · " + c.ort : ""), run: () => navigate("kunden", c.id) }); });
    (typeof TRADES !== "undefined" ? TRADES : []).forEach(t => { if ((t.name + " " + (t.gewerk || "") + " " + (t.ort || "")).toLowerCase().includes(q)) hits.push({ id: "t" + t.id, icon: "tool", label: t.name, sub: "Handwerker" + (t.gewerk ? " · " + t.gewerk : ""), run: () => navigate("handwerker", t.id) }); });
    (typeof PARTNERS !== "undefined" ? PARTNERS : []).forEach(p => { if ((p.name + " " + (p.kategorie || "")).toLowerCase().includes(q)) hits.push({ id: "p" + p.id, icon: "building", label: p.name, sub: "Partner" + (p.kategorie ? " · " + p.kategorie : ""), run: () => navigate("partner", p.id) }); });
    return hits.slice(0, 12);
  };

  const openNew = (kind) => setForm({ kind, initial: null });
  const openEdit = (kind, initial) => setForm({ kind, initial });
  const closeForm = () => setForm(null);
  const [confirm, setConfirm] = React.useState(null); // { label, onConfirm }
  const confirmDelete = (label, onConfirm) => setConfirm({ label, onConfirm: onConfirm || (() => {}) });
  React.useEffect(() => { window.__openEdit = openEdit; window.__confirmDelete = confirmDelete; window.__toast = showToast; window.__openAngebotWizard = openAngebotWizard; window.__openRechnungWizard = openRechnungWizard; }, []);
  const handleSave = (data) => {
    const label = {
      anfrage: "Anfrage", auftrag: "Auftrag", kunde: "Kunde",
      handwerker: "Handwerker", partner: "Partner", termin: "Termin"
    }[form.kind];
    showToast(`${label} ${form.initial ? "gespeichert" : "angelegt"}.`);
    setForm(null);
  };

  const handleStatusSave = (payload) => {
    const lbl = {
      termin: `Termin vereinbart · ${payload.termin?.datum} ${payload.termin?.uhrzeit}`,
      rueckfrage: "Rückfrage notiert",
      nicht_erreichbar: `Wiedervorlage angelegt · ${payload.wiedervorlage}`,
      verloren: "Anfrage als verloren markiert"
    }[statusModal.kind];
    showToast(lbl);
    setStatusModal(null);
  };

  const handleAngebotSend = (data) => {
    showToast(`Angebot „${data.angebot.titel}" versendet · ${formatEUR(data.brutto)} brutto`);
    setAngebotWizard(null);
  };

  const handleRechnungSave = (data) => {
    showToast(`Rechnung ${data.id} erstellt & versendet · ${formatEUR(data.brutto)} brutto`);
    setRechnungWizard(null);
  };

  const handleObjektSave = (data) => {
    showToast(`Objekt „${data.name}" angelegt · ${data.einheiten.length} Einheiten`);
    setObjektWizard(null);
  };

  // Per-screen state
  const [vorgaengeQuery, setVorgaengeQuery] = React.useState("");
  const [vorgaengeFilter, setVorgaengeFilter] = React.useState("alle");
  const [anfragenQuery, setAnfragenQuery] = React.useState("");
  const [anfragenFilter, setAnfragenFilter] = React.useState("all");
  const [angeboteQuery, setAngeboteQuery] = React.useState("");
  const [angeboteFilter, setAngeboteFilter] = React.useState("alle");
  const [rechnungQuery, setRechnungQuery] = React.useState("");
  const [rechnungFilter, setRechnungFilter] = React.useState("alle");
  const [auftragQuery, setAuftragQuery] = React.useState("");
  const [auftragView, setAuftragView] = React.useState("kanban");
  const [kundenQuery, setKundenQuery] = React.useState("");
  const [kundenFilter, setKundenFilter] = React.useState("all");
  const [handwerkerQuery, setHandwerkerQuery] = React.useState("");
  const [partnerQuery, setPartnerQuery] = React.useState("");
  const [objekteQuery, setObjekteQuery] = React.useState("");

    const PHASE_SCREEN_MAP = { anfragen: "anfrage", angebote: "angebot", auftraege: "auftrag", rechnungen: "rechnung" };
  const navigate = (s, id) => {
    // Ohne Auswahl: die vier Vorgangs-Phasen zeigen die EINE Vorgangsliste, vorgefiltert
    if (!id && PHASE_SCREEN_MAP[s]) {
      setVorgaengeFilter(PHASE_SCREEN_MAP[s]);
      setScreen("vorgaenge");
      setSelectedId(null);
      return;
    }
    setScreen(s);
    setSelectedId(id || null);
  };

  // Topbar resolves based on screen + selection
  const renderTopbar = () => {
    const titleBase = SCREEN_TITLES[screen];
    let crumb = null;
    let entityTitle = null;
    let actions = null;

    if (screen === "anfragen" && selectedId) {
      const l = LEADS.find(x => x.id === selectedId);
      crumb = "Anfragen";
      entityTitle = l ? l.name : selectedId;
    } else if (screen === "angebote" && selectedId) {
      const ang = ANGEBOTE.find(x => x.id === selectedId);
      crumb = "Angebote";
      entityTitle = ang ? ang.titel : selectedId;
    } else if (screen === "auftraege" && selectedId) {
      const o = ORDERS.find(x => x.id === selectedId);
      crumb = "Aufträge";
      entityTitle = o ? o.title : selectedId;
    } else if (screen === "kunden" && selectedId) {
      const c = CUSTOMERS.find(x => x.id === selectedId);
      crumb = "Kunden";
      entityTitle = c ? c.name : selectedId;
    } else if (screen === "handwerker" && selectedId) {
      const t = TRADES.find(x => x.id === selectedId);
      crumb = "Handwerker";
      entityTitle = t ? t.name : selectedId;
    } else if (screen === "partner" && selectedId) {
      const p = PARTNERS.find(x => x.id === selectedId);
      crumb = "Partner";
      entityTitle = p ? p.name : selectedId;
    } else if (screen === "rechnungen" && selectedId) {
      const re = RECHNUNGEN.find(x => x.id === selectedId);
      crumb = "Rechnungen";
      entityTitle = re ? re.titel : selectedId;
    }

    // Actions per top-level screen
    if (!selectedId) {
      if (screen === "dashboard") actions = (
        <>
          <Btn icon="search" kind="ghost" sm onClick={() => setCmdkOpen(true)} title="Suche (⌘K)" />
          <Btn icon="bell" kind="ghost" sm />
        </>
      );
      else if (screen === "vorgaenge") actions = (
        <Btn icon="search" kind="ghost" sm onClick={() => setCmdkOpen(true)} title="Suche (⌘K)" />
      );
      else if (screen === "einstellungen") actions = <Btn icon="device-floppy" kind="primary">Speichern</Btn>;
    } else {
      actions = null;
    }

    const backToVorgaenge = ["anfragen", "angebote", "auftraege", "rechnungen"].includes(screen);
    const backTarget = backToVorgaenge ? "vorgaenge" : screen;
    const backLabel = backToVorgaenge ? "Zurück zu den Vorgängen" : "Zurück zu " + (crumb || SCREEN_TITLES[screen] || "");

    // Für Listen-Screens: einheitlicher Header mit zentraler Suche + Utility rechts
    const isList = !selectedId && ["dashboard","vorgaenge","kunden","handwerker","partner","mehr","kalender","einstellungen"].includes(screen);

    return (
      <div className="topbar">
        <div className="topbar-title">
          {selectedId
            ? <>
                <span>{crumb}</span>
                <span style={{ color: "var(--text-3)", fontWeight: 500, marginLeft: 8 }}>Details</span>
              </>
            : <span>{titleBase}</span>}
        </div>
        {!selectedId ? (
          <button type="button" className="topbar-search-trigger" onClick={() => setCmdkOpen(true)}>
            <Icon n="search" size={16} />
            <span>Suchen…</span>
          </button>
        ) : null}
        <div className="topbar-actions">
          {!selectedId ? (
            <Btn icon="bell" kind="ghost" sm title="Benachrichtigungen" />
          ) : actions}
        </div>
      </div>
    );
  };

  // Detail-Breadcrumb (über dem Titel, wie auf einer Webseite)
  const renderDetailCrumb = () => {
    if (!selectedId) return null;
    const map = { anfragen: "Anfragen", angebote: "Angebote", auftraege: "Aufträge", rechnungen: "Rechnungen", kunden: "Kunden", handwerker: "Handwerker", partner: "Partner", objekte: "Objekte" };
    const crumb = map[screen] || SCREEN_TITLES[screen] || "";
    const vorgang = ["anfragen", "angebote", "auftraege", "rechnungen"].includes(screen);
    const backTarget = vorgang ? "vorgaenge" : screen;
    const backLabel = vorgang ? "Zurück zu den Vorgängen" : "Zurück zu " + crumb;
    const find = (arr, f) => { const x = (arr || []).find(e => e.id === selectedId); return x ? f(x) : selectedId; };
    let title = selectedId;
    if (screen === "anfragen") title = find(LEADS, l => l.name);
    else if (screen === "angebote") title = find(ANGEBOTE, a => a.titel);
    else if (screen === "auftraege") title = find(ORDERS, o => o.title);
    else if (screen === "rechnungen") title = find(RECHNUNGEN, r => r.titel);
    else if (screen === "kunden") title = find(CUSTOMERS, c => c.name);
    else if (screen === "handwerker") title = find(TRADES, t => t.name);
    else if (screen === "partner") title = find(PARTNERS, p => p.name);
    else if (screen === "objekte") title = find(OBJEKTE, o => o.name);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 14, fontSize: 13 }}>
        <span className="link" onClick={() => navigate(backTarget)} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--green)", cursor: "pointer", fontWeight: 500 }}><Icon n="arrow-left" size={15} />{backLabel}</span>
        <span style={{ color: "var(--text-3)", minWidth: 0 }}><span style={{ margin: "0 8px", color: "var(--text-4)" }}>·</span><span className="link" onClick={() => navigate(backTarget)} style={{ cursor: "pointer" }}>{crumb}</span> <span style={{ color: "var(--text-4)" }}>›</span> <b style={{ color: "var(--text)" }}>{title}</b></span>
      </div>
    );
  };

  // Body
  const renderBody = () => {
    if (screen === "dashboard") return <Dashboard navigate={navigate} />;

    if (screen === "vorgaenge") {
      return <VorgaengeList navigate={navigate}
                            query={vorgaengeQuery} setQuery={setVorgaengeQuery}
                            filter={vorgaengeFilter} setFilter={setVorgaengeFilter}
                            openStatusModal={openStatusModal} openAngebotWizard={openAngebotWizard}
                            showToast={showToast} />;
    }

    if (screen === "anfragen") {
      if (selectedId) return <LeadDetail id={selectedId} onBack={() => setSelectedId(null)} navigate={navigate}
        openStatusModal={openStatusModal} openAngebotWizard={openAngebotWizard} />;
      return <AnfragenList selectId={selectedId} onSelect={setSelectedId}
                           query={anfragenQuery} setQuery={setAnfragenQuery}
                           filter={anfragenFilter} setFilter={setAnfragenFilter} />;
    }

    if (screen === "angebote") {
      if (selectedId) return <AngebotDetail id={selectedId} onBack={() => setSelectedId(null)} navigate={navigate} openAngebotWizard={openAngebotWizard} />;
      return <AngeboteList selectId={selectedId} onSelect={setSelectedId}
                           query={angeboteQuery} setQuery={setAngeboteQuery}
                           filter={angeboteFilter} setFilter={setAngeboteFilter} />;
    }

    if (screen === "auftraege") {
      if (selectedId) return <OrderDetail id={selectedId} onBack={() => setSelectedId(null)} navigate={navigate} showToast={showToast} openRechnungWizard={openRechnungWizard} />;
      return <AuftraegeKanban onSelect={setSelectedId}
                              view={auftragView} setView={setAuftragView}
                              query={auftragQuery} setQuery={setAuftragQuery} />;
    }

    if (screen === "kunden") {
      if (selectedId) return <CustomerDetail id={selectedId} navigate={navigate} />;
      return <KundenList onSelect={setSelectedId} navigate={navigate}
                         query={kundenQuery} setQuery={setKundenQuery}
                         filter={kundenFilter} setFilter={setKundenFilter} />;
    }

    if (screen === "handwerker") {
      if (selectedId) return <TradeDetail id={selectedId} navigate={navigate} />;
      return <HandwerkerList onSelect={setSelectedId} navigate={navigate}
                             query={handwerkerQuery} setQuery={setHandwerkerQuery} />;
    }

    if (screen === "partner") {
      if (selectedId) return <PartnerDetail id={selectedId} navigate={navigate} onEdit={(p) => openEdit("partner", p)} showToast={showToast} />;
      return <PartnerList query={partnerQuery} setQuery={setPartnerQuery} onSelect={setSelectedId} navigate={navigate} onEdit={(p) => openEdit("partner", p)} />;
    }

    if (screen === "objekte") {
      if (selectedId) return <ObjektDetail id={selectedId} navigate={navigate} />;
      return <ObjekteList query={objekteQuery} setQuery={setObjekteQuery} onSelect={setSelectedId} />;
    }

    if (screen === "rechnungen") {
      if (selectedId) return <RechnungDetail id={selectedId} navigate={navigate} showToast={showToast} />;
      return <VorgaengeList navigate={navigate}
                            query={vorgaengeQuery} setQuery={setVorgaengeQuery}
                            filter={vorgaengeFilter} setFilter={setVorgaengeFilter}
                            openStatusModal={openStatusModal} openAngebotWizard={openAngebotWizard}
                            showToast={showToast} />;
    }
    if (screen === "kalender") return <Kalender />;
    if (screen === "einstellungen") return <Einstellungen />;
    if (screen === "portal") return <Kundenportal navigate={navigate} />;
    if (screen === "login") return <LoginScreen navigate={navigate} />;
    if (screen === "onboarding") return <OnboardingScreen navigate={navigate} />;
    if (screen === "mehr") return <MehrScreen navigate={navigate} />;
    if (screen === "neu") return <NeuErstellenScreen navigate={navigate} preset={neuType} openNew={openNew} openAngebotWizard={openAngebotWizard} openRechnungWizard={openRechnungWizard} showToast={showToast} />;
    return null;
  };

  // Mobile bottom-nav items: 4 core + Mehr
  const bottomNav = MOBILE_PRIMARY.map(id => NAV.find(n => n.id === id)).filter(Boolean);
  const isMoreActive = !MOBILE_PRIMARY.includes(screen);

  return (
    <div className={"app" + (sbCollapsed ? " sb-collapsed" : "")} data-screen-label={"00 " + (selectedId ? `${SCREEN_TITLES[screen]} Detail` : SCREEN_TITLES[screen])}>
      <nav className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="sidebar-logo" title="Bärenwald CRM">B</div>
            <span className="sidebar-brandname">Bärenwald</span>
          </div>
          <button className="sidebar-toggle" title={sbCollapsed ? "Sidebar ausklappen" : "Sidebar einklappen"} aria-label="Sidebar umschalten" onClick={() => setSbCollapsed(v => !v)}>
            <Icon n={sbCollapsed ? "chevron-right" : "chevron-left"} />
          </button>
        </div>
        <div className="sidebar-nav">
          {NAV.map((n, i, arr) => {
            const prev = arr[i - 1];
            const showSection = n.section && (!prev || prev.section !== n.section);
            return (
              <React.Fragment key={n.id}>
                {showSection ? <div className="sidebar-section">{n.section}</div> : null}
                <button
                  className={"sidebar-icon" + (screen === n.id ? " active" : "")}
                  data-label={n.label}
                  onClick={() => navigate(n.id, null)}
                  aria-label={n.label}
                >
                  <Icon n={n.icon} />
                  <span className="sidebar-label">{n.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="sidebar-spacer"></div>
        <button
          className={"sidebar-icon" + (screen === "einstellungen" ? " active" : "")}
          data-label="Einstellungen"
          onClick={() => navigate("einstellungen", null)}
          aria-label="Einstellungen"
        >
          <Icon n="settings" />
          <span className="sidebar-label">Einstellungen</span>
        </button>
        <button className="sidebar-icon" data-label="Beran Bärenwald">
          <div style={{ width: 24, height: 24, flexShrink: 0, borderRadius: "50%", background: "var(--green)", color: "white", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600 }}>BB</div>
          <span className="sidebar-label">Beran Bärenwald</span>
        </button>
      </nav>

      <div className="sb-scrim" onClick={() => setSbCollapsed(true)}></div>
      <button className="sb-mobile-open" title="Menü" aria-label="Menü öffnen" onClick={() => setSbCollapsed(false)}>
        <Icon n="layout" />
      </button>

      {/* Mobile bottom navigation — 4 core tabs + Mehr */}
      <nav className="bottomnav">
        {bottomNav.slice(0, 2).map(n => (
          <button
            key={n.id}
            className={"bottomnav-item" + (screen === n.id ? " active" : "")}
            onClick={() => navigate(n.id, null)}
            aria-label={n.label}
          >
            <Icon n={n.icon} size={22} />
            <span>{n.label}</span>
          </button>
        ))}
        <button className="bottomnav-cta" onClick={() => setNeuVorgangOpen(true)} aria-label="Neu erstellen">
          <span className="bottomnav-cta-fab"><Icon n="plus" size={26} /></span>
        </button>
        {bottomNav.slice(2).map(n => (
          <button
            key={n.id}
            className={"bottomnav-item" + (screen === n.id ? " active" : "")}
            onClick={() => navigate(n.id, null)}
            aria-label={n.label}
          >
            <Icon n={n.icon} size={22} />
            <span>{n.label}</span>
          </button>
        ))}
        <button
          className={"bottomnav-item" + (isMoreActive ? " active" : "")}
          onClick={() => navigate("mehr", null)}
          aria-label="Mehr"
        >
          <Icon n="dots" size={22} />
          <span>Mehr</span>
        </button>
      </nav>

      <div className="main">
        {renderTopbar()}
        <main className="page">
          <div className="page-inner">
            {renderDetailCrumb()}
            {renderBody()}
          </div>
        </main>
      </div>

      {/* Form sheets */}
      {form?.kind === "anfrage"   ? <AnfrageForm    initial={form.initial} onClose={closeForm} onSave={handleSave} /> : null}
      {form?.kind === "auftrag"   ? <AuftragForm    initial={form.initial} onClose={closeForm} onSave={handleSave} /> : null}
      {form?.kind === "kunde"     ? <KundeForm      initial={form.initial} onClose={closeForm} onSave={handleSave} /> : null}
      {form?.kind === "handwerker"? <HandwerkerForm initial={form.initial} onClose={closeForm} onSave={handleSave} /> : null}
      {form?.kind === "partner"   ? <PartnerForm    initial={form.initial} onClose={closeForm} onSave={handleSave} /> : null}
      {form?.kind === "termin"    ? <TerminForm     initial={form.initial} onClose={closeForm} onSave={handleSave} /> : null}

      {/* Status Modal (Termin / Rückfrage / Nicht erreichbar / Verloren) */}
      {statusModal ? (
        <StatusModal
          kind={statusModal.kind}
          lead={statusModal.lead}
          onClose={() => setStatusModal(null)}
          onSave={handleStatusSave}
        />
      ) : null}

      {/* Angebot Wizard */}
      {angebotWizard ? (
        <AngebotWizard
          lead={angebotWizard}
          onClose={() => setAngebotWizard(null)}
          onSave={handleAngebotSend}
        />
      ) : null}

      {rechnungWizard ? (
        <RechnungWizard
          order={rechnungWizard.order}
          prefill={rechnungWizard.prefill}
          onClose={() => setRechnungWizard(null)}
          onSave={handleRechnungSave}
        />
      ) : null}

      {objektWizard ? (
        <ObjektWizard
          verwaltungId={objektWizard.verwaltungId}
          onClose={() => setObjektWizard(null)}
          onSave={handleObjektSave}
        />
      ) : null}

      {/* Command Palette (⌘K) */}
      <CommandPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} search={searchEntities} recent={recentSearches} addRecent={addRecent} />

      {/* Globaler Erstellen-FAB (auch in Detail-Ansicht, nicht im Wizard/Neu/Einstellungen) */}
      {!angebotWizard && !rechnungWizard && !objektWizard && screen !== "einstellungen" && screen !== "neu" ? (
        <div className="fab-wrap fab-desktop">
          <button className="fab-btn" title="Neu erstellen" onClick={() => setNeuVorgangOpen(true)}>
            <Icon n="plus" size={26} />
          </button>
        </div>
      ) : null}

      {/* Neu-erstellen-Auswahl als Popover */}
      {neuVorgangOpen ? (
        <div className="neu-pop-overlay" onClick={() => setNeuVorgangOpen(false)}>
          <div className="neu-pop" onClick={(e) => e.stopPropagation()}>
            <div className="neu-pop-head">Neuen Vorgang erstellen</div>
            {[
              { ic: "inbox", label: "Anfrage", run: () => openNeu("anfrage") },
              { ic: "file-invoice", label: "Angebot", run: () => openNeu("angebot") },
              { ic: "briefcase", label: "Auftrag", run: () => openNeu("auftrag") },
              { ic: "receipt", label: "Rechnung", run: () => openNeu("rechnung") },
              "sep",
              { ic: "users", label: "Kunde", run: () => openNeu("kunde") },
              { ic: "tool", label: "Handwerker", run: () => openNeu("handwerker") },
              { ic: "building", label: "Partner", run: () => openNeu("partner") }
            ].map((it, i) => it === "sep"
              ? <div key={"s" + i} className="neu-pop-sep"></div>
              : <button key={it.label} className="neu-pop-item" onClick={() => { setNeuVorgangOpen(false); it.run(); }}>
                  <span className="neu-pop-ico"><Icon n={it.ic} size={18} /></span>
                  <span className="neu-pop-txt"><span className="l">{it.label}</span></span>
                </button>
            )}
          </div>
        </div>
      ) : null}

      {/* Löschen-Bestätigung */}
      {confirm ? (
        <Modal open onClose={() => setConfirm(null)} icon="trash" title="Wirklich löschen?" sub={confirm.label}
          footer={<>
            <Btn kind="ghost" onClick={() => setConfirm(null)}>Abbrechen</Btn>
            <div style={{ flex: 1 }}></div>
            <Btn kind="danger" icon="trash" onClick={() => { const fn = confirm.onConfirm; setConfirm(null); fn(); }}>Löschen</Btn>
          </>}>
          <div style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.5 }}>
            {confirm.label} wird dauerhaft entfernt. Dieser Vorgang kann nicht rückgängig gemacht werden.
          </div>
        </Modal>
      ) : null}

      {/* Toast */}
      {toast ? (
        <div style={{
          position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
          background: "var(--green-dark)", color: "white",
          padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          boxShadow: "0 8px 24px -8px rgba(0,0,0,0.25)", zIndex: 300,
          display: "flex", alignItems: "center", gap: 8
        }}>
          <Icon n="check" size={16} />
          {toast}
        </div>
      ) : null}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

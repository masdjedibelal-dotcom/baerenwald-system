/* ============ Shared components ============ */

const { useState, useEffect, useMemo, useRef, Fragment } = React;

/* Icon: uses embedded SVG map (offline) first, falls back to Iconify API */
const __iconCache = new Map();
const __iconSubs = new Set();
function __cleanSvg(svg) {
  return svg
    .replace(/width="[^"]*"/, 'width="100%"')
    .replace(/height="[^"]*"/, 'height="100%"');
}
function __loadIcon(name) {
  if (__iconCache.has(name)) return __iconCache.get(name);
  // Embedded map (works offline)
  if (typeof window !== "undefined" && window.__ICON_SVGS && window.__ICON_SVGS[name]) {
    const cleaned = __cleanSvg(window.__ICON_SVGS[name]);
    __iconCache.set(name, cleaned);
    return cleaned;
  }
  // Fallback: fetch from API
  const promise = fetch(`https://api.iconify.design/tabler/${name}.svg`)
    .then(r => r.ok ? r.text() : "")
    .then(svg => {
      const cleaned = __cleanSvg(svg);
      __iconCache.set(name, cleaned);
      __iconSubs.forEach(fn => fn());
      return cleaned;
    })
    .catch(() => { __iconCache.set(name, ""); return ""; });
  __iconCache.set(name, promise);
  return promise;
}

const Icon = ({ n, size, style, className }) => {
  const [, force] = React.useState(0);
  React.useEffect(() => {
    const fn = () => force(x => x + 1);
    __iconSubs.add(fn);
    if (!__iconCache.has(n)) __loadIcon(n);
    return () => __iconSubs.delete(fn);
  }, [n]);

  // Resolve synchronously during render (embedded map returns a string immediately)
  const cached = __iconCache.has(n) ? __iconCache.get(n) : __loadIcon(n);
  const svg = typeof cached === "string" ? cached : "";
  const dim = size ? (typeof size === "number" ? size + "px" : size) : "1em";
  return (
    <span
      className={"ti ti-" + n + (className ? " " + className : "")}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: dim,
        height: dim,
        verticalAlign: "-0.15em",
        flexShrink: 0,
        lineHeight: 0,
        ...(style || {})
      }}
    />
  );
};

const Badge = ({ kind, children }) => (
  <span className={"badge " + (kind || "plain")}>{children}</span>
);

/* Kontext-Badges: Zustands-Badges (laut, mit Punkt) vs. Kanal-Badges (leise, Quelle-Tag).
   Feste Reihenfolge Notfall → Wartet auf Freigabe → Kanal. Max. 3, danach "+N". */
const CTX_STATE = {
  wartetFreigabe: { label: "Wartet auf Freigabe", cls: "ctx-warten", icon: "clock" }
};
const CTX_KANAL = {
};
function ContextBadges({ notfall, wartetFreigabe, kanal, max = 3 }) {
  const items = [];
  if (wartetFreigabe) items.push({ type: "state", ...CTX_STATE.wartetFreigabe });
  if (kanal && CTX_KANAL[kanal]) items.push({ type: "chan", ...CTX_KANAL[kanal] });
  if (!items.length) return null;
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;
  return (
    <span className="ctx-badges">
      {shown.map((b, i) => (
        <span key={i} className={"ctx-badge " + (b.type === "chan" ? "ctx-chan" : b.cls)}>
          <Icon n={b.icon} size={11} />{b.label}
        </span>
      ))}
      {extra > 0 ? <span className="ctx-badge ctx-more" title={items.slice(max).map(b => b.label).join(", ")}>+{extra}</span> : null}
    </span>
  );
}

/* Org-Kontext-Block für HV-Meldungen: zeigt Auftraggeber (Hausverwaltung), Objekt/Einheit,
   Melder (Mieter) und die Meldung. Löst IDs gegen CUSTOMERS/OBJEKTE auf. navigate optional. */
function HVKontextCard({ ctx, navigate }) {
  if (!ctx) return null;
  const hv = (typeof CUSTOMERS !== "undefined") ? CUSTOMERS.find(c => c.id === ctx.verwaltungId) : null;
  const obj = (typeof OBJEKTE !== "undefined") ? OBJEKTE.find(o => o.id === ctx.objektId) : null;
  const einheit = obj && (obj.einheiten || []).find(e => e.id === ctx.einheitId);
  const go = (screen, id) => { if (navigate) navigate(screen, id); };
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="section-h" style={{ margin: "2px 2px 10px", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <span>HV Meldung</span>
        <span style={{ color: "var(--text-3)", fontWeight: 400, fontSize: 12.5 }}>
          {ctx.ticket ? ctx.ticket : null}{ctx.ticket && ctx.meldungAm ? " · " : ""}{ctx.meldungAm ? "gemeldet " + ctx.meldungAm : null}
        </span>
      </div>
      <div className="hvk-cards">
        <Card title="Auftraggeber (Verwaltung)" icon="briefcase">
          <div className="props">
            <Prop label="Verwaltung">
              {hv ? <button type="button" className="link" onClick={() => go("kunden", hv.id)}>{hv.name}</button> : "—"}
            </Prop>
            {ctx.sachbearbeiter ? <Prop label="Sachbearbeiter">{ctx.sachbearbeiter}</Prop> : null}
            {ctx.sbTel ? <Prop label="Telefon" link><a href={"tel:" + ctx.sbTel.replace(/\s/g, "")}>{ctx.sbTel}</a></Prop> : null}
            {ctx.sbMail ? <Prop label="E-Mail" link><a href={"mailto:" + ctx.sbMail}>{ctx.sbMail}</a></Prop> : null}
          </div>
        </Card>
        <Card title="Objekt / Einheit" icon="building-community">
          <div className="props">
            <Prop label="Objekt">
              {obj ? <button type="button" className="link" onClick={() => go("objekte", obj.id)}>{obj.name}</button> : "—"}
            </Prop>
            {obj ? <Prop label="Adresse">{obj.strasse} · {obj.plz} {obj.ort}</Prop> : null}
            {einheit ? <Prop label="Einheit">{einheit.bezeichnung}{einheit.typ ? " · " + einheit.typ : ""}</Prop> : null}
          </div>
        </Card>
        <Card title="Melder" icon="user">
          <div className="props">
            <Prop label="Name">{ctx.melder ? ctx.melder.name : "—"}</Prop>
            {ctx.melder && ctx.melder.rolle ? <Prop label="Rolle">{ctx.melder.rolle}</Prop> : null}
            {ctx.melder && ctx.melder.tel ? <Prop label="Telefon" link><a href={"tel:" + ctx.melder.tel.replace(/\s/g, "")}>{ctx.melder.tel}</a></Prop> : null}
            {ctx.melder && ctx.melder.mail ? <Prop label="E-Mail" link><a href={"mailto:" + ctx.melder.mail}>{ctx.melder.mail}</a></Prop> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

const Chip = ({ active, count, onClick, children, icon }) => (
  <button className={"chip" + (active ? " active" : "")} onClick={onClick}>
    {icon ? <Icon n={icon} size={14} /> : null}
    {children}
    {count != null ? <span className="chip-count">{count}</span> : null}
  </button>
);

const Btn = ({ kind, sm, icon, onClick, children, title, type, disabled }) => (
  <button
    className={"btn " + (kind || "") + (sm ? " sm" : "") + (icon && !children ? " icon" : "")}
    onClick={onClick}
    title={title}
    type={type || "button"}
    disabled={disabled}
  >
    {icon ? <Icon n={icon} size={sm ? 14 : 15} /> : null}
    {children}
  </button>
);

const SearchInput = ({ value, onChange, placeholder, style }) => (
  <div className="input" style={style}>
    <Icon n="search" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Suchen..."}
    />
  </div>
);

const Avatar = ({ initials, color, size }) => (
  <div className={"avatar " + (size || "") + " " + (color || "")}>
    {initials}
  </div>
);

const Tabs = ({ tabs, value, onChange }) => (
  <div className="tabs">
    {tabs.map((t) => (
      <button
        key={t.id}
        className={"tab" + (value === t.id ? " active" : "")}
        onClick={() => onChange(t.id)}
      >
        {t.icon ? <Icon n={t.icon} size={14} /> : null}
        {t.label}
        {t.count != null ? <span className="tab-count">{t.count}</span> : null}
      </button>
    ))}
  </div>
);

const Metric = ({ label, value, delta, deltaKind, icon, valueClass }) => (
  <div className="metric">
    <div className="label">
      {icon ? <Icon n={icon} size={14} /> : null}
      {label}
    </div>
    <div className={"value " + (valueClass || "")}>{value}</div>
    {delta ? <div className={"delta " + (deltaKind || "")}>{delta}</div> : null}
    {icon ? <Icon n={icon} size={60} className="icon-bg" /> : null}
  </div>
);

const Card = ({ title, icon, actions, children, padded, dense }) => (
  <div className="card">
    {title ? (
      <div className="card-h">
        <div className="title">
          {icon ? <Icon n={icon} size={16} style={{ color: "var(--text-3)" }} /> : null}
          {title}
        </div>
        {actions}
      </div>
    ) : null}
    <div className={"card-b" + (dense ? " tight" : "")}>{children}</div>
  </div>
);

const Prop = ({ label, children, link }) => (
  <div className="prop">
    <div className="prop-l">{label}</div>
    <div className={"prop-v" + (link ? " link" : "")}>{children}</div>
  </div>
);

const Timeline = ({ items }) => (
  <div className="timeline">
    {items.map((it, i) => (
      <div key={i} className={"tl-item " + (it.state === "open" ? "gray" : "")}>
        <div className="tl-text">{it.text}</div>
        <div className="tl-time">{it.time}</div>
      </div>
    ))}
  </div>
);

const Progress = ({ value, warn }) => (
  <div className={"prog" + (warn ? " warn" : "")}>
    <div style={{ width: Math.max(0, Math.min(100, value)) + "%" }}></div>
  </div>
);

const EmptyState = ({ icon, title, hint }) => (
  <div className="empty">
    {icon ? <Icon n={icon} size={28} style={{ color: "var(--text-4)" }} /> : null}
    <div style={{ marginTop: 6, fontWeight: 500, color: "var(--text-2)" }}>{title}</div>
    {hint ? <div style={{ fontSize: 12, marginTop: 2 }}>{hint}</div> : null}
  </div>
);

const Switch = ({ on, onChange }) => (
  <button
    className={"switch" + (on ? " on" : "")}
    onClick={() => onChange(!on)}
    aria-pressed={on}
    style={{ border: "none" }}
  />
);

const formatEUR = (n) =>
  n == null ? "—" : n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/* DE-Format: 2026-06-30 → 30.06.2026, behält andere Strings unverändert */
const formatDate = (iso) => {
  if (!iso) return "—";
  if (typeof iso !== "string") return String(iso);
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  return iso;
};

/* ============ Dropdown menu ============ */
function Menu({ trigger, items, align }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="menu-wrap" ref={ref}>
      <span onClick={() => setOpen(!open)}>{trigger}</span>
      {open ? (
        <div className="menu" style={align === "left" ? { right: "auto", left: 0 } : null}>
          {items.map((it, i) => {
            if (it === "sep") return <div key={"sep" + i} className="menu-sep"></div>;
            return (
              <button
                key={it.label}
                type="button"
                className={"menu-item" + (it.danger ? " danger" : "")}
                onClick={() => { setOpen(false); it.onClick && it.onClick(); }}
              >
                {it.emoji ? <span className="tag-emoji">{it.emoji}</span>
                  : it.icon ? <Icon n={it.icon} size={15} /> : <span style={{ width: 18 }}></span>}
                <span>{it.label}</span>
                {it.hint ? <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-3)" }}>{it.hint}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* ============ Compact modal ============ */
function Modal({ open, onClose, icon, title, sub, children, footer }) {
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target.classList.contains("modal-overlay")) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-h">
          {icon ? <div className="icon"><Icon n={icon} size={16} /></div> : null}
          <div style={{ flex: 1 }}>
            <div className="title">{title}</div>
            {sub ? <div className="sub">{sub}</div> : null}
          </div>
          <Btn icon="x" kind="ghost" sm onClick={onClose} />
        </div>
        <div className="modal-b">{children}</div>
        <div className="modal-f">{footer}</div>
      </div>
    </div>
  );
}

/* ============ Popover — anchored quick overlay ============ */
function Popover({ open, onClose, anchorRef, children, align, width }) {
  const ref = React.useRef(null);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  React.useEffect(() => {
    if (!open || !anchorRef || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const w = width || 240;
    let left = align === "right" ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    let top = r.bottom + 6;
    if (top + 260 > window.innerHeight) top = Math.max(8, r.top - 6 - 260);
    setPos({ top, left, width: w });
  }, [open]);
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target) && anchorRef.current && !anchorRef.current.contains(e.target)) onClose();
    };
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    window.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", handler); window.removeEventListener("keydown", esc); };
  }, [open]);
  if (!open) return null;
  return (
    <div ref={ref} className="popover" style={{ top: pos.top, left: pos.left, width: pos.width }} onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  );
}

/* ============ Suche — Popover (nur Ergebnisse + letzte Suchen) ============ */
function CommandPalette({ open, onClose, search, recent, addRecent }) {
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState(0);
  const inputRef = React.useRef(null);
  React.useEffect(() => { if (open) { setQ(""); setSel(0); setTimeout(() => inputRef.current && inputRef.current.focus(), 30); } }, [open]);
  const hits = q.trim() ? (search ? search(q) : []) : [];
  React.useEffect(() => { setSel(0); }, [q]);
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === "Escape") { onClose(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(s + 1, hits.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
      else if (e.key === "Enter") { e.preventDefault(); const c = hits[sel]; if (c) { addRecent && addRecent(q); onClose(); c.run(); } }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, hits, sel, q]);
  if (!open) return null;
  return (
    <div className="cmdk-overlay cmdk-pop" onClick={(e) => { if (e.target.classList.contains("cmdk-overlay")) onClose(); }}>
      <div className="cmdk" role="dialog" aria-modal="true">
        <div className="cmdk-input">
          <Icon n="search" size={18} style={{ color: "var(--text-3)" }} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
                 placeholder="Suche nach Kundenname, Titel, Nummer, Ort…" />
          <kbd>ESC</kbd>
        </div>
        <div className="cmdk-list">
          {q.trim() ? (
            hits.length === 0
              ? <div className="cmdk-empty">Keine Treffer für „{q}"</div>
              : hits.map((c, i) => (
                  <button key={c.id} className={"cmdk-item" + (i === sel ? " sel" : "")} onMouseEnter={() => setSel(i)}
                          onClick={() => { addRecent && addRecent(q); onClose(); c.run(); }}>
                    <Icon n={c.icon || "arrow-right"} size={16} />
                    <span style={{ flex: 1 }}>{c.label}</span>
                    {c.sub ? <span className="hint">{c.sub}</span> : null}
                  </button>
                ))
          ) : (
            (recent && recent.length) ? (
              <>
                <div className="cmdk-group">Letzte Suchen</div>
                {recent.map((r, i) => (
                  <button key={i} className="cmdk-item" onClick={() => { setQ(r); setTimeout(() => inputRef.current && inputRef.current.focus(), 0); }}>
                    <Icon n="history" size={16} style={{ color: "var(--text-3)" }} />
                    <span style={{ flex: 1 }}>{r}</span>
                  </button>
                ))}
              </>
            ) : <div className="cmdk-empty">Tippe, um zu suchen</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ DetailShell — Section-Nav links (Desktop/Tablet), gestapelt (Mobil) ============ */
function DetailShell({ groups, defaultGroup }) {
  const [g, setG] = React.useState(defaultGroup || (groups[0] && groups[0].id));
  return (
    <div className="dshell">
      <nav className="dshell-nav">
        {groups.map(gr => (
          <button key={gr.id} className={"dshell-navitem" + (g === gr.id ? " active" : "")} onClick={() => setG(gr.id)}>
            <Icon n={gr.icon} size={16} />
            <span>{gr.label}</span>
            {gr.count != null ? <span className="dshell-count">{gr.count}</span> : null}
          </button>
        ))}
      </nav>
      <div className="dshell-body">
        {groups.map(gr => (
          <div key={gr.id} className={"dshell-group" + (g === gr.id ? " active" : "")}>
            <div className="dshell-group-h"><Icon n={gr.icon} size={15} />{gr.label}</div>
            <div className="dshell-cards">{gr.render()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ Paginierung ============ */
function usePager(total, perPage) {
  const per = perPage || 10;
  const [page, setPage] = React.useState(1);
  const pages = Math.max(1, Math.ceil(total / per));
  React.useEffect(() => { if (page > pages) setPage(pages); }, [total, pages]);
  const cur = Math.min(page, pages);
  const start = (cur - 1) * per;
  const slice = (arr) => arr.slice(start, start + per);
  return { page: cur, pages, setPage, per, start, slice, total };
}
function Pager({ page, pages, setPage, total, per, start, unit }) {
  if (total === 0) return null;
  const from = start + 1, to = Math.min(start + per, total);
  const nums = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  return (
    <div className="pager">
      <span className="pager-info">{from}–{to} von {total}{unit ? " " + unit : ""}</span>
      <div className="pager-btns">
        <button className="pager-btn" disabled={page <= 1} onClick={() => setPage(page - 1)} title="Zurück"><Icon n="chevron-left" size={16} /></button>
        {nums.map((n, i) => n === "…"
          ? <span key={"e" + i} className="pager-ell">…</span>
          : <button key={n} className={"pager-btn" + (n === page ? " active" : "")} onClick={() => setPage(n)}>{n}</button>
        )}
        <button className="pager-btn" disabled={page >= pages} onClick={() => setPage(page + 1)} title="Weiter"><Icon n="chevron-right" size={16} /></button>
      </div>
    </div>
  );
}

/* ============ Sortierbare Spaltenköpfe ============ */
function useSort() {
  const [sort, setSort] = React.useState({ col: null, dir: 1 });
  const toggle = (col) => setSort(s => s.col === col ? { col, dir: -s.dir } : { col, dir: 1 });
  const apply = (arr, keyMap) => {
    if (!sort.col || !keyMap[sort.col]) return arr;
    const fn = keyMap[sort.col];
    return [...arr].sort((a, b) => {
      const av = fn(a), bv = fn(b);
      if (av < bv) return -1 * sort.dir;
      if (av > bv) return 1 * sort.dir;
      return 0;
    });
  };
  return { sort, toggle, apply };
}
function SortHead({ col, sort, onSort, right, children }) {
  return (
    <div onClick={() => onSort(col)}
         style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4, justifyContent: right ? "flex-end" : "flex-start", userSelect: "none" }}>
      {children}
      <Icon n={sort.col === col ? (sort.dir === 1 ? "arrow-up" : "arrow-down") : "arrows-sort"} size={12}
            style={{ opacity: sort.col === col ? 1 : 0.35 }} />
    </div>
  );
}

/* Zentrale, typ-übergreifende Zeilen-/Header-Aktionen */
function entityActions(entity, opts) {
  const o = opts || {};
  const items = [];
  if (o.onOpen) items.push({ icon: "eye", label: "Öffnen", onClick: o.onOpen });
  if (o.onEdit) items.push({ icon: "pencil", label: "Bearbeiten", onClick: o.onEdit });
  (o.context || []).forEach(c => items.push(c));
  if (entity && entity.mail) {
    items.push("sep");
    items.push({ icon: "mail", label: "Mail schreiben", onClick: () => window.open("mailto:" + entity.mail) });
  }
  items.push("sep");
  const del = o.onDelete || (() => {});
  const label = o.deleteLabel || (entity && (entity.name || entity.titel || entity.title)) || "Eintrag";
  items.push({ icon: "trash", label: "Löschen", danger: true, onClick: () => {
    if (typeof window !== "undefined" && window.__confirmDelete) window.__confirmDelete(label, del);
    else del();
  } });
  return items;
}

/* ============ entityMenu — EINE Quelle für alle ⋯-Menüs (Liste + Detail) ============
   Damit Zeilen-Aktionen in der Liste identisch sind zu denen im Detail.
   type: "anfrage"|"angebot"|"auftrag"|"rechnung"|"kunde"|"handwerker"|"partner"
   h: Handler-Bag — nur mitgeben, was zutrifft. Status-/Typ-Aktionen erscheinen,
   sobald ihr Handler vorhanden ist. Kontakt (Anrufen/Mail) + Löschen sind universell. */
function __dedupeSeps(items) {
  const out = [];
  items.forEach(it => {
    if (it === "sep") {
      if (out.length === 0 || out[out.length - 1] === "sep") return;
    }
    out.push(it);
  });
  while (out.length && out[out.length - 1] === "sep") out.pop();
  return out;
}
function entityMenu(type, entity, h) {
  h = h || {};
  const e = entity || {};
  const st = e.statusKey || (typeof e.status === "string" ? e.status : null);
  const tel = h.tel || e.tel || (e.customer && e.customer.tel);
  const mail = h.mail || e.mail || (e.customer && e.customer.mail);
  const A = [];

  if (h.onEdit) A.push({ icon: "pencil", label: "Bearbeiten", onClick: h.onEdit });
  if (h.onCopy) A.push({ icon: "copy", label: "Kopieren", onClick: h.onCopy });
  if (h.onPortal) {
    A.push("sep");
    A.push({ icon: "external-link", label: "Admin Login", onClick: h.onPortal });
    const linkLabel = type === "handwerker" ? "Handwerker-Link versenden"
      : type === "partner" ? "Partner-Link versenden"
      : "Kundenportal-Link versenden";
    A.push({ icon: "send", label: linkLabel, onClick: () => {
      if (h.onPortalLink) h.onPortalLink();
      else if (typeof window !== "undefined" && window.__toast) window.__toast(linkLabel.replace(" versenden", " versendet"));
    } });
  }

  /* --- Status-Änderungen (Anfrage) --- */
  if (type === "anfrage" && h.onStatus) {
    A.push("sep");
    A.push({ icon: "calendar-event", label: "Termin vereinbart", onClick: () => h.onStatus("termin") });
    A.push({ icon: "help", label: "Rückfrage", onClick: () => h.onStatus("rueckfrage") });
    A.push({ icon: "phone-off", label: "Nicht erreichbar", onClick: () => h.onStatus("nicht_erreichbar") });
    A.push({ icon: "circle-x", label: "Als verloren markieren", onClick: () => h.onStatus("verloren") });
  }
  if (type === "anfrage" && h.onAngebot) { A.push("sep"); A.push({ icon: "file-invoice", label: "Angebot erstellen", onClick: h.onAngebot }); }

  /* --- Angebot (statusabhängig) --- */
  if (type === "angebot") {
    const versendet = st === "gesendet_kunde";      // beim Kunden → annehmbar
    const erledigt  = st === "kunde_akzeptiert" || st === "abgelehnt";
    const jeVersendet = st && st !== "entwurf";       // schon mind. einmal raus
    const before = A.length;
    A.push("sep");
    if (h.onAccept && versendet) A.push({ icon: "check", label: "Angebot annehmen", onClick: h.onAccept });
    if (h.onPdf) A.push({ icon: "download", label: "Angebot PDF herunterladen", onClick: h.onPdf });
    if (h.onSend && !erledigt) A.push({ icon: "send", label: jeVersendet ? "Angebot nochmal versenden" : "Angebot versenden", onClick: h.onSend });
    if (A.length === before + 1) A.pop(); // nur Separator → wieder entfernen
  }

  /* --- Auftrag (statusabhängig) --- */
  if (type === "auftrag") {
    const laufend  = st === "aktiv" || st === "auftrag";
    const abschluss = st === "fertig" || st === "abnahme"; // abgeschlossen → Rechnung
    const before = A.length;
    A.push("sep");
    if (h.onEditAngebot && !abschluss) A.push({ icon: "file-pencil", label: "Angebot korrigieren", onClick: h.onEditAngebot });
    if (h.onComplete && laufend) A.push({ icon: "checks", label: "Auftrag abschließen", onClick: h.onComplete });
    if (h.onInvoice && (abschluss || laufend)) A.push({ icon: "file-invoice", label: "Rechnung erstellen", onClick: h.onInvoice });
    if (A.length === before + 1) A.pop();
  }

  /* --- Rechnung (statusabhängig) --- */
  if (type === "rechnung") {
    const offen = st === "versendet" || st === "ueberfaellig";
    const jeVersendet = st && st !== "entwurf";
    const erledigt = st === "bezahlt" || st === "storniert";
    const before = A.length;
    A.push("sep");
    if (h.onEdit2 && !erledigt) A.push({ icon: "file-pencil", label: "Rechnung korrigieren", onClick: h.onEdit2 });
    if (h.onMarkPaid && offen) A.push({ icon: "check", label: "Als bezahlt markieren", onClick: h.onMarkPaid });
    if (h.onPdf) A.push({ icon: "download", label: "Rechnung herunterladen", onClick: h.onPdf });
    if (h.onSend && !erledigt) A.push({ icon: "send", label: jeVersendet ? "Rechnung nochmal versenden" : "Rechnung versenden", onClick: h.onSend });
    if (h.onToAuftrag) A.push({ icon: "briefcase", label: "Zum Auftrag", onClick: h.onToAuftrag });
    if (A.length === before + 1) A.pop();
  }

  /* --- Kunde / Handwerker / Partner: eigene Zusatzaktionen --- */
  (h.extra || []).forEach(c => A.push(c));

  /* --- Kontakt (universell, überall gleich) --- */
  if (tel || mail) A.push("sep");
  if (tel) A.push({ icon: "phone", label: "Anrufen", onClick: () => window.open("tel:" + String(tel).replace(/\D/g, "")) });
  if (mail) A.push({ icon: "mail", label: "Mail schreiben", onClick: () => window.open("mailto:" + mail) });

  /* --- Löschen (universell) --- */
  if (h.onDelete) {
    A.push("sep");
    const label = h.deleteLabel || e.name || e.titel || e.title || (e.customer && e.customer.name) || "Eintrag";
    A.push({ icon: "trash", label: "Löschen", danger: true, onClick: () => {
      if (typeof window !== "undefined" && window.__confirmDelete) window.__confirmDelete(label, h.onDelete);
      else h.onDelete();
    } });
  }
  return __dedupeSeps(A);
}

/* Projekt-Übersicht — einheitliche Projektdetails-Card (überall in „Details" oben).
   Nimmt einen Lead (Anfrage) und zeigt die Eckdaten des Projekts als Prop-Liste. */
function ProjektUebersicht({ lead, extra }) {
  if (!lead) return null;
  return (
    <Card title="Projekt-Übersicht" icon="clipboard-list">
      <div className="props">
        <Prop label="Projekt">{lead.project}</Prop>
        {lead.note ? <Prop label="Beschreibung">{lead.note}</Prop> : null}
        <Prop label="Region">{lead.area}{lead.plz ? " · " + lead.plz : ""}</Prop>
        <Prop label="Preisrahmen"><span style={{ color: "var(--green)", fontWeight: 600 }}>{formatEUR(lead.budgetLo)} – {formatEUR(lead.budgetHi)}</span></Prop>
        <Prop label="Quelle">{lead.source}</Prop>
        {(extra || []).map((e, i) => <Prop key={i} label={e.label}>{e.value}</Prop>)}
      </div>
    </Card>
  );
}

/* Einheitliche Positions-/Leistungs-Tabelle (Gewerk-gruppiert) — für Anfrage/Angebot/Auftrag.
   groups: [{ id, gewerk, titel, items: [{ id, name, beschreibung, mengeLabel, preisLabel }] }]
   onGroupAction(group) / onItemAction(group, item) liefern entityActions-Items. */
function PosTable({ groups, onAddItem, onAddGroup, groupActions, itemActions, selectable, selected, onToggleItem, onToggleGroup, dnd, onReorder, onDropToGroup, showTotals, netto, ust, brutto }) {
  const sel = selected || {};
  const [dragId, setDragId] = React.useState(null);
  const [overId, setOverId] = React.useState(null);
  const dragRef = React.useRef(null);
  const box = (on) => (
    <span style={{ width: 17, height: 17, flexShrink: 0, borderRadius: 4, border: "1.5px solid " + (on ? "var(--green)" : "var(--border-strong)"), background: on ? "var(--green)" : "transparent", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}>
      {on ? <Icon n="check" size={11} /> : null}
    </span>
  );
  return (
    <div className="postable2">
      {(groups || []).map(g => {
        const items = g.items || [];
        const allSel = selectable && items.length > 0 && items.every(it => sel[it.id]);
        return (
          <React.Fragment key={g.id}>
            <div className="pt2-sub"
              onDragOver={dnd ? (e) => e.preventDefault() : undefined}
              onDrop={dnd ? (e) => { e.preventDefault(); const d = dragRef.current; if (d && onDropToGroup) onDropToGroup(d, g.gewerk); dragRef.current = null; setDragId(null); setOverId(null); } : undefined}>
              {selectable ? <span onClick={() => onToggleGroup && onToggleGroup(items, allSel)} title="Gewerk auswählen" style={{ display: "inline-flex" }}>{box(allSel)}</span> : null}
              <span className="g">{g.gewerk || "Ohne Gewerk"}</span>
              {g.titel ? <span className="gt">· {g.titel}</span> : null}
              <div style={{ flex: 1 }}></div>
              {groupActions ? <Menu align="right" trigger={<button className="qa-btn" title="Aktionen"><Icon n="dots" size={16} /></button>} items={groupActions(g)} /> : null}
            </div>
            {items.length === 0 ? <div style={{ padding: "12px 14px", fontSize: 12.5, color: "var(--text-4)", borderBottom: "0.5px solid var(--border)" }}>Keine Positionen</div> : null}
            {items.map(it => {
              const isOver = dnd && overId === it.id && dragId && dragId !== it.id;
              return (
                <div key={it.id} className={"pt2-row" + (sel[it.id] ? " sel" : "")}
                  draggable={dnd || undefined}
                  onDragStart={dnd ? (e) => { dragRef.current = it.id; setDragId(it.id); e.dataTransfer.effectAllowed = "move"; } : undefined}
                  onDragOver={dnd ? (e) => { e.preventDefault(); if (overId !== it.id) setOverId(it.id); } : undefined}
                  onDragEnd={dnd ? () => { dragRef.current = null; setDragId(null); setOverId(null); } : undefined}
                  onDrop={dnd ? (e) => { e.preventDefault(); const d = dragRef.current; if (d && d !== it.id && onReorder) onReorder(d, it.id); dragRef.current = null; setDragId(null); setOverId(null); } : undefined}
                  style={{ boxShadow: isOver ? "inset 0 2px 0 var(--green)" : "none", opacity: dragId === it.id ? 0.4 : 1 }}>
                  <div className="pt2-ctrl">
                    {dnd ? <span className="drag" title="Ziehen zum Sortieren"><Icon n="grip-vertical" size={15} /></span> : null}
                    {selectable ? <span onClick={() => onToggleItem && onToggleItem(it.id)} style={{ display: "inline-flex" }}>{box(!!sel[it.id])}</span> : null}
                  </div>
                  <div className="pt2-main">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className="pt-name">{it.name}</span>
                      {it.badge ? <Badge kind={it.badge.kind}>{it.badge.icon ? <Icon n={it.badge.icon} size={10} /> : null}{it.badge.label}</Badge> : null}
                    </div>
                    {it.beschreibung ? <div className="pt-desc">{it.beschreibung}</div> : null}
                  </div>
                  <div className="pt2-menge">{it.mengeLabel || ""}</div>
                  <div className="pt2-preis">{it.preisLabel || ""}</div>
                  <div className="pt2-act">
                    {itemActions ? <Menu align="right" trigger={<button className="qa-btn" title="Aktionen"><Icon n="dots" size={15} /></button>} items={itemActions(g, it)} /> : null}
                  </div>
                </div>
              );
            })}
            {onAddItem ? (
              <button type="button" className="pt-add" onClick={() => onAddItem(g)} style={{ borderBottom: "0.5px solid var(--border)" }}>
                <Icon n="plus" size={13} /> Position hinzufügen
              </button>
            ) : null}
          </React.Fragment>
        );
      })}
      {onAddGroup ? (
        <button type="button" className="pt-add" onClick={onAddGroup} style={{ color: "var(--green)", fontWeight: 600, borderBottom: showTotals ? "0.5px solid var(--border)" : "none" }}>
          <Icon n="plus" size={14} /> Gewerk hinzufügen
        </button>
      ) : null}
      {showTotals ? (
        <div className="pt2-foot">
          <div className="r"><span>Netto</span><b>{formatEUR(netto)}</b></div>
          <div className="r"><span>MwSt 19%</span><b>{formatEUR(ust)}</b></div>
          <div className="r grand"><span>Brutto</span><b>{formatEUR(brutto)}</b></div>
        </div>
      ) : null}
    </div>
  );
}

/* ============ Einheitliche Gesamt-Darstellung — überall gleich ============ */
function PosTotals({ netto, ust, brutto, showUst }) {
  const su = showUst !== false;
  const row = { display: "flex", justifyContent: "space-between", fontSize: 13 };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginLeft: "auto", maxWidth: 300, marginTop: 12, padding: "12px 14px", background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 10, boxShadow: "var(--shadow)" }}>
      {su ? (
        <>
          <div style={row}><span style={{ color: "var(--text-3)" }}>Netto</span><b style={{ fontVariantNumeric: "tabular-nums" }}>{formatEUR(netto)}</b></div>
          <div style={row}><span style={{ color: "var(--text-3)" }}>MwSt 19%</span><b style={{ fontVariantNumeric: "tabular-nums" }}>{formatEUR(ust)}</b></div>
        </>
      ) : null}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, paddingTop: su ? 6 : 0, borderTop: su ? "0.5px solid var(--border)" : "none" }}>
        <span style={{ fontWeight: 600 }}>{su ? "Brutto" : "Gesamt"}</span>
        <b style={{ color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{formatEUR(brutto)}</b>
      </div>
    </div>
  );
}

/* Position-Editor — Modal für Hinzufügen/Bearbeiten (Gewerk · Bezeichnung · Beschreibung · Menge · Preis · USt) */
function PositionModal({ position, onChange, onClose, onRemove, showUst }) {
  const p = position || {};
  const gewerke = (typeof PREISLISTE !== "undefined") ? Object.keys(PREISLISTE) : [];
  const presetList = ((typeof PREISLISTE !== "undefined") && PREISLISTE[p.gewerk]) ? PREISLISTE[p.gewerk] : [];
  const applyPreset = (name) => {
    const item = presetList.find(x => x.name === name);
    if (!item) { onChange({ name }); return; }
    onChange({ name, einheit: item.unit, menge: item.unit === "m²" ? 20 : 1, preis: Math.round((item.min + item.max) / 2) });
  };
  const line = (Number(p.menge) || 0) * (Number(p.preis) || 0);
  return (
    <Modal open onClose={onClose} icon="list-numbers" title={p.name || "Neue Position"} sub="Position bearbeiten"
      footer={<><Btn sm kind="danger" icon="trash" onClick={() => { onRemove && onRemove(); onClose(); }}>Entfernen</Btn><div style={{ flex: 1 }}></div><Btn sm kind="primary" icon="check" onClick={onClose}>Fertig</Btn></>}>
      <div className="form-grid">
        <Field label="Gewerk">
          <Sel value={p.gewerk || ""} onChange={(g) => onChange({ gewerk: g })} placeholder="Gewerk wählen..." options={["", ...gewerke, "Allgemein"]} />
        </Field>
        {presetList.length ? (
          <Field label="Aus Preisliste" hint="optional">
            <Sel value="" onChange={applyPreset} placeholder="Vorlage wählen..." options={presetList.map(x => x.name)} />
          </Field>
        ) : <div></div>}
        <Field label="Bezeichnung" full required>
          <Txt value={p.name} onChange={(v) => onChange({ name: v })} placeholder="z.B. Wandfliesen verlegen" autoFocus={!p.name} />
        </Field>
        <Field label="Beschreibung" full hint="Erscheint beim Kunden">
          <TA value={p.beschreibung || ""} onChange={(v) => onChange({ beschreibung: v })} rows={2} placeholder="Details zur Leistung..." />
        </Field>
        <Field label="Menge">
          <div style={{ display: "flex", gap: 4 }}>
            <input className="txt" type="number" step="0.5" value={p.menge} onChange={(e) => onChange({ menge: e.target.value === "" ? "" : Number(e.target.value) })} style={{ flex: 1 }} />
            <select className="sel" value={p.einheit} onChange={(e) => onChange({ einheit: e.target.value })} style={{ width: 100 }}>{(typeof EINHEITEN !== "undefined" ? EINHEITEN : ["Stück"]).map(u => <option key={u}>{u}</option>)}</select>
          </div>
        </Field>
        <Field label="Einzelpreis (netto)">
          <div className="txt-prefix"><span className="prefix">€</span><input className="txt" type="number" value={p.preis} onChange={(e) => onChange({ preis: Number(e.target.value) || 0 })} /></div>
        </Field>
        {showUst !== false ? (
          <Field label="USt.">
            <Sel value={String(p.ust != null ? p.ust : 19)} onChange={(v) => onChange({ ust: Number(v) })} options={[{ value: "19", label: "19%" }, { value: "7", label: "7%" }, { value: "0", label: "0%" }]} />
          </Field>
        ) : <div></div>}
        <Field label="Zeilensumme"><div style={{ fontSize: 15, fontWeight: 600, color: "var(--green)" }}>{formatEUR(line)}</div></Field>
      </div>
    </Modal>
  );
}

/* PosBoard — DIE einheitliche Positions-Verwaltung: Gewerk-gruppierte Liste (PosTable) +
   Modal-Editor + Gesamt (PosTotals). Wird in beiden Wizards genutzt und spiegelt die Detail-Ansicht. */
function PosBoard({ positionen, onChange, showUst, title, renderEditor, lineOf, preisLabelOf, mengeLabelOf, badgeOf, makeNew, itemExtraActions, groupExtraActions, selectable, bulkActions }) {
  const [editId, setEditId] = React.useState(null);
  const [gEdit, setGEdit] = React.useState(null);
  const [gName, setGName] = React.useState("");
  const [sel, setSel] = React.useState({});
  const gewerkOf = (p) => p.gewerk || "Allgemein";
  const _line = lineOf || ((p) => (Number(p.menge) || 0) * (Number(p.preis) || 0));
  const update = (id, patch) => onChange(positionen.map(p => p.id === id ? { ...p, ...patch } : p));
  const remove = (id) => { onChange(positionen.filter(p => p.id !== id)); if (editId === id) setEditId(null); setSel(s => { const n = { ...s }; delete n[id]; return n; }); };
  const dup = (id) => {
    const i = positionen.findIndex(p => p.id === id); if (i < 0) return;
    const src = positionen[i];
    const copy = { ...src, id: "p-" + Date.now(), name: (src.name || "Position") + " (Kopie)" };
    const arr = [...positionen]; arr.splice(i + 1, 0, copy); onChange(arr);
  };
  const add = (gewerk) => {
    const id = "p-" + Date.now();
    const np = makeNew ? { ...makeNew(gewerk), id } : { id, gewerk: gewerk || "", name: "", beschreibung: "", menge: 1, einheit: "Stück", preis: 0, ust: 19 };
    onChange([...positionen, np]);
    setEditId(id);
  };
  const addGewerk = () => {
    const names = new Set(positionen.map(gewerkOf));
    let n = 1, name = "Neues Gewerk";
    while (names.has(name)) name = "Neues Gewerk " + (++n);
    add(name);
  };
  const renameGewerk = (from, to) => onChange(positionen.map(p => gewerkOf(p) === from ? { ...p, gewerk: to } : p));
  const copyGewerk = (gewerk) => {
    const src = positionen.filter(p => gewerkOf(p) === gewerk);
    const copies = src.map((p, i) => ({ ...p, id: "p-" + Date.now() + "-" + i, gewerk: gewerk + " (Kopie)" }));
    onChange([...positionen, ...copies]);
  };
  const deleteGewerk = (gewerk) => onChange(positionen.filter(p => gewerkOf(p) !== gewerk));

  const reorder = (draggedId, targetId) => {
    if (draggedId === targetId) return;
    const from = positionen.findIndex(p => p.id === draggedId);
    const targetPos = positionen.find(p => p.id === targetId);
    if (from < 0 || !targetPos) return;
    const moved = { ...positionen[from], gewerk: gewerkOf(targetPos) };
    const arr = positionen.filter(p => p.id !== draggedId);
    const to = arr.findIndex(p => p.id === targetId);
    arr.splice(to < 0 ? arr.length : to, 0, moved);
    onChange(arr);
  };
  const dropToGroup = (draggedId, gewerk) => {
    const from = positionen.findIndex(p => p.id === draggedId);
    if (from < 0) return;
    const moved = { ...positionen[from], gewerk };
    const arr = positionen.filter(p => p.id !== draggedId);
    let lastIdx = -1;
    arr.forEach((p, i) => { if (gewerkOf(p) === gewerk) lastIdx = i; });
    arr.splice(lastIdx + 1, 0, moved);
    onChange(arr);
  };

  const netto = positionen.reduce((s, p) => s + _line(p), 0);
  const ust = positionen.reduce((s, p) => s + _line(p) * (p.ust != null ? Number(p.ust) : 19) / 100, 0);
  const brutto = netto + ust;

  const map = new Map();
  positionen.forEach(p => { const g = gewerkOf(p); if (!map.has(g)) map.set(g, []); map.get(g).push(p); });
  const groups = [...map.entries()].map(([gewerk, arr], gi) => ({
    id: "g" + gi, gewerk,
    items: arr.map(p => ({
      id: p.id,
      name: (p.name != null && p.name !== "" ? p.name : p.beschreibung) || "(ohne Bezeichnung)",
      beschreibung: (p.name != null && p.name !== "") ? p.beschreibung : "",
      mengeLabel: mengeLabelOf ? mengeLabelOf(p) : ((p.menge != null ? p.menge + " " : "") + (p.einheit || "")),
      preisLabel: preisLabelOf ? preisLabelOf(p) : formatEUR(_line(p)),
      badge: badgeOf ? badgeOf(p) : null
    }))
  }));
  const itemActions = (g, it) => [
    { icon: "pencil", label: "Bearbeiten", onClick: () => setEditId(it.id) },
    { icon: "copy", label: "Kopieren", onClick: () => dup(it.id) },
    ...((itemExtraActions && itemExtraActions(g, it)) || []),
    "sep",
    { icon: "trash", label: "Löschen", danger: true, onClick: () => remove(it.id) }
  ];
  const groupActions = (g) => [
    { icon: "plus", label: "Position hinzufügen", onClick: () => add(g.gewerk) },
    { icon: "pencil", label: "Gewerk bearbeiten", onClick: () => { setGEdit(g.gewerk); setGName(g.gewerk); } },
    { icon: "copy", label: "Gewerk kopieren", onClick: () => copyGewerk(g.gewerk) },
    ...((groupExtraActions && groupExtraActions(g)) || []),
    "sep",
    { icon: "trash", label: "Gewerk löschen", danger: true, onClick: () => deleteGewerk(g.gewerk) }
  ];

  const toggleItem = (id) => setSel(s => ({ ...s, [id]: !s[id] }));
  const toggleGroup = (items, allSel) => setSel(s => { const n = { ...s }; items.forEach(it => { if (allSel) delete n[it.id]; else n[it.id] = true; }); return n; });
  const selectedIds = Object.keys(sel).filter(k => sel[k]);
  const selectedPositions = positionen.filter(p => sel[p.id]);
  const clearSel = () => setSel({});

  const editP = positionen.find(p => p.id === editId);
  const helpers = editP ? { onChange: (patch) => update(editP.id, patch), onClose: () => setEditId(null), onRemove: () => remove(editP.id) } : null;

  return (
    <>
      {title ? (
        <div className="section-h" style={{ margin: "2px 2px 10px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span>{title}</span>
          <span style={{ color: "var(--text-3)", fontWeight: 400, fontSize: 12.5 }}>{positionen.length} {positionen.length === 1 ? "Position" : "Positionen"}</span>
        </div>
      ) : null}
      {selectable && selectedIds.length > 0 ? (
        <div style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 10, background: "var(--green-dark)", color: "#fff", borderRadius: 10, boxShadow: "var(--shadow-pop)" }}>
          <Icon n="checks" size={16} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>{selectedIds.length} ausgewählt</span>
          <div style={{ flex: 1 }}></div>
          {(bulkActions ? bulkActions(selectedPositions, clearSel) : []).map((a, i) => (
            <button key={i} type="button" onClick={a.onClick} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.16)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              {a.icon ? <Icon n={a.icon} size={15} /> : null}{a.label}
            </button>
          ))}
          <button type="button" onClick={clearSel} title="Auswahl aufheben" style={{ display: "inline-flex", padding: 6, borderRadius: 8, border: "none", background: "transparent", color: "rgba(255,255,255,0.8)", cursor: "pointer" }}><Icon n="x" size={16} /></button>
        </div>
      ) : null}
      <PosTable groups={groups} onAddItem={(g) => add(g.gewerk)} onAddGroup={addGewerk} groupActions={groupActions} itemActions={itemActions}
        selectable={selectable} selected={sel} onToggleItem={toggleItem} onToggleGroup={toggleGroup}
        dnd={true} onReorder={reorder} onDropToGroup={dropToGroup}
        showTotals={true} netto={netto} ust={ust} brutto={brutto} />
      {editP ? (renderEditor
        ? renderEditor(editP, helpers)
        : <PositionModal position={editP} onChange={helpers.onChange} onClose={helpers.onClose} onRemove={helpers.onRemove} showUst={showUst} />) : null}
      {gEdit != null ? (
        <Modal open onClose={() => setGEdit(null)} icon="folder" title="Gewerk bearbeiten" sub={gEdit}
          footer={<><div style={{ flex: 1 }}></div><Btn sm kind="primary" icon="check" onClick={() => { if (gName.trim() && gName.trim() !== gEdit) renameGewerk(gEdit, gName.trim()); setGEdit(null); }}>Speichern</Btn></>}>
          <Field label="Gewerk-Bezeichnung">
            <input className="txt" value={gName} onChange={e => setGName(e.target.value)} placeholder="z.B. Sanitär · Heizung" autoFocus />
          </Field>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8 }}>Benennt das Gewerk für alle Positionen dieser Gruppe um.</div>
        </Modal>
      ) : null}
    </>
  );
}

/* ============ Einheitliche Detail-Gruppen — überall identisch ============ */
/* Verlauf */
function VerlaufCard({ items }) {
  return (
    <Card title="Verlauf" icon="history">
      {(items && items.length) ? <Timeline items={items} /> : <EmptyState icon="history" title="Kein Verlauf" hint="Aktivitäten erscheinen hier" />}
    </Card>
  );
}

/* Notizen — datierte Notizen, überall gleich */
function NotizenCard({ seed }) {
  const [notes, setNotes] = React.useState(() => seed || []);
  const [val, setVal] = React.useState("");
  const add = () => {
    if (!val.trim()) return;
    setNotes([{ autor: "Beran", time: "gerade eben", text: val.trim() }, ...notes]);
    setVal("");
  };
  return (
    <Card title={"Notizen · " + notes.length} icon="messages">
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: notes.length ? 14 : 0 }}>
        {notes.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--text-4)", padding: "4px 0" }}>Noch keine Notizen — schreibe die erste unten.</div>
        ) : notes.map((n, i) => (
          <div key={i} className="note" style={n.kind ? { background: "var(--" + n.kind + "-bg)" } : null}>
            <div className="meta">{n.autor || n.meta || ""}{n.time ? " · " + n.time : ""}</div>
            {n.text}
          </div>
        ))}
      </div>
      <div className="note-composer">
        <textarea rows={1} value={val}
          onChange={(e) => { setVal(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"; }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); add(); } }}
          placeholder="Notiz schreiben…  (Enter senden · Shift+Enter neue Zeile)" />
        <button type="button" className="note-send" disabled={!val.trim()} onClick={add} title="Notiz speichern"><Icon n="send" size={16} /></button>
      </div>
    </Card>
  );
}

/* Bautagebuch — Einträge (Titel · Beschreibung · Fotos), Liste/Cards, Einzel- + Multiauswahl,
   Aktionen: Bearbeiten · Kopieren · Kunde versenden · Löschen; Status Entwurf / Aktiv (versendet). */
function BautagebuchEditor({ entry, onChange, onClose, onRemove }) {
  const e = entry || {};
  const inputRef = React.useRef(null);
  const addFotos = (files) => {
    if (!files) return;
    Array.from(files).filter(f => f.type.startsWith("image/")).forEach(file => {
      const r = new FileReader();
      r.onload = (ev) => onChange({ fotos: [...(e.fotos || []), ev.target.result] });
      r.readAsDataURL(file);
    });
  };
  const rmFoto = (i) => onChange({ fotos: (e.fotos || []).filter((_, idx) => idx !== i) });
  return (
    <Modal open onClose={onClose} icon="clipboard-list" title={e.titel || "Neuer Eintrag"} sub="Bautagebuch-Eintrag"
      footer={<><Btn sm kind="danger" icon="trash" onClick={() => { onRemove && onRemove(); onClose(); }}>Entfernen</Btn><div style={{ flex: 1 }}></div><Btn sm kind="primary" icon="check" onClick={onClose}>Fertig</Btn></>}>
      <div className="form-grid">
        <Field label="Titel" full required><Txt value={e.titel} onChange={(v) => onChange({ titel: v })} placeholder="z.B. Rohinstallation abgeschlossen" autoFocus={!e.titel} /></Field>
        <Field label="Beschreibung" full><TA value={e.beschreibung || ""} onChange={(v) => onChange({ beschreibung: v })} rows={3} placeholder="Was wurde heute gemacht..." /></Field>
      </div>
      <div className="section-h" style={{ margin: "14px 2px 8px" }}>Fotos</div>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(ev) => addFotos(ev.target.files)} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(e.fotos || []).map((src, i) => (
          <div key={i} style={{ width: 88, height: 66, borderRadius: 8, overflow: "hidden", position: "relative", background: "var(--bg-soft)" }}>
            <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <button type="button" onClick={() => rmFoto(i)} style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: 20, border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon n="x" size={12} /></button>
          </div>
        ))}
        <button type="button" onClick={() => inputRef.current && inputRef.current.click()} style={{ width: 88, height: 66, borderRadius: 8, border: "1px dashed var(--border-strong)", background: "var(--bg-soft)", color: "var(--text-3)", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon n="photo-plus" size={20} /></button>
      </div>
    </Modal>
  );
}

function BautagebuchCard({ seed, onSendKunde }) {
  const [entries, setEntries] = React.useState(() => seed || []);
  const [editId, setEditId] = React.useState(null);
  const [sel, setSel] = React.useState({});
  const inputRef = React.useRef(null);
  const today = () => formatDate(new Date().toISOString().slice(0, 10));

  const update = (id, patch) => setEntries(entries.map(e => e.id === id ? { ...e, ...patch } : e));
  const remove = (id) => { setEntries(entries.filter(e => e.id !== id)); setSel(s => { const n = { ...s }; delete n[id]; return n; }); };
  const dup = (id) => {
    const i = entries.findIndex(e => e.id === id); if (i < 0) return;
    const c = { ...entries[i], id: "bt-" + Date.now(), titel: (entries[i].titel || "Eintrag") + " (Kopie)", status: "entwurf", date: today() };
    const arr = [...entries]; arr.splice(i + 1, 0, c); setEntries(arr);
  };
  const add = () => {
    const id = "bt-" + Date.now();
    setEntries([{ id, titel: "", beschreibung: "", fotos: [], status: "entwurf", date: today() }, ...entries]);
    setEditId(id);
  };
  const send = (ids) => {
    setEntries(entries.map(e => ids.includes(e.id) ? { ...e, status: "aktiv" } : e));
    setSel({});
    if (onSendKunde) onSendKunde(ids.length);
    else if (window.__toast) window.__toast(ids.length + " Eintrag(e) an Kunde versendet");
  };
  const importFotoEntry = (files) => {
    if (!files) return;
    Array.from(files).filter(f => f.type.startsWith("image/")).forEach(file => {
      const r = new FileReader();
      r.onload = (ev) => setEntries(prev => [{ id: "bt-" + Date.now() + Math.random().toString(36).slice(2, 5), titel: file.name.replace(/\.[^.]+$/, ""), beschreibung: "", fotos: [ev.target.result], status: "entwurf", date: today() }, ...prev]);
      r.readAsDataURL(file);
    });
  };

  const toggle = (id) => setSel(s => ({ ...s, [id]: !s[id] }));
  const selIds = Object.keys(sel).filter(k => sel[k]);
  const editE = entries.find(e => e.id === editId);
  const box = (on) => <span className={"bt-check" + (on ? " on" : "")}>{on ? <Icon n="check" size={11} /> : null}</span>;
  const statusBadge = (st) => st === "aktiv"
    ? <Badge kind="aktiv"><Icon n="check" size={10} /> Aktiv</Badge>
    : <Badge kind="fertig"><Icon n="file-pencil" size={10} /> Entwurf</Badge>;

  const itemActions = (e) => [
    { icon: "pencil", label: "Bearbeiten", onClick: () => setEditId(e.id) },
    { icon: "copy", label: "Kopieren", onClick: () => dup(e.id) },
    { icon: "mail-forward", label: "An Kunde versenden", onClick: () => send([e.id]) },
    "sep",
    { icon: "trash", label: "Löschen", danger: true, onClick: () => remove(e.id) }
  ];

  return (
    <Card title={"Bautagebuch · " + entries.length} icon="clipboard-list"
      actions={<><input ref={inputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(ev) => importFotoEntry(ev.target.files)} /><Btn sm kind="ghost" icon="photo-plus" onClick={() => inputRef.current && inputRef.current.click()}>Foto</Btn><Btn sm kind="primary" icon="plus" onClick={add}>Eintrag</Btn></>}>
      {selIds.length > 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 12, background: "var(--green-dark)", color: "#fff", borderRadius: 10 }}>
          <Icon n="checks" size={16} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>{selIds.length} ausgewählt</span>
          <div style={{ flex: 1 }}></div>
          {[
            { icon: "mail-forward", label: "An Kunde versenden", onClick: () => send(selIds) },
            { icon: "copy", label: "Kopieren", onClick: () => { selIds.forEach(dup); setSel({}); } },
            { icon: "trash", label: "Löschen", onClick: () => { setEntries(entries.filter(e => !sel[e.id])); setSel({}); } }
          ].map((a, i) => (
            <button key={i} type="button" onClick={a.onClick} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.16)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}><Icon n={a.icon} size={15} />{a.label}</button>
          ))}
          <button type="button" onClick={() => setSel({})} title="Auswahl aufheben" style={{ display: "inline-flex", padding: 6, borderRadius: 8, border: "none", background: "transparent", color: "rgba(255,255,255,0.8)", cursor: "pointer" }}><Icon n="x" size={16} /></button>
        </div>
      ) : null}
      {entries.length === 0 ? (
        <EmptyState icon="clipboard-list" title="Noch keine Einträge" sub="Dokumentiere den Baufortschritt mit Titel, Beschreibung und Fotos." />
      ) : (
        <div className="bt-list">
          {entries.map(e => (
            <div key={e.id} className={"bt-entry" + (sel[e.id] ? " sel" : "")}>
              <span onClick={() => toggle(e.id)}>{box(!!sel[e.id])}</span>
              <div className="bt-thumb">
                {(e.fotos && e.fotos[0]) ? <img src={e.fotos[0]} alt="" /> : <Icon n="photo" size={22} style={{ color: "var(--text-4)" }} />}
                {(e.fotos && e.fotos.length > 1) ? <span className="count">+{e.fotos.length - 1}</span> : null}
              </div>
              <div className="bt-main" onClick={() => setEditId(e.id)} style={{ cursor: "pointer" }}>
                <div className="bt-title">{e.titel || "(ohne Titel)"} {statusBadge(e.status)}</div>
                {e.beschreibung ? <div className="bt-desc">{e.beschreibung}</div> : null}
                <div className="bt-meta">{e.date}{e.fotos && e.fotos.length ? " · " + e.fotos.length + " Foto" + (e.fotos.length === 1 ? "" : "s") : ""}</div>
              </div>
              <div className="bt-act">
                <Menu align="right" trigger={<button className="qa-btn" title="Aktionen"><Icon n="dots" size={16} /></button>} items={itemActions(e)} />
              </div>
            </div>
          ))}
        </div>
      )}
      {editE ? <BautagebuchEditor entry={editE} onChange={(patch) => update(editE.id, patch)} onClose={() => setEditId(null)} onRemove={() => remove(editE.id)} /> : null}
    </Card>
  );
}

/* Übersicht — Kennzahlen-Leiste für Kunde/Handwerker/Partner (Anzahl Vorgänge + Umsatz) */
function UebersichtCard({ stats }) {
  return (
    <div className="ueber-grid">
      {stats.map((s, i) => (
        <div key={i} className="ueber-kpi">
          <div className="ueber-ico"><Icon n={s.icon} size={17} /></div>
          <div className="ueber-val">{s.value}</div>
          <div className="ueber-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* Zahlplan — Abschläge/Raten eines Auftrags (Geplant / Gestellt / Bezahlt) + Fortschritt */
function ZahlplanCard({ seed, gesamt, onCreateInvoice }) {
  const [raten, setRaten] = React.useState(() => seed || []);
  const [editor, setEditor] = React.useState(false);
  const total = gesamt || raten.reduce((s, r) => s + (r.betrag || 0), 0);
  const bezahlt = raten.filter(r => r.status === "bezahlt").reduce((s, r) => s + (r.betrag || 0), 0);
  const gestellt = raten.filter(r => r.status === "gestellt").reduce((s, r) => s + (r.betrag || 0), 0);
  const pct = total > 0 ? Math.round((bezahlt / total) * 100) : 0;
  const badge = (st) => st === "bezahlt" ? <Badge kind="aktiv"><Icon n="check" size={10} /> Bezahlt</Badge>
    : st === "gestellt" ? <Badge kind="warten"><Icon n="mail-forward" size={10} /> Gestellt</Badge>
    : <Badge kind="fertig"><Icon n="file-pencil" size={10} /> Geplant</Badge>;
  const setStatus = (id, status) => setRaten(raten.map(r => r.id === id ? { ...r, status } : r));
  const actions = (r) => {
    const a = [];
    if (r.status === "geplant") a.push({ icon: "file-invoice", label: "Rechnung erstellen", onClick: () => { setStatus(r.id, "gestellt"); onCreateInvoice && onCreateInvoice(r); } });
    if (r.status === "gestellt") { a.push({ icon: "check", label: "Als bezahlt markieren", onClick: () => setStatus(r.id, "bezahlt") }); a.push({ icon: "send", label: "Nochmal versenden", onClick: () => window.__toast && window.__toast("Rechnung erneut versendet") }); }
    if (r.status === "bezahlt") a.push({ icon: "history", label: "Zahlung zurücksetzen", onClick: () => setStatus(r.id, "gestellt") });
    return a;
  };
  const hasPlan = raten.length > 0;
  if (!hasPlan) {
    return (
      <>
        <Card title="Zahlplan" icon="calculator">
          <div style={{ padding: "26px 16px", textAlign: "center", color: "var(--text-3)" }}>
            <Icon n="calculator" size={26} style={{ color: "var(--text-4)" }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)", marginTop: 10 }}>Noch kein Abschlagsplan</div>
            <div style={{ fontSize: 12.5, marginTop: 4, marginBottom: 16, maxWidth: 380, marginInline: "auto", lineHeight: 1.45 }}>Teile die Auftragssumme von <b>{formatEUR(total)}</b> in Abschläge auf — z. B. 30 % bei Beginn, 40 % nach Rohbau, 30 % zur Schlussrechnung.</div>
            <Btn kind="primary" icon="plus" onClick={() => setEditor(true)}>Abschlagsplan erstellen</Btn>
          </div>
        </Card>
        {editor ? <AbschlagsplanEditor gesamt={total} initial={null} onClose={() => setEditor(false)} onSave={(rs) => { setRaten(rs); setEditor(false); }} /> : null}
      </>
    );
  }
  return (
    <>
    <Card title="Zahlplan" icon="calculator"
      actions={<><Btn sm kind="ghost" icon="pencil" onClick={() => setEditor(true)}>Plan bearbeiten</Btn><Btn sm kind="primary" icon="file-invoice" onClick={() => { const next = raten.find(r => r.status === "geplant"); if (next) { setStatus(next.id, "gestellt"); onCreateInvoice && onCreateInvoice(next); } else onCreateInvoice && onCreateInvoice(null); }}>Nächste Rechnung</Btn></>}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, fontSize: 13 }}>
        <span style={{ color: "var(--text-3)" }}>Bezahlt {formatEUR(bezahlt)}{gestellt ? " · offen gestellt " + formatEUR(gestellt) : ""}</span>
        <b>{formatEUR(bezahlt)} / {formatEUR(total)}</b>
      </div>
      <div style={{ height: 8, borderRadius: 6, background: "var(--bg-soft)", overflow: "hidden", marginBottom: 14 }}>
        <div style={{ width: pct + "%", height: "100%", background: "var(--green)", borderRadius: 6, transition: "width .3s" }}></div>
      </div>
      <div style={{ margin: "0 -16px -14px" }}>
        <div className="list-row head" style={{ gridTemplateColumns: "1fr 110px 120px 120px 34px" }}>
          <div>Bezeichnung</div><div style={{ textAlign: "right" }}>Betrag</div><div>Fällig</div><div>Status</div><div></div>
        </div>
        {raten.map(r => (
          <div key={r.id} className="list-row" style={{ gridTemplateColumns: "1fr 110px 120px 120px 34px", cursor: "default", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{r.label}{r.prozent != null ? <span style={{ color: "var(--text-4)", fontWeight: 400 }}> · {r.prozent}%</span> : null}</div>
            <div style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums", fontSize: 13 }}>{formatEUR(r.betrag)}</div>
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>{formatDate(r.faellig)}</div>
            <div>{badge(r.status)}</div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Menu align="right" trigger={<button className="qa-btn" title="Aktionen"><Icon n="dots" size={15} /></button>} items={actions(r)} />
            </div>
          </div>
        ))}
      </div>
    </Card>
    {editor ? <AbschlagsplanEditor gesamt={total} initial={raten} onClose={() => setEditor(false)} onSave={(rs) => { setRaten(rs); setEditor(false); }} /> : null}
    </>
  );
}

/* Editor-Modal: Abschlagsplan aus Vorlage oder frei definieren (Prozent → Betrag, 100%-Prüfung) */
function AbschlagsplanEditor({ gesamt, initial, onClose, onSave }) {
  const mk = (label, prozent, tage) => ({ id: "zr-" + Math.random().toString(36).slice(2, 7), label, prozent, faellig: plusDaysISO(tage), status: "geplant" });
  const presets = {
    "30 / 40 / 30": [["1. Abschlag", 30, 14], ["2. Abschlag", 40, 45], ["Schlussrechnung", 30, 75]],
    "50 / 50": [["Anzahlung", 50, 14], ["Schlussrechnung", 50, 60]],
    "Anzahlung 30% + Rest": [["Anzahlung", 30, 7], ["Schlussrechnung", 70, 60]]
  };
  const [raten, setRaten] = React.useState(() => (initial && initial.length)
    ? initial.map(r => ({ ...r, prozent: r.prozent != null ? r.prozent : Math.round((r.betrag || 0) / (gesamt || 1) * 100) }))
    : presets["30 / 40 / 30"].map(([l, p, t]) => mk(l, p, t)));
  const applyPreset = (name) => setRaten(presets[name].map(([l, p, t]) => mk(l, p, t)));
  const upd = (id, patch) => setRaten(raten.map(r => r.id === id ? { ...r, ...patch } : r));
  const rm = (id) => setRaten(raten.filter(r => r.id !== id));
  const add = () => setRaten([...raten, mk((raten.length + 1) + ". Abschlag", 0, 30)]);
  const summe = raten.reduce((s, r) => s + (Number(r.prozent) || 0), 0);
  const betrag = (r) => Math.round((gesamt || 0) * (Number(r.prozent) || 0) / 100);
  const ok = summe === 100 && raten.length > 0;
  const save = () => ok && onSave(raten.map(r => ({ id: r.id, label: r.label, prozent: Number(r.prozent) || 0, betrag: betrag(r), faellig: r.faellig, status: r.status || "geplant" })));
  return (
    <Modal open={true} title="Abschlagsplan" onClose={onClose}
      footer={<><Btn kind="ghost" onClick={onClose}>Abbrechen</Btn><Btn kind="primary" icon="check" disabled={!ok} onClick={save}>Plan speichern</Btn></>}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--text-3)", marginRight: 2 }}>Vorlage:</span>
        {Object.keys(presets).map(name => (
          <button key={name} type="button" onClick={() => applyPreset(name)} style={{ padding: "5px 11px", borderRadius: 8, border: "0.5px solid var(--border)", background: "var(--card)", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>{name}</button>
        ))}
        <div style={{ flex: 1 }}></div>
        <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>Gesamt <b style={{ color: "var(--green)" }}>{formatEUR(gesamt)}</b></span>
      </div>
      <div style={{ border: "0.5px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "var(--card)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 84px 120px 150px 34px", gap: 10, padding: "9px 14px", background: "var(--bg-soft)", borderBottom: "0.5px solid var(--border)", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-2)" }}>
          <div>Bezeichnung</div><div style={{ textAlign: "right" }}>Anteil</div><div style={{ textAlign: "right" }}>Betrag</div><div>Fällig</div><div></div>
        </div>
        {raten.map(r => (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 84px 120px 150px 34px", gap: 10, padding: "8px 14px", borderBottom: "0.5px solid var(--border)", alignItems: "center" }}>
            <input className="txt" value={r.label} onChange={e => upd(r.id, { label: e.target.value })} style={{ height: 32 }} />
            <div className="txt-prefix" style={{ maxWidth: 84 }}><input className="txt" type="number" value={r.prozent} onChange={e => upd(r.id, { prozent: Number(e.target.value) || 0 })} style={{ textAlign: "right" }} /><span className="prefix" style={{ right: 8, left: "auto" }}>%</span></div>
            <div style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums", fontSize: 13 }}>{formatEUR(betrag(r))}</div>
            <input className="txt" type="date" value={r.faellig} onChange={e => upd(r.id, { faellig: e.target.value })} style={{ height: 32, fontSize: 12 }} />
            <Btn sm kind="ghost" icon="trash" onClick={() => rm(r.id)} title="Entfernen" />
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", padding: "8px 14px", gap: 10 }}>
          <button type="button" className="pt-add" style={{ border: "none", padding: 0, width: "auto" }} onClick={add}><Icon n="plus" size={13} /> Abschlag hinzufügen</button>
          <div style={{ flex: 1 }}></div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: summe === 100 ? "var(--green)" : "var(--danger, #c0392b)" }}>
            Summe {summe}%{summe !== 100 ? " · muss 100% sein" : ""}
          </span>
        </div>
      </div>
    </Modal>
  );
}

/* Mahnwesen — Mahnstufen, Gebühren, Verlauf + Vorschau (nur offene/überfällige Rechnungen) */
const MAHN_STUFEN = [
  { key: "erinnerung", label: "Zahlungserinnerung", kurz: "Erinnerung", gebuehr: 0, frist: 7, ton: "freundlich" },
  { key: "m1", label: "1. Mahnung", kurz: "1. Mahnung", gebuehr: 5, frist: 7, ton: "bestimmt" },
  { key: "m2", label: "2. Mahnung", kurz: "2. Mahnung", gebuehr: 10, frist: 5, ton: "deutlich" },
  { key: "letzte", label: "Letzte Mahnung", kurz: "Letzte Mahnung", gebuehr: 15, frist: 5, ton: "final" }
];
function MahnungCard({ rechnung, showToast }) {
  const r = rechnung || {};
  const tageUeber = Math.max(0, Math.round((new Date() - new Date(r.faellig)) / 864e5));
  const iso = (d) => d.toISOString().slice(0, 10);
  const minus = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
  const plus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  /* Verlauf vorbelegen anhand Überfälligkeit (Demo) */
  const [verlauf, setVerlauf] = React.useState(() => {
    if (r.status !== "ueberfaellig") return [];
    const h = [];
    if (tageUeber >= 3) h.push({ key: "erinnerung", datum: minus(Math.min(tageUeber, tageUeber - 2)), gebuehr: 0 });
    if (tageUeber >= 12) h.push({ key: "m1", datum: minus(Math.max(1, tageUeber - 10)), gebuehr: 5 });
    return h;
  });
  const [preview, setPreview] = React.useState(null); // stufe-objekt
  const gesendet = verlauf.map(v => v.key);
  const naechste = MAHN_STUFEN.find(s => !gesendet.includes(s.key)) || null;
  const gebuehrenSumme = verlauf.reduce((s, v) => s + (v.gebuehr || 0), 0);
  const forderung = (r.bruttoTotal || 0) + gebuehrenSumme;
  const send = (stufe) => {
    setVerlauf([...verlauf, { key: stufe.key, datum: iso(new Date()), gebuehr: stufe.gebuehr }]);
    setPreview(null);
    showToast && showToast(stufe.label + " versendet");
  };
  const stufeInfo = (key) => MAHN_STUFEN.find(s => s.key === key) || {};
  return (
    <>
      <Card title="Mahnwesen" icon="alert-triangle"
        actions={naechste ? <Btn sm kind="primary" icon="mail-forward" onClick={() => setPreview(naechste)}>{naechste.label} senden</Btn> : null}>
        {r.status === "ueberfaellig"
          ? <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--red-tx)", marginBottom: 12, fontWeight: 500 }}><Icon n="alert-triangle" size={15} /> {tageUeber} Tage überfällig · fällig war {formatDate(r.faellig)}</div>
          : <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-3)", marginBottom: 12 }}><Icon n="clock" size={15} /> Noch nicht überfällig · fällig {formatDate(r.faellig)}</div>}

        {/* Stufen-Stepper */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {MAHN_STUFEN.map((s, i) => {
            const done = gesendet.includes(s.key);
            const active = naechste && naechste.key === s.key;
            return (
              <div key={s.key} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: 5, borderRadius: 3, background: done ? "var(--red-tx)" : active ? "var(--yel-tx)" : "var(--border-strong)", marginBottom: 6 }}></div>
                <div style={{ fontSize: 10.5, fontWeight: done || active ? 700 : 500, color: done ? "var(--red-tx)" : active ? "var(--yel-tx)" : "var(--text-4)", lineHeight: 1.2 }}>{s.kurz}</div>
                {s.gebuehr > 0 ? <div style={{ fontSize: 9.5, color: "var(--text-4)", marginTop: 1 }}>+{formatEUR(s.gebuehr)}</div> : null}
              </div>
            );
          })}
        </div>

        {/* Verlauf */}
        {verlauf.length ? (
          <div style={{ border: "0.5px solid var(--border)", borderRadius: 9, overflow: "hidden", marginBottom: 12 }}>
            {verlauf.map((v, i) => {
              const s = stufeInfo(v.key);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderBottom: i < verlauf.length - 1 ? "0.5px solid var(--border)" : "none" }}>
                  <span style={{ width: 22, height: 22, borderRadius: 20, background: "var(--red-bg)", color: "var(--red-tx)", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon n="mail-forward" size={12} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>versendet {formatDate(v.datum)}{v.gebuehr ? " · Gebühr " + formatEUR(v.gebuehr) : ""}</div>
                  </div>
                  <Badge kind="storniert">Versendet</Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--text-3)", padding: "4px 0 12px" }}>Noch keine Mahnung versendet.</div>
        )}

        {/* Forderungssumme */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 12.5, paddingTop: 10, borderTop: "0.5px solid var(--border)" }}>
          <span style={{ color: "var(--text-3)" }}>Rechnungsbetrag {formatEUR(r.bruttoTotal)}{gebuehrenSumme ? " + Mahngebühren " + formatEUR(gebuehrenSumme) : ""}</span>
          <b style={{ fontVariantNumeric: "tabular-nums" }}>Forderung {formatEUR(forderung)}</b>
        </div>
        {!naechste ? <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--red-tx)", fontWeight: 600 }}><Icon n="alert-triangle" size={15} /> Alle Mahnstufen ausgeschöpft — Übergabe an Inkasso empfohlen.</div> : null}
      </Card>

      {preview ? (
        <Modal open={true} icon="mail-forward" title={preview.label + " versenden"} onClose={() => setPreview(null)}
          footer={<><Btn kind="ghost" onClick={() => setPreview(null)}>Abbrechen</Btn><Btn kind="primary" icon="send" onClick={() => send(preview)}>Jetzt versenden</Btn></>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div style={{ background: "var(--bg-soft)", borderRadius: 9, padding: "10px 12px" }}><div style={{ fontSize: 11, color: "var(--text-3)" }}>Empfänger</div><div style={{ fontSize: 13, fontWeight: 600 }}>{r.customer && r.customer.name}</div></div>
            <div style={{ background: "var(--bg-soft)", borderRadius: 9, padding: "10px 12px" }}><div style={{ fontSize: 11, color: "var(--text-3)" }}>Neue Zahlungsfrist</div><div style={{ fontSize: 13, fontWeight: 600 }}>{formatDate(plus(preview.frist))} ({preview.frist} Tage)</div></div>
            <div style={{ background: "var(--bg-soft)", borderRadius: 9, padding: "10px 12px" }}><div style={{ fontSize: 11, color: "var(--text-3)" }}>Mahngebühr</div><div style={{ fontSize: 13, fontWeight: 600 }}>{preview.gebuehr ? formatEUR(preview.gebuehr) : "keine"}</div></div>
            <div style={{ background: "var(--bg-soft)", borderRadius: 9, padding: "10px 12px" }}><div style={{ fontSize: 11, color: "var(--text-3)" }}>Gesamtforderung</div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--red-tx)" }}>{formatEUR(forderung + (preview.gebuehr || 0))}</div></div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-3)", marginBottom: 6 }}>Anschreiben (Vorschau)</div>
          <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 9, padding: 14, fontSize: 12.5, lineHeight: 1.55, color: "var(--text-2)", whiteSpace: "pre-wrap" }}>{
            "Sehr geehrte/r " + ((r.customer && r.customer.name) || "Kunde") + ",\n\n"
            + (preview.key === "erinnerung"
                ? "sicher haben Sie es nur übersehen: Zu unserer Rechnung " + r.id + " über " + formatEUR(r.bruttoTotal) + " konnten wir noch keinen Zahlungseingang feststellen. Wir bitten Sie, den Betrag bis zum " + formatDate(plus(preview.frist)) + " auszugleichen."
                : preview.key === "letzte"
                ? "trotz mehrfacher Aufforderung ist die Rechnung " + r.id + " weiterhin offen. Wir setzen Ihnen eine letzte Frist bis zum " + formatDate(plus(preview.frist)) + ". Nach fruchtlosem Ablauf geben wir die Forderung ohne weitere Ankündigung an ein Inkassobüro ab."
                : "leider ist die Rechnung " + r.id + " trotz Fälligkeit offen. Wir fordern Sie auf, den Betrag zzgl. Mahngebühr von " + formatEUR(preview.gebuehr) + " bis zum " + formatDate(plus(preview.frist)) + " zu begleichen.")
            + "\n\nMit freundlichen Grüßen\nBärenwald München"
          }</div>
        </Modal>
      ) : null}
    </>
  );
}

/* Dokumente — Upload-Liste, überall gleich (Drop-Zone, Inline-Edit, Kunden-Freigabe) */
function DokumenteCard({ seed }) {
  const [docs, setDocs] = React.useState(() => seed || []);
  const [editId, setEditId] = React.useState(null);
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef(null);
  const addFiles = (files) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const id = "d-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
      const today = formatDate(new Date().toISOString().slice(0, 10));
      if (file.type.startsWith("image/")) {
        const r = new FileReader();
        r.onload = (e) => setDocs((prev) => [...prev, { id, kind: "foto", name: file.name, date: today, dataUrl: e.target.result, freigabe: false }]);
        r.readAsDataURL(file);
      } else {
        setDocs((prev) => [...prev, { id, kind: "datei", name: file.name, date: today, size: Math.round(file.size / 1024) + " KB", freigabe: false }]);
      }
    });
  };
  const upd = (id, patch) => setDocs(docs.map((d) => d.id === id ? { ...d, ...patch } : d));
  const rm = (id) => setDocs(docs.filter((d) => d.id !== id));
  const [viewId, setViewId] = React.useState(null);
  const viewDoc = docs.find((d) => d.id === viewId);
  const cols = "28px 1.6fr 1fr 120px 110px 70px";
  return (
    <Card title={"Dokumente · " + docs.length} icon="files">
      <input ref={inputRef} type="file" multiple style={{ display: "none" }} onChange={(e) => addFiles(e.target.files)} />
      <div
        onClick={() => inputRef.current && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
        style={{
          padding: 16, marginBottom: docs.length ? 12 : 0, borderRadius: 8, textAlign: "center", cursor: "pointer",
          border: "1px dashed " + (drag ? "var(--green)" : "var(--border-strong)"),
          background: drag ? "var(--green-50)" : "var(--bg-soft)", color: drag ? "var(--green)" : "var(--text-3)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12.5, fontWeight: 500
        }}>
        <Icon n="cloud-upload" size={18} /> Dateien hier ablegen oder klicken
      </div>
      {docs.length === 0 ? null : (
        <div style={{ margin: "0 -16px -14px" }}>
          <div className="list-row head" style={{ gridTemplateColumns: cols }}>
            <div></div><div>Name</div><div>Beschreibung</div><div>Datum</div><div>Freigabe</div><div></div>
          </div>
          {docs.map((d) => {
            const editing = editId === d.id;
            return (
              <div key={d.id} className="list-row" style={{ gridTemplateColumns: cols, cursor: "default", alignItems: editing ? "start" : "center" }}>
                <Icon n={d.kind === "foto" ? "photo" : "file-text"} size={18} style={{ color: "var(--text-3)" }} />
                {editing
                  ? <input className="txt" value={d.name} onChange={(e) => upd(d.id, { name: e.target.value })} style={{ height: 30 }} autoFocus />
                  : <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}{d.size ? <span style={{ color: "var(--text-4)", fontWeight: 400 }}> · {d.size}</span> : null}</div>}
                {editing
                  ? <input className="txt" value={d.beschreibung || ""} onChange={(e) => upd(d.id, { beschreibung: e.target.value })} placeholder="Beschreibung..." style={{ height: 30 }} />
                  : <div style={{ fontSize: 12.5, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.beschreibung || <span style={{ color: "var(--text-4)" }}>—</span>}</div>}
                {editing
                  ? <input className="txt" type="date" onChange={(e) => upd(d.id, { date: formatDate(e.target.value) })} style={{ height: 30, fontSize: 12 }} />
                  : <div style={{ fontSize: 12, color: "var(--text-3)" }}>{d.date}</div>}
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11.5 }}>
                  <input type="checkbox" checked={d.freigabe} onChange={(e) => upd(d.id, { freigabe: e.target.checked })} style={{ accentColor: "var(--green)", margin: 0 }} />
                  <span style={{ color: d.freigabe ? "var(--green)" : "var(--text-3)" }}>{d.freigabe ? "Kunde" : "intern"}</span>
                </label>
                <div style={{ display: "flex", gap: 0, justifyContent: "flex-end" }}>
                  {editing
                    ? <Btn sm kind="ghost" icon="check" onClick={() => setEditId(null)} title="Fertig" />
                    : <Btn sm kind="ghost" icon="eye" onClick={() => setViewId(d.id)} title="Ansehen" />}
                  <Btn sm kind="ghost" icon="trash" onClick={() => rm(d.id)} title="Löschen" />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {viewDoc ? (
        <Modal open onClose={() => setViewId(null)} icon={viewDoc.kind === "foto" ? "photo" : "file-text"} title={viewDoc.name} sub={viewDoc.date + (viewDoc.size ? " · " + viewDoc.size : "")}
          footer={<><Btn sm kind="ghost" icon="pencil" onClick={() => { setViewId(null); setEditId(viewDoc.id); }}>Bearbeiten</Btn><div style={{ flex: 1 }}></div><Btn sm kind="primary" icon="x" onClick={() => setViewId(null)}>Schließen</Btn></>}>
          {viewDoc.dataUrl
            ? <img src={viewDoc.dataUrl} alt={viewDoc.name} style={{ width: "100%", borderRadius: 8, display: "block" }} />
            : (
              <div style={{ padding: 40, textAlign: "center", background: "var(--bg-soft)", borderRadius: 10, border: "0.5px solid var(--border)" }}>
                <Icon n={viewDoc.kind === "foto" ? "photo" : "file-text"} size={44} style={{ color: "var(--text-4)" }} />
                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 10 }}>{viewDoc.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>Vorschau nicht verfügbar (Demo)</div>
              </div>
            )}
          {viewDoc.beschreibung ? <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 12 }}>{viewDoc.beschreibung}</div> : null}
        </Modal>
      ) : null}
    </Card>
  );
}

/* ============ WizardShell — EIN Erstell-Wizard-Design für alle Wizards ============ */
function WizardShell({ title, steps, step, setStep, onClose, onFinish, finishLabel, finishIcon, children }) {
  const last = steps.length;
  return (
    <div className="wizard" role="dialog" aria-modal="true">
      <div className="wizard-inner-shell">
        <div className="wizard-top">
          <Btn icon="x" kind="ghost" sm onClick={onClose} title="Abbrechen" />
          <div style={{ width: 1, height: 24, background: "var(--border)" }}></div>
          <div className="title-block"><div className="ttl">{title}</div></div>
          <div style={{ flex: 1 }}></div>
          <div className="stepper">
            {steps.map((s, i) => {
              const n = i + 1;
              return (
                <React.Fragment key={s}>
                  {i > 0 ? <Icon n="chevron-right" size={14} className="step-arrow" /> : null}
                  <div className={"step" + (step === n ? " active" : step > n ? " done" : "")}>
                    <div className="step-n">{step > n ? <Icon n="check" size={11} /> : n}</div>
                    <span>{s}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <div style={{ flex: 1 }}></div>
          {step > 1 ? <Btn kind="ghost" icon="chevron-left" onClick={() => setStep(step - 1)}>Zurück</Btn> : null}
          {step < last
            ? <Btn kind="primary" onClick={() => setStep(step + 1)}>Weiter <Icon n="chevron-right" size={14} /></Btn>
            : <Btn kind="primary" icon={finishIcon || "check"} onClick={onFinish}>{finishLabel || "Fertig"}</Btn>}
        </div>
        <div className="wizard-body"><div className="wizard-inner">{children}</div></div>
      </div>
    </div>
  );
}

/* Einheitliche Pipeline-KPIs (gleich auf allen Listen) */
function PipelineKpis({ navigate }) {
  const L = typeof LEADS !== "undefined" ? LEADS : [];
  const A = typeof ANGEBOTE !== "undefined" ? ANGEBOTE : [];
  const O = typeof ORDERS !== "undefined" ? ORDERS : [];
  const R = typeof RECHNUNGEN !== "undefined" ? RECHNUNGEN : [];
  const kpis = [
    { icon: "inbox", label: "Neue Anfragen", value: L.filter(l => l.status === "neu" || l.status === "kontaktiert").length, go: () => navigate("anfragen") },
    { icon: "file-invoice", label: "Offene Angebote", value: A.filter(a => a.status !== "kunde_akzeptiert" && a.status !== "abgelehnt").length, go: () => navigate("angebote") },
    { icon: "tool", label: "Aktive Aufträge", value: O.filter(o => o.status === "aktiv").length, go: () => navigate("auftraege") },
    { icon: "receipt", label: "Offene Rechnungen", value: R.filter(r => r.status === "versendet" || r.status === "ueberfaellig").length, go: () => navigate("rechnungen") }
  ];
  return (
    <div className="kpi-grid" style={{ marginBottom: 18 }}>
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
  );
}

Object.assign(window, {
  Icon, Badge, ContextBadges, HVKontextCard, Chip, Btn, SearchInput, Avatar, Tabs,
  Metric, Card, Prop, Timeline, Progress, EmptyState, Switch,
  Menu, Modal, Popover, CommandPalette, DetailShell, PipelineKpis,
  useSort, SortHead, usePager, Pager, entityActions, entityMenu, ProjektUebersicht, PosTable, PosBoard, PosTotals, PositionModal, WizardShell,
  VerlaufCard, NotizenCard, DokumenteCard, BautagebuchCard, ZahlplanCard, MahnungCard, UebersichtCard,
  formatEUR, formatDate
});

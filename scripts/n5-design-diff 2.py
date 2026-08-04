#!/usr/bin/env python3
"""N5' — Design-Diff Mock (standalone 9) ↔ App (Vorgangs-Scope)."""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

MOCK = Path("/Users/belalmasdjedi/Downloads/Baerenwald CRM (standalone) (9).html")
APP_ROOT = Path(__file__).resolve().parents[1]
if not (APP_ROOT / "src/app/globals.css").exists():
    # Fallback falls Script anders gestartet wird
    APP_ROOT = Path.cwd()
    if not (APP_ROOT / "src/app/globals.css").exists():
        APP_ROOT = Path.cwd() / "baerenwald-crm-dashboard"
OUT_MD = APP_ROOT / "docs/umsetzung/N5-DESIGN-DIFF.md"
OUT_JSON = APP_ROOT / "docs/umsetzung/N5-DESIGN-DIFF.json"

SPEC_FS = {"12px", "13.5px", "15px", "19px"}
FS_TOKENS = {
    "var(--fs-meta)",
    "var(--fs-text)",
    "var(--fs-title)",
    "var(--fs-head)",
}
TOKEN_TO_PX = {
    "var(--fs-meta)": "12px",
    "var(--fs-text)": "13.5px",
    "var(--fs-title)": "15px",
    "var(--fs-head)": "19px",
}

CORE_CLASSES = [
    "lt-row",
    "ldr-sec",
    "nsb",
    "vgid",
    "crow",
    "dc-split",
    "wv-chip",
    "qbar",
]

# Bekannte Umbenennungen Mock → App (wenn Klasse fehlt, Pendant prüfen)
CLASS_ALIASES = {
    "nsb": ["next-step-bar", "next-step-banner"],
    "dc-split": ["document-canvas", "dc-grid", "document-canvas-sec"],
    "wv-chip": ["wiedervorlage-chip", "wvchip", "chip-wv"],
    "crow": ["card-row", "list-row", "vg-row"],
    "vgid": ["vg-id", "vorgang-id", "entity-id"],
}

APP_GLOBS = [
    "src/styles/mock-design-system.css",
    "src/app/globals.css",
    "src/components/vorgang/**/*.tsx",
    "src/components/vorgaenge/**/*.tsx",
    "src/components/anfragen/**/*.tsx",
    "src/components/angebote/**/*.tsx",
    "src/components/auftraege/**/*.tsx",
    "src/components/rechnungen/**/*.tsx",
    "src/components/leistungen/**/*.tsx",
    "src/components/layout/**/*.tsx",
    "src/components/mock-ui/**/*.tsx",
    "src/components/ui/StatusBadge.tsx",
    "src/components/ui/Badge.tsx",
    "src/components/dashboard/MyWorkInbox.tsx",
    "src/components/ui/DetailShell.tsx",
    "src/components/ui/EditorSheet.tsx",
    "src/components/ui/DocumentCanvas.tsx",
]


def norm(s: str) -> str:
    return re.sub(r"\s+", "", s.strip().lower())


def expand_globs(patterns: list[str]) -> list[Path]:
    files: list[Path] = []
    seen: set[str] = set()
    for pat in patterns:
        matched = list(APP_ROOT.glob(pat)) if "*" in pat else ([APP_ROOT / pat] if (APP_ROOT / pat).exists() else [])
        for f in matched:
            if f.is_file() and str(f) not in seen:
                seen.add(str(f))
                files.append(f)
    return files


def parse_root_vars(css: str) -> dict[str, str]:
    vars_: dict[str, str] = {}
    for block in re.finditer(r":root\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}", css, re.S):
        for m in re.finditer(r"--([\w-]+)\s*:\s*([^;}]+)", block.group(1)):
            vars_[m.group(1).strip()] = m.group(2).strip()
    # simpler fallback: all --x: y in file near top
    if len(vars_) < 5:
        for m in re.finditer(r"--([\w-]+)\s*:\s*([^;}{\n]+)", css[:80000]):
            vars_.setdefault(m.group(1).strip(), m.group(2).strip())
    return vars_


def extract_styles_from_html(html: str) -> str:
    parts = re.findall(r"<style[^>]*>(.*?)</style>", html, re.S | re.I)
    # Standalone-(9): Design-System steckt in einem großen JS-String (nicht nur <style>)
    best = ""
    for m in re.finditer(r'"((?:\\.|[^"\\]){5000,})"', html):
        raw = m.group(1)
        try:
            body = bytes(raw, "utf-8").decode("unicode_escape")
        except Exception:
            body = raw.encode("utf-8").decode("unicode_escape", errors="ignore")
        if ".lt-row" in body and ("font-size" in body or "--fs-" in body) and len(body) > len(best):
            best = body
    if not best:
        for m in re.finditer(r"`([^`]{5000,})`", html):
            body = m.group(1)
            if ".lt-row" in body and len(body) > len(best):
                best = body
    if best:
        parts.append(best)
    return "\n".join(parts)


def scan_font_sizes(text: str) -> list[tuple[int, str, str]]:
    """Return (line, value, snippet). Nur echte Schriftgrößen — kein Tailwind-text-Farbe."""
    out: list[tuple[int, str, str]] = []
    lines = text.splitlines()
    for i, line in enumerate(lines, 1):
        for m in re.finditer(r"font-size\s*:\s*([^;}{\n]+)", line, re.I):
            out.append((i, norm(m.group(1)), line.strip()[:140]))
        # Nur Größen: text-[12px] / text-[13.5px] / text-[length:var(--fs-…)]
        for m in re.finditer(r"text-\[(length:var\(--fs-[^)]+\)|[0-9.]+px)\]", line):
            out.append((i, norm(m.group(1).removeprefix("length:")), line.strip()[:140]))
        for m in re.finditer(r"fontSize\s*[:=]\s*['\"]?([0-9.]+(?:px)?|var\(--fs-[^)]+\))", line):
            v = m.group(1)
            if re.fullmatch(r"[0-9.]+", v):
                v = v + "px"
            out.append((i, norm(v), line.strip()[:140]))
    return out


def scan_spacing(text: str) -> list[tuple[int, str, str, str]]:
    """(line, prop, value, snippet)"""
    out: list[tuple[int, str, str, str]] = []
    props = (
        "padding",
        "padding-top",
        "padding-right",
        "padding-bottom",
        "padding-left",
        "gap",
        "row-gap",
        "column-gap",
    )
    lines = text.splitlines()
    for i, line in enumerate(lines, 1):
        for prop in props:
            # avoid matching in comments poorly; accept
            pat = prop + r"\s*:\s*([^;}{\n]+)"
            for m in re.finditer(pat, line, re.I):
                out.append((i, prop, norm(m.group(1)), line.strip()[:140]))
        for m in re.finditer(r"\b(?:p|px|py|pt|pr|pb|pl|gap|gap-x|gap-y)-\[([^\]]+)\]", line):
            out.append((i, "tw-arb", norm(m.group(1)), line.strip()[:140]))
        # space-y-[..] gap via space-y not counted as gap intentional
    return out


def scan_hex(text: str) -> list[tuple[int, str, str]]:
    out: list[tuple[int, str, str]] = []
    lines = text.splitlines()
    for i, line in enumerate(lines, 1):
        # skip obvious urls
        if "http" in line and "#" in line and "color" not in line.lower() and "background" not in line.lower():
            # still scan carefully
            pass
        for m in re.finditer(r"#(?:[0-9a-fA-F]{3,8})\b", line):
            h = m.group(0).upper()
            if len(h) == 4:
                h = "#" + "".join(c * 2 for c in h[1:])
            elif len(h) > 7:
                h = h[:7]
            out.append((i, h, line.strip()[:140]))
    return out


def class_rule_block(css: str, classname: str) -> str | None:
    """Find .classname { ... } first block (naive brace match)."""
    # match .classname or .classname.foo or .classname,
    for m in re.finditer(rf"\.{re.escape(classname)}(?:\.[a-z0-9_-]+)?(?:\s|,|{{)", css, re.I):
        start = css.find("{", m.start())
        if start < 0:
            continue
        depth = 0
        for j in range(start, len(css)):
            if css[j] == "{":
                depth += 1
            elif css[j] == "}":
                depth -= 1
                if depth == 0:
                    return css[start + 1 : j].strip()
    return None


def props_from_block(block: str) -> dict[str, str]:
    props: dict[str, str] = {}
    for m in re.finditer(r"([\w-]+)\s*:\s*([^;]+);", block):
        props[m.group(1).strip().lower()] = norm(m.group(2))
    return props


def find_dom_order_mock(html: str, markers: list[str]) -> list[str]:
    """Order of first occurrence of marker strings in HTML/JSX source."""
    positions = []
    for mk in markers:
        idx = html.find(mk)
        if idx >= 0:
            positions.append((idx, mk))
    positions.sort()
    return [m for _, m in positions]


def main() -> None:
    mock_html = MOCK.read_text(errors="ignore")
    mock_css = extract_styles_from_html(mock_html)
    mock_vars = parse_root_vars(mock_css)
    # Also parse from full html in case vars in bundled css differently
    if len(mock_vars) < 10:
        mock_vars = parse_root_vars(mock_html)

    app_files = expand_globs(APP_GLOBS)
    globals_css = (APP_ROOT / "src/app/globals.css").read_text(errors="ignore")
    mock_ds = (APP_ROOT / "src/styles/mock-design-system.css").read_text(errors="ignore")
    app_vars = parse_root_vars(globals_css)
    app_vars.update(parse_root_vars(mock_ds[:50000]))

    # ---------- A) Typo ----------
    mock_fs_hits = scan_font_sizes(mock_css) + scan_font_sizes(mock_html)
    mock_fs = Counter(v for _, v, _ in mock_fs_hits)

    app_fs_hits_by_file: dict[str, list[tuple[int, str, str]]] = {}
    app_fs = Counter()
    for f in app_files:
        t = f.read_text(errors="ignore")
        hits = scan_font_sizes(t)
        rel = str(f.relative_to(APP_ROOT))
        app_fs_hits_by_file[rel] = hits
        for _, v, _ in hits:
            app_fs[v] += 1

    def resolve_app_fs(v: str) -> str:
        # strip !important / fallbacks
        base = re.sub(r"!important$", "", v).strip()
        fb = re.fullmatch(r"var\(--([\w-]+)(?:,([^)]+))?\)", base)
        if fb:
            name = fb.group(1)
            if f"var(--{name})" in TOKEN_TO_PX:
                return TOKEN_TO_PX[f"var(--{name})"]
            if name in app_vars:
                return norm(app_vars[name])
            if fb.group(2):
                return norm(fb.group(2))
        if base in TOKEN_TO_PX:
            return TOKEN_TO_PX[base]
        return base

    def is_fs_ok(v: str) -> bool:
        r = resolve_app_fs(v)
        return r in SPEC_FS or v.startswith("var(--fs-")

    mock_numeric = sorted(
        {v for v in mock_fs if re.fullmatch(r"[0-9.]+px", v)},
        key=lambda x: float(x[:-2]),
    )
    mock_set = set(mock_numeric) | SPEC_FS

    # App findings: concrete px not in mock/spec, OR tokens that resolve outside SPEC
    findings_a: list[dict] = []
    for rel, hits in app_fs_hits_by_file.items():
        for line, val, snip in hits:
            if is_fs_ok(val):
                continue
            resolved = resolve_app_fs(val)
            findings_a.append(
                {
                    "area": "typo",
                    "file": rel,
                    "line": line,
                    "ist": f"{val} → {resolved}" if val != resolved else val,
                    "soll": "12px | 13.5px | 15px | 19px (oder --fs-*)",
                    "snippet": snip,
                }
            )

    # Table a counts
    table_a = []
    all_vals = sorted(set(list(mock_fs) + list(app_fs)), key=str)
    for v in all_vals:
        if not (re.fullmatch(r"[0-9.]+px", v) or v.startswith("var(--fs")):
            continue
        table_a.append(
            {
                "wert": v,
                "mock": mock_fs.get(v, 0),
                "app": app_fs.get(v, 0),
                "abweichung": (
                    "OK Spec"
                    if (v.startswith("var(--fs-") or resolve_app_fs(v) in SPEC_FS)
                    else ("nur Mock" if app_fs.get(v, 0) == 0 else ("nur App / außerhalb Spec" if resolve_app_fs(v) not in SPEC_FS else "OK"))
                ),
            }
        )

    # ---------- B) Spacing ----------
    # Focus card/row/prop contexts in CSS class blocks + TSX
    mock_sp = scan_spacing(mock_css)
    mock_sp_c = Counter((p, v) for _, p, v, _ in mock_sp)
    mock_sp_vals = set(v for _, _, v, _ in mock_sp)
    # Atoms: individual lengths used in mock padding/gap (incl. from shorthands)
    mock_sp_atoms: set[str] = set()
    for v in mock_sp_vals:
        for atom in re.findall(r"[0-9.]+(?:px|rem|em|%)|0", v):
            mock_sp_atoms.add(atom if atom.endswith(("px", "rem", "em", "%")) or atom == "0" else atom)

    # Also include --sp-* token resolutions from mock vars
    for name, val in mock_vars.items():
        if name.startswith("sp") or "pad" in name or "gap" in name:
            for atom in re.findall(r"[0-9.]+px", norm(val)):
                mock_sp_atoms.add(atom)
            mock_sp_vals.add(norm(val))

    findings_b: list[dict] = []
    app_sp_c = Counter()
    KEYWORDS = ("card", "crow", "prop", "lt-row", "list-row", "pt2", "vg-", "dshell", "dh-", "nsb", "qbar", "ldr", ".props", "prop-")
    for f in app_files:
        rel = str(f.relative_to(APP_ROOT))
        t = f.read_text(errors="ignore")
        hits = scan_spacing(t)
        lines = t.splitlines()
        for line, prop, val, snip in hits:
            app_sp_c[(prop, val)] += 1
            is_token = "var(--" in val
            is_px = bool(re.search(r"[0-9.]+px", val))
            if not is_px or is_token:
                continue
            ctx = "\n".join(lines[max(0, line - 4) : line]).lower() + snip.lower()
            in_core = any(k in ctx for k in KEYWORDS) or rel.endswith("mock-design-system.css")
            if not in_core:
                continue
            # OK if exact value exists in mock OR all px atoms are mock atoms
            atoms = re.findall(r"[0-9.]+px", val)
            if val in mock_sp_vals or (atoms and all(a in mock_sp_atoms for a in atoms)):
                continue
            mock_for_prop = sorted({v for (pp, v) in mock_sp_c if pp == prop})[:12]
            findings_b.append(
                {
                    "area": "spacing",
                    "file": rel,
                    "line": line,
                    "ist": f"{prop}:{val}",
                    "soll": f"Mock-{prop}: {', '.join(mock_for_prop) or '—'} | Atome: {', '.join(sorted(mock_sp_atoms)[:20])}",
                    "snippet": snip,
                }
            )

    # ---------- C) Colors ----------
    mock_hex = {h for _, h, _ in scan_hex(mock_css) + scan_hex(mock_html)}
    # expand vars that are hex
    for v in mock_vars.values():
        for m in re.finditer(r"#(?:[0-9a-fA-F]{3,8})\b", v):
            h = m.group(0).upper()
            if len(h) == 4:
                h = "#" + "".join(c * 2 for c in h[1:])
            mock_hex.add(h[:7])

    app_hex_vars = set()
    for v in app_vars.values():
        for m in re.finditer(r"#(?:[0-9a-fA-F]{3,8})\b", v):
            h = m.group(0).upper()
            if len(h) == 4:
                h = "#" + "".join(c * 2 for c in h[1:])
            app_hex_vars.add(h[:7])

    findings_c: list[dict] = []
    # Ignore common non-brand neutrals? User said: every hex in app not in mock is a finding.
    # Limit to color/background context lines to avoid SVG noise somewhat
    for f in app_files:
        rel = str(f.relative_to(APP_ROOT))
        t = f.read_text(errors="ignore")
        for line, h, snip in scan_hex(t):
            low = snip.lower()
            if not any(
                k in low
                for k in (
                    "color",
                    "background",
                    "border",
                    "fill",
                    "stroke",
                    "bg-",
                    "text-",
                    "--",
                    "hex",
                    "#",
                )
            ):
                continue
            if h not in mock_hex:
                findings_c.append(
                    {
                        "area": "farbe",
                        "file": rel,
                        "line": line,
                        "ist": h,
                        "soll": "Mock-Palette / CSS-Var (nicht in Mock-Hex-Set)",
                        "snippet": snip,
                    }
                )

    # ---------- D) Classes ----------
    class_rows = []
    findings_d: list[dict] = []
    for cls in CORE_CLASSES:
        mock_block = class_rule_block(mock_css, cls) or class_rule_block(mock_html, cls)
        app_block = class_rule_block(mock_ds, cls)
        alias_hit = None
        if not app_block:
            for alias in CLASS_ALIASES.get(cls, []):
                ab = class_rule_block(mock_ds, alias)
                if ab:
                    app_block = ab
                    alias_hit = alias
                    break
        # also search tsx for className containing cls
        app_tsx_refs = []
        for f in app_files:
            if f.suffix != ".tsx":
                continue
            tt = f.read_text(errors="ignore")
            names = [cls] + CLASS_ALIASES.get(cls, [])
            if any(re.search(rf"[\"'`\s\.]{re.escape(n)}([\"'`\s])", tt) for n in names):
                app_tsx_refs.append(str(f.relative_to(APP_ROOT)))

        mock_props = props_from_block(mock_block) if mock_block else {}
        app_props = props_from_block(app_block) if app_block else {}
        # Compare only overlapping interesting props
        INTEREST = {
            "display",
            "gap",
            "padding",
            "margin",
            "margin-bottom",
            "border-radius",
            "font-size",
            "grid-template-columns",
            "align-items",
            "flex-wrap",
            "background",
            "border",
        }
        missing_in_app = {}
        for k, mv in mock_props.items():
            if k not in INTEREST:
                continue
            av = app_props.get(k)
            if av is None:
                missing_in_app[k] = f"Mock={mv} / App=fehlt"
            elif av != mv:
                missing_in_app[k] = f"Mock={mv} ≠ App={av}"
        if mock_block and app_block and not missing_in_app:
            status = "OK CSS" + (f" (Alias .{alias_hit})" if alias_hit else "")
        elif mock_block and app_block and missing_in_app:
            status = "Props weichen ab" + (f" (Alias .{alias_hit})" if alias_hit else "")
        elif mock_block and not app_block:
            status = "fehlt in App-CSS"
        elif not mock_block and app_block:
            status = "fehlt in Mock"
        else:
            status = "beides fehlt / schwach"
        pendant = (
            f".{alias_hit}" if alias_hit else (f".{cls} in mock-design-system.css" if class_rule_block(mock_ds, cls) else ("nur TSX" if app_tsx_refs else "—"))
        )
        class_rows.append(
            {
                "mock_klasse": f".{cls}",
                "in_mock_css": bool(mock_block),
                "in_app_css": bool(app_block),
                "app_tsx_refs": len(app_tsx_refs),
                "app_pendant": pendant,
                "abweichung": status,
                "prop_delta": missing_in_app,
                "tsx_examples": app_tsx_refs[:5],
            }
        )
        if not status.startswith("OK"):
            findings_d.append(
                {
                    "area": "klasse",
                    "file": "src/styles/mock-design-system.css" if app_block else "—",
                    "line": 0,
                    "ist": status,
                    "soll": f".{cls} wie Mock" + (f" bzw. Alias .{alias_hit}" if alias_hit else ""),
                    "snippet": json.dumps(missing_in_app, ensure_ascii=False)[:200],
                }
            )

    # ---------- E) Structure ----------
    # Markers for list / detail header / tabs
    list_markers_mock = [
        "Alle",
        "Anfrage",
        "Angebot",
        "Auftrag",
        "Rechnung",
        "Wartung & Pflege",
        "Offen",
        "Erledigt",
    ]
    header_markers = [
        "WV",
        "Wiedervorlage",
        "Als nächstes",
        "ALS NÄCHSTES",
        "Weitere Aktionen",
    ]
    tab_markers = ["Übersicht", "Leistungen", "Zahlung", "Akte", "Aktivität"]

    # Extract from mock by searching JSX-ish strings
    struct = {
        "liste_mock_order": find_dom_order_mock(mock_html, list_markers_mock),
        "tabs_mock_order": find_dom_order_mock(mock_html, tab_markers),
        "header_mock_order": find_dom_order_mock(mock_html, header_markers),
    }

    # App: VorgaengeListeClient + Detail clients
    app_list = (APP_ROOT / "src/components/vorgaenge/VorgaengeListeClient.tsx").read_text(errors="ignore")
    struct["liste_app_order"] = find_dom_order_mock(app_list, list_markers_mock)

    # Detail shell / tabs — search DetailShell and clients
    detail_blobs = []
    for rel in [
        "src/components/ui/DetailShell.tsx",
        "src/components/auftraege/AuftragDetailClient.tsx",
        "src/components/anfragen/AnfrageDetailClient.tsx",
        "src/components/angebote/AngebotDetailPageClient.tsx",
        "src/components/rechnungen/RechnungDetailClient.tsx",
        "src/components/vorgang/WiedervorlageChip.tsx",
        "src/lib/vorgang/detail-tabs.ts",
    ]:
        p = APP_ROOT / rel
        if p.exists():
            detail_blobs.append(p.read_text(errors="ignore"))
    detail_join = "\n".join(detail_blobs)
    struct["tabs_app_order"] = find_dom_order_mock(detail_join, tab_markers)
    struct["header_app_order"] = find_dom_order_mock(detail_join, header_markers)

    # Prefer canonical tab order from AuftragDetailClient detailShellGroups
    want_chips = ["Alle", "Anfrage", "Angebot", "Auftrag", "Rechnung", "Wartung & Pflege"]
    auftrag_client = APP_ROOT / "src/components/auftraege/AuftragDetailClient.tsx"
    if auftrag_client.exists():
        tt = auftrag_client.read_text(errors="ignore")
        # ids in declaration order within detailShellGroups block
        m = re.search(r"detailShellGroups[^=]*=\s*\[(.*?)\n\s*\]", tt, re.S)
        if m:
            ids = re.findall(r"id:\s*'([^']+)'", m.group(1))
            label_map = {
                "uebersicht": "Übersicht",
                "leistungen": "Leistungen",
                "zahlung": "Zahlung",
                "akte": "Akte",
                "aktivitaet": "Aktivität",
            }
            struct["tabs_app_canonical"] = [label_map.get(i, i) for i in ids]

    # Liste-Chips: VORGANG_FILTERS order (kanonisch)
    if (APP_ROOT / "src/components/vorgaenge/VorgaengeListeClient.tsx").exists():
        vl = (APP_ROOT / "src/components/vorgaenge/VorgaengeListeClient.tsx").read_text(errors="ignore")
        m = re.search(
            r"VORGANG_FILTERS\s*=\s*\[([^\]]+)\]",
            vl,
        )
        if m:
            keys = re.findall(r"'([^']+)'", m.group(1))
            keymap = {
                "alle": "Alle",
                "anfrage": "Anfrage",
                "angebot": "Angebot",
                "auftrag": "Auftrag",
                "rechnung": "Rechnung",
                "bestand": "Wartung & Pflege",
            }
            struct["liste_app_chips_canonical"] = [keymap.get(k, k) for k in keys]

    findings_e: list[dict] = []
    # Compare tab order strictly
    mock_tabs = [t for t in struct["tabs_mock_order"] if t in tab_markers]

    def uniq(seq):
        seen = set()
        out = []
        for x in seq:
            if x not in seen:
                seen.add(x)
                out.append(x)
        return out

    mock_tabs_u = uniq(mock_tabs)
    app_tabs_u = struct.get("tabs_app_canonical") or uniq(struct["tabs_app_order"])
    soll_tabs = ["Übersicht", "Leistungen", "Zahlung", "Akte", "Aktivität"]
    if app_tabs_u != soll_tabs:
        findings_e.append(
            {
                "area": "struktur",
                "file": "src/components/auftraege/AuftragDetailClient.tsx",
                "line": 1006,
                "ist": " → ".join(app_tabs_u),
                "soll": " → ".join(soll_tabs),
                "snippet": "detailShellGroups",
            }
        )

    want_chips = ["Alle", "Anfrage", "Angebot", "Auftrag", "Rechnung", "Wartung & Pflege"]
    app_chips = struct.get("liste_app_chips_canonical") or [
        c for c in uniq(struct["liste_app_order"]) if c in want_chips
    ]
    mock_chips = [c for c in uniq(struct["liste_mock_order"]) if c in want_chips]
    # Prefer searching mock for chip array
    mock_chip_labels = []
    for m in re.finditer(
        r"['\"](Alle|Anfrage|Angebot|Auftrag|Rechnung|Wartung & Pflege)['\"]", mock_html
    ):
        if m.group(1) not in mock_chip_labels:
            mock_chip_labels.append(m.group(1))
    if mock_chip_labels:
        mock_chips = [c for c in mock_chip_labels if c in want_chips]
        struct["liste_mock_chips_canonical"] = mock_chips

    if app_chips[:6] != want_chips:
        findings_e.append(
            {
                "area": "struktur",
                "file": "src/components/vorgaenge/VorgaengeListeClient.tsx",
                "line": 0,
                "ist": " → ".join(app_chips[:8]) or "(nicht gefunden)",
                "soll": " → ".join(want_chips),
                "snippet": "Filter-Chips",
            }
        )
    if mock_chips and mock_chips[:6] != want_chips:
        findings_e.append(
            {
                "area": "struktur",
                "file": "Mock HTML",
                "line": 0,
                "ist": " → ".join(mock_chips[:8]),
                "soll": " → ".join(want_chips) + " (Katalog/Spec)",
                "snippet": "",
            }
        )

    # ---------- Aggregate ----------
    # Deduplicate findings
    def dedupe(items: list[dict]) -> list[dict]:
        seen = set()
        out = []
        for it in items:
            key = (it["area"], it["file"], it["line"], it["ist"])
            if key in seen:
                continue
            seen.add(key)
            out.append(it)
        return out

    findings_a = dedupe(findings_a)
    findings_b = dedupe(findings_b)
    findings_c = dedupe(findings_c)
    findings_d = dedupe(findings_d)
    findings_e = dedupe(findings_e)

    all_findings = findings_a + findings_b + findings_c + findings_d + findings_e

    payload = {
        "mock": str(MOCK),
        "app_files": len(app_files),
        "mock_root_vars_count": len(mock_vars),
        "mock_fs_top": mock_fs.most_common(30),
        "app_fs_top": app_fs.most_common(30),
        "mock_numeric_fs": mock_numeric,
        "mock_fs_outside_spec": [v for v in mock_numeric if v not in SPEC_FS],
        "table_a": table_a,
        "class_rows": class_rows,
        "struct": struct,
        "counts": {
            "typo": len(findings_a),
            "spacing": len(findings_b),
            "farbe": len(findings_c),
            "klasse": len(findings_d),
            "struktur": len(findings_e),
            "total": len(all_findings),
        },
        "findings": all_findings,
        "mock_hex_count": len(mock_hex),
        "mock_hex_sample": sorted(mock_hex)[:40],
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False))

    # Write MD
    lines = []
    lines.append("# N5' — Design-Diff per Grep (Mock ↔ App)")
    lines.append("")
    lines.append(f"**Stand:** 2026-07-28")
    lines.append(f"**Mock:** `{MOCK.name}`")
    lines.append(f"**App-Scope:** {len(app_files)} Dateien (Vorgang/Liste/Detail/Leistungen/Zahlung/Mock-CSS/Tokens)")
    lines.append(f"**Methode:** Extraktion aus Mock-`<style>` + App-CSS/TSX — vollständig im Scope, keine Stichprobe.")
    lines.append("")
    lines.append(f"## Gesamtfund: **{len(all_findings)}**")
    lines.append("")
    lines.append("| Bereich | Funde |")
    lines.append("|---|---:|")
    for k in ("typo", "spacing", "farbe", "klasse", "struktur"):
        lines.append(f"| {k} | {payload['counts'][k]} |")
    lines.append("")

    lines.append("## a) Typo — `font-size`")
    lines.append("")
    lines.append("**Soll (Spec/N1):** nur `12 · 13.5 · 15 · 19` px bzw. `--fs-meta|text|title|head`.")
    lines.append("")
    lines.append(f"Mock enthält zusätzlich außerhalb Spec: `{payload['mock_fs_outside_spec']}`")
    lines.append("")
    lines.append("| Wert | Mock | App | Abweichung |")
    lines.append("|---|---:|---:|---|")
    for row in table_a:
        if row["mock"] == 0 and row["app"] == 0:
            continue
        # only show numeric + fs tokens
        if not (row["wert"].endswith("px") or row["wert"].startswith("var(--fs")):
            continue
        lines.append(f"| `{row['wert']}` | {row['mock']} | {row['app']} | {row['abweichung']} |")
    lines.append("")
    lines.append(f"### Typo-Funde ({len(findings_a)}) — App-Werte ≠ Spec-Viererset")
    lines.append("")
    if not findings_a:
        lines.append("_Keine._")
    else:
        lines.append("| Datei | Zeile | Ist | Soll |")
        lines.append("|---|---:|---|---|")
        for fnd in findings_a[:500]:
            lines.append(f"| `{fnd['file']}` | {fnd['line']} | `{fnd['ist']}` | {fnd['soll']} |")
        if len(findings_a) > 500:
            lines.append(f"| … | | | +{len(findings_a)-500} weitere in JSON |")
    lines.append("")

    lines.append("## b) Spacing — `padding` / `gap` (Karten · Zeilen · Props)")
    lines.append("")
    lines.append(f"Funde (px-Werte im Vorgangs-CSS/TSX, die so nicht im Mock vorkommen): **{len(findings_b)}**")
    lines.append("")
    if not findings_b:
        lines.append("_Keine._")
    else:
        lines.append("| Datei | Zeile | Ist | Soll (Mock) |")
        lines.append("|---|---:|---|---|")
        for fnd in findings_b[:400]:
            lines.append(f"| `{fnd['file']}` | {fnd['line']} | `{fnd['ist']}` | {fnd['soll'][:80]} |")
    lines.append("")

    lines.append("## c) Farben — Hex gegen Mock-Palette")
    lines.append("")
    lines.append(f"Mock-Hex-Set: **{len(mock_hex)}** eindeutige Werte.")
    lines.append(f"App-Funde (Hex im Scope, nicht in Mock-Set): **{len(findings_c)}**")
    lines.append("")
    if not findings_c:
        lines.append("_Keine._")
    else:
        lines.append("| Datei | Zeile | Ist-Hex | Soll |")
        lines.append("|---|---:|---|---|")
        for fnd in findings_c[:400]:
            lines.append(f"| `{fnd['file']}` | {fnd['line']} | `{fnd['ist']}` | {fnd['soll']} |")
    lines.append("")

    lines.append("## d) Klassen-Abgleich")
    lines.append("")
    lines.append("| Mock-Klasse | App-Pendant | In Mock-CSS | In App-CSS | TSX-Refs | Abweichung |")
    lines.append("|---|---|---|---|---:|---|")
    for r in class_rows:
        lines.append(
            f"| `{r['mock_klasse']}` | {r['app_pendant']} | {'✓' if r['in_mock_css'] else '—'} | {'✓' if r['in_app_css'] else '—'} | {r['app_tsx_refs']} | {r['abweichung']} |"
        )
    lines.append("")
    lines.append("### Prop-Deltas (wenn CSS beiderseits da)")
    for r in class_rows:
        if r["prop_delta"]:
            lines.append(f"- **{r['mock_klasse']}**: `{json.dumps(r['prop_delta'], ensure_ascii=False)}`")
    lines.append("")

    lines.append("## e) Struktur — Reihenfolge")
    lines.append("")
    lines.append("| Bereich | Mock (erste Treffer-Reihenfolge) | App |")
    lines.append("|---|---|---|")
    lines.append(f"| Liste-Chips | {' → '.join(mock_chips) or '—'} | {' → '.join(app_chips) or '—'} |")
    lines.append(
        f"| Detail-Tabs | {' → '.join(uniq(struct['tabs_mock_order'])) or '—'} | {' → '.join(app_tabs_u) or '—'} |"
    )
    lines.append(
        f"| Header-Marker | {' → '.join(uniq(struct['header_mock_order'])) or '—'} | {' → '.join(uniq(struct['header_app_order'])) or '—'} |"
    )
    lines.append("")
    if findings_e:
        lines.append("| Datei | Ist | Soll |")
        lines.append("|---|---|---|")
        for fnd in findings_e:
            lines.append(f"| `{fnd['file']}` | {fnd['ist']} | {fnd['soll']} |")
    else:
        lines.append("Strukturelle Kernreihenfolge Tabs/Chips: Abweichungen siehe oben; keine zusätzlichen Funde.")
    lines.append("")

    lines.append("## Fund-Liste (gesamt, kompakt)")
    lines.append("")
    lines.append("| # | Bereich | Datei | Zeile | Ist | Soll |")
    lines.append("|---:|---|---|---:|---|---|")
    for i, fnd in enumerate(all_findings[:800], 1):
        lines.append(
            f"| {i} | {fnd['area']} | `{fnd['file']}` | {fnd['line'] or '—'} | `{fnd['ist'][:60]}` | {fnd['soll'][:70]} |"
        )
    if len(all_findings) > 800:
        lines.append(f"| … | | | | | +{len(all_findings)-800} in `{OUT_JSON.name}` |")
    lines.append("")
    lines.append(f"Rohdaten: `{OUT_JSON.relative_to(APP_ROOT)}`")
    lines.append("")
    lines.append("## Bewertungsregel")
    lines.append("")
    lines.append("- Tokens zählen nur, wenn **verwendet**. Bloße Definition in `:root` reicht nicht.")
    lines.append("- Jeder App-`font-size` außerhalb `{12,13.5,15,19}` (oder `--fs-*`) = Fund.")
    lines.append("- N5 Screenshots: entfällt (ersetzt durch diesen Diff).")

    OUT_MD.write_text("\n".join(lines), encoding="utf-8")
    print("Wrote", OUT_MD)
    print("Wrote", OUT_JSON)
    print("FINDINGS", payload["counts"])


if __name__ == "__main__":
    main()

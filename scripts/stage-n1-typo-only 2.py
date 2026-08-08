#!/usr/bin/env python3
"""Stage only typography token changes; keep dirty non-typo work in working tree."""
from __future__ import annotations

import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path.cwd()


def map_fs(px: float) -> str:
    if px <= 12.75:
        return "var(--fs-meta)"
    if px <= 14.75:
        return "var(--fs-text)"
    if px <= 16.5:
        return "var(--fs-title)"
    return "var(--fs-head)"


TW_MAP = {
    "text-xs": "text-[length:var(--fs-meta)]",
    "text-sm": "text-[length:var(--fs-text)]",
    "text-base": "text-[length:var(--fs-title)]",
    "text-lg": "text-[length:var(--fs-head)]",
    "text-xl": "text-[length:var(--fs-head)]",
    "text-2xl": "text-[length:var(--fs-head)]",
    "text-footnote": "text-[length:var(--fs-meta)]",
    "text-caption": "text-[length:var(--fs-meta)]",
    "text-headline": "text-[length:var(--fs-head)]",
}


def apply_typo(text: str) -> str:
    text = re.sub(
        r"fontSize:\s*(\d+(?:\.\d+)?)\b",
        lambda m: f"fontSize: '{map_fs(float(m.group(1)))}'",
        text,
    )
    text = re.sub(
        r"text-\[(\d+(?:\.\d+)?)px\]",
        lambda m: f"text-[length:{map_fs(float(m.group(1)))}]",
        text,
    )
    for old, neu in TW_MAP.items():
        text = re.sub(rf"(?<![\w-]){re.escape(old)}(?![\w-])", neu, text)
    return text


def is_typo_line(line: str) -> bool:
    s = line[1:]
    keys = (
        "fontSize",
        "font-size",
        "text-[",
        "text-xs",
        "text-sm",
        "text-base",
        "text-lg",
        "text-xl",
        "text-2xl",
        "text-footnote",
        "text-caption",
        "text-headline",
        "--fs-",
        "offer-pos-row",
        "nested-card",
        "Card-in-Card",
        "rounded-xl.border",
    )
    return any(k in s for k in keys)


def blob_hash(content: str) -> str:
    return subprocess.check_output(
        ["git", "hash-object", "-w", "--stdin"], input=content.encode(), text=False
    ).decode().strip()


def main() -> None:
    files = (
        subprocess.check_output(
            ["git", "diff", "--name-only", "--", "src/components/"], text=True
        )
        .strip()
        .split("\n")
    )
    typo_only: list[str] = []
    mixed: list[str] = []
    for f in files:
        if not f or not f.endswith((".tsx", ".ts", ".css")):
            continue
        diff = subprocess.check_output(
            ["git", "diff", "-U0", "--", f], text=True, errors="replace"
        )
        content = [
            l
            for l in diff.splitlines()
            if l.startswith(("+", "-")) and not l.startswith(("+++", "---"))
        ]
        real_non = []
        for l in content:
            if is_typo_line(l):
                continue
            body = l[1:].strip()
            if not body:
                continue
            if "className" in body or "style={{" in body:
                continue
            real_non.append(l)
        (typo_only if len(real_non) <= 2 else mixed).append(f)

    if typo_only:
        subprocess.check_call(["git", "add", "--", *typo_only])

    staged_mixed = 0
    for f in mixed:
        path = ROOT / f
        if not path.exists():
            continue
        try:
            head = subprocess.check_output(
                ["git", "show", f"HEAD:{f}"], text=True, errors="replace"
            )
        except subprocess.CalledProcessError:
            continue
        working = path.read_text()
        typo_head = apply_typo(head)
        # Keep working tree: ensure typo applied on current dirty content
        path.write_text(apply_typo(working))
        if typo_head != head:
            h = blob_hash(typo_head)
            subprocess.check_call(
                ["git", "update-index", "--add", "--cacheinfo", f"100644,{h},{f}"]
            )
            staged_mixed += 1

    print(f"staged typo_only={len(typo_only)} mixed_index={staged_mixed}")


if __name__ == "__main__":
    main()

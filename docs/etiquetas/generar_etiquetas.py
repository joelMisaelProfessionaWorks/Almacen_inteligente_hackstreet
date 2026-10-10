"""Genera etiquetas Code 128 imprimibles para piezas y ubicaciones de prueba.

Lee el catálogo de ``hackathon-inventario-kit/data/events.jsonl`` (último
``part.upserted`` / ``location.upserted`` por id) y produce un HTML listo para
imprimir o abrir en otra pantalla y escanear con la app móvil.

Códigos que se imprimen (los mismos que resuelve ``GET /scan/:code``):
  * Ubicación -> ``code`` (p. ej. ``U-016``)
  * Pieza     -> ``sku`` si existe; si no, ``P-<part_id>``

Sin dependencias externas: el Code 128 (set B) se dibuja como SVG.

Uso:
    python docs/etiquetas/generar_etiquetas.py [salida.html]
"""
from __future__ import annotations

import html
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EVENTS = ROOT / "hackathon-inventario-kit" / "data" / "events.jsonl"
DEFAULT_OUT = Path(__file__).resolve().parent / "etiquetas-test.html"

# Code 128: anchos barra/espacio de cada símbolo (0..105) + stop.
CODE128 = (
    "212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 "
    "221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 "
    "221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 "
    "212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 "
    "231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 "
    "231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 "
    "314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 "
    "112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 "
    "111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 "
    "214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 "
    "114131 311141 411131 211412 211214 211232"
).split()
STOP = "2331112"
START_B = 104
assert len(CODE128) == 106 and len(set(CODE128)) == 106
assert all(sum(map(int, p)) == 11 for p in CODE128) and sum(map(int, STOP)) == 13


def code128_ok(text: str) -> bool:
    return bool(text) and all(32 <= ord(c) <= 126 for c in text)


def code128_svg(text: str, module: float = 1.6, height: int = 56) -> str:
    values = [ord(c) - 32 for c in text]
    checksum = (START_B + sum(i * v for i, v in enumerate(values, 1))) % 103
    pattern = CODE128[START_B] + "".join(CODE128[v] for v in values) + CODE128[checksum] + STOP
    quiet = 10
    x = quiet
    rects = []
    for i, w in enumerate(pattern):
        w = int(w)
        if i % 2 == 0:  # barra
            rects.append(f'<rect x="{x}" y="0" width="{w}" height="{height}"/>')
        x += w
    total = x + quiet
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total} {height}" '
        f'width="{total * module:.0f}" height="{height}" preserveAspectRatio="none" '
        f'shape-rendering="crispEdges"><rect width="{total}" height="{height}" fill="#fff"/>'
        f'<g fill="#000">{"".join(rects)}</g></svg>'
    )


def load_catalog():
    parts, locs = {}, {}
    for line in EVENTS.open(encoding="utf-8"):
        ev = json.loads(line)["event"]
        kind, data = ev.get("event_type"), ev.get("data") or {}
        target = {"part.upserted": (parts, "part_id"), "location.upserted": (locs, "location_id")}.get(kind)
        if not target:
            continue
        store, key = target
        prev = store.get(data.get(key))
        if prev is None or ev["occurred_at"] >= prev[0]:
            store[data[key]] = (ev["occurred_at"], data)
    return (
        [d for _, (_, d) in sorted(parts.items())],
        [d for _, (_, d) in sorted(locs.items())],
    )


def label(code: str, title: str, subtitle: str, tag: str = "", kind: str = "") -> str:
    tag_html = f'<span class="tag">{html.escape(tag)}</span>' if tag else ""
    return (
        f'<div class="label {kind}">'
        f'<div class="title">{html.escape(title)}{tag_html}</div>'
        f'<div class="bc">{code128_svg(code)}</div>'
        f'<div class="code">{html.escape(code)}</div>'
        f'<div class="sub">{html.escape(subtitle)}</div>'
        f"</div>"
    )


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUT
    parts, locs = load_catalog()
    sku_count = Counter((p.get("sku") or "").strip() for p in parts if (p.get("sku") or "").strip())

    loc_labels = []
    for l in locs:
        code = (l.get("code") or "").strip()
        if not code128_ok(code):
            code = str(l["location_id"])
        tag = "" if l.get("active", True) else "INACTIVA"
        if l.get("is_workbench"):
            tag = (tag + " BANCO").strip()
        loc_labels.append(label(code, f"Ubicación #{l['location_id']}", l.get("name") or "", tag, "loc"))

    part_labels, dup_labels, nosku_labels = [], [], []
    for p in parts:
        sku = (p.get("sku") or "").strip()
        name = p.get("name") or p.get("description") or ""
        pid = p["part_id"]
        tag = "" if p.get("active", True) else "BAJA"
        if sku and code128_ok(sku):
            lbl = label(sku, f"Pieza #{pid}", name, tag, "part")
            (dup_labels if sku_count[sku] > 1 else part_labels).append(lbl)
        else:
            nosku_labels.append(label(f"P-{pid}", f"Pieza #{pid}", name, (tag + " SIN SKU").strip(), "part"))

    # Etiquetas P-<id> para probar la búsqueda por id (aunque tengan SKU).
    pid_labels = [label(f"P-{p['part_id']}", f"Pieza #{p['part_id']}", p.get("name") or "", "POR ID", "part")
                  for p in parts[:12]]

    def section(title: str, note: str, items: list[str]) -> str:
        if not items:
            return ""
        return (f'<section><h2>{html.escape(title)} <small>({len(items)})</small></h2>'
                f'<p class="note">{html.escape(note)}</p><div class="grid">{"".join(items)}</div></section>')

    doc = f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Etiquetas de prueba · Almacén</title>
<style>
  body {{ font-family: system-ui, sans-serif; margin: 16px; color: #111; }}
  h1 {{ margin: 0 0 4px; }} h2 {{ margin: 24px 0 4px; border-bottom: 2px solid #111; }}
  .note {{ margin: 0 0 10px; color: #555; font-size: 13px; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(62mm, 1fr)); gap: 6px; }}
  .label {{ border: 1px dashed #999; padding: 6px 8px; text-align: center; break-inside: avoid; }}
  .label.loc {{ border-left: 6px solid #1565c0; }} .label.part {{ border-left: 6px solid #2e7d32; }}
  .title {{ font-size: 11px; color: #444; text-align: left; }}
  .tag {{ float: right; background: #c62828; color: #fff; font-size: 9px; padding: 0 4px; border-radius: 3px; }}
  .bc svg {{ max-width: 100%; height: 56px; }}
  .code {{ font: 700 15px ui-monospace, Consolas, monospace; letter-spacing: .5px; }}
  .sub {{ font-size: 10px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
  @media print {{ body {{ margin: 6mm; }} .noprint {{ display: none; }} section {{ break-before: page; }} section:first-of-type {{ break-before: auto; }} }}
</style></head><body>
<h1>Etiquetas de prueba</h1>
<p class="note noprint">Code 128 · {len(locs)} ubicaciones · {len(parts)} piezas. Imprime (Ctrl+P) o escanea directo desde la pantalla con la app móvil.</p>
{section("Ubicaciones", "Codifican el código de ubicación (U-xxx).", loc_labels)}
{section("Casos de prueba: SKU compartido", "Varias piezas con el mismo SKU: la app debe pedir elegir.", dup_labels)}
{section("Casos de prueba: pieza sin SKU", "Codifican P-<id>; el backend las resuelve por id.", nosku_labels)}
{section("Casos de prueba: pieza por ID", "P-<id> de piezas que sí tienen SKU.", pid_labels)}
{section("Piezas", "Codifican el SKU de la pieza.", part_labels)}
</body></html>"""
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(doc, encoding="utf-8")
    print(f"{out}  ->  {len(loc_labels)} ubicaciones, {len(part_labels)} piezas, "
          f"{len(dup_labels)} SKU compartido, {len(nosku_labels)} sin SKU, {len(pid_labels)} por id")


if __name__ == "__main__":
    main()

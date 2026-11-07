#!/usr/bin/env bash
# SVG -> 矢量 PDF：用 Edge headless 打印精确尺寸的 HTML 包装页
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
mkdir -p "$ROOT/build/figpdf" "$ROOT/build/svgtmp"
for svg in "$ROOT"/images/*.svg; do
  name=$(basename "$svg" .svg)
  out="$ROOT/build/figpdf/$name.pdf"
  [ -f "$out" ] && [ "$out" -nt "$svg" ] && continue
  dims=$(grep -o 'width="[0-9]*" height="[0-9]*"' "$svg" | head -1)
  w=$(echo "$dims" | sed 's/width="\([0-9]*\)".*/\1/')
  h=$(echo "$dims" | sed 's/.*height="\([0-9]*\)".*/\1/')
  svgcontent=$(cat "$svg")
  { cat "$ROOT/build/svg2pdf.html.tpl" | sed "s/__W__/$w/;s/__H__/$h/"; } > "$ROOT/build/svgtmp/$name.html"
  python - "$ROOT/build/svgtmp/$name.html" "$svg" <<'PYEOF'
import sys
hp, sp = sys.argv[1], sys.argv[2]
html = open(hp, encoding='utf-8').read()
svg = open(sp, encoding='utf-8').read()
open(hp, 'w', encoding='utf-8').write(html.replace('__SVG__', svg))
PYEOF
  "$EDGE" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="$(cygpath -w "$out")" "$(cygpath -w "$ROOT/build/svgtmp/$name.html")" 2>/dev/null
  echo "OK $name (${w}x${h})"
done
